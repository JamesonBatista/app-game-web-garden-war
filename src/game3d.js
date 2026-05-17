import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "three/addons/utils/SkeletonUtils.js";
import { computeRunScore, loadBestRun, saveBestRunIfNeeded } from "./systems/progression.js";

const CLASS_CONFIGS = {
  barbarian: {
    id: "barbarian",
    name: "Barbaro",
    desc: "Tanque agressivo com impacto em area.",
    maxHp: 190,
    damage: 30,
    speed: 7.2,
    armor: 38,
    critChance: 0.12,
    critMultiplier: 1.7,
    dodgeChance: 0.04,
    resourceType: "Furia",
    resourceMax: 100,
    resourceRegen: 14,
    skillCooldown: 2.5,
    skillCost: 35,
    color: 0xf7d6b5,
    trailColor: 0xf39c12
  },
  sorcerer: {
    id: "sorcerer",
    name: "Feiticeiro",
    desc: "Mago de burst com controle de area.",
    maxHp: 130,
    damage: 36,
    speed: 7.4,
    armor: 22,
    critChance: 0.19,
    critMultiplier: 1.85,
    dodgeChance: 0.08,
    resourceType: "Mana",
    resourceMax: 140,
    resourceRegen: 22,
    skillCooldown: 2.1,
    skillCost: 36,
    color: 0xcddfff,
    trailColor: 0x9b59b6
  },
  rogue: {
    id: "rogue",
    name: "Ladino",
    desc: "Mobilidade alta e criticos frequentes.",
    maxHp: 145,
    damage: 28,
    speed: 9,
    armor: 26,
    critChance: 0.24,
    critMultiplier: 2.05,
    dodgeChance: 0.16,
    resourceType: "Energia",
    resourceMax: 120,
    resourceRegen: 28,
    skillCooldown: 1.8,
    skillCost: 26,
    color: 0xd9ffe8,
    trailColor: 0x58d68d
  }
};

const UPGRADES = [
  {
    id: "damage-up",
    name: "Lamina Exaltada",
    desc: "+18% de dano global",
    apply: (state) => { state.damage *= 1.18; }
  },
  {
    id: "crit-up",
    name: "Olho de Predador",
    desc: "+7% chance de critico",
    apply: (state) => { state.critChance = Math.min(0.8, state.critChance + 0.07); }
  },
  {
    id: "speed-up",
    name: "Passos Rapidos",
    desc: "+10% velocidade",
    apply: (state) => { state.speed *= 1.1; }
  },
  {
    id: "hp-up",
    name: "Sangue Antigo",
    desc: "+35 HP maximo e cura parcial",
    apply: (state) => {
      state.maxHp += 35;
      state.hp = Math.min(state.maxHp, state.hp + 26);
    }
  },
  {
    id: "resource-up",
    name: "Fonte Arcana",
    desc: "+20 recurso max e +5 regen/s",
    apply: (state) => {
      state.resourceMax += 20;
      state.resource = Math.min(state.resourceMax, state.resource + 20);
      state.resourceRegen += 5;
    }
  },
  {
    id: "cooldown-up",
    name: "Conjuracao Rapida",
    desc: "-12% cooldown de habilidade",
    apply: (state) => { state.skillCooldown *= 0.88; }
  }
];

const ENEMY_BASE = {
  walker: { hp: 60, speed: 3.4, damage: 10, xp: 11, scale: 0.38 },
  shooter: { hp: 44, speed: 3.6, damage: 8, xp: 14, scale: 0.34 },
  tank: { hp: 120, speed: 2.6, damage: 16, xp: 24, scale: 0.46 }
};

function createCanvasTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#233522";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 4200; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = 1 + Math.random() * 3;
    const hue = 95 + Math.random() * 35;
    const light = 18 + Math.random() * 24;
    ctx.fillStyle = `hsl(${hue} 45% ${light}%)`;
    ctx.fillRect(x, y, size, size);
  }

  for (let i = 0; i < 120; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.beginPath();
    ctx.arc(x, y, 12 + Math.random() * 22, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  texture.anisotropy = 8;
  return texture;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

class DiabloLike3D {
  constructor() {
    this.container = document.getElementById("game-container");
    this.uiRoot = document.getElementById("ui-root");
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x12151d);
    this.scene.fog = new THREE.FogExp2(0x111520, 0.024);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 600);
    this.camera.position.set(0, 18, 16);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    this.gltfLoader = new GLTFLoader();
    this.mixers = [];
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.effects = [];
    this.labels = [];
    this.keys = {};
    this.joystick = { active: false, dx: 0, dy: 0 };
    this.bestRun = loadBestRun();

    this.state = {
      running: false,
      paused: false,
      gameOver: false,
      elapsed: 0,
      kills: 0,
      wave: 1,
      spawnInterval: 1.9,
      spawnElapsed: 0,
      attackElapsed: 0,
      attackCooldown: 0.55,
      skillElapsed: 0,
      classId: "barbarian",
      className: "Barbaro",
      hp: 100,
      maxHp: 100,
      damage: 22,
      speed: 7,
      armor: 20,
      critChance: 0.1,
      critMultiplier: 1.6,
      dodgeChance: 0.05,
      level: 1,
      xp: 0,
      xpNext: 100,
      resourceType: "Furia",
      resource: 0,
      resourceMax: 100,
      resourceRegen: 12,
      skillCooldown: 2.4,
      skillCost: 30,
      power: 0,
      damageDealt: 0,
      damageTaken: 0,
      highestHit: 0,
      highestTakenHit: 0,
      crits: 0,
      dodges: 0,
      elitesKilled: 0,
      bossesKilled: 0,
      lootEquipped: 0
    };

    this.player = null;
    this.playerMixer = null;
    this.playerActions = {};
    this.playerVelocity = new THREE.Vector3();
    this.playerDirection = new THREE.Vector3(0, 0, 1);
    this.playerInvul = 0;
    this.currentBoss = null;

    this.setupWorld();
    this.setupUI();
    this.setupInput();
    this.setupResize();

    this.loadAssets().then(() => {
      this.showClassSelection();
      this.animate();
    });
  }

  setupWorld() {
    const hemi = new THREE.HemisphereLight(0x8ba6c7, 0x243024, 0.7);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xfff0d6, 1.05);
    dir.position.set(8, 16, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -60;
    dir.shadow.camera.right = 60;
    dir.shadow.camera.top = 60;
    dir.shadow.camera.bottom = -60;
    this.scene.add(dir);

    const groundTex = createCanvasTexture();
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.95,
      metalness: 0
    });
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    const rockGeo = new THREE.DodecahedronGeometry(0.6, 0);
    for (let i = 0; i < 200; i += 1) {
      const mesh = new THREE.Mesh(
        rockGeo,
        new THREE.MeshStandardMaterial({
          color: randomChoice([0x44515f, 0x55636f, 0x38454f]),
          roughness: 0.95,
          metalness: 0.05
        })
      );
      mesh.position.set((Math.random() - 0.5) * 500, 0.4, (Math.random() - 0.5) * 500);
      const scale = 0.3 + Math.random() * 1.4;
      mesh.scale.setScalar(scale);
      mesh.castShadow = true;
      this.scene.add(mesh);
    }
  }

  setupUI() {
    this.uiRoot.innerHTML = `
      <div class="hud-panel">
        <div class="bar-wrap">
          <div class="bar-label" id="hp-label">HP</div>
          <div class="bar-bg"><div class="bar-fill" id="hp-fill" style="width:100%;background:#e74c3c;"></div></div>
        </div>
        <div class="bar-wrap">
          <div class="bar-label" id="res-label">Recurso</div>
          <div class="bar-bg"><div class="bar-fill" id="resource-fill" style="width:100%;background:#8e44ad;"></div></div>
        </div>
        <div class="bar-wrap">
          <div class="bar-label" id="xp-label">XP</div>
          <div class="bar-bg"><div class="bar-fill" id="xp-fill" style="width:0%;background:#3498db;"></div></div>
        </div>
        <div class="stats-row">
          <span id="left-stats">Lv 1</span>
          <span id="center-stats">0 kills</span>
          <span id="right-stats">0:00</span>
        </div>
      </div>
      <div class="boss-panel" id="boss-panel">
        <div class="boss-title" id="boss-title">Mini Boss</div>
        <div class="bar-bg"><div class="bar-fill" id="boss-fill" style="width:100%;background:#e74c3c;"></div></div>
      </div>
      <div class="overlay-center" id="selection-overlay"></div>
      <div class="overlay-center" id="upgrade-overlay"></div>
      <div class="overlay-center" id="gameover-overlay"></div>
      <div class="joystick-zone" id="joystick-zone"></div>
      <div class="vignette-overlay"></div>
    `;

    this.hpFill = document.getElementById("hp-fill");
    this.resourceFill = document.getElementById("resource-fill");
    this.xpFill = document.getElementById("xp-fill");
    this.hpLabel = document.getElementById("hp-label");
    this.resLabel = document.getElementById("res-label");
    this.xpLabel = document.getElementById("xp-label");
    this.leftStats = document.getElementById("left-stats");
    this.centerStats = document.getElementById("center-stats");
    this.rightStats = document.getElementById("right-stats");
    this.bossPanel = document.getElementById("boss-panel");
    this.bossFill = document.getElementById("boss-fill");
    this.bossTitle = document.getElementById("boss-title");
    this.selectionOverlay = document.getElementById("selection-overlay");
    this.upgradeOverlay = document.getElementById("upgrade-overlay");
    this.gameOverOverlay = document.getElementById("gameover-overlay");
    this.joyZone = document.getElementById("joystick-zone");

    this.joyBase = document.createElement("div");
    this.joyBase.className = "joystick-base";
    this.joyThumb = document.createElement("div");
    this.joyThumb.className = "joystick-thumb";
    this.joyBase.style.display = "none";
    this.joyThumb.style.display = "none";
    this.uiRoot.appendChild(this.joyBase);
    this.uiRoot.appendChild(this.joyThumb);
  }

  setupInput() {
    window.addEventListener("keydown", (event) => { this.keys[event.code] = true; });
    window.addEventListener("keyup", (event) => { this.keys[event.code] = false; });

    let joystickOrigin = { x: 0, y: 0 };
    const radius = 45;

    const startJoystick = (x, y) => {
      this.joystick.active = true;
      joystickOrigin = { x, y };
      this.joyBase.style.display = "block";
      this.joyThumb.style.display = "block";
      this.joyBase.style.left = `${x}px`;
      this.joyBase.style.top = `${y}px`;
      this.joyThumb.style.left = `${x}px`;
      this.joyThumb.style.top = `${y}px`;
    };

    const moveJoystick = (x, y) => {
      if (!this.joystick.active) {
        return;
      }
      let dx = x - joystickOrigin.x;
      let dy = y - joystickOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > radius) {
        dx = (dx / len) * radius;
        dy = (dy / len) * radius;
      }
      this.joystick.dx = dx / radius;
      this.joystick.dy = dy / radius;
      this.joyThumb.style.left = `${joystickOrigin.x + dx}px`;
      this.joyThumb.style.top = `${joystickOrigin.y + dy}px`;
    };

    const endJoystick = () => {
      this.joystick.active = false;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
      this.joyBase.style.display = "none";
      this.joyThumb.style.display = "none";
    };

    this.joyZone.addEventListener("pointerdown", (e) => {
      startJoystick(e.clientX, e.clientY);
      moveJoystick(e.clientX, e.clientY);
      this.joyZone.setPointerCapture(e.pointerId);
    });
    this.joyZone.addEventListener("pointermove", (e) => moveJoystick(e.clientX, e.clientY));
    this.joyZone.addEventListener("pointerup", endJoystick);
    this.joyZone.addEventListener("pointercancel", endJoystick);
  }

  setupResize() {
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  async loadAssets() {
    const load = (url) => new Promise((resolve, reject) => {
      this.gltfLoader.load(url, resolve, undefined, reject);
    });

    this.playerTemplate = await load("./assets/models/player.glb");
    this.enemyTemplate = await load("./assets/models/enemy.glb");
  }

  showClassSelection() {
    this.selectionOverlay.style.display = "flex";
    const cards = Object.values(CLASS_CONFIGS).map((cfg) => `
      <button class="select-card" data-class="${cfg.id}">
        <div class="card-name">${cfg.name}</div>
        <div class="card-desc">${cfg.desc}</div>
      </button>
    `).join("");

    const bestText = this.bestRun
      ? `<div class="card-desc" style="margin-bottom:8px;text-align:center;">Melhor run: ${this.bestRun.score} pts | Lv ${this.bestRun.level} | ${this.bestRun.kills} kills</div>`
      : "";

    this.selectionOverlay.innerHTML = `
      <div class="card-modal">
        <div class="card-title">Survivors Quest 3D</div>
        ${bestText}
        <div class="class-grid">${cards}</div>
      </div>
    `;
    this.selectionOverlay.querySelectorAll("[data-class]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const classId = btn.getAttribute("data-class");
        localStorage.setItem("selectedClass", classId);
        this.selectionOverlay.style.display = "none";
        this.selectionOverlay.innerHTML = "";
        this.startRun(classId);
      });
    });
  }

  startRun(classId) {
    this.clearDynamicEntities();
    const cfg = CLASS_CONFIGS[classId] ?? CLASS_CONFIGS.barbarian;
    Object.assign(this.state, {
      running: true,
      paused: false,
      gameOver: false,
      elapsed: 0,
      kills: 0,
      wave: 1,
      spawnInterval: 1.9,
      spawnElapsed: 0,
      attackElapsed: 0,
      attackCooldown: 0.55,
      skillElapsed: 0,
      classId: cfg.id,
      className: cfg.name,
      hp: cfg.maxHp,
      maxHp: cfg.maxHp,
      damage: cfg.damage,
      speed: cfg.speed,
      armor: cfg.armor,
      critChance: cfg.critChance,
      critMultiplier: cfg.critMultiplier,
      dodgeChance: cfg.dodgeChance,
      level: 1,
      xp: 0,
      xpNext: 100,
      resourceType: cfg.resourceType,
      resource: cfg.resourceMax * 0.62,
      resourceMax: cfg.resourceMax,
      resourceRegen: cfg.resourceRegen,
      skillCooldown: cfg.skillCooldown,
      skillCost: cfg.skillCost,
      power: 0,
      damageDealt: 0,
      damageTaken: 0,
      highestHit: 0,
      highestTakenHit: 0,
      crits: 0,
      dodges: 0,
      elitesKilled: 0,
      bossesKilled: 0,
      lootEquipped: 0
    });
    this.currentBoss = null;
    this.playerInvul = 0;
    this.spawnPlayer(cfg);
    this.updateHUD();
  }

  clearDynamicEntities() {
    [...this.enemies, ...this.projectiles, ...this.enemyProjectiles, ...this.effects].forEach((entity) => {
      if (entity.mesh && entity.mesh.parent) entity.mesh.parent.remove(entity.mesh);
      if (entity.group && entity.group.parent) entity.group.parent.remove(entity.group);
    });
    if (this.player?.mesh?.parent) {
      this.scene.remove(this.player.mesh);
    }
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.effects = [];
    this.mixers = [];
    this.labels.forEach((label) => label.el.remove());
    this.labels = [];
  }

  spawnPlayer(cfg) {
    const root = skeletonClone(this.playerTemplate.scene);
    root.scale.setScalar(1.1);
    root.position.set(0, 0, 0);
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    this.scene.add(root);

    const mixer = new THREE.AnimationMixer(root);
    this.mixers.push(mixer);
    const actions = {};
    for (const clip of this.playerTemplate.animations) {
      actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
    }

    const idle = actions.idle || Object.values(actions)[0];
    if (idle) idle.play();

    this.player = {
      mesh: root,
      mixer,
      actions,
      currentAction: idle,
      color: cfg.color,
      trailColor: cfg.trailColor
    };

    this.tintCharacter(this.player.mesh, cfg.color, 0.4);
  }

  tintCharacter(object3d, color, emissiveIntensity = 0.2) {
    object3d.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      obj.material = obj.material.clone();
      if (obj.material.color) obj.material.color.lerp(new THREE.Color(color), 0.2);
      if (obj.material.emissive) {
        obj.material.emissive = new THREE.Color(color);
        obj.material.emissiveIntensity = emissiveIntensity;
      }
    });
  }

  spawnEnemy() {
    const kind = randomChoice(["walker", "shooter", "tank"]);
    const base = ENEMY_BASE[kind];
    let tier = "normal";
    if (!this.currentBoss && this.state.kills > 0 && this.state.kills % 45 === 0) tier = "boss";
    else if (Math.random() < Math.min(0.1 + this.state.wave * 0.03, 0.25)) tier = "elite";

    const root = skeletonClone(this.enemyTemplate.scene);
    const scaleMul = tier === "boss" ? 1.8 : tier === "elite" ? 1.25 : 1;
    root.scale.setScalar(base.scale * scaleMul);
    const angle = Math.random() * Math.PI * 2;
    const dist = 22 + Math.random() * 10;
    root.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
    root.rotation.y = Math.random() * Math.PI * 2;
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    this.scene.add(root);

    const mixer = new THREE.AnimationMixer(root);
    this.mixers.push(mixer);
    const walkClip = this.enemyTemplate.animations.find((a) => a.name.toLowerCase().includes("walk"))
      ?? this.enemyTemplate.animations[0];
    let action = null;
    if (walkClip) {
      action = mixer.clipAction(walkClip);
      action.play();
    }

    const enemy = {
      mesh: root,
      mixer,
      action,
      kind,
      tier,
      hp: base.hp * (1 + this.state.wave * 0.24) * (tier === "boss" ? 5 : tier === "elite" ? 2.2 : 1),
      maxHp: base.hp * (1 + this.state.wave * 0.24) * (tier === "boss" ? 5 : tier === "elite" ? 2.2 : 1),
      damage: base.damage * (tier === "boss" ? 2.6 : tier === "elite" ? 1.55 : 1),
      speed: base.speed * (tier === "boss" ? 0.9 : tier === "elite" ? 1.15 : 1),
      xp: base.xp * (tier === "boss" ? 8 : tier === "elite" ? 2.6 : 1),
      shootCooldown: (kind === "shooter" || tier !== "normal") ? 2.6 : 999,
      shootElapsed: 0,
      telegraphElapsed: 0,
      attackElapsed: 0
    };

    if (tier === "boss") {
      this.tintCharacter(root, 0xe74c3c, 0.4);
      this.currentBoss = enemy;
      this.createLabel("MINI BOSS", root.position.clone().add(new THREE.Vector3(0, 3, 0)), "#ff7675", 1000);
    } else if (tier === "elite") {
      this.tintCharacter(root, 0xf1c40f, 0.25);
      this.createLabel("ELITE", root.position.clone().add(new THREE.Vector3(0, 2, 0)), "#f1c40f", 700);
    }

    this.enemies.push(enemy);
  }

  applyDamageToEnemy(enemy, rawDamage) {
    const crit = Math.random() < this.state.critChance;
    const amount = rawDamage * (crit ? this.state.critMultiplier : 1);
    enemy.hp -= amount;
    this.state.damageDealt += amount;
    this.state.highestHit = Math.max(this.state.highestHit, amount);
    if (crit) this.state.crits += 1;
    this.createLabel(`${Math.round(amount)}${crit ? " CRIT" : ""}`, enemy.mesh.position.clone().add(new THREE.Vector3(0, 2.6, 0)), crit ? "#f1c40f" : "#ffffff", 620);

    this.spawnImpact(enemy.mesh.position, crit ? 0xf1c40f : this.player.trailColor, crit ? 16 : 9, crit ? 2.5 : 1.5);

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  killEnemy(enemy) {
    this.state.kills += 1;
    this.state.xp += enemy.xp;
    if (enemy.tier === "elite") this.state.elitesKilled += 1;
    if (enemy.tier === "boss") {
      this.state.bossesKilled += 1;
      this.currentBoss = null;
      this.createLabel("BOSS ABATIDO", enemy.mesh.position.clone().add(new THREE.Vector3(0, 3, 0)), "#f39c12", 1200);
    }

    if (Math.random() < 0.18 + this.state.wave * 0.03 + (enemy.tier === "boss" ? 0.5 : enemy.tier === "elite" ? 0.25 : 0)) {
      const powerGain = Math.round((4 + this.state.wave * 1.2) * (enemy.tier === "boss" ? 2.7 : enemy.tier === "elite" ? 1.5 : 1));
      this.state.power += powerGain;
      this.state.damage += powerGain * 0.08;
      this.state.armor += powerGain * 0.09;
      this.state.lootEquipped += 1;
      this.createLabel(`Loot +${powerGain} poder`, enemy.mesh.position.clone().add(new THREE.Vector3(0, 2.2, 0)), "#55efc4", 820);
    }

    this.scene.remove(enemy.mesh);
    this.enemies = this.enemies.filter((e) => e !== enemy);
    this.checkLevelUp();
  }

  checkLevelUp() {
    if (this.state.xp < this.state.xpNext) return;
    this.state.xp -= this.state.xpNext;
    this.state.xpNext = Math.floor(this.state.xpNext * 1.32);
    this.state.level += 1;
    this.state.maxHp += 8;
    this.state.hp = Math.min(this.state.maxHp, this.state.hp + 24);
    this.showUpgradeSelection();
  }

  showUpgradeSelection() {
    this.state.paused = true;
    const available = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
    this.upgradeOverlay.style.display = "flex";
    this.upgradeOverlay.innerHTML = `
      <div class="card-modal">
        <div class="card-title">Subiu de Nivel</div>
        <div class="upgrade-grid">
          ${available.map((u) => `
            <button class="upgrade-card" data-upgrade="${u.id}">
              <div class="card-name">${u.name}</div>
              <div class="card-desc">${u.desc}</div>
            </button>
          `).join("")}
        </div>
      </div>
    `;
    this.upgradeOverlay.querySelectorAll("[data-upgrade]").forEach((button) => {
      button.addEventListener("click", () => {
        const found = available.find((u) => u.id === button.getAttribute("data-upgrade"));
        if (found) found.apply(this.state);
        this.upgradeOverlay.style.display = "none";
        this.upgradeOverlay.innerHTML = "";
        this.state.paused = false;
      });
    });
  }

  updatePlayer(delta) {
    const input = new THREE.Vector3();
    if (this.keys.KeyA || this.keys.ArrowLeft) input.x -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) input.x += 1;
    if (this.keys.KeyW || this.keys.ArrowUp) input.z -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) input.z += 1;
    if (this.joystick.active) {
      input.x = this.joystick.dx;
      input.z = this.joystick.dy;
    }

    const moving = input.lengthSq() > 0.0001;
    if (moving) {
      input.normalize();
      this.playerVelocity.copy(input).multiplyScalar(this.state.speed * delta);
      this.player.mesh.position.add(this.playerVelocity);
      this.playerDirection.copy(input);
      const angle = Math.atan2(input.x, input.z);
      this.player.mesh.rotation.y = angle;
      this.playPlayerAction("walk");
    } else {
      this.playPlayerAction("idle");
    }

    this.player.mesh.position.x = clamp(this.player.mesh.position.x, -280, 280);
    this.player.mesh.position.z = clamp(this.player.mesh.position.z, -280, 280);
  }

  playPlayerAction(kind) {
    const actionMap = this.player.actions;
    const next = kind === "walk"
      ? (actionMap.walk || actionMap.run || actionMap.rifle || actionMap.idle)
      : (actionMap.idle || actionMap.walk || actionMap.run);
    if (!next || next === this.player.currentAction) return;
    if (this.player.currentAction) {
      this.player.currentAction.fadeOut(0.12);
    }
    next.reset().fadeIn(0.12).play();
    this.player.currentAction = next;
  }

  updateCombat(delta) {
    this.state.resource = Math.min(this.state.resourceMax, this.state.resource + this.state.resourceRegen * delta);
    this.state.attackElapsed += delta;
    this.state.skillElapsed += delta;

    if (this.state.attackElapsed >= this.state.attackCooldown) {
      this.state.attackElapsed = 0;
      this.performPrimaryAttack();
    }

    if (this.state.skillElapsed >= this.state.skillCooldown) {
      this.state.skillElapsed = 0;
      if (this.state.resource >= this.state.skillCost) {
        this.state.resource -= this.state.skillCost;
        this.performClassSkill();
      }
    }
  }

  performPrimaryAttack() {
    const target = this.getNearestEnemy();
    if (!target) return;
    const dir = new THREE.Vector3().subVectors(target.mesh.position, this.player.mesh.position).setY(0).normalize();
    this.spawnProjectile(this.player.mesh.position, dir, this.state.damage * 0.9, 0.95, this.player.trailColor, true, 0);
  }

  performClassSkill() {
    if (this.state.classId === "barbarian") {
      this.spawnAreaSkill(this.player.mesh.position, 5.2, this.state.damage * 2.2, 0xe67e22);
      return;
    }
    if (this.state.classId === "sorcerer") {
      const target = this.getNearestEnemy();
      if (!target) return;
      const dir = new THREE.Vector3().subVectors(target.mesh.position, this.player.mesh.position).setY(0).normalize();
      this.spawnProjectile(this.player.mesh.position, dir, this.state.damage * 1.8, 1.45, 0xaf7ac5, true, 3.8);
      return;
    }
    const enemies = [...this.enemies].slice(0, 3);
    enemies.forEach((enemy, i) => {
      const dir = new THREE.Vector3().subVectors(enemy.mesh.position, this.player.mesh.position).setY(0).normalize();
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - 1) * 0.14);
      this.spawnProjectile(this.player.mesh.position, dir, this.state.damage * 1.2, 1.25, 0x58d68d, true, 0);
    });
    this.spawnImpact(this.player.mesh.position, 0x58d68d, 10, 2.2);
  }

  spawnAreaSkill(origin, radius, damage, color) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(origin.x, 0.05, origin.z);
    this.scene.add(ring);
    this.effects.push({ mesh: ring, life: 0.28, grow: radius * 2.5, fade: 2.7 });

    this.enemies.forEach((enemy) => {
      const d = enemy.mesh.position.distanceTo(origin);
      if (d <= radius) {
        this.applyDamageToEnemy(enemy, damage);
      }
    });
  }

  spawnProjectile(origin, direction, damage, speed, color, fromPlayer, splashRadius) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(fromPlayer ? 0.2 : 0.23, 10, 10),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.9,
        roughness: 0.3,
        metalness: 0.1
      })
    );
    mesh.position.copy(origin).add(new THREE.Vector3(0, 1.15, 0));
    this.scene.add(mesh);
    const data = {
      mesh,
      velocity: direction.clone().multiplyScalar(speed),
      damage,
      life: fromPlayer ? 1.35 : 1.7,
      fromPlayer,
      color,
      splashRadius
    };
    if (fromPlayer) this.projectiles.push(data);
    else this.enemyProjectiles.push(data);
  }

  updateProjectiles(delta) {
    const updateList = (list, isPlayerList) => {
      for (let i = list.length - 1; i >= 0; i -= 1) {
        const p = list[i];
        p.life -= delta;
        p.mesh.position.addScaledVector(p.velocity, delta * 10);
        if (Math.random() < 0.7) {
          this.spawnTrailDot(p.mesh.position, p.color);
        }
        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          list.splice(i, 1);
          continue;
        }

        if (isPlayerList) {
          const enemy = this.enemies.find((e) => e.mesh.position.distanceTo(p.mesh.position) < 1.1);
          if (enemy) {
            if (p.splashRadius > 0) {
              this.spawnAreaSkill(p.mesh.position, p.splashRadius, p.damage * 0.7, p.color);
            }
            this.applyDamageToEnemy(enemy, p.damage);
            this.scene.remove(p.mesh);
            list.splice(i, 1);
          }
        } else {
          const d = this.player.mesh.position.distanceTo(p.mesh.position);
          if (d < 1.2 && this.playerInvul <= 0) {
            this.applyDamageToPlayer(p.damage);
            this.scene.remove(p.mesh);
            list.splice(i, 1);
          }
        }
      }
    };

    updateList(this.projectiles, true);
    updateList(this.enemyProjectiles, false);
  }

  spawnTrailDot(pos, color) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 })
    );
    dot.position.copy(pos);
    this.scene.add(dot);
    this.effects.push({ mesh: dot, life: 0.22, grow: 0.2, fade: 4 });
  }

  spawnImpact(position, color, count, spread) {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 6, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
      );
      spark.position.copy(position).add(new THREE.Vector3(0, 1.2, 0));
      this.scene.add(spark);
      this.effects.push({
        mesh: spark,
        life: 0.24 + Math.random() * 0.1,
        grow: 0,
        fade: 4.4,
        velocity: new THREE.Vector3(Math.cos(angle) * spread, 0.4 + Math.random() * 0.5, Math.sin(angle) * spread)
      });
    }
  }

  applyDamageToPlayer(rawDamage) {
    if (Math.random() < this.state.dodgeChance) {
      this.state.dodges += 1;
      this.createLabel("ESQUIVA", this.player.mesh.position.clone().add(new THREE.Vector3(0, 2.2, 0)), "#95a5a6", 480);
      this.playerInvul = 0.22;
      return;
    }

    const armorReduction = this.state.armor / (this.state.armor + 145);
    const amount = Math.max(1, rawDamage * (1 - armorReduction));
    this.state.hp -= amount;
    this.state.damageTaken += amount;
    this.state.highestTakenHit = Math.max(this.state.highestTakenHit, amount);
    this.createLabel(`${Math.round(amount)}`, this.player.mesh.position.clone().add(new THREE.Vector3(0, 2.1, 0)), "#ff7675", 520);
    this.spawnImpact(this.player.mesh.position, 0xe74c3c, 8, 1.3);
    this.playerInvul = 0.45;

    if (this.state.hp <= 0) {
      this.state.hp = 0;
      this.gameOver();
    }
  }

  updateEnemies(delta) {
    for (const enemy of this.enemies) {
      const toPlayer = new THREE.Vector3().subVectors(this.player.mesh.position, enemy.mesh.position);
      const distance = toPlayer.length();
      toPlayer.y = 0;
      if (distance > 0.9) {
        toPlayer.normalize();
        enemy.mesh.position.addScaledVector(toPlayer, enemy.speed * delta);
        enemy.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
      }

      enemy.attackElapsed += delta;
      if (distance < 1.7 && enemy.attackElapsed > 0.95 && this.playerInvul <= 0) {
        enemy.attackElapsed = 0;
        this.applyDamageToPlayer(enemy.damage);
      }

      enemy.shootElapsed += delta;
      if (enemy.shootCooldown < 900 && distance < 9.5) {
        if (enemy.shootCooldown - enemy.shootElapsed < 0.24) {
          enemy.telegraphElapsed += delta;
          if (enemy.telegraphElapsed < 0.26 && enemy.telegraphElapsed > 0.22) {
            this.spawnImpact(enemy.mesh.position, 0xe74c3c, 5, 0.7);
          }
        }
        if (enemy.shootElapsed >= enemy.shootCooldown) {
          enemy.shootElapsed = 0;
          enemy.telegraphElapsed = 0;
          const dir = new THREE.Vector3().subVectors(this.player.mesh.position, enemy.mesh.position).setY(0).normalize();
          this.spawnProjectile(enemy.mesh.position, dir, enemy.damage * 0.8, 1.05, 0xff6b6b, false, 0);
        }
      }
    }
  }

  getNearestEnemy() {
    let nearest = null;
    let dist = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      const d = enemy.mesh.position.distanceTo(this.player.mesh.position);
      if (d < dist) {
        dist = d;
        nearest = enemy;
      }
    }
    return nearest;
  }

  updateEffects(delta) {
    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      const effect = this.effects[i];
      effect.life -= delta;
      if (effect.velocity) effect.mesh.position.addScaledVector(effect.velocity, delta);
      if (effect.grow) {
        effect.mesh.scale.addScalar(effect.grow * delta);
      }
      if (effect.mesh.material && effect.mesh.material.opacity !== undefined) {
        effect.mesh.material.opacity = Math.max(0, effect.mesh.material.opacity - delta * (effect.fade ?? 3.2));
      }
      if (effect.life <= 0) {
        this.scene.remove(effect.mesh);
        this.effects.splice(i, 1);
      }
    }
  }

  createLabel(text, worldPos, color, durationMs) {
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.transform = "translate(-50%, -50%)";
    el.style.pointerEvents = "none";
    el.style.fontSize = "14px";
    el.style.fontWeight = "700";
    el.style.color = color;
    el.style.textShadow = "0 1px 8px rgba(0,0,0,0.9)";
    el.textContent = text;
    this.uiRoot.appendChild(el);

    this.labels.push({
      el,
      worldPos: worldPos.clone(),
      life: durationMs / 1000,
      riseSpeed: 1.4
    });
  }

  updateLabels(delta) {
    for (let i = this.labels.length - 1; i >= 0; i -= 1) {
      const label = this.labels[i];
      label.life -= delta;
      label.worldPos.y += delta * label.riseSpeed;
      const screen = this.worldToScreen(label.worldPos);
      label.el.style.left = `${screen.x}px`;
      label.el.style.top = `${screen.y}px`;
      label.el.style.opacity = `${clamp(label.life * 1.6, 0, 1)}`;
      if (label.life <= 0) {
        label.el.remove();
        this.labels.splice(i, 1);
      }
    }
  }

  worldToScreen(position) {
    const p = position.clone().project(this.camera);
    return {
      x: (p.x * 0.5 + 0.5) * window.innerWidth,
      y: (-p.y * 0.5 + 0.5) * window.innerHeight
    };
  }

  updateCamera(delta) {
    const targetPos = new THREE.Vector3(
      this.player.mesh.position.x + 0,
      this.player.mesh.position.y + 14,
      this.player.mesh.position.z + 12
    );
    this.camera.position.lerp(targetPos, 1 - Math.exp(-delta * 6.5));
    this.camera.lookAt(this.player.mesh.position.x, this.player.mesh.position.y + 1.5, this.player.mesh.position.z);
  }

  updateHUD() {
    this.hpFill.style.width = `${clamp((this.state.hp / this.state.maxHp) * 100, 0, 100)}%`;
    this.resourceFill.style.width = `${clamp((this.state.resource / this.state.resourceMax) * 100, 0, 100)}%`;
    this.xpFill.style.width = `${clamp((this.state.xp / this.state.xpNext) * 100, 0, 100)}%`;

    this.hpLabel.textContent = `HP ${Math.ceil(this.state.hp)}/${Math.ceil(this.state.maxHp)}`;
    this.resLabel.textContent = `${this.state.resourceType} ${Math.floor(this.state.resource)}/${Math.floor(this.state.resourceMax)}`;
    this.xpLabel.textContent = `XP ${Math.floor(this.state.xp)}/${Math.floor(this.state.xpNext)}`;

    const secs = Math.floor(this.state.elapsed);
    const min = Math.floor(secs / 60);
    const sec = String(secs % 60).padStart(2, "0");
    const skillReady = this.state.skillElapsed >= this.state.skillCooldown ? "Skill pronto" : `Skill ${(this.state.skillCooldown - this.state.skillElapsed).toFixed(1)}s`;
    this.leftStats.textContent = `${this.state.className} | Lv ${this.state.level} | Poder ${Math.round(this.state.power)}`;
    this.centerStats.textContent = `${this.state.kills} kills | ${skillReady}`;
    this.rightStats.textContent = `${min}:${sec}`;

    if (this.currentBoss && this.currentBoss.hp > 0) {
      this.bossPanel.style.display = "block";
      this.bossFill.style.width = `${clamp((this.currentBoss.hp / this.currentBoss.maxHp) * 100, 0, 100)}%`;
      this.bossTitle.textContent = `Mini Boss ${this.currentBoss.kind.toUpperCase()}  ${Math.ceil(this.currentBoss.hp)}/${Math.ceil(this.currentBoss.maxHp)}`;
    } else {
      this.bossPanel.style.display = "none";
    }
  }

  gameOver() {
    if (this.state.gameOver) return;
    this.state.gameOver = true;
    this.state.running = false;
    this.state.paused = true;
    const summary = {
      className: this.state.className,
      level: this.state.level,
      kills: this.state.kills,
      power: Math.round(this.state.power),
      survivalSeconds: Math.floor(this.state.elapsed),
      damageDealt: Math.round(this.state.damageDealt),
      damageTaken: Math.round(this.state.damageTaken),
      highestHit: Math.round(this.state.highestHit),
      highestTakenHit: Math.round(this.state.highestTakenHit),
      crits: this.state.crits,
      dodges: this.state.dodges,
      elitesKilled: this.state.elitesKilled,
      bossesKilled: this.state.bossesKilled,
      lootEquipped: this.state.lootEquipped
    };
    const best = saveBestRunIfNeeded(summary);
    this.bestRun = best.bestRun;
    const score = computeRunScore(summary);
    const newBest = best.isNewBest ? "<div class='card-desc' style='color:#f1c40f;font-weight:700;'>NOVO RECORDE!</div>" : "";

    this.gameOverOverlay.style.display = "flex";
    this.gameOverOverlay.innerHTML = `
      <div class="card-modal">
        <div class="card-title">Game Over</div>
        ${newBest}
        <div class="card-desc">Classe: ${summary.className}</div>
        <div class="card-desc">Tempo: ${Math.floor(summary.survivalSeconds / 60)}:${String(summary.survivalSeconds % 60).padStart(2, "0")}</div>
        <div class="card-desc">Kills: ${summary.kills} | Level: ${summary.level} | Poder: ${summary.power}</div>
        <div class="card-desc">Dano causado: ${summary.damageDealt} | Dano recebido: ${summary.damageTaken}</div>
        <div class="card-desc">Maior hit: ${summary.highestHit} | Maior hit recebido: ${summary.highestTakenHit}</div>
        <div class="card-desc">Criticos: ${summary.crits} | Esquivas: ${summary.dodges}</div>
        <div class="card-desc">Elites: ${summary.elitesKilled} | Bosses: ${summary.bossesKilled} | Itens: ${summary.lootEquipped}</div>
        <div class="card-desc" style="margin-top:6px;">Score: ${score} | Melhor: ${this.bestRun?.score ?? score}</div>
        <div style="margin-top:10px;display:grid;gap:8px;">
          <button class="upgrade-card" data-act="retry"><div class="card-name">Jogar novamente</div></button>
          <button class="upgrade-card" data-act="menu"><div class="card-name">Trocar classe</div></button>
        </div>
      </div>
    `;
    this.gameOverOverlay.querySelector("[data-act='retry']").addEventListener("click", () => {
      this.gameOverOverlay.style.display = "none";
      this.gameOverOverlay.innerHTML = "";
      this.startRun(this.state.classId);
    });
    this.gameOverOverlay.querySelector("[data-act='menu']").addEventListener("click", () => {
      this.gameOverOverlay.style.display = "none";
      this.gameOverOverlay.innerHTML = "";
      this.showClassSelection();
    });
  }

  updateSpawning(delta) {
    this.state.spawnElapsed += delta;
    if (this.state.spawnElapsed >= this.state.spawnInterval) {
      this.state.spawnElapsed = 0;
      this.spawnEnemy();
      this.state.spawnInterval = Math.max(0.45, this.state.spawnInterval - 0.01);
      this.state.wave = Math.min(9, 1 + Math.floor(this.state.elapsed / 35));
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = Math.min(0.05, this.clock.getDelta());
    this.mixers.forEach((mixer) => mixer.update(delta));

    if (this.state.running && !this.state.paused) {
      this.state.elapsed += delta;
      this.playerInvul = Math.max(0, this.playerInvul - delta);
      this.updatePlayer(delta);
      this.updateSpawning(delta);
      this.updateEnemies(delta);
      this.updateCombat(delta);
      this.updateProjectiles(delta);
      this.updateEffects(delta);
      this.updateCamera(delta);
      this.updateHUD();
    }

    this.updateLabels(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

new DiabloLike3D();
