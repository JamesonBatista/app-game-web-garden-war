export const TILE_W = 64;
export const TILE_H = 32;
export const MAP_RADIUS = 10;

export const ENEMY_CONFIG = {
  slime: {
    anim: "enemy-slime",
    hp: 30,
    speed: 60,
    damage: 8,
    xp: 10,
    bodyW: 24,
    bodyH: 16,
    bodyOffsetX: 12,
    bodyOffsetY: 24,
    shadowW: 28,
    shadowH: 10,
    scale: 1,
    availableFrom: 1
  },
  goblin: {
    anim: "enemy-goblin",
    hp: 20,
    speed: 95,
    damage: 6,
    xp: 14,
    bodyW: 20,
    bodyH: 14,
    bodyOffsetX: 14,
    bodyOffsetY: 26,
    shadowW: 24,
    shadowH: 9,
    scale: 1,
    canShoot: true,
    shootRange: 230,
    shootCooldown: 3000,
    bulletSpeed: 175,
    availableFrom: 2
  },
  tank: {
    anim: "enemy-tank",
    hp: 120,
    speed: 42,
    damage: 18,
    xp: 35,
    bodyW: 34,
    bodyH: 22,
    bodyOffsetX: 15,
    bodyOffsetY: 34,
    shadowW: 40,
    shadowH: 14,
    scale: 1.2,
    availableFrom: 3
  }
};

export const SKILLS = [
  {
    id: "slash_cooldown",
    name: "Golpe Mais Rapido",
    desc: "Reduz intervalo do golpe giratorio em 20%",
    apply: (gs) => { gs.player.slashCooldown *= 0.8; }
  },
  {
    id: "damage_up",
    name: "Dano +40%",
    desc: "Aumenta o dano de todos os ataques",
    apply: (gs) => { gs.player.damage *= 1.4; }
  },
  {
    id: "speed_up",
    name: "Velocidade +25%",
    desc: "Aumenta a velocidade de movimento",
    apply: (gs) => { gs.player.speed *= 1.25; }
  },
  {
    id: "regen",
    name: "Regeneracao",
    desc: "Recupera 3 HP por segundo",
    apply: (gs) => { gs.player.hasRegen = true; }
  },
  {
    id: "aura",
    name: "Aura de Dano",
    desc: "Pulsa 12 de dano ao redor a cada 1.2s",
    apply: (gs) => { gs.player.hasAura = true; }
  },
  {
    id: "multishot",
    name: "Flechas em Cruz",
    desc: "Dispara 4 flechas a cada 2s",
    apply: (gs) => { gs.player.hasMultishot = true; }
  },
  {
    id: "magnet",
    name: "Ima de XP",
    desc: "Atrai gemas em um raio maior",
    apply: (gs) => { gs.player.hasMagnet = true; }
  },
  {
    id: "shield",
    name: "Escudo de Espinhos",
    desc: "Inimigos que encostam tomam 20 de dano",
    apply: (gs) => { gs.player.hasShield = true; }
  },
  {
    id: "freeze",
    name: "Onda de Gelo",
    desc: "Congela inimigos proximos periodicamente",
    apply: (gs) => { gs.player.hasFreeze = true; }
  },
  {
    id: "hp_up",
    name: "HP Maximo +50",
    desc: "Aumenta hp maximo e cura 30",
    apply: (gs) => {
      gs.player.maxHp += 50;
      gs.player.hp = Math.min(gs.player.maxHp, gs.player.hp + 30);
    }
  }
];
