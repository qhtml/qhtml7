#include "qhtml_web_exporter.hpp"
#include "qhtml_types.hpp"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QMap>
#include <QtCore/QRegularExpression>
#include <QtCore/QSet>
#include <QtCore/QStringList>

#include <utility>

namespace {

struct PropertyRecord
{
    QString name;
    QString source;
};

struct FunctionRecord
{
    QString name;
    QStringList parameters;
    QString body;
};

struct SignalRecord
{
    QString name;
    QStringList parameters;
};

struct ClassRecord
{
    QString name;
    QString uuid;
    QString body;
};

struct ClassInstanceRecord
{
    QString className;
    QString name;
    QString uuid;
    QString ownerId;
    QStringList arguments;
};

struct EventRecord
{
    QString name;
    QStringList parameters;
    QString body;
    bool capture = false;
};

struct ConnectionRecord
{
    QString ownerId;
    QString sourcePath;
    QString targetPath;
};

struct BindingRecord
{
    QString ownerId;
    QString mode;
    QString source;
};

struct OwnerRecord
{
    QString id;
    QString name;
    QString type;
    QString selector;
    QString parentOwnerId;
    QString componentOwnerId;
    QVector<PropertyRecord> properties;
    QVector<FunctionRecord> functions;
    QVector<SignalRecord> m_signals;
    QVector<EventRecord> events;
    QStringList scripts;
    QStringList inlineStyleBodies;
};

struct StyleRecord
{
    QString name;
    QString uuid;
    QString declarations;
    QStringList classes;
};

struct ThemeRule
{
    QString selector;
    QStringList styleNames;
    QStringList inlineStyleBodies;
};

struct ThemeRecord
{
    QString name;
    QString uuid;
    bool defaultTheme = false;
    QVector<ThemeRule> rules;
};

struct ThemeBlock
{
    QString selector;
    QString body;
    int start = 0;
    int end = 0;
};

struct CompileState
{
    const QHTMLWebExportOptions *options = nullptr;
    QString rootId;
    QVector<OwnerRecord> owners;
    QHash<QString, int> ownerIndexes;
    QVector<ClassRecord> classes;
    QVector<ClassInstanceRecord> classInstances;
    QVector<ConnectionRecord> connections;
    QVector<BindingRecord> bindings;
    QMap<QString, StyleRecord> styles;
    QMap<QString, ThemeRecord> themes;
    QVector<QHTMLWebExportDiagnostic> diagnostics;
    QSet<QString> diagnosedNodes;
};

QString htmlEscape(QString value)
{
    value.replace(QLatin1Char('&'), QStringLiteral("&amp;"));
    value.replace(QLatin1Char('<'), QStringLiteral("&lt;"));
    value.replace(QLatin1Char('>'), QStringLiteral("&gt;"));
    return value;
}

QString attributeEscape(QString value)
{
    value = htmlEscape(std::move(value));
    value.replace(QLatin1Char('"'), QStringLiteral("&quot;"));
    value.replace(QLatin1Char('\''), QStringLiteral("&#39;"));
    return value;
}

QString inlineScriptEscape(QString value)
{
    value.replace(QRegularExpression(QStringLiteral("</script"), QRegularExpression::CaseInsensitiveOption),
                  QStringLiteral("<\\/script"));
    value.replace(QRegularExpression(QStringLiteral("<!--")), QStringLiteral("<\\!--"));
    return value;
}

QString inlineStyleEscape(QString value)
{
    value.replace(QRegularExpression(QStringLiteral("</style"), QRegularExpression::CaseInsensitiveOption),
                  QStringLiteral("<\\/style"));
    return value;
}

QString cssAttributeString(QString value)
{
    value.replace(QLatin1Char('\\'), QStringLiteral("\\\\"));
    value.replace(QLatin1Char('"'), QStringLiteral("\\\""));
    value.replace(QLatin1Char('\n'), QStringLiteral("\\a "));
    return value;
}

QString indentText(const QString &text, const QString &indent)
{
    QStringList lines = text.split(QLatin1Char('\n'));
    for (QString &line : lines) {
        line.prepend(indent);
    }
    return lines.join(QLatin1Char('\n'));
}

QString camelToCss(QString name)
{
    name = name.trimmed();
    const QString known = qhtmlCssShortcutPropertyName(name);
    if (!known.isEmpty()) {
        return known;
    }
    QString out;
    for (const QChar ch : name) {
        if (ch.isUpper()) {
            if (!out.isEmpty()) {
                out += QLatin1Char('-');
            }
            out += ch.toLower();
        } else {
            out += ch;
        }
    }
    return out.toLower();
}

QStringList splitTopLevel(const QString &source, QChar delimiter)
{
    QStringList result;
    QString current;
    int roundDepth = 0;
    int squareDepth = 0;
    int braceDepth = 0;
    QChar quote;
    bool escaped = false;

    for (const QChar ch : source) {
        if (!quote.isNull()) {
            current += ch;
            if (escaped) {
                escaped = false;
            } else if (ch == QLatin1Char('\\')) {
                escaped = true;
            } else if (ch == quote) {
                quote = QChar();
            }
            continue;
        }
        if (ch == QLatin1Char('"') || ch == QLatin1Char('\'') || ch == QLatin1Char('`')) {
            quote = ch;
            current += ch;
            continue;
        }
        if (ch == QLatin1Char('(')) ++roundDepth;
        if (ch == QLatin1Char(')')) --roundDepth;
        if (ch == QLatin1Char('[')) ++squareDepth;
        if (ch == QLatin1Char(']')) --squareDepth;
        if (ch == QLatin1Char('{')) ++braceDepth;
        if (ch == QLatin1Char('}')) --braceDepth;

        if (ch == delimiter && roundDepth == 0 && squareDepth == 0 && braceDepth == 0) {
            if (!current.trimmed().isEmpty()) {
                result.append(current.trimmed());
            }
            current.clear();
        } else {
            current += ch;
        }
    }
    if (!current.trimmed().isEmpty()) {
        result.append(current.trimmed());
    }
    return result;
}

QString normalizeDeclarations(QString source)
{
    source.replace(QLatin1Char('\n'), QLatin1Char(';'));
    QStringList declarations;
    for (const QString &part : splitTopLevel(source, QLatin1Char(';'))) {
        const int colon = part.indexOf(QLatin1Char(':'));
        if (colon <= 0) {
            continue;
        }
        const QString name = camelToCss(part.left(colon));
        const QString value = part.mid(colon + 1).trimmed();
        if (!name.isEmpty() && !value.isEmpty() && name != QStringLiteral("q-style-class")) {
            declarations.append(name + QStringLiteral(": ") + value);
        }
    }
    return declarations.join(QStringLiteral("; ")) + (declarations.isEmpty() ? QString() : QStringLiteral(";"));
}

int findClosingBrace(const QString &text, int openIndex)
{
    int depth = 1;
    QChar quote;
    bool escaped = false;
    for (int index = openIndex + 1; index < text.size(); ++index) {
        const QChar ch = text.at(index);
        if (!quote.isNull()) {
            if (escaped) {
                escaped = false;
            } else if (ch == QLatin1Char('\\')) {
                escaped = true;
            } else if (ch == quote) {
                quote = QChar();
            }
            continue;
        }
        if (ch == QLatin1Char('"') || ch == QLatin1Char('\'') || ch == QLatin1Char('`')) {
            quote = ch;
            continue;
        }
        if (ch == QLatin1Char('{')) {
            ++depth;
        } else if (ch == QLatin1Char('}')) {
            --depth;
            if (depth == 0) {
                return index;
            }
        }
    }
    return -1;
}

QVector<ThemeBlock> parseThemeBlocks(const QString &body)
{
    QVector<ThemeBlock> blocks;
    int cursor = 0;
    while (cursor < body.size()) {
        const int openIndex = body.indexOf(QLatin1Char('{'), cursor);
        if (openIndex < 0) {
            break;
        }
        const int closeIndex = findClosingBrace(body, openIndex);
        if (closeIndex < 0) {
            break;
        }
        const QString selector = body.mid(cursor, openIndex - cursor).trimmed();
        if (!selector.isEmpty()) {
            blocks.append({selector, body.mid(openIndex + 1, closeIndex - openIndex - 1).trimmed(), cursor, closeIndex + 1});
        }
        cursor = closeIndex + 1;
    }
    return blocks;
}

ThemeRule parseThemeRule(const ThemeBlock &block)
{
    ThemeRule rule;
    rule.selector = block.selector;
    QString remaining = block.body;
    const QVector<ThemeBlock> children = parseThemeBlocks(remaining);
    for (int index = children.size() - 1; index >= 0; --index) {
        const ThemeBlock &child = children.at(index);
        if (child.selector == QStringLiteral("q-style")) {
            rule.inlineStyleBodies.prepend(child.body);
            remaining.remove(child.start, child.end - child.start);
        }
    }
    remaining = remaining.trimmed();
    if (!remaining.isEmpty()) {
        if (remaining.contains(QLatin1Char(':')) || remaining.contains(QLatin1Char(';'))) {
            rule.inlineStyleBodies.append(remaining);
        } else {
            rule.styleNames = remaining.split(QRegularExpression(QStringLiteral("\\s+")), Qt::SkipEmptyParts);
        }
    }
    return rule;
}

bool isRuntimeOwnerType(const QString &type)
{
    static const QSet<QString> ownerTypes = {
        QStringLiteral("QHTMLDomTree"),
        QStringLiteral("QHTMLDomElement"),
        QStringLiteral("QHTMLComponentInstance"),
        QStringLiteral("QHTMLLayout"),
        QStringLiteral("QHTMLRowLayout"),
        QStringLiteral("QHTMLColumnLayout"),
        QStringLiteral("QHTMLCanvas"),
        QStringLiteral("QHTMLVideo"),
        QStringLiteral("QHTMLVideoPlayer"),
        QStringLiteral("QHTMLParticleEmitter"),
        QStringLiteral("QHTMLModelView")
    };
    return ownerTypes.contains(type);
}

bool isRenderableChildType(const QString &type)
{
    return isRuntimeOwnerType(type) ||
           type == QStringLiteral("QHTMLForNode") ||
           type == QStringLiteral("QHTMLStyleApplication") ||
           type == QStringLiteral("QHTMLThemeApplication") ||
           type == QStringLiteral("QHTMLComponentSlot") ||
           type == QStringLiteral("QHTMLComponentInstanceSlot");
}

QString selectorForNode(const QHTMLNode *node, const QString &rootId, const QHTMLWebExportOptions &options)
{
    if (!node || node->qhtmlType() == QStringLiteral("QHTMLDomTree")) {
        return QStringLiteral("[") + options.rootAttribute + QStringLiteral("=\"") + cssAttributeString(rootId) + QStringLiteral("\"]");
    }
    const QString uuid = cssAttributeString(node->qhtmlUUID());
    if (node->qhtmlType() == QStringLiteral("QHTMLComponentInstance")) {
        return QStringLiteral("[component-instance=\"") + uuid + QStringLiteral("\"]");
    }
    return QStringLiteral("[qhtml-node=\"") + uuid + QStringLiteral("\"]");
}

void addDiagnostic(CompileState &state,
                   QHTMLWebExportDiagnostic::Severity severity,
                   const QString &code,
                   const QString &message,
                   const QHTMLNode *node)
{
    const QString key = code + QLatin1Char('|') + (node ? node->qhtmlUUID() : QString());
    if (state.diagnosedNodes.contains(key)) {
        return;
    }
    state.diagnosedNodes.insert(key);
    QHTMLWebExportDiagnostic diagnostic;
    diagnostic.severity = severity;
    diagnostic.code = code;
    diagnostic.message = message;
    if (node) {
        diagnostic.nodeType = node->qhtmlType();
        diagnostic.nodeName = node->qhtmlName();
        diagnostic.nodeUuid = node->qhtmlUUID();
    }
    state.diagnostics.append(diagnostic);
}

OwnerRecord &ensureOwner(CompileState &state,
                         const QHTMLNode *node,
                         const QString &parentOwnerId,
                         const QString &componentOwnerId)
{
    const QString id = node && !node->qhtmlUUID().trimmed().isEmpty() ? node->qhtmlUUID() : state.rootId;
    if (state.ownerIndexes.contains(id)) {
        return state.owners[state.ownerIndexes.value(id)];
    }
    OwnerRecord owner;
    owner.id = id;
    owner.name = node ? node->qhtmlName().trimmed() : QStringLiteral("root");
    owner.type = node ? node->qhtmlType() : QStringLiteral("QHTMLDomTree");
    owner.selector = selectorForNode(node, state.rootId, *state.options);
    owner.parentOwnerId = parentOwnerId;
    owner.componentOwnerId = componentOwnerId.isEmpty() ? id : componentOwnerId;
    state.ownerIndexes.insert(id, state.owners.size());
    state.owners.append(owner);
    return state.owners.last();
}

OwnerRecord *ownerById(CompileState &state, const QString &ownerId)
{
    const auto it = state.ownerIndexes.constFind(ownerId);
    if (it == state.ownerIndexes.constEnd()) {
        return nullptr;
    }
    return &state.owners[it.value()];
}

QStringList connectionTokens(QString body)
{
    body.remove(QRegularExpression(QStringLiteral("/\\*[\\s\\S]*?\\*/")));
    body.remove(QRegularExpression(QStringLiteral("//.*$"), QRegularExpression::MultilineOption));
    body.replace(QLatin1Char(';'), QLatin1Char(' '));
    return body.split(QRegularExpression(QStringLiteral("\\s+")), Qt::SkipEmptyParts);
}

void collectSafeInterpolation(const QHTMLNode *node, CompileState &state, const QString &ownerId)
{
    bool hasRenderableChild = false;
    bool hasDynamic = false;
    bool htmlMode = false;
    QString source;
    for (QHTMLNode *child : node->children()) {
        if (!child) {
            continue;
        }
        const QString type = child->qhtmlType();
        if (isRenderableChildType(type)) {
            hasRenderableChild = true;
        }
        if (const auto *text = dynamic_cast<const QHTMLTextFragment *>(child)) {
            source += text->value();
            hasDynamic = hasDynamic || text->value().contains(QStringLiteral("${"));
        } else if (const auto *html = dynamic_cast<const QHTMLHTMLFragment *>(child)) {
            source += html->value();
            htmlMode = true;
            hasDynamic = hasDynamic || html->value().contains(QStringLiteral("${"));
        } else if (const auto *unknown = dynamic_cast<const QHTMLUnknownFragment *>(child)) {
            source += unknown->value();
            hasDynamic = hasDynamic || unknown->value().contains(QStringLiteral("${"));
        }
    }
    if (!hasDynamic) {
        return;
    }
    if (hasRenderableChild) {
        addDiagnostic(state,
                      QHTMLWebExportDiagnostic::Severity::Warning,
                      QStringLiteral("dynamic-interpolation-mixed-content"),
                      QStringLiteral("Dynamic interpolation shares an element with rendered child nodes. The initial HTML is exported, but automatic reactive replacement is disabled to avoid deleting child elements."),
                      node);
        return;
    }
    state.bindings.append({ownerId, htmlMode ? QStringLiteral("html") : QStringLiteral("text"), source});
}

void collectNode(const QHTMLNode *node,
                 CompileState &state,
                 const QString &currentOwnerId,
                 const QString &componentOwnerId,
                 bool insideDefinition)
{
    if (!node) {
        return;
    }

    const QString type = node->qhtmlType();

    if (const auto *style = dynamic_cast<const QHTMLStyle *>(node)) {
        if (!style->qhtmlName().trimmed().isEmpty()) {
            StyleRecord record;
            record.name = style->qhtmlName().trimmed();
            record.uuid = style->qhtmlUUID();
            record.declarations = normalizeDeclarations(style->cssText());
            record.classes = style->classList().split(QRegularExpression(QStringLiteral("\\s+")), Qt::SkipEmptyParts);
            state.styles.insert(record.name, record);
        } else if (!insideDefinition) {
            if (OwnerRecord *owner = ownerById(state, currentOwnerId)) {
                owner->inlineStyleBodies.append(style->cssText());
            }
        }
        return;
    }

    if (const auto *theme = dynamic_cast<const QHTMLTheme *>(node)) {
        if (!theme->qhtmlName().trimmed().isEmpty()) {
            ThemeRecord record;
            record.name = theme->qhtmlName().trimmed();
            record.uuid = theme->qhtmlUUID();
            record.defaultTheme = theme->isDefaultTheme();
            for (const ThemeBlock &block : parseThemeBlocks(theme->body())) {
                record.rules.append(parseThemeRule(block));
            }
            state.themes.insert(record.name, record);
        }
        return;
    }

    if (type == QStringLiteral("QHTMLComponentDefinition")) {
        for (QHTMLNode *child : node->children()) {
            if (!child) {
                continue;
            }
            const bool templateChild = isRenderableChildType(child->qhtmlType());
            collectNode(child,
                        state,
                        currentOwnerId,
                        templateChild ? QStringLiteral("@closest") : componentOwnerId,
                        !templateChild);
        }
        return;
    }

    if (!insideDefinition) {
        if (const auto *property = dynamic_cast<const QHTMLProperty *>(node)) {
            if (OwnerRecord *owner = ownerById(state, currentOwnerId)) {
                owner->properties.append({property->qhtmlName().trimmed(), property->value()});
            }
            return;
        }
        if (const auto *function = dynamic_cast<const QHTMLFunction *>(node)) {
            if (OwnerRecord *owner = ownerById(state, currentOwnerId)) {
                owner->functions.append({function->qhtmlName().trimmed(), function->parameters(), function->body()});
            }
            return;
        }
        if (const auto *signal = dynamic_cast<const QHTMLSignal *>(node)) {
            if (OwnerRecord *owner = ownerById(state, currentOwnerId)) {
                owner->m_signals.append({signal->qhtmlName().trimmed(), signal->parameters()});
            }
            return;
        }
        if (const auto *handler = dynamic_cast<const QHTMLEventHandler *>(node)) {
            if (OwnerRecord *owner = ownerById(state, currentOwnerId)) {
                owner->events.append({handler->eventName(), handler->parameters(), handler->body(), handler->propagate()});
            }
            return;
        }
        if (const auto *connect = dynamic_cast<const QHTMLConnect *>(node)) {
            const QStringList tokens = connectionTokens(connect->body());
            for (int index = 0; index + 1 < tokens.size(); index += 2) {
                state.connections.append({currentOwnerId, tokens.at(index), tokens.at(index + 1)});
            }
            if ((tokens.size() % 2) != 0) {
                addDiagnostic(state,
                              QHTMLWebExportDiagnostic::Severity::Warning,
                              QStringLiteral("incomplete-connect"),
                              QStringLiteral("A q-connect declaration contains an unmatched source or target path."),
                              node);
            }
            return;
        }
        if (const auto *script = dynamic_cast<const QHTMLScript *>(node)) {
            if (OwnerRecord *owner = ownerById(state, currentOwnerId)) {
                owner->scripts.append(script->body());
            }
            return;
        }
        if (const auto *scriptBlock = dynamic_cast<const QHTMLJavaScriptBlock *>(node)) {
            if (OwnerRecord *owner = ownerById(state, currentOwnerId)) {
                owner->scripts.append(scriptBlock->body());
            }
            return;
        }
    }

    QString nextOwnerId = currentOwnerId;
    QString nextComponentOwnerId = componentOwnerId;
    if (!insideDefinition && isRuntimeOwnerType(type)) {
        if (type == QStringLiteral("QHTMLDomTree")) {
            nextOwnerId = state.rootId;
            nextComponentOwnerId = state.rootId;
            ensureOwner(state, node, QString(), nextComponentOwnerId);
        } else {
            if (type == QStringLiteral("QHTMLComponentInstance")) {
                nextComponentOwnerId = node->qhtmlUUID();
            }
            nextOwnerId = node->qhtmlUUID();
            ensureOwner(state, node, currentOwnerId, nextComponentOwnerId);
        }
        collectSafeInterpolation(node, state, nextOwnerId);
    }

    if (!insideDefinition) {
        if (const auto *classNode = dynamic_cast<const QHTMLClass *>(node)) {
            state.classes.append({classNode->qhtmlName().trimmed(), classNode->qhtmlUUID(), classNode->body()});
            return;
        }
        if (const auto *typedNode = dynamic_cast<const QHTMLTypedNode *>(node)) {
            const QString keyword = typedNode->keyword().trimmed();
            const QString instanceName = typedNode->qhtmlName().trimmed();
            if (type == QStringLiteral("QHTMLTypedNode") && !keyword.isEmpty() && !instanceName.isEmpty()) {
                QStringList argumentSources;
                for (QHTMLNode *child : typedNode->children()) {
                    if (const auto *assignment = dynamic_cast<const QHTMLPropertyAssignment *>(child)) {
                        argumentSources.append(assignment->value());
                    }
                }
                state.classInstances.append({keyword, instanceName, typedNode->qhtmlUUID(), currentOwnerId, argumentSources});
                return;
            }
        }
    }

    static const QSet<QString> unsupportedBehaviorTypes = {
        QStringLiteral("QHTMLWorker"),
        QStringLiteral("QHTMLPainter"),
        QStringLiteral("QHTMLTimer"),
        QStringLiteral("QHTMLPropertyAnimation"),
        QStringLiteral("QHTMLSequentialAnimation"),
        QStringLiteral("QHTMLParallelAnimation"),
        QStringLiteral("QHTMLScriptAction"),
        QStringLiteral("QHTMLBehavior"),
        QStringLiteral("QHTMLModelView")
    };
    if (!insideDefinition && unsupportedBehaviorTypes.contains(type)) {
        addDiagnostic(state,
                      state.options->failOnUnsupportedBehavior
                          ? QHTMLWebExportDiagnostic::Severity::Error
                          : QHTMLWebExportDiagnostic::Severity::Warning,
                      QStringLiteral("unsupported-runtime-feature"),
                      QStringLiteral("This QHTML runtime feature is retained as static rendered markup where possible, but its live behavior is not generated by the standalone exporter."),
                      node);
        if (type != QStringLiteral("QHTMLModelView")) {
            return;
        }
    }

    if (!insideDefinition && type == QStringLiteral("QHTMLForNode")) {
        addDiagnostic(state,
                      QHTMLWebExportDiagnostic::Severity::Information,
                      QStringLiteral("static-loop-snapshot"),
                      QStringLiteral("The for-loop is exported as its current rendered HTML snapshot. Subsequent collection mutations will not re-render the loop."),
                      node);
    }

    for (QHTMLNode *child : node->children()) {
        collectNode(child, state, nextOwnerId, nextComponentOwnerId, insideDefinition);
    }
}

QJsonArray stringArray(const QStringList &values)
{
    QJsonArray array;
    for (const QString &value : values) {
        array.append(value);
    }
    return array;
}

QJsonObject manifestForState(const CompileState &state)
{
    QJsonObject manifest;
    manifest.insert(QStringLiteral("format"), QStringLiteral("qhtml7-standalone-web"));
    manifest.insert(QStringLiteral("version"), QString::fromLatin1(QHTML_VERSION));
    manifest.insert(QStringLiteral("rootId"), state.rootId);
    manifest.insert(QStringLiteral("rootAttribute"), state.options->rootAttribute);

    QJsonArray owners;
    for (const OwnerRecord &owner : state.owners) {
        QJsonObject object;
        object.insert(QStringLiteral("id"), owner.id);
        object.insert(QStringLiteral("name"), owner.name);
        object.insert(QStringLiteral("type"), owner.type);
        object.insert(QStringLiteral("selector"), owner.selector);
        object.insert(QStringLiteral("parentOwnerId"), owner.parentOwnerId);
        object.insert(QStringLiteral("componentOwnerId"), owner.componentOwnerId);

        QJsonArray properties;
        for (const PropertyRecord &property : owner.properties) {
            QJsonObject item;
            item.insert(QStringLiteral("name"), property.name);
            item.insert(QStringLiteral("source"), property.source);
            properties.append(item);
        }
        object.insert(QStringLiteral("properties"), properties);

        QJsonArray functions;
        for (const FunctionRecord &function : owner.functions) {
            QJsonObject item;
            item.insert(QStringLiteral("name"), function.name);
            item.insert(QStringLiteral("parameters"), stringArray(function.parameters));
            item.insert(QStringLiteral("body"), function.body);
            functions.append(item);
        }
        object.insert(QStringLiteral("functions"), functions);

        QJsonArray p_signals;
        for (const SignalRecord &signal : owner.m_signals) {
            QJsonObject item;
            item.insert(QStringLiteral("name"), signal.name);
            item.insert(QStringLiteral("parameters"), stringArray(signal.parameters));
            p_signals.append(item);
        }
        object.insert(QStringLiteral("signals"), p_signals);

        QJsonArray events;
        for (const EventRecord &event : owner.events) {
            QJsonObject item;
            item.insert(QStringLiteral("name"), event.name);
            item.insert(QStringLiteral("parameters"), stringArray(event.parameters));
            item.insert(QStringLiteral("body"), event.body);
            item.insert(QStringLiteral("capture"), event.capture);
            events.append(item);
        }
        object.insert(QStringLiteral("events"), events);
        object.insert(QStringLiteral("scripts"), stringArray(owner.scripts));
        object.insert(QStringLiteral("inlineStyles"), stringArray(owner.inlineStyleBodies));
        owners.append(object);
    }
    manifest.insert(QStringLiteral("owners"), owners);

    QJsonArray classes;
    for (const ClassRecord &classRecord : state.classes) {
        QJsonObject object;
        object.insert(QStringLiteral("name"), classRecord.name);
        object.insert(QStringLiteral("uuid"), classRecord.uuid);
        object.insert(QStringLiteral("body"), classRecord.body);
        classes.append(object);
    }
    manifest.insert(QStringLiteral("classes"), classes);

    QJsonArray classInstances;
    for (const ClassInstanceRecord &instance : state.classInstances) {
        QJsonObject object;
        object.insert(QStringLiteral("className"), instance.className);
        object.insert(QStringLiteral("name"), instance.name);
        object.insert(QStringLiteral("uuid"), instance.uuid);
        object.insert(QStringLiteral("ownerId"), instance.ownerId);
        object.insert(QStringLiteral("arguments"), stringArray(instance.arguments));
        classInstances.append(object);
    }
    manifest.insert(QStringLiteral("classInstances"), classInstances);

    QJsonArray connections;
    for (const ConnectionRecord &connection : state.connections) {
        QJsonObject object;
        object.insert(QStringLiteral("ownerId"), connection.ownerId);
        object.insert(QStringLiteral("sourcePath"), connection.sourcePath);
        object.insert(QStringLiteral("targetPath"), connection.targetPath);
        connections.append(object);
    }
    manifest.insert(QStringLiteral("connections"), connections);

    QJsonArray bindings;
    for (const BindingRecord &binding : state.bindings) {
        QJsonObject object;
        object.insert(QStringLiteral("ownerId"), binding.ownerId);
        object.insert(QStringLiteral("mode"), binding.mode);
        object.insert(QStringLiteral("source"), binding.source);
        bindings.append(object);
    }
    manifest.insert(QStringLiteral("bindings"), bindings);

    QJsonObject styles;
    for (auto it = state.styles.constBegin(); it != state.styles.constEnd(); ++it) {
        QJsonObject object;
        object.insert(QStringLiteral("uuid"), it->uuid);
        object.insert(QStringLiteral("declarations"), it->declarations);
        object.insert(QStringLiteral("classes"), stringArray(it->classes));
        styles.insert(it.key(), object);
    }
    manifest.insert(QStringLiteral("styles"), styles);

    QJsonObject themes;
    for (auto it = state.themes.constBegin(); it != state.themes.constEnd(); ++it) {
        QJsonObject object;
        object.insert(QStringLiteral("uuid"), it->uuid);
        object.insert(QStringLiteral("defaultTheme"), it->defaultTheme);
        QJsonArray rules;
        for (const ThemeRule &rule : it->rules) {
            QJsonObject ruleObject;
            ruleObject.insert(QStringLiteral("selector"), rule.selector);
            ruleObject.insert(QStringLiteral("styleNames"), stringArray(rule.styleNames));
            ruleObject.insert(QStringLiteral("inlineStyles"), stringArray(rule.inlineStyleBodies));
            rules.append(ruleObject);
        }
        object.insert(QStringLiteral("rules"), rules);
        themes.insert(it.key(), object);
    }
    manifest.insert(QStringLiteral("themes"), themes);
    return manifest;
}

QString themeCssForScope(const QString &scopeThemeName,
                         const QString &themeName,
                         const CompileState &state,
                         QSet<QString> &seen)
{
    const QString seenKey = scopeThemeName + QLatin1Char('|') + themeName;
    if (seen.contains(seenKey) || !state.themes.contains(themeName)) {
        return QString();
    }
    seen.insert(seenKey);
    const ThemeRecord &theme = state.themes.value(themeName);
    QStringList rules;
    const QString scope = QStringLiteral("q-theme-application[qhtml-theme=\"") +
                          cssAttributeString(scopeThemeName) + QStringLiteral("\"]");

    for (const ThemeRule &rule : theme.rules) {
        if (rule.selector == QStringLiteral("q-child-theme")) {
            for (const QString &childThemeName : rule.styleNames) {
                rules.append(themeCssForScope(scopeThemeName, childThemeName, state, seen));
            }
            continue;
        }

        if (state.themes.contains(rule.selector) && rule.styleNames.isEmpty() && rule.inlineStyleBodies.isEmpty()) {
            rules.append(themeCssForScope(scopeThemeName, rule.selector, state, seen));
            continue;
        }

        QStringList declarations;
        for (const QString &styleName : rule.styleNames) {
            if (state.styles.contains(styleName) && !state.styles.value(styleName).declarations.isEmpty()) {
                declarations.append(state.styles.value(styleName).declarations);
            }
        }
        for (const QString &inlineBody : rule.inlineStyleBodies) {
            const QString normalized = normalizeDeclarations(inlineBody);
            if (!normalized.isEmpty()) {
                declarations.append(normalized);
            }
        }
        if (declarations.isEmpty()) {
            continue;
        }
        const QString selector = theme.defaultTheme
            ? QStringLiteral(":where(") + scope + QLatin1Char(' ') + rule.selector + QLatin1Char(')')
            : scope + QLatin1Char(' ') + rule.selector;
        rules.append(selector + QStringLiteral(" { ") + declarations.join(QLatin1Char(' ')) + QStringLiteral(" }") );
    }
    return rules.join(QLatin1Char('\n'));
}

QString cssForState(const CompileState &state)
{
    QStringList css;
    css.append(QStringLiteral("q-style-application, q-theme-application { display: contents; }"));

    for (auto it = state.styles.constBegin(); it != state.styles.constEnd(); ++it) {
        if (it->declarations.isEmpty()) {
            continue;
        }
        const QString selector = QStringLiteral("q-style-application[qhtml-style=\"") +
                                 cssAttributeString(it.key()) +
                                 QStringLiteral("\"] :not(q-style-application):not(q-theme-application)");
        css.append(selector + QStringLiteral(" { ") + it->declarations + QStringLiteral(" }") );
    }

    for (const OwnerRecord &owner : state.owners) {
        QStringList declarations;
        for (const QString &body : owner.inlineStyleBodies) {
            const QString normalized = normalizeDeclarations(body);
            if (!normalized.isEmpty()) {
                declarations.append(normalized);
            }
        }
        if (!declarations.isEmpty()) {
            css.append(owner.selector + QStringLiteral(" { ") + declarations.join(QLatin1Char(' ')) + QStringLiteral(" }") );
        }
    }

    for (auto it = state.themes.constBegin(); it != state.themes.constEnd(); ++it) {
        QSet<QString> seen;
        const QString generated = themeCssForScope(it.key(), it.key(), state, seen);
        if (!generated.isEmpty()) {
            css.append(generated);
        }
    }
    return css.join(QLatin1Char('\n'));
}

QString standaloneRuntimeSource(const QJsonObject &manifest, bool pretty)
{
    const QByteArray manifestJson = QJsonDocument(manifest).toJson(pretty ? QJsonDocument::Indented : QJsonDocument::Compact);
    QString source = QString::fromUtf8(R"QHTMLJS((function () {
  "use strict";

  const manifest = __QHTML_MANIFEST__;
  const rootDefinition = manifest.owners.find(owner => owner.id === manifest.rootId);
  const rootSelector = rootDefinition ? rootDefinition.selector : `[${manifest.rootAttribute}]`;
  const root = document.querySelector(rootSelector);
  if (!root) {
    throw new Error(`QHTML standalone export root not found: ${rootSelector}`);
  }

  const domEventAliases = Object.freeze({
    mousepress: "mousedown",
    mousepressed: "mousedown",
    mousedrag: "mousemove",
    doubleclick: "dblclick",
    context: "contextmenu",
    rightclick: "contextmenu",
    mousewheel: "wheel"
  });

  const commonDomEvents = new Set([
    "abort", "animationcancel", "animationend", "animationiteration", "animationstart",
    "auxclick", "beforeinput", "blur", "cancel", "change", "click", "close",
    "compositionend", "compositionstart", "compositionupdate", "contextmenu", "copy",
    "cut", "dblclick", "drag", "dragend", "dragenter", "dragleave", "dragover",
    "dragstart", "drop", "error", "focus", "focusin", "focusout", "formdata",
    "input", "invalid", "keydown", "keypress", "keyup", "load", "loadeddata",
    "loadedmetadata", "mousedown", "mouseenter", "mouseleave", "mousemove",
    "mouseout", "mouseover", "mouseup", "paste", "pointercancel", "pointerdown",
    "pointerenter", "pointerleave", "pointermove", "pointerout", "pointerover",
    "pointerup", "reset", "resize", "scroll", "select", "submit", "toggle",
    "touchcancel", "touchend", "touchmove", "touchstart", "transitioncancel",
    "transitionend", "transitionrun", "transitionstart", "wheel"
  ]);

  const runtime = {
    manifest,
    root,
    ownerDefinitions: new Map(manifest.owners.map(owner => [owner.id, owner])),
	    elementsByOwnerId: new Map(),
	    elementsByName: new Map(),
	    classesByName: new Map(),
	    classInstancesByName: new Map(),
	    functionCache: new Map(),
	    interpolationBindings: new Map(),
	    cleanup: [],
	    documentFacade: null,

    domEventName(name) {
      const normalized = String(name || "").trim().toLowerCase().replace(/^on(?=[a-z])/, "");
      return domEventAliases[normalized] || normalized;
    },

    ownerElements(ownerId) {
      return this.elementsByOwnerId.get(ownerId) || [];
    },

    primaryElement(ownerId) {
      return this.ownerElements(ownerId)[0] || null;
    },

	    query(selector, callback, rootOverride) {
	      const queryRoot = rootOverride || this.root;
	      const text = String(selector || "").trim();
	      if (!text) return [];
      if (text.startsWith("#")) {
        const element = queryRoot.querySelector(text);
        if (element && typeof callback === "function") callback.call(element, element, 0, [element]);
        return element;
      }
      const elements = Array.from(queryRoot.querySelectorAll(text));
      if (typeof callback === "function") {
        elements.forEach((element, index) => callback.call(element, element, index, elements));
	      }
	      return elements;
	    },

	    splitParameters(parameters) {
	      return String(parameters || "")
	        .split(",")
	        .map(parameter => parameter.trim())
	        .filter(Boolean);
	    },

	    matchingBrace(source, openIndex) {
	      let depth = 0;
	      let quote = "";
	      let escape = false;
	      for (let index = openIndex; index < source.length; index += 1) {
	        const ch = source[index];
	        if (quote) {
	          if (escape) escape = false;
	          else if (ch === "\\") escape = true;
	          else if (ch === quote) quote = "";
	          continue;
	        }
	        if (ch === "\"" || ch === "'" || ch === "`") {
	          quote = ch;
	          continue;
	        }
	        if (ch === "{") depth += 1;
	        else if (ch === "}") {
	          depth -= 1;
	          if (depth === 0) return index;
	        }
	      }
	      return -1;
	    },

	    parseClassBody(className, body) {
	      let source = String(body || "");
	      const signals = [];
	      source = source.replace(/(^|\n)([ \t]*)q-signal\s+([A-Za-z_$][A-Za-z0-9_$]*)(?:\s*\(([^)]*)\))?\s*;?[ \t]*(?=\n|$)/g,
	        (match, linePrefix, indentation, signalName, parameters) => {
	          signals.push({ name: String(signalName || "").trim(), parameters: this.splitParameters(parameters) });
	          return linePrefix || "";
	        });

	      const methods = [];
	      let constructor = { parameters: [], body: "" };
	      let cursor = 0;
	      const memberPattern = /\b(?:function\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
	      while (true) {
	        memberPattern.lastIndex = cursor;
	        const match = memberPattern.exec(source);
	        if (!match) break;
	        const name = match[1];
	        const paramsStart = source.indexOf("(", match.index);
	        const paramsEnd = source.indexOf(")", paramsStart + 1);
	        if (paramsStart < 0 || paramsEnd < 0) break;
	        let blockStart = paramsEnd + 1;
	        while (blockStart < source.length && /\s/.test(source[blockStart])) blockStart += 1;
	        if (source[blockStart] !== "{") {
	          cursor = paramsEnd + 1;
	          continue;
	        }
	        const blockEnd = this.matchingBrace(source, blockStart);
	        if (blockEnd < 0) break;
	        const record = {
	          name,
	          parameters: this.splitParameters(source.slice(paramsStart + 1, paramsEnd)),
	          body: source.slice(blockStart + 1, blockEnd)
	        };
	        if (name === className || name === "constructor") constructor = record;
	        else methods.push(record);
	        cursor = blockEnd + 1;
	      }
	      return { name: className, constructor, methods, signals };
	    },

	    classScopeFor(owner, extras = {}) {
	      const runtimeObject = this;
	      return new Proxy(Object.create(null), {
	        has(target, key) {
	          if (key === Symbol.unscopables) return false;
	          return key !== "__qhtml_owner__" && key !== "__qhtml_args__";
	        },
	        get(target, key) {
	          if (key === Symbol.unscopables) return undefined;
	          if (Object.prototype.hasOwnProperty.call(extras, key)) return extras[key];
	          if (key === "document") return runtimeObject.createDocumentFacade();
	          if (key === "qhtmlRuntime") return runtimeObject;
	          if (key in owner) {
	            const value = owner[key];
	            return typeof value === "function" && !value.connect ? value.bind(owner) : value;
	          }
	          if (runtimeObject.classInstancesByName.has(String(key))) return runtimeObject.classInstancesByName.get(String(key));
	          if (runtimeObject.classesByName.has(String(key))) return runtimeObject.classesByName.get(String(key));
	          if (runtimeObject.elementsByName.has(String(key))) return runtimeObject.elementsByName.get(String(key))[0];
	          return globalThis[key];
	        },
	        set(target, key, value) {
	          owner[key] = value;
	          return true;
	        }
	      });
	    },

	    executeClassBody(owner, parameters, args, body, extras = {}) {
	      const values = Array.from(args || []);
	      const event = values[0] instanceof Event ? values[0] : extras.event;
	      const scopeExtras = Object.assign({ event, e: event, detail: event && event.detail }, extras);
	      const normalizedBody = this.decodeScriptEntities(String(body || ""));
	      const parameterList = (parameters || []).join(", ");
	      return new Function(
	        "scope",
	        "__qhtml_owner__",
	        "__qhtml_args__",
	        `with (scope) { return (function (${parameterList}) {\n${normalizedBody}\n}).apply(__qhtml_owner__, __qhtml_args__); }`
	      )(this.classScopeFor(owner, scopeExtras), owner, values);
	    },

	    createClassSignal(owner, name) {
	      const listeners = [];
	      const signal = function (...args) {
	        signal.__qhtmlLastArguments = args;
	        for (const listener of listeners.slice()) {
	          if (typeof listener === "function") listener.apply(listener.__qhtmlElement || globalThis, args);
	          else if (listener && typeof listener.__qhtmlInvokeFromSignal === "function") listener.__qhtmlInvokeFromSignal(args);
	        }
	        if (owner && typeof owner.dispatchEvent === "function") {
	          owner.dispatchEvent(new CustomEvent("QHTMLSignal", { bubbles: true, detail: { signal: name, sender: owner, args } }));
	        }
	        return listeners.length;
	      };
	      signal.connect = listener => {
	        if (!listeners.includes(listener)) listeners.push(listener);
	        return true;
	      };
	      signal.disconnect = listener => {
	        const index = listeners.indexOf(listener);
	        if (index < 0) return false;
	        listeners.splice(index, 1);
	        return true;
	      };
	      signal.connections = () => listeners.slice();
	      signal.__qhtmlElement = owner;
	      owner[name] = signal;
	      return signal;
	    },

	    classQdomFor(instance) {
	      return {
	        connect(signalName, target) {
	          const signal = typeof signalName === "string" ? instance[signalName] : signalName;
	          if (!signal || typeof signal.connect !== "function") {
	            throw new TypeError("QHTML class signal is not connectable: " + String(signalName));
	          }
	          return signal.connect(target);
	        },
	        emit(signalName, ...args) {
	          const signal = instance[signalName];
	          if (typeof signal !== "function") {
	            throw new TypeError("QHTML class signal is not callable: " + String(signalName));
	          }
	          return signal(...args);
	        }
	      };
	    },

	    registerClasses() {
	      for (const definition of manifest.classes || []) {
	        const className = String(definition.name || "").trim();
	        if (!className || this.classesByName.has(className)) continue;
	        const parsed = this.parseClassBody(className, definition.body || "");
	        const runtimeObject = this;
	        const ClassObject = function QHTMLStandaloneClass(...args) {
	          Object.defineProperties(this, {
	            qhtmlClassName: { configurable: true, value: className },
	            qhtmlClassDefinition: { configurable: true, value: definition },
	            qhtmlRuntime: { configurable: true, value: runtimeObject }
	          });
	          this.qdom = function qhtmlClassQdom() { return runtimeObject.classQdomFor(this); };
	          for (const signal of parsed.signals) {
	            if (signal.name) runtimeObject.createClassSignal(this, signal.name);
	          }
	          runtimeObject.executeClassBody(this, parsed.constructor.parameters, args, parsed.constructor.body);
	        };
	        Object.defineProperty(ClassObject, "name", { configurable: true, value: className });
	        for (const method of parsed.methods) {
	          ClassObject.prototype[method.name] = function (...args) {
	            return runtimeObject.executeClassBody(this, method.parameters, args, method.body);
	          };
	        }
	        ClassObject.qhtmlDefinition = definition;
	        ClassObject.qhtmlParsedBody = parsed;
	        this.classesByName.set(className, ClassObject);
	        globalThis[className] = ClassObject;
	      }
	    },

	    instantiateClassInstances() {
	      for (const definition of manifest.classInstances || []) {
	        const className = String(definition.className || "").trim();
	        const instanceName = String(definition.name || "").trim();
	        if (!className || !instanceName || this.classInstancesByName.has(instanceName)) continue;
	        const ClassObject = this.classesByName.get(className);
	        if (typeof ClassObject !== "function") continue;
	        const owner = this.primaryElement(definition.ownerId) || this.root;
	        const args = (definition.arguments || []).map(source => this.parseValue(owner, source));
	        const instance = new ClassObject(...args);
	        instance.qhtmlName = instanceName;
	        instance.qhtmlUUID = definition.uuid || "";
	        this.classInstancesByName.set(instanceName, instance);
	        if (owner) owner[instanceName] = instance;
	      }
	    },

	    exportedHostSelector(selector) {
	      const text = String(selector || "").trim().toLowerCase();
	      return text === "q-html" || text === "q-html7" || text === `[${String(manifest.rootAttribute || "data-qhtml-export-root").toLowerCase()}]`;
	    },

	    createDocumentFacade() {
	      if (this.documentFacade) return this.documentFacade;
	      const runtimeObject = this;
	      const facade = new Proxy(document, {
	        get(target, key, receiver) {
	          if (key === "querySelector") {
	            return function querySelector(selector) {
	              if (runtimeObject.exportedHostSelector(selector)) return runtimeObject.root;
	              return target.querySelector(selector);
	            };
	          }
	          if (key === "querySelectorAll") {
	            return function querySelectorAll(selector) {
	              if (runtimeObject.exportedHostSelector(selector)) return [runtimeObject.root];
	              return target.querySelectorAll(selector);
	            };
	          }
	          const value = Reflect.get(target, key, receiver);
	          return typeof value === "function" ? value.bind(target) : value;
	        },
	        set(target, key, value, receiver) {
	          return Reflect.set(target, key, value, receiver);
	        }
	      });
	      this.documentFacade = facade;
	      return facade;
	    },

	    createCompatibilityRegistry() {
	      const runtimeObject = this;
	      const stylesByName = new Map();
	      for (const [name, style] of Object.entries(manifest.styles || {})) {
	        stylesByName.set(name, {
	          name,
	          style,
	          cssText: String(style.declarations || ""),
	          setCssText(cssText) {
	            this.cssText = String(cssText || "");
	            style.declarations = this.cssText;
	            runtimeObject.refreshDynamicStyleSheet();
	            return this;
	          }
	        });
	      }
	      const themesByName = new Map();
	      for (const [name, theme] of Object.entries(manifest.themes || {})) {
	        themesByName.set(name, {
	          name,
	          theme,
	          refresh() {
	            runtimeObject.refreshDynamicStyleSheet();
	            runtimeObject.applyThemeClasses();
	            return this;
	          }
	        });
	      }
	      return {
	        stylesByName,
	        themesByName,
	        refresh() {
	          runtimeObject.refreshDynamicStyleSheet();
	          runtimeObject.applyThemeClasses();
	          return this;
	        }
	      };
	    },

	    refreshDynamicStyleSheet() {
	      let styleElement = document.querySelector("style[data-qhtml-standalone-dynamic-style]");
	      if (!styleElement) {
	        styleElement = document.createElement("style");
	        styleElement.setAttribute("data-qhtml-standalone-dynamic-style", "1");
	        document.head.appendChild(styleElement);
	      }
	      const rules = [];
	      for (const [name, style] of Object.entries(manifest.styles || {})) {
	        const cssText = String(style.declarations || "").trim();
	        if (!cssText) continue;
	        const escapedName = String(name).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
	        rules.push(`q-style-application[qhtml-style="${escapedName}"] :not(q-style-application):not(q-theme-application) { ${cssText} }`);
	      }
	      styleElement.textContent = rules.join("\n");
	    },

    registerElements() {
      for (const owner of manifest.owners) {
        const elements = owner.id === manifest.rootId
          ? [this.root]
          : Array.from(this.root.querySelectorAll(owner.selector));
        this.elementsByOwnerId.set(owner.id, elements);
        for (const element of elements) {
	          Object.defineProperties(element, {
	            __qhtmlStandaloneRuntime: { configurable: true, writable: true, value: this },
	            __qhtmlOwnerId: { configurable: true, value: owner.id },
	            qhtmlName: { configurable: true, value: owner.name || "" },
	            qhtmlType: { configurable: true, value: owner.type || "" }
	          });
	          if (owner.id === manifest.rootId) {
	            element.qhtmlComponentRegistry = this.createCompatibilityRegistry();
	            element.__qhtmlRegistry = element.qhtmlComponentRegistry;
	          }
	          if (owner.name) {
	            if (!this.elementsByName.has(owner.name)) this.elementsByName.set(owner.name, []);
	            this.elementsByName.get(owner.name).push(element);
          }
        }
      }

      for (const owner of manifest.owners) {
        for (const element of this.ownerElements(owner.id)) {
          const component = owner.type === "QHTMLComponentInstance"
            ? element
            : owner.componentOwnerId === "@closest"
              ? (element.closest("[component-instance]") || this.root)
              : (this.primaryElement(owner.componentOwnerId) || element.closest("[component-instance]") || this.root);
          element.component = component;
          element.owner = component;
          element.ownerElement = component;
          if (owner.name && component && !Object.prototype.hasOwnProperty.call(component, owner.name)) {
            try {
              Object.defineProperty(component, owner.name, {
                configurable: true,
                enumerable: false,
                value: element,
                writable: true
              });
            } catch (error) {
              console.warn(`Unable to expose QHTML name ${owner.name}`, error);
            }
          }
        }
      }
    },

    createSignal(owner, name, exposeOnOwner = true) {
      const listeners = [];
      const runtimeObject = this;
	      const signal = function (...args) {
	        signal.__qhtmlLastArguments = args;
	        for (const listener of listeners.slice()) {
	          if (typeof listener === "function") {
	            listener.apply(listener.__qhtmlElement || globalThis, args);
	          } else if (listener && typeof listener.__qhtmlInvokeFromSignal === "function") {
	            listener.__qhtmlInvokeFromSignal(args);
	          }
        }
        owner.dispatchEvent(new CustomEvent("QHTMLSignal", {
          bubbles: true,
          detail: { signal: name, sender: owner, args }
        }));
        return listeners.length;
      };
      signal.connect = function (listener) {
        if (!listeners.includes(listener)) listeners.push(listener);
        return true;
      };
      signal.disconnect = function (listener) {
        const index = listeners.indexOf(listener);
        if (index < 0) return false;
        listeners.splice(index, 1);
        return true;
      };
      signal.connections = () => listeners.slice();
      signal.__qhtmlElement = owner;
      signal.__qhtmlRuntime = runtimeObject;
      if (exposeOnOwner) {
        owner[name] = signal;
        const lower = String(name).toLowerCase();
        if (lower && lower !== name && typeof owner[lower] !== "function") owner[lower] = signal;
      }
      return signal;
    },

    ensureDomEventSignal(element, eventName) {
      const normalized = this.domEventName(eventName);
      element.__qhtmlDomEventSignals = element.__qhtmlDomEventSignals || Object.create(null);
      if (element.__qhtmlDomEventSignals[normalized]) return element.__qhtmlDomEventSignals[normalized];
      const signal = this.createSignal(element, normalized, false);
      const bridge = event => signal(event);
      element.addEventListener(normalized, bridge);
      this.cleanup.push(() => element.removeEventListener(normalized, bridge));
      element.__qhtmlDomEventSignals[normalized] = signal;
      element.qhtmlSignals = element.qhtmlSignals || Object.create(null);
      element.qhtmlSignals[normalized] = signal;
      element.qhtmlSignals[`on${normalized}`] = signal;
      return signal;
    },

    decodeScriptEntities(source) {
      if (!/[&][A-Za-z#0-9]+;/.test(source)) return source;
      const textarea = document.createElement("textarea");
      textarea.innerHTML = source;
      return textarea.value;
    },

    scopeFor(owner, extras = {}) {
      const runtimeObject = this;
      const component = owner.component || owner;
      const localNames = new Map();
      for (const [name, elements] of this.elementsByName) {
        const localElement = elements.find(element => element === component || component.contains(element));
        if (localElement) localNames.set(name, localElement);
      }
      return new Proxy(Object.create(null), {
        has(target, key) {
          if (key === Symbol.unscopables) return false;
          return key !== "__qhtml_owner__" && key !== "__qhtml_args__";
        },
        get(target, key) {
          if (key === Symbol.unscopables) return undefined;
          if (Object.prototype.hasOwnProperty.call(extras, key)) return extras[key];
	          if (key === "$" ) return runtimeObject.query.bind(runtimeObject);
	          if (key === "document") return runtimeObject.createDocumentFacade();
	          if (key === "qhtmlRuntime") return runtimeObject;
          if (key === "component") return component;
          if (key === "root") return runtimeObject.root;
          if (key in owner) {
            const value = owner[key];
            return typeof value === "function" && !value.connect ? value.bind(owner) : value;
          }
	          if (component && key in component) {
	            const value = component[key];
	            return typeof value === "function" && !value.connect ? value.bind(component) : value;
	          }
	          if (localNames.has(String(key))) return localNames.get(String(key));
	          if (runtimeObject.classInstancesByName.has(String(key))) return runtimeObject.classInstancesByName.get(String(key));
	          if (runtimeObject.classesByName.has(String(key))) return runtimeObject.classesByName.get(String(key));
	          if (runtimeObject.elementsByName.has(String(key))) return runtimeObject.elementsByName.get(String(key))[0];
	          return globalThis[key];
	        },
        set(target, key, value) {
          if (key in owner || !(component && key in component)) owner[key] = value;
          else component[key] = value;
          return true;
        }
      });
    },

    compile(parameters, body) {
      const normalizedBody = this.decodeScriptEntities(String(body || ""));
      const key = JSON.stringify(parameters || []) + "\u0000" + normalizedBody;
      if (this.functionCache.has(key)) return this.functionCache.get(key);
      const parameterList = (parameters || []).join(", ");
      const callable = new Function(
        "scope",
        "__qhtml_owner__",
        "__qhtml_args__",
        `with (scope) { return (function (${parameterList}) {\n${normalizedBody}\n}).apply(__qhtml_owner__, __qhtml_args__); }`
      );
      this.functionCache.set(key, callable);
      return callable;
    },

    execute(owner, parameters, args, body, extras = {}) {
      const values = Array.from(args || []);
      const event = values[0] instanceof Event ? values[0] : extras.event;
      const scopeExtras = Object.assign({
        event,
        e: event,
        detail: event && event.detail
      }, extras);
      return this.compile(parameters || [], body)(this.scopeFor(owner, scopeExtras), owner, values);
    },

    evaluate(owner, expression) {
      return this.execute(owner, [], [], `return (${expression});`);
    },

    parseValue(owner, source) {
      const text = String(source == null ? "" : source).trim();
      if (/^[-+]?(?:\d+|\d*\.\d+)$/.test(text)) return Number(text);
      if (text === "true") return true;
      if (text === "false") return false;
      if (text === "null") return null;
      if (text === "undefined") return undefined;
      if (/^[-+]?(?:\d+|\d*\.\d+)(?:%|px|em|rem|vw|vh|vmin|vmax|ch|ex|cm|mm|in|pt|pc|deg|rad|turn|s|ms)$/.test(text)) return text;
      if ((text.startsWith("\"") && text.endsWith("\"")) ||
          (text.startsWith("'") && text.endsWith("'")) ||
          (text.startsWith("`") && text.endsWith("`"))) {
        try { return this.evaluate(owner, text); } catch (error) { return text.slice(1, -1); }
      }
      if ((text.startsWith("[") && text.endsWith("]")) ||
          (text.startsWith("{") && text.endsWith("}"))) {
        try { return this.evaluate(owner, text); } catch (error) { return text; }
      }
      try { return this.evaluate(owner, text); } catch (error) { return text; }
    },

    bindSignalsAndFunctions() {
      for (const definition of manifest.owners) {
        for (const owner of this.ownerElements(definition.id)) {
          for (const signalDefinition of definition.signals) {
            if (signalDefinition.name && typeof owner[signalDefinition.name] !== "function") {
              this.createSignal(owner, signalDefinition.name);
            }
          }
          for (const property of definition.properties) {
            const signalName = `${property.name}changed`;
            if (property.name && typeof owner[signalName] !== "function") this.createSignal(owner, signalName);
          }
          for (const functionDefinition of definition.functions) {
            if (!functionDefinition.name) continue;
            const runtimeObject = this;
            const fn = function (...args) {
              return runtimeObject.execute(owner, functionDefinition.parameters, args, functionDefinition.body);
            };
            fn.__qhtmlElement = owner;
            fn.__qhtmlInvokeFromSignal = args => fn(...(args || []));
            owner[functionDefinition.name] = fn;
          }
        }
      }
    },

    bindProperties() {
      for (const definition of manifest.owners) {
        for (const owner of this.ownerElements(definition.id)) {
          owner.__qhtmlProperties = owner.__qhtmlProperties || Object.create(null);
          for (const property of definition.properties) {
            if (!property.name) continue;
            const entry = { source: property.source, value: this.parseValue(owner, property.source) };
            owner.__qhtmlProperties[property.name] = entry;
            try {
              Object.defineProperty(owner, property.name, {
                configurable: true,
                enumerable: true,
                get() { return entry.value; },
                set: nextValue => {
                  const previousValue = entry.value;
                  if (Object.is(previousValue, nextValue)) return;
                  entry.value = nextValue;
                  const signal = owner[`${property.name}changed`];
                  if (typeof signal === "function") signal(nextValue, previousValue);
                  owner.dispatchEvent(new CustomEvent("QHTMLPropertyChanged", {
                    bubbles: true,
                    detail: { property: property.name, value: nextValue, previousValue }
                  }));
                  this.refreshAllInterpolations();
                }
              });
            } catch (error) {
              console.warn(`Unable to define QHTML property ${property.name}`, owner, error);
            }
          }
        }
      }
    },

    bindEvents() {
      for (const definition of manifest.owners) {
        for (const owner of this.ownerElements(definition.id)) {
          for (const eventDefinition of definition.events) {
            const eventName = this.domEventName(eventDefinition.name);
            if (!eventName) continue;
            const runtimeObject = this;
            const invoke = function (...args) {
              return runtimeObject.execute(owner, eventDefinition.parameters, args, eventDefinition.body);
            };
            invoke.__qhtmlElement = owner;
            invoke.__qhtmlInvokeFromSignal = args => invoke(...(args || []));

            if (eventDefinition.capture) {
              const captureListener = event => invoke(event);
              owner.addEventListener(eventName, captureListener, { capture: true });
              this.cleanup.push(() => owner.removeEventListener(eventName, captureListener, { capture: true }));
              continue;
            }
            const explicitSignal = owner[eventName];
            if (typeof explicitSignal === "function" && typeof explicitSignal.connect === "function") {
              explicitSignal.connect(invoke);
            } else {
              const signal = this.ensureDomEventSignal(owner, eventName);
              signal.connect(invoke);
            }
          }
        }
      }
    },

    resolveStart(owner, token) {
	      if (token === "this") return owner;
	      if (token === "component") return owner.component || owner;
	      if (token === "root") return this.root;
	      if (this.classInstancesByName.has(token)) return this.classInstancesByName.get(token);
	      if (this.classesByName.has(token)) return this.classesByName.get(token);
	      if (this.elementsByName.has(token)) {
	        const component = owner.component || owner;
	        return this.elementsByName.get(token).find(element => element === component || component.contains(element)) ||
               this.elementsByName.get(token)[0];
      }
      if (token in owner) return owner[token];
      if (owner.component && token in owner.component) return owner.component[token];
      return globalThis[token];
    },

    resolvePath(owner, path, bindFunction = false) {
      const parts = String(path || "").split(".").map(part => part.trim()).filter(Boolean);
      if (!parts.length) return undefined;
      let receiver = null;
      let value = this.resolveStart(owner, parts.shift());
      for (const part of parts) {
        receiver = value;
        if (value instanceof EventTarget &&
            (commonDomEvents.has(this.domEventName(part)) || /^on[a-z]/i.test(part)) &&
            !(typeof value[part] === "function" && value[part].connect)) {
          value = this.ensureDomEventSignal(value, part);
        } else {
          value = value == null ? undefined : value[part];
        }
      }
      if (bindFunction && typeof value === "function" && receiver && !value.connect) return value.bind(receiver);
      return value;
    },

    bindConnections() {
      for (const connection of manifest.connections) {
        for (const owner of this.ownerElements(connection.ownerId)) {
          const source = this.resolvePath(owner, connection.sourcePath, false);
          const target = this.resolvePath(owner, connection.targetPath, true);
          if (!source || typeof source.connect !== "function" || typeof target !== "function") {
            owner.dispatchEvent(new CustomEvent("QHTMLConnectError", {
              bubbles: true,
              detail: { sourcePath: connection.sourcePath, targetPath: connection.targetPath, source, target }
            }));
            continue;
          }
          source.connect(target);
        }
      }
    },

    interpolate(owner, source) {
      return String(source || "").replace(/\$\s*\{([^}]+)\}/g, (match, expression) => {
        try {
          const value = this.evaluate(owner, expression);
          return value == null ? "" : String(value);
        } catch (error) {
          console.warn(`QHTML interpolation failed: ${expression}`, error);
          return match;
        }
      });
    },

    refreshInterpolations(ownerId) {
      const bindings = this.interpolationBindings.get(ownerId) || [];
      for (const binding of bindings) {
        for (const owner of this.ownerElements(ownerId)) {
          const value = this.interpolate(owner, binding.source);
          if (binding.mode === "html") owner.innerHTML = value;
          else owner.textContent = value;
        }
      }
    },

    refreshAllInterpolations() {
      for (const ownerId of this.interpolationBindings.keys()) this.refreshInterpolations(ownerId);
    },

    bindInterpolations() {
      for (const binding of manifest.bindings) {
        if (!this.interpolationBindings.has(binding.ownerId)) this.interpolationBindings.set(binding.ownerId, []);
        this.interpolationBindings.get(binding.ownerId).push(binding);
      }
      this.refreshAllInterpolations();
    },

    applyStyleClasses() {
      for (const application of this.root.querySelectorAll("q-style-application[qhtml-style]")) {
        const styleName = application.getAttribute("qhtml-style");
        const style = manifest.styles[styleName];
        if (!style || !Array.isArray(style.classes)) continue;
        for (const element of application.querySelectorAll(":scope *")) {
          if (element.localName === "q-style-application" || element.localName === "q-theme-application") continue;
          element.classList.add(...style.classes);
        }
      }
    },

    applyThemeClassesToScope(scope, themeName, seen = new Set()) {
      const key = `${themeName}`;
      if (seen.has(key)) return;
      seen.add(key);
      const theme = manifest.themes && manifest.themes[themeName];
      if (!theme) return;
      for (const rule of theme.rules || []) {
        if (rule.selector === "q-child-theme") {
          for (const childThemeName of rule.styleNames || []) {
            this.applyThemeClassesToScope(scope, childThemeName, seen);
          }
          continue;
        }
        if (manifest.themes && manifest.themes[rule.selector] &&
            !(rule.styleNames || []).length && !(rule.inlineStyles || []).length) {
          this.applyThemeClassesToScope(scope, rule.selector, seen);
          continue;
        }
        let matches = [];
        try {
          matches = Array.from(scope.querySelectorAll(rule.selector));
        } catch (error) {
          console.warn(`Invalid q-theme selector ${rule.selector}`, error);
          continue;
        }
        for (const element of matches) {
          for (const styleName of rule.styleNames || []) {
            const style = manifest.styles[styleName];
            if (style && Array.isArray(style.classes) && style.classes.length) {
              element.classList.add(...style.classes);
            }
          }
        }
      }
    },

    applyThemeClasses() {
      for (const application of this.root.querySelectorAll("q-theme-application[qhtml-theme]")) {
        this.applyThemeClassesToScope(application, application.getAttribute("qhtml-theme"));
      }
    },

    runScripts() {
      for (const definition of manifest.owners) {
        for (const owner of this.ownerElements(definition.id)) {
          for (const body of definition.scripts) this.execute(owner, [], [], body);
        }
      }
    },

    emitReady() {
      const definitions = manifest.owners.slice().reverse();
      for (const definition of definitions) {
        for (const owner of this.ownerElements(definition.id)) {
          if (typeof owner.ready === "function") owner.ready();
          owner.dispatchEvent(new CustomEvent("QHTMLReady", { bubbles: true, detail: { standalone: true } }));
        }
      }
    },

	    mount() {
	      this.registerElements();
	      this.registerClasses();
	      this.instantiateClassInstances();
	      this.bindSignalsAndFunctions();
      this.bindProperties();
      this.bindEvents();
      this.bindInterpolations();
      this.bindConnections();
      this.applyStyleClasses();
      this.applyThemeClasses();
      this.runScripts();
      this.emitReady();
      this.root.dispatchEvent(new CustomEvent("QHTMLStandaloneReady", {
        bubbles: true,
        detail: { runtime: this, manifest }
      }));
      return this;
    },

    destroy() {
      for (const cleanup of this.cleanup.splice(0)) cleanup();
    }
  };

  root.__qhtmlStandaloneRuntime = runtime.mount();
})();)QHTMLJS");
    source.replace(QStringLiteral("__QHTML_MANIFEST__"), QString::fromUtf8(manifestJson));
    return inlineScriptEscape(source);
}

QJsonArray diagnosticsJson(const QVector<QHTMLWebExportDiagnostic> &diagnostics)
{
    QJsonArray array;
    for (const QHTMLWebExportDiagnostic &diagnostic : diagnostics) {
        QJsonObject object;
        QString severity = QStringLiteral("information");
        if (diagnostic.severity == QHTMLWebExportDiagnostic::Severity::Warning) severity = QStringLiteral("warning");
        if (diagnostic.severity == QHTMLWebExportDiagnostic::Severity::Error) severity = QStringLiteral("error");
        object.insert(QStringLiteral("severity"), severity);
        object.insert(QStringLiteral("code"), diagnostic.code);
        object.insert(QStringLiteral("message"), diagnostic.message);
        object.insert(QStringLiteral("nodeType"), diagnostic.nodeType);
        object.insert(QStringLiteral("nodeName"), diagnostic.nodeName);
        object.insert(QStringLiteral("nodeUuid"), diagnostic.nodeUuid);
        array.append(object);
    }
    return array;
}

} // namespace

bool QHTMLWebBundle::succeeded() const
{
    for (const QHTMLWebExportDiagnostic &diagnostic : diagnostics) {
        if (diagnostic.severity == QHTMLWebExportDiagnostic::Severity::Error) {
            return false;
        }
    }
    return true;
}

bool QHTMLWebBundle::hasWarnings() const
{
    for (const QHTMLWebExportDiagnostic &diagnostic : diagnostics) {
        if (diagnostic.severity == QHTMLWebExportDiagnostic::Severity::Warning) {
            return true;
        }
    }
    return false;
}

QHTMLWebExporter::QHTMLWebExporter(QHTMLWebExportOptions options)
    : m_options(std::move(options))
{
}

const QHTMLWebExportOptions &QHTMLWebExporter::options() const
{
    return m_options;
}

void QHTMLWebExporter::setOptions(const QHTMLWebExportOptions &options)
{
    m_options = options;
}

QHTMLWebBundle QHTMLWebExporter::exportNode(const QHTMLNode &node) const
{
    CompileState state;
    state.options = &m_options;
    state.rootId = node.qhtmlUUID().trimmed().isEmpty() ? QHTMLReference::createUUID() : node.qhtmlUUID();

    collectNode(&node, state, QString(), QString(), false);
    if (!state.ownerIndexes.contains(state.rootId)) {
        ensureOwner(state, &node, QString(), state.rootId);
    }

    QHTMLWebBundle bundle;
    bundle.markup = node.renderHtml();
    bundle.css = m_options.includeStyles ? cssForState(state) : QString();
    bundle.manifest = manifestForState(state);
    bundle.diagnostics = state.diagnostics;
    bundle.manifest.insert(QStringLiteral("diagnostics"), diagnosticsJson(bundle.diagnostics));
    bundle.javascript = m_options.includeBehavior
        ? standaloneRuntimeSource(bundle.manifest, m_options.prettyPrint)
        : QString();

    const QString rootOpen = QStringLiteral("<div ") + m_options.rootAttribute + QStringLiteral("=\"") +
                             attributeEscape(state.rootId) + QStringLiteral("\" style=\"display: contents;\">");
    const QString rootClose = QStringLiteral("</div>");

    if (m_options.documentMode == QHTMLWebExportOptions::DocumentMode::Fragment) {
        QStringList parts;
        parts.append(rootOpen);
        parts.append(bundle.markup);
        if (!bundle.css.isEmpty()) {
            parts.append(QStringLiteral("<style>\n") + inlineStyleEscape(bundle.css) + QStringLiteral("\n</style>"));
        }
        if (!bundle.javascript.isEmpty()) {
            parts.append(QStringLiteral("<script>\n") + bundle.javascript + QStringLiteral("\n</script>"));
        }
        parts.append(rootClose);
        bundle.html = m_options.prettyPrint ? parts.join(QLatin1Char('\n')) : parts.join(QString());
        return bundle;
    }

    QStringList document;
    document.append(QStringLiteral("<!doctype html>"));
    document.append(QStringLiteral("<html lang=\"") + attributeEscape(m_options.language) + QStringLiteral("\">"));
    document.append(QStringLiteral("<head>"));
    document.append(QStringLiteral("  <meta charset=\"utf-8\">"));
    document.append(QStringLiteral("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"));
    if (m_options.includeGeneratorMetadata) {
        document.append(QStringLiteral("  <meta name=\"generator\" content=\"QHTML7 standalone web exporter ") +
                        attributeEscape(QString::fromLatin1(QHTML_VERSION)) + QStringLiteral("\">"));
    }
    document.append(QStringLiteral("  <title>") + htmlEscape(m_options.documentTitle) + QStringLiteral("</title>"));
    if (!bundle.css.isEmpty()) {
        document.append(QStringLiteral("  <style>"));
        document.append(indentText(inlineStyleEscape(bundle.css), QStringLiteral("    ")));
        document.append(QStringLiteral("  </style>"));
    }
    document.append(QStringLiteral("</head>"));
    document.append(QStringLiteral("<body>"));
    document.append(QStringLiteral("  ") + rootOpen);
    if (!bundle.markup.isEmpty()) {
        document.append(indentText(bundle.markup, QStringLiteral("    ")));
    }
    document.append(QStringLiteral("  ") + rootClose);
    if (!bundle.javascript.isEmpty()) {
        document.append(QStringLiteral("  <script>"));
        document.append(indentText(bundle.javascript, QStringLiteral("    ")));
        document.append(QStringLiteral("  </script>"));
    }
    document.append(QStringLiteral("</body>"));
    document.append(QStringLiteral("</html>"));
    bundle.html = m_options.prettyPrint ? document.join(QLatin1Char('\n')) : document.join(QString());
    return bundle;
}

QString QHTMLWebExporter::toHTML(const QHTMLNode &node) const
{
    return exportNode(node).html;
}

QHTMLWebBundle QHTMLNode::toWebBundle(const QHTMLWebExportOptions &options) const
{
    return QHTMLWebExporter(options).exportNode(*this);
}

QString QHTMLNode::toHTML(const QHTMLWebExportOptions &options) const
{
    return QHTMLWebExporter(options).toHTML(*this);
}

QString QHTMLNode::toHTML() const
{
    return QHTMLWebExporter().toHTML(*this);
}
