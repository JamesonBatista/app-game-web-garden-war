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

    this.makeRectSheet(g, "warrior-idle", 64, 64, 4, 0x3498db, 0x2c3e50);
    this.makeRectSheet(g, "warrior-walk", 64, 64, 8, 0x2980b9, 0x1f3b57);
    this.makeRectSheet(g, "warrior-attack", 64, 64, 6, 0xe67e22, 0x8e4d13);

    this.makeRectSheet(g, "enemy-slime", 48, 48, 4, 0x2ecc71, 0x1f8a4d);
    this.makeRectSheet(g, "enemy-goblin", 48, 48, 6, 0x9b59b6, 0x5b2f73);
    this.makeRectSheet(g, "enemy-tank", 64, 64, 4, 0xc0392b, 0x7b241c);
    this.makeRectSheet(g, "slash", 64, 64, 5, 0xf1c40f, 0xd68910);

    g.clear();
    g.fillStyle(0x3498db, 1);
    g.fillCircle(16, 16, 14);
    g.generateTexture("gem", 32, 32);

    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 7);
    g.generateTexture("bullet", 16, 16);
    g.destroy();
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

  makeRectSheet(g, key, frameW, frameH, frames, colorA, colorB) {
    const width = frameW * frames;
    const height = frameH;
    g.clear();

    for (let i = 0; i < frames; i += 1) {
      const x = i * frameW;
      const blend = i % 2 === 0 ? colorA : colorB;
      g.fillStyle(blend, 1);
      g.fillRoundedRect(x + 6, 8, frameW - 12, frameH - 14, 12);
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(x + frameW / 2, frameH / 2 - 6, 6);
    }

    g.generateTexture(key, width, height);

    // Registra frames manualmente para o texture gerado funcionar como spritesheet.
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
  }
}
