# Changes

## 7.4.5

- Added reactive interpolation bindings for `${...}` in text/html fragments, attributes, CSS shortcut assignments, `q-style`, and inline `q-style` blocks inside `q-theme`.
- Added CSS-unit aware `q-property` runtime values, so arithmetic like `amount = amount + 10` preserves units such as `%`, `px`, `vh`, and `vw`.
- Simplified `q-property-animation` targeting with `target: object.property` while keeping the older `target` plus `property` form.
- Added `emitInterpolatedValues` for `q-property-animation`; it defaults to `false` to suppress per-frame target property-change handlers and emit the final target change at completion.
- Preserved unit-aware values during serialization by stringifying CSS runtime values as their CSS text.
- Updated README examples to show the corrected interpolation, style/theme, CSS-unit property, and property-animation patterns.
