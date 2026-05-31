# Standalone Basic Cat Stage

This is a tiny independent Battle Cats-style stage runner. It does not use BCU, BCU packs, Java, or any original game assets.

Open [index.html](index.html) in a browser to play.

## Controls

- Click `Basic Cat` or press `1` to spawn a unit.
- Click `Worker` or press `W` to upgrade income and wallet size.
- Click `CAT Cannon` or press `C` when charged to damage and push enemies.
- Click `x1` or press `S` to toggle speed.
- Click `Restart` or press `R` to reset the stage.

## Replacing Art

Most visuals now live in [assets](assets). Replace those files with your own PNG, WebP, JPG, or SVG files.

Main art paths are configured at the top of [src/game.js](src/game.js) in the `ASSETS` object:

- `assets/background.svg`
- `assets/base-player.svg`
- `assets/base-enemy.svg`
- `assets/units/basic-cat-*.svg`
- `assets/enemies/basic-enemy-*.svg`
- `assets/enemies/boss-enemy-*.svg`

The loader also checks same-name alternatives. For example, if the config says `assets/units/basic-cat-walk-0.svg`, you can add `assets/units/basic-cat-walk-0.png` and it will be accepted.

For future animation, each character has frame lists:

```js
animations: {
  idle: ["assets/units/basic-cat-idle-0.svg", "..."],
  walk: ["assets/units/basic-cat-walk-0.svg", "..."],
  attack: ["assets/units/basic-cat-attack-0.svg"]
}
```

Add more files to a list to add more frames. Adjust `frameRate`, `size`, and `anchorY` in the same asset config if your art is larger or has different feet placement.

## What It Implements

- Player base and enemy base health
- Money generation and worker upgrades
- Player unit spawning
- Unit-card cooldown overlays
- Cat cannon charging and firing
- BCU-style enemy spawn rows
- Enemy cap, attack range, attack cooldowns, HP, and base damage
- Win and lose states

The stage data lives near the top of [src/game.js](src/game.js):

```js
const stage = {
  length: 3000,
  playerBaseHp: 6000,
  enemyBaseHp: 30000,
  maxEnemies: 8,
  spawns: [...]
};
```

The spawn rows are based on the BCU stage concept:

- `enemyId`
- `amount`
- `startFrame`
- `respawnMinFrame`
- `respawnMaxFrame`
- `basePercent`
- `boss`
- `hpMultiplier`
- `atkMultiplier`

This is meant as a clean starting point for your own game engine, not a BCU export.
