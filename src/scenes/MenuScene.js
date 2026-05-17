export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

    this.add.text(width / 2, height * 0.28, "SURVIVORS\nQUEST", {
      fontSize: "40px",
      fontFamily: "Arial Black",
      color: "#f1c40f",
      align: "center",
      stroke: "#000",
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.47, "Roguelite Isometrico", {
      fontSize: "15px",
      color: "#aaaaaa"
    }).setOrigin(0.5);

    const btnBg = this.add.rectangle(width / 2, height * 0.63, 220, 54, 0x2ecc71)
      .setInteractive({ useHandCursor: true });
    const btnText = this.add.text(width / 2, height * 0.63, "JOGAR", {
      fontSize: "22px",
      fontFamily: "Arial Black",
      color: "#fff"
    }).setOrigin(0.5);

    btnBg.on("pointerdown", () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("GameScene"));
    });
    btnBg.on("pointerover", () => btnBg.setFillStyle(0x27ae60));
    btnBg.on("pointerout", () => btnBg.setFillStyle(0x2ecc71));

    this.tweens.add({
      targets: [btnBg, btnText],
      scaleX: 1.04,
      scaleY: 1.04,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: "Sine.easeInOut"
    });

    this.add.text(width / 2, height * 0.93, "v1.0 modular", {
      fontSize: "11px",
      color: "#444"
    }).setOrigin(0.5);
  }
}
