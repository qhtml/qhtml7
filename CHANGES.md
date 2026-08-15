# Changes

## 7.4.6

- Added `QHTMLComponentDefinition.create(parent, properties)` for QHTML-native dynamic component instantiation into a target QHTML parent, followed by reference rebuilding and parent rerendering.
- Added `QHTMLNode.remove()` and `QHTMLNode.remove(child)` so named QHTML objects, `object().remove()`, and parent-owned child removal update `qhtmlChildren` instead of only mutating browser DOM.
- Exposed `.remove()` on live runtime helper objects such as timers, property animations, script actions, and animation groups.
- Added parser support for named ordinary DOM declarations such as `div wrapper1 { ... }`; these render as normal DOM elements while preserving the QHTML reference name and `.toQHTML()` output.
- Fixed slot-contained named references so script actions and other named objects declared inside slot default content can be reached from the component context.
- Updated declarative examples and JavaScript API documentation for dynamic creation and removal.

## 7.4.5

- Added reactive interpolation bindings for `${...}` in text/html fragments, attributes, CSS shortcut assignments, `q-style`, and inline `q-style` blocks inside `q-theme`.
- Added CSS-unit aware `q-property` runtime values, so arithmetic like `amount = amount + 10` preserves units such as `%`, `px`, `vh`, and `vw`.
- Simplified `q-property-animation` targeting with `target: object.property` while keeping the older `target` plus `property` form.
- Added `emitInterpolatedValues` for `q-property-animation`; it defaults to `false` to suppress per-frame target property-change handlers and emit the final target change at completion.
- Preserved unit-aware values during serialization by stringifying CSS runtime values as their CSS text.
- Updated README examples to show the corrected interpolation, style/theme, CSS-unit property, and property-animation patterns.
