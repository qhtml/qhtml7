# QHTML7 JavaScript API Reference

**Source:** `qhtml_types.js`  
**Source version fallback:** `7.4.0`  
**Audited source:** 4,003 lines, 162,682 bytes
**SHA-256:** `beffb497e7621c9b602835ec2993c9f8de93541789d57521e894b7ac42783d27`

## Scope and accuracy

This reference is generated from the uploaded implementation, not from assumptions or external documentation. It inventories every symbol in the frozen `QHTMLTypes` export object, every own instance/static method on each exported class, constructor signatures, inheritance, global/CommonJS exposure, and every CSS shortcut. Inherited methods are documented once on the defining base class and are available through the listed inheritance chain. Methods ending in `Js` are retained as separate callable bindings and identified as aliases.

## Export and loading model

- `globalThis.QHTMLTypes` is assigned `Object.freeze(api)`.
- Each API entry is also copied to `globalThis[entryName]` only when that global is currently `undefined`.
- In CommonJS environments, `module.exports = api`.
- The export object is frozen, but class instances and most contained objects remain mutable.

## Inventory summary

- Top-level exports: **99**
- Exported classes: **78**
- Own callable class members (excluding constructors): **744**

## Top-level constants, objects, and functions

### `QHTML_VERSION_FALLBACK`
**Value:** `7.4.0`; source line 4.

### `CSS_SHORTCUTS`
**Type:** `Map<string,string>`; source line 6.
Maps QHTML camelCase/CSS shortcut property names to canonical CSS property names. The complete map appears in the appendix.

### `QHTMLJsonTools`
**Type:** frozen object; source line 2851.
- `parse`: `JSON.parse` bound to `JSON`.
- `stringify`: `JSON.stringify` bound to `JSON`.

### `createUUID()`
**Source:** line 98.
Returns `crypto.randomUUID()` when available; otherwise generates an RFC-4122-style version-4 UUID string with Math.random().

### `qhtmlVersionString()`
**Source:** line 94.
Returns `globalThis.QHTML_VERSION` when truthy, otherwise `QHTML_VERSION_FALLBACK`.

### `qhtmlCssShortcutPropertyName(name)`
**Source:** line 113.
Normalizes a shortcut or canonical CSS name case-insensitively; returns the canonical CSS property name or an empty string.

### `qhtmlIsCssShortcutProperty(name)`
**Source:** line 127.
Returns whether qhtmlCssShortcutPropertyName(name) resolves to a nonempty CSS property.

### `qhtmlScalarValue(value)`
**Source:** line 131.
Trims a value and removes one matching outer quote pair (`"`, single quote, or backtick).

### `qhtmlSourceQuote(value)`
**Source:** line 143.
Converts a value to a double-quoted QHTML source string, escaping backslashes and double quotes.

### `qhtmlEscapeText(value)`
**Source:** line 147.
HTML-escapes ampersand, less-than, and greater-than characters.

### `qhtmlEscapeAttribute(value)`
**Source:** line 154.
Applies qhtmlEscapeText and additionally escapes double quotes.

### `qhtmlInterpolateTextForContext(value, contextNode)`
**Source:** line 408.
Replaces `${expression}` segments with qhtmlResolveExpressionValue results; QHTMLReference values become name or UUID.

### `qhtmlResolveExpressionValue(expression, contextNode, resolving = new Set(), depth = 0)`
**Source:** line 307.
Resolves `this`, `parent`, names, dotted node/object paths, QHTMLKeyword values, and QHTMLProperty/assignment values with cycle/depth protection.

### `qhtmlResolvePropertyValue(rawValue, contextNode, resolving = new Set(), depth = 0)`
**Source:** line 381.
Resolves interpolation, quoted scalars, JSON arrays/objects, references, or expression paths into a property value.

### `qhtmlResolveCssValueForContext(value, contextNode)`
**Source:** line 404.
Direct alias/delegation to qhtmlResolvePropertyValue for CSS values.

### `qhtmlScriptBody(value)`
**Source:** line 173.
Escapes `</script` as `<\/script` to prevent premature script-element termination.

## Class API

## `QHTMLHash`
Qt-style string-keyed map wrapper backed by JavaScript Map.

- **Inheritance:** `QHTMLHash`
- **Source:** lines 442-467
- **Constructor:** `new QHTMLHash(values)` (line 443)
- **Constructor-created fields specific to this class:** `_map` (Map(0), conventional internal state)

### Own members

- `insert(key, value)` — Inserts the supplied value/node at the requested position. **Observed return:** `void`. **Source:** line 456.
- `value(key, fallback = undefined)` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 457.
- `contains(key)` — Returns whether the named condition is satisfied. **Observed return:** `boolean`. **Source:** line 458.
- `remove(key)` — Removes the selected item/reference/category and returns success where implemented. **Observed return:** `implementation-defined`. **Source:** line 459.
- `take(key)` — Removes and returns the selected item; returns null/undefined when absent according to the implementation. **Observed return:** `implementation-defined`. **Source:** line 460.
- `keys()` — Returns the corresponding collection, usually as a defensive copy. **Observed return:** `Array`. **Source:** line 461.
- `values()` — Returns the corresponding stored or derived value. **Observed return:** `Array`. **Source:** line 462.
- `clear()` — Clears the corresponding collection/state. **Observed return:** `void`. **Source:** line 463.
- `size()` — Returns the current number of corresponding items. **Observed return:** `number`. **Source:** line 464.
- `toObject()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `object`. **Source:** line 465.

## `QHTMLString`
Minimal QString-like wrapper around a JavaScript string.

- **Inheritance:** `QHTMLString`
- **Source:** lines 468-478
- **Constructor:** `new QHTMLString(value = "")` (line 469)
- **Constructor-created fields specific to this class:** `value` (string: , direct public field)

### Own members

- `trimmed()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 473.
- `isEmpty()` — Returns whether the named condition is satisfied. **Observed return:** `boolean`. **Source:** line 474.
- `toStdString()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 475.
- `toString()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 476.

## `QHTMLReference`
Base identity object carrying QHTML type, name, and UUID.

- **Inheritance:** `QHTMLReference`
- **Source:** lines 479-500
- **Constructor:** `new QHTMLReference(type = "QHTMLReference", name = "", uuid = "")` (line 480)
- **Constructor-created fields specific to this class:** `_qhtmlType` (string: QHTMLReference, conventional internal state); `_qhtmlName` (string: , conventional internal state); `_qhtmlUUID` (string (generated UUID), conventional internal state)

### Own members

- `qhtmlType()` — Returns the current `_qhtmlType` state. **Observed return:** `string`. **Source:** line 486.
- `qhtmlTypeJs()` — Compatibility alias for `qhtmlType()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 487.
- `qhtmlUUID()` — Returns the current `_qhtmlUUID` state. **Observed return:** `string`. **Source:** line 488.
- `qhtmlUUIDJs()` — Compatibility alias for `qhtmlUUID()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 489.
- `setQHTMLUUID(uuid)` — Sets the qhtmluuid from the supplied value. **Observed return:** `void`. **Source:** line 490.
- `setQHTMLUUIDJs(uuid)` — Compatibility alias for `setQHTMLUUID()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 491.
- `qhtmlName()` — Returns the current `_qhtmlName` state. **Observed return:** `string`. **Source:** line 492.
- `qhtmlNameJs()` — Compatibility alias for `qhtmlName()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 493.
- `setQHTMLName(name)` — Sets the qhtmlname from the supplied value. **Observed return:** `void`. **Source:** line 494.
- `setQHTMLNameJs(name)` — Compatibility alias for `setQHTMLName()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 495.
- `setQHTMLType(type)` — Sets the qhtmltype from the supplied value. **Observed return:** `void`. **Source:** line 496.
- `clone()` — Creates a new object representing this value/type; see implementation notes for whether UUIDs/children are preserved. **Observed return:** `QHTMLReference`. **Source:** line 497.

### Static members

- `static createUUID()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 498.

## `QHTMLKeyword`
Named scalar reference used by expression contexts.

- **Inheritance:** `QHTMLKeyword -> QHTMLReference`
- **Source:** lines 501-513
- **Constructor:** `new QHTMLKeyword(name = "", value = "")` (line 502)
- **Inherited API:** all public members documented under `QHTMLReference` and its ancestors.
- **Constructor-created fields specific to this class:** `_value` (string: , conventional internal state)

### Own members

- `value()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 507.
- `valueJs()` — Compatibility alias for `value()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 508.
- `setValue(value)` — Sets the value from the supplied value. **Observed return:** `void`. **Source:** line 509.
- `setValueJs(value)` — Compatibility alias for `setValue()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 510.
- `clone()` — Creates a new object representing this value/type; see implementation notes for whether UUIDs/children are preserved. **Observed return:** `QHTMLKeyword`. **Source:** line 511.

## `QHTMLNamedReference`
Named reference that stores another object UUID.

- **Inheritance:** `QHTMLNamedReference -> QHTMLReference`
- **Source:** lines 514-526
- **Constructor:** `new QHTMLNamedReference(name = "", targetUUID = "")` (line 515)
- **Inherited API:** all public members documented under `QHTMLReference` and its ancestors.
- **Constructor-created fields specific to this class:** `_targetUUID` (string: , conventional internal state)

### Own members

- `targetUUID()` — Returns the current `_targetUUID` state. **Observed return:** `string`. **Source:** line 520.
- `targetUUIDJs()` — Compatibility alias for `targetUUID()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 521.
- `setTargetUUID(uuid)` — Sets the target uuid from the supplied value. **Observed return:** `void`. **Source:** line 522.
- `setTargetUUIDJs(uuid)` — Compatibility alias for `setTargetUUID()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 523.
- `clone()` — Creates a new object representing this value/type; see implementation notes for whether UUIDs/children are preserved. **Observed return:** `QHTMLNamedReference`. **Source:** line 524.

## `QHTMLObjectReference`
Named reference holding a direct QHTML object.

- **Inheritance:** `QHTMLObjectReference -> QHTMLReference`
- **Source:** lines 527-536
- **Constructor:** `new QHTMLObjectReference(name = "", target = null)` (line 528)
- **Inherited API:** all public members documented under `QHTMLReference` and its ancestors.
- **Constructor-created fields specific to this class:** `_target` (null, conventional internal state)

### Own members

- `target()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 533.
- `clone()` — Creates a new object representing this value/type; see implementation notes for whether UUIDs/children are preserved. **Observed return:** `QHTMLObjectReference`. **Source:** line 534.

## `QHTMLContext`
Hierarchical lexical reference table with parent fallback.

- **Inheritance:** `QHTMLContext`
- **Source:** lines 537-577
- **Constructor:** `new QHTMLContext(parentContext = null)` (line 538)
- **Constructor-created fields specific to this class:** `_parentContext` (null, conventional internal state); `_references` (Map(0), conventional internal state)

### Own members

- `setParentContext(parentContext)` — Sets the parent context from the supplied value. **Observed return:** `void`. **Source:** line 543.
- `parentContext()` — Returns the current `_parentContext` state. **Observed return:** `implementation-defined`. **Source:** line 544.
- `clear()` — Clears the corresponding collection/state. **Observed return:** `void`. **Source:** line 545.
- `setReference(key, reference)` — Sets the reference from the supplied value. **Observed return:** `void`. **Source:** line 546.
- `updateKeywordReference(name, value)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `void`. **Source:** line 550.
- `updateNamedReference(name, uuid)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `void`. **Source:** line 551.
- `updateObjectReference(name, target)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `void`. **Source:** line 552.
- `resolve(key)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 553.
- `containsLocalReference(key)` — Returns whether the named condition is satisfied. **Observed return:** `boolean`. **Source:** line 561.
- `resolveTypeJs(key)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 562.
- `keys()` — Returns the corresponding collection, usually as a defensive copy. **Observed return:** `Array`. **Source:** line 563.
- `visibleKeys()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 564.
- `size()` — Returns the current number of corresponding items. **Observed return:** `number`. **Source:** line 575.

## `QHTMLNode`
Core mutable QHTML tree node: ownership, references, properties, serialization, rendering, parsing insertion, and logging.

- **Inheritance:** `QHTMLNode -> QHTMLReference`
- **Source:** lines 675-1394
- **Constructor:** `new QHTMLNode(type = "QHTMLNode", name = "")` (line 676)
- **Inherited API:** all public members documented under `QHTMLReference` and its ancestors.
- **Constructor-created fields specific to this class:** `qhtmlParent` (null, direct public field); `qhtmlChildren` (Array(0), direct public field); `qhtmlProperties` (Map(0), direct public field); `qhtmlReferences` (Map(0), direct public field); `_qhtmlReferenceNames` (Map(0), conventional internal state); `qhtmlContext` (QHTMLContext, direct public field); `qhtmlLogger` (null, direct public field)

### Own members

- `parent()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 590.
- `parentJs()` — Compatibility alias for `parent()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 591.
- `rootNode()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 592.
- `rootNodeJs()` — Compatibility alias for `rootNode()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 599.
- `childCount()` — Returns the current number of corresponding items. **Observed return:** `number`. **Source:** line 600.
- `childAt(index)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 601.
- `children()` — Returns the corresponding collection, usually as a defensive copy. **Observed return:** `Array`. **Source:** line 602.
- `childList()` — Returns a serialized/list form of the corresponding values. **Observed return:** `Array`. **Source:** line 603.
- `childListJs()` — Compatibility alias for `childList()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 604.
- `ownedReferenceMembers()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `Array`. **Source:** line 605.
- `findChildByName(name)` — Searches the relevant tree/collection and returns the first match or a collection of matches. **Observed return:** `implementation-defined`. **Source:** line 606.
- `collectChildrenByType(typeName, out)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `void`. **Source:** line 607.
- `findChildrenByType(typeName)` — Searches the relevant tree/collection and returns the first match or a collection of matches. **Observed return:** `Array`. **Source:** line 615.
- `findChildrenByTypeJs(typeName)` — Compatibility alias for `findChildrenByType()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 620.
- `findDescendantByUUID(uuid)` — Searches the relevant tree/collection and returns the first match or a collection of matches. **Observed return:** `object | null`. **Source:** line 621.
- `findByUUID(uuid)` — Searches the relevant tree/collection and returns the first match or a collection of matches. **Observed return:** `implementation-defined`. **Source:** line 634.
- `containsDescendantUUID(uuid)` — Returns whether the named condition is satisfied. **Observed return:** `boolean`. **Source:** line 637.
- `appendChild(child)` — Adopts a child, links parent/context/logger state, registers named references, and returns the child. **Observed return:** `implementation-defined`. **Source:** line 638.
- `appendChildJs(child)` — Compatibility alias for `appendChild()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 652.
- `insertChild(index, child)` — Adopts and inserts a child at a bounded index, links context/logger state, registers named references, and returns the child. **Observed return:** `implementation-defined`. **Source:** line 653.
- `insertChildJs(index, child)` — Compatibility alias for `insertChild()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 667.
- `takeChildAt(index)` — Detaches and returns the child at index, clearing its parent and parent context; returns null when absent. **Observed return:** `implementation-defined`. **Source:** line 668.
- `removeChildAt(index)` — Removes the selected item/reference/category and returns success where implemented. **Observed return:** `implementation-defined`. **Source:** line 676.
- `removeChildAtJs(index)` — Compatibility alias for `removeChildAt()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 677.
- `remove(node)` — With no arguments, removes this node from its parent qhtmlChildren, rebuilds root references, and rerenders the parent. With a child argument, removes that direct child from this node, rebuilds root references, and rerenders this node. **Observed return:** `boolean`. **Source:** line 845.
- `removeJs(node)` — Compatibility alias for `remove()` with the same no-argument self-removal and explicit-child removal behavior. **Observed return:** `boolean`. **Source:** line 879.
- `clearChildren()` — Clears the corresponding collection/state. **Observed return:** `void`. **Source:** line 678.
- `clearChildrenJs()` — Compatibility alias for `clearChildren()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 685.
- `setProperty(key, value)` — Sets the property from the supplied value. **Observed return:** `void`. **Source:** line 686.
- `property(key)` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 690.
- `propertyJs(key)` — Compatibility alias for `property()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 691.
- `setPropertyValue(key, value)` — Updates an existing QHTMLProperty/QHTMLPropertyAssignment by name, or appends a new assignment when absent; also updates the node property map and object reference. **Observed return:** `boolean`. **Source:** line 692.
- `setPropertyTextJs(key, value)` — Compatibility alias for `setPropertyValue()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 719.
- `setPropertyText(key, value)` — Sets the property text from the supplied value. **Observed return:** `implementation-defined`. **Source:** line 720.
- `setPropertyJs(key, value)` — Converts a JavaScript value to QHTML source syntax, then delegates to setPropertyValue(). **Observed return:** `implementation-defined`. **Source:** line 721.
- `logger()` — Writes or conditionally writes a diagnostic entry and returns whether it was accepted. **Observed return:** `implementation-defined`. **Source:** line 722.
- `loggerJs()` — Compatibility alias for `logger()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 723.
- `setLogger(logger)` — Sets the logger from the supplied value. **Observed return:** `void`. **Source:** line 724.
- `setLoggerJs(logger)` — Compatibility alias for `setLogger()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 733.
- `adoptLoggerFromChild(child)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `void`. **Source:** line 734.
- `loggerCategory()` — Writes or conditionally writes a diagnostic entry and returns whether it was accepted. **Observed return:** `implementation-defined`. **Source:** line 739.
- `maybeLog(message)` — Writes or conditionally writes a diagnostic entry and returns whether it was accepted. **Observed return:** `implementation-defined`. **Source:** line 747.
- `maybeLogJs(message)` — Compatibility alias for `maybeLog()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 751.
- `updateKeywordReference(name, value)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `void`. **Source:** line 752.
- `updateKeywordReferenceJs(name, value)` — Compatibility alias for `updateKeywordReference()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 753.
- `updateNamedReference(name, uuid)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `void`. **Source:** line 754.
- `updateNamedReferenceJs(name, uuid)` — Compatibility alias for `updateNamedReference()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 755.
- `updateObjectReference(name, target)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `void`. **Source:** line 756.
- `addQHTMLReference(visibleName, reference)` — Adds the supplied item to this object and returns the delegated/implementation result. **Observed return:** `boolean`. **Source:** line 757.
- `removeQHTMLReference(uuid)` — Removes the selected item/reference/category and returns success where implemented. **Observed return:** `implementation-defined`. **Source:** line 766.
- `clearQHTMLReferences()` — Clears the corresponding collection/state. **Observed return:** `void`. **Source:** line 776.
- `hasQHTMLReferenceUUID(uuid)` — Returns whether the named condition is satisfied. **Observed return:** `boolean`. **Source:** line 780.
- `hasQHTMLReferenceName(name)` — Returns whether the named condition is satisfied. **Observed return:** `boolean`. **Source:** line 781.
- `qhtmlHasReference(nameOrUUID)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `boolean`. **Source:** line 782.
- `qhtmlReferenceByUUID(uuid)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 786.
- `qhtmlReferenceByName(name)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 787.
- `qhtmlReferenceUUIDs()` — Returns a serialized/list form of the corresponding values. **Observed return:** `Array`. **Source:** line 791.
- `qhtmlReferenceNames()` — Returns the same sorted array as qhtmlReferenceNamesList(). **Observed return:** `Array`. **Source:** line 792.
- `qhtmlReferenceNamesList()` — Returns a sorted array of registered visible reference names. **Observed return:** `Array`. **Source:** line 793.
- `qhtmlResolve(nameOrUUID)` — Resolves this/parent specially, then a registered name, UUID, or lexical context reference. **Observed return:** `implementation-defined`. **Source:** line 794.
- `resolve(key)` — Resolves this/parent specially, otherwise delegates to the hierarchical QHTMLContext. **Observed return:** `implementation-defined`. **Source:** line 805.
- `resolveJs(key)` — Compatibility alias for `resolve()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 816.
- `resolveTypeJs(key)` — Resolves a context key and returns its qhtmlType string, or an empty string. **Observed return:** `implementation-defined`. **Source:** line 817.
- `contextKeysJs()` — Returns all visible lexical-context keys, including inherited parent-context keys. **Observed return:** `Array`. **Source:** line 818.
- `runtime()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `void`. **Source:** line 819.
- `renderHtml()` — Renders this node to an HTML fragment string. **Observed return:** `string`. **Source:** line 820.
- `renderHtmlInContext(contextNode)` — Renders this node using the supplied QHTML context for references/interpolation. **Observed return:** `string`. **Source:** line 821.
- `renderHtmlJs()` — Compatibility alias for `renderHtml()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 822.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 823.
- `sourceQHTMLJs()` — Compatibility alias for `sourceQHTML()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 824.
- `toQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 825.
- `toQHTMLJs()` — Compatibility alias for `toQHTML()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 826.
- `fromQHTML(source)` — Clears children/references and parses/appends the supplied QHTML source. **Observed return:** `implementation-defined`. **Source:** line 827.
- `fromQHTMLJs(source)` — Compatibility alias for `fromQHTML()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 832.
- `toHTML()` — Returns rendered HTML for this object. **Observed return:** `string`. **Source:** line 833.
- `toHTMLJs()` — Compatibility alias for `toHTML()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 834.
- `toJSON()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 835.
- `toJSONJs()` — Compatibility alias for `toJSON()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 836.
- `toJSONText()` — Serializes the JSON representation to a JSON text string. **Observed return:** `string`. **Source:** line 837.
- `toJSONTextJs()` — Compatibility alias for `toJSONText()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 838.
- `toJsonObject()` — Returns the canonical object form: qhtmlType, qhtmlName, qhtmlUUID, qhtmlProperties, and serialized qhtmlChildren. **Observed return:** `implementation-defined`. **Source:** line 839.
- `toJsonValue()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 848.
- `fromJSON(value)` — Loads object state from the supplied JSON-compatible value and returns the implementation’s success result. **Observed return:** `implementation-defined`. **Source:** line 849.
- `fromJSONJs(value)` — Compatibility alias for `fromJSON()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 850.
- `fromJSONText(json)` — Parses JSON text and loads the resulting value into this object; JSON.parse errors propagate. **Observed return:** `implementation-defined`. **Source:** line 851.
- `fromJSONTextJs(json)` — Compatibility alias for `fromJSONText()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 852.
- `fromJsonValue(value)` — Loads object state from the supplied JSON-compatible value and returns the implementation’s success result. **Observed return:** `implementation-defined`. **Source:** line 853.
- `fromJsonObject(object)` — Loads object state from the supplied JSON-compatible value and returns the implementation’s success result. **Observed return:** `boolean`. **Source:** line 854.
- `evaluateExpression(expression)` — Resolves the expression against this node’s QHTML context and returns its string form. **Observed return:** `implementation-defined`. **Source:** line 869.
- `evaluateExpressionJs(expression)` — Compatibility alias for `evaluateExpression()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 870.
- `appendQHTMLSource(source)` — Appends the supplied value/node and returns the appended value or delegated result. **Observed return:** `implementation-defined`. **Source:** line 871.
- `appendQHTMLSourceJs(source)` — Compatibility alias for `appendQHTMLSource()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 872.
- `insertQHTMLSource(index, source)` — Requires QHTMLParser, parses source in this node context, transfers parsed root children into this node at a bounded index, rebuilds root references, and returns the inserted count. **Observed return:** `implementation-defined`. **Source:** line 873.
- `insertQHTMLSourceJs(index, source)` — Compatibility alias for `insertQHTMLSource()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 892.
- `replaceChildWithQHTMLSource(index, source)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 893.
- `replaceChildWithQHTMLSourceJs(index, source)` — Compatibility alias for `replaceChildWithQHTMLSource()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 900.
- `cloneShallow()` — Creates a new object representing this value/type; see implementation notes for whether UUIDs/children are preserved. **Observed return:** `implementation-defined`. **Source:** line 901.

### Static members

- `static escapeText(value)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `string`. **Source:** line 906.
- `static escapeAttribute(value)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `string`. **Source:** line 907.
- `static sourceIndent(indentLevel)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 908.
- `static sourceQuote(value)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 909.
- `static sourceBlock(header, body, indentLevel)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `string`. **Source:** line 910.
- `static nodeFromJsonObject(object, ownerScope = null)` — Factory that constructs the concrete QHTML class selected by qhtmlType/type, restores UUID/properties/children, and reconnects component metadata where possible. **Observed return:** `object`. **Source:** line 911.

## `QHTMLDomNode`
Semantic base for nodes that participate in DOM/QHTML rendering; adds no own API.

- **Inheritance:** `QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1098-1103
- **Constructor:** `new QHTMLDomNode(type = "QHTMLDomNode", name = "")` (line 1099)
- **Inherited API:** all public members documented under `QHTMLNode` and its ancestors.

No own callable members; behavior is constructor specialization plus inherited API.

## `QHTMLDomElement`
Represents an HTML element, attributes, CSS shortcut assignments, interpolation, HTML rendering, and QHTML source emission.

- **Inheritance:** `QHTMLDomElement -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1104-1216
- **Constructor:** `new QHTMLDomElement(tagName = "", attributes = {})` (line 1105)
- **Inherited API:** all public members documented under `QHTMLDomNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_tagName` (string: , conventional internal state); `_attributes` (Object, conventional internal state)

### Own members

- `tagName()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 1111.
- `tagNameJs()` — Compatibility alias for `tagName()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1112.
- `setTagName(tagName)` — Sets the tag name from the supplied value. **Observed return:** `void`. **Source:** line 1113.
- `setTagNameJs(tagName)` — Compatibility alias for `setTagName()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 1117.
- `attributes()` — Returns a defensive shallow copy of the corresponding stored value. **Observed return:** `object`. **Source:** line 1118.
- `clearAttributes()` — Clears the corresponding collection/state. **Observed return:** `void`. **Source:** line 1119.
- `setAttributes(attributes)` — Sets the attributes from the supplied value. **Observed return:** `void`. **Source:** line 1120.
- `setAttribute(key, value)` — Sets the attribute from the supplied value. **Observed return:** `void`. **Source:** line 1121.
- `setAttributeJs(key, value)` — Compatibility alias for `setAttribute()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 1122.
- `attribute(key)` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 1123.
- `attributeJs(key)` — Compatibility alias for `attribute()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1124.
- `inlineStyleForContext(contextNode = this)` — Combines interpolated style= text with child property assignments recognized through CSS_SHORTCUTS; later duplicate CSS properties are suppressed. **Observed return:** `string`. **Source:** line 1125.
- `assignmentAttributesForContext(contextNode = this)` — Converts non-CSS, non-declared property assignments into interpolated escaped HTML attributes, avoiding duplicates. **Observed return:** `string`. **Source:** line 1144.
- `renderHtml()` — Renders this node to an HTML fragment string. **Observed return:** `string`. **Source:** line 1164.
- `renderHtmlInContext(contextNode)` — Renders this node using the supplied QHTML context for references/interpolation. **Observed return:** `string`. **Source:** line 1165.
- `renderHtmlForContext(contextNode)` — Renders the tag, interpolated attributes, generated assignment attributes, inline CSS, qhtml-node UUID, children, and closing tag. **Observed return:** `string`. **Source:** line 1166.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 1191.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 1212.

## `QHTMLTextFragment`
Escaped text node with interpolation-aware rendering.

- **Inheritance:** `QHTMLTextFragment -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1217-1231
- **Constructor:** `new QHTMLTextFragment(value = "")` (line 1218)
- **Inherited API:** all public members documented under `QHTMLDomNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_value` (string: , conventional internal state)

### Own members

- `value()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 1222.
- `valueJs()` — Compatibility alias for `value()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1223.
- `setValue(value)` — Sets the value from the supplied value. **Observed return:** `void`. **Source:** line 1224.
- `setValueJs(value)` — Compatibility alias for `setValue()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 1225.
- `renderHtml()` — Renders this node to an HTML fragment string. **Observed return:** `string`. **Source:** line 1226.
- `renderHtmlInContext(contextNode)` — Renders this node using the supplied QHTML context for references/interpolation. **Observed return:** `string`. **Source:** line 1227.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 1228.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 1229.

## `QHTMLHTMLFragment`
Raw HTML fragment; interpolation is applied without HTML escaping.

- **Inheritance:** `QHTMLHTMLFragment -> QHTMLTextFragment -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1232-1242
- **Constructor:** `new QHTMLHTMLFragment(value = "")` (line 1233)
- **Inherited API:** all public members documented under `QHTMLTextFragment` and its ancestors.

### Own members

- `renderHtml()` — Renders this node to an HTML fragment string. **Observed return:** `string`. **Source:** line 1238.
- `renderHtmlInContext(contextNode)` — Renders this node using the supplied QHTML context for references/interpolation. **Observed return:** `string`. **Source:** line 1239.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 1240.

## `QHTMLUnknownFragment`
Fallback fragment that preserves unknown source as escaped text.

- **Inheritance:** `QHTMLUnknownFragment -> QHTMLTextFragment -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1243-1253
- **Constructor:** `new QHTMLUnknownFragment(value = "")` (line 1244)
- **Inherited API:** all public members documented under `QHTMLTextFragment` and its ancestors.

### Own members

- `renderHtml()` — Renders this node to an HTML fragment string. **Observed return:** `string`. **Source:** line 1249.
- `renderHtmlInContext(contextNode)` — Renders this node using the supplied QHTML context for references/interpolation. **Observed return:** `string`. **Source:** line 1250.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 1251.

## `QHTMLTypedNode`
Base for declarative q-* nodes with a keyword and attribute dictionary.

- **Inheritance:** `QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1254-1298
- **Constructor:** `new QHTMLTypedNode(keyword = "", name = "", attributes = {})` (line 1255)
- **Inherited API:** all public members documented under `QHTMLDomNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_keyword` (string: , conventional internal state); `_attributes` (Object, conventional internal state)

### Own members

- `keyword()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 1261.
- `keywordJs()` — Compatibility alias for `keyword()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1262.
- `setKeyword(keyword)` — Sets the keyword from the supplied value. **Observed return:** `void`. **Source:** line 1263.
- `setKeywordJs(keyword)` — Compatibility alias for `setKeyword()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 1264.
- `attributes()` — Returns a defensive shallow copy of the corresponding stored value. **Observed return:** `object`. **Source:** line 1265.
- `attribute(key)` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 1266.
- `attributeJs(key)` — Compatibility alias for `attribute()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1267.
- `clearAttributes()` — Clears the corresponding collection/state. **Observed return:** `void`. **Source:** line 1268.
- `setAttributes(attributes)` — Sets the attributes from the supplied value. **Observed return:** `void`. **Source:** line 1269.
- `setAttribute(key, value)` — Sets the attribute from the supplied value. **Observed return:** `void`. **Source:** line 1270.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 1271.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 1278.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 1294.

## `QHTMLLogger`
Category-filtered in-memory/logger-console diagnostic node.

- **Inheritance:** `QHTMLLogger -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1299-1401
- **Constructor:** `new QHTMLLogger(name = "", attributes = {})` (line 1300)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_categories` (Array(0), conventional internal state); `_entries` (Array(0), conventional internal state)

### Own members

- `categories()` — Returns the corresponding collection, usually as a defensive copy. **Observed return:** `Array`. **Source:** line 1308.
- `categoriesJs()` — Compatibility alias for `categories()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1317.
- `categoryList()` — Returns a serialized/list form of the corresponding values. **Observed return:** `string`. **Source:** line 1318.
- `categoryListJs()` — Compatibility alias for `categoryList()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1319.
- `setCategories(categories)` — Sets the categories from the supplied value. **Observed return:** `void`. **Source:** line 1320.
- `setCategoryList(categories)` — Sets the category list from the supplied value. **Observed return:** `void`. **Source:** line 1327.
- `setCategoryListJs(categories)` — Compatibility alias for `setCategoryList()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 1328.
- `setCategoriesJs(categories)` — Compatibility alias for `setCategories()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 1329.
- `addCategory(category)` — Adds the supplied item to this object and returns the delegated/implementation result. **Observed return:** `void`. **Source:** line 1330.
- `addCategoryJs(category)` — Compatibility alias for `addCategory()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 1336.
- `removeCategory(category)` — Removes the selected item/reference/category and returns success where implemented. **Observed return:** `void`. **Source:** line 1337.
- `removeCategoryJs(category)` — Compatibility alias for `removeCategory()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 1342.
- `acceptsCategory(category)` — Returns whether the named condition is satisfied. **Observed return:** `boolean`. **Source:** line 1343.
- `acceptsCategoryJs(category)` — Compatibility alias for `acceptsCategory()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1347.
- `maybeLog(message)` — Writes or conditionally writes a diagnostic entry and returns whether it was accepted. **Observed return:** `implementation-defined`. **Source:** line 1348.
- `logSignal(message)` — Writes or conditionally writes a diagnostic entry and returns whether it was accepted. **Observed return:** `implementation-defined`. **Source:** line 1349.
- `logProperty(message)` — Writes or conditionally writes a diagnostic entry and returns whether it was accepted. **Observed return:** `implementation-defined`. **Source:** line 1350.
- `logComponent(message)` — Writes or conditionally writes a diagnostic entry and returns whether it was accepted. **Observed return:** `implementation-defined`. **Source:** line 1351.
- `logSlot(message)` — Writes or conditionally writes a diagnostic entry and returns whether it was accepted. **Observed return:** `implementation-defined`. **Source:** line 1352.
- `log(message, category = "")` — Writes or conditionally writes a diagnostic entry and returns whether it was accepted. **Observed return:** `boolean`. **Source:** line 1353.
- `logJs(message, category = "")` — Compatibility alias for `log()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1363.
- `logSignalJs(message)` — Compatibility alias for `logSignal()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1364.
- `logPropertyJs(message)` — Compatibility alias for `logProperty()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1365.
- `logComponentJs(message)` — Compatibility alias for `logComponent()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1366.
- `logSlotJs(message)` — Compatibility alias for `logSlot()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1367.
- `entries()` — Returns the corresponding collection, usually as a defensive copy. **Observed return:** `Array`. **Source:** line 1368.
- `entriesJs()` — Compatibility alias for `entries()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1369.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 1370.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 1371.

### Static members

- `static normalizeCategory(category)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 1374.
- `static parseCategorySource(source)` — Parses the supplied source/text into this object or a normalized value. **Observed return:** `implementation-defined`. **Source:** line 1383.

## `QHTMLJavaScriptBlock`
Non-rendering JavaScript source block serialized as base64 in JSON.

- **Inheritance:** `QHTMLJavaScriptBlock -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1402-1426
- **Constructor:** `new QHTMLJavaScriptBlock(contents = "")` (line 1403)
- **Inherited API:** all public members documented under `QHTMLDomNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_contents` (string: , conventional internal state)

### Own members

- `contents()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 1407.
- `body()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 1408.
- `value()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 1409.
- `contentsJs()` — Compatibility alias for `contents()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1410.
- `setContents(contents)` — Sets the contents from the supplied value. **Observed return:** `void`. **Source:** line 1411.
- `setContentsJs(contents)` — Compatibility alias for `setContents()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 1412.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 1413.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 1414.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 1417.

## `QHTMLFunction`
Declarative function metadata and invocation-state recorder; call() returns the stored body rather than executing it.

- **Inheritance:** `QHTMLFunction -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1427-1479
- **Constructor:** `new QHTMLFunction(name = "", attributes = {}, body = "")` (line 1428)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_parameters` (Array(0), conventional internal state); `_body` (string: , conventional internal state); `_lastArguments` (Array(0), conventional internal state); `_lastSenderUUID` (string: , conventional internal state); `_lastSignalUUID` (string: , conventional internal state); `_callCount` (number: 0, conventional internal state)

### Own members

- `parameters()` — Returns the corresponding collection, usually as a defensive copy. **Observed return:** `Array`. **Source:** line 1439.
- `parameterList()` — Returns a serialized/list form of the corresponding values. **Observed return:** `string`. **Source:** line 1440.
- `parameterListJs()` — Compatibility alias for `parameterList()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1441.
- `setParameters(parameters)` — Sets the parameters from the supplied value. **Observed return:** `Array`. **Source:** line 1442.
- `setParameterList(parameters)` — Sets the parameter list from the supplied value. **Observed return:** `void`. **Source:** line 1443.
- `setParameterListJs(parameters)` — Compatibility alias for `setParameterList()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 1444.
- `body()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 1445.
- `bodyJs()` — Compatibility alias for `body()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1446.
- `setBody(body)` — Sets the body from the supplied value. **Observed return:** `void`. **Source:** line 1447.
- `setBodyJs(body)` — Compatibility alias for `setBody()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 1448.
- `lastArguments()` — Returns the corresponding collection, usually as a defensive copy. **Observed return:** `Array`. **Source:** line 1449.
- `lastArgumentList()` — Returns metadata recorded by the most recent call/emission/dispatch. **Observed return:** `string`. **Source:** line 1450.
- `lastArgumentListJs()` — Compatibility alias for `lastArgumentList()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1451.
- `lastSenderUUID()` — Returns metadata recorded by the most recent call/emission/dispatch. **Observed return:** `string`. **Source:** line 1452.
- `lastSenderUUIDJs()` — Compatibility alias for `lastSenderUUID()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1453.
- `lastSignalUUID()` — Returns metadata recorded by the most recent call/emission/dispatch. **Observed return:** `string`. **Source:** line 1454.
- `lastSignalUUIDJs()` — Compatibility alias for `lastSignalUUID()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1455.
- `callCount()` — Returns the current number of corresponding items. **Observed return:** `number`. **Source:** line 1456.
- `call(argumentsList, sender = null, signal = null)` — Records arguments/sender/signal, updates parameter keyword references, increments callCount, and returns the stored function body without executing it. **Observed return:** `Array`. **Source:** line 1457.
- `callJs(argumentList)` — Compatibility alias for `call()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1468.
- `cloneFunction()` — Creates a new object representing this value/type; see implementation notes for whether UUIDs/children are preserved. **Observed return:** `QHTMLFunction`. **Source:** line 1469.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 1470.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 1471.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 1472.

### Static members

- `static parseParameters(value)` — Parses the supplied source/text into this object or a normalized value. **Observed return:** `implementation-defined`. **Source:** line 1477.

## `QHTMLSignal`
Declarative signal with parameters, bus connections, emission, and logging hooks.

- **Inheritance:** `QHTMLSignal -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1480-1517
- **Constructor:** `new QHTMLSignal(name = "", attributes = {})` (line 1481)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_parameters` (Array(0), conventional internal state); `_signalBus` (null, conventional internal state); `_maybeLogListeners` (Array(0), conventional internal state)

### Own members

- `setSignalBus(bus)` — Sets the signal bus from the supplied value. **Observed return:** `void`. **Source:** line 1489.
- `signalBus()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 1490.
- `signalBusJs()` — Compatibility alias for `signalBus()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1491.
- `parameters()` — Returns the corresponding collection, usually as a defensive copy. **Observed return:** `Array`. **Source:** line 1492.
- `parameterList()` — Returns a serialized/list form of the corresponding values. **Observed return:** `string`. **Source:** line 1493.
- `parameterListJs()` — Compatibility alias for `parameterList()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1494.
- `setParameters(parameters)` — Sets the parameters from the supplied value. **Observed return:** `Array`. **Source:** line 1495.
- `setParameterList(parameters)` — Sets the parameter list from the supplied value. **Observed return:** `void`. **Source:** line 1496.
- `setParameterListJs(parameters)` — Compatibility alias for `setParameterList()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 1497.
- `connect(functionNode)` — Registers a connection between the supplied signal and receiver/function. **Observed return:** `implementation-defined`. **Source:** line 1498.
- `connections()` — Registers a connection between the supplied signal and receiver/function. **Observed return:** `Array`. **Source:** line 1499.
- `onMaybeLog(callback)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `void`. **Source:** line 1500.
- `emitSignal(argumentsList = [], sender = null)` — Builds/logs an emission message and dispatches through the assigned signal bus; returns the number of invoked connections. **Observed return:** `string`. **Source:** line 1501.
- `emitSignalJs(argumentList)` — Compatibility alias for `emitSignal()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1511.
- `emit(...args)` — Emits/dispatches this signal with the supplied arguments. **Observed return:** `implementation-defined`. **Source:** line 1512.
- `cloneSignal()` — Creates a new object representing this value/type; see implementation notes for whether UUIDs/children are preserved. **Observed return:** `object`. **Source:** line 1513.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 1514.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 1515.

## `QHTMLEvent`
Standalone named QHTML event/action object with DOM `CustomEvent` interoperability.

- **Inheritance:** `QHTMLEvent -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Constructor:** `new QHTMLEvent(name = "", attributes = {}, body = "")`
- **QHTML syntax:** `q-event EventName(param1, param2) { }`
- **Runtime behavior:** resolves as a callable function in QHTML/DOM context. Calling it dispatches `CustomEvent("qhtml:<EventName>")` with `detail.args`, `detail.parameters`, `detail.sender`, `detail.qhtmlEvent`, and `detail.qhtmlEventUUID`.

### Own members

- `parameters()` — Returns the declared parameter names as an array.
- `parameterList()` / `parameterListJs()` — Returns declared parameters as a comma-separated string.
- `setParameters(parameters)` — Replaces the parameter list from an array.
- `setParameterList(parameters)` / `setParameterListJs(parameters)` — Replaces the parameter list from a comma-separated string.
- `body()` / `bodyJs()` — Returns the stored event body text.
- `setBody(body)` / `setBodyJs(body)` — Replaces the stored event body text.
- `emitEvent(argumentsList = [])` / `emitEventJs(argumentList)` — Records dispatch metadata on the QHTML node.
- `emit(...args)` — Convenience dispatch entry for direct QHTML object usage.
- `lastArguments()` / `lastArgumentsJs()` — Returns the most recent argument list.
- `dispatchCount()` / `dispatchCountJs()` — Returns the number of recorded dispatches.
- `cloneEvent()` — Creates a new event node with matching name, parameters, attributes, and body.
- `renderHtml()` — Produces no direct HTML output.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source.
- `toJsonObject()` — Returns this event’s JSON-serializable representation.

## `QHTMLEventListener`
Declarative listener for a visible `QHTMLEvent` name, backed by a DOM `CustomEvent` listener.

- **Inheritance:** `QHTMLEventListener -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Constructor:** `new QHTMLEventListener(name = "", attributes = {}, body = "")`
- **QHTML syntax:** `q-event-listener EventName(param1, param2) { /* script */ }`
- **Runtime behavior:** binds after the full QHTML tree is created. If the named event resolves in context, it connects to that event object. If it does not resolve, it still listens for `CustomEvent("qhtml:<EventName>")` on `document`.

### Own members

- `eventName()` / `eventNameJs()` — Returns the event name this listener handles.
- `parameters()` — Returns the declared parameter names as an array.
- `parameterList()` / `parameterListJs()` — Returns declared parameters as a comma-separated string.
- `setParameters(parameters)` — Replaces the parameter list from an array.
- `setParameterList(parameters)` / `setParameterListJs(parameters)` — Replaces the parameter list from a comma-separated string.
- `body()` / `bodyJs()` — Returns the script body executed when the event fires.
- `setBody(body)` / `setBodyJs(body)` — Replaces the script body.
- `cloneEventListener()` — Creates a new listener node with matching event name, parameters, attributes, and body.
- `renderHtml()` — Produces no direct HTML output.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source.
- `toJsonObject()` — Returns this listener’s JSON-serializable representation.

## `QHTMLSignalConnection`
Immutable-style record pairing a signal and function receiver.

- **Inheritance:** `QHTMLSignalConnection`
- **Source:** lines 1518-1529
- **Constructor:** `new QHTMLSignalConnection(signal = null, functionNode = null)` (line 1519)
- **Constructor-created fields specific to this class:** `_signal` (null, conventional internal state); `_function` (null, conventional internal state)

### Own members

- `signal()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 1523.
- `function()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 1524.
- `signalUUID()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 1525.
- `functionUUID()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 1526.
- `receiverUUID()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 1527.

## `QHTMLSignalBus`
Connection registry and synchronous dispatch-state recorder for QHTMLSignal/QHTMLFunction objects.

- **Inheritance:** `QHTMLSignalBus`
- **Source:** lines 1530-1582
- **Constructor:** `new QHTMLSignalBus()` (line 1531)
- **Constructor-created fields specific to this class:** `_connections` (Map(0), conventional internal state); `_lastArguments` (Array(0), conventional internal state); `_lastSignalUUID` (string: , conventional internal state); `_lastSenderUUID` (string: , conventional internal state); `_lastFunctionUUID` (string: , conventional internal state); `_lastReceiverUUID` (string: , conventional internal state); `_lastScriptBody` (string: , conventional internal state); `_lastDispatchCount` (number: 0, conventional internal state)

### Own members

- `connect(signal, functionNode)` — Registers a connection between the supplied signal and receiver/function. **Observed return:** `boolean`. **Source:** line 1541.
- `connectJs(signal, functionNode)` — Compatibility alias for `connect()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1550.
- `emitSignal(signal, sender, argumentsList)` — Calls each connected QHTMLFunction, records last-dispatch metadata/body, and returns the invocation count. **Observed return:** `Array`. **Source:** line 1551.
- `emitSignalJs(signal, sender, argumentList)` — Compatibility alias for `emitSignal()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1566.
- `connectionCount(signal)` — Registers a connection between the supplied signal and receiver/function. **Observed return:** `number`. **Source:** line 1567.
- `lastSignalUUID()` — Returns metadata recorded by the most recent call/emission/dispatch. **Observed return:** `string`. **Source:** line 1568.
- `lastSignalUUIDJs()` — Compatibility alias for `lastSignalUUID()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1569.
- `lastSenderUUID()` — Returns metadata recorded by the most recent call/emission/dispatch. **Observed return:** `string`. **Source:** line 1570.
- `lastSenderUUIDJs()` — Compatibility alias for `lastSenderUUID()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1571.
- `lastFunctionUUID()` — Returns metadata recorded by the most recent call/emission/dispatch. **Observed return:** `string`. **Source:** line 1572.
- `lastFunctionUUIDJs()` — Compatibility alias for `lastFunctionUUID()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1573.
- `lastReceiverUUID()` — Returns metadata recorded by the most recent call/emission/dispatch. **Observed return:** `string`. **Source:** line 1574.
- `lastReceiverUUIDJs()` — Compatibility alias for `lastReceiverUUID()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1575.
- `lastScriptBody()` — Returns metadata recorded by the most recent call/emission/dispatch. **Observed return:** `string`. **Source:** line 1576.
- `lastScriptBodyJs()` — Compatibility alias for `lastScriptBody()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1577.
- `lastArgumentList()` — Returns metadata recorded by the most recent call/emission/dispatch. **Observed return:** `string`. **Source:** line 1578.
- `lastArgumentListJs()` — Compatibility alias for `lastArgumentList()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1579.
- `lastDispatchCount()` — Returns metadata recorded by the most recent call/emission/dispatch. **Observed return:** `number`. **Source:** line 1580.

## `QHTMLComponentSlot`
Slot declaration inside a component definition.

- **Inheritance:** `QHTMLComponentSlot -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1583-1603
- **Constructor:** `new QHTMLComponentSlot(name = "", attributes = {})` (line 1584)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `renderHtmlInContext(contextNode)` — Renders this node using the supplied QHTML context for references/interpolation. **Observed return:** `string`. **Source:** line 1589.
- `cloneSlot()` — Creates a new object representing this value/type; see implementation notes for whether UUIDs/children are preserved. **Observed return:** `implementation-defined`. **Source:** line 1595.

## `QHTMLSlotDefault`
Non-rendering declaration of default content for a named slot.

- **Inheritance:** `QHTMLSlotDefault -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1604-1613
- **Constructor:** `new QHTMLSlotDefault(name = "", attributes = {})` (line 1605)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 1610.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 1611.

## `QHTMLPropertyAssignment`
Declarative name/value assignment used for attributes, CSS shortcuts, and configuration.

- **Inheritance:** `QHTMLPropertyAssignment -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1614-1635
- **Constructor:** `new QHTMLPropertyAssignment(name = "", attributes = {})` (line 1615)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_value` (string: , conventional internal state)

### Own members

- `value()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 1621.
- `valueJs()` — Compatibility alias for `value()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1622.
- `setValue(value)` — Sets the value from the supplied value. **Observed return:** `void`. **Source:** line 1623.
- `setValueJs(value)` — Compatibility alias for `setValue()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 1624.
- `cloneAssignment()` — Creates a new object representing this value/type; see implementation notes for whether UUIDs/children are preserved. **Observed return:** `QHTMLPropertyAssignment`. **Source:** line 1625.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 1626.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 1627.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 1633.

## `QHTMLLayout`
Flexbox-backed q-layout base with row/column/layout child helpers.

- **Inheritance:** `QHTMLLayout -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1636-1689
- **Constructor:** `new QHTMLLayout(keyword = "q-layout", name = "", attributes = {}, direction = "column", layoutType = "QHTMLLayout")` (line 1637)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_direction` (string: column, conventional internal state)

### Own members

- `direction()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 1644.
- `directionJs()` — Compatibility alias for `direction()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1645.
- `addRow(row)` — Adds the supplied item to this object and returns the delegated/implementation result. **Observed return:** `implementation-defined`. **Source:** line 1646.
- `addRowJs(row)` — Compatibility alias for `addRow()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1647.
- `addCol(col)` — Adds the supplied item to this object and returns the delegated/implementation result. **Observed return:** `implementation-defined`. **Source:** line 1648.
- `addColJs(col)` — Compatibility alias for `addCol()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1649.
- `addLayout(layout)` — Adds the supplied item to this object and returns the delegated/implementation result. **Observed return:** `implementation-defined`. **Source:** line 1650.
- `addLayoutJs(layout)` — Compatibility alias for `addLayout()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1651.
- `layoutInlineStyle(contextNode = this)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `string`. **Source:** line 1652.
- `renderHtmlInContext(contextNode)` — Renders this node using the supplied QHTML context for references/interpolation. **Observed return:** `string`. **Source:** line 1674.
- `renderHtml()` — Renders this node to an HTML fragment string. **Observed return:** `string`. **Source:** line 1675.
- `renderHtmlForContext(contextNode)` — Renders this node using the supplied context, including context-sensitive attributes/styles/children. **Observed return:** `string`. **Source:** line 1676.

## `QHTMLRowLayout`
q-row specialization of QHTMLLayout using row direction.

- **Inheritance:** `QHTMLRowLayout -> QHTMLLayout -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1690-1695
- **Constructor:** `new QHTMLRowLayout(name = "", attributes = {})` (line 1691)
- **Inherited API:** all public members documented under `QHTMLLayout` and its ancestors.

No own callable members; behavior is constructor specialization plus inherited API.

## `QHTMLColumnLayout`
q-col specialization of QHTMLLayout using column direction.

- **Inheritance:** `QHTMLColumnLayout -> QHTMLLayout -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1696-1701
- **Constructor:** `new QHTMLColumnLayout(name = "", attributes = {})` (line 1697)
- **Inherited API:** all public members documented under `QHTMLLayout` and its ancestors.

No own callable members; behavior is constructor specialization plus inherited API.

## `QHTMLComponentInstanceSlot`
Mutable slot view owned by a component instance.

- **Inheritance:** `QHTMLComponentInstanceSlot -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1702-1723
- **Constructor:** `new QHTMLComponentInstanceSlot(owner = null, definitionSlot = null, name = "")` (line 1703)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_owner` (null, conventional internal state); `_definitionSlot` (null, conventional internal state)

### Own members

- `owner()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 1709.
- `ownerJs()` — Compatibility alias for `owner()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1710.
- `definitionSlot()` — Returns the current `_definitionSlot` state. **Observed return:** `implementation-defined`. **Source:** line 1711.
- `definitionSlotJs()` — Compatibility alias for `definitionSlot()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1712.
- `append(node)` — Appends the supplied value/node and returns the appended value or delegated result. **Observed return:** `implementation-defined`. **Source:** line 1713.
- `appendJs(node)` — Compatibility alias for `append()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1714.
- `remove(node)` — Removes the selected item/reference/category and returns success where implemented. **Observed return:** `implementation-defined`. **Source:** line 1715.
- `removeJs(node)` — Compatibility alias for `remove()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1719.
- `childrenJs()` — Compatibility alias for `children()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1720.
- `renderHtml()` — Renders this node to an HTML fragment string. **Observed return:** `string`. **Source:** line 1721.

## `QHTMLComponentDefinition`
Non-rendering q-component template definition with optional extends metadata.

- **Inheritance:** `QHTMLComponentDefinition -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2172-2212
- **Constructor:** `new QHTMLComponentDefinition(name = "", attributes = {})` (line 2173)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 1730.
- `renderTemplateHtml()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 1731.
- `renderTemplateHtmlJs()` — Compatibility alias for `renderTemplateHtml()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1732.
- `extendsList()` — Returns a serialized/list form of the corresponding values. **Observed return:** `Array`. **Source:** line 1733.
- `extendsListJs()` — Compatibility alias for `extendsList()` with the same behavior and return value. **Observed return:** `string`. **Source:** line 1737.
- `hasExtends()` — Returns whether the named condition is satisfied. **Observed return:** `boolean`. **Source:** line 1738.
- `create(parentNode, properties = {})` — Instantiates this component definition as a new QHTMLComponentInstance, appends it to the supplied QHTML parent node or rendered element's qhtmlNode, applies optional property assignments, rebuilds references, rerenders the parent, and returns the new instance. **Observed return:** `QHTMLComponentInstance`. **Source:** line 2187.
- `createJs(parentNode, properties = {})` — Compatibility alias for `create()` with the same behavior and return value. **Observed return:** `QHTMLComponentInstance`. **Source:** line 2211.

## `QHTMLComponentInstance`
Runtime component instance binding a definition, reference members, slot views/overrides, rendering, and serialization.

- **Inheritance:** `QHTMLComponentInstance -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 1741-2020
- **Constructor:** `new QHTMLComponentInstance(name = "", attributes = {}, definition = null)` (line 1742)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_definition` (null, conventional internal state); `_referenceMembers` (Array(0), conventional internal state); `_slotViews` (Array(0), conventional internal state)

### Own members

- `setDefinition(definition)` — Sets the definition from the supplied value. **Observed return:** `void`. **Source:** line 1756.
- `definition()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 1763.
- `definitionJs()` — Compatibility alias for `definition()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1764.
- `componentDefinition()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 1765.
- `componentDefinitionJs()` — Compatibility alias for `componentDefinition()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1766.
- `componentDefinitionUUID()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `string`. **Source:** line 1767.
- `componentDefinitionUUIDJs()` — Compatibility alias for `componentDefinitionUUID()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1768.
- `referenceMemberCount()` — Returns the current number of corresponding items. **Observed return:** `number`. **Source:** line 1769.
- `referenceMemberAt(index)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 1770.
- `referenceMembers()` — Returns the corresponding collection, usually as a defensive copy. **Observed return:** `Array`. **Source:** line 1771.
- `ownedReferenceMembers()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `Array`. **Source:** line 1772.
- `appendReferenceMember(member)` — Appends the supplied value/node and returns the appended value or delegated result. **Observed return:** `boolean`. **Source:** line 1773.
- `takeReferenceMemberAt(index)` — Removes and returns the selected item; returns null/undefined when absent according to the implementation. **Observed return:** `implementation-defined`. **Source:** line 1780.
- `clearReferenceMembers()` — Clears the corresponding collection/state. **Observed return:** `void`. **Source:** line 1789.
- `collectSlots()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `Array`. **Source:** line 1794.
- `slotCount()` — Returns the current number of corresponding items. **Observed return:** `number`. **Source:** line 1804.
- `slotsJs()` — Returns or manipulates component slot metadata/content. **Observed return:** `Array`. **Source:** line 1805.
- `slotAt(index)` — Returns or manipulates component slot metadata/content. **Observed return:** `implementation-defined`. **Source:** line 1806.
- `slot(name)` — Returns or manipulates component slot metadata/content. **Observed return:** `implementation-defined`. **Source:** line 1807.
- `slotJs(name)` — Compatibility alias for `slot()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1808.
- `ensureSlotViews()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 1809.
- `slotViewAt(index)` — Returns or manipulates component slot metadata/content. **Observed return:** `implementation-defined`. **Source:** line 1822.
- `slotView(name)` — Returns or manipulates component slot metadata/content. **Observed return:** `implementation-defined`. **Source:** line 1823.
- `slotViewJs(name)` — Compatibility alias for `slotView()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1824.
- `slotNames()` — Returns a serialized/list form of the corresponding values. **Observed return:** `string`. **Source:** line 1825.
- `slotNamesJs()` — Compatibility alias for `slotNames()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1826.
- `appendToSlot(slotName, node)` — Clones the supplied node and appends the clone to the named mutable instance slot; returns the appended node or null. **Observed return:** `implementation-defined`. **Source:** line 1827.
- `removeFromSlot(slotName, node)` — Removes the selected item/reference/category and returns success where implemented. **Observed return:** `implementation-defined`. **Source:** line 1831.
- `slotDefault(slotName)` — Returns or manipulates component slot metadata/content. **Observed return:** `object | null`. **Source:** line 1835.
- `slotDefaultJs(slotName)` — Compatibility alias for `slotDefault()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1839.
- `slotOverride(slotName)` — Returns or manipulates component slot metadata/content. **Observed return:** `implementation-defined`. **Source:** line 1840.
- `slotOverrideJs(slotName)` — Compatibility alias for `slotOverride()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 1843.
- `slotChildren(slotName)` — Returns slot content by priority: explicit child override, mutable slot view, q-slot-default, then the declaration’s own children. **Observed return:** `Array`. **Source:** line 1844.
- `renderSlotForOwnedDefinition(componentSlot)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `string`. **Source:** line 1854.
- `renderHtml()` — Renders the bound component definition, substitutes slot overrides/views/defaults, omits metadata declarations, applies instance attributes/styles, and wraps with the definition name when nonempty. **Observed return:** `string`. **Source:** line 1864.
- `instanceInlineStyle()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `string`. **Source:** line 1895.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 1906.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 1912.

## `QHTMLWorker`
Named q-worker declaration; this type file does not implement worker execution.

- **Inheritance:** `QHTMLWorker -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2648-2754
- **Constructor:** `new QHTMLWorker(name = "", attributes = {})` (line 2649)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2650.

## `QHTMLArrayNode`
Simple programmatic array-valued QHTMLNode.

- **Inheritance:** `QHTMLArrayNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2021-2031
- **Constructor:** `new QHTMLArrayNode(name = "", values = [])` (line 2022)
- **Inherited API:** all public members documented under `QHTMLNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_values` (Array(0), conventional internal state)

### Own members

- `values()` — Returns a defensive shallow copy of the corresponding stored value. **Observed return:** `Array`. **Source:** line 2026.
- `valueAt(index)` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 2027.
- `append(value)` — Appends the supplied value/node and returns the appended value or delegated result. **Observed return:** `implementation-defined`. **Source:** line 2028.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2029.

## `QHTMLMapNode`
Simple programmatic object-valued QHTMLNode.

- **Inheritance:** `QHTMLMapNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2032-2042
- **Constructor:** `new QHTMLMapNode(name = "", values = {})` (line 2033)
- **Inherited API:** all public members documented under `QHTMLNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_values` (Object, conventional internal state)

### Own members

- `values()` — Returns a defensive shallow copy of the corresponding stored value. **Observed return:** `Array`. **Source:** line 2037.
- `value(key)` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 2038.
- `insert(key, value)` — Inserts the supplied value/node at the requested position. **Observed return:** `void`. **Source:** line 2039.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2040.

## `QHTMLJsonValue`
QHTMLNode wrapper around an arbitrary JavaScript/JSON value.

- **Inheritance:** `QHTMLJsonValue -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2043-2056
- **Constructor:** `new QHTMLJsonValue(name = "", value = null)` (line 2044)
- **Inherited API:** all public members documented under `QHTMLNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_value` (null, conventional internal state)

### Own members

- `value()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 2048.
- `setValue(value)` — Sets the value from the supplied value. **Observed return:** `void`. **Source:** line 2049.
- `toJson()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `string`. **Source:** line 2050.
- `toJsonJs()` — Compatibility alias for `toJson()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2051.
- `valuesLiteral()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2052.
- `valuesLiteralJs()` — Compatibility alias for `valuesLiteral()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2053.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2054.

## `QHTMLJsonArray`
QHTMLJsonValue specialization tagged as an array.

- **Inheritance:** `QHTMLJsonArray -> QHTMLJsonValue -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2057-2060
- **Constructor:** `new QHTMLJsonArray(name = "", value = [])` (line 2058)
- **Inherited API:** all public members documented under `QHTMLJsonValue` and its ancestors.

No own callable members; behavior is constructor specialization plus inherited API.

## `QHTMLJsonObject`
QHTMLJsonValue specialization tagged as an object.

- **Inheritance:** `QHTMLJsonObject -> QHTMLJsonValue -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2061-2064
- **Constructor:** `new QHTMLJsonObject(name = "", value = {})` (line 2062)
- **Inherited API:** all public members documented under `QHTMLJsonValue` and its ancestors.

No own callable members; behavior is constructor specialization plus inherited API.

## `QHTMLJsonDocument`
JSON document wrapper with parsing, shape tests, size, and typed root views.

- **Inheritance:** `QHTMLJsonDocument -> QHTMLJsonValue -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2065-2083
- **Constructor:** `new QHTMLJsonDocument(name = "", value = null)` (line 2066)
- **Inherited API:** all public members documented under `QHTMLJsonValue` and its ancestors.

### Own members

- `fromJSONText(json)` — Parses JSON text and loads the resulting value into this object; JSON.parse errors propagate. **Observed return:** `boolean`. **Source:** line 2067.
- `toJSONText()` — Serializes the JSON representation to a JSON text string. **Observed return:** `string`. **Source:** line 2068.
- `parse(json)` — Parses the supplied source/text into this object or a normalized value. **Observed return:** `implementation-defined`. **Source:** line 2069.
- `parseJs(json)` — Compatibility alias for `parse()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2070.
- `isArray()` — Returns whether the named condition is satisfied. **Observed return:** `Array`. **Source:** line 2071.
- `isObject()` — Returns whether the named condition is satisfied. **Observed return:** `boolean`. **Source:** line 2072.
- `isEmpty()` — Returns whether the named condition is satisfied. **Observed return:** `boolean`. **Source:** line 2073.
- `parseError()` — Always returns an empty string; parse failures from JSON.parse throw instead of being stored. **Observed return:** `implementation-defined`. **Source:** line 2074.
- `size()` — Returns the current number of corresponding items. **Observed return:** `Array`. **Source:** line 2075.
- `rootValue()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `QHTMLJsonValue`. **Source:** line 2076.
- `rootValueJs()` — Compatibility alias for `rootValue()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2077.
- `array()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `QHTMLJsonArray`. **Source:** line 2078.
- `arrayJs()` — Compatibility alias for `array()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2079.
- `object()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `QHTMLJsonObject`. **Source:** line 2080.
- `objectJs()` — Compatibility alias for `object()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2081.

## `QHTMLArray`
Declarative q-array that materializes child nodes into a JavaScript array.

- **Inheritance:** `QHTMLArray -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2084-2110
- **Constructor:** `new QHTMLArray(name = "", attributes = {})` (line 2085)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `valueArray()` — Returns the corresponding stored or derived value. **Observed return:** `Array`. **Source:** line 2086.
- `arrayValue()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `QHTMLJsonArray`. **Source:** line 2103.
- `arrayValueJs()` — Compatibility alias for `arrayValue()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2104.
- `jsonDocument()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `QHTMLJsonDocument`. **Source:** line 2105.
- `jsonDocumentJs()` — Compatibility alias for `jsonDocument()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2106.
- `valuesLiteral()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2107.
- `valuesLiteralJs()` — Compatibility alias for `valuesLiteral()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2108.

## `QHTMLMap`
Declarative q-map that materializes named child nodes into a JavaScript object.

- **Inheritance:** `QHTMLMap -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2111-2143
- **Constructor:** `new QHTMLMap(name = "", attributes = {})` (line 2112)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `valueObject()` — Returns the corresponding stored or derived value. **Observed return:** `object`. **Source:** line 2113.
- `objectValue()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `QHTMLJsonObject`. **Source:** line 2132.
- `objectValueJs()` — Compatibility alias for `objectValue()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2133.
- `jsonDocument()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `QHTMLJsonDocument`. **Source:** line 2134.
- `jsonDocumentJs()` — Compatibility alias for `jsonDocument()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2135.
- `value(key)` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 2136.
- `valueJs(key)` — Compatibility alias for `value()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2137.
- `keysLiteral()` — Returns the corresponding collection, usually as a defensive copy. **Observed return:** `string`. **Source:** line 2138.
- `keysLiteralJs()` — Compatibility alias for `keysLiteral()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2139.
- `valuesLiteral()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2140.
- `valuesLiteralJs()` — Compatibility alias for `valuesLiteral()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2141.

## `QHTMLModel`
Declarative q-model that selects an array/map/JSON document child as its data document.

- **Inheritance:** `QHTMLModel -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2144-2157
- **Constructor:** `new QHTMLModel(name = "", attributes = {})` (line 2145)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `jsonDocument()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `QHTMLJsonDocument`. **Source:** line 2146.
- `jsonDocumentJs()` — Compatibility alias for `jsonDocument()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2153.
- `valuesLiteral()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2154.
- `valuesLiteralJs()` — Compatibility alias for `valuesLiteral()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2155.

## `QHTMLProperty`
Declarative property supporting scalar source values and structured array/map values.

- **Inheritance:** `QHTMLProperty -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2158-2239
- **Constructor:** `new QHTMLProperty(name = "", attributes = {})` (line 2159)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_value` (string: , conventional internal state); `_structuredValue` (undefined: undefined, conventional internal state)

### Own members

- `value()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 2166.
- `valueJs()` — Compatibility alias for `value()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2167.
- `setValue(value)` — Sets the value from the supplied value. **Observed return:** `void`. **Source:** line 2168.
- `setValueJs(value)` — Compatibility alias for `setValue()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 2169.
- `jsValue()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 2170.
- `structuredType()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `string`. **Source:** line 2171.
- `structuredTypeJs()` — Compatibility alias for `structuredType()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2177.
- `structuredValue()` — Returns the current `_structuredValue` state. **Observed return:** `implementation-defined`. **Source:** line 2178.
- `structuredValueJs()` — Returns the explicitly stored structured value when truthy; otherwise wraps parsed arrays/objects in QHTMLJsonArray/QHTMLJsonObject, or returns null. **Observed return:** `QHTMLJsonArray`. **Source:** line 2179.
- `valueArray()` — Returns a copy of an explicit array; for value q-array materializes children recursively; otherwise parses the scalar source and returns an array or empty array. **Observed return:** `Array`. **Source:** line 2186.
- `valueArrayJs()` — Compatibility alias for `valueArray()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2203.
- `valueObject()` — Returns a copy of an explicit object; for value q-map materializes named children; otherwise parses the scalar source and returns an object or empty object. **Observed return:** `object`. **Source:** line 2204.
- `valueObjectJs()` — Compatibility alias for `valueObject()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2222.
- `valuesLiteral()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2223.
- `valuesLiteralJs()` — Compatibility alias for `valuesLiteral()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2228.
- `setStructuredValue(value)` — Sets the structured value from the supplied value. **Observed return:** `void`. **Source:** line 2229.
- `cloneProperty()` — Creates a new object representing this value/type; see implementation notes for whether UUIDs/children are preserved. **Observed return:** `implementation-defined`. **Source:** line 2230.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2233.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 2234.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2237.

## `QHTMLJavaScriptRuntime`
Compile-only placeholder runtime; reports unavailable and records submitted source.

- **Inheritance:** `QHTMLJavaScriptRuntime`
- **Source:** lines 2240-2246
- **Constructor:** `new QHTMLJavaScriptRuntime()` (line 2241)
- **Constructor-created fields specific to this class:** `_compiled` (Array(0), conventional internal state)

### Own members

- `isAvailable()` — Always returns false in this implementation. **Observed return:** `boolean`. **Source:** line 2242.
- `compileOnly(source)` — Stores the source string in an internal list and returns true; it does not compile or execute JavaScript. **Observed return:** `boolean`. **Source:** line 2243.
- `compiledSources()` — Submits source to the JavaScript runtime abstraction and returns its status. **Observed return:** `Array`. **Source:** line 2244.

## `QHTMLImportNode`
q-import/q-require declaration with path and cache-mode parsing.

- **Inheritance:** `QHTMLImportNode -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2247-2271
- **Constructor:** `new QHTMLImportNode(name = "", attributes = {}, body = "")` (line 2248)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_body` (string: , conventional internal state)

### Own members

- `body()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2253.
- `bodyJs()` — Compatibility alias for `body()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2254.
- `setBody(body)` — Sets the body from the supplied value. **Observed return:** `void`. **Source:** line 2255.
- `setBodyJs(body)` — Compatibility alias for `setBody()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 2256.
- `path()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2257.
- `pathJs()` — Compatibility alias for `path()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2258.
- `cacheMode()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2259.
- `cacheModeJs()` — Compatibility alias for `cacheMode()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2263.
- `isRequire()` — Returns whether the named condition is satisfied. **Observed return:** `boolean`. **Source:** line 2264.
- `importKind()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2265.
- `importKindJs()` — Compatibility alias for `importKind()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2266.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2267.
- `sourceQHTML(indentLevel = 0)` — Emits a q-import block from the stored body. The implementation uses q-import even when isRequire() is true. **Observed return:** `string`. **Source:** line 2268.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2269.

## `QHTMLForNode`
Declarative loop that clones child nodes for array values and renders each iteration in a local context.

- **Inheritance:** `QHTMLForNode -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2272-2338
- **Constructor:** `new QHTMLForNode(name = "", attributes = {}, body = "")` (line 2273)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_variableName` (string: item, conventional internal state); `_collectionExpression` (string: , conventional internal state); `_body` (string: , conventional internal state); `_lastRenderedIterationNodes` (Array(0), conventional internal state)

### Own members

- `variableName()` — Returns the current `_variableName` state. **Observed return:** `implementation-defined`. **Source:** line 2281.
- `variableNameJs()` — Compatibility alias for `variableName()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2282.
- `setVariableName(value)` — Sets the variable name from the supplied value. **Observed return:** `void`. **Source:** line 2283.
- `collectionExpression()` — Returns the current `_collectionExpression` state. **Observed return:** `implementation-defined`. **Source:** line 2284.
- `collectionExpressionJs()` — Compatibility alias for `collectionExpression()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2285.
- `setCollectionExpression(value)` — Sets the collection expression from the supplied value. **Observed return:** `void`. **Source:** line 2286.
- `body()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2287.
- `bodyJs()` — Compatibility alias for `body()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2288.
- `setBody(body)` — Sets the body from the supplied value. **Observed return:** `void`. **Source:** line 2289.
- `setBodyJs(body)` — Compatibility alias for `setBody()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 2290.
- `renderHtmlInContext(contextNode)` — Resolves an array collection, clones/re-UUIDs children per item, materializes direct item expressions, renders in a local iteration context, and records cloned iteration nodes. **Observed return:** `string`. **Source:** line 2291.
- `lastRenderedIterationNodes()` — Returns the corresponding collection, usually as a defensive copy. **Observed return:** `Array`. **Source:** line 2326.
- `lastRenderedIterationNodesJs()` — Compatibility alias for `lastRenderedIterationNodes()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2327.
- `renderHtml()` — Renders this node to an HTML fragment string. **Observed return:** `string`. **Source:** line 2328.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2329.

## `QHTMLEventHandler`
Non-rendering event-handler declaration containing event name, parameters, body, and propagation flag.

- **Inheritance:** `QHTMLEventHandler -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2339-2363
- **Constructor:** `new QHTMLEventHandler(name = "", attributes = {}, body = "")` (line 2340)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_eventName` (string: , conventional internal state); `_parameters` (Array(0), conventional internal state); `_body` (string: , conventional internal state); `_propagate` (boolean: false, conventional internal state)

### Own members

- `eventName()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2348.
- `eventNameJs()` — Compatibility alias for `eventName()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2349.
- `parameters()` — Returns the corresponding collection, usually as a defensive copy. **Observed return:** `Array`. **Source:** line 2350.
- `parameterList()` — Returns a serialized/list form of the corresponding values. **Observed return:** `string`. **Source:** line 2351.
- `parameterListJs()` — Compatibility alias for `parameterList()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2352.
- `body()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2353.
- `bodyJs()` — Compatibility alias for `body()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2354.
- `propagate()` — Returns the corresponding stored or derived value. **Observed return:** `boolean`. **Source:** line 2355.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2356.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 2357.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2361.

## `QHTMLPainter`
Non-rendering painter declaration with source body and optional paint event child.

- **Inheritance:** `QHTMLPainter -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2364-2381
- **Constructor:** `new QHTMLPainter(name = "", attributes = {}, body = "")` (line 2365)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_body` (string: , conventional internal state)

### Own members

- `body()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2370.
- `setBody(body)` — Sets the body from the supplied value. **Observed return:** `void`. **Source:** line 2371.
- `setBodyJs(body)` — Compatibility alias for `setBody()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 2372.
- `paintHandler()` — Returns paint-handler metadata or source for this painter/canvas. **Observed return:** `implementation-defined`. **Source:** line 2373.
- `paintHandlerJs()` — Compatibility alias for `paintHandler()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2376.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2377.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 2378.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2379.

## `QHTMLCanvas`
Canvas declaration rendered as an HTML canvas and exposing its paint handler/body.

- **Inheritance:** `QHTMLCanvas -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2382-2401
- **Constructor:** `new QHTMLCanvas(name = "", attributes = {})` (line 2383)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `renderHtml()` — Renders this node to an HTML fragment string. **Observed return:** `string`. **Source:** line 2387.
- `paintHandler()` — Returns paint-handler metadata or source for this painter/canvas. **Observed return:** `implementation-defined`. **Source:** line 2391.
- `paintHandlerJs()` — Compatibility alias for `paintHandler()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2394.
- `paintBody()` — Returns paint-handler metadata or source for this painter/canvas. **Observed return:** `string`. **Source:** line 2395.
- `paintBodyJs()` — Compatibility alias for `paintBody()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2399.

## `QHTMLVideoAsset`
Reference-only video asset descriptor; constructor stores a public attributes object.

- **Inheritance:** `QHTMLVideoAsset -> QHTMLReference`
- **Source:** lines 2402-2405
- **Constructor:** `new QHTMLVideoAsset(name = "", attributes = {})` (line 2403)
- **Inherited API:** all public members documented under `QHTMLReference` and its ancestors.
- **Constructor-created fields specific to this class:** `attributes` (Object, direct public field)

No own callable members; behavior is constructor specialization plus inherited API.

## `QHTMLVideoPlayer`
Reference-only video player descriptor; constructor stores a public attributes object.

- **Inheritance:** `QHTMLVideoPlayer -> QHTMLReference`
- **Source:** lines 2406-2409
- **Constructor:** `new QHTMLVideoPlayer(name = "", attributes = {})` (line 2407)
- **Inherited API:** all public members documented under `QHTMLReference` and its ancestors.
- **Constructor-created fields specific to this class:** `attributes` (Object, direct public field)

No own callable members; behavior is constructor specialization plus inherited API.

## `QHTMLVideo`
q-video node rendered as an HTML video element.

- **Inheritance:** `QHTMLVideo -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2410-2420
- **Constructor:** `new QHTMLVideo(name = "", attributes = {})` (line 2411)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `renderHtml()` — Renders this node to an HTML fragment string. **Observed return:** `string`. **Source:** line 2415.

## `QHTMLParticleEmitter`
particle-emitter node rendered as a custom element.

- **Inheritance:** `QHTMLParticleEmitter -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2421-2431
- **Constructor:** `new QHTMLParticleEmitter(name = "", attributes = {})` (line 2422)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `renderHtml()` — Renders this node to an HTML fragment string. **Observed return:** `string`. **Source:** line 2426.

## `QHTMLConnect`
Non-rendering connection declaration with source/from and target/to paths.

- **Inheritance:** `QHTMLConnect -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2432-2449
- **Constructor:** `new QHTMLConnect(name = "", attributes = {}, body = "")` (line 2433)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_body` (string: , conventional internal state)

### Own members

- `body()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2438.
- `bodyJs()` — Compatibility alias for `body()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2439.
- `setBody(body)` — Sets the body from the supplied value. **Observed return:** `void`. **Source:** line 2440.
- `setBodyJs(body)` — Compatibility alias for `setBody()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 2441.
- `sourcePath()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 2442.
- `sourcePathJs()` — Compatibility alias for `sourcePath()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2443.
- `targetPath()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 2444.
- `targetPathJs()` — Compatibility alias for `targetPath()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2445.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2446.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2447.

## `QHTMLTimer`
q-timer declaration that owns a timeout signal.

- **Inheritance:** `QHTMLTimer -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2450-2460
- **Constructor:** `new QHTMLTimer(name = "", attributes = {})` (line 2451)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_timeoutSignal` (QHTMLSignal, conventional internal state)

### Own members

- `timeoutSignal()` — Returns the current `_timeoutSignal` state. **Observed return:** `implementation-defined`. **Source:** line 2457.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2458.

## `QHTMLPropertyAnimation`
Property-animation declaration owning lifecycle signals.

- **Inheritance:** `QHTMLPropertyAnimation -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2461-2483
- **Constructor:** `new QHTMLPropertyAnimation(name = "", attributes = {})` (line 2462)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_signals` (Object, conventional internal state)

### Own members

- `startedSignal()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 2476.
- `stoppedSignal()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 2477.
- `steppedSignal()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 2478.
- `endedSignal()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 2479.
- `finishedSignal()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 2480.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2481.

## `QHTMLScriptAction`
Non-rendering animation/script action body.

- **Inheritance:** `QHTMLScriptAction -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2484-2493
- **Constructor:** `new QHTMLScriptAction(name = "", attributes = {}, body = "")` (line 2485)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_body` (string: , conventional internal state)

### Own members

- `body()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2486.
- `bodyJs()` — Compatibility alias for `body()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2487.
- `setBody(body)` — Sets the body from the supplied value. **Observed return:** `void`. **Source:** line 2488.
- `setBodyJs(body)` — Compatibility alias for `setBody()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 2489.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2490.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2491.

## `QHTMLAnimationGroup`
Non-rendering base for animation groups.

- **Inheritance:** `QHTMLAnimationGroup -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2494-2497
- **Constructor:** `new QHTMLAnimationGroup(keyword = "q-animation-group", name = "", attributes = {})` (line 2495)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2496.

## `QHTMLSequentialAnimation`
Sequential animation-group specialization.

- **Inheritance:** `QHTMLSequentialAnimation -> QHTMLAnimationGroup -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2498-2500
- **Constructor:** `new QHTMLSequentialAnimation(name = "", attributes = {})` (line 2499)
- **Inherited API:** all public members documented under `QHTMLAnimationGroup` and its ancestors.

No own callable members; behavior is constructor specialization plus inherited API.

## `QHTMLParallelAnimation`
Parallel animation-group specialization.

- **Inheritance:** `QHTMLParallelAnimation -> QHTMLAnimationGroup -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2501-2503
- **Constructor:** `new QHTMLParallelAnimation(name = "", attributes = {})` (line 2502)
- **Inherited API:** all public members documented under `QHTMLAnimationGroup` and its ancestors.

No own callable members; behavior is constructor specialization plus inherited API.

## `QHTMLBehavior`
Behavior declaration associated with a property.

- **Inheritance:** `QHTMLBehavior -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2504-2513
- **Constructor:** `new QHTMLBehavior(name = "", attributes = {})` (line 2505)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `propertyName()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 2506.
- `propertyNameJs()` — Compatibility alias for `propertyName()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2507.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2508.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 2509.

## `QHTMLStyle`
Named style declaration that can derive CSS from a raw body, cssText attribute, or property assignments.

- **Inheritance:** `QHTMLStyle -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2514-2535
- **Constructor:** `new QHTMLStyle(name = "", attributes = {}, body = "")` (line 2515)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_body` (string: , conventional internal state)

### Own members

- `body()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2516.
- `bodyJs()` — Compatibility alias for `body()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2517.
- `setBody(body)` — Sets the body from the supplied value. **Observed return:** `void`. **Source:** line 2518.
- `setBodyJs(body)` — Compatibility alias for `setBody()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 2519.
- `cssText()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `string`. **Source:** line 2520.
- `cssTextJs()` — Compatibility alias for `cssText()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2521.
- `setCssText(value)` — Sets the css text from the supplied value. **Observed return:** `void`. **Source:** line 2522.
- `setCssTextJs(value)` — Compatibility alias for `setCssText()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 2523.
- `classList()` — Returns a serialized/list form of the corresponding values. **Observed return:** `string`. **Source:** line 2524.
- `classListJs()` — Compatibility alias for `classList()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2525.
- `declarations(contextNode = this)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `string`. **Source:** line 2526.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2532.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2533.

## `QHTMLTransition`
Transition declaration exposing property, duration, timing, and delay settings.

- **Inheritance:** `QHTMLTransition -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2536-2549
- **Constructor:** `new QHTMLTransition(name = "", attributes = {}, body = "")` (line 2537)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_body` (string: , conventional internal state)

### Own members

- `body()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2538.
- `bodyJs()` — Compatibility alias for `body()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2539.
- `setBody(body)` — Sets the body from the supplied value. **Observed return:** `void`. **Source:** line 2540.
- `setBodyJs(body)` — Compatibility alias for `setBody()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 2541.
- `property()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 2542.
- `duration()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2543.
- `timing()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2544.
- `delay()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2545.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2546.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2547.

## `QHTMLTransitionApplication`
Non-rendering application of a transition/property list.

- **Inheritance:** `QHTMLTransitionApplication -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2550-2557
- **Constructor:** `new QHTMLTransitionApplication(name = "", attributes = {})` (line 2551)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `propertyList()` — Returns a serialized/list form of the corresponding values. **Observed return:** `string`. **Source:** line 2552.
- `propertyListJs()` — Compatibility alias for `propertyList()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2553.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2554.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 2555.

## `QHTMLTheme`
Theme/default-theme declaration with source body and default-theme detection.

- **Inheritance:** `QHTMLTheme -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2558-2575
- **Constructor:** `new QHTMLTheme(name = "", attributes = {}, body = "")` (line 2559)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_body` (string: , conventional internal state)

### Own members

- `body()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2560.
- `bodyJs()` — Compatibility alias for `body()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2561.
- `setBody(body)` — Sets the body from the supplied value. **Observed return:** `void`. **Source:** line 2562.
- `setBodyJs(body)` — Compatibility alias for `setBody()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 2563.
- `isDefaultTheme()` — Returns whether the named condition is satisfied. **Observed return:** `boolean`. **Source:** line 2564.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2565.
- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 2566.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2573.

## `QHTMLStyleApplication`
Wrapper custom element applying a named QHTML style to rendered children.

- **Inheritance:** `QHTMLStyleApplication -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2576-2585
- **Constructor:** `new QHTMLStyleApplication(name = "", attributes = {})` (line 2577)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `renderHtml()` — Renders this node to an HTML fragment string. **Observed return:** `string`. **Source:** line 2578.

## `QHTMLThemeApplication`
Wrapper custom element applying a named QHTML theme to rendered children.

- **Inheritance:** `QHTMLThemeApplication -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2586-2595
- **Constructor:** `new QHTMLThemeApplication(name = "", attributes = {})` (line 2587)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `renderHtml()` — Renders this node to an HTML fragment string. **Observed return:** `string`. **Source:** line 2588.

## `QHTMLSlot`
Generic slot node specialization.

- **Inheritance:** `QHTMLSlot -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2596-2598
- **Constructor:** `new QHTMLSlot(name = "", attributes = {})` (line 2597)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

No own callable members; behavior is constructor specialization plus inherited API.

## `QHTMLClass`
Non-rendering q-class source-body declaration.

- **Inheritance:** `QHTMLClass -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2599-2607
- **Constructor:** `new QHTMLClass(name = "", attributes = {}, body = "")` (line 2600)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_body` (string: , conventional internal state)

### Own members

- `body()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2601.
- `bodyJs()` — Compatibility alias for `body()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2602.
- `setBody(body)` — Sets the body from the supplied value. **Observed return:** `void`. **Source:** line 2603.
- `setBodyJs(body)` — Compatibility alias for `setBody()` with the same behavior and return value. **Observed return:** `void`. **Source:** line 2604.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2605.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2606.

## `QHTMLVar`
Non-rendering q-var declaration.

- **Inheritance:** `QHTMLVar -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2608-2611
- **Constructor:** `new QHTMLVar(name = "", attributes = {})` (line 2609)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2610.

## `QHTMLTemplate`
Non-rendering q-template declaration.

- **Inheritance:** `QHTMLTemplate -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2612-2615
- **Constructor:** `new QHTMLTemplate(name = "", attributes = {})` (line 2613)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2614.

## `QHTMLScript`
Non-rendering q-script declaration with serialized body.

- **Inheritance:** `QHTMLScript -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2616-2621
- **Constructor:** `new QHTMLScript(name = "", attributes = {}, body = "")` (line 2617)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_body` (string: , conventional internal state)

### Own members

- `body()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2618.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2619.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2620.

## `QHTMLModelView`
q-model-view declaration exposing an item alias and a JSON-document child lookup.

- **Inheritance:** `QHTMLModelView -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2622-2631
- **Constructor:** `new QHTMLModelView(name = "", attributes = {})` (line 2623)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

### Own members

- `aliasName()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2624.
- `aliasNameJs()` — Compatibility alias for `aliasName()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2625.
- `modelDocument()` — Searches for model/array/map/JSON-document children but returns a value only when the selected child is already QHTMLJsonDocument; otherwise returns null. **Observed return:** `implementation-defined`. **Source:** line 2626.
- `modelDocumentJs()` — Compatibility alias for `modelDocument()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2630.

## `QHTMLFactory`
q-factory typed node; no behavior beyond inherited tree/attribute APIs.

- **Inheritance:** `QHTMLFactory -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2632-2634
- **Constructor:** `new QHTMLFactory(name = "", attributes = {})` (line 2633)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.

No own callable members; behavior is constructor specialization plus inherited API.

## `QHTMLMethod`
Non-rendering q-method source-body declaration.

- **Inheritance:** `QHTMLMethod -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2635-2641
- **Constructor:** `new QHTMLMethod(name = "", attributes = {}, body = "")` (line 2636)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_body` (string: , conventional internal state)

### Own members

- `body()` — Returns the corresponding stored or derived value. **Observed return:** `string`. **Source:** line 2637.
- `bodyJs()` — Compatibility alias for `body()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2638.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2639.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2640.

## `QHTMLSourceFragment`
Raw QHTML source fragment emitted verbatim with indentation.

- **Inheritance:** `QHTMLSourceFragment -> QHTMLTypedNode -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2642-2647
- **Constructor:** `new QHTMLSourceFragment(value = "")` (line 2643)
- **Inherited API:** all public members documented under `QHTMLTypedNode` and its ancestors.
- **Constructor-created fields specific to this class:** `_value` (string: , conventional internal state)

### Own members

- `sourceQHTML(indentLevel = 0)` — Serializes this node to QHTML source with optional indentation. **Observed return:** `string`. **Source:** line 2644.
- `renderHtml()` — Produces no direct HTML output; this node is metadata/runtime-only. **Observed return:** `string`. **Source:** line 2645.

## `QHTMLDomTree`
Root document tree with signal bus, JavaScript compile recorder, JSON loading, reference rebuilding, traversal, and standalone HTML export.

- **Inheritance:** `QHTMLDomTree -> QHTMLDomNode -> QHTMLNode -> QHTMLReference`
- **Source:** lines 2755-2959
- **Constructor:** `new QHTMLDomTree()` (line 2756)
- **Inherited API:** all public members documented under `QHTMLDomNode` and its ancestors.
- **Constructor-created fields specific to this class:** `qhtmlSignalBus` (QHTMLSignalBus, direct public field); `qhtmlJavaScriptRuntime` (QHTMLJavaScriptRuntime, direct public field)

### Own members

- `clear()` — Clears the corresponding collection/state. **Observed return:** `void`. **Source:** line 2761.
- `root()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 2762.
- `rootJs()` — Compatibility alias for `root()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2763.
- `signalBus()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 2764.
- `signalBusJs()` — Compatibility alias for `signalBus()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2765.
- `javascriptRuntime()` — Returns the corresponding stored or derived value. **Observed return:** `implementation-defined`. **Source:** line 2766.
- `quickJSAvailable()` — Returns whether the named condition is satisfied. **Observed return:** `boolean`. **Source:** line 2767.
- `quickJSAvailableJs()` — Compatibility alias for `quickJSAvailable()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2768.
- `compileJavaScript(source)` — Submits source to the JavaScript runtime abstraction and returns its status. **Observed return:** `implementation-defined`. **Source:** line 2769.
- `compileJavaScriptJs(source)` — Compatibility alias for `compileJavaScript()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2770.
- `renderHtml()` — Renders this node to an HTML fragment string. **Observed return:** `string`. **Source:** line 2771.
- `fromJSON(value)` — Loads either a root-child array or node object, resolves component definitions, rebuilds references, and returns success. **Observed return:** `boolean`. **Source:** line 2772.
- `fromJsonValue(value)` — Loads object state from the supplied JSON-compatible value and returns the implementation’s success result. **Observed return:** `implementation-defined`. **Source:** line 2788.
- `fromJsonObject(object)` — Loads object state from the supplied JSON-compatible value and returns the implementation’s success result. **Observed return:** `implementation-defined`. **Source:** line 2789.
- `fromJSONText(json)` — Parses JSON text and loads the resulting value into this object; JSON.parse errors propagate. **Observed return:** `implementation-defined`. **Source:** line 2795.
- `fromJSONTextJs(json)` — Compatibility alias for `fromJSONText()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2796.
- `toJSON()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2797.
- `toJSONJs()` — Compatibility alias for `toJSON()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2798.
- `toJSONText()` — Serializes the JSON representation to a JSON text string. **Observed return:** `string`. **Source:** line 2799.
- `toJSONTextJs()` — Compatibility alias for `toJSONText()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2800.
- `walk(visitor)` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `void`. **Source:** line 2801.
- `resolveComponentInstanceDefinitions()` — Performs the operation indicated by the signature using this object’s stored QHTML state. **Observed return:** `implementation-defined`. **Source:** line 2813.
- `rebuildQHTMLReferences()` — Recomputes lexical/named references for the root, component definitions/instances, descendants, and owned reference members. **Observed return:** `boolean`. **Source:** line 2839.
- `rebuildQHTMLReferencesJs()` — Compatibility alias for `rebuildQHTMLReferences()` with the same behavior and return value. **Observed return:** `implementation-defined`. **Source:** line 2843.
- `toHTML()` — Produces a complete standalone HTML document containing metadata, generator version, title, and the rendered tree body. **Observed return:** `string`. **Source:** line 2844.
- `toJsonObject()` — Returns this object’s JSON-serializable representation. **Observed return:** `implementation-defined`. **Source:** line 2848.

## Appendix A: Complete CSS shortcut map

| QHTML/JS shortcut | Canonical CSS property |
|---|---|
| `alignContent` | `align-content` |
| `alignItems` | `align-items` |
| `alignSelf` | `align-self` |
| `aspectRatio` | `aspect-ratio` |
| `background` | `background` |
| `backgroundColor` | `background-color` |
| `backgroundImage` | `background-image` |
| `backgroundPosition` | `background-position` |
| `backgroundRepeat` | `background-repeat` |
| `backgroundSize` | `background-size` |
| `borderColor` | `border-color` |
| `borderRadius` | `border-radius` |
| `borderStyle` | `border-style` |
| `borderWidth` | `border-width` |
| `bottom` | `bottom` |
| `boxShadow` | `box-shadow` |
| `boxSizing` | `box-sizing` |
| `color` | `color` |
| `columnGap` | `column-gap` |
| `cursor` | `cursor` |
| `display` | `display` |
| `filter` | `filter` |
| `flex` | `flex` |
| `flexBasis` | `flex-basis` |
| `flexDirection` | `flex-direction` |
| `flexGrow` | `flex-grow` |
| `flexShrink` | `flex-shrink` |
| `flexWrap` | `flex-wrap` |
| `fontFamily` | `font-family` |
| `fontSize` | `font-size` |
| `fontStyle` | `font-style` |
| `fontWeight` | `font-weight` |
| `gap` | `gap` |
| `gridArea` | `grid-area` |
| `gridColumn` | `grid-column` |
| `gridRow` | `grid-row` |
| `height` | `height` |
| `justifyContent` | `justify-content` |
| `justifyItems` | `justify-items` |
| `justifySelf` | `justify-self` |
| `left` | `left` |
| `letterSpacing` | `letter-spacing` |
| `lineHeight` | `line-height` |
| `listStyle` | `list-style` |
| `listStyleType` | `list-style-type` |
| `margin` | `margin` |
| `marginBottom` | `margin-bottom` |
| `marginLeft` | `margin-left` |
| `marginRight` | `margin-right` |
| `marginTop` | `margin-top` |
| `maxHeight` | `max-height` |
| `maxWidth` | `max-width` |
| `minHeight` | `min-height` |
| `minWidth` | `min-width` |
| `objectFit` | `object-fit` |
| `objectPosition` | `object-position` |
| `opacity` | `opacity` |
| `order` | `order` |
| `overflow` | `overflow` |
| `overflowX` | `overflow-x` |
| `overflowY` | `overflow-y` |
| `padding` | `padding` |
| `paddingBottom` | `padding-bottom` |
| `paddingLeft` | `padding-left` |
| `paddingRight` | `padding-right` |
| `paddingTop` | `padding-top` |
| `pointerEvents` | `pointer-events` |
| `position` | `position` |
| `right` | `right` |
| `rowGap` | `row-gap` |
| `textAlign` | `text-align` |
| `textDecoration` | `text-decoration` |
| `textOverflow` | `text-overflow` |
| `textTransform` | `text-transform` |
| `top` | `top` |
| `transform` | `transform` |
| `transformOrigin` | `transform-origin` |
| `transition` | `transition` |
| `visibility` | `visibility` |
| `whiteSpace` | `white-space` |
| `width` | `width` |
| `wordBreak` | `word-break` |
| `x` | `left` |
| `y` | `top` |
| `zIndex` | `z-index` |

## Appendix B: Complete top-level export list

- `QHTML_VERSION_FALLBACK` — string
- `CSS_SHORTCUTS` — Map
- `QHTMLHash` — class
- `QHTMLString` — class
- `QHTMLReference` — class
- `QHTMLKeyword` — class
- `QHTMLNamedReference` — class
- `QHTMLObjectReference` — class
- `QHTMLContext` — class
- `QHTMLNode` — class
- `QHTMLDomNode` — class
- `QHTMLDomElement` — class
- `QHTMLTextFragment` — class
- `QHTMLHTMLFragment` — class
- `QHTMLUnknownFragment` — class
- `QHTMLTypedNode` — class
- `QHTMLLogger` — class
- `QHTMLJavaScriptBlock` — class
- `QHTMLFunction` — class
- `QHTMLSignal` — class
- `QHTMLEvent` — class
- `QHTMLEventListener` — class
- `QHTMLSignalConnection` — class
- `QHTMLSignalBus` — class
- `QHTMLComponentSlot` — class
- `QHTMLSlotDefault` — class
- `QHTMLPropertyAssignment` — class
- `QHTMLLayout` — class
- `QHTMLRowLayout` — class
- `QHTMLColumnLayout` — class
- `QHTMLComponentInstanceSlot` — class
- `QHTMLComponentDefinition` — class
- `QHTMLComponentInstance` — class
- `QHTMLWorker` — class
- `QHTMLArrayNode` — class
- `QHTMLMapNode` — class
- `QHTMLJsonTools` — object
- `QHTMLJsonValue` — class
- `QHTMLJsonArray` — class
- `QHTMLJsonObject` — class
- `QHTMLJsonDocument` — class
- `QHTMLArray` — class
- `QHTMLMap` — class
- `QHTMLModel` — class
- `QHTMLProperty` — class
- `QHTMLJavaScriptRuntime` — class
- `QHTMLImportNode` — class
- `QHTMLForNode` — class
- `QHTMLEventHandler` — class
- `QHTMLPainter` — class
- `QHTMLCanvas` — class
- `QHTMLVideoAsset` — class
- `QHTMLVideoPlayer` — class
- `QHTMLVideo` — class
- `QHTMLParticleEmitter` — class
- `QHTMLConnect` — class
- `QHTMLTimer` — class
- `QHTMLPropertyAnimation` — class
- `QHTMLScriptAction` — class
- `QHTMLAnimationGroup` — class
- `QHTMLSequentialAnimation` — class
- `QHTMLParallelAnimation` — class
- `QHTMLBehavior` — class
- `QHTMLStyle` — class
- `QHTMLTransition` — class
- `QHTMLTransitionApplication` — class
- `QHTMLTheme` — class
- `QHTMLStyleApplication` — class
- `QHTMLThemeApplication` — class
- `QHTMLSlot` — class
- `QHTMLClass` — class
- `QHTMLVar` — class
- `QHTMLTemplate` — class
- `QHTMLScript` — class
- `QHTMLModelView` — class
- `QHTMLFactory` — class
- `QHTMLMethod` — class
- `QHTMLSourceFragment` — class
- `QHTMLDomTree` — class
- `createUUID` — function
- `qhtmlVersionString` — function
- `qhtmlCssShortcutPropertyName` — function
- `qhtmlIsCssShortcutProperty` — function
- `qhtmlScalarValue` — function
- `qhtmlSourceQuote` — function
- `qhtmlEscapeText` — function
- `qhtmlEscapeAttribute` — function
- `qhtmlInterpolateTextForContext` — function
- `qhtmlResolveExpressionValue` — function
- `qhtmlResolvePropertyValue` — function
- `qhtmlResolveCssValueForContext` — function
- `qhtmlScriptBody` — function

## Appendix C: Audit notes

- The document covers the API object constructed at the end of `qhtml_types.js`; internal helper functions not placed in that object are intentionally not presented as public API.
- Public writable fields created directly by constructors are noted in class descriptions where material (`QHTMLVideoAsset.attributes`, `QHTMLVideoPlayer.attributes`).
- JavaScript does not enforce private members here; underscore-prefixed implementation fields are not treated as supported API unless exposed by a method.
- Return labels are implementation observations, not TypeScript contracts. Where multiple branches return different shapes, the label is deliberately `implementation-defined`.
