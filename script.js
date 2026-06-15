"use strict";

const SAVE_KEY = "stardustGirlsDungeonSave";

const rarityData = {
  N: { multiplier: 1, label: "N" },
  R: { multiplier: 1.55, label: "R" },
  SR: { multiplier: 2.25, label: "SR" },
  SSR: { multiplier: 3.35, label: "SSR" }
};

const weaponNames = ["木のステッキ", "星くずワンド", "月光のロッド", "ミラクルスター"];
const armorNames = ["見習いローブ", "ふわふわケープ", "星空ドレス", "プリズムメイド服"];

const enemies = [
  { name: "ぷにスライム", icon: "🫧", power: 1 },
  { name: "星くずコウモリ", icon: "🦇", power: 1.15 },
  { name: "いたずらキノコ", icon: "🍄", power: 1.3 },
  { name: "ミニゴーレム", icon: "🗿", power: 1.5 },
  { name: "迷子の影", icon: "👤", power: 1.7 }
];

const defaultState = {
  level: 1,
  hp: 30,
  maxHp: 30,
  attack: 5,
  defense: 3,
  magic: 6,
  luck: 2,
  exp: 0,
  gold: 0,
  floor: 1,
  weapon: { name: "木のステッキ", rarity: "N", power: 1 },
  armor: { name: "見習いローブ", rarity: "N", power: 1 },
  collection: ["N:見習いローブ"],
  upgrades: { hp: 0, attack: 0, magic: 0, defense: 0 },
  logs: ["🌟 ミルカの星降る冒険が始まった！"]
};

let state = loadState();

function cloneDefault() {
  return JSON.parse(JSON.stringify(defaultState));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!saved) return cloneDefault();

    const base = cloneDefault();

    return {
      ...base,
      ...saved,
      weapon: { ...base.weapon, ...saved.weapon },
      armor: { ...base.armor, ...saved.armor },
      upgrades: { ...base.upgrades, ...saved.upgrades },
      collection: Array.isArray(saved.collection) ? saved.collection : base.collection,
      logs: Array.isArray(saved.logs) ? saved.logs.slice(0, 10) : base.logs
    };
  } catch {
    return cloneDefault();
  }
}

function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(percent) {
  return Math.random() * 100 < percent;
}

function nextExp() {
  return 20 + (state.level - 1) * 15;
}

function addLog(message) {
  state.logs.unshift(message);
  state.logs = state.logs.slice(0, 10);
}

function gainExp(amount) {
  state.exp += amount;

  while (state.exp >= nextExp()) {
    state.exp -= nextExp();
    state.level += 1;

    const hpGain = randomInt(4, 7);
    state.maxHp += hpGain;
    state.hp = state.maxHp;
    state.attack += randomInt(1, 2);
    state.defense += randomInt(1, 2);
    state.magic += randomInt(1, 2);
    state.luck += 1;

    addLog(`🎉 ミルカはレベルアップした！ Lv.${state.level}になった！`);
  }
}

function pickRarity() {
  const roll = Math.random() * 100 + state.luck * 0.25;

  if (roll >= 98) return "SSR";
  if (roll >= 89) return "SR";
  if (roll >= 65) return "R";
  return "N";
}

function makeEquipment(type) {
  const rarity = pickRarity();
  const names = type === "weapon" ? weaponNames : armorNames;
  const nameIndex = randomInt(0, names.length - 1);
  const floorPower = 1 + Math.floor(state.floor / 4);

  const power = Math.max(
    1,
    Math.round((nameIndex + 1 + floorPower) * rarityData[rarity].multiplier)
  );

  return { name: names[nameIndex], rarity, power };
}

function findEquipment() {
  const type = chance(50) ? "weapon" : "armor";
  const item = makeEquipment(type);
  const icon = type === "weapon" ? "🪄" : "👗";

  addLog(`${icon} ${item.rarity}「${item.name}」(+${item.power})を拾った！`);

  if (type === "armor") {
    const key = `${item.rarity}:${item.name}`;

    if (!state.collection.includes(key)) {
      state.collection.push(key);
      addLog(`📚 衣装図鑑に「${item.name}」を登録した！`);
    }
  }

  if (item.power > state[type].power) {
    state[type] = item;
    addLog(`✨ ${item.name}を自動で装備した！`);
  }
}

function battle() {
  const enemy = enemies[randomInt(0, enemies.length - 1)];
  const scale = 1 + (state.floor - 1) * 0.16;

  const enemyHp = Math.round((12 + randomInt(0, 8)) * enemy.power * scale);
  const enemyAttack = Math.round((4 + state.floor * 0.7) * enemy.power);

  const playerDamage = Math.max(
    1,
    Math.round(
      state.attack +
      state.weapon.power +
      state.magic * 0.55 +
      randomInt(-2, 3)
    )
  );

  const takenDamage = Math.max(
    1,
    Math.round(
      enemyAttack -
      (state.defense + state.armor.power) * 0.45
    )
  );

  const turnsToWin = Math.ceil(enemyHp / playerDamage);
  const totalDamage = takenDamage * Math.max(0, turnsToWin - 1);

  addLog(`${enemy.icon} ${enemy.name}が現れた！`);

  if (totalDamage < state.hp) {
    state.hp -= totalDamage;

    const exp = Math.round((6 + state.floor * 2) * enemy.power);
    const gold = Math.round(
      (5 + randomInt(0, 7) + state.floor) * enemy.power
    );

    state.gold += gold;
    gainExp(exp);
    state.floor += 1;

    addLog(`⚔️ ${enemy.name}に勝利！ EXP ${exp}、${gold}Gを獲得！`);

    if (chance(23 + state.luck * 0.3)) {
      findEquipment();
    }
  } else {
    state.hp = Math.max(1, Math.round(state.maxHp * 0.45));
    state.floor = Math.max(1, state.floor - 2);

    addLog(`💫 ${enemy.name}には勝てなかった…。街で休んで再出発！`);
  }
}

function explore() {
  const roll = randomInt(1, 100);

  if (roll <= 48) {
    battle();
  } else if (roll <= 63) {
    const gold = randomInt(5, 14) + state.floor;
    state.gold += gold;

    addLog(`🪙 星のかけらのそばで ${gold}Gを拾った！`);
  } else if (roll <= 75) {
    const exp = randomInt(4, 10) + Math.floor(state.floor / 2);
    gainExp(exp);

    addLog(`📖 魔法のひらめき！ EXP ${exp}を得た！`);
  } else if (roll <= 87) {
    findEquipment();
  } else if (roll <= 95) {
    const heal = Math.min(
      state.maxHp - state.hp,
      randomInt(4, 10)
    );

    state.hp += heal;

    addLog(
      heal > 0
        ? `💗 星の泉でHPが ${heal}回復した！`
        : "💗 星の泉はきらきら輝いている。"
    );
  } else {
    addLog("🌙 静かな通路だった。星の音が聞こえる気がする。");
  }

  saveState();
  render();
}

function upgradeCost(type) {
  return 25 + state.upgrades[type] * 22;
}

function buyUpgrade(type) {
  const cost = upgradeCost(type);

  if (state.gold < cost) {
    addLog("🪙 ゴールドが足りないみたい…。");
  } else {
    state.gold -= cost;
    state.upgrades[type] += 1;

    if (type === "hp") {
      state.maxHp += 5;
      state.hp += 5;
    } else {
      state[type] += 1;
    }

    const labels = {
      hp: "HP",
      attack: "攻撃力",
      magic: "魔力",
      defense: "防御力"
    };

    addLog(`🛍️ ${labels[type]}を強化した！`);
  }

  saveState();
  render();
}

function renderCollection() {
  const grid = document.getElementById("collectionGrid");
  grid.innerHTML = "";

  const allCostumes = [];

  Object.keys(rarityData).forEach(rarity => {
    armorNames.forEach(name => {
      allCostumes.push({ rarity, name });
    });
  });

  allCostumes.forEach(item => {
    const unlocked = state.collection.includes(
      `${item.rarity}:${item.name}`
    );

    const equipped =
      state.armor.name === item.name &&
      state.armor.rarity === item.rarity;

    const element = document.createElement("div");

    element.className =
      `collection-item rarity-${item.rarity}` +
      `${unlocked ? "" : " locked"}`;

    element.innerHTML = `
      <span class="dress-icon">${unlocked ? "👗" : "❔"}</span>
      <div>
        <strong>${unlocked ? item.name : "？？？？"}</strong>
        <span>${item.rarity}${unlocked && equipped ? "・装備中" : ""}</span>
      </div>
    `;

    grid.appendChild(element);
  });

  document.getElementById("collectionCount").textContent =
    `${state.collection.length} / ${allCostumes.length}`;
}

function render() {
  const ids = [
    "level",
    "hp",
    "maxHp",
    "attack",
    "defense",
    "magic",
    "luck",
    "exp",
    "gold",
    "floor"
  ];

  ids.forEach(id => {
    document.getElementById(id).textContent = state[id];
  });

  document.getElementById("nextExp").textContent = nextExp();

  document.getElementById("hpBar").style.width =
    `${Math.max(0, state.hp / state.maxHp * 100)}%`;

  document.getElementById("expBar").style.width =
    `${Math.max(0, state.exp / nextExp() * 100)}%`;

  document.getElementById("weaponName").textContent =
    `${state.weapon.rarity} ${state.weapon.name}`;

  document.getElementById("weaponPower").textContent =
    `+${state.weapon.power}`;

  document.getElementById("armorName").textContent =
    `${state.armor.rarity} ${state.armor.name}`;

  document.getElementById("armorPower").textContent =
    `+${state.armor.power}`;

  document.querySelectorAll("[data-upgrade]").forEach(button => {
    const type = button.dataset.upgrade;
    const cost = upgradeCost(type);

    button.querySelector("strong").textContent = `${cost} G`;
    button.disabled = state.gold < cost;
  });

  const log = document.getElementById("adventureLog");
  log.innerHTML = "";

  state.logs.forEach(message => {
    const item = document.createElement("li");
    item.textContent = message;
    log.appendChild(item);
  });

  renderCollection();
}

document
  .getElementById("exploreButton")
  .addEventListener("click", explore);

document
  .getElementById("shopButtons")
  .addEventListener("click", event => {
    const button = event.target.closest("[data-upgrade]");

    if (button) {
      buyUpgrade(button.dataset.upgrade);
    }
  });

document
  .getElementById("resetButton")
  .addEventListener("click", () => {
    if (window.confirm("冒険の記録をすべてリセットしますか？")) {
      localStorage.removeItem(SAVE_KEY);
      state = cloneDefault();
      saveState();
      render();
    }
  });

render();
