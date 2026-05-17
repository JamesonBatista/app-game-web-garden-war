import { ENEMY_CONFIG, MAP_RADIUS, SKILLS } from "../constants.js";
import { buildInitialGameState } from "../state.js";
import { isoToScreen, screenToIso } from "../utils/iso.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    this.gs = buildInitialGameState();
    this.createIsoMap();
    this.createPlayer();
    this.createGroups();
    this.createCollisions();
    this.createCamera();
    this.createHUD();
    this.createJoystick();
    this.createKeyboard();
    this.startBGM();
    this.scheduleNextSpawn();
    this.cameras.main.fadeIn(350, 0, 0, 0);
  }

  update(_time, delta) {
    if (!this.gs.running || this.gs.paused) {
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
    this.recycleTiles();
    this.updateHUD();
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

  createGroups() {
    this.enemies = this.physics.add.group();
    this.gems = this.physics.add.group();
    this.playerBullets = this.physics.add.group({ maxSize: 40 });
    this.enemyBullets = this.physics.add.group({ maxSize: 40 });
    this.shadows = this.add.group();
  }

  createCollisions() {
    const gs = this.gs;

    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
      if (gs.player.invincible > 0) {
        return;
      }
      gs.player.hp -= enemy.damage;
      gs.player.invincible = 800;
      this.cameras.main.shake(120, 0.007);
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
      gs.player.hp -= bullet.damage ?? 5;
      gs.player.invincible = 500;
      bullet.destroy();
      if (gs.player.hp <= 0) {
        this.triggerGameOver();
      }
    });

    this.physics.add.overlap(this.playerBullets, this.enemies, (bullet, enemy) => {
      this.dealDamageToEnemy(enemy, bullet.damage ?? this.gs.player.damage * 0.7);
      bullet.destroy();
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
    slash.setDepth(this.player.y + 1);
    if (this.anims.exists("slash")) {
      slash.play("slash");
    } else {
      this.time.delayedCall(150, () => slash.destroy());
    }

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
    const pulse = this.add.circle(this.player.x, this.player.y, 10, 0x9b59b6, 0.45);
    pulse.setDepth(this.player.y - 1);
    this.tweens.add({
      targets: pulse,
      radius: range,
      alpha: 0,
      duration: 350,
      ease: "Cubic.Out",
      onComplete: () => pulse.destroy()
    });

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
      bullet.lifespan = 1200;
      bullet.setDepth(this.player.y);
    });
  }

  executeFreeze() {
    const range = 160;
    this.cameras.main.flash(200, 50, 180, 255, false);
    this.enemies.getChildren().forEach((enemy) => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (d <= range) {
        enemy.frozen = 2500;
        enemy.setTint(0x7ff0e8);
      }
    });
  }

  spawnEnemy() {
    const wave = this.gs.wave;
    const available = Object.entries(ENEMY_CONFIG)
      .filter(([, cfg]) => cfg.availableFrom <= wave)
      .map(([type]) => type);
    const type = available[Math.floor(Math.random() * available.length)];
    const cfg = ENEMY_CONFIG[type];
    const angle = Math.random() * Math.PI * 2;
    const dist = 340 + Math.random() * 120;
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;

    const enemy = this.enemies.create(x, y, cfg.anim);
    this.safePlay(enemy, cfg.anim);
    enemy.setScale(cfg.scale);
    enemy.body.setSize(cfg.bodyW, cfg.bodyH);
    enemy.body.setOffset(cfg.bodyOffsetX, cfg.bodyOffsetY);
    enemy.enemyType = type;
    enemy.hp = cfg.hp + (wave - 1) * Math.floor(cfg.hp * 0.2);
    enemy.speed = cfg.speed;
    enemy.damage = cfg.damage;
    enemy.xpReward = cfg.xp;
    enemy.frozen = 0;
    enemy.shootTimer = 0;

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
        }
        return;
      }

      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      enemy.setVelocity(Math.cos(angle) * enemy.speed, Math.sin(angle) * enemy.speed);
      enemy.setFlipX(enemy.x > this.player.x);

      if (ENEMY_CONFIG[enemy.enemyType]?.canShoot) {
        const cfg = ENEMY_CONFIG[enemy.enemyType];
        enemy.shootTimer += delta;
        const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        if (enemy.shootTimer >= cfg.shootCooldown && dist <= cfg.shootRange) {
          enemy.shootTimer = 0;
          this.enemyShoot(enemy, cfg.bulletSpeed);
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
    bullet.setActive(true).setVisible(true).setTint(0xe74c3c);
    bullet.setVelocity(Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed);
    bullet.damage = ENEMY_CONFIG[enemy.enemyType].damage;
    bullet.lifespan = 2200;
  }

  dealDamageToEnemy(enemy, damage) {
    enemy.hp -= damage;
    this.tweens.add({
      targets: enemy,
      alpha: 0.3,
      yoyo: true,
      duration: 80
    });

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  killEnemy(enemy) {
    this.gs.kills += 1;
    this.spawnGem(enemy.x, enemy.y, enemy.xpReward);
    this.emitDeathParticles(enemy.x, enemy.y);
    if (enemy.shadow) {
      enemy.shadow.destroy();
    }
    enemy.destroy();
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
    const available = SKILLS.filter((s) => !activeIds.includes(s.id));
    const choices = Phaser.Utils.Array.Shuffle(available).slice(0, 3);

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
    sf(this.add.rectangle(width / 2, 36, width, 72, 0x000000, 0.55));

    sf(this.add.text(12, 12, "HP", { fontSize: "13px", color: "#fff" }));
    this.hudHpBg = sf(this.add.rectangle(width / 2 + 10, 20, width - 80, 16, 0x333333).setOrigin(0, 0.5));
    this.hudHpFill = sf(this.add.rectangle(width / 2 + 10 - (width - 80) / 2, 20, width - 80, 16, 0xe74c3c).setOrigin(0, 0.5));
    this.hudHpText = sf(this.add.text(width - 10, 20, "", { fontSize: "11px", color: "#fff" }).setOrigin(1, 0.5));

    sf(this.add.text(12, 40, "XP", { fontSize: "13px", color: "#fff" }));
    this.hudXpBg = sf(this.add.rectangle(width / 2 + 10, 46, width - 80, 10, 0x333333).setOrigin(0, 0.5));
    this.hudXpFill = sf(this.add.rectangle(width / 2 + 10 - (width - 80) / 2, 46, 0, 10, 0x3498db).setOrigin(0, 0.5));

    this.hudLevel = sf(this.add.text(12, 60, "Nivel 1", { fontSize: "12px", color: "#f1c40f", fontStyle: "bold" }));
    this.hudKills = sf(this.add.text(width / 2, 60, "0 kills", { fontSize: "12px", color: "#fff" }).setOrigin(0.5, 0));
    this.hudTimer = sf(this.add.text(width - 12, 60, "0:00", { fontSize: "12px", color: "#fff" }).setOrigin(1, 0));
    this.hudSkills = sf(this.add.text(12, 78, "", { fontSize: "10px", color: "#aaa" }));
  }

  updateHUD() {
    const p = this.gs.player;
    const bw = this.hudHpBg.width;
    this.hudHpFill.width = bw * Phaser.Math.Clamp(p.hp / p.maxHp, 0, 1);
    this.hudHpText.setText(`${Math.ceil(p.hp)}/${p.maxHp}`);
    this.hudXpFill.width = bw * (p.xp / p.xpNext);
    this.hudLevel.setText(`Nivel ${p.level}`);
    this.hudKills.setText(`${this.gs.kills} kills`);
    const secs = Math.floor(this.gs.elapsed / 1000);
    const m = Math.floor(secs / 60);
    const s = String(secs % 60).padStart(2, "0");
    this.hudTimer.setText(`${m}:${s}`);

    if (p.invincible > 0) {
      this.player.setAlpha(Math.floor(this.gs.elapsed / 80) % 2 === 0 ? 0.4 : 1);
    } else {
      this.player.setAlpha(1);
    }
  }

  updateSkillsHUD() {
    const names = this.gs.player.skills
      .map((id) => SKILLS.find((s) => s.id === id)?.name ?? "")
      .filter(Boolean)
      .join(" | ");
    this.hudSkills.setText(names);
  }

  handleDepthSorting() {
    this.player.setDepth(this.player.y);
    this.enemies.getChildren().forEach((e) => e.setDepth(e.y));
    this.gems.getChildren().forEach((g) => g.setDepth(g.y - 10));
    this.playerBullets.getChildren().forEach((b) => b.setDepth(b.y));
    this.enemyBullets.getChildren().forEach((b) => b.setDepth(b.y));
  }

  handleShadowPositions() {
    this.playerShadow.setPosition(this.player.x, this.player.y + 24);
    this.playerShadow.setDepth(this.player.y - 1);

    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.shadow) {
        return;
      }
      const cfg = ENEMY_CONFIG[enemy.enemyType];
      enemy.shadow.setPosition(enemy.x, enemy.y + cfg.bodyH / 2 + 4);
      enemy.shadow.setDepth(enemy.y - 1);
    });
  }

  updateBullets(delta) {
    const updateGroup = (group) => {
      group.getChildren().forEach((bullet) => {
        bullet.lifespan = (bullet.lifespan ?? 0) - delta;
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
        level: this.gs.player.level
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
