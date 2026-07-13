Clone and port the TowerDefenseVS project to a pure QHTML7 implementation.

Repositories:

```bash
git clone https://github.com/mikeNickaloff/TowerDefenseVS.git
git clone https://github.com/qhtml/qhtml7.git
````

Create a new `qhtml7-port` branch in TowerDefenseVS. Read `qhtml7.txt`, the QHTML7 examples, and the current QHTML7 runtime implementation before writing code. Do not invent QHTML syntax or APIs that are not supported by the repository.

## Objective

Replace the Qt Quick/QML and C++ implementation with a pure QHTML7 version while preserving the existing game structure, behavior, assets, algorithms, and appearance as closely as practical.

The final runtime must not depend on:

* Qt Quick
* Qt QML
* `QQmlApplicationEngine`
* `qmlRegisterType`
* The original C++ gameplay classes
* The old C++-backend/QML-frontend split

Use QHTML7 components for both model behavior and visual rendering.

## Remove the existing backend/frontend split

The existing project represents many game objects twice:

1. A C++ `QObject` such as `Enemy`, `Entity`, `Gun`, `Square`, or `Tile` stores state and emits signals.
2. A corresponding QML object is dynamically created and stores a `backend` reference to the C++ object.
3. `BackendLogic.js` listens for C++ signals, creates QML objects, copies properties, and connects additional signals.

Remove this duplication.

Each game concept should become one QHTML7 `q-component` containing:

* Its `q-property` state
* Its `q-signal` events
* Its functions and behavior
* Its timers or workers
* Its rendered HTML children, when it has a visual representation
* Its animation declarations
* References to related component instances

For example:

```text
Enemy C++ + Entity C++ + EntityTemplate.qml + Enemy.qml
    becomes
enemy.qhtml containing the enemy state, movement behavior,
signals, animations, and rendered enemy image.
```

Similarly:

```text
Gun C++ + Gun.qml
    becomes
gun.qhtml

Square C++ + TileTemplate.qml + Square.qml
    becomes
square.qhtml

Board C++ + main.qml board logic
    becomes
board.qhtml and supporting QHTML components
```

Do not preserve a `backend` property that points to a separate mirror object unless a genuine QHTML7 runtime limitation requires it.

## Preserve the QML file structure

Convert each `.qml` file into a corresponding `.qhtml` file with approximately the same component hierarchy and responsibility:

```text
main.qml                         -> main.qhtml
Square.qml                       -> square.qhtml
Wall.qml                         -> wall.qhtml
Entrance.qml                     -> entrance.qhtml
Exit.qml                         -> exit.qhtml
Enemy.qml                        -> enemy.qhtml
EntityTemplate.qml               -> entity.qhtml or merged into enemy.qhtml
Gun.qml                          -> gun.qhtml
ParticleTankMuzzleBlast.qml      -> particle-tank-muzzle-blast.qhtml
ParticleMachineGun.qml           -> particle-machine-gun.qhtml
FlameBlast.qml                   -> flame-blast.qhtml
ParticleFireball.qml             -> particle-fireball.qhtml
```

Preserve image and particle assets. Replace `qrc:///` URLs with correct browser-relative asset URLs.

## Convert the C++ classes using these mappings

Use the following direct translations:

```text
QObject subclass
    -> q-component

Q_PROPERTY
    -> q-property

Qt signal
    -> q-signal

Qt slot / Q_INVOKABLE / public method
    -> QHTML component function

QTimer and QTimer::singleShot
    -> q-timer

QThread / PathThread
    -> q-worker

QHash
    -> JavaScript object or Map

QList
    -> JavaScript array

QPair
    -> array or object such as { row, column }

QPoint
    -> { x, y }

QRect
    -> geometry helper functions using x, y, width, and height

QDateTime::currentMSecsSinceEpoch
    -> performance.now() or Date.now()

qRound
    -> Math.round

qAbs
    -> Math.abs

qAtan2
    -> Math.atan2

QObject pointers
    -> direct QHTML component-instance references or stable component UUIDs

new SomeClass(...)
    -> QHTMLComponentDefinition and QHTMLComponentInstance

delete / deleteLater
    -> remove or destroy the component instance and clean its registries

Qt.createComponent/createObject
    -> QHTMLComponentDefinition and QHTMLComponentInstance

QML Behavior on property
    -> behavior on property { q-property-animation { ... } }

SequentialAnimation
    -> q-sequential-animation

ScriptAction
    -> q-script-action
```

Use the real QHTML7 C++ WASM APIs for dynamic construction:

* `QHTMLComponentDefinition`
* `QHTMLComponentInstance`
* `QHTMLDomTree`
* Assignment of component references into QHTML properties
* `.update()` or targeted DOM rendering where appropriate

Do not replace these APIs with an unrelated custom component framework.

## Component mapping

Port the original classes approximately as follows:

```text
Game            -> game.qhtml
Board           -> board.qhtml
Map             -> map.qhtml
Tile            -> tile.qhtml
Square          -> square.qhtml
Wall            -> wall.qhtml
Entrance        -> entrance.qhtml
Exit            -> exit.qhtml
Entity          -> entity.qhtml
Enemy           -> enemy.qhtml
Gun             -> gun.qhtml
Projectile      -> projectile.qhtml
Path            -> path.qhtml
AStarPath       -> astar-path.qhtml or pathfinder.qhtml
PathThread      -> path-worker.qhtml using q-worker
Player          -> player.qhtml
Team            -> team.qhtml
PropertySheet   -> property-sheet.qhtml
```

Headless model components do not need visible HTML children, but they must still be proper QHTML component instances.

## Registries and references

Preserve the original registries using JavaScript-native values stored in QHTML properties:

```qhtml
q-property entities: {}
q-property tiles: {}
q-property paths: {}
q-property inRangeCache: {}
```

Use arrays, objects, `Map`, or `Set` according to the access pattern.

Component instances may be:

* Stored directly in arrays or objects
* Passed as function arguments
* Passed through QHTML signals
* Assigned to QHTML properties
* Located by UUID or component type

Do not serialize component references unnecessarily.

Where the original code uses `qobject_cast`, use the actual QHTML7 component-definition identity or runtime type mechanism. Do not guess based only on DOM tag names if QHTML7 exposes typed component information.

## Pathfinding worker

Port `PathThread` and the existing A* logic to `q-worker`.

The worker should:

1. Receive the grid state, entrances, exits, and requested placement.
2. Calculate paths without blocking the primary QHTML execution context.
3. Return path coordinate arrays and whether the proposed placement blocks all paths.
4. Apply the result only if it still matches the current board revision.

Follow QHTML7’s documented worker semantics. Do not assume DOM nodes are directly available inside the worker unless QHTML7 explicitly supports that.

## Animations

Preserve the original QML animation behavior:

* Enemy x/y movement
* Gun rotation
* Opacity transitions
* Board rotation and translation
* Projectile movement
* Particle lifetimes
* Sequential projectile effects
* Completion callbacks

Use:

* `q-property-animation`
* `behavior on <property>`
* `q-sequential-animation`
* `q-parallel-animation` where supported
* `q-script-action`
* Animation completion signals

Keep game-state effects separate from purely visual effects where possible. Projectile damage should not silently fail merely because a visual element was removed.

## Port strategy

Work in vertical slices:

1. Load QHTML7 and render `main.qhtml`.
2. Port `Game`, `Board`, `Map`, and tile components.
3. Render the 50×50 board.
4. Add tile selection.
5. Add gun placement.
6. Add A* placement validation using `q-worker`.
7. Add enemy creation and path movement.
8. Add gun targeting, rotation, and firing.
9. Add projectiles, particles, damage, and enemy removal.
10. Add money, levels, waves, gun store, and upgrade store.
11. Verify all original assets and effects.
12. Remove obsolete Qt/QML build dependencies only after parity is reached.

Preserve the original code as reference until the QHTML7 replacement works.

## Constraints

* Use pure QHTML7 for gameplay objects and UI.
* Do not introduce React, Vue, QML, or another component framework.
* Do not rewrite working algorithms unless necessary for QHTML7 compatibility.
* Do not hard-code repeated object creation logic; create reusable component factories or component functions.
* Do not create a second JavaScript model that mirrors QHTML component state.
* Avoid unsupported defensive JavaScript transformations inside QHTML functions. Where compound expressions cause QHTML parser problems, use explicit nested `if` statements.
* Preserve the existing names and relationships when doing so improves traceability.
* Keep functions localized to the component that owns the behavior.
* Fix QHTML7 runtime deficiencies only when required, and keep those changes minimal and reusable.

## Deliverables

Produce:

1. A runnable browser entry point.
2. All converted `.qhtml` files.
3. Any required QHTML7 loader/bootstrap changes.
4. The existing image and particle assets with corrected paths.
5. A mapping document listing every original C++ and QML file and its QHTML7 replacement.
6. A list of any QHTML7 runtime bugs or missing features encountered.
7. A functional test checklist covering:

   * Board generation
   * Tile selection
   * Gun placement
   * Blocked-path rejection
   * Enemy spawning
   * Enemy movement
   * Gun rotation and targeting
   * Projectile animation
   * Damage and enemy death
   * Money and upgrades
   * Waves and level progression

Do not stop after producing scaffolding. Implement a playable end-to-end port and verify the primary game loop in the browser.

```
