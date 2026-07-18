# QHTML7 - v7.3.8

QHTML7 is a declarative UI language for building HTML, custom elements, reusable components, themed interfaces, signals, slots, data-driven loops, layouts, and component libraries with a compact block syntax.

It is designed around a simple idea: describe the interface as a tree of objects, let named objects become reusable, and keep component structure readable enough that the source still feels like the UI.

All of the code was written using ChatGPT's codex combined with a massive number of detailed prompts (you can read them in language/qhtml7.txt)

```html
<script src="/dist/qhtml.js"></script>

<q-html>
  div.app-shell {
    h1 { text { Hello QHTML7 } }
    p  { text { Declarative components, styles, signals, slots, and data. } }
  }
</q-html>
```

This README focuses on the language surface and declarative runtime behavior. It intentionally avoids implementation internals.

## Highlights

- HTML-like output from a compact block syntax.
- Selector shorthand for tags, IDs, classes, and nested selector chains.
- Reusable `q-component` definitions with slots, properties, functions, signals, and inheritance.
- Declarative `for (item in collection)` loops over JSON-like arrays.
- JSON-style object and array literals in properties.
- Named `q-style`, scoped `q-theme`, overridable `q-default-theme`, and inline `style { ... }`.
- Declarative layout primitives: `q-layout`, `q-row`, and `q-col`.
- Event handlers and lifecycle hooks such as `onclick`, `onready`, and `on<signal>`.
- `q-connect` for wiring signals to functions.
- `q-import` and `q-require` for composing QHTML files.
- Paint hooks for declarative custom backgrounds, borders, and masks.
- Component-library patterns such as `q-tabs`, `q-form-*`, and reusable themed controls.

## Quick Start

### Installation

Copy the contents of `dist/` to the `dist/` directory on your web server, then include the QHTML entry point in any page that uses QHTML:

```html
<script src="/dist/qhtml.js"></script>
```

The entry point loads the QHTML7 WebAssembly runtime and compatibility routing files from the same `dist/` directory.

### Developer Tools

The layout builder and page builder share the same QHTML7 layout editor module. The reusable QHTML is in `tools/layout-builder/main.qhtml`, the editor logic is in `tools/layout-builder/main.js`, and `tools/page-builder.html` embeds that editor with the QHTML7 palette from `tools/page-builder/palette.qhtml` and `tools/page-builder/palette.js`.

Load the QHTML runtime, then place QHTML inside a `<q-html>` element.

```html
<!doctype html>
<html>
<head>
  <script src="/dist/qhtml.js"></script>
</head>
<body>
  <q-html>
    h1 { text { Product Card } }
    p  { text { Rendered from QHTML7 source. } }
  </q-html>
</body>
</html>
```

QHTML blocks render into normal DOM elements. `text { ... }` escapes text content; `html { ... }` inserts raw HTML.

```qhtml
div.card {
  text { plain text }
}

div.raw {
  html { <strong>trusted HTML</strong> }
}
```

Use `html { ... }` only when the content is trusted.

## Core Syntax

### Elements

Anonymous element blocks use the tag name followed by `{ ... }`.

```qhtml
section {
  h2 { text { Overview } }
  p  { text { A readable UI tree. } }
}
```

### IDs And Classes

Use CSS-like shorthand directly on element names.

```qhtml
div#main.card.featured {
  h2.title { text { Main Panel } }
}
```

This renders a `div` with `id="main"` and classes `card featured`.

### Selector Chains

Comma chains create nested elements.

```qhtml
div,section,article,h3 {
  text { Nested headline }
}
```

This is equivalent to:

```html
<div><section><article><h3>Nested headline</h3></article></section></div>
```

Chains are useful for compact structure, but named component instances should be declared separately instead of being buried inside anonymous chains.

### Attributes And Properties On DOM Elements

Simple assignments inside DOM blocks become attributes.

```qhtml
button.primary {
  type: "button"
  aria-label: "Save changes"
  text { Save }
}
```

Inline `style { ... }` creates a local QHTML style object and applies it to that parent element.

```qhtml
div.notice {
  style {
    border: 1px solid #93c5fd;
    background: #eff6ff;
    padding: 12px;
  }

  text { Saved successfully. }
}
```

## Components

Define a component with `q-component`, then instantiate it by using its name as a QHTML type.

```qhtml
q-component user-card {
  q-property name: "Anonymous"

  article.user-card {
    h3 { text { ${this.name} } }
    slot actions { text { No actions } }
  }
}

user-card adaCard {
  name: "Ada"

  actions {
    button { text { Message } }
  }
}
```

Component instances become custom elements in the DOM and can be styled or queried like other elements.

### Properties

`q-property` declares component state and defaults.

```qhtml
q-component metric-card {
  q-property label: "Requests"
  q-property value: 0
  q-property unit: "ms"

  div.metric {
    span.metric-label { text { ${this.label} } }
    strong { text { ${this.value}${this.unit} } }
  }
}

metric-card latency {
  label: "Latency"
  value: 42
}
```

Instance assignments override defaults:

```qhtml
metric-card apiLatency {
  value: 128
}
```

### JSON-Like Data

Arrays and objects can be declared in properties.

```qhtml
q-component product-list {
  q-property products: [
    { name: "Desk Mat", price: 22.50 },
    { name: "Travel Bottle", price: 29.00 }
  ]

  ul {
    for (product in products) {
      li {
        text { ${product.name} - $${product.price} }
      }
    }
  }
}
```

Object keys can be used from loops with dotted interpolation paths such as `${product.name}` and `${product.price}`.

### Component Inheritance

Components can inherit properties, functions, and signals from other component definitions with `extends`.

```qhtml
q-component base-button {
  q-property label: "Button"
  q-signal activated(label)

  function activate() {
    this.activated(this.label);
  }
}

q-component danger-button extends base-button {
  label: "Delete"
}

danger-button deleteAction { }
```

Multiple bases are allowed:

```qhtml
q-component icon-danger-button extends icon-button, danger-button {
  label: "Remove"
}
```

Inheritance is intentionally narrow: it inherits `q-property`, `function`, and `q-signal` members. The child component's own declarations and matching property assignments override inherited defaults in source order.

## Slots

Slots let component instances inject QHTML into named positions.

```qhtml
q-component panel {
  section.panel {
    header { slot title { text { Untitled } } }
    div.panel-body { slot body { text { Empty } } }
  }
}

panel settingsPanel {
  title { h2 { text { Settings } } }
  body  { p { text { Configure the application. } } }
}
```

Use slots for reusable components that own layout but let the caller provide content.

## Functions, Signals, And Events

Functions declared inside components become callable methods on instances.

```qhtml
q-component notifier {
  q-property message: "Ready"

  function announce() {
    console.log(this.message);
  }
}

notifier appNotifier {
  message: "Loaded"
}
```

Signals define component-level events.

```qhtml
q-component task-row {
  q-property label: "Task"
  q-signal completed(label)

  button {
    text { Complete ${this.label} }
    onclick {
      this.completed(this.label);
    }
  }
}
```

Handle signals with `on<signal>`:

```qhtml
task-row item1 {
  label: "Build README"

  oncompleted(label) {
    console.log("Done:", label);
  }
}
```

DOM event handlers use the same `on...` block shape:

```qhtml
button {
  text { Click me }

  onclick(event) {
    this.textContent = "Clicked";
  }
}
```

Lifecycle hooks are also declarative:

```qhtml
q-component ready-card {
  onready {
    this.classList.add("is-ready");
  }

  div { text { Ready } }
}
```

See `test/04.html` for signal-focused examples, including `q-signal`, `on<signal>`, and `q-connect`.

## Connecting Objects

`q-connect` wires a signal to a function declaratively.

```qhtml
q-component sender {
  q-signal sent(message)

  function sendNow() {
    this.sent("hello");
  }
}

q-component receiver {
  function accept(message) {
    this.querySelector(".out").textContent = message;
  }

  div.out { text { waiting } }
}

sender source { }
receiver target { }

q-connect { source.sent target.accept }
```

Dot paths and `this` paths are supported where the named objects are in scope.

## Declarative Loops

Loops generate repeated QHTML from an array-like property.

```qhtml
q-component number-list {
  q-property numbers: [1, 2, 3, 4]

  ul {
    for (num in numbers) {
      li { text { ${num} } }
    }
  }
}

number-list { }
```

Loops can instantiate components:


See `test/05.html` for a loop-driven component stress example using `for (...)`, properties, and property animation.

## Styling

### Named Styles

`q-style` defines a reusable style object.

```qhtml
q-style card-surface {
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  padding: 16px;
}

card-surface {
  div { text { Styled card } }
}
```

Styles can include framework classes using `q-style-class`.

```qhtml
q-style toolbar-row {
  q-style-class { w3-row w3-padding }
  gap: 8px;
}
```

### Themes

`q-theme` maps selectors to styles.

```qhtml
q-style title-style {
  color: #1d4ed8;
  font-weight: 800;
}

q-style body-style {
  color: #334155;
  line-height: 1.5;
}

q-theme article-theme {
  h2 { title-style }
  p  { body-style }
}

article-theme {
  article {
    h2 { text { Themed title } }
    p  { text { Themed body copy. } }
  }
}
```

### Default Themes

`q-default-theme` is for reusable components. It provides component defaults that can be overridden by an applied `q-theme`.

```qhtml
q-default-theme card-defaults {
  .card {
    q-style {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 12px;
    }
  }
}

q-component card {
  card-defaults {
    div.card {
      slot { default }
    }
  }
}
```

### Theme Composition

Themes can pull in other themes.

```qhtml
q-theme dark-theme {
  body {
    q-style {
      background: #0f172a;
      color: #f8fafc;
    }
  }
}

q-theme dashboard-theme {
  dark-theme { }

  .panel {
    q-style {
      border-color: #334155;
    }
  }
}
```

Inside `q-theme`, treating another theme like a child imports that theme's selector rules into the parent. `q-child-theme { otherTheme }` is also supported.

### Inline Anonymous Styles

Inline style objects are supported inside themes and elements:

```qhtml
q-theme compact-theme {
  .row {
    q-style {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  }
}

div {
  style {
    max-width: 720px;
    margin: 0 auto;
  }
}
```

## Layout

QHTML includes simple flex layout primitives.

```qhtml
q-layout {
  width: 80vw
  height: 480px
  gap: 12px

  q-row {
    div { text { Left } }

    q-col {
      div { text { Top right } }
      div { text { Bottom right } }
    }
  }
}
```

- `q-layout` is the parent layout container.
- `q-row` arranges children horizontally.
- `q-col` arranges children vertically.
- Layout children fill available space by default.
- `width`, `height`, `gap`, `padding`, `margin`, `alignItems`, `justifyContent`, `overflow`, and `flex` can be assigned declaratively.

## Imports

Use `q-import` or `q-require` to compose `.qhtml` files.

```qhtml
q-import { ../dist/q-components.qhtml }
q-require { ./components/base-controls.qhtml }
```

Use `q-import` for normal composition and `q-require` when the imported source must be available before parsing continues.

Relative paths are resolved from the file that contains the import. If `components/base.qhtml` imports `./button.qhtml`, that nested path resolves relative to `components/base.qhtml`, not the original page.

Cache hints are supported:

```qhtml
q-import { ./components/widgets.qhtml cache }
q-import { ./components/live.qhtml nocache }
```



## Timers And Property Animation

Timers are declarative objects with a built-in timeout signal.

```qhtml
q-timer pulseTimer {
  interval: 400
  running: true
  repeat: true

  ontimeout {
    console.log("pulse");
  }
}
```

Property animations declare a target, property, timing, and lifecycle handlers.

```qhtml
q-property-animation widthAnim {
  target: this
  property: "width"
  duration: 1400
  steps: 120
  easing: "linear"
  from: 84
  to: 520
  running: false

  onended {
    this.start();
  }
}
```

`test/05.html` shows this pattern in a loop-generated animation test.

## Paint Hooks

Components can declare custom paint hooks:

```qhtml
q-component painted-card {
  q-property fill: "#2563eb"
  q-property radius: 12
  q-property paintvars: [this.fill, this.radius]

  onPaintBackground(paintvars) {
    this.setFill(fill);
    this.drawRoundRect(0, 0, width, height, radius);
  }

  div {
    text { Painted background }
  }
}
```

Supported paint hooks:

- `onPaintBackground(properties)`
- `onPaintBorder(properties)`
- `onPaintMask(properties)`

The `properties` argument should reference a property containing the values exposed to the paint handler.

## Selector Helper In Handlers

Event and function bodies can use `$()` as a compact selector helper.

```qhtml
q-component filter-panel {
  button {
    text { Activate }

    onclick {
      $("#status").textContent = "Active";
      $(".row", function (row) {
        row.classList.add("selected");
      });
    }
  }

  div#status { text { Waiting } }
}
```

- `$("#id")` returns the first matching element.
- `$(".class", fn)` and other selector forms can iterate matches when a callback is provided.

## Language Cheat Sheet

```qhtml
/* DOM */
div#id.class { text { hello } }
div,span,strong { text { nested } }
html { <b>raw</b> }

/* Components */
q-component name { ... }
q-component child extends base { ... }
name instanceName { prop: "value" }

/* Properties and data */
q-property count: 1
q-property rows: [{ label: "A" }, { label: "B" }]

/* Slots */
slot title { text { Default title } }
title { h2 { text { Custom title } } }

/* Loops */
for (row in rows) {
  div { text { ${row.label} } }
}

/* Styles and themes */
q-style surface { padding: 12px; }
q-theme appTheme { .card { surface } }
q-default-theme defaults { .card { surface } }
style { color: red; }

/* Signals and handlers */
q-signal saved(id)
onsaved(id) { console.log(id); }
onclick(event) { this.classList.toggle("active"); }
q-connect { source.saved target.handleSaved }

/* Layout */
q-layout { q-row { q-col { div { text { cell } } } } }

/* Imports */
q-import { ./components.qhtml }
q-require { ./base.qhtml }
```

## Example Files

The current test pages are useful as focused feature references:

- `test/04.html`: signals, lifecycle hooks, `q-connect`, and event binding patterns.
- `test/05.html`: declarative arrays, `for` loops, component instantiation inside loops, and property animation.

## Design Direction

QHTML7 is moving toward a small set of composable declarative primitives:

- Components own structure.
- Properties own state.
- Slots own extension points.
- Signals own communication.
- Themes own presentation.
- Loops own repeated structure.
- Imports own composition across files.

The result is a language that keeps reusable UI definitions compact while still rendering to ordinary HTML and custom elements.
