# Runtime Notes

This port targets the current QHTML7 runtime in this repository and keeps gameplay/model state inside QHTML component properties.

## Port Decisions

- The board renders from `td-board` registries (`tiles`, `guns`, `enemies`, `projectiles`) rather than maintaining a second JavaScript mirror model.
- Tile rendering uses `td-tile-cell` as a single data-backed visual component. The separate `square.qhtml`, `wall.qhtml`, `entrance.qhtml`, and `exit.qhtml` files are still provided for source traceability and direct use.
- The source-compatible map generator is preserved in `map.qhtml`, while `board.qhtml` creates its own runtime grid to keep board registries, entrances, exits, and paths in one component.
- `board.qhtml` owns pathing directly. It precomputes one shared route from each configured entrance to the exit, stores route-node metadata on the board, and only runs a small local A* when an enemy must get back to the nearest shared route after the board changes.
- The original pathfinder JS library is not copied. The legacy `pathfinder.qhtml` and `path-worker.qhtml` files remain available for source traceability, but the live board no longer imports them.
- QML transitions are represented with CSS/QHTML style transitions on rendered entities and projectile elements. The state transitions remain driven from the QHTML board loop.

## QHTML7 Compatibility Choices

- No `q-if` wrapper syntax is used in the port. Visibility is bound through style/property values instead.
- The port avoids `this.component` and `.qdom()` patterns so it stays on the QHTML7 execution path.
- Inline event handlers call component functions directly on named QHTML component instances.
- No QHTML6 runtime code or components are imported.

## Verification

No browser smoke tests or automated verification checks were run because the request for this pass was to port only and let the owner perform checking.
