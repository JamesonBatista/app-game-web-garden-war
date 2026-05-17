export default class LevelUpScene extends Phaser.Scene {
  constructor() {
    super({ key: "LevelUpScene" });
  }

  init(data) {
    this.choices = data.choices;
    this.onChoice = data.onChoice;
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.82);

    this.add.text(width / 2, height * 0.15, "SUBIU DE NIVEL!", {
      fontSize: "24px",
      fontFamily: "Arial Black",
      color: "#f1c40f",
      stroke: "#000",
      strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.24, "Escolha uma habilidade:", {
      fontSize: "14px",
      color: "#ccc"
    }).setOrigin(0.5);

    const startY = height * 0.35;
    const cardH = 90;
    const gap = 16;

    this.choices.forEach((skill, i) => {
      const cy = startY + i * (cardH + gap);
      this.createSkillCard(width / 2, cy, width - 60, cardH, skill);
    });
  }

  createSkillCard(x, y, w, h, skill) {
    const bg = this.add.rectangle(x, y, w, h, 0x1a1a2e)
      .setStrokeStyle(2, 0x3498db)
      .setInteractive({ useHandCursor: true });

    this.add.text(x - w / 2 + 16, y - 16, skill.name, {
      fontSize: "16px",
      fontFamily: "Arial Black",
      color: "#f1c40f"
    }).setOrigin(0, 0.5);

    this.add.text(x - w / 2 + 16, y + 12, skill.desc, {
      fontSize: "12px",
      color: "#aaa",
      wordWrap: { width: w - 32 }
    }).setOrigin(0, 0.5);

    bg.on("pointerover", () => bg.setStrokeStyle(2, 0xf1c40f));
    bg.on("pointerout", () => bg.setStrokeStyle(2, 0x3498db));
    bg.on("pointerdown", () => {
      this.tweens.add({
        targets: bg,
        scaleX: 0.97,
        scaleY: 0.97,
        yoyo: true,
        duration: 80,
        onComplete: () => this.onChoice(skill)
      });
    });
  }
}
