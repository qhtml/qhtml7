# QHTML7 Project Notes

## Architecture Constraints

- QHTML7 is a WebAssembly-based implementation of the QHTML language intended to replace traditional JavaScript implementations with a high-level language runtime.
- The parser and runtime structure should be implemented in WebAssembly.
- The persistent document/component structure must live in WebAssembly, using QHTML node objects that can be stored in and updated through the `QHTMLDomTree`.
- The JavaScript side should be limited to a bridge API for DOM/Web APIs, signals, events, JavaScript-style expression evaluation, inline expressions, and event handler callbacks that cannot practically run in WebAssembly.
- Do not expose Qt objects to JavaScript through EMBIND. Use unique `QHTMLNode*`-based objects for runtime objects that need to persist in the QHTML DOM tree.
- Do not add Qt modules to the WebAssembly project. The Qt WebAssembly project must remain limited to `QtCore`.
- Do not reuse code from the QHTML6 repository. It may be inspected and hosted locally only as a behavioral reference.
- Do not implement a JavaScript/V8 parser in WebAssembly unless full ES6 support can be achieved with only a few hundred KB of additional final WebAssembly size.

## Compatibility Goals

- Preserve backward compatibility with QHTML6 syntax and component behavior where possible.
- Use `test/demo.html` as the QHTML7 compatibility test area.
- Use `dist/q-components/` as the component set to validate.
- The QHTML6 repository at `../qhtml6` or `~/build/qhtml6` may be run locally for visual or behavioral comparison, but must not be modified.
- QHTML7-specific syntax may coexist with QHTML6-compatible syntax.

## Development Notes

- Prefer existing QHTML7 parser/runtime patterns before adding abstractions.
- New functionality should be implemented from scratch in the QtCore-only WebAssembly codebase or existing project JavaScript bridge, respecting the architecture boundary above.
- Local demos can be hosted with `httpserver` or `python -m http.server` from this repository, and optionally from the QHTML6 repository for comparison.
