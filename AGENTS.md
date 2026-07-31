# QHTML7 Project Notes

## Architecture Constraints

- QHTML7 is a Javascript-based implementation of the QHTML language intended to replace traditional HTML implementations with a high-level language runtime.
- This project is not a JavaScript library, its a QHTML library, so make sure that you consider that whenever doing anything. 
- That being said, javascript supports many of the functions available to QHTML, so please familiarize yourself with the doc/*.txt folder before starting.
- Also familiarize yourself with the README.md file as it has examples of syntax usage to get a general idea as to the shape and structure of QHTML. 
- The persistent document/component structure must live in js/qhtml_types.js, using QHTML node objects that can be stored in and updated through the `QHTMLDomTree`.
- The JavaScript side, especially `js/qhtml-element.js`, should target the necessary javascript bindings and such that are needed to implement the custom <q-html> element -- things like reading the inner contents and passing to a parser function would be one of such things to include here, also things like connectedCallback would be relevant. 
- Browser-facing bridge functions should be narrow command surfaces such as `forwardSignalToQHTML(sender, signal, parameters)`, `getDomElementByComponentInstanceUUID(componentUUID)`, or `generateStyleSheetFor(domElement)`, with the actual behavior driven primarily by the QHTML Javascript API methods and QHTML node state.
- Only implement functionality using an external javascript function or closure when there is no practical way to implement it using the QHTML Javascript API. Any required JavaScript bridge state or browser-side result must be synchronized with the QHTMLDomTree (or its children) only after changes are made that directly affect that specific node.
- Any custom object classes should be created as one of the available types or a new type should be added to js/qhtml_types.js 
- Use unique `QHTMLNode*`-based objects for runtime objects that need to persist in the QHTML DOM tree and expose those instead.
- Do not reuse code from the QHTML6 repository. It may be inspected and hosted locally only as a behavioral reference.


- *CRITICAL*  NEVER, EVER, EVER do any manner of symbol existence checking, correct type checking, or null checking in QHTML declarative syntax or javascript code that is passed through the QHTML parser. Assume all symbols exist and are of the correct types that they are defined. If they do not exist, we need the parser or runtime to throw errors and crash, not silently ignoring or failing without any output (this is for debugging ).
  +  Example of DO NOT INCLUDE code
  +    if (someobject && typeof someobject.somefunction === "function" && !someobject.querySelector("[someattribute='someval']")) {
  +  * Objects are *not* javascript objects, they are QHTML objects, so type checking is not viable with QHTML !!
  +  * No need to verify that a symbol is still that symbol since the parser / runtime guarantees that.

## Compatibility Goals

- The main goal is maximum interoperability. We want symbols defined in QHTML to exist everywhere in scope, so if a div is created in a component in QHTML, it should be available via the context to children / descendants as well as any DOM elements that are rendered by those children / descendants.  Also sibling strongly typed names (q-components) need to be available as object references. (This is already mostly setup but just as an FYI)

## Development Notes

- 
- Do not directly edit generated/distributed `dist/*.js` files. Modify the source files under `js/*.js`, then run `build-release.sh` so the JavaScript bridge, copied `dist` files, and WebAssembly module are updated through the release pipeline.
- This repo is hosted at http://127.0.0.1:8000 always, but in the event that it isn't available at that address, then spin up a python http server when needed 
- ./build-release --increase-patch will move the patch level of the QHTML version up by 1. 
- When doing cross-component interactions, use a q-event object (see README.md) on a common parent / root element which can be called like a q-signal and then you can attach arbitrary children in the same tree as the q-event using  q-event-listener which provides an interface to interact with other QHTML elements and non-QHTML dom elements. 
