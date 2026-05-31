#!/usr/bin/env python3
"""
Generate a tiny editable BCU custom pack containing one basic stage.

This mirrors the BCU writer path from:
- common.io.OutStreamDef
- common.util.pack.Pack.write()
- common.util.stage.MapColc.write()
- common.util.stage.Stage.write()
- common.util.stage.SCDef.write()
"""

from __future__ import annotations

import argparse
import struct
from pathlib import Path


PACK_ID = 123456
PACK_NAME = "Codex Basic Stage Pack"
MAP_NAME = "Codex Test Map"
STAGE_NAME = "First Test Stage"


class BCUStream:
    """Small Python port of BCU's OutStreamDef binary writer."""

    def __init__(self) -> None:
        self.data = bytearray()

    def accept(self, other: "BCUStream") -> None:
        payload = bytes(other.data)
        if not payload:
            raise ValueError("BCU substream cannot be empty")
        self.write_int(len(payload))
        self.data.extend(payload)

    def write_byte(self, value: int) -> None:
        self.data.append(value & 0xFF)

    def write_int(self, value: int) -> None:
        self.data.extend(struct.pack("<i", value))

    def write_long(self, value: int) -> None:
        self.data.extend(struct.pack("<q", value))

    def write_string(self, value: str) -> None:
        raw = value.encode("utf-8")
        if len(raw) > 255:
            raise ValueError(f"BCU short string is too long: {value!r}")
        self.write_byte(len(raw))
        self.data.extend(raw)

    def write_int_b(self, values: list[int]) -> None:
        if len(values) > 255:
            raise ValueError("BCU byte-sized int array cannot exceed 255 entries")
        self.write_byte(len(values))
        for value in values:
            self.write_int(value)

    def to_file_bytes(self) -> bytes:
        return struct.pack("<i", len(self.data)) + bytes(self.data)


def empty_enemy_store() -> BCUStream:
    # EnemyStore.write(): version, enemy count, random-enemy count.
    out = BCUStream()
    out.write_string("0.4.2")
    out.write_int(0)
    out.write_int(0)
    return out


def empty_castle_store() -> BCUStream:
    # CasStore.write(): version, custom castle count.
    out = BCUStream()
    out.write_string("0.3.7")
    out.write_int(0)
    return out


def empty_background_store() -> BCUStream:
    # BGStore.write(): version, custom background count.
    out = BCUStream()
    out.write_string("0.4.0")
    out.write_int(0)
    return out


def empty_unit_store() -> BCUStream:
    # UnitStore.write(): version, level count, unit count, reserved fields.
    out = BCUStream()
    out.write_string("0.4.1")
    out.write_int(0)
    out.write_int(0)
    out.write_int(0)
    out.write_int(0)
    return out


def limit() -> BCUStream:
    # Limit.write() with no restrictions.
    out = BCUStream()
    out.write_string("0.3.8")
    out.write_string("")
    out.write_int(-1)  # sid: all stages
    out.write_int(-1)  # star: all stars
    out.write_int(0)  # rare mask
    out.write_byte(0)  # deploy count limit
    out.write_byte(0)  # lineup row limit
    out.write_int(0)  # min cost
    out.write_int(0)  # max cost
    out.write_int(-1)  # chara group
    out.write_int(-1)  # level restrict
    return out


def stage_enemy_line(
    *,
    enemy_id: int,
    amount: int,
    start_frame: int,
    respawn_min: int,
    respawn_max: int,
    base_percent: int = 100,
    layer_min: int = 0,
    layer_max: int = 0,
    boss: bool = False,
    hp_multiplier: int = 100,
    atk_multiplier: int = 100,
) -> list[int]:
    # SCDef indexes:
    # E, N, S0, R0, R1, C0, L0, L1, B, M, S1, C1, G, M1
    return [
        enemy_id,
        amount,
        start_frame,
        respawn_min,
        respawn_max,
        base_percent,
        layer_min,
        layer_max,
        1 if boss else 0,
        hp_multiplier,
        start_frame,
        base_percent,
        0,
        atk_multiplier,
    ]


def stage_spawn_data() -> BCUStream:
    out = BCUStream()
    out.write_int(0)
    out.write_string("0.4.2")

    enemies = [
        stage_enemy_line(
            enemy_id=0,
            amount=12,
            start_frame=120,
            respawn_min=240,
            respawn_max=300,
        ),
        stage_enemy_line(
            enemy_id=2,
            amount=1,
            start_frame=900,
            respawn_min=0,
            respawn_max=0,
            boss=True,
            hp_multiplier=150,
            atk_multiplier=120,
        ),
    ]

    out.write_int(len(enemies))
    out.write_int(14)
    for line in enemies:
        for value in line:
            out.write_int(value)

    out.write_int(0)  # default summon group
    out.write_int(0)  # enemy summon-map entries
    out.write_int(0)  # summon groups
    return out


def stage() -> BCUStream:
    out = BCUStream()
    out.write_string("0.4.9")
    out.write_string(STAGE_NAME)
    out.write_int(0)  # default background
    out.write_int(0)  # default castle
    out.write_int(30000)  # enemy base health
    out.write_int(3000)  # stage length
    out.write_int(-1)  # intro music
    out.write_int(0)  # music switch health percent
    out.write_int(-1)  # main music
    out.write_long(0)  # music loop start
    out.write_long(0)  # music loop end
    out.write_byte(8)  # max enemy count on field
    out.write_byte(0)  # continues allowed
    out.accept(stage_spawn_data())
    out.data.extend(limit().data)
    out.write_int(0)  # replay count
    return out


def map_collection() -> BCUStream:
    out = BCUStream()
    out.write_string("0.3.8")
    out.write_string(PACK_NAME)
    out.write_int(0)  # chara groups
    out.write_int(0)  # level restrictions
    out.write_int(1)  # stage maps

    out.write_string(MAP_NAME)
    out.write_int_b([100])
    out.write_int(1)  # stages in this map
    out.accept(stage())
    out.write_int(0)  # map-level restrictions
    return out


def pack() -> BCUStream:
    out = BCUStream()
    out.write_string("0.4.1")
    out.write_int(PACK_ID)
    out.write_byte(1)
    out.write_int(0)  # rely on default pack so default enemies/backgrounds work
    out.write_string(PACK_NAME)
    out.accept(empty_enemy_store())
    out.accept(empty_castle_store())
    out.accept(empty_background_store())
    out.accept(empty_unit_store())
    out.data.extend(map_collection().data)
    return out


def bcu_hex(pack_id: int) -> str:
    return f"{pack_id // 1000:03d}{pack_id % 1000:03d}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("output/res/enemy"),
        help="Folder to write the .bcuenemy file into.",
    )
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    path = args.output / f"{bcu_hex(PACK_ID)}.bcuenemy"
    path.write_bytes(pack().to_file_bytes())
    print(path)


if __name__ == "__main__":
    main()
