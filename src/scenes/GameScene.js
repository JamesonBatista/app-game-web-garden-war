import { ENEMY_CONFIG, MAP_RADIUS, SKILLS } from "../constants.js";
import { buildInitialGameState } from "../state.js";
import { isoToScreen, screenToIso } from "../utils/iso.js";
import {
  applyClassPreset,
  computeMitigatedDamage,
  equipLootItem,
  gainClassResource,
  getClassSkillTree,
  rollCriticalDamage,
  rollEnemyModifiers,
  rollLootDrop,
  regenClassResource,
  trySpendResource
} from "../systems/diabloModule.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  init(data) {
    this.selectedClassId = data?.classId ?? this.registry.get("selectedClass") ?? "barbarian";
  }

  create() {
    this.gs = buildInitialGameState();
    applyClassPreset(this.gs, this.selectedClassId);
    this.classSkillTree = getClassSkillTree(this.gs.player.classId);
    this.hasBossAlive = false;
    this.currentBoss = null;
    this.hitStopRemaining = 0;
    this.lastImpactTime = 0;
    this.createIsoMap();
    this.createPlayer();
    this.applyClassVisualStyle();
    this.createGroups();
    this.createCollisions();
    this.createCamera();
    this.createHUD();
    this.createCinematicFX();
    this.createWorldAmbience();
    this.createJoystick();
    this.createKeyboard();
    this.startBGM();
    this.scheduleNextSpawn();
    this.updateSkillsHUD();
    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  update(_time, delta) {
    if (!this.gs.running || this.gs.paused) {
      this.updateWorldAmbience(delta);
      this.updateScreenFX(delta);
      return;
    }

    if (this.hitStopRemaining > 0) {
      this.hitStopRemaining -= delta;
      this.updateWorldAmbience(delta);
      this.updateScreenFX(delta);
      return;
    }

    this.gs.elapsed += delta;
    this.handlePlayerMovement();
    this.handleSkillTimers(delta);
    this.handleEnemyAI(delta);
    this.handleGemAttraction();
    this.updateBullets(delta);
    this.handleDepthSorting();
    this.handleShadowPositions();
    this.updateLootDrops(delta);
    this.updateWorldAmbience(delta);
    this.recycleTiles();
    this.updateHUD();
    this.updateScreenFX(delta);
  }

  createIsoMap() {
    this.tilePool = [];
    this.tileIndex = new Map();
    this.lastCenterTile = { x: null, y: null };
    const poolSize = (MAP_RADIUS * 2 + 3) ** 2;
    const tileKeys = ["tile-grass", "tile-grass", "tile-grass", "tile-dark", "tile-flower"];

    for (let i = 0; i < poolSize; i += 1) {
      const key = tileKeys[i % tileKeys.length];
      const tile = this.add.image(0, 0, key);
      tile.setOrigin(0.5, 0.5).setDepth(-9999).setVisible(false).setActive(false);
      tile.variantKey = tileKeys[Math.floor(Math.random() * tileKeys.length)];
      this.tilePool.push(tile);
    }

    this.generateTilesAround(0, 0);
  }

  generateTilesAround(centerX, centerY) {
    for (let tx = centerX - MAP_RADIUS; tx <= centerX + MAP_RADIUS; tx += 1) {
      for (let ty = centerY - MAP_RADIUS; ty <= centerY + MAP_RADIUS; ty += 1) {
        const key = `${tx},${ty}`;
        if (this.tileIndex.has(key)) {
          continue;
        }

        const tile = this.tilePool.find((t) => !t.active);
        if (!tile) {
          continue;
        }

        const screen = isoToScreen(tx, ty);
        tile.setTexture(tile.variantKey);
        tile.setPosition(screen.x, screen.y).setVisible(true).setActive(true).setDepth(-9999);
        this.tileIndex.set(key, tile);
      }
    }
  }

  recycleTiles() {
    const center = screenToIso(this.player.x, this.player.y);
    if (center.x === this.lastCenterTile.x && center.y === this.lastCenterTile.y) {
      return;
    }
    this.lastCenterTile = { ...center };

    this.tileIndex.forEach((tile, key) => {
      const [tx, ty] = key.split(",").map(Number);
      if (Math.abs(tx - center.x) > MAP_RADIUS + 1 || Math.abs(ty - center.y) > MAP_RADIUS + 1) {
        tile.setVisible(false).setActive(false);
        this.tileIndex.delete(key);
      }
    });

    this.generateTilesAround(center.x, center.y);
  }

  createPlayer() {
    this.playerShadow = this.add.ellipse(0, 24, 38, 13, 0x000000, 0.35);
    this.player = this.physics.add.sprite(0, 0, "warrior-idle");
    this.player.body.setSize(28, 20);
    this.player.body.setOffset(18, 40);
    this.safePlay(this.player, "warrior-idle");
    this.playerMoving = false;

    this.player.on("animationcomplete-warrior-attack", () => {
      const moving = this.player.body.speed > 5;
      this.safePlay(this.player, moving ? "warrior-walk" : "warrior-idle");
    });
  }

  applyClassVisualStyle() {
    const classId = this.gs.player.classId;
    this.skillVfx = {
      primary: 0xf1c40f,
      secondary: 0xe67e22,
      trail: 0xf39c12
    };

    if (classId === "barbarian") {
      this.player.setTint(0xffd6b3);
      this.player.anims.timeScale = 0.95;
      this.skillVfx = {
        primary: 0xe67e22,
        secondary: 0xc0392b,
        trail: 0xf5b041
      };
      return;
    }

    if (classId === "sorcerer") {
      this.player.setTint(0xc8d9ff);
      this.player.anims.timeScale = 1.05;
      this.skillVfx = {
        primary: 0x5dade2,
        secondary: 0xaf7ac5,
        trail: 0x85c1e9
      };
      return;
    }

    this.player.setTint(0xd5f5e3);
    this.player.anims.timeScale = 1.15;
    this.skillVfx = {
      primary: 0x58d68d,
      secondary: 0x9b59b6,
      trail: 0x82e0aa
    };
  }

  createCinematicFX() {
    const { width, height } = this.scale;
    const sf = (obj, depth = 11000) => obj.setScrollFactor(0).setDepth(depth);

    if (!this.textures.exists("ui-vignette")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x000000, 0.08);
      g.fillRect(0, 0, width, height);
      for (let i = 0; i < 14; i += 1) {
        const alpha = 0.025 + i * 0.012;
        g.lineStyle(22, 0x000000, alpha);
        g.strokeRect(10 + i * 7, 10 + i * 7, width - (20 + i * 14), height - (20 + i * 14));
      }
      g.generateTexture("ui-vignette", width, height);
      g.destroy();
    }

    this.vignetteOverlay = sf(this.add.image(width / 2, height / 2, "ui-vignette"), 9989).setAlpha(0.52);
    this.damageOverlay = sf(this.add.rectangle(width / 2, height / 2, width, height, 0xe74c3c, 0), 10996);
    this.flashOverlay = sf(this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0), 10997);
    this.darkPulseOverlay = sf(this.add.rectangle(width / 2, height / 2, width, height, 0x1b2631, 0), 10994);
  }

  createWorldAmbience() {
    this.ambientEmitElapsed = 0;
  }

  updateWorldAmbience(delta) {
    this.ambientEmitElapsed += delta;
    if (this.ambientEmitElapsed < 120) {
      return;
    }
    this.ambientEmitElapsed = 0;
    if (!this.player?.active) {
      return;
    }

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.FloatBetween(90, 230);
    const x = this.player.x + Math.cos(angle) * radius;
    const y = this.player.y + Math.sin(angle) * radius;
    const palette = [0x7fb3d5, 0xa3e4d7, 0xf9e79f];
    const color = palette[Math.floor(Math.random() * palette.length)];
    const mote = this.add.image(x, y, "fx-dot").setTint(color).setAlpha(0.33);
    mote.setDepth(y - 50);
    const drift = Phaser.Math.FloatBetween(-18, 18);
    this.tweens.add({
      targets: mote,
      y: y - Phaser.Math.FloatBetween(18, 34),
      x: x + drift,
      alpha: 0,
      duration: Phaser.Math.Between(1200, 2200),
      onComplete: () => mote.destroy()
    });
  }

  updateScreenFX(delta) {
    if (!this.vignetteOverlay) {
      return;
    }

    const lowHpFactor = 1 - Phaser.Math.Clamp(this.gs.player.hp / this.gs.player.maxHp, 0, 1);
    const pulse = Math.sin(this.gs.elapsed / 420) * 0.02;
    this.vignetteOverlay.setAlpha(0.48 + pulse + lowHpFactor * 0.18);

    if (this.damageOverlay.alpha > 0.001) {
      this.damageOverlay.setAlpha(Math.max(0, this.damageOverlay.alpha - delta * 0.0025));
    }
    if (this.flashOverlay.alpha > 0.001) {
      this.flashOverlay.setAlpha(Math.max(0, this.flashOverlay.alpha - delta * 0.004));
    }
    if (this.darkPulseOverlay.alpha > 0.001) {
      this.darkPulseOverlay.setAlpha(Math.max(0, this.darkPulseOverlay.alpha - delta * 0.002));
    }
  }

  requestHitStop(ms) {
    if (ms <= 14 && this.gs.elapsed - this.lastImpactTime < 45) {
      return;
    }
    this.lastImpactTime = this.gs.elapsed;
    this.hitStopRemaining = Math.max(this.hitStopRemaining, ms);
  }

  triggerDamageFlash(amount) {
    const boost = Phaser.Math.Clamp(amount / 65, 0.08, 0.3);
    this.damageOverlay.setAlpha(Math.max(this.damageOverlay.alpha, boost));
    this.darkPulseOverlay.setAlpha(Math.max(this.darkPulseOverlay.alpha, boost * 0.36));
  }

  triggerImpactFlash(strong = false) {
    const alpha = strong ? 0.2 : 0.12;
    this.flashOverlay.setAlpha(Math.max(this.flashOverlay.alpha, alpha));
  }

  createGroups() {
    this.enemies = this.physics.add.group();
    this.gems = this.physics.add.group();
    this.playerBullets = this.physics.add.group({ maxSize: 40 });
    this.enemyBullets = this.physics.add.group({ maxSize: 40 });
    this.shadows = this.add.group();
    this.lootDrops = this.add.group();
  }

  createCollisions() {
    const gs = this.gs;

    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
      if (gs.player.invincible > 0) {
        return;
      }
      const hit = computeMitigatedDamage(enemy.damage, gs.player);
      gs.player.invincible = hit.dodged ? 280 : 700;
      if (hit.dodged) {
        this.gs.stats.dodges += 1;
        this.spawnFloatingText(this.player.x, this.player.y - 36, "Esquiva", 0x95a5a6);
        return;
      }
      gs.player.hp -= hit.amount;
      this.gs.stats.damageTaken += hit.amount;
      this.gs.stats.highestTakenHit = Math.max(this.gs.stats.highestTakenHit, hit.amount);
      this.cameras.main.shake(120, 0.007);
      this.triggerDamageFlash(hit.amount);
      this.requestHitStop(42);
      this.spawnDamageNumber(this.player.x, this.player.y - 38, hit.amount, false, true);
      if (gs.player.hasShield) {
        this.dealDamageToEnemy(enemy, 20);
      }
      if (gs.player.hp <= 0) {
        this.triggerGameOver();
      }
    });

    this.physics.add.overlap(this.player, this.enemyBullets, (_player, bullet) => {
      if (gs.player.invincible > 0) {
        return;
      }
      const hit = computeMitigatedDamage(bullet.damage ?? 5, gs.player);
      gs.player.invincible = hit.dodged ? 250 : 500;
      bullet.destroy();
      if (hit.dodged) {
        this.gs.stats.dodges += 1;
        this.spawnFloatingText(this.player.x, this.player.y - 36, "Esquiva", 0x95a5a6);
        return;
      }
      gs.player.hp -= hit.amount;
      this.gs.stats.damageTaken += hit.amount;
      this.gs.stats.highestTakenHit = Math.max(this.gs.stats.highestTakenHit, hit.amount);
      this.triggerDamageFlash(hit.amount);
      this.requestHitStop(34);
      this.spawnDamageNumber(this.player.x, this.player.y - 38, hit.amount, false, true);
      this.spawnRadialBurst(this.player.x, this.player.y, 0xe74c3c, 6, 34, 1.7);
      if (gs.player.hp <= 0) {
        this.triggerGameOver();
      }
    });

    this.physics.add.overlap(this.playerBullets, this.enemies, (bullet, enemy) => {
      this.dealDamageToEnemy(enemy, bullet.damage ?? this.gs.player.damage * 0.7);
      if ((bullet.splashRadius ?? 0) > 0) {
        this.executeSplashDamage(enemy.x, enemy.y, bullet.splashRadius, (bullet.damage ?? 10) * 0.65);
        if (bullet.isFireOrb) {
          this.spawnFireImpact(enemy.x, enemy.y);
        }
      }
      bullet.pierce = (bullet.pierce ?? 0) - 1;
      if (bullet.pierce < 0) {
        bullet.destroy();
      }
    });
  }

  createCamera() {
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);
  }

  createKeyboard() {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }
    this.keyUp = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keyDown = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keyLeft = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keyRight = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  }

  createJoystick() {
    const { width, height } = this.scale;
    this.joystickActive = false;
    this.joystickDX = 0;
    this.joystickDY = 0;
    const radius = 45;

    this.joyBase = this.add.circle(90, height - 100, radius, 0xffffff, 0.12)
      .setScrollFactor(0)
      .setDepth(10000);
    this.joyThumb = this.add.circle(90, height - 100, 22, 0xffffff, 0.35)
      .setScrollFactor(0)
      .setDepth(10001);

    const zone = this.add.zone(0, height * 0.45, width * 0.6, height * 0.55)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setInteractive();

    zone.on("pointerdown", (ptr) => {
      this.joystickActive = true;
      this.joyBase.setPosition(ptr.x, ptr.y);
      this.joyThumb.setPosition(ptr.x, ptr.y);
    });

    zone.on("pointermove", (ptr) => {
      if (!this.joystickActive) {
        return;
      }
      let dx = ptr.x - this.joyBase.x;
      let dy = ptr.y - this.joyBase.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) {
        dx = (dx / dist) * radius;
        dy = (dy / dist) * radius;
      }

      this.joyThumb.setPosition(this.joyBase.x + dx, this.joyBase.y + dy);
      this.joystickDX = dx / radius;
      this.joystickDY = dy / radius;
    });

    this.input.on("pointerup", () => {
      this.joystickActive = false;
      this.joystickDX = 0;
      this.joystickDY = 0;
      this.joyThumb.setPosition(this.joyBase.x, this.joyBase.y);
    });
  }

  handlePlayerMovement() {
    const gs = this.gs;
    let vx = 0;
    let vy = 0;

    if (this.keyLeft?.isDown || this.keyA?.isDown) vx -= 1;
    if (this.keyRight?.isDown || this.keyD?.isDown) vx += 1;
    if (this.keyUp?.isDown || this.keyW?.isDown) vy -= 1;
    if (this.keyDown?.isDown || this.keyS?.isDown) vy += 1;

    if (this.joystickActive) {
      vx = this.joystickDX;
      vy = this.joystickDY;
    }

    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) {
      vx /= len;
      vy /= len;
    }

    this.player.setVelocity(vx * gs.player.speed, vy * gs.player.speed);
    this.playerMoving = len > 0;

    if (vx < 0) this.player.setFlipX(true);
    else if (vx > 0) this.player.setFlipX(false);

    const cur = this.player.anims.currentAnim?.key;
    if (cur !== "warrior-attack") {
      const next = this.playerMoving ? "warrior-walk" : "warrior-idle";
      if (cur !== next) {
        this.safePlay(this.player, next);
      }
    }
  }

  handleSkillTimers(delta) {
    const p = this.gs.player;
    if (p.invincible > 0) {
      p.invincible -= delta;
    }
    regenClassResource(p, delta);

    p.classSkillElapsed += delta;
    if (p.classSkillElapsed >= p.classSkillCooldown) {
      p.classSkillElapsed = 0;
      this.executeClassSkill();
    }

    p.slashElapsed += delta;
    if (p.slashElapsed >= p.slashCooldown) {
      p.slashElapsed = 0;
      this.executeSlash();
    }

    if (p.hasAura) {
      p.auraElapsed += delta;
      if (p.auraElapsed >= p.auraCooldown) {
        p.auraElapsed = 0;
        this.executeAura();
      }
    }

    if (p.hasMultishot) {
      p.multiElapsed += delta;
      if (p.multiElapsed >= p.multiCooldown) {
        p.multiElapsed = 0;
        this.executeMultishot();
      }
    }

    if (p.hasFreeze) {
      p.freezeElapsed += delta;
      if (p.freezeElapsed >= p.freezeCooldown) {
        p.freezeElapsed = 0;
        this.executeFreeze();
      }
    }

    if (p.hasRegen) {
      p.regenElapsed += delta;
      if (p.regenElapsed >= p.regenCooldown) {
        p.regenElapsed = 0;
        p.hp = Math.min(p.maxHp, p.hp + 3);
      }
    }
  }

  executeSlash() {
    const damage = this.gs.player.damage;
    const range = 80;
    const slash = this.add.sprite(this.player.x, this.player.y, "slash");
    slash.setDepth(this.player.y + 1).setTint(this.skillVfx.primary);
    if (this.anims.exists("slash")) {
      slash.play("slash");
    } else {
      this.time.delayedCall(150, () => slash.destroy());
    }
    this.spawnRadialBurst(this.player.x, this.player.y, this.skillVfx.secondary, 11, 85);
    this.spawnPulseRing(this.player.x, this.player.y, 18, 76, this.skillVfx.primary, 0.4, 240);
    this.cameras.main.shake(70, 0.004);
    this.triggerImpactFlash(false);

    this.enemies.getChildren().forEach((enemy) => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (d <= range) {
        this.dealDamageToEnemy(enemy, damage);
      }
    });

    this.safePlay(this.player, "warrior-attack");
  }

  executeAura() {
    const range = 100;
    const damage = 12;
    this.spawnPulseRing(this.player.x, this.player.y, 10, range, this.skillVfx.secondary, 0.45, 350);
    this.time.delayedCall(80, () => {
      this.spawnPulseRing(this.player.x, this.player.y, 14, range + 14, this.skillVfx.primary, 0.25, 360);
    });
    this.spawnRadialBurst(this.player.x, this.player.y, this.skillVfx.primary, 10, 95);
    this.triggerImpactFlash(false);

    this.enemies.getChildren().forEach((enemy) => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (d <= range) {
        this.dealDamageToEnemy(enemy, damage);
      }
    });
  }

  executeMultishot() {
    const angles = [0, 90, 180, 270];
    angles.forEach((deg) => {
      const rad = Phaser.Math.DegToRad(deg);
      const bullet = this.playerBullets.get(this.player.x, this.player.y, "bullet");
      if (!bullet) {
        return;
      }
      bullet.setActive(true).setVisible(true).clearTint();
      bullet.setVelocity(Math.cos(rad) * 210, Math.sin(rad) * 210);
      bullet.damage = this.gs.player.damage * 0.7;
      bullet.pierce = 0;
      bullet.splashRadius = 0;
      bullet.isFireOrb = false;
      bullet.lifespan = 1200;
      bullet.trailColor = this.skillVfx.trail;
      bullet.setDepth(this.player.y);
    });
  }

  executeFreeze() {
    const range = 160;
    this.cameras.main.flash(200, 50, 180, 255, false);
    this.spawnPulseRing(this.player.x, this.player.y, 20, range, 0x7fb3d5, 0.4, 360);
    this.spawnRadialBurst(this.player.x, this.player.y, 0xd6eaf8, 14, 140, 1.6);
    this.requestHitStop(24);
    this.enemies.getChildren().forEach((enemy) => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (d <= range) {
        enemy.frozen = 2500;
        enemy.setTint(0x7ff0e8);
      }
    });
  }

  executeClassSkill() {
    const p = this.gs.player;
    if (!trySpendResource(p, p.classSkillCost)) {
      return;
    }

    if (p.classId === "barbarian") {
      this.executeBarbarianEarthquake();
      return;
    }
    if (p.classId === "sorcerer") {
      this.executeSorcererFireOrb();
      return;
    }
    this.executeRogueShadowVolley();
  }

  executeBarbarianEarthquake() {
    const range = 116;
    const damage = this.gs.player.damage * 1.8;
    this.spawnPulseRing(this.player.x, this.player.y, 15, range, 0xe67e22, 0.45, 330);
    this.spawnPulseRing(this.player.x, this.player.y, 8, range + 24, 0xc0392b, 0.24, 380);
    this.spawnRadialBurst(this.player.x, this.player.y, 0xf5b041, 18, 130, 2.2);
    this.cameras.main.shake(130, 0.009);
    this.requestHitStop(34);
    this.triggerImpactFlash(true);

    this.enemies.getChildren().forEach((enemy) => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (d <= range) {
        this.dealDamageToEnemy(enemy, damage);
        this.physics.velocityFromRotation(
          Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y),
          130,
          enemy.body.velocity
        );
      }
    });
  }

  executeSorcererFireOrb() {
    const target = this.getNearestEnemy();
    if (!target) {
      return;
    }

    const orb = this.playerBullets.get(this.player.x, this.player.y, "bullet");
    if (!orb) {
      return;
    }
    orb.setActive(true).setVisible(true).setTint(0xff8c00);
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    orb.setVelocity(Math.cos(angle) * 250, Math.sin(angle) * 250);
    orb.damage = this.gs.player.damage * 1.6;
    orb.pierce = 0;
    orb.splashRadius = 72;
    orb.lifespan = 1500;
    orb.trailColor = 0xffa726;
    orb.isFireOrb = true;
    this.spawnPulseRing(this.player.x, this.player.y, 6, 26, 0xffa726, 0.4, 180);
    this.triggerImpactFlash(false);
  }

  executeRogueShadowVolley() {
    const targets = this.enemies.getChildren().slice(0, 3);
    if (!targets.length) {
      return;
    }

    targets.forEach((enemy, index) => {
      const bullet = this.playerBullets.get(this.player.x, this.player.y, "bullet");
      if (!bullet) {
        return;
      }
      const spread = Phaser.Math.DegToRad((index - 1) * 10);
      const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y) + spread;
      bullet.setActive(true).setVisible(true).setTint(0x9b59b6);
      bullet.setVelocity(Math.cos(baseAngle) * 300, Math.sin(baseAngle) * 300);
      bullet.damage = this.gs.player.damage * 1.15;
      bullet.pierce = 1;
      bullet.splashRadius = 0;
      bullet.isFireOrb = false;
      bullet.lifespan = 1100;
      bullet.trailColor = 0xc39bd3;
    });
    this.spawnRadialBurst(this.player.x, this.player.y, 0x9b59b6, 8, 70);
  }

  spawnEnemy() {
    const wave = this.gs.wave;
    const available = Object.entries(ENEMY_CONFIG)
      .filter(([, cfg]) => cfg.availableFrom <= wave)
      .map(([type]) => type);
    const type = available[Math.floor(Math.random() * available.length)];
    const cfg = ENEMY_CONFIG[type];
    const modifiers = rollEnemyModifiers(type, wave, this.gs.kills, this.hasBossAlive);
    const angle = Math.random() * Math.PI * 2;
    const dist = 340 + Math.random() * 120;
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;

    const enemy = this.enemies.create(x, y, cfg.anim);
    this.safePlay(enemy, cfg.anim);
    enemy.setScale(cfg.scale + modifiers.scaleBonus);
    enemy.body.setSize(cfg.bodyW, cfg.bodyH);
    enemy.body.setOffset(cfg.bodyOffsetX, cfg.bodyOffsetY);
    enemy.enemyType = type;
    enemy.enemyTier = modifiers.tier;
    enemy.affixes = modifiers.affixes;
    enemy.hp = (cfg.hp + (wave - 1) * Math.floor(cfg.hp * 0.2)) * modifiers.hpMultiplier;
    enemy.maxHp = enemy.hp;
    enemy.speed = cfg.speed * modifiers.speedMultiplier;
    enemy.damage = cfg.damage * modifiers.damageMultiplier;
    enemy.xpReward = cfg.xp * modifiers.xpMultiplier;
    enemy.frozen = 0;
    enemy.shootTimer = 0;
    enemy.canShoot = Boolean(cfg.canShoot || modifiers.canShoot);
    enemy.shootCooldown = (cfg.shootCooldown ?? 2800) * (modifiers.shootCooldownMultiplier ?? 1);
    enemy.shootRange = cfg.shootRange ?? 220;
    enemy.bulletSpeed = cfg.bulletSpeed ?? 165;
    enemy.telegraphed = false;
    enemy.hasDeathExplosion = Boolean(modifiers.hasDeathExplosion);
    enemy.spawnName = modifiers.name;
    enemy.baseTint = modifiers.tint;
    if (modifiers.tint) {
      enemy.setTint(modifiers.tint);
    }
    if (enemy.enemyTier === "boss") {
      this.hasBossAlive = true;
      this.currentBoss = enemy;
      this.spawnFloatingText(enemy.x, enemy.y - 28, "MINI BOSS", 0xe74c3c);
    } else if (enemy.enemyTier === "elite") {
      this.spawnFloatingText(enemy.x, enemy.y - 20, "ELITE", 0xf1c40f);
    }

    const shadow = this.add.ellipse(x, y + cfg.bodyH / 2 + 6, cfg.shadowW, cfg.shadowH, 0x000000, 0.35);
    shadow.setDepth(-1);
    enemy.shadow = shadow;
    this.shadows.add(shadow);
  }

  handleEnemyAI(delta) {
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.frozen > 0) {
        enemy.frozen -= delta;
        enemy.setVelocity(0, 0);
        if (enemy.frozen <= 0) {
          enemy.frozen = 0;
          enemy.clearTint();
          if (enemy.baseTint) {
            enemy.setTint(enemy.baseTint);
          }
        }
        return;
      }

      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      enemy.setVelocity(Math.cos(angle) * enemy.speed, Math.sin(angle) * enemy.speed);
      enemy.setFlipX(enemy.x > this.player.x);

      if (enemy.canShoot) {
        enemy.shootTimer += delta;
        const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        const remaining = enemy.shootCooldown - enemy.shootTimer;
        if (dist <= enemy.shootRange && remaining <= 280 && !enemy.telegraphed) {
          enemy.telegraphed = true;
          this.spawnPulseRing(enemy.x, enemy.y, 5, 18, 0xe74c3c, 0.4, 200);
        }
        if (remaining > 320) {
          enemy.telegraphed = false;
        }
        if (enemy.shootTimer >= enemy.shootCooldown && dist <= enemy.shootRange) {
          enemy.shootTimer = 0;
          enemy.telegraphed = false;
          this.enemyShoot(enemy, enemy.bulletSpeed);
        }
      }
    });
  }

  enemyShoot(enemy, bulletSpeed) {
    const bullet = this.enemyBullets.get(enemy.x, enemy.y, "bullet");
    if (!bullet) {
      return;
    }
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    const tracer = this.add.line(0, 0, enemy.x, enemy.y, this.player.x, this.player.y, 0xff7675, 0.45)
      .setLineWidth(2, 2)
      .setDepth(enemy.y + 2);
    this.tweens.add({
      targets: tracer,
      alpha: 0,
      duration: 120,
      onComplete: () => tracer.destroy()
    });
    bullet.setActive(true).setVisible(true).setTint(0xe74c3c);
    bullet.setVelocity(Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed);
    bullet.damage = enemy.damage;
    bullet.pierce = 0;
    bullet.splashRadius = 0;
    bullet.isFireOrb = false;
    bullet.lifespan = 2200;
    bullet.trailColor = 0xe74c3c;
  }

  executeSplashDamage(x, y, radius, damage) {
    this.spawnPulseRing(x, y, 10, radius, 0xf39c12, 0.4, 180);
    this.spawnRadialBurst(x, y, 0xf5cba7, 10, radius * 0.7);

    this.enemies.getChildren().forEach((other) => {
      const dist = Phaser.Math.Distance.Between(x, y, other.x, other.y);
      if (dist <= radius) {
        this.dealDamageToEnemy(other, damage);
      }
    });
  }

  getNearestEnemy() {
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    this.enemies.getChildren().forEach((enemy) => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist < nearestDistance) {
        nearest = enemy;
        nearestDistance = dist;
      }
    });
    return nearest;
  }

  spawnFloatingText(x, y, text, color = 0xffffff) {
    const label = this.add.text(x, y, text, {
      fontSize: "12px",
      color: Phaser.Display.Color.IntegerToColor(color).rgba
    }).setOrigin(0.5);
    label.setDepth(y + 2000);
    this.tweens.add({
      targets: label,
      y: y - 26,
      alpha: 0,
      duration: 600,
      onComplete: () => label.destroy()
    });
  }

  spawnDamageNumber(x, y, amount, critical = false, incoming = false) {
    const value = Math.max(1, Math.round(amount));
    const color = incoming ? "#ff7675" : (critical ? "#f1c40f" : "#ecf0f1");
    const label = this.add.text(x, y, `${value}`, {
      fontSize: critical ? "14px" : "12px",
      fontStyle: "bold",
      color
    }).setOrigin(0.5);
    label.setDepth(y + 2100);
    this.tweens.add({
      targets: label,
      y: y - (critical ? 34 : 26),
      alpha: 0,
      duration: critical ? 680 : 520,
      onComplete: () => label.destroy()
    });
  }

  spawnPulseRing(x, y, startRadius, endRadius, color, alpha, duration) {
    const ring = this.add.circle(x, y, startRadius, color, alpha);
    ring.setDepth(y + 2);
    this.tweens.add({
      targets: ring,
      radius: endRadius,
      alpha: 0,
      duration,
      ease: "Cubic.Out",
      onComplete: () => ring.destroy()
    });
  }

  spawnRadialBurst(x, y, color, count, speed, size = 2.2) {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.08, 0.08);
      const px = x + Math.cos(angle) * 8;
      const py = y + Math.sin(angle) * 8;
      const spark = this.add.circle(px, py, Phaser.Math.FloatBetween(size * 0.6, size), color, 0.95);
      spark.setDepth(y + 3);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        duration: Phaser.Math.Between(180, 300),
        onComplete: () => spark.destroy()
      });
    }
  }

  spawnFireImpact(x, y) {
    if (this.anims.exists("fire-burst")) {
      const fire = this.add.sprite(x, y, "asset-fire");
      fire.setDepth(y + 4).setScale(1.6).setTint(0xffb347);
      fire.play("fire-burst");
      return;
    }

    this.spawnPulseRing(x, y, 6, 34, 0xff8c00, 0.45, 180);
    this.spawnRadialBurst(x, y, 0xffc266, 10, 48, 2.5);
  }

  dealDamageToEnemy(enemy, damage) {
    const critResult = rollCriticalDamage(damage, this.gs.player);
    enemy.hp -= critResult.amount;
    this.gs.stats.damageDealt += critResult.amount;
    this.gs.stats.highestHit = Math.max(this.gs.stats.highestHit, critResult.amount);
    this.tweens.add({
      targets: enemy,
      alpha: 0.3,
      yoyo: true,
      duration: 80
    });
    if (critResult.isCritical) {
      this.gs.stats.crits += 1;
      this.spawnFloatingText(enemy.x, enemy.y - 20, "CRIT", 0xf1c40f);
      this.spawnRadialBurst(enemy.x, enemy.y - 2, 0xf1c40f, 8, 45);
      this.spawnDamageNumber(enemy.x, enemy.y - 34, critResult.amount, true, false);
      this.requestHitStop(30);
      this.triggerImpactFlash(true);
    } else {
      this.spawnRadialBurst(enemy.x, enemy.y - 1, this.skillVfx.primary, 5, 28, 1.6);
      this.spawnDamageNumber(enemy.x, enemy.y - 28, critResult.amount, false, false);
      this.requestHitStop(8);
    }
    this.onSuccessfulHit();

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  killEnemy(enemy) {
    this.gs.kills += 1;
    if (enemy.enemyTier === "elite") {
      this.gs.stats.elitesKilled += 1;
    }
    this.spawnGem(enemy.x, enemy.y, enemy.xpReward);
    this.emitDeathParticles(enemy.x, enemy.y);
    gainClassResource(this.gs.player, 7);
    const loot = rollLootDrop(enemy.enemyType, this.gs.wave, enemy.enemyTier);
    if (loot) {
      this.spawnLootDrop(enemy.x, enemy.y, loot);
    }

    if (enemy.hasDeathExplosion) {
      this.triggerEnemyDeathExplosion(enemy.x, enemy.y, enemy.damage * 1.1);
    }
    if (enemy.enemyTier === "boss") {
      this.hasBossAlive = false;
      this.currentBoss = null;
      this.gs.stats.bossesKilled += 1;
      this.spawnFloatingText(enemy.x, enemy.y - 36, "BOSS ABATIDO", 0xf39c12);
      this.triggerImpactFlash(true);
      this.requestHitStop(70);
      this.cameras.main.shake(210, 0.012);
    }
    if (enemy.shadow) {
      enemy.shadow.destroy();
    }
    enemy.destroy();
  }

  onSuccessfulHit() {
    const p = this.gs.player;
    if (p.classId === "barbarian") {
      gainClassResource(p, 5);
      return;
    }
    if (p.classId === "rogue") {
      gainClassResource(p, 2.5);
      return;
    }
    gainClassResource(p, 1.2);
  }

  triggerEnemyDeathExplosion(x, y, rawDamage) {
    const radius = 72;
    const ring = this.add.circle(x, y, 12, 0xe74c3c, 0.42);
    ring.setDepth(y + 5);
    this.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 240,
      onComplete: () => ring.destroy()
    });

    const dist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
    if (dist <= radius && this.gs.player.invincible <= 0) {
      const hit = computeMitigatedDamage(rawDamage, this.gs.player);
      this.gs.player.invincible = hit.dodged ? 220 : 520;
      if (hit.dodged) {
        this.gs.stats.dodges += 1;
        this.spawnFloatingText(this.player.x, this.player.y - 36, "Esquiva", 0x95a5a6);
      } else {
        this.gs.player.hp -= hit.amount;
        this.gs.stats.damageTaken += hit.amount;
        this.gs.stats.highestTakenHit = Math.max(this.gs.stats.highestTakenHit, hit.amount);
        this.spawnDamageNumber(this.player.x, this.player.y - 38, hit.amount, false, true);
        this.triggerDamageFlash(hit.amount);
        this.requestHitStop(48);
        this.cameras.main.shake(150, 0.009);
        if (this.gs.player.hp <= 0) {
          this.triggerGameOver();
        }
      }
    }
  }

  emitDeathParticles(x, y) {
    for (let i = 0; i < 8; i += 1) {
      const p = this.add.circle(x, y, 2 + Math.random() * 2, 0xffd166, 0.9);
      p.setDepth(y + 1);
      const dx = Phaser.Math.Between(-40, 40);
      const dy = Phaser.Math.Between(-30, 30);
      this.tweens.add({
        targets: p,
        x: x + dx,
        y: y + dy,
        alpha: 0,
        duration: 260,
        onComplete: () => p.destroy()
      });
    }
  }

  spawnGem(x, y, value) {
    const gem = this.gems.create(x, y, "gem");
    gem.xpValue = value;
    gem.setDepth(y - 1);

    this.tweens.add({
      targets: gem,
      y: y - 8,
      yoyo: true,
      repeat: -1,
      duration: 600,
      ease: "Sine.easeInOut"
    });
  }

  spawnLootDrop(x, y, loot) {
    const colorInt = Phaser.Display.Color.HexStringToColor(loot.rarity.color).color;
    const drop = this.add.circle(x, y, 11, colorInt, 0.92)
      .setStrokeStyle(2, 0xffffff, 0.85)
      .setInteractive({ useHandCursor: true });
    drop.setDepth(y + 3);
    drop.lootData = loot;
    drop.lifespan = 18000;
    drop.baseY = y;
    this.lootDrops.add(drop);

    drop.on("pointerdown", () => {
      this.tryEquipLootDrop(drop);
    });
  }

  tryEquipLootDrop(drop) {
    if (!drop?.active || !drop.lootData) {
      return;
    }

    const loot = drop.lootData;
    const current = this.gs.player.equipment?.[loot.slot] ?? null;
    equipLootItem(this.gs.player, loot);
    const color = Phaser.Display.Color.HexStringToColor(loot.rarity.color).color;
    const verb = current ? "Substituido" : "Equipado";
    this.spawnFloatingText(drop.x, drop.y - 18, `${verb}: ${loot.slotLabel}`, color);
    this.gs.stats.lootEquipped += 1;
    this.refreshEquipmentHUD();
    drop.destroy();
  }

  updateLootDrops(delta) {
    this.lootDrops.getChildren().forEach((drop) => {
      drop.lifespan -= delta;
      drop.setY(drop.baseY + Math.sin((this.gs.elapsed + drop.x) / 180) * 3.5);
      if (drop.lifespan <= 0) {
        drop.destroy();
      }
    });
  }

  handleGemAttraction() {
    const magnetRange = this.gs.player.hasMagnet ? 190 : 50;

    this.gems.getChildren().forEach((gem) => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, gem.x, gem.y);
      if (d <= magnetRange) {
        const angle = Phaser.Math.Angle.Between(gem.x, gem.y, this.player.x, this.player.y);
        gem.x += Math.cos(angle) * 5;
        gem.y += Math.sin(angle) * 5;
      }

      if (d <= 18) {
        this.collectGem(gem);
      }
    });
  }

  collectGem(gem) {
    const p = this.gs.player;
    p.xp += gem.xpValue;
    gem.destroy();

    if (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.xpNext = Math.floor(p.xpNext * 1.35);
      p.level += 1;
      this.triggerLevelUp();
    }
  }

  triggerLevelUp() {
    this.gs.paused = true;
    const activeIds = this.gs.player.skills;
    const baseAvailable = SKILLS.filter((s) => !activeIds.includes(s.id));
    const classAvailable = this.classSkillTree.filter((s) => !activeIds.includes(s.id));
    const available = [...classAvailable, ...baseAvailable];
    const choices = Phaser.Utils.Array.Shuffle(available).slice(0, 3);
    if (!choices.length) {
      this.gs.paused = false;
      return;
    }

    this.scene.launch("LevelUpScene", {
      choices,
      onChoice: (skill) => {
        skill.apply(this.gs);
        this.gs.player.skills.push(skill.id);
        this.gs.paused = false;
        this.scene.stop("LevelUpScene");
        this.updateSkillsHUD();
      }
    });
  }

  createHUD() {
    const { width } = this.scale;
    const sf = (obj) => obj.setScrollFactor(0).setDepth(9998);
    sf(this.add.rectangle(width / 2, 64, width, 128, 0x000000, 0.62));

    sf(this.add.text(12, 12, "HP", { fontSize: "13px", color: "#fff" }));
    this.hudHpBg = sf(this.add.rectangle(width / 2 + 10, 20, width - 80, 16, 0x333333).setOrigin(0, 0.5));
    this.hudHpFill = sf(this.add.rectangle(width / 2 + 10 - (width - 80) / 2, 20, width - 80, 16, 0xe74c3c).setOrigin(0, 0.5));
    this.hudHpText = sf(this.add.text(width - 10, 20, "", { fontSize: "11px", color: "#fff" }).setOrigin(1, 0.5));

    this.hudResourceLabel = sf(this.add.text(12, 38, this.gs.player.resourceType, { fontSize: "13px", color: "#fff" }));
    this.hudResourceBg = sf(this.add.rectangle(width / 2 + 10, 44, width - 80, 10, 0x333333).setOrigin(0, 0.5));
    this.hudResourceFill = sf(this.add.rectangle(width / 2 + 10 - (width - 80) / 2, 44, 0, 10, 0x8e44ad).setOrigin(0, 0.5));
    this.hudResourceText = sf(this.add.text(width - 10, 44, "", { fontSize: "10px", color: "#d7bde2" }).setOrigin(1, 0.5));

    sf(this.add.text(12, 56, "XP", { fontSize: "13px", color: "#fff" }));
    this.hudXpBg = sf(this.add.rectangle(width / 2 + 10, 62, width - 80, 10, 0x333333).setOrigin(0, 0.5));
    this.hudXpFill = sf(this.add.rectangle(width / 2 + 10 - (width - 80) / 2, 62, 0, 10, 0x3498db).setOrigin(0, 0.5));

    this.hudClass = sf(this.add.text(12, 74, this.gs.player.className, { fontSize: "12px", color: "#f39c12", fontStyle: "bold" }));
    this.hudLevel = sf(this.add.text(120, 74, "Nivel 1", { fontSize: "12px", color: "#f1c40f", fontStyle: "bold" }));
    this.hudKills = sf(this.add.text(width / 2, 74, "0 kills", { fontSize: "12px", color: "#fff" }).setOrigin(0.5, 0));
    this.hudTimer = sf(this.add.text(width - 12, 74, "0:00", { fontSize: "12px", color: "#fff" }).setOrigin(1, 0));
    this.hudSkillReady = sf(this.add.text(width - 12, 90, "Skill: pronto", { fontSize: "10px", color: "#2ecc71" }).setOrigin(1, 0));
    this.hudDefense = sf(this.add.text(12, 90, "ARM 0 | RES 0 | PODER 0", { fontSize: "10px", color: "#bdc3c7" }));
    this.hudSkills = sf(this.add.text(12, 104, "", { fontSize: "10px", color: "#aaa" }));

    const invPanelX = width - 124;
    sf(this.add.rectangle(invPanelX + 58, 115, 116, 52, 0x151515, 0.85).setStrokeStyle(1, 0x444444));
    sf(this.add.text(invPanelX + 6, 91, "Equipado", { fontSize: "9px", color: "#ecf0f1" }));
    this.hudSlotWeapon = sf(this.add.text(invPanelX + 6, 103, "Arma: -", { fontSize: "9px", color: "#bdc3c7" }));
    this.hudSlotArmor = sf(this.add.text(invPanelX + 6, 115, "Armadura: -", { fontSize: "9px", color: "#bdc3c7" }));
    this.hudSlotTrinket = sf(this.add.text(invPanelX + 6, 127, "Reliquia: -", { fontSize: "9px", color: "#bdc3c7" }));

    this.hudBossBg = this.add.rectangle(width / 2, 146, width - 70, 16, 0x2c3e50, 0.9)
      .setScrollFactor(0)
      .setDepth(10002)
      .setVisible(false);
    this.hudBossFill = this.add.rectangle(this.hudBossBg.x - this.hudBossBg.width / 2, 146, this.hudBossBg.width, 12, 0xe74c3c, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(10003)
      .setVisible(false);
    this.hudBossText = this.add.text(width / 2, 136, "", { fontSize: "10px", color: "#f5f6fa", fontStyle: "bold" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003)
      .setVisible(false);
    this.refreshEquipmentHUD();
  }

  updateHUD() {
    const p = this.gs.player;
    const bw = this.hudHpBg.width;
    this.hudHpFill.width = bw * Phaser.Math.Clamp(p.hp / p.maxHp, 0, 1);
    this.hudHpText.setText(`${Math.ceil(p.hp)}/${p.maxHp}`);
    this.hudResourceFill.width = bw * Phaser.Math.Clamp(p.resource / p.resourceMax, 0, 1);
    this.hudResourceText.setText(`${Math.floor(p.resource)}/${p.resourceMax}`);
    this.hudXpFill.width = bw * (p.xp / p.xpNext);
    this.hudLevel.setText(`Nivel ${p.level}`);
    this.hudKills.setText(`${this.gs.kills} kills`);
    this.hudDefense.setText(
      `ARM ${Math.floor(p.armor)} | RES ${Math.floor(p.resistance)} | PODER ${Math.floor(p.equipmentPower ?? 0)}`
    );
    const secs = Math.floor(this.gs.elapsed / 1000);
    const m = Math.floor(secs / 60);
    const s = String(secs % 60).padStart(2, "0");
    this.hudTimer.setText(`${m}:${s}`);
    const skillRemaining = Math.max(0, p.classSkillCooldown - p.classSkillElapsed);
    if (skillRemaining <= 120) {
      this.hudSkillReady.setText("Skill: pronto");
      this.hudSkillReady.setColor("#2ecc71");
    } else {
      this.hudSkillReady.setText(`Skill: ${(skillRemaining / 1000).toFixed(1)}s`);
      this.hudSkillReady.setColor("#f1c40f");
    }
    this.updateBossHUD();

    if (p.invincible > 0) {
      this.player.setAlpha(Math.floor(this.gs.elapsed / 80) % 2 === 0 ? 0.4 : 1);
    } else {
      this.player.setAlpha(1);
    }
  }

  refreshEquipmentHUD() {
    const weapon = this.gs.player.equipment.weapon?.rarity.label ?? "-";
    const armor = this.gs.player.equipment.armor?.rarity.label ?? "-";
    const trinket = this.gs.player.equipment.trinket?.rarity.label ?? "-";
    this.hudSlotWeapon.setText(`Arma: ${weapon}`);
    this.hudSlotArmor.setText(`Armadura: ${armor}`);
    this.hudSlotTrinket.setText(`Reliquia: ${trinket}`);
  }

  updateBossHUD() {
    const boss = this.currentBoss;
    const visible = Boolean(boss && boss.active && boss.hp > 0);
    this.hudBossBg.setVisible(visible);
    this.hudBossFill.setVisible(visible);
    this.hudBossText.setVisible(visible);
    if (!visible) {
      return;
    }

    const maxHp = boss.maxHp ?? boss.hp;
    const ratio = Phaser.Math.Clamp(boss.hp / maxHp, 0, 1);
    this.hudBossFill.width = this.hudBossBg.width * ratio;
    this.hudBossText.setText(`${boss.spawnName}  ${Math.ceil(boss.hp)}/${Math.ceil(maxHp)}`);
  }

  updateSkillsHUD() {
    const names = this.gs.player.skills
      .map((id) => SKILLS.find((s) => s.id === id)?.name ?? "")
      .filter(Boolean)
      .join(" | ");
    this.hudSkills.setText(`${this.gs.player.classSkillName} | ${names}`.trim());
  }

  handleDepthSorting() {
    this.player.setDepth(this.player.y);
    this.enemies.getChildren().forEach((e) => e.setDepth(e.y));
    this.gems.getChildren().forEach((g) => g.setDepth(g.y - 10));
    this.lootDrops.getChildren().forEach((d) => d.setDepth(d.y + 2));
    this.playerBullets.getChildren().forEach((b) => b.setDepth(b.y));
    this.enemyBullets.getChildren().forEach((b) => b.setDepth(b.y));
  }

  handleShadowPositions() {
    this.playerShadow.setPosition(this.player.x, this.player.y + 24);
    this.playerShadow.setDepth(this.player.y - 1);
    const playerSpeedRatio = Phaser.Math.Clamp(this.player.body.speed / 230, 0, 1);
    this.playerShadow.setScale(1 + playerSpeedRatio * 0.14, 1 - playerSpeedRatio * 0.12);
    this.playerShadow.setAlpha(0.28 + playerSpeedRatio * 0.2);

    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.shadow) {
        return;
      }
      const cfg = ENEMY_CONFIG[enemy.enemyType];
      enemy.shadow.setPosition(enemy.x, enemy.y + cfg.bodyH / 2 + 4);
      enemy.shadow.setDepth(enemy.y - 1);
      const enemySpeedRatio = Phaser.Math.Clamp(enemy.body.speed / 220, 0, 1);
      const tierBoost = enemy.enemyTier === "boss" ? 0.08 : enemy.enemyTier === "elite" ? 0.04 : 0;
      enemy.shadow.setScale(1 + enemySpeedRatio * 0.12 + tierBoost, 1 - enemySpeedRatio * 0.1);
      enemy.shadow.setAlpha(0.22 + enemySpeedRatio * 0.15 + tierBoost * 0.8);
    });
  }

  updateBullets(delta) {
    const updateGroup = (group) => {
      group.getChildren().forEach((bullet) => {
        bullet.lifespan = (bullet.lifespan ?? 0) - delta;
        bullet.trailElapsed = (bullet.trailElapsed ?? 0) + delta;
        if (bullet.trailElapsed > 36 && bullet.active) {
          bullet.trailElapsed = 0;
          const color = bullet.trailColor ?? (group === this.enemyBullets ? 0xe74c3c : this.skillVfx.trail);
          const dot = this.add.circle(bullet.x, bullet.y, 2.4, color, 0.55);
          dot.setDepth(bullet.y - 1);
          this.tweens.add({
            targets: dot,
            alpha: 0,
            scaleX: 0.2,
            scaleY: 0.2,
            duration: 200,
            onComplete: () => dot.destroy()
          });
        }
        if (bullet.lifespan <= 0) {
          bullet.destroy();
        }
      });
    };

    updateGroup(this.playerBullets);
    updateGroup(this.enemyBullets);
  }

  scheduleNextSpawn() {
    if (!this.gs.running) {
      return;
    }

    this.time.delayedCall(this.gs.spawnInterval, () => {
      if (!this.gs.running) {
        return;
      }

      this.spawnEnemy();
      this.gs.spawnInterval = Math.max(this.gs.minSpawnInterval, this.gs.spawnInterval - 15);
      const minutes = this.gs.elapsed / 60000;
      this.gs.wave = Math.min(5, 1 + Math.floor(minutes / 2));
      this.scheduleNextSpawn();
    });
  }

  triggerGameOver() {
    this.gs.running = false;
    this.physics.pause();
    const secs = Math.floor(this.gs.elapsed / 1000);
    const m = Math.floor(secs / 60);
    const s = String(secs % 60).padStart(2, "0");
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("GameOverScene", {
        time: `${m}:${s}`,
        kills: this.gs.kills,
        level: this.gs.player.level,
        className: this.gs.player.className,
        power: Math.floor(this.gs.player.equipmentPower ?? 0),
        survivalSeconds: secs,
        damageDealt: this.gs.stats.damageDealt,
        damageTaken: this.gs.stats.damageTaken,
        highestHit: this.gs.stats.highestHit,
        highestTakenHit: this.gs.stats.highestTakenHit,
        crits: this.gs.stats.crits,
        dodges: this.gs.stats.dodges,
        elitesKilled: this.gs.stats.elitesKilled,
        bossesKilled: this.gs.stats.bossesKilled,
        lootEquipped: this.gs.stats.lootEquipped
      });
    });
  }

  startBGM() {
    this.bgmEnabled = true;
  }

  safePlay(sprite, key) {
    if (this.anims.exists(key)) {
      sprite.play(key);
    }
  }
}
