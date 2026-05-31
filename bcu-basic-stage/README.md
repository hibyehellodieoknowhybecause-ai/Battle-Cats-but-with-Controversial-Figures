# Basic BCU Stage Generator

This folder makes one tiny editable BCU pack with one map and one stage.

It follows the same writer path BCU uses:

- `Pack.write()`
- `MapColc.write()`
- `Stage.write()`
- `SCDef.write()`
- `OutStreamDef.flush()`

The generated pack relies on BCU's default pack, so it uses default enemies and assets instead of custom sprites.

## Generate

```sh
python3 generate_basic_bcu_stage.py
```

That creates:

```text
output/res/enemy/123456.bcuenemy
```

## Install In BCU

Generate the file into your BCU folder's editable pack directory:

```sh
python3 generate_basic_bcu_stage.py --output "/path/to/your/BCU/res/enemy"
```

Then restart BCU. The pack should appear as `Codex Basic Stage Pack`, with:

- Map: `Codex Test Map`
- Stage: `First Test Stage`

## Stage Contents

The stage is intentionally simple:

- Enemy base health: `30000`
- Stage length: `3000`
- Max enemies on field: `8`
- Spawns default enemy `0` twelve times
- Spawns default enemy `2` once as a boss

To tweak it, edit `stage_spawn_data()` in `generate_basic_bcu_stage.py`.
