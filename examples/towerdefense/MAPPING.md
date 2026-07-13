# TowerDefenseVS QHTML7 Port Mapping

This directory contains a pure QHTML7 port of `TowerDefenseVS`. The original Qt Quick/QML and C++ split has been collapsed into QHTML component definitions with `q-property`, `q-signal`, component functions, timers, and declarative rendering.

## Entry Points

| Original file | QHTML7 replacement |
| --- | --- |
| `main.cpp` | `index.html` loads QHTML7 directly; no Qt application bootstrap |
| `main.qml` | `main.qhtml`, `game.qhtml`, `board.qhtml` |
| `qml.qrc` | Browser-relative imports and copied files under `assets/` |
| `TowerDefenseVS.pro` | No QMake project is needed for this browser QHTML7 example |

## Common Model Classes

| Original file | QHTML7 replacement |
| --- | --- |
| `src_common/game.cpp`, `src_common/game.h` | `game.qhtml` |
| `src_common/map.cpp`, `src_common/map.h` | `map.qhtml`; runtime board generation is also mirrored in `board.qhtml` |
| `src_common/player.cpp`, `src_common/player.h` | `player.qhtml` |
| `src_common/propertysheet.cpp`, `src_common/propertysheet.h` | `property-sheet.qhtml` |
| `src_common/team.cpp`, `src_common/team.h` | `team.qhtml` |
| `src_common/astarpath.cpp`, `src_common/astarpath.h` | `pathfinder.qhtml` |

## Game Classes

| Original file | QHTML7 replacement |
| --- | --- |
| `src_game/board.cpp`, `src_game/board.h` | `board.qhtml` |
| `src_game/tile.cpp`, `src_game/tile.h` | `tile.qhtml` |
| `src_game/square.cpp`, `src_game/square.h` | `square.qhtml`; board rendering uses `td-tile-cell` from `tile.qhtml` |
| `src_game/wall.cpp`, `src_game/wall.h` | `wall.qhtml` |
| `src_game/entrance.cpp`, `src_game/entrance.h` | `entrance.qhtml` |
| `src_game/exit.cpp`, `src_game/exit.h` | `exit.qhtml` |
| `src_game/entity.cpp`, `src_game/entity.h` | `entity.qhtml` |
| `src_game/enemy.cpp`, `src_game/enemy.h` | `enemy.qhtml` |
| `src_game/gun.cpp`, `src_game/gun.h` | `gun.qhtml` |
| `src_game/tower.cpp`, `src_game/tower.h` | `tower.qhtml` |
| `src_game/projectile.cpp`, `src_game/projectile.h` | `projectile.qhtml` |
| `src_game/path.cpp`, `src_game/path.h` | `path.qhtml` |
| `src_game/paththread.cpp`, `src_game/paththread.h` | `path-worker.qhtml` |
| `src_game/classes.h`, `src_game/header.h` | No direct runtime replacement; type roles are expressed by QHTML component definitions |

## QML Files

| Original file | QHTML7 replacement |
| --- | --- |
| `src_qml/src_game/TileTemplate.qml` | `tile.qhtml`, `square.qhtml`, `wall.qhtml`, `entrance.qhtml`, `exit.qhtml` |
| `src_qml/src_game/Square.qml` | `square.qhtml` |
| `src_qml/src_game/Wall.qml` | `wall.qhtml` |
| `src_qml/src_game/Entrance.qml` | `entrance.qhtml` |
| `src_qml/src_game/Exit.qml` | `exit.qhtml` |
| `src_qml/src_game/EntityTemplate.qml` | `entity.qhtml` |
| `src_qml/src_game/Enemy.qml` | `enemy.qhtml` |
| `src_qml/src_game/Gun.qml` | `gun.qhtml` |
| `src_qml/src_game/ParticleTankMuzzleBlast.qml` | `particle-tank-muzzle-blast.qhtml` |
| `src_qml/src_game/ParticleMachineGun.qml` | `particle-machine-gun.qhtml` |
| `src_qml/src_game/FlameBlast.qml` | `flame-blast.qhtml` |
| `src_qml/src_game/ParticleFireball.qml` | `particle-fireball.qhtml` |

## JavaScript Helper Files

| Original file | QHTML7 replacement |
| --- | --- |
| `src_qml/src_js/BackendLogic.js` | `board.qhtml` registries, functions, and signals |
| `src_qml/src_js/FrontEndLogic.js` | Declarative QHTML component rendering and event handlers |
| `src_qml/src_js/core/*.js` | `pathfinder.qhtml`, `path-worker.qhtml` |
| `src_qml/src_js/finders/*.js` | `pathfinder.qhtml`, `path-worker.qhtml` |

The port does not reuse the original QHTML6 or Qt Quick implementation code. The QML/JavaScript files were used only as behavior references.

## Assets

The original image assets were copied from `src_images/` to:

| Original path | QHTML7 path |
| --- | --- |
| `src_images/attackers/*` | `assets/attackers/*` |
| `src_images/guns/*` | `assets/guns/*` |
| `src_images/particles/*` | `assets/particles/*` |
| `src_images/projectiles/*` | `assets/projectiles/*` |
