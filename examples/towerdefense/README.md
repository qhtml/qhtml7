# TowerDefenseVS QHTML7 Port

This example is a pure QHTML7 port of `TowerDefenseVS`.

## Files

- `index.html` loads the QHTML7 runtime and imports `main.qhtml`.
- `main.qhtml` imports the converted game components and creates `td-main`.
- `game.qhtml` owns the high-level game state and HUD.
- `board.qhtml` owns board registries, map generation, path validation, enemy spawning, targeting, projectiles, and upgrades.
- `assets/` contains copied attacker, gun, projectile, and particle images.
- `MAPPING.md`, `RUNTIME-NOTES.md`, and `CHECKLIST.md` document the port.

No QML, Qt Quick, original C++ gameplay classes, or QHTML6 runtime code are used by this example.
