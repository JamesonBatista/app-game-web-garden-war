export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOverScene" });
  }

  init(data) {
    this.stats = data;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0a);

    this.add.text(width / 2, height * 0.22, "GAME OVER", {
      fontSize: "36px",
      fontFamily: "Arial Black",
      color: "#e74c3c",
      stroke: "#000",
      strokeThickness: 5
    }).setOrigin(0.5);

    const statsText = [
      `Sobreviveu: ${this.stats.time}`,
      `Kills: ${this.stats.kills}`,
      `Nivel alcancado: ${this.stats.level}`
    ].join("\n");

    this.add.text(width / 2, height * 0.48, statsText, {
      fontSize: "18px",
      color: "#ccc",
      align: "center",
      lineSpacing: 10
    }).setOrigin(0.5);

    const btn = this.add.rectangle(width / 2, height * 0.72, 220, 54, 0xe74c3c)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height * 0.72, "JOGAR NOVAMENTE", {
      fontSize: "16px",
      fontFamily: "Arial Black",
      color: "#fff"
    }).setOrigin(0.5);

    btn.on("pointerdown", () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("GameScene"));
    });
    btn.on("pointerover", () => btn.setFillStyle(0xc0392b));
    btn.on("pointerout", () => btn.setFillStyle(0xe74c3c));

    const btnMenu = this.add.text(width / 2, height * 0.84, "Voltar ao Menu", {
      fontSize: "14px",
      color: "#888"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnMenu.on("pointerover", () => btnMenu.setStyle({ color: "#fff" }));
    btnMenu.on("pointerout", () => btnMenu.setStyle({ color: "#888" }));
    btnMenu.on("pointerdown", () => this.scene.start("MenuScene"));
  }
}
