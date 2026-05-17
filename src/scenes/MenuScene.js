import { getClassCards } from "../systems/diabloModule.js";

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const { width, height } = this.scale;
    const classCards = getClassCards();
    this.selectedClassId = this.registry.get("selectedClass") ?? classCards[0].id;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

    this.add.text(width / 2, height * 0.28, "SURVIVORS\nQUEST", {
      fontSize: "40px",
      fontFamily: "Arial Black",
      color: "#f1c40f",
      align: "center",
      stroke: "#000",
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.45, "ARPG Survivors com modulo Diablo", {
      fontSize: "15px",
      color: "#aaaaaa"
    }).setOrigin(0.5);

    const cardRegionTop = height * 0.5;
    const cardRegionBottom = height * 0.82;
    const availableHeight = Math.max(180, cardRegionBottom - cardRegionTop);
    const cardHeight = Math.min(86, Math.max(58, Math.floor((availableHeight - 16) / 3)));
    const cardGap = cardHeight + 8;
    const cardStartY = cardRegionTop + cardHeight / 2;
    this.classCardBackgrounds = [];
    classCards.forEach((card, idx) => {
      const x = width / 2;
      const y = cardStartY + idx * cardGap;
      const bg = this.add.rectangle(x, y, width - 64, cardHeight, 0x15152a)
        .setStrokeStyle(2, 0x3d4f78)
        .setInteractive({ useHandCursor: true });
      this.classCardBackgrounds.push({ id: card.id, bg });

      this.add.text(x - (width - 64) / 2 + 14, y - (cardHeight * 0.23), card.name, {
        fontSize: cardHeight <= 64 ? "15px" : "18px",
        fontFamily: "Arial Black",
        color: "#f1c40f"
      }).setOrigin(0, 0.5);

      this.add.text(x - (width - 64) / 2 + 14, y + (cardHeight * 0.2), card.desc, {
        fontSize: cardHeight <= 64 ? "10px" : "12px",
        color: "#bdc3c7",
        wordWrap: { width: width - 120 }
      }).setOrigin(0, 0.5);

      bg.on("pointerdown", () => {
        this.selectedClassId = card.id;
        this.registry.set("selectedClass", card.id);
        this.refreshClassSelection();
      });
      bg.on("pointerover", () => {
        if (this.selectedClassId !== card.id) {
          bg.setStrokeStyle(2, 0x5b6b92);
        }
      });
      bg.on("pointerout", () => this.refreshClassSelection());
    });

    this.refreshClassSelection();

    const btnBg = this.add.rectangle(width / 2, Math.min(height - 36, height * 0.92), 220, 52, 0x2ecc71)
      .setInteractive({ useHandCursor: true });
    const btnText = this.add.text(width / 2, Math.min(height - 36, height * 0.92), "JOGAR", {
      fontSize: "22px",
      fontFamily: "Arial Black",
      color: "#fff"
    }).setOrigin(0.5);

    btnBg.on("pointerdown", () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("GameScene", { classId: this.selectedClassId });
      });
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

    this.add.text(width / 2, height * 0.97, "v1.1 modulo diablo", {
      fontSize: "11px",
      color: "#444"
    }).setOrigin(0.5);
  }

  refreshClassSelection() {
    this.classCardBackgrounds.forEach(({ id, bg }) => {
      const isSelected = id === this.selectedClassId;
      bg.setFillStyle(isSelected ? 0x1f2d3d : 0x15152a);
      bg.setStrokeStyle(2, isSelected ? 0xf1c40f : 0x3d4f78);
    });
  }
}
