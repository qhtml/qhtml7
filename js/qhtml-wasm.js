var Module;

(function () {
  "use strict";

  const globalScope = typeof globalThis !== "undefined" ? globalThis : window;
  const currentScript = document.currentScript;
  const QHTML_VERSION = "v7.3.3";

  if (!currentScript || !currentScript.src) {
    throw new Error("qhtml-wasm.js must be loaded from a script URL");
  }

  const base = new URL(".", currentScript.src).href;

  if (globalScope.QHTML7Ready) {
    return;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(script);
    });
  }

  function resolveFactory() {
    const names = [
      "qhtml7_wasm_entry",
      "qhtml7_entry",
      "qhtml7_glue",
      "qhtml_qt_entry",
      "createQHTML7Module"
    ];

    for (const name of names) {
      if (typeof globalScope[name] === "function") {
        return globalScope[name];
      }
    }

    throw new Error("qhtml7-wasm.js did not register a QHTML7 module factory");
  }

  async function boot() {
    await loadScript(base + "qhtml7-wasm.js");

    const qtModule = await resolveFactory()({
      locateFile(path) {
        if (path === "qhtml7-wasm.wasm" || path.endsWith(".wasm")) {
          return base + "qhtml7-wasm.wasm";
        }
        return base + path;
      }
    });

    Module = qtModule;
    globalScope.Module = qtModule;
    globalScope.QtWasm = qtModule;
    globalScope.QHTML_VERSION = QHTML_VERSION;
    globalScope.QHTML7 = Object.assign(globalScope.QHTML7 || {}, {
      Module: qtModule,
      QHTML_VERSION,
      qhtmlVersion: QHTML_VERSION,
      version: QHTML_VERSION
    });

    await loadScript(base + "qhtml-element.js");

    document.dispatchEvent(new CustomEvent("QHTML7Ready", {
      detail: { Module: qtModule, QHTML7: globalScope.QHTML7 }
    }));

    return globalScope.QHTML7;
  }

  globalScope.QHTML7Ready = boot();
})();
