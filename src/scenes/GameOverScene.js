import { saveBestRunIfNeeded } from "../systems/progression.js";

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
    const scoreResult = saveBestRunIfNeeded({
      className: this.stats.className ?? "-",
      level: this.stats.level ?? 1,
      kills: this.stats.kills ?? 0,
      power: this.stats.power ?? 0,
      survivalSeconds: this.stats.survivalSeconds ?? 0,
      damageDealt: this.stats.damageDealt ?? 0,
      damageTaken: this.stats.damageTaken ?? 0,
      highestHit: this.stats.highestHit ?? 0,
      highestTakenHit: this.stats.highestTakenHit ?? 0,
      crits: this.stats.crits ?? 0,
      dodges: this.stats.dodges ?? 0,
      elitesKilled: this.stats.elitesKilled ?? 0,
      bossesKilled: this.stats.bossesKilled ?? 0,
      lootEquipped: this.stats.lootEquipped ?? 0
    });

    this.add.text(width / 2, height * 0.22, "GAME OVER", {
      fontSize: "36px",
      fontFamily: "Arial Black",
      color: "#e74c3c",
      stroke: "#000",
      strokeThickness: 5
    }).setOrigin(0.5);

    const statsText = [
      `Classe: ${this.stats.className ?? "-"}`,
      `Sobreviveu: ${this.stats.time}`,
      `Kills: ${this.stats.kills}`,
      `Nivel alcancado: ${this.stats.level}`,
      `Poder de Equipamento: ${this.stats.power ?? 0}`,
      `Dano causado: ${Math.round(this.stats.damageDealt ?? 0)}`,
      `Dano recebido: ${Math.round(this.stats.damageTaken ?? 0)}`,
      `Maior hit: ${Math.round(this.stats.highestHit ?? 0)}`,
      `Maior hit recebido: ${Math.round(this.stats.highestTakenHit ?? 0)}`,
      `Criticos: ${this.stats.crits ?? 0}`,
      `Esquivas: ${this.stats.dodges ?? 0}`,
      `Elites abatidos: ${this.stats.elitesKilled ?? 0}`,
      `Bosses abatidos: ${this.stats.bossesKilled ?? 0}`,
      `Itens equipados: ${this.stats.lootEquipped ?? 0}`,
      `Score da run: ${scoreResult.bestRun?.score ?? 0}`
    ].join("\n");

    this.add.text(width / 2, height * 0.49, statsText, {
      fontSize: "14px",
      color: "#ccc",
      align: "center",
      lineSpacing: 6
    }).setOrigin(0.5);

    if (scoreResult.isNewBest) {
      this.add.text(width / 2, height * 0.76, "NOVO RECORDE!", {
        fontSize: "14px",
        color: "#f1c40f",
        fontFamily: "Arial Black"
      }).setOrigin(0.5);
    }

    const btn = this.add.rectangle(width / 2, height * 0.82, 220, 54, 0xe74c3c)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height * 0.82, "JOGAR NOVAMENTE", {
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

    const btnMenu = this.add.text(width / 2, height * 0.92, "Voltar ao Menu", {
      fontSize: "14px",
      color: "#888"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnMenu.on("pointerover", () => btnMenu.setStyle({ color: "#fff" }));
    btnMenu.on("pointerout", () => btnMenu.setStyle({ color: "#888" }));
    btnMenu.on("pointerdown", () => this.scene.start("MenuScene"));
  }
}
