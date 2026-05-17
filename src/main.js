import BootScene from "./scenes/BootScene.js";
import MenuScene from "./scenes/MenuScene.js";
import GameScene from "./scenes/GameScene.js";
import LevelUpScene from "./scenes/LevelUpScene.js";
import GameOverScene from "./scenes/GameOverScene.js";

const config = {
  type: Phaser.AUTO,
  width: Math.min(window.innerWidth, 480),
  height: Math.min(window.innerHeight, 720),
  backgroundColor: "#1a1a2e",
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  scene: [BootScene, MenuScene, GameScene, LevelUpScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
