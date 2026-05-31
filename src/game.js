const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  money: document.querySelector("#money"),
  walletMax: document.querySelector("#walletMax"),
  worker: document.querySelector("#worker"),
  workerCost: document.querySelector("#workerCost"),
  catButton: document.querySelector("#catButton"),
  catCooldownOverlay: document.querySelector("#catCooldownOverlay"),
  catCooldownBar: document.querySelector("#catCooldownBar"),
  workerButton: document.querySelector("#workerButton"),
  cannonButton: document.querySelector("#cannonButton"),
  cannonFill: document.querySelector("#cannonFill"),
  speedButton: document.querySelector("#speedButton"),
  restartButton: document.querySelector("#restartButton"),
  message: document.querySelector("#message"),
};

const FPS = 30;
const WIDTH = 1280;
const HEIGHT = 720;
const GROUND_Y = 500;
const PLAYER_BASE_X = 1194;
const ENEMY_BASE_X = 86;

const ASSETS = {
  background: "assets/background.png",
  bases: {
    player: "assets/base-player.svg",
    enemy: "assets/base-enemy.svg",
  },
  units: {
    basicCat: {
      size: { width: 92, height: 92 },
      anchorY: 0.88,
      frameRate: 6,
      animations: {
        idle: ["assets/units/basic-cat-idle-0.svg", "assets/units/basic-cat-idle-1.svg"],
        walk: ["assets/units/basic-cat-walk-0.svg", "assets/units/basic-cat-walk-1.svg"],
        attack: ["assets/units/basic-cat-attack-0.svg"],
      },
    },
  },
  enemies: {
    basic: {
      size: { width: 86, height: 78 },
      anchorY: 0.9,
      frameRate: 5,
      animations: {
        idle: ["assets/enemies/basic-enemy-idle-0.svg", "assets/enemies/basic-enemy-idle-1.svg"],
        walk: ["assets/enemies/basic-enemy-idle-0.svg", "assets/enemies/basic-enemy-idle-1.svg"],
        attack: ["assets/enemies/basic-enemy-attack-0.svg"],
      },
    },
    boss: {
      size: { width: 128, height: 118 },
      anchorY: 0.9,
      frameRate: 4,
      animations: {
        idle: ["assets/enemies/boss-enemy-idle-0.svg", "assets/enemies/boss-enemy-idle-1.svg"],
        walk: ["assets/enemies/boss-enemy-idle-0.svg", "assets/enemies/boss-enemy-idle-1.svg"],
        attack: ["assets/enemies/boss-enemy-attack-0.svg"],
      },
    },
  },
};

const imageCache = new Map();
const ASSET_VERSION = "dev-3";

const stage = {
  name: "First Test Stage",
  length: 3000,
  playerBaseHp: 6000,
  enemyBaseHp: 30000,
  maxEnemies: 8,
  spawns: [
    {
      enemyId: 0,
      amount: 12,
      startFrame: 120,
      respawnMinFrame: 240,
      respawnMaxFrame: 300,
      basePercent: 100,
      boss: false,
      hpMultiplier: 100,
      atkMultiplier: 100,
    },
    {
      enemyId: 2,
      amount: 1,
      startFrame: 900,
      respawnMinFrame: 0,
      respawnMaxFrame: 0,
      basePercent: 100,
      boss: true,
      hpMultiplier: 150,
      atkMultiplier: 120,
    },
  ],
};

const enemyTypes = {
  0: {
    name: "Doge",
    hp: 180,
    atk: 28,
    range: 34,
    speed: 30,
    attackEvery: 0.75,
    radius: 24,
    color: "#f4e2a4",
    stroke: "#5f4b2e",
    asset: "basic",
  },
  2: {
    name: "Boss",
    hp: 1700,
    atk: 110,
    range: 52,
    speed: 18,
    attackEvery: 1.1,
    radius: 42,
    color: "#c7554d",
    stroke: "#5f2623",
    asset: "boss",
  },
};

const catType = {
  name: "Basic Cat",
  cost: 50,
  cooldown: 1.15,
  hp: 260,
  atk: 52,
  range: 46,
  speed: 46,
  attackEvery: 0.65,
  radius: 25,
  asset: "basicCat",
};

const state = {};
let lastTime = performance.now();
let rafId = 0;

function reset() {
  Object.assign(state, {
    status: "playing",
    time: 0,
    money: 165,
    workerLevel: 1,
    walletMax: 600,
    catCooldown: 0,
    cannonCharge: 0.9,
    cannonFlash: 0,
    speed: 1,
    playerBaseHp: stage.playerBaseHp,
    enemyBaseHp: stage.enemyBaseHp,
    cats: [],
    enemies: [],
    hitFlashes: [],
    banner: "",
    bannerTime: 0,
    spawnRows: stage.spawns.map((row) => ({
      ...row,
      spawned: 0,
      nextFrame: row.startFrame,
    })),
  });
  ui.message.hidden = true;
  updateHud();
}

function updateHud() {
  ui.money.textContent = Math.floor(state.money);
  ui.walletMax.textContent = state.walletMax;
  ui.worker.textContent = state.workerLevel;
  ui.workerCost.textContent = `$${workerCost()}`;
  ui.speedButton.textContent = `x${state.speed}`;

  const cooldownRatio = Math.max(0, Math.min(1, state.catCooldown / catType.cooldown));
  ui.catCooldownOverlay.style.transform = `translateY(${(1 - cooldownRatio) * 100}%)`;
  ui.catCooldownBar.style.transform = `scaleX(${1 - cooldownRatio})`;
  ui.catCooldownBar.hidden = cooldownRatio === 0;

  const cannonRatio = Math.max(0, Math.min(1, state.cannonCharge));
  ui.cannonFill.style.transform = `scaleX(${cannonRatio})`;
  ui.catButton.disabled = state.status !== "playing" || state.money < catType.cost || state.catCooldown > 0;
  ui.workerButton.disabled = state.status !== "playing" || state.money < workerCost() || state.workerLevel >= 8;
  ui.cannonButton.disabled = state.status !== "playing" || state.cannonCharge < 1;
}

function workerCost() {
  return 120 + (state.workerLevel - 1) * 75;
}

function summonCat() {
  if (state.status !== "playing" || state.money < catType.cost || state.catCooldown > 0) return;
  state.money -= catType.cost;
  state.catCooldown = catType.cooldown;
  state.cats.push(makeEntity("cat", catType, PLAYER_BASE_X - 76, -1));
  updateHud();
}

function upgradeWorker() {
  const cost = workerCost();
  if (state.status !== "playing" || state.money < cost || state.workerLevel >= 8) return;
  state.money -= cost;
  state.workerLevel += 1;
  state.walletMax += 250;
  updateHud();
}

function fireCannon() {
  if (state.status !== "playing" || state.cannonCharge < 1) return;
  state.cannonCharge = 0;
  state.cannonFlash = 0.32;

  for (const enemy of state.enemies) {
    enemy.hp -= 190 + state.workerLevel * 18;
    enemy.x = Math.max(ENEMY_BASE_X + 82, enemy.x - 56);
    state.hitFlashes.push({ x: enemy.x, y: enemy.y - enemy.radius, life: 0.22, big: true });
  }

  updateHud();
}

function toggleSpeed() {
  state.speed = state.speed === 1 ? 2 : 1;
  updateHud();
}

function makeEntity(side, type, x, dir, multipliers = {}) {
  const hpMult = (multipliers.hpMultiplier ?? 100) / 100;
  const atkMult = (multipliers.atkMultiplier ?? 100) / 100;
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${side}-${Math.random()}`,
    side,
    name: type.name,
    x,
    y: GROUND_Y,
    dir,
    hp: Math.round(type.hp * hpMult),
    maxHp: Math.round(type.hp * hpMult),
    atk: Math.round(type.atk * atkMult),
    range: type.range,
    speed: type.speed,
    attackEvery: type.attackEvery,
    attackTimer: Math.random() * 0.2,
    radius: type.radius,
    color: type.color,
    stroke: type.stroke,
    asset: type.asset,
    attacking: false,
    attackPose: 0,
  };
}

function spawnEnemies() {
  const frame = Math.floor(state.time * FPS);
  const activeEnemyCount = state.enemies.length;
  if (activeEnemyCount >= stage.maxEnemies) return;

  for (const row of state.spawnRows) {
    if (row.spawned >= row.amount) continue;
    if (frame < row.nextFrame) continue;
    if (state.enemies.length >= stage.maxEnemies) break;

    const type = enemyTypes[row.enemyId] || enemyTypes[0];
    state.enemies.push(
      makeEntity("enemy", type, ENEMY_BASE_X + 74, 1, {
        hpMultiplier: row.hpMultiplier,
        atkMultiplier: row.atkMultiplier,
      }),
    );
    row.spawned += 1;

    if (row.boss) {
      state.banner = "Boss Incoming";
      state.bannerTime = 2.1;
    }

    if (row.spawned < row.amount) {
      const min = row.respawnMinFrame || 1;
      const max = Math.max(min, row.respawnMaxFrame || min);
      row.nextFrame = frame + min + Math.floor(Math.random() * (max - min + 1));
    }
  }
}

function update(dt) {
  if (state.status !== "playing") return;

  dt *= state.speed;
  state.time += dt;
  state.money = Math.min(state.walletMax, state.money + (15 + state.workerLevel * 5.5) * dt);
  state.catCooldown = Math.max(0, state.catCooldown - dt);
  state.cannonCharge = Math.min(1, state.cannonCharge + 0.08 * dt);
  state.cannonFlash = Math.max(0, state.cannonFlash - dt);
  state.bannerTime = Math.max(0, state.bannerTime - dt);
  spawnEnemies();

  updateGroup(state.cats, state.enemies, dt);
  updateGroup(state.enemies, state.cats, dt);

  state.cats = state.cats.filter((entity) => entity.hp > 0 && entity.x > ENEMY_BASE_X - 120);
  state.enemies = state.enemies.filter((entity) => entity.hp > 0 && entity.x < PLAYER_BASE_X + 120);
  state.hitFlashes = state.hitFlashes.filter((flash) => (flash.life -= dt) > 0);

  if (state.enemyBaseHp <= 0) {
    endStage("Victory", "The enemy base fell.");
  } else if (state.playerBaseHp <= 0) {
    endStage("Defeat", "Your base was destroyed.");
  }

  updateHud();
}

function updateGroup(group, opponents, dt) {
  for (const entity of group) {
    entity.attacking = false;
    entity.attackPose = Math.max(0, entity.attackPose - dt * 5);
    const target = findTarget(entity, opponents);

    if (target) {
      entity.attackTimer -= dt;
      if (entity.attackTimer <= 0) {
        entity.attackTimer = entity.attackEvery;
        entity.attacking = true;
        entity.attackPose = 1;
        target.hp -= entity.atk;
        state.hitFlashes.push({ x: target.x, y: target.y - target.radius, life: 0.16 });
      }
    } else if (isBaseInRange(entity)) {
      entity.attackTimer -= dt;
      if (entity.attackTimer <= 0) {
        entity.attackTimer = entity.attackEvery;
        entity.attacking = true;
        entity.attackPose = 1;
        if (entity.side === "cat") state.enemyBaseHp -= entity.atk;
        else state.playerBaseHp -= entity.atk;
        state.hitFlashes.push({
          x: entity.side === "cat" ? ENEMY_BASE_X : PLAYER_BASE_X,
          y: GROUND_Y - 160,
          life: 0.16,
        });
      }
    } else {
      entity.attackTimer = Math.min(entity.attackTimer, entity.attackEvery * 0.45);
      entity.x += entity.dir * entity.speed * dt;
    }
  }
}

function findTarget(entity, opponents) {
  let best = null;
  let bestDistance = Infinity;
  for (const other of opponents) {
    const dx = (other.x - entity.x) * entity.dir;
    const distance = Math.abs(other.x - entity.x) - other.radius;
    if (dx >= -8 && distance <= entity.range && distance < bestDistance) {
      best = other;
      bestDistance = distance;
    }
  }
  return best;
}

function isBaseInRange(entity) {
  if (entity.side === "cat") return entity.x - ENEMY_BASE_X <= entity.range + 56;
  return PLAYER_BASE_X - entity.x <= entity.range + 56;
}

function endStage(title, detail) {
  state.status = "ended";
  ui.message.innerHTML = `<div><strong>${title}</strong><span>${detail}</span></div>`;
  ui.message.hidden = false;
  updateHud();
}

function getImage(path) {
  const candidates = getAssetCandidates(path);
  if (!imageCache.has(path)) {
    const image = new Image();
    const cacheSuffix = window.location.protocol === "file:" ? "" : `?v=${ASSET_VERSION}`;
    const entry = {
      image,
      index: 0,
      loaded: false,
      failed: false,
    };
    image.onload = () => {
      entry.loaded = true;
    };
    image.onerror = () => {
      entry.index += 1;
      if (entry.index >= candidates.length) {
        entry.failed = true;
        return;
      }
      image.src = `${candidates[entry.index]}${cacheSuffix}`;
    };
    image.src = `${candidates[0]}${cacheSuffix}`;
    imageCache.set(path, entry);
  }
  const entry = imageCache.get(path);
  return entry.loaded && entry.image.complete && entry.image.naturalWidth > 0 ? entry.image : null;
}

function getAssetCandidates(path) {
  const match = path.match(/^(.*)\.(svg|png|webp|jpg|jpeg)$/i);
  if (!match) return [path];

  const stem = match[1];
  const ext = match[2].toLowerCase();
  const order = [ext, "png", "webp", "jpg", "jpeg", "svg"];
  return [...new Set(order)].map((candidateExt) => `${stem}.${candidateExt}`);
}

function getAnimationFrame(assetDef, stateName, time) {
  if (!assetDef) return null;
  const frames = assetDef.animations[stateName] || assetDef.animations.idle;
  if (!frames || frames.length === 0) return null;
  const index = Math.floor(time * (assetDef.frameRate || 6)) % frames.length;
  return getImage(frames[index]);
}

function drawAssetCentered(image, x, y, width, height, anchorY = 1, flip = false) {
  if (!image) return false;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.drawImage(image, -width / 2, -height * anchorY, width, height);
  ctx.restore();
  return true;
}

function draw() {
  drawSky();
  drawLaneMarks();
  drawCannonBeam();
  drawBases();
  drawEntities();
  drawEffects();
  drawBaseBars();
  drawBanner();
}

function drawSky() {
  const background = getImage(ASSETS.background);
  if (background) {
    ctx.drawImage(background, 0, 0, WIDTH, HEIGHT);
    return;
  }

  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#68c9ed");
  sky.addColorStop(0.62, "#d8f4f7");
  sky.addColorStop(0.62, "#8cc85e");
  sky.addColorStop(1, "#538d3d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  drawCloud(172, 132, 1.05);
  drawCloud(650, 102, 0.78);
  drawCloud(1014, 150, 0.95);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(i * 190 - ((state.time * 22) % 190), GROUND_Y + 4, 86, 7);
  }

  ctx.fillStyle = "#2e6e32";
  ctx.fillRect(0, GROUND_Y + 40, WIDTH, 17);
  ctx.fillStyle = "#6a4a2e";
  ctx.fillRect(0, GROUND_Y + 57, WIDTH, HEIGHT - GROUND_Y - 57);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(0, HEIGHT - 142, WIDTH, 8);
}

function drawCloud(x, y, scale) {
  ctx.beginPath();
  ctx.arc(x, y, 34 * scale, 0, Math.PI * 2);
  ctx.arc(x + 36 * scale, y - 16 * scale, 42 * scale, 0, Math.PI * 2);
  ctx.arc(x + 78 * scale, y, 32 * scale, 0, Math.PI * 2);
  ctx.arc(x + 38 * scale, y + 16 * scale, 48 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawBases() {
  drawBase(PLAYER_BASE_X, GROUND_Y, "player");
  drawBase(ENEMY_BASE_X, GROUND_Y, "enemy");
}

function drawLaneMarks() {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 22]);
  ctx.beginPath();
  ctx.moveTo(154, GROUND_Y + 18);
  ctx.lineTo(1126, GROUND_Y + 18);
  ctx.stroke();
  ctx.restore();
}

function drawCannonBeam() {
  if (state.cannonFlash <= 0) return;
  const alpha = Math.min(1, state.cannonFlash / 0.32);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(120, 225, 255, 0.44)";
  ctx.beginPath();
  ctx.moveTo(PLAYER_BASE_X - 36, GROUND_Y - 142);
  ctx.lineTo(116, GROUND_Y - 210);
  ctx.lineTo(108, GROUND_Y - 162);
  ctx.lineTo(PLAYER_BASE_X - 50, GROUND_Y - 100);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#fff7a6";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(PLAYER_BASE_X - 44, GROUND_Y - 122);
  ctx.lineTo(110, GROUND_Y - 185);
  ctx.stroke();
  ctx.restore();
}

function drawBase(x, y, side) {
  const baseImage = getImage(ASSETS.bases[side]);
  if (baseImage) {
    const width = side === "player" ? 190 : 178;
    const height = side === "player" ? 222 : 220;
    drawAssetCentered(baseImage, x, y + 2, width, height, 1, side === "player");
    return;
  }

  const flip = side === "player" ? -1 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip, 1);

  ctx.fillStyle = side === "player" ? "#fffbe7" : "#4c515e";
  ctx.strokeStyle = "#070707";
  ctx.lineWidth = 6;
  roundRect(-48, -142, 96, 142, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = side === "player" ? "#d7edf3" : "#a4514a";
  roundRect(-34, -100, 68, 44, 7);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = side === "player" ? "#fffbe7" : "#717784";
  ctx.beginPath();
  ctx.moveTo(-60, -142);
  ctx.lineTo(0, -198);
  ctx.lineTo(60, -142);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (side === "player") {
    ctx.save();
    ctx.translate(36, -140);
    ctx.rotate(-0.18 + state.cannonFlash * 0.55);
    ctx.fillStyle = "#353d43";
    ctx.strokeStyle = "#070707";
    roundRect(-8, -12, 70, 24, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#070707";
    ctx.beginPath();
    ctx.arc(-16, -114, 5, 0, Math.PI * 2);
    ctx.arc(16, -114, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#16202a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -100, 15, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEntities() {
  for (const enemy of state.enemies) drawEnemy(enemy);
  for (const cat of state.cats) drawCat(cat);
}

function drawCat(entity) {
  const assetDef = ASSETS.units[entity.asset];
  const anim = entity.attackPose > 0 ? "attack" : "walk";
  const frame = getAnimationFrame(assetDef, anim, state.time + entity.x * 0.003);
  if (frame) {
    const bob = Math.sin(state.time * 10 + entity.x * 0.03) * 3;
    drawAssetCentered(
      frame,
      entity.x + entity.attackPose * entity.dir * 8,
      entity.y + bob,
      assetDef.size.width,
      assetDef.size.height,
      assetDef.anchorY,
      entity.dir < 0,
    );
    drawHpBar(entity, -28 + entity.x, entity.y - entity.radius - 52, 56);
    return;
  }

  const bob = Math.sin(state.time * 10 + entity.x * 0.03) * 3;
  const lean = entity.attackPose * entity.dir * 8;
  ctx.save();
  ctx.translate(entity.x + lean, entity.y + bob);
  ctx.scale(entity.dir < 0 ? -1 : 1, 1);

  ctx.fillStyle = "#fffdf2";
  ctx.strokeStyle = "#070707";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, -entity.radius, entity.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-17, -entity.radius - 17);
  ctx.lineTo(-8, -entity.radius - 37);
  ctx.lineTo(4, -entity.radius - 17);
  ctx.moveTo(17, -entity.radius - 17);
  ctx.lineTo(8, -entity.radius - 37);
  ctx.lineTo(-4, -entity.radius - 17);
  ctx.stroke();

  ctx.fillStyle = "#070707";
  ctx.beginPath();
  ctx.arc(-9, -entity.radius - 3, 3, 0, Math.PI * 2);
  ctx.arc(9, -entity.radius - 3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -entity.radius + 8, 9, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  drawHpBar(entity, -28, -entity.radius - 52, 56);
  ctx.restore();
}

function drawEnemy(entity) {
  const assetDef = ASSETS.enemies[entity.asset];
  const anim = entity.attackPose > 0 ? "attack" : "walk";
  const frame = getAnimationFrame(assetDef, anim, state.time + entity.x * 0.002);
  if (frame) {
    const bob = Math.sin(state.time * 8 + entity.x * 0.04) * 2.5;
    drawAssetCentered(
      frame,
      entity.x + entity.attackPose * entity.dir * 9,
      entity.y + bob,
      assetDef.size.width,
      assetDef.size.height,
      assetDef.anchorY,
      entity.dir < 0,
    );
    drawHpBar(entity, -32 + entity.x, entity.y - entity.radius - 52, 64);
    return;
  }

  const bob = Math.sin(state.time * 8 + entity.x * 0.04) * 2.5;
  const lean = entity.attackPose * entity.dir * 9;
  ctx.save();
  ctx.translate(entity.x + lean, entity.y + bob);
  ctx.scale(entity.dir < 0 ? -1 : 1, 1);

  ctx.fillStyle = entity.color;
  ctx.strokeStyle = entity.stroke;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(0, -entity.radius, entity.radius * 1.05, entity.radius * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = entity.stroke;
  ctx.beginPath();
  ctx.arc(-10, -entity.radius - 4, 4, 0, Math.PI * 2);
  ctx.arc(10, -entity.radius - 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-10, -entity.radius + 12);
  ctx.quadraticCurveTo(0, -entity.radius + 4, 12, -entity.radius + 12);
  ctx.stroke();
  drawHpBar(entity, -32, -entity.radius - 52, 64);
  ctx.restore();
}

function drawHpBar(entity, x, y, width) {
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  roundRect(x, y, width, 7, 3);
  ctx.fill();
  ctx.fillStyle = entity.side === "cat" ? "#2f8f83" : "#b7443e";
  roundRect(x, y, width * Math.max(0, entity.hp / entity.maxHp), 7, 3);
  ctx.fill();
}

function drawEffects() {
  for (const flash of state.hitFlashes) {
    const maxLife = flash.big ? 0.22 : 0.16;
    const alpha = Math.max(0, flash.life / maxLife);
    const size = flash.big ? 26 : 14;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#fff5b5";
    ctx.lineWidth = flash.big ? 8 : 5;
    ctx.beginPath();
    ctx.moveTo(flash.x - size, flash.y - size);
    ctx.lineTo(flash.x + size, flash.y + size);
    ctx.moveTo(flash.x + size, flash.y - size);
    ctx.lineTo(flash.x - size, flash.y + size);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBaseBars() {
  drawBaseBar(990, 108, 250, state.playerBaseHp, stage.playerBaseHp, "#e6f26a", "Cat Base");
  drawBaseBar(30, 110, 250, state.enemyBaseHp, stage.enemyBaseHp, "#f2493d", "Enemy Base");
}

function drawBaseBar(x, y, width, hp, maxHp, color, label) {
  ctx.fillStyle = "#121212";
  roundRect(x, y, width, 35, 4);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#5b5b5b";
  roundRect(x + 9, y + 18, width - 18, 8, 4);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(x + 9, y + 18, (width - 18) * Math.max(0, hp / maxHp), 8, 4);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = "900 13px Arial Black, system-ui, sans-serif";
  ctx.fillText(`${label}: ${Math.max(0, Math.ceil(hp))}`, x + 10, y + 13);
}

function drawBanner() {
  if (state.bannerTime <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, state.bannerTime);
  ctx.fillStyle = "#111";
  roundRect(420, 150, 440, 72, 6);
  ctx.fill();
  ctx.strokeStyle = "#f2c63f";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#f2c63f";
  ctx.font = "900 38px Arial Black, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(state.banner, WIDTH / 2, 197);
  ctx.restore();
}

function roundRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  rafId = requestAnimationFrame(loop);
}

ui.catButton.addEventListener("click", summonCat);
ui.workerButton.addEventListener("click", upgradeWorker);
ui.cannonButton.addEventListener("click", fireCannon);
ui.speedButton.addEventListener("click", toggleSpeed);
ui.restartButton.addEventListener("click", reset);

window.addEventListener("keydown", (event) => {
  if (event.key === "1") summonCat();
  if (event.key.toLowerCase() === "w") upgradeWorker();
  if (event.key.toLowerCase() === "c") fireCannon();
  if (event.key.toLowerCase() === "s") toggleSpeed();
  if (event.key.toLowerCase() === "r") reset();
});

reset();
cancelAnimationFrame(rafId);
rafId = requestAnimationFrame((now) => {
  lastTime = now;
  loop(now);
});
