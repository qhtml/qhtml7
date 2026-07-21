(function (globalScope) {
  const QHTML_VERSION = "4.3.22";
  globalScope.QHTML_VERSION = QHTML_VERSION;
})(typeof globalThis !== "undefined" ? globalThis : window);

var Module;

(function () {
  "use strict";

  const globalScope = typeof globalThis !== "undefined" ? globalThis : window;
  const currentScript = document.currentScript;
  const QHTML_VERSION = String(globalScope.QHTML_VERSION || "4.3.7");

  if (!currentScript || !currentScript.src) {
    throw new Error("qhtml-wasm.js must be loaded from a script URL");
  }

  const base = new URL(".", currentScript.src).href;

  function qhtmlVersionQuery() {
    const value = String(QHTML_VERSION || "").trim();
    return value ? "v" + value.replace(/^v/i, "") : "";
  }

  function versionedUrl(src) {
    const text = String(src || "");
    const version = qhtmlVersionQuery();
    if (!version || text.includes("?" + version) || text.includes("&" + version)) {
      return text;
    }
    const hashIndex = text.indexOf("#");
    const beforeHash = hashIndex >= 0 ? text.slice(0, hashIndex) : text;
    const hash = hashIndex >= 0 ? text.slice(hashIndex) : "";
    return beforeHash + (beforeHash.includes("?") ? "&" : "?") + version + hash;
  }

  function isWasmPath(path) {
    return String(path || "").split(/[?#]/, 1)[0].endsWith(".wasm");
  }

  if (globalScope.QHTML_ENTRYPOINT_EXECUTED !== true &&
      globalScope.QHTML_JS_ENTRYPOINT_EXECUTED !== true) {
    const entryScript = document.createElement("script");
    entryScript.src = versionedUrl(base + "qhtml.js");
    entryScript.async = false;
    entryScript.onerror = () => {
      throw new Error("qhtml-wasm.js direct load failed to delegate to qhtml.js");
    };
    if (currentScript.parentNode) {
      currentScript.parentNode.removeChild(currentScript);
    }
    document.head.appendChild(entryScript);
    return;
  }

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

  async function loadWasmBinary() {
    const response = await fetch(base + "qhtml7-wasm.wasm", {
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) {
      throw new Error("Failed to load qhtml7-wasm.wasm: " + response.status + " " + response.statusText);
    }
    return response.arrayBuffer();
  }

  async function boot() {
    await loadScript(versionedUrl(base + "qhtml7-wasm.js"));

    const wasmBinary = await loadWasmBinary();
    const qtModule = await resolveFactory()({
      wasmBinary,
      locateFile(path) {
        if (isWasmPath(path)) {
          const cleanPath = String(path || "").split(/[?#]/, 1)[0];
          return new URL(cleanPath || "qhtml7-wasm.wasm", base).href;
        }
        return versionedUrl(base + path);
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

    await loadScript(versionedUrl(base + "qhtml-element.js"));

    document.dispatchEvent(new CustomEvent("QHTML7Ready", {
      detail: { Module: qtModule, QHTML7: globalScope.QHTML7 }
    }));

    return globalScope.QHTML7;
  }

  globalScope.QHTML7Ready = boot();
})();
