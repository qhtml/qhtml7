(function () {
  "use strict";

  const globalScope = typeof globalThis !== "undefined" ? globalThis : window;
  const currentScript = document.currentScript;
  if (!currentScript || !currentScript.src) {
    throw new Error("qhtml.js must be loaded from a script URL");
  }

  const base = new URL(".", currentScript.src).href;
  const qhtml6Url = new URL("qhtml6/qhtml.js", base).href;
  const qhtml7Url = new URL("qhtml-wasm.js", base).href;
  const routedQHTML6Hosts = new WeakSet();
  let qhtml6Promise = null;
  let qhtml7Promise = null;
  let qhtml6ValidationInstalled = false;

  globalScope.QHTML_ENTRYPOINT_EXECUTED = true;
  globalScope.QHTML_JS_ENTRYPOINT_EXECUTED = true;
  globalScope.QHTML_SCRIPT_BASE = base;
  globalScope.QHTML7_SCRIPT_BASE = base;
  globalScope.QHTML6_SCRIPT_URL = globalScope.QHTML6_SCRIPT_URL || qhtml6Url;

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
      qhtml6Promise = loadScript(globalScope.QHTML6_SCRIPT_URL || qhtml6Url);
    }
    return qhtml6Promise;
  }

  function loadQHTML7() {
    if (!qhtml7Promise) {
      qhtml7Promise = loadScript(qhtml7Url);
    }
    return qhtml7Promise;
  }

  function sourceForHost(host) {
    return String(host && (host.qhtmlSource || host.innerHTML) || "");
  }

  function hasLocalComponentSymbol(source) {
    return /\bq-property\s+component\b/.test(source) ||
      /\b[A-Za-z_][A-Za-z0-9_+\-]*\s+component\s*\{/.test(source);
  }

  function hasLegacyQdomCall(source) {
    if (/\bfunction\s+qdom\s*\(/.test(source)) {
      return false;
    }
    return /\.\s*qdom\s*\(/.test(source) || /(^|[^\w$])qdom\s*\(/.test(source);
  }

  function shouldPreferQHTML6(source) {
    const text = String(source || "");
    if (hasLegacyQdomCall(text)) {
      return true;
    }
    if (/\bthis\.component\b/.test(text) && !hasLocalComponentSymbol(text)) {
      return true;
    }
    return false;
  }

  function cloneHostAs(tagName, host, version) {
    const template = document.createElement("template");
    const next = document.createElement(tagName);
    Array.from(host.attributes || []).forEach((attribute) => {
      if (!attribute || !attribute.name) {
        return;
      }
      if (attribute.name === "ready" || attribute.name === "qhtml-runtime") {
        return;
      }
      next.setAttribute(attribute.name, attribute.value);
    });
    next.setAttribute("version", String(version || ""));
    const source = sourceForHost(host);
    next.innerHTML = source;
    next.qhtmlSource = source;
    template.content.appendChild(next);
    return template.content.firstElementChild.cloneNode(true);
  }

  function replaceHost(host, next) {
    if (host && host.parentNode) {
      host.parentNode.replaceChild(next, host);
    }
    return next;
  }

  function routeToQHTML6(host) {
    const next = replaceHost(host, cloneHostAs("q-html6", host, "6"));
    next.__qhtmlEntryOriginalSource = sourceForHost(host);
    routedQHTML6Hosts.add(next);
    installQHTML6Validation();
    return loadQHTML6().then(() => next);
  }

  function routeToQHTML7(host) {
    const next = replaceHost(host, cloneHostAs("q-html", host, "7"));
    return loadQHTML7().then(() => next);
  }

  function qhtmlLooksUnprocessed(text) {
    return /\bhtml\s*\{/.test(text) ||
      /\btext\s*\{/.test(text) ||
      /\bq-component\s+[A-Za-z_][A-Za-z0-9_+\-]*\s*\{/.test(text);
  }

  function validateQHTML6Host(host) {
    if (!host || host.__qhtmlEntryValidated === true || !routedQHTML6Hosts.has(host)) {
      return;
    }
    host.__qhtmlEntryValidated = true;
    const rendered = String(host.innerHTML || host.textContent || "");
    if (qhtmlLooksUnprocessed(rendered)) {
      throw new Error("QHTML6 routing failed: host still contains unprocessed QHTML source.");
    }
  }

  function installQHTML6Validation() {
    if (qhtml6ValidationInstalled) {
      return;
    }
    qhtml6ValidationInstalled = true;
    document.addEventListener("QHTMLContentLoaded", () => {
      document.querySelectorAll("q-html6").forEach(validateQHTML6Host);
    });
  }

  function routeHost(host) {
    const version = String(host.getAttribute("version") || "").trim();
    if (version === "6") {
      return routeToQHTML6(host);
    }
    if (version === "7") {
      return routeToQHTML7(host);
    }
    const source = sourceForHost(host);
    return shouldPreferQHTML6(source) ? routeToQHTML6(host) : routeToQHTML7(host);
  }

  function routeAll() {
    const hosts = Array.from(document.querySelectorAll("q-html"));
    const needsQHTML7 = hosts.some((host) => {
      const version = String(host.getAttribute("version") || "").trim();
      return version === "7" || (!version && !shouldPreferQHTML6(sourceForHost(host)));
    });
    const needsQHTML6 = hosts.some((host) => {
      const version = String(host.getAttribute("version") || "").trim();
      return version === "6" || (!version && shouldPreferQHTML6(sourceForHost(host)));
    });

    const loads = [];
    if (needsQHTML6) {
      loads.push(loadQHTML6());
      installQHTML6Validation();
    }
    if (needsQHTML7) {
      loads.push(loadQHTML7());
    }

    hosts.forEach(routeHost);
    return Promise.all(loads);
  }

  const start = () => {
    globalScope.QHTMLReady = routeAll();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
