# Functional Checklist

Use `examples/towerdefense/index.html` as the browser entry point.

- Board generation: 20 rows by 30 columns, 50px tiles, source-compatible border walls, entrances, exit, and interior wall pattern.
- Tile selection: buildable square tiles near placed guns can be selected.
- Gun placement: selecting a buildable tile opens the gun store and can place cannon, machine gun, or flame tower.
- Blocked-path rejection: a gun placement that closes all entry-to-exit paths should be rejected and leave the previous tile in place.
- Enemy spawning: enemies cycle through entrances and use type-based attacker assets.
- Enemy movement: enemies follow the calculated path toward the exit and update rotation/opacity during movement.
- Gun rotation and targeting: guns choose an enemy in range, rotate toward it, and obey reload timing.
- Projectile animation: projectiles render with the matching projectile asset and move toward the target point.
- Damage and enemy death: projectile impact applies direct and splash damage, removes defeated enemies, and awards defender money.
- Money and upgrades: placing or upgrading guns subtracts money; defeated enemies add money.
- Waves and level progression: level, wave size, and wave counters are represented in board/game state for further tuning.
