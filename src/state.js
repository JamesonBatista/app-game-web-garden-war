export function buildInitialGameState() {
  return {
    running: true,
    paused: false,
    elapsed: 0,
    kills: 0,
    wave: 1,
    spawnInterval: 2000,
    minSpawnInterval: 300,
    player: {
      hp: 100,
      maxHp: 100,
      damage: 25,
      speed: 160,
      level: 1,
      xp: 0,
      xpNext: 80,
      skills: [],
      hasRegen: false,
      hasAura: false,
      hasMultishot: false,
      hasMagnet: false,
      hasShield: false,
      hasFreeze: false,
      slashCooldown: 1500,
      slashElapsed: 0,
      auraCooldown: 1200,
      auraElapsed: 0,
      multiCooldown: 2000,
      multiElapsed: 0,
      freezeCooldown: 5000,
      freezeElapsed: 0,
      regenCooldown: 1000,
      regenElapsed: 0,
      invincible: 0
    }
  };
}
