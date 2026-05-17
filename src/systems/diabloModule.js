const RARITY_CONFIG = [
  { id: "common", label: "Comum", color: "#bdc3c7", weight: 56, multiplier: 1 },
  { id: "magic", label: "Magico", color: "#3498db", weight: 28, multiplier: 1.28 },
  { id: "rare", label: "Raro", color: "#f1c40f", weight: 12, multiplier: 1.75 },
  { id: "legendary", label: "Lendario", color: "#e67e22", weight: 4, multiplier: 2.4 }
];

export const EQUIPMENT_SLOTS = {
  weapon: { id: "weapon", label: "Arma" },
  armor: { id: "armor", label: "Armadura" },
  trinket: { id: "trinket", label: "Reliquia" }
};

export const CLASS_DEFINITIONS = {
  barbarian: {
    id: "barbarian",
    name: "Barbaro",
    desc: "Brutal no corpo a corpo, armadura alta e furia crescente.",
    resource: { type: "Furia", max: 100, regenPerSecond: 8, start: 25 },
    baseStats: {
      maxHp: 145,
      damage: 29,
      speed: 152,
      armor: 52,
      resistance: 14,
      critChance: 0.12,
      critMultiplier: 1.75,
      dodgeChance: 0.04
    },
    classSkill: {
      id: "barbarian-earthquake",
      name: "Ruptura Sismica",
      desc: "Consome Furia para explodir area ao redor.",
      cooldown: 2400,
      cost: 28
    }
  },
  sorcerer: {
    id: "sorcerer",
    name: "Feiticeiro",
    desc: "Mestre elemental, dano alto e controle de area.",
    resource: { type: "Mana", max: 140, regenPerSecond: 20, start: 90 },
    baseStats: {
      maxHp: 95,
      damage: 34,
      speed: 160,
      armor: 22,
      resistance: 44,
      critChance: 0.18,
      critMultiplier: 1.9,
      dodgeChance: 0.06
    },
    classSkill: {
      id: "sorcerer-fire-orb",
      name: "Orbe Incandescente",
      desc: "Lanca um orbe que explode ao contato.",
      cooldown: 2100,
      cost: 35
    }
  },
  rogue: {
    id: "rogue",
    name: "Ladino",
    desc: "Rapido e letal com alta chance de critico e esquiva.",
    resource: { type: "Energia", max: 120, regenPerSecond: 26, start: 70 },
    baseStats: {
      maxHp: 105,
      damage: 27,
      speed: 182,
      armor: 28,
      resistance: 26,
      critChance: 0.22,
      critMultiplier: 2,
      dodgeChance: 0.16
    },
    classSkill: {
      id: "rogue-shadow-volley",
      name: "Rajada Sombria",
      desc: "Dispara adagas perfurantes em leque.",
      cooldown: 1800,
      cost: 24
    }
  }
};

const CLASS_SKILL_TREES = {
  barbarian: [
    {
      id: "barb_armor_plate",
      name: "Placas de Aco",
      desc: "+12 de armadura permanente",
      apply: (gs) => { gs.player.armor += 12; }
    },
    {
      id: "barb_fury_engine",
      name: "Sangue de Guerra",
      desc: "+6 de regeneracao de furia por segundo",
      apply: (gs) => { gs.player.resourceRegenPerSecond += 6; }
    },
    {
      id: "barb_cruel_finish",
      name: "Execucao Cruel",
      desc: "+20% dano critico",
      apply: (gs) => { gs.player.critMultiplier += 0.2; }
    }
  ],
  sorcerer: [
    {
      id: "sorc_arcane_focus",
      name: "Foco Arcano",
      desc: "+15 mana maxima e +10% dano magico",
      apply: (gs) => {
        gs.player.resourceMax += 15;
        gs.player.resource = Math.min(gs.player.resource + 15, gs.player.resourceMax);
        gs.player.damage *= 1.1;
      }
    },
    {
      id: "sorc_barrier",
      name: "Barreira de Mana",
      desc: "+12 resistencia elemental",
      apply: (gs) => { gs.player.resistance += 12; }
    },
    {
      id: "sorc_rapid_cast",
      name: "Conjuracao Rapida",
      desc: "-14% cooldown da habilidade de classe",
      apply: (gs) => { gs.player.classSkillCooldown *= 0.86; }
    }
  ],
  rogue: [
    {
      id: "rogue_precision",
      name: "Precisao Letal",
      desc: "+8% chance de critico",
      apply: (gs) => { gs.player.critChance = Math.min(0.8, gs.player.critChance + 0.08); }
    },
    {
      id: "rogue_evasion",
      name: "Passos Fantasma",
      desc: "+7% chance de esquiva",
      apply: (gs) => { gs.player.dodgeChance = Math.min(0.65, gs.player.dodgeChance + 0.07); }
    },
    {
      id: "rogue_burst",
      name: "Instinto de Caca",
      desc: "+18 de dano base",
      apply: (gs) => { gs.player.damage += 18; }
    }
  ]
};

const LOOT_AFFIXES = [
  {
    id: "damage",
    slot: "weapon",
    names: ["Lamina", "Runa de Carnificina", "Marca do Carrasco"],
    stat: "damage",
    operation: "add",
    format: (amount) => `+${amount} Dano`
  },
  {
    id: "armor",
    slot: "armor",
    names: ["Couraca", "Pele Endurecida", "Manto de Ferro"],
    stat: "armor",
    operation: "add",
    format: (amount) => `+${amount} Armadura`
  },
  {
    id: "resistance",
    slot: "trinket",
    names: ["Talisma", "Selo Arcano", "Anel de Cinzas"],
    stat: "resistance",
    operation: "add",
    format: (amount) => `+${amount} Resistencia`
  },
  {
    id: "maxHp",
    slot: "armor",
    names: ["Coracao de Besta", "Osso Vital", "Sangue Antigo"],
    stat: "maxHp",
    operation: "add",
    format: (amount) => `+${amount} Vida Max`
  },
  {
    id: "critChance",
    slot: "weapon",
    names: ["Olho de Corvo", "Insignia Vermelha", "Gume Assassino"],
    stat: "critChance",
    operation: "percent_points",
    format: (amount) => `+${amount}% Crit`
  },
  {
    id: "dodgeChance",
    slot: "trinket",
    names: ["Vento Frio", "Passo Fantasma", "Escama Lunar"],
    stat: "dodgeChance",
    operation: "percent_points",
    format: (amount) => `+${amount}% Esquiva`
  }
];

export function getClassCards() {
  return Object.values(CLASS_DEFINITIONS);
}

export function applyClassPreset(gs, classId) {
  const selected = CLASS_DEFINITIONS[classId] ?? CLASS_DEFINITIONS.barbarian;
  const { baseStats, resource, classSkill } = selected;
  const p = gs.player;

  p.classId = selected.id;
  p.className = selected.name;

  p.maxHp = baseStats.maxHp;
  p.hp = baseStats.maxHp;
  p.damage = baseStats.damage;
  p.speed = baseStats.speed;
  p.armor = baseStats.armor;
  p.resistance = baseStats.resistance;
  p.critChance = baseStats.critChance;
  p.critMultiplier = baseStats.critMultiplier;
  p.dodgeChance = baseStats.dodgeChance;

  p.resourceType = resource.type;
  p.resourceMax = resource.max;
  p.resource = resource.start;
  p.resourceRegenPerSecond = resource.regenPerSecond;

  p.classSkillId = classSkill.id;
  p.classSkillName = classSkill.name;
  p.classSkillCooldown = classSkill.cooldown;
  p.classSkillCost = classSkill.cost;
  p.classSkillElapsed = 0;

  p.equipmentPower = 0;
  p.equipment = {
    weapon: null,
    armor: null,
    trinket: null
  };
  p.inventoryLog = [];
}

export function getClassSkillTree(classId) {
  return CLASS_SKILL_TREES[classId] ?? [];
}

export function regenClassResource(player, deltaMs) {
  const gain = player.resourceRegenPerSecond * (deltaMs / 1000);
  player.resource = Math.min(player.resourceMax, player.resource + gain);
}

export function trySpendResource(player, amount) {
  if (player.resource < amount) {
    return false;
  }
  player.resource -= amount;
  return true;
}

export function gainClassResource(player, amount) {
  player.resource = Math.min(player.resourceMax, player.resource + amount);
}

function applyAffixDelta(player, loot, direction) {
  const sign = direction >= 0 ? 1 : -1;
  const value = loot.value * sign;

  if (loot.operation === "add") {
    player[loot.stat] = (player[loot.stat] ?? 0) + value;
    if (loot.stat === "maxHp") {
      if (sign > 0) {
        player.hp = Math.min(player.maxHp, player.hp + Math.floor(loot.value * 0.5));
      } else {
        player.hp = Math.min(player.hp, player.maxHp);
      }
    }
    return;
  }

  if (loot.operation === "percent_points") {
    player[loot.stat] = (player[loot.stat] ?? 0) + value / 100;
    if (loot.stat === "critChance") {
      player.critChance = Math.min(0.9, Math.max(0, player.critChance));
    }
    if (loot.stat === "dodgeChance") {
      player.dodgeChance = Math.min(0.75, Math.max(0, player.dodgeChance));
    }
  }
}

export function rollCriticalDamage(baseDamage, player, rng = Math.random) {
  const isCritical = rng() < (player.critChance ?? 0);
  const amount = isCritical ? baseDamage * (player.critMultiplier ?? 1.6) : baseDamage;
  return { isCritical, amount };
}

export function computeMitigatedDamage(rawDamage, player, rng = Math.random) {
  const dodgeChance = player.dodgeChance ?? 0;
  if (rng() < dodgeChance) {
    return { dodged: true, amount: 0 };
  }

  const armor = player.armor ?? 0;
  const resistance = player.resistance ?? 0;
  const armorReduction = armor / (armor + 145);
  const resistReduction = resistance / (resistance + 120);
  const reduced = rawDamage * (1 - armorReduction) * (1 - resistReduction);
  return {
    dodged: false,
    amount: Math.max(1, reduced)
  };
}

function pickRarity(rng = Math.random) {
  const total = RARITY_CONFIG.reduce((acc, item) => acc + item.weight, 0);
  let roll = rng() * total;
  for (const rarity of RARITY_CONFIG) {
    roll -= rarity.weight;
    if (roll <= 0) {
      return rarity;
    }
  }
  return RARITY_CONFIG[0];
}

export function rollLootDrop(enemyType, wave, enemyTier = "normal", rng = Math.random) {
  const tierBonus = enemyTier === "boss" ? 0.65 : enemyTier === "elite" ? 0.28 : 0;
  const baseChance = 0.18 + Math.min(0.22, wave * 0.03) + (enemyType === "tank" ? 0.15 : 0) + tierBonus;
  if (rng() > baseChance) {
    return null;
  }

  const rarity = pickRarity(rng);
  const affix = LOOT_AFFIXES[Math.floor(rng() * LOOT_AFFIXES.length)];
  const tierMult = enemyTier === "boss" ? 2.8 : enemyTier === "elite" ? 1.45 : 1;
  const baseValue = (4 + wave * 1.25) * tierMult;
  const scaled = Math.max(1, Math.round(baseValue * rarity.multiplier));
  const name = affix.names[Math.floor(rng() * affix.names.length)];
  const slot = EQUIPMENT_SLOTS[affix.slot];

  return {
    id: `${rarity.id}-${affix.id}-${Date.now()}-${Math.floor(rng() * 999)}`,
    rarity,
    tier: enemyTier,
    affixId: affix.id,
    slot: affix.slot,
    slotLabel: slot.label,
    stat: affix.stat,
    operation: affix.operation,
    name: `${rarity.label} ${name}`,
    value: scaled,
    score: Math.round(scaled * rarity.multiplier + (enemyTier === "boss" ? 16 : enemyTier === "elite" ? 7 : 0)),
    summary: `${slot.label} | ${affix.format(scaled)}`
  };
}

export function applyLootToPlayer(player, loot) {
  applyAffixDelta(player, loot, 1);
  player.equipmentPower = Math.max(0, (player.equipmentPower ?? 0) + loot.score);
}

export function removeLootFromPlayer(player, loot) {
  applyAffixDelta(player, loot, -1);
  player.equipmentPower = Math.max(0, (player.equipmentPower ?? 0) - loot.score);
}

export function equipLootItem(player, loot) {
  const current = player.equipment?.[loot.slot] ?? null;
  if (current) {
    removeLootFromPlayer(player, current);
  }
  applyLootToPlayer(player, loot);
  player.equipment[loot.slot] = loot;

  player.inventoryLog.push({
    id: loot.id,
    name: loot.name,
    slot: loot.slot,
    score: loot.score
  });
  if (player.inventoryLog.length > 30) {
    player.inventoryLog.shift();
  }
}

export function rollEnemyModifiers(enemyType, wave, kills, hasBossAlive, rng = Math.random) {
  let tier = "normal";
  if (!hasBossAlive && kills > 0 && kills % 45 === 0) {
    tier = "boss";
  } else if (rng() < Math.min(0.08 + wave * 0.025, 0.26)) {
    tier = "elite";
  }

  const affixPool = ["juggernaut", "haste", "berserker", "arcane", "volatile"];
  const affixCount = tier === "boss" ? 2 : tier === "elite" ? 1 : 0;
  const affixes = [];
  for (let i = 0; i < affixCount; i += 1) {
    const available = affixPool.filter((item) => !affixes.includes(item));
    affixes.push(available[Math.floor(rng() * available.length)]);
  }

  const mod = {
    tier,
    affixes,
    hpMultiplier: tier === "boss" ? 4.8 : tier === "elite" ? 2.1 : 1,
    damageMultiplier: tier === "boss" ? 2.3 : tier === "elite" ? 1.45 : 1,
    speedMultiplier: tier === "boss" ? 0.95 : tier === "elite" ? 1.1 : 1,
    xpMultiplier: tier === "boss" ? 6.5 : tier === "elite" ? 2.4 : 1,
    scaleBonus: tier === "boss" ? 0.45 : tier === "elite" ? 0.15 : 0,
    tint: tier === "boss" ? 0xe74c3c : tier === "elite" ? 0xf1c40f : null
  };

  affixes.forEach((affix) => {
    if (affix === "juggernaut") {
      mod.hpMultiplier *= 1.45;
    } else if (affix === "haste") {
      mod.speedMultiplier *= 1.33;
    } else if (affix === "berserker") {
      mod.damageMultiplier *= 1.38;
    } else if (affix === "arcane") {
      mod.damageMultiplier *= 1.18;
      mod.canShoot = true;
      mod.shootCooldownMultiplier = 0.72;
    } else if (affix === "volatile") {
      mod.hasDeathExplosion = true;
    }
  });

  mod.name =
    tier === "boss"
      ? `Mini Boss ${enemyType.toUpperCase()}`
      : tier === "elite"
      ? `Elite ${enemyType}`
      : enemyType;
  return mod;
}
