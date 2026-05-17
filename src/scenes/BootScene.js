export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    const { width, height } = this.scale;
    const bg = this.add.rectangle(width / 2, height / 2, width * 0.7, 20, 0x222222);
    const fill = this.add.rectangle(width / 2 - width * 0.35, height / 2, 0, 16, 0x3498db).setOrigin(0, 0.5);
    const text = this.add.text(width / 2, height / 2 - 30, "Carregando... 0%", {
      fontSize: "16px",
      color: "#fff"
    }).setOrigin(0.5);

    this.load.on("progress", (v) => {
      fill.width = width * 0.7 * v;
      text.setText(`Carregando... ${Math.floor(v * 100)}%`);
    });

    this.load.spritesheet("asset-player-down", "assets/sprites/player/notlink_down.png", {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet("asset-player-side", "assets/sprites/player/notlink_side.png", {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet("asset-player-use", "assets/sprites/player/notlink_use.png", {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet("asset-enemy-goo", "assets/sprites/enemies/goo_walk.png", {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet("asset-enemy-sword", "assets/sprites/enemies/sword_beast_side.png", {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet("asset-enemy-giant", "assets/sprites/enemies/giant_walk.png", {
      frameWidth: 32,
      frameHeight: 32
    });
    this.load.spritesheet("asset-fire", "assets/sprites/effects/whelp_fire.png", {
      frameWidth: 32,
      frameHeight: 32
    });

    // Legacy assets (fallback if present)
    this.load.spritesheet("asset-hero", "assets/sprites/player/hero_topdown.png", {
      frameWidth: 40,
      frameHeight: 64
    });
    this.load.spritesheet("asset-goblin", "assets/sprites/enemies/goblin_sheet.png", {
      frameWidth: 32,
      frameHeight: 32
    });
    this.load.spritesheet("asset-slime", "assets/sprites/enemies/slime_sheet.png", {
      frameWidth: 32,
      frameHeight: 32
    });
    this.load.on("loaderror", (file) => {
      console.warn(`Asset falhou (${file.key}), usando fallback interno.`);
    });

    bg.setDepth(10);
    fill.setDepth(11);
    text.setDepth(12);
  }

  create() {
    this.createPlaceholderTextures();
    this.createAnimations();
    this.scene.start("MenuScene");
  }

  createPlaceholderTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    this.makeIsoTile(g, "tile-grass", 0x3a7d44, 0x56a85f);
    this.makeIsoTile(g, "tile-dark", 0x2f5f38, 0x3f7d49);
    this.makeIsoTile(g, "tile-flower", 0x3a7d44, 0xe67e22, true);

    if (this.textures.exists("asset-player-side") && this.textures.exists("asset-player-down") && this.textures.exists("asset-player-use")) {
      this.createHeroSheetsFromPack();
    } else if (this.textures.exists("asset-hero")) {
      this.createHeroSheetsFromLegacyAsset();
    } else {
      this.makeHumanoidSheet(g, "warrior-idle", 64, 64, 4, "idle", {
        skin: 0xf1c27d,
        armor: 0x587ca0,
        cloth: 0x27384d,
        accent: 0xbdd4ef,
        metal: 0xc0c5cc
      });
      this.makeHumanoidSheet(g, "warrior-walk", 64, 64, 8, "walk", {
        skin: 0xf1c27d,
        armor: 0x4f7396,
        cloth: 0x243448,
        accent: 0xa8c4e3,
        metal: 0xc0c5cc
      });
      this.makeHumanoidSheet(g, "warrior-attack", 64, 64, 6, "attack", {
        skin: 0xf1c27d,
        armor: 0x5d86af,
        cloth: 0x1f2f41,
        accent: 0xd1e4f8,
        metal: 0xd6d9de
      });
    }

    if (this.textures.exists("asset-enemy-goo")) {
      this.createSheetFromFramesCentered("asset-enemy-goo", "enemy-slime", [0, 1, 2, 3], 48, 48, 32, 32, 0, 8);
    } else if (this.textures.exists("asset-slime")) {
      this.createSheetFromFramesCentered("asset-slime", "enemy-slime", [0, 1, 2, 1], 48, 48, 30, 30, 0, 10);
    } else {
      this.makeSlimeSheet(g, "enemy-slime", 48, 48, 4);
    }

    if (this.textures.exists("asset-enemy-sword") && this.textures.exists("asset-enemy-giant")) {
      this.createSheetFromFramesCentered("asset-enemy-sword", "enemy-goblin", [0, 1, 2, 3, 2, 1], 48, 48, 34, 34, 0, 10);
      this.createSheetFromFramesCentered("asset-enemy-giant", "enemy-tank", [0, 1, 2, 3], 64, 64, 58, 58, 0, 4);
    } else if (this.textures.exists("asset-goblin")) {
      this.createSheetFromFramesCentered("asset-goblin", "enemy-goblin", [1, 2, 3, 4, 5, 6], 48, 48, 34, 34, 0, 10);
      this.createSheetFromFramesCentered("asset-goblin", "enemy-tank", [24, 25, 26, 27], 64, 64, 52, 52, 0, 12);
    } else {
      this.makeGoblinSheet(g, "enemy-goblin", 48, 48, 6);
      this.makeTankSheet(g, "enemy-tank", 64, 64, 4);
    }

    this.makeSlashSheet(g, "slash", 64, 64, 5);

    g.clear();
    g.fillStyle(0x3498db, 1);
    g.fillCircle(16, 16, 14);
    g.generateTexture("gem", 32, 32);

    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 7);
    g.generateTexture("bullet", 16, 16);

    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 3);
    g.generateTexture("fx-dot", 8, 8);
    g.destroy();
  }

  createHeroSheetsFromPack() {
    this.createSheetFromFramesCentered("asset-player-down", "warrior-idle", [0, 1, 2, 1], 64, 64, 32, 32, 0, 8);
    this.createSheetFromFramesCentered("asset-player-side", "warrior-walk", [0, 1, 2, 3, 2, 1, 0, 1], 64, 64, 32, 32, 0, 8);
    this.createSheetFromFramesCentered("asset-player-use", "warrior-attack", [0, 1, 2, 3, 2, 1], 64, 64, 34, 34, 0, 6);
  }

  createHeroSheetsFromLegacyAsset() {
    this.createSheetFromFramesCentered("asset-hero", "warrior-idle", [0, 1, 2, 1], 64, 64, 40, 64, 0, 0);
    this.createSheetFromFramesCentered("asset-hero", "warrior-walk", [6, 7, 8, 9, 10, 11, 8, 7], 64, 64, 40, 64, 0, 0);
    this.createSheetFromFramesCentered("asset-hero", "warrior-attack", [12, 13, 14, 15, 16, 17], 64, 64, 40, 64, 0, 0);
  }

  createSheetFromFramesCentered(sourceKey, targetKey, frames, frameW, frameH, drawW, drawH, offsetX = 0, offsetY = 0) {
    if (this.textures.exists(targetKey)) {
      return;
    }

    const texture = this.textures.createCanvas(targetKey, frameW * frames.length, frameH);
    const ctx = texture.context;
    const centeredX = Math.floor((frameW - drawW) / 2) + offsetX;
    const centeredY = Math.floor((frameH - drawH) / 2) + offsetY;

    frames.forEach((frameIndex, i) => {
      const sourceFrame = this.textures.getFrame(sourceKey, frameIndex);
      if (!sourceFrame) {
        return;
      }
      ctx.drawImage(
        sourceFrame.source.image,
        sourceFrame.cutX,
        sourceFrame.cutY,
        sourceFrame.cutWidth,
        sourceFrame.cutHeight,
        i * frameW + centeredX,
        centeredY,
        drawW,
        drawH
      );
    });

    texture.refresh();
    this.registerSheetFrames(targetKey, frames.length, frameW, frameH);
  }

  makeIsoTile(g, key, fillColor, detailColor, flower = false) {
    g.clear();
    g.fillStyle(fillColor, 1);
    g.beginPath();
    g.moveTo(32, 0);
    g.lineTo(64, 16);
    g.lineTo(32, 32);
    g.lineTo(0, 16);
    g.closePath();
    g.fillPath();

    g.lineStyle(2, detailColor, 0.7);
    g.strokePath();

    if (flower) {
      g.fillStyle(detailColor, 1);
      g.fillCircle(32, 16, 4);
    }

    g.generateTexture(key, 64, 32);
  }

  makeHumanoidSheet(g, key, frameW, frameH, frames, pose, palette) {
    const width = frameW * frames;
    const height = frameH;
    g.clear();

    for (let i = 0; i < frames; i += 1) {
      const x = i * frameW;
      this.drawHumanoidFrame(g, x, frameW, frameH, i, frames, pose, palette);
    }

    g.generateTexture(key, width, height);
    this.registerSheetFrames(key, frames, frameW, frameH);
  }

  drawHumanoidFrame(g, offsetX, frameW, frameH, frame, frames, pose, palette) {
    const t = frame / Math.max(1, frames - 1);
    const wave = Math.sin(t * Math.PI * 2);
    const centerX = offsetX + frameW / 2;
    const groundY = frameH - 9;
    const bob = pose === "idle" ? Math.sin(t * Math.PI * 2) * 1.2 : 0;
    const stride = pose === "walk" ? wave * 5.8 : 0;
    const attackReach = pose === "attack" ? Math.sin(t * Math.PI) : 0;
    const torsoY = groundY - 25 + bob;
    const headY = torsoY - 10;
    const hipY = torsoY + 13;
    const shoulderY = torsoY + 3;

    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(centerX, groundY + 2, 22, 7);

    g.lineStyle(4, palette.cloth, 1);
    g.beginPath();
    g.moveTo(centerX - 4, hipY);
    g.lineTo(centerX - 6 - stride, groundY);
    g.moveTo(centerX + 4, hipY);
    g.lineTo(centerX + 6 + stride, groundY);
    g.strokePath();

    g.fillStyle(palette.armor, 1);
    g.fillRoundedRect(centerX - 8, torsoY - 2, 16, 18, 4);
    g.fillStyle(palette.accent, 0.75);
    g.fillRect(centerX - 3, torsoY + 1, 6, 10);

    g.lineStyle(4, palette.armor, 1);
    g.beginPath();
    g.moveTo(centerX - 7, shoulderY);
    g.lineTo(centerX - 12 - stride * 0.35, shoulderY + 7);
    g.moveTo(centerX + 7, shoulderY);
    g.lineTo(centerX + 12 + attackReach * 7, shoulderY + 4 - attackReach * 2);
    g.strokePath();

    g.fillStyle(palette.skin, 1);
    g.fillCircle(centerX, headY, 6);
    g.fillStyle(palette.cloth, 1);
    g.fillRoundedRect(centerX - 6, headY - 7, 12, 3, 1);

    g.lineStyle(3, palette.metal, 1);
    g.beginPath();
    g.moveTo(centerX + 13 + attackReach * 7, shoulderY + 3 - attackReach * 2);
    g.lineTo(centerX + 23 + attackReach * 8, shoulderY - 5 - attackReach * 2);
    g.strokePath();
  }

  makeSlimeSheet(g, key, frameW, frameH, frames) {
    g.clear();
    for (let i = 0; i < frames; i += 1) {
      const x = i * frameW;
      const wobble = Math.sin((i / frames) * Math.PI * 2);
      const cx = x + frameW / 2;
      const cy = frameH - 14 + wobble * 1.6;
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(cx, frameH - 8, 22, 6);
      g.fillStyle(0x2ecc71, 1);
      g.fillEllipse(cx, cy, 22 + wobble * 2, 16 - wobble * 2);
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(cx - 5, cy - 3, 2);
      g.fillCircle(cx + 5, cy - 3, 2);
    }
    g.generateTexture(key, frameW * frames, frameH);
    this.registerSheetFrames(key, frames, frameW, frameH);
  }

  makeGoblinSheet(g, key, frameW, frameH, frames) {
    g.clear();
    for (let i = 0; i < frames; i += 1) {
      const x = i * frameW;
      const sway = Math.sin((i / frames) * Math.PI * 2) * 3;
      const cx = x + frameW / 2;
      const feetY = frameH - 8;
      g.fillStyle(0x000000, 0.22);
      g.fillEllipse(cx, feetY + 1, 18, 6);

      g.lineStyle(3, 0x1f3f1f, 1);
      g.beginPath();
      g.moveTo(cx - 3, feetY - 11);
      g.lineTo(cx - 5 - sway, feetY);
      g.moveTo(cx + 3, feetY - 11);
      g.lineTo(cx + 5 + sway, feetY);
      g.strokePath();

      g.fillStyle(0x3d8f45, 1);
      g.fillRoundedRect(cx - 6, feetY - 24, 12, 14, 3);
      g.fillStyle(0xa6d97a, 1);
      g.fillCircle(cx, feetY - 28, 5);
      g.fillStyle(0x6d3f1f, 1);
      g.fillRect(cx + 8, feetY - 25, 2, 12);
    }
    g.generateTexture(key, frameW * frames, frameH);
    this.registerSheetFrames(key, frames, frameW, frameH);
  }

  makeTankSheet(g, key, frameW, frameH, frames) {
    g.clear();
    for (let i = 0; i < frames; i += 1) {
      const x = i * frameW;
      const throb = Math.sin((i / frames) * Math.PI * 2) * 2;
      const cx = x + frameW / 2;
      const baseY = frameH - 11;
      g.fillStyle(0x000000, 0.28);
      g.fillEllipse(cx, baseY + 2, 30, 8);
      g.fillStyle(0x9c2f1f, 1);
      g.fillRoundedRect(cx - 13, baseY - 28 + throb, 26, 20, 6);
      g.fillStyle(0xd35400, 1);
      g.fillRoundedRect(cx - 8, baseY - 36 + throb, 16, 11, 4);
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(cx - 5, baseY - 30 + throb, 2);
      g.fillCircle(cx + 5, baseY - 30 + throb, 2);
    }
    g.generateTexture(key, frameW * frames, frameH);
    this.registerSheetFrames(key, frames, frameW, frameH);
  }

  makeSlashSheet(g, key, frameW, frameH, frames) {
    g.clear();
    for (let i = 0; i < frames; i += 1) {
      const x = i * frameW;
      const progress = (i + 1) / frames;
      const cx = x + frameW / 2;
      const cy = frameH / 2;
      const radius = 10 + progress * 18;
      g.lineStyle(4, 0xf1c40f, 0.85 - progress * 0.45);
      g.beginPath();
      g.arc(cx, cy, radius, -1.2 + progress * 0.2, 1.8 + progress * 0.5, false);
      g.strokePath();
    }
    g.generateTexture(key, frameW * frames, frameH);
    this.registerSheetFrames(key, frames, frameW, frameH);
  }

  registerSheetFrames(key, frames, frameW, frameH) {
    const texture = this.textures.get(key);
    for (let i = 0; i < frames; i += 1) {
      const frameName = String(i);
      if (!texture.has(frameName)) {
        texture.add(frameName, 0, i * frameW, 0, frameW, frameH);
      }
    }
  }

  createAnimations() {
    const anims = this.anims;

    const createAnim = (key, texture, start, end, frameRate, repeat, hideOnComplete = false) => {
      if (anims.exists(key) || !this.textures.exists(texture)) {
        return;
      }
      const frames = anims.generateFrameNames(texture, {
        start,
        end
      });
      if (!frames.length) {
        return;
      }

      anims.create({
        key,
        frames,
        frameRate,
        repeat,
        hideOnComplete
      });
    };

    createAnim("warrior-idle", "warrior-idle", 0, 3, 6, -1);
    createAnim("warrior-walk", "warrior-walk", 0, 7, 10, -1);
    createAnim("warrior-attack", "warrior-attack", 0, 5, 14, 0);
    createAnim("enemy-slime", "enemy-slime", 0, 3, 8, -1);
    createAnim("enemy-goblin", "enemy-goblin", 0, 5, 10, -1);
    createAnim("enemy-tank", "enemy-tank", 0, 3, 6, -1);
    createAnim("slash", "slash", 0, 4, 16, 0, true);

    if (!anims.exists("fire-burst") && this.textures.exists("asset-fire")) {
      const frameNames = this.textures.get("asset-fire").getFrameNames().filter((name) => name !== "__BASE");
      const frames = frameNames.slice(0, Math.min(frameNames.length, 4)).map((name) => ({ key: "asset-fire", frame: name }));
      if (frames.length) {
        anims.create({
          key: "fire-burst",
          frames,
          frameRate: 14,
          repeat: 0,
          hideOnComplete: true
        });
      }
    }
  }
}
