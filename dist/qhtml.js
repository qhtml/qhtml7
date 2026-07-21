(function (globalScope) {
  const QHTML_VERSION = "4.3.17";
  globalScope.QHTML_VERSION = QHTML_VERSION;
})(typeof globalThis !== "undefined" ? globalThis : window);

(function () {
  "use strict";

  const globalScope = typeof globalThis !== "undefined" ? globalThis : window;
  const currentScript = document.currentScript;
  if (!currentScript || !currentScript.src) {
    throw new Error("qhtml.js must be loaded from a script URL");
  }

  const base = new URL(".", currentScript.src).href;
  const QHTML_VERSION = String(globalScope.QHTML_VERSION || "4.3.7");
  const QHTML_LOADING_INDICATOR_ATTRIBUTE = "data-qhtml-loading-indicator";

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

  const qhtml6Url = versionedUrl(new URL("qhtml6/qhtml.js", base).href);
  const qhtml7Url = versionedUrl(new URL("qhtml-wasm.js", base).href);
  let qhtml6Promise = null;
  let qhtml7Promise = null;

  globalScope.QHTML_ENTRYPOINT_EXECUTED = true;
  globalScope.QHTML_JS_ENTRYPOINT_EXECUTED = true;
  globalScope.QHTML_SCRIPT_BASE = base;
  globalScope.QHTML7_SCRIPT_BASE = base;
  globalScope.QHTML6_SCRIPT_URL = globalScope.QHTML6_SCRIPT_URL || qhtml6Url;

  function ensureQHTMLLoadingStyle() {
    if (document.querySelector("style[data-qhtml-loading-style]") || !document.head) {
      return;
    }
    const style = document.createElement("style");
    style.setAttribute("data-qhtml-loading-style", "1");
    style.textContent = [
      "@keyframes qhtml-loading-spin{to{transform:rotate(360deg)}}",
      "[data-qhtml-loading-indicator]{display:inline-grid;place-items:center;min-width:48px;min-height:48px;margin:8px;color:#2563eb}",
      "[data-qhtml-loading-indicator] svg{display:block;animation:qhtml-loading-spin 840ms linear infinite;filter:drop-shadow(0 8px 18px rgba(37,99,235,0.20))}",
      "@media (prefers-reduced-motion: reduce){[data-qhtml-loading-indicator] svg{animation:none!important}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function createQHTMLLoadingIndicator() {
    const indicator = document.createElement("span");
    indicator.setAttribute(QHTML_LOADING_INDICATOR_ATTRIBUTE, "1");
    indicator.setAttribute("aria-live", "polite");
    indicator.setAttribute("aria-label", "Loading QHTML");
    indicator.innerHTML = [
      '<svg viewBox="0 0 50 50" width="34" height="34" role="img" aria-hidden="true">',
      '<circle cx="25" cy="25" r="20" fill="none" stroke="rgba(15, 23, 42, 0.14)" stroke-width="5"></circle>',
      '<path d="M45 25a20 20 0 0 1-20 20" fill="none" stroke="#2563eb" stroke-linecap="round" stroke-width="5"></path>',
      '</svg>'
    ].join("");
    return indicator;
  }

  function insertQHTMLLoadingIndicators() {
    ensureQHTMLLoadingStyle();
    document.querySelectorAll("q-html,q-html7,q-html6").forEach((item) => {
      const previous = item.previousElementSibling;
      if (previous && previous.hasAttribute(QHTML_LOADING_INDICATOR_ATTRIBUTE)) {
        return;
      }
      if (item.parentNode) {
        item.parentNode.insertBefore(createQHTMLLoadingIndicator(), item);
      }
    });
  }

  function removeQHTMLLoadingIndicators() {
    document.querySelectorAll(`[${QHTML_LOADING_INDICATOR_ATTRIBUTE}]`).forEach((indicator) => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    });
    const style = document.querySelector("style[data-qhtml-loading-style]");
    if (style && style.parentNode) {
      style.parentNode.removeChild(style);
    }
  }

  document.addEventListener("QHTMLContentLoaded", removeQHTMLLoadingIndicators);

  (function hideUnprocessedQHTMLHosts() {
    const hidden = new WeakSet();
    const hideHosts = function () {
      insertQHTMLLoadingIndicators();
      document.querySelectorAll("q-html,q-html7,q-html6").forEach((item) => {
        hidden.add(item);
        item.style.display = "none";
      });
    };
    if (document.readyState === "loading" && !document.body) {
      document.addEventListener("DOMContentLoaded", hideHosts, { once: true });
    } else {
      hideHosts();
    }
    document.addEventListener("QHTMLContentLoaded", function restoreQHTMLHosts() {
      document.querySelectorAll("q-html,q-html7,q-html6").forEach((item) => {
        if (hidden.has(item)) {
          item.style.removeProperty("display");
        }
      });
    });
  })();

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts || []).find((script) => script.src === src);
      if (existing && existing.__qhtmlLoadComplete === true) {
        resolve(existing);
        return;
      }
      if (existing && existing.__qhtmlLoadPromise) {
        existing.__qhtmlLoadPromise.then(() => resolve(existing), reject);
        return;
      }

      const script = existing || document.createElement("script");
      script.async = false;
      script.__qhtmlLoadPromise = new Promise((innerResolve, innerReject) => {
        script.onload = function onQHTMLScriptLoaded() {
          script.__qhtmlLoadComplete = true;
          innerResolve(script);
        };
        script.onerror = function onQHTMLScriptError() {
          innerReject(new Error("Failed to load " + src));
        };
      });
      script.__qhtmlLoadPromise.then(resolve, reject);
      if (!existing) {
        script.src = src;
        document.head.appendChild(script);
      }
    });
  }

  function loadQHTML6() {
    if (!qhtml6Promise) {
      qhtml6Promise = loadScript(versionedUrl(globalScope.QHTML6_SCRIPT_URL || qhtml6Url));
    }
    return qhtml6Promise;
  }

  function loadQHTML7() {
    if (!qhtml7Promise) {
      qhtml7Promise = loadScript(qhtml7Url);
    }
    return qhtml7Promise;
  }

  function routeAll() {
    const needsQHTML6 = document.querySelector("q-html6") !== null;
    const needsQHTML7 = document.querySelector("q-html,q-html7") !== null;

    const loads = [];
    if (needsQHTML6) {
      loads.push(loadQHTML6());
    }
    if (needsQHTML7) {
      loads.push(loadQHTML7());
    }

    return Promise.all(loads);
  }

  const start = () => {
    const hasQHTMLHosts = document.querySelector("q-html,q-html7,q-html6") !== null;
    insertQHTMLLoadingIndicators();
    globalScope.QHTMLReady = routeAll();
    if (!hasQHTMLHosts && globalScope.QHTMLReady && typeof globalScope.QHTMLReady.finally === "function") {
      globalScope.QHTMLReady.finally(removeQHTMLLoadingIndicators);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
