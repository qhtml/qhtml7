# qhtml-qt Module API

## Purpose

`src/modules/qhtml-qt` is the QtCore/WASM side of the QHTML-WASM runtime. It owns the typed QDom data model, QHTML text parsing into QDom structures, resource-backed component imports, Qt timers/animations, and small bridge objects that can be called from browser JavaScript through Emscripten embind.

The browser DOM is still projected by `dist/qhtml-wasm/qhtml-wasm-renderer.js`. JavaScript should stay thin: it loads the WASM module, converts browser values into explicit bridge types, and turns QDom/render signals into real DOM updates.

## Source Layout

The retained source files are:

- `main.cpp`: embind entrypoint for Qt runtime primitives, QObject/timer/animation helpers, resource import helpers, and compatibility exports.
- `qdom_components.hpp`: typed QDom node classes and shared QDom structures.
- `qdom_parser.hpp`: plaintext QHTML parser that builds the typed QDom hierarchy without Qt JSON APIs.
- `qdom_render_interface.hpp`: WASM render-command dispatcher used to send low-level DOM update commands to JavaScript.
- `qdom_resource_importer.hpp` / `qdom_resource_importer.cpp`: Qt resource import expansion and parsed resource helpers.
- `qdom_variant.hpp`: JavaScript/WASM value bridge for primitives, containers, and QDom handles.
- `qhtml_resources.qrc`: resource collection used to embed bundled QHTML component files.

Legacy experimental files such as `qhtml_qdom.*`, `qhtml_parser.*`, `qhtml_runtime.*`, `qhtml_runtime_bindings.cpp`, and `qhtmlcomponent.*` are no longer part of the source tree or CMake target.

## Public JavaScript Bindings

When built through Emscripten embind, the module exposes these Qt/WASM APIs:

```js
Module.QObject
Module.QTimer
Module.QPropertyAnimation
Module.QBehavior
Module.QScriptActionAnimation
Module.QAnimationGroup
Module.QSequentialAnimationGroup
Module.QParallelAnimationGroup

Module.QHTMLSignal
Module.QDomNodeKind
Module.QDomComponentObject
Module.QDomResourceImporter
Module.QDomNode
Module.QDomDocument
Module.QVariant
Module.QDomRenderInterface

Module.makeSampleRuntimeBridge()
Module.qhtmlResourceNormalizePath(path)
Module.qhtmlResourceExists(path)
Module.qhtmlReadResource(path)
Module.qhtmlExpandResource(path)
Module.qhtmlExpandResourceImportsInSource(source)
Module.qhtmlParsedResourceNodeCount(path)
Module.qhtmlResourcePaths()
Module.qhtmlParseSourceToObject(source)
```

`Module.QHtmlParser`, the old QObject-backed `Module.QDomDocument`, `Module.QDomBuilder`, and the old individual QObject node exports are intentionally removed from the retained Qt path.

## QVariant Bridge

`Module.QVariant` is the explicit value boundary between browser JavaScript and Qt C++. JavaScript should classify values and construct a `QVariant` before passing data into APIs that store arbitrary values.

Supported payload kinds:

- `invalid`
- `bool`
- `number`
- `string`
- `list`
- `map`
- `qdom-node`
- `qdom-document`

Browser-side helper:

```js
const variant = QHTMLQt.toVariant(value);
```

`QHTMLQt.toVariant(value)` supports JavaScript booleans, numbers, strings, arrays, plain objects, `Module.QDomNode`, `Module.QDomDocument`, and values that are already `Module.QVariant` instances.

Manual construction:

```js
const scalar = new Module.QVariant();
scalar.setString("hello");

const list = new Module.QVariant();
list.setList();
list.append(QHTMLQt.toVariant("first"));
list.append(QHTMLQt.toVariant(2));

const map = new Module.QVariant();
map.setMap();
map.setMapValue("label", QHTMLQt.toVariant("Panel"));
map.setMapValue("count", QHTMLQt.toVariant(3));

const node = new Module.QDomNode("element");
node.setUuid("example-node");
const nodeValue = new Module.QVariant();
nodeValue.setNode(node);
```

## QHTMLSignal Bridge

`Module.QHTMLSignal` is the generic signal object used at the JavaScript/WASM boundary. It stores browser callbacks inside WASM, accepts browser values directly or through `Module.QVariant`, and emits the converted JavaScript value back to connected handlers.

```js
const signal = new Module.QHTMLSignal("done");
signal.connect(function (payload) {
  console.log(payload.message);
});
signal.emitVariant(QHTMLQt.toVariant({ message: "finished" }));
```

QHTML-WASM component signals declared with `q-signal name(args)` are normalized by `qhtml-wasm-renderer.js` into callable handles:

```qhtml
q-component sender {
  q-signal sent(message)
}

sender source { }
button {
  onclick {
    source.sent.connect(function(message) { console.log(message); });
    source.sent("hello");
  }
}
```

The same adapter also bridges `Module.QObject` style objects that expose `.connect(signalName, callback)` and `.emit(...)` / `.emitVariant(...)`, so `q-connect` can route between QHTML components and WASM-backed objects without page-specific glue.

## DOM Render Command Interface

`Module.QDomRenderInterface` is the WASM-side command dispatcher for the Option-B QHTML-WASM architecture: QDom, context, properties, and bindings stay in WASM, while JavaScript receives low-level render commands and mutates browser DOM nodes by UUID.

Browser-side `QHTMLDomInterface` is exposed by `dist/qhtml-wasm/qhtml-wasm-renderer.js` and can be created through:

```js
const iface = new QHTMLDomInterface({ Module });
const iface2 = QHTMLQt.createDomInterface();
```

The interface maintains `domNodes: Map<uuid, Node>` and supports:

```js
iface.connect("updateProperty", (payload) => { /* observe or extend command handling */ });
iface.dispatch("setText", { uuid: "label", value: "ready" });
iface.mount(hostElement, optionalQDomDocumentHandle);
iface.emitDomEvent("button-1", "click", event);
```

`Module.QDomRenderInterface` can emit commands directly:

```js
const iface = QHTMLQt.createDomInterface();
const render = iface.wasmInterface;
render.createElement("box", "div");
render.createText("label", "hello");
render.appendChild("box", "label");
render.appendChild("root", "box");
render.updateProperty("box", "title", "from wasm");
```

For signal compatibility with the JavaScript runtime, WASM-owned objects should emit a generic `signalSent` render command instead of inventing page-specific callback glue:

```js
const iface = QHTMLQt.createDomInterface();
iface.wasmInterface.signalSentNamedVariant(
  "component-uuid",
  "done",
  "message,count",
  QHTMLQt.toVariant(["ready", 2])
);
```

The browser-side `QHTMLDomInterface` receives that command, finds the DOM node by UUID, and dispatches a qhtml.js-compatible `CustomEvent`:

```js
node.addEventListener("done", function(event) {
  console.log(event.detail.args);          // ["ready", 2]
  console.log(event.detail.params.message); // "ready"
});
```

Declared qhtml-wasm component signals also normalize to the same callable shape as qhtml.js signals:

```js
myComponent.done.connect(function(message, count) {
  console.log(message, count);
});
myComponent.done("ready", 2);
```

Supported command names include:

- `createElement`
- `createText`
- `createRawHtml`
- `createComponentInstance`
- `appendChild`
- `replaceChildren`
- `removeNode`
- `setAttribute`
- `setProperty`
- `updateProperty`
- `setText`
- `setHtml`
- `connectDomEvent`
- `domEvent`
- `signalSent`

Important methods:

```js
variant.typeName();
variant.isValid();
variant.isBool();
variant.isNumber();
variant.isString();
variant.isList();
variant.isMap();
variant.isQDomNode();
variant.isQDomDocument();

variant.toBool();
variant.toNumber();
variant.toString();
variant.length();
variant.at(index);
variant.mapValue(key);
variant.toQDomNode();
variant.toQDomDocument();
variant.toJsValue();
```

`toJsValue()` unwraps primitive, list, and map values into browser JavaScript values. QDom handles are returned as small metadata objects with `__qhtmlQDomHandle`, `type`, `uuid`, and node `kind` when available.

## QDom Handles

`Module.QDomNode` is a lightweight embind handle around the internal typed `QDomNodePtr`.

```js
const node = new Module.QDomNode("element");
node.isValid();
node.kind();
node.uuid();
node.setUuid(uuid);
node.setPropertyString(name, value);
node.propertyString(name);
node.setPropertyNumber(name, value);
node.propertyNumber(name);
```

`Module.QDomDocument` wraps a typed QDom document.

```js
const doc = new Module.QDomDocument();
doc.isValid();
doc.uuid();
doc.setUuid(uuid);
doc.appendNode(node);
doc.nodeCount();
doc.nodeAt(index);
```

These handles are designed for transport and storage through `Module.QVariant`. They are not browser DOM nodes.

## QObject Value API

`Module.QObject` accepts `Module.QVariant` values for arbitrary property storage and signal payloads:

```js
const object = new Module.QObject();
object.setPropertyValue("payload", QHTMLQt.toVariant({ label: "ready" }));
const payload = object.propertyValue("payload");
object.emitVariant("changed", payload);
```

The C++ side stores the underlying Qt `QVariant`. When the value is emitted back to JavaScript, primitives and containers are unwrapped with `QVariant.toJsValue()`.

## Parser And Resource Helpers

`qdom_parser.hpp` provides the QHTML text parser used by `qhtmlParseSourceToObject(source)` and resource import expansion. The parser builds typed QDom structures directly; it does not use `QJsonDocument`, `QJsonObject`, `QJsonArray`, `QJsonValue`, or `QJSValue`.

The parser supports C-style block comments in QHTML syntax. `/* ... */` is treated as whitespace between declarations, after selector heads, and inside typed comma-separated values. Braces inside comments are ignored by block matching, so commented-out QHTML does not unbalance the surrounding node:

```qhtml
/* top-level parser comment */
div /* selector comment */ {
  q-var names { ["ada", /* skipped */ "grace"] }
  /* ignored { p { text { nope } } } */
  p { text { ${names[1]} } }
}
```

Inline repeaters are parsed on the WASM side. A `for (alias in source) { ... }` block creates a typed `QDomRepeaterNode` with `alias`, `modelRef`, and `templateNodes` populated from the loop header and body:

```qhtml
q-component catalog {
  q-property products: q-array {
    q-map { SKU: "NL-100" name: "Night Lamp" }
  }

  div {
    for (product in this.component.products) {
      span { text { ${product.SKU} } }
    }
  }
}
```

The browser renderer consumes that typed repeater node and creates a child render scope for each item, exposing the loop alias plus `index` and `$index` to inline expressions and event handlers.

The browser renderer treats `q-script` as a render-time script object:

```qhtml
div {
  q-script { return "p { text { Inserted by q-script } }"; }
}
```

If the script body contains a `return`, JavaScript evaluates it in the scoped browser runtime. Returned values are normalized through `QHTMLQt.toVariant(value).toJsValue()` when available, then the QDom script node is replaced by the returned value. Returned QHTML source is parsed and rendered; primitive values render as text.

If the script body has no `return`, the renderer emits a browser `<script>` element containing an immediately invoked function:

```html
<script>(function(){ ... }).call(document.currentScript && document.currentScript.parentNode);</script>
```

Assignment-form `q-script` is also supported for component properties and element attributes:

```qhtml
q-component card {
  q-property label: q-script { return "ready"; }
}

div {
  data-note: q-script { return "n:" + (4 + 1); }
}
```

Resource import helpers operate on embedded Qt resource paths:

```js
Module.qhtmlResourceExists("q-components.qhtml");
Module.qhtmlReadResource("q-components/q-fetch-html.qhtml");
Module.qhtmlExpandResourceImportsInSource(source);
Module.qhtmlParseSourceToObject(source);
```

`q-import-resource` expansion is a blocking pre-parse step for the WASM path so dependent definitions are available before renderer scripts run.

`q-import` keeps URL-compatible behavior first. In the browser renderer, top-level qhtml-wasm imports resolve relative to the URL of the running web page. If an imported `.qhtml` file contains a nested `q-import`, the nested relative path resolves against the URL of that imported `.qhtml` file, not against the original page or the qhtml-wasm script URL.

If the requested URL is not a successful 2xx response, the import falls back to the embedded resource system. This allows qhtml.js pages such as:

```qhtml
q-import { q-modal.qhtml }
```

to work as a drop-in qhtml-wasm import when `./q-modal.qhtml` is absent but `q-components/q-modal.qhtml` exists in the compiled Qt resource bundle. Fallback candidates include the literal import path, the basename, and `q-components/<basename>`.

## Browser WASM Runtime Facade

`dist/qhtml-wasm/qhtml-wasm.js` loads:

1. `qhtml-wasm-glue.js`
2. `qhtml-wasm-renderer.js`

It copies the Qt-generated glue/wasm output into public names:

- `qhtml-wasm-glue.js`
- `qhtml-wasm.wasm`

After startup it exposes:

```js
window.QHTMLQt
window.QHTMLQtReady
window.QHtml
```

`QHTMLQt` owns the Qt module and bridge helpers, including `toVariant(value)`. `QHtml` is the compatibility facade used by pages that load `qhtml-wasm.js` as a drop-in replacement for `qhtml.js`.

## Compatibility Notes

- QDom is the source of truth for the WASM runtime path.
- JavaScript bodies from QHTML source are stored as source strings and executed only at the browser boundary when there is no useful WASM representation.
- Browser-side JavaScript should not pass raw arbitrary objects to C++ value APIs. Use `QHTMLQt.toVariant(value)` or manually construct `Module.QVariant`.
- QDom handles passed through `Module.QVariant` preserve the underlying WASM object pointer and can be returned with `toQDomNode()` or `toQDomDocument()`.
- Generated files in `dist/qhtml-wasm/` are produced from the single-threaded Qt/WASM build artifact by `src/build-release.sh`.
