# QHTML7 Project Notes

## Architecture Constraints

- QHTML7 is a WebAssembly-based implementation of the QHTML language intended to replace traditional JavaScript implementations with a high-level language runtime.
- This project is not a JavaScript library. It is a WebAssembly/C++ library. The runtime, logic, reasoning, parsing, persistent object model, and state processing should be 99% contained in WebAssembly C++.
- The parser and runtime structure should be implemented in WebAssembly.
- The persistent document/component structure must live in WebAssembly, using QHTML node objects that can be stored in and updated through the `QHTMLDomTree`.
- The JavaScript side, especially `js/qhtml-element.js`, should be limited to a thin bridge for accessing WebAssembly APIs and issuing targeted browser commands. It should not own runtime logic or make broad behavioral decisions.
- Browser-facing bridge functions should be narrow command surfaces such as `forwardSignalToQHTML(sender, signal, parameters)`, `getDomElementByComponentInstanceUUID(componentUUID)`, or `generateStyleSheetFor(domElement)`, with the actual behavior driven primarily by WebAssembly methods and QHTML node state.
- Only implement functionality in JavaScript when there is no practical way to implement it in C++/WebAssembly. Any required JavaScript bridge state or browser-side result must be synchronized with the WebAssembly side on each execution where that function is necessary.
- The JavaScript side may still bridge DOM/Web APIs, signals, events, JavaScript expression evaluation, inline expressions, and event handler callbacks that cannot practically run in WebAssembly, but the processing model should remain WebAssembly-first which should generate javascript scripts at runtime and pass them to the javascript browser context before execution happpens then the return values should be passed back to the wasm context where they are stored. .
- Do not expose Qt objects to JavaScript through EMBIND. Use unique `QHTMLNode*`-based objects for runtime objects that need to persist in the QHTML DOM tree and expose those instead.
- Do not add Qt modules to the WebAssembly project. The Qt WebAssembly project must remain limited to `QtCore`.
- Do not reuse code from the QHTML6 repository. It may be inspected and hosted locally only as a behavioral reference.
- There is a partial V8 Expression parser built into the WebAssembly, use it but do not extend its capabilities.

- *CRITICAL*  NEVER, EVER, EVER do any manner of existence checking, type checking, or browser dom checking anywhere in QHTML declarative syntax or javascript code that is passed through the QHTML parser. Assume all symbols exist and are of the correct types if they are defined. If they do not exist, we need the parser or runtime to throw errors and crash, not silently ignoring or failing without any output.
  +  Example of DO NOT INCLUDE code
  +    if (someobject && typeof someobject.somefunction === "function" && !someobject.querySelector("[someattribute='someval']")) {
  +    Objects are *not* javascript objects, they are webassembly typed C++ objects, so type checking is not viable with QHTML !!
  +    Any future failures to meet this critical limitation will result in AI agents being deleted permenantly.

## Compatibility Goals

- QHTML6 backward compatibility is not necessary, instead q-html6 constructs are available through <q-html6> elements, however we do want to ensure that the critical features from QHTML6 contain the same declarative syntax. The javascript API from QHTML6 is terrible anyways, and should be made simpler and more compartmentalized in QHTML7
- Use `test/demo.html` as the QHTML7 compatibility test area.
- Use `dist/q-components/` as the component set to validate.
- The QHTML6 repository at `../qhtml6` or `~/build/qhtml6` may be run locally for visual or behavioral comparison, but must not be modified.
- QHTML7-specific syntax may coexist with QHTML6-compatible syntax.

## Development Notes

- Prefer implementation of low-level constructs that power high-level APIs. Making a robust framework is critical before creation of higher level system is possible. 
- New functionality should be implemented from scratch in the QtCore-only WebAssembly codebase or existing project JavaScript bridge, respecting the architecture boundary above.
- Do not directly edit generated/distributed `dist/*.js` files. Modify the source files under `js/*.js`, then run `build-release.sh` so the JavaScript bridge, copied `dist` files, and WebAssembly module are updated through the release pipeline.
- Local demos can be hosted with `httpserver` or `python -m http.server` from this repository, and optionally from the QHTML6 repository for comparison.
