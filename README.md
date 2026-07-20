# QHTML7

QHTML7 is a WebAssembly-first implementation of the QHTML language: a declarative way to describe HTML, CSS, component structure, runtime properties, signals, layout, and browser-facing behavior in one readable source format.

Language design, specifications, and tests created by humans; implementation by ChatGPT 5.6 Codex.

Useful local entry points:

- Dev gallery: `test/demo.html`
- Component tests: `test/02.html`
- Style/theme tests: `test/03.html`
- Particle editor: `tools/particle-editor.html`
- Layout builder: `tools/layout-builder.html`
- Page builder: `tools/page-builder.html`
- QHTML editor: `tools/editor.html`
- Language notes: `language/qhtml7.txt`

## 1. Quick Start And HTML Syntax

### Install QHTML7

Copy the files in `dist/` to your web server:

```text
/path/to/site/dist/qhtml.js
/path/to/site/dist/qhtml-wasm.js
/path/to/site/dist/qhtml-element.js
/path/to/site/dist/qhtml7-wasm.js
/path/to/site/dist/qhtml7-wasm.wasm
```

Then include the entry point:

```html
<script src="/dist/qhtml.js"></script>
```

`qhtml.js` loads the QHTML7 bridge and WebAssembly runtime from the same directory. Use a real HTTP server; browser filesystem loading is not a supported runtime environment.

For local development from this repo:

```bash
python3 -m http.server
```

Then open pages such as:

```text
http://127.0.0.1:8000/test/demo.html
http://127.0.0.1:8000/tools/editor.html
```

### Write QHTML In `<q-html>`

```html
<script src="/dist/qhtml.js"></script>

<q-html>
  h1 { text { Hello QHTML7 } }
  p { text { Your first QHTML7 render is running. } }
</q-html>
```

Resulting HTML:

```html
<h1>Hello QHTML7</h1>
<p>Your first QHTML7 render is running.</p>
```

`text { ... }` creates escaped text content. `html { ... }` inserts raw HTML.

### Elements And Nesting

Plain HTML nodes use the tag name followed by a block:

```qhtml
section {
  h2 { text { Overview } }
  p  { text { A readable UI tree. } }
}
```

Resulting HTML:

```html
<section>
  <h2>Overview</h2>
  <p>A readable UI tree.</p>
</section>
```

### Selector Chains

Comma chains create nested elements:

```qhtml
div,section,h3 { text { Nested } }
```

Resulting HTML:

```html
<div>
  <section>
    <h3>Nested</h3>
  </section>
</div>
```

### Class And ID Shorthand

```qhtml
div#main {
  div.card {
    p#body.large { text { Card body } }
  }
}
```

Resulting HTML:

```html
<div id="main">
  <div class="card">
    <p id="body" class="large">Card body</p>
  </div>
</div>
```

### Attributes

Assignments inside ordinary HTML blocks become HTML attributes unless the assignment is a known CSS shortcut or a declared QHTML property.

```qhtml
a {
  href: "https://example.com"
  target: "_blank"
  text { Open Example }
}
```

Resulting HTML:

```html
<a href="https://example.com" target="_blank">Open Example</a>
```

Unknown/custom elements work the same way:

```qhtml
my-element {
  someattribute: "1"
  otherthing: "2"
}
```

Resulting HTML:

```html
<my-element someattribute="1" otherthing="2"></my-element>
```

### Style Values

Use real CSS values. QHTML7 does not guess missing CSS units for you.

```qhtml
div#box {
  width: "100px"
  height: "50vh"
  position: "absolute"
  left: "20px"
  top: "10px"
  text { CSS-ready values }
}
```

Resulting HTML:

```html
<div id="box" style="width: 100px; height: 50vh; position: absolute; left: 20px; top: 10px;">CSS-ready values</div>
```

This is intentionally invalid:

```qhtml
div { width: 400 }
```

The browser receives `width:400`, which is invalid CSS for `width`, and QHTML7 logs a warning such as:

```text
Invalid CSS width property: 400
```

Unitless CSS properties such as `opacity`, `zIndex`, `order`, and `flexGrow` can still use unitless numbers.

### Raw Style Blocks

```qhtml
p {
  style { font-size: 20px; margin: 0; }
  text { Plain text content }
}
```

Resulting HTML:

```html
<p style="font-size: 20px; margin: 0;">Plain text content</p>
```

## 2. Q-Components

`q-component` defines a reusable QHTML component type. A component is a named QHTML template with its own properties, functions, signals, slots, and rendered DOM structure.

Think of it as a WebAssembly-backed custom component definition:

- The `q-component` block defines the component type.
- Instantiating that type creates a component instance.
- The instance renders the QHTML inside the definition.
- Properties/functions/signals live on the component instance.
- Slots let the caller project content into the component.

### Define A Component

```qhtml
q-component info-card {
  article.card {
    h3 { text { Info } }
    p { text { This content came from a component. } }
  }
}
```

This only defines `info-card`. It does not render anything until it is instantiated. 
You do this with a simple `info-card { }` and  thats it.

### Instantiate A Component

```qhtml
q-component info-card {
  article.card {
    h3 { text { Info } }
    p { text { This content came from a component. } }
  }
}


info-card { } 
```

Simplified resulting HTML:

```html
<info-card>
  <article class="card">
    <h3>Info</h3>
    <p>This content came from a component.</p>
  </article>
</info-card>
```



### Named Instances

Instances may be named. Named instances become symbols that other QHTML code can reference.

```qhtml
q-component status-pill {
  span.status { text { Ready } }
}

status-pill headerStatus { }
```

The instance name is `headerStatus`, which becomes available to the QHTML declarative syntax and to javascript objects for a variety of uses.




### Define Properties

Use `q-property` inside a component definition and then reference it 

```qhtml
q-component badge {
  q-property label: "New"

  span.badge {
    text { ${label} }
  }
}

badge { }
badge { label: "Updated" }
```

Simplified resulting HTML:

```html
<badge>
  <span class="badge">New</span>
</badge>

<badge>
  <span class="badge">Updated</span>
</badge>
```

Instance assignments override the component's default property values.

### Access Properties From An Instance

Named component instances can be referenced by name:

```qhtml
q-component source-box {
  q-property title: "Copied title"
}

source-box source1 { }

q-component target-box {
  q-property copiedTitle: source1.title

  div.target {
    text { ${copiedTitle} }
  }
}

target-box { }
```

Simplified resulting HTML:

```html
<source-box></source-box>

<target-box>
  <div class="target">Copied title</div>
</target-box>
```

Inside a component, `this` refers to the current component instance in JavaScript handlers and functions:

```qhtml
q-component counter-card {
  q-property count: 0

  onready {
    this.count = this.count + 1;
  }

  oncountchanged(value) {
    this.querySelector(".count").textContent = String(value);
  }

  div.count { text { 0 } }
}

counter-card { }
```

### Functions

Functions are declared inside a component and are callable on the instance.

```qhtml
q-component action-card {
  q-property label: "waiting"

  function markDone() {
    this.label = "done";
  }

  onlabelchanged(value) {
    this.querySelector(".state").textContent = value;
  }

  button {
    text { Mark done }
    onclick {
      this.parentElement.markDone();
    }
  }

  div.state { text { waiting } }
}

action-card card1 { }
```

Functions are runtime behavior, so there is no special static HTML output to show beyond the rendered button and state node.

### Slots

Slots let a component define insertion points for caller-provided content.

```qhtml
q-component panel-box {
  section.panel {
    h3 { text { Panel shell } }
    div.panel-body {
      slot { body }
    }
  }
}

panel-box {
  body {
    p { text { Projected content } }
  }
}
```

Simplified resulting HTML:

```html
<panel-box>
  <section class="panel">
    <h3>Panel shell</h3>
    <div class="panel-body">
      <p>Projected content</p>
    </div>
  </section>
</panel-box>
```

Slot names are just child block names on the component instance. Here the component declares `slot { body }`, and the instance provides:

```qhtml
body {
  p { text { Projected content } }
}
```

### Slot Defaults

Use `q-slot-default` to provide fallback content when the caller does not supply the slot.

```qhtml
q-component notice-card {
  q-slot-default body {
    p { text { Default notice } }
  }

  article.notice {
    slot { body }
  }
}

notice-card { }

notice-card {
  body {
    p { text { Custom notice } }
  }
}
```

Simplified resulting HTML:

```html
<notice-card>
  <article class="notice">
    <p>Default notice</p>
  </article>
</notice-card>

<notice-card>
  <article class="notice">
    <p>Custom notice</p>
  </article>
</notice-card>
```

### Signals

`q-signal` declares an instance signal. Call it like a function from component code. Handle it with `on<signalName>`.

```qhtml
q-component signal-card {
  q-signal sent(message)

  onsent(message) {
    this.querySelector(".out").textContent = String(message);
  }

  onready {
    this.sent("Signal received");
  }

  div.out { text { waiting } }
}

signal-card { }
```

Signals are runtime behavior, not static HTML. They are useful for component-local events and for connecting components together.

### Connect Signals To Functions

`q-connect` connects a signal source to a callable target.

```qhtml
q-component sender-box {
  q-signal sent(message)

  function sendNow(message) {
    this.sent(message);
  }
}

q-component receiver-box {
  q-property value: "waiting"

  function onMessage(message) {
    this.value = message;
  }

  onvaluechanged(value) {
    this.querySelector(".out").textContent = String(value);
  }

  div.out { text { waiting } }
}

sender-box sender1 { }
receiver-box receiver1 { }

q-connect { sender1.sent receiver1.onMessage }

q-component driver {
  onready {
    sender1.sendNow("Connected");
  }
}

driver { }
```

### Component Inheritance

Components can extend other components:

```qhtml
q-component base-card {
  q-property title: "Base"

  article.card {
    h3 { text { ${title} } }
    slot { body }
  }
}

q-component warning-card extends base-card {
  q-property title: "Warning"
}

warning-card {
  body {
    p { text { Be careful. } }
  }
}
```

Use inheritance when a component should share structure, properties, functions, or signals with a base component.

## 3. Imports And Component Files

Use `q-import` to include another QHTML file before rendering the current source.

```qhtml
q-import { ./shared/cards.qhtml }

info-card { title: "Imported component" }
```

Imports are resolved relative to the host page URL unless the path is absolute.

The distributed component set lives in `dist/q-components/` and can be imported by path:

```qhtml
q-import { ../dist/q-components/q-sidebar.qhtml }
q-import { ../dist/q-components/q-tabs.qhtml }
q-import { ../dist/q-components/q-modal.qhtml }
```

`q-import` fetches QHTML resources with the runtime version appended as a query string, so component files are naturally refreshed when the QHTML runtime version changes.

`q-require { ... }` is available for resource-style requirements, but most user code should prefer `q-import`.

## 4. Styles, Themes, And Transitions

QHTML7 can use raw `style { ... }` blocks, but reusable styling is usually better with `q-style` and `q-theme`.

### `q-style`

```qhtml
q-style panel {
  backgroundColor: #eff6ff
  color: #1e293b
  border: 1px solid #93c5fd
  padding: 16px
  borderRadius: 8px
}

panel,div {
  text { Styled panel }
}
```

Simplified resulting HTML:

```html
<div style="background-color: #eff6ff; color: #1e293b; border: 1px solid #93c5fd; padding: 16px; border-radius: 8px;">Styled panel</div>
```

### `q-theme`

Themes map selectors to styles.

```qhtml
q-style title-accent { color: #1d4ed8 }
q-style body-muted   { color: #64748b }

q-theme article-theme {
  h3 { title-accent }
  p  { body-muted }
}

article-theme {
  article {
    h3 { text { Title } }
    p  { text { Description } }
  }
}
```

### Anonymous Styles In Themes

```qhtml
q-theme card-theme {
  h3 { q-style { color: #1d4ed8 } }
  .summary { q-style { color: #334155 } }
}
```

### `q-default-theme`

`q-default-theme` is a fallback layer. It applies first; later scoped `q-theme` rules override conflicts.

```qhtml
q-style panel-base { backgroundColor: #eef3fb color: #0f172a }
q-style panel-hot  { backgroundColor: #ffedd5 color: #7c2d12 }

q-default-theme base-theme {
  .card { panel-base }
}

q-theme demo-theme {
  base-theme { }
  .card { panel-hot }
}
```

### `q-transition`

`q-transition` defines a named CSS transition. Apply it directly in an element or through a style/theme.

```qhtml
q-transition soft-change {
  duration { 300 }
  timing { ease-in-out }
  delay { 0 }
}

div.card {
  soft-change { opacity color paddingTop }
  opacity: 0.8
  text { Transition-ready card }
}
```

Through `q-style-transition`:

```qhtml
q-transition fade-in {
  property { opacity }
  duration { 300 }
  timing { ease-in-out }
}

q-style panel-style {
  q-style-transition { fade-in }
}
```

## 5. Layout

`q-layout`, `q-row`, and `q-col` are built-in layout nodes. They render as normal DOM layout containers and are also the model used by the visual layout/page builder tools.

```qhtml
q-layout {
  width: "100%"
  height: "80vh"
  gap: "12px"

  q-row {
    height: "20vh"

    q-col {
      width: "20vw"
      text { Left column }
    }

    q-col {
      width: "60vw"
      text { Main column }
    }
  }
}
```

`q-layout` and `q-col` stack children vertically by default. `q-row` flows horizontally.

Useful layout properties:

- `width`, `height`
- `minWidth`, `minHeight`
- `maxWidth`, `maxHeight`
- `gap`
- `flex`
- `wrap`
- `minColWidth`
- `stretch` / `layoutStretch`
- `sizeHint` / `layoutHint`

Use CSS values with units where needed:

```qhtml
q-row {
  width: "100%"
  gap: "16px"
  wrap: "wrap"

  q-col { width: "20vw" minWidth: "12rem" }
  q-col { width: "40vw" minWidth: "18rem" }
}
```

## 6. Runtime Keywords

### `q-timer`

```qhtml
q-timer clock {
  interval: 1000
  repeat: true
  running: true

  ontimeout {
    console.log("tick");
  }
}
```

Behavior:

- `repeat: true` uses interval behavior.
- `repeat: false` uses timeout behavior.
- Named timers are available in runtime scope by name.
- Runtime-managed timers are cleaned up when their host is unmounted.

### `q-canvas`

```qhtml
q-canvas board {
  width: 320
  height: 180
}

button {
  text { Draw }
  onclick {
    board.context.clearRect(0, 0, 320, 180);
    board.context.fillStyle = "rgba(16,185,129,0.9)";
    board.context.fillRect(20, 20, 120, 80);
  }
}
```

`q-canvas <name>` exports a named canvas handle. `<name>.context` is the 2D context.

### `particle-emitter`

`particle-emitter` is a QHTML7-provided custom element for canvas-backed particles. It does not require loading `particle-emitter.js` manually.

```qhtml
div#energy-field {
  style {
    position: relative;
    width: 420px;
    height: 220px;
    overflow: hidden;
    background: #07111f;
  }

  particle-emitter energyEmitter {
    id: "energy-emitter"
    running: true
    src: "tools/assets/particle.png"
    emitRate: 84
    interval: 18
    lifetime: 3600
    lifetimeVariation: 900
    x: 210
    y: 214
    xVariation: 145
    yVariation: 8
    yVelocity: -1.25
    startSize: 10
    endSize: 30
    startOpacity: 0.35
    endOpacity: 0.02
    maxActiveParticles: 96
  }
}
```

Useful methods on the DOM element:

- `start()`
- `stop()`
- `clear()`
- `burst(x, y, count)`

## 7. Scripts, Events, And Expressions

### Event Handlers

DOM event handlers use `on<event>` blocks:

```qhtml
button {
  text { Click me }
  onclick {
    this.textContent = "Clicked";
  }
}
```

The handler runs with the rendered DOM element as `this`.

### `q-script`

`q-script { ... }` runs JavaScript and replaces itself with the returned value.

```qhtml
div {
  q-script { return "p { text { Inserted by q-script } }"; }
}
```

Assignment form:

```qhtml
div {
  data-note: q-script { return "n:" + (4 + 1) }
  text { q-script { return "script-inline"; } }
}
```

### Inline Expressions

`${expression}` evaluates inside text/attribute strings.

```qhtml
q-var currentUser { "Ada" }

div {
  title: "Current user: ${currentUser}"
  text { Hello ${currentUser} }
}
```

Expressions are evaluated when the final string is rendered. They are not automatic watchers by themselves.

## 8. Paint And Houdini

`q-painter` defines a reusable paint worklet body with QHTML-owned defaults.

```qhtml
q-painter panel-painter {
  q-property fill: "rgba(40,80,160,0.9)"

  onpaint {
    this.fillStyle = this.fill;
    this.fillRect(0, 0, this.width, this.height);
  }
}

q-style panel-style {
  width: "180px"
  height: "48px"

  q-style-painter {
    background { panel-painter }
  }
}

panel-style,div {
  text { Painted }
}
```

`q-style-painter` supports:

- `background { painterName }`
- `border { painterName }`
- `mask { painterName }`

Paint handlers may also appear as `onPaintBackground`, `onPaintBorder`, and `onPaintMask` where supported by the runtime.

## 9. QHTMLDomTree API

QHTML7 stores the persistent document model in WebAssembly as a `QHTMLDomTree`.

Common flow:

1. Create a tree.
2. Load source with `.fromQHTML(source)`.
3. Inspect or mutate QHTML node objects.
4. Serialize with `.toQHTML()`, `.toHTML()`, `.toJSON()`, or `.toJSONText()`.
5. Load serialized state with `.fromJSON(value)`, `.fromJSONText(text)`, or `.fromQHTML(source)`.

```html
<script src="/dist/qhtml.js"></script>
<script>
document.addEventListener("QHTML7Ready", function () {
  const tree = new QHTML7.Module.QHTMLDomTree();
  tree.fromQHTML('section { h2 { text { Hello } } }');

  console.log(tree.toHTML());
  console.log(tree.toQHTML());
  console.log(tree.toJSON());
});
</script>
```

### Traversal

Every QHTMLDomNode-based object exposes child helpers from WebAssembly:

```js
const tree = new QHTML7.Module.QHTMLDomTree();
tree.fromQHTML('q-layout { q-row { q-col { text { Cell } } } }');

const children = tree.childList();
const layouts = tree.findChildrenByType('QHTMLLayout');
```

Useful methods:

- `.childList()`
- `.childCount()`
- `.childAt(index)`
- `.findChildrenByType(typeName)`
- `.sourceQHTML()` / `.toQHTML()`
- `.renderHtml()` / `.toHTML()`
- `.toJSON()` / `.toJSONText()`
- `.fromJSON(value)` / `.fromJSONText(text)`
- `.setPropertyText(name, value)`

### Mounted Host Helpers

Mounted `<q-html>` elements expose high-level helpers:

```js
const host = document.querySelector("q-html");
host.fromQHTML('div { text { Replaced source } }');

console.log(host.toHTML());
console.log(host.toQHTML());
```

`toHTML()` is useful for static output and tooling. `tools/roller.html` can process HTML files containing `<q-html>` blocks and output HTML clones.

## 10. Tools

- `tools/editor.html`: browser QHTML editor.
- `tools/layout-builder.html`: visual editor for `q-layout`, `q-row`, and `q-col`.
- `tools/page-builder.html`: page builder shell using the shared layout editor and palette.
- `tools/particle-editor.html`: particle-emitter editor/exporter.
- `tools/roller.html`: converts QHTML-containing HTML files toward static HTML using `.toHTML()`.

Shared layout builder files:

```text
tools/layout-builder/main.qhtml
tools/layout-builder/main.js
```

Page builder palette files:

```text
tools/page-builder/palette.qhtml
tools/page-builder/palette.js
```

## 11. Debugging

### Runtime Events

Wait for the WebAssembly runtime:

```js
document.addEventListener("QHTML7Ready", function (event) {
  console.log(event.detail.Module);
});
```

Wait for mounted QHTML content:

```js
document.addEventListener("QHTMLContentLoaded", function () {
  console.log("QHTML content loaded");
});
```

Enable runtime debug logging:

```js
window.QHTML_RUNTIME_DEBUG = true;
```

### `q-logger`

`q-logger` attaches a scoped logger to the current QHTML node.

```qhtml
q-component debug-card {
  q-logger { q-signal q-property }
  q-property count: 0
  q-signal ping(value)
}
```

Supported category names include:

- `q-property`
- `q-signal`
- `q-component`
- `q-slot`
- `function`
- `all`

Logging is for development and can be removed from production QHTML.

### Common Problems

CSS length values need units:

```qhtml
div { width: "400px" }  // valid
div { width: 400 }      // invalid CSS width
```

Relative imports and assets are resolved from the page URL. If a copied test page breaks in `tmp/`, check its `<script src>`, `q-import`, and asset paths.

## 12. Escaping

Use `\{` and `\}` for literal braces inside block content.

```qhtml
div {
  text { hello \} world }
}
```

Resulting HTML:

```html
<div>hello } world</div>
```

## Development Notes

