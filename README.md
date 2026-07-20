# QHTML7 - v7.3.8

QHTML7 is a the answer that everybody has been waiting for in the Web Development world. Finally, a single language that unifies HTML, javascript, and CSS together into a simple declarative language you can just write directly into the HTML files without the need to rollup, or preprocess anything. 

It is designed around a simple idea: maximum simplicity, maximum flexibility, and maximum readability. 

Language design, specifications, and tests created by humans; implementation by ChatGPT 5.6 Codex.

- Dev testbed: `test/demo.html`
- Particle Editor: `tools/particle-editor.html`
- Page builder: `tools/page-builder.html`
- QHTML IDE: `tools/editor.html`
- Language notes: `language/qhtml7.txt`

## 1. Quick Start

### Project setup

Copy the contents of `dist/` to a directory that can be accessed via the web. (Web Server HTTP Root) 
-or-
Spin up a temporary web server in the QHTML7 repo root directory using  `python3 -m http.server` or similar.

```text
/path/to/site/dist/qhtml.js
/path/to/site/dist/qhtml-wasm.js
/path/to/site/dist/qhtml-element.js
/path/to/site/dist/qhtml7-wasm.js
/path/to/site/dist/qhtml7-wasm.wasm
```

Once the files have been copied,
Then include the QHTML script on any web page:

```html
<script src="/dist/qhtml.js"></script>
```

`qhtml.js` loads the QHTML7 WebAssembly runtime and bridge files from the same directory as `qhtml.js` .

### Write QHTML in a `<q-html>` tag

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

QHTML blocks render into normal DOM elements. `text { ... }` escapes text content; `html { ... }` inserts raw HTML.


## 2. Core Syntax

### Elements and nesting

Plain HTML element blocks use the tag name followed by `{ ... }`.

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

### Selector chains (creates nested elements)

Comma chains create nested elements.

```qhtml
div,section,h3 { text { Nested } }
```

Resulting HTML:

```html
<div><section><h3>Nested</h3></section></div>
```

Chains are useful for compact structure.

### Class and id shorthand

```qhtml
div#main {
 div.card {
  p#body.large { text { Card body } }
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

Multiple selectors with shorthand:

```qhtml
div#my-id.my-class,span.my-class,h2#id2 { text { hello world } }
```

Resulting HTML:

```html
<div id="my-id" class="my-class">
  <span class="my-class">
    <h2 id="id2">hello world</h2>
  </span>
</div>
```

### Attributes

Simple assignments inside DOM blocks become attributes.

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

The same rule applies to unknown/custom HTML elements:

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

If an assignment name is a known CSS shortcut or `style`, QHTML treats it as style data instead of a plain HTML attribute.

### CSS numeric values

CSS numeric literals can be written without quotes in property and style value positions:

```qhtml
div#box {
  width: 100px
  height: 50vh
  left: 20px
  top: 10px
  position: "absolute"
  text { Numeric CSS values }
}
```

Supported units include `px`, `%`, `vw`, `vh`, `rem`, `em`, and unitless numbers. QHTML7 keeps CSS-ready values as strings when rendering style or attribute output.

Existing quoted values such as `"100px"` remain compatible.

### `text`, `html`, and `style` blocks

```qhtml
p {
  style { font-size: 20px; margin: 0; }
  text { Plain text content }
}

div { html { <strong>Real HTML fragment</strong> } }
```

Resulting HTML:

```html
<p style="font-size: 20px; margin: 0;">Plain text content</p>
<div><strong>Real HTML fragment</strong></div>
```

## 3. Layout Syntax

`q-layout`, `q-row`, and `q-col` are hard-coded QHTML7 layout nodes. They render as normal DOM layout containers and are also used by the visual layout/page builder tools.

### Basic layout

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

`q-layout` and `q-col` flow vertically by default. `q-row` flows horizontally. Columns can be dropped into rows or layouts; rows can be dropped into columns or layouts.

### Responsive sizing

Use CSS units directly:

```qhtml
q-row {
  width: "100%"
  gap: "16px"
  wrap: "wrap"

  q-col { width: "20vw" minWidth: "12rem" }
  q-col { width: "40vw" minWidth: "18rem" }
}
```

When an explicit pixel size is available on the flow axis, QHTML7 applies a Qt-style min/hint/max/stretch sizing pass internally. Otherwise it leaves the layout fluid and lets CSS flex behavior handle responsive sizing.

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

## 4. Data Helpers

### `q-array` and `q-map`

`q-array` and `q-map` declare named runtime data values in the current QHTML scope.

```qhtml
q-array names { "ada", "grace", "katherine" }

q-map settings {
  theme: "dark"
  count: 3
}

ul {
  for (name in names) {
    li { text { ${name} } }
  }
}
```

### `q-model` basics

`q-model` normalizes model data and exposes a consistent runtime API such as `count()`, `at()`, `values()`, `add()`, `insert()`, and `remove()` regardless of source shape.

```qhtml
q-model scores { q-array { 5, 10 } }

q-script {
  scores.add(15);
  console.log(scores.count());
}
```

### `q-model-view` basics

`q-model-view` renders its child template once per model entry using the alias defined by `as { ... }`.

```qhtml
q-array people { q-map { name: "ada" }, q-map { name: "grace" } }

q-model-view {
  q-model { people }
  as { item }
  div { text { ${item.name} } }
}
```

### `for` keyword (template iteration)

Use `for` when you want inline repeated template expansion:

```qhtml
q-array items { "one", "two", "three" }

ul {
  for (item in items) {
    li { text { ${item} } }
  }
}
```

Accepted source inputs:

- q-array and JavaScript arrays
- q-map / plain object values
- q-model helpers such as `.values()` / `.keys()`
- function return values that evaluate to arrays or objects
- primitive values, treated as single-entry iteration

Notes:

- `for` expression scope follows runtime inline expression rules.
- For stable builder output, keep layout structure outside loop bodies when possible and render repeated content inside a contained element.

### `q-var` (scoped runtime variable)

`q-var` declares a named runtime value in the current QHTML scope. The block is evaluated as JavaScript and is intended for stored strings, numbers, objects, arrays, and functions.

```qhtml
q-var names { ["ada", "grace", "katherine"] }
q-var settings { ({ tone: "calm", count: names.length }) }
q-var makeLabel { function(name) { return settings.tone + ": " + name; } }

ul {
  li { text { ${makeLabel(names[0])} } }
  li { text { total=${settings.count} } }
}
```

Every q-var handle exposes:

- `.value`: the current value.
- `.get()`: returns the current value.
- `.set(value)`: updates the stored value.

```qhtml
q-var count { 0 }

button {
  text { increment }
  onclick { count.set(count.value + 1); }
}
```

### `q-switch` / `switch` (named lookup function)

`q-switch` declares a named runtime function that maps primitive keys to JavaScript expression results. The shorthand `switch` parses the same way.

```qhtml
q-switch labelFor {
  15: { "hello world" }
  "test": { 32 }
  false: { "false is preserved" }
  *: { "fallback" }
}

div { text { ${labelFor(15)} } }
button {
  text { run switch }
  onclick {
    console.log(labelFor("test"));
  }
}
```

Falsey case results such as `0`, `false`, and `""` are returned as real matches; the `*` case is used only when no key matches.

## 5. Timers, Canvas, and Particles

### `q-timer` (keyword-level timer)

`q-timer` is a named top-level construct that declares a runtime timer directly:

```qhtml
q-timer myTimer {
  interval: 3000
  repeat: true
  running: true
  onTimeout {
    console.log("timer fired");
  }
}
```

Behavior:

- `repeat: true` uses native `setInterval(...)`.
- `repeat: false` uses native `setTimeout(...)`.
- The named timer handle is exported by name in QHTML runtime scope.
- On host re-render/unmount, runtime-managed keyword timers for that host are cleared and re-created from current declarations.

Recommendation: use unique timer names per host to avoid handle collisions.

### `q-canvas` (keyword-level canvas)

`q-canvas` declares a named canvas element and exports that handle by name:

```qhtml
q-canvas myCanvas {
  width: 320
  height: 180
}

button {
  text { Draw }
  onclick {
    myCanvas.context.clearRect(0, 0, 320, 180);
    myCanvas.context.fillStyle = "rgba(16,185,129,0.9)";
    myCanvas.context.fillRect(20, 20, 120, 80);
  }
}
```

Notes:

- `q-canvas <name>` exports the canvas handle as a named runtime object.
- `<name>.context` points to the `2d` rendering context for that specific canvas.
- Canvas rendering can be timer-driven or signal-driven.

### `particle-emitter` (canvas-backed particle effects)

`particle-emitter` is the native custom element registered by QHTML7. It can be declared directly in QHTML without any extra JavaScript file.

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
    emitRate: 84
    lifetime: 3600
    lifetimeVariation: 900
    x: 210
    y: 214
    xVariation: 145
    yVariation: 8
    xVelocity: 0.35
    yVelocity: -1.25
    xVelocityVariation: 0.45
    yVelocityVariation: 0.4
    xAcceleration: 0.015
    yAcceleration: -0.018
    startSize: 10
    endSize: 30
    startOpacity: 0.35
    endOpacity: 0.02
    maxActiveParticles: 96
    running: false
    interval: 18
    src: "tools/assets/particle.png"
    emitterMask: "tools/assets/particle-mask-star.svg"
  }
}

button { text { Start } onclick { document.querySelector("#energy-emitter").running = true; } }
button { text { Stop } onclick { document.querySelector("#energy-emitter").running = false; } }
button { text { Burst } onclick { document.querySelector("#energy-emitter").burst(210, 120, 24); } }
```

Useful attributes:

- `emitRate`: particles created per second while `running` is true.
- `running`: boolean emission switch.
- `lifetime` / `lifetimeVariation`: how long each particle lives, in milliseconds.
- `x`, `y`, `xVariation`, `yVariation`: spawn origin and randomized spawn spread inside the emitter container.
- `xVelocity`, `yVelocity`, `xAcceleration`, `yAcceleration`: per-frame movement controls.
- `startSize`, `endSize`, `startOpacity`, `endOpacity`: interpolation values over each particle lifetime.
- `maxActiveParticles`: maximum simultaneous particles.
- `src`, `mask`, `color`, `colorOpacity`: sprite source, optional per-particle alpha mask, and tint color.
- `emitterMask`: optional emitter-area alpha mask.

Useful methods:

- `start()` / `stop()`: toggles continuous emission.
- `clear()`: removes current particles and pending bursts.
- `burst(x, y, num)`: queues `num` particles emitted at the current emit rate from the supplied origin.

## 6. Styles and Themes

`q-style` + `q-theme` are the preferred styling model for new code.

### Basic reusable style

```qhtml
q-style panel {
  backgroundColor: #eff6ff
  color: #1e293b
  border: 1px solid #93c5fd
  padding: 16px
}
```

### Apply style directly in selector chain

```qhtml
panel,div { text { Styled panel } }
```

### Use `q-style-class` for utility-class composition

`q-style-class` lets a style definition add CSS classes and inline properties together.

```qhtml
q-style card-shell {
  q-style-class { w3-card w3-round-large w3-padding }
  borderColor: #cbd5e1
}
```

Notes:

- `q-style-class` merges class names into the element `class` attribute.
- Inline `q-style` declarations are still applied via `style=""`.
- If both class CSS and inline declarations target the same property, inline wins.

### Theme maps selectors to styles

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

Theme rules can also include anonymous `q-style { ... }` blocks when the style is only used by that selector:

```qhtml
q-theme article-theme {
  h3 { q-style { color: #1d4ed8 } }
  .summary { q-style { color: #334155 } }
}
```

### `q-default-theme` fallback layer

`q-default-theme` is a fallback theme. It applies first, and any conflicting `q-theme` rules in scope replace it.

```qhtml
q-style panel-base { backgroundColor: #eef3fb color: #0f172a }
q-style panel-override { backgroundColor: #ffedd5 color: #7c2d12 }

q-default-theme card-theme {
  .card { panel-base }
}

q-theme card-demo-theme {
  card-theme { }
  .card { panel-override }
}
```

### Compose themes

```qhtml
q-theme base-theme {
  button { q-style { padding: 10px 14px; borderRadius: 8px; } }
}

q-theme admin-theme {
  base-theme { }
  .danger { q-style { color: #b91c1c } }
}
```

### `q-transition` + `q-style-transition`

`q-transition` defines a named CSS transition recipe, and `q-style-transition` attaches one or more transition recipes to a style.

```qhtml
q-transition fade-in {
  property { opacity }
  delay { 50 }
  timing { ease-in-out }
  duration { 300 }
}

q-style panel-style {
  q-style-transition { fade-in }
}

q-theme app-theme {
  .panel { panel-style }
}
```

Notes:

- `timing` accepts CSS timing-function values directly.
- Numeric `duration` / `delay` values are interpreted as milliseconds.
- Multiple transition references can be listed in `q-style-transition` and are combined into a comma-separated CSS `transition` value.

### `q-painter` + paint hooks

`q-painter` defines a named paint worklet body using declarative `q-property` defaults plus an `onpaint { ... }` block.

```qhtml
q-painter panel-painter {
  q-property fill: "rgba(40,80,160,0.9)"
  onpaint {
    this.fillStyle = this.fill;
    this.fillRect(0, 0, this.width, this.height);
  }
}

q-style panel-style {
  width: 84px
  height: 26px
  q-style-painter {
    background { panel-painter }
  }
}

panel-style,div { text { Painted } }
```

`q-style-painter` supports semantic slots:

- `background { painterName }` -> `background-image: paint(...)`
- `border { painterName }` -> `border-image-source: paint(...)`
- `mask { painterName }` -> `mask-image` / `-webkit-mask-image`

Notes:

- Painter names are resolved by QHTML scope/context, then registered with internally unique worklet names.
- `q-property` entries in `q-painter` are exposed to `onpaint` as `this.<property>`.
- If `CSS.paintWorklet` is unavailable, QHTML skips painter attachment.

## 7. `q-script`

`q-script {}` runs JavaScript and replaces itself with the returned value:

- If the return looks like QHTML, it is parsed as QHTML.
- Otherwise, it becomes a text node.

### Inline replacement

```qhtml
div {
  q-script { return "p { text { Inserted by q-script } }"; }
}
```

### Assignment form

```qhtml
div {
  data-note: q-script { return "n:" + (4 + 1) }
  text { q-script { return "script-inline"; } }
}
```

## 8. `${expression}` inline expressions

`${expression}` is inline expression syntax for string content.

- It resolves when the final HTML string value is rendered.
- It is not a watcher by itself.
- Re-evaluation is explicit.

### Works in rendered text/attribute strings

```qhtml
q-var currentUser { "Ada" }

div {
  title: "Current user: ${currentUser}"
  text { Hello ${currentUser} }
}
```

### Cannot be used for keyword-level symbols

```qhtml
${tagName} { text { hi } }         // invalid
q-keyword ${alias} { div }         // invalid
```

## 9. Signals and Events

DOM event handlers use `on<event>` blocks. The handler runs with the rendered DOM element as `this` and receives the browser event as `event`.

```qhtml
button {
  text { Click me }
  onclick {
    this.textContent = "Clicked";
  }
}
```

`q-signal name { ... }` defines a named signal-style event shape. Calling the signal syntax dispatches a DOM `CustomEvent` with slot payload data.

```qhtml
q-signal menuItemClicked {
  slot { itemId }
}

div {
  menuItemClicked { itemId { A } }
  p { text { signal-syntax-ok } }
}
```

Use direct DOM events for normal browser interaction and `q-signal` when QHTML source needs to describe a reusable event payload shape.

## 10. Imports and Requirements

`q-import { ... }` includes another QHTML file before the current source is rendered. `q-require { ... }` is available for required resource-style dependencies.

```qhtml
q-import { ./shared/theme.qhtml }

main-theme {
  section { text { Imported theme available } }
}
```

Imports are resolved relative to the host page URL unless the path is absolute.

## 11. QHTMLDomTree API

QHTML7 uses the WebAssembly-backed `QHTMLDomTree` object as the source-of-truth document model.

The common flow is:

1. Create a tree.
2. Load QHTML source with `.fromQHTML(source)`.
3. Read or mutate the QHTML node tree.
4. Serialize with `.toQHTML()`, `.toHTML()`, `.toJSON()`, or `.toJSONText()`.
5. Load serialized state with `.fromJSON(value)`, `.fromJSONText(text)`, or `.fromQHTML(source)`.

```html
<script src="/dist/qhtml.js"></script>
<script>
document.addEventListener("QHTML7Ready", function () {
  const tree = new QHTML7.Module.QHTMLDomTree();
  tree.fromQHTML('section { h2 { text { Hello } } }');

  const html = tree.toHTML();
  const qhtml = tree.toQHTML();
  const json = tree.toJSON();

  console.log(html, qhtml, json);
});
</script>
```

### Serialize / Deserialize

```js
const tree = new QHTML7.Module.QHTMLDomTree();
tree.fromQHTML('ul { li { text { One } } }');

const jsonText = tree.toJSONText();
const next = new QHTML7.Module.QHTMLDomTree();
next.fromJSONText(jsonText);

console.log(next.toQHTML());
```

### Child traversal

Every QHTMLDomNode-based object exposes child helpers from the WebAssembly side.

```js
const tree = new QHTML7.Module.QHTMLDomTree();
tree.fromQHTML('q-layout { q-row { q-col { text { Cell } } } }');

const children = tree.childList();
const layouts = tree.findChildrenByType('QHTMLLayout');
```

Useful node methods include:

- `.childList()`
- `.childCount()`
- `.childAt(index)`
- `.findChildrenByType(typeName)`
- `.sourceQHTML()` / `.toQHTML()`
- `.renderHtml()` / `.toHTML()` where available
- `.setPropertyText(name, value)` for WebAssembly-side property assignment updates

### Host helpers

Mounted `<q-html>` elements expose high-level helpers that use the same QHTMLDomTree internally.

```js
const host = document.querySelector('q-html');
host.fromQHTML('div { text { Replaced source } }');
console.log(host.toHTML());
console.log(host.toQHTML());
```

For SEO/static output, `QHTMLDomTree.toHTML()` can be used to generate HTML from QHTML source, and `tools/roller.html` can process local HTML files containing `<q-html>` blocks.

## 12. Builder and Editor

- `test/demo.html` is the QHTML7 usage gallery.
- `tools/layout-builder.html` is a visual layout editor for `q-layout`, `q-row`, and `q-col` trees.
- `tools/page-builder.html` embeds the layout editor with a page-building shell and palette.
- `<q-editor>` supports authoring live QHTML and previewing output.

### `<q-editor>` (inline QHTML source)

`<q-editor>` takes QHTML as literal text content, not nested `<q-html>`.

```html
<q-editor>
  h3 { text { Hello from q-editor } }
</q-editor>
```

### Layout builder files

The layout builder is split into shared files:

```text
tools/layout-builder.html
tools/layout-builder/main.qhtml
tools/layout-builder/main.js
```

The page builder imports the same layout editor and adds page-builder files:

```text
tools/page-builder.html
tools/page-builder/palette.qhtml
tools/page-builder/palette.js
```

## 13. Debug Tips

```js
window.QHTML_RUNTIME_DEBUG = true;
```

Wait for QHTML7 runtime readiness before calling WebAssembly APIs directly:

```js
document.addEventListener("QHTML7Ready", function (event) {
  console.log(event.detail.Module);
});
```

Mounted documents dispatch `QHTMLContentLoaded` after QHTML content has been processed:

```js
document.addEventListener("QHTMLContentLoaded", function () {
  console.log("QHTML content loaded");
});
```

### `q-logger` (scoped debug logging)

`q-logger` attaches a scoped runtime logger to the current QHTML node.

```qhtml
q-logger { q-signal q-property }
q-property count: 0
q-signal ping(value)
```

Supported category names include:

- `q-property`
- `q-signal`
- `function`
- `slot`
- `model`
- `instantiation`
- `all`

QHTML7 logging is primarily intended for runtime-node debugging. It is safe to remove `q-logger` blocks from production source.

## 14. Escape sequences

### Escaping `{` and `}` in block content

Use `\{` and `\}` when you want literal braces inside block bodies.

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

QHTML7 is a WebAssembly-first project. The JavaScript files in `js/` and generated files in `dist/` bridge the browser APIs that cannot be owned by WebAssembly directly, but parsing, document state, and runtime object behavior should stay in the C++ WebAssembly implementation whenever practical.

Do not edit generated `dist/*.js` files directly. Modify source files under `js/` or the WebAssembly source, then run:

```bash
source /home/mike/build/emsdk/emsdk_env.sh
./build-release.sh
```
