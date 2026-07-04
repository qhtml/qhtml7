#pragma once

#include <QtCore/QHash>
#include <QtCore/QList>
#include <QtCore/QRegularExpression>
#include <QtCore/QSet>
#include <QtCore/QString>
#include <QtCore/QStringList>
#include <QtCore/QUuid>
#include <QtCore/QVector>

#include <string>

class QHTMLAstNode;
class QHTMLFunction;
class QHTMLSignal;
class QHTMLSignalBus;
class QHTMLStyle;
class QHTMLTheme;

class QHTMLReference
{
public:
    explicit QHTMLReference(const QString &type = QStringLiteral("QHTMLReference"),
                            const QString &name = QString(),
                            const QString &uuid = QString())
        : m_qhtmlType(type),
          m_qhtmlName(name),
          m_qhtmlUUID(uuid.isEmpty() ? createUUID() : uuid)
    {
    }

    virtual ~QHTMLReference() = default;

    QString qhtmlType() const { return m_qhtmlType; }
    std::string qhtmlTypeJs() const { return qhtmlType().toStdString(); }

    QString qhtmlUUID() const { return m_qhtmlUUID; }
    std::string qhtmlUUIDJs() const { return qhtmlUUID().toStdString(); }
    void setQHTMLUUID(const QString &uuid) { m_qhtmlUUID = uuid; }
    void setQHTMLUUIDJs(const std::string &uuid) { setQHTMLUUID(QString::fromStdString(uuid)); }

    QString qhtmlName() const { return m_qhtmlName; }
    std::string qhtmlNameJs() const { return qhtmlName().toStdString(); }
    void setQHTMLName(const QString &name) { m_qhtmlName = name; }
    void setQHTMLNameJs(const std::string &name) { setQHTMLName(QString::fromStdString(name)); }

    virtual QHTMLReference *clone() const { return new QHTMLReference(*this); }

    static QString createUUID()
    {
        return QUuid::createUuid().toString(QUuid::WithoutBraces);
    }

protected:
    void setQHTMLType(const QString &type) { m_qhtmlType = type; }

private:
    QString m_qhtmlType;
    QString m_qhtmlName;
    QString m_qhtmlUUID;
};

class QHTMLKeyword final : public QHTMLReference
{
public:
    explicit QHTMLKeyword(const QString &name = QString(), const QString &value = QString())
        : QHTMLReference(QStringLiteral("QHTMLKeyword"), name),
          m_value(value)
    {
    }

    QString value() const { return m_value; }
    std::string valueJs() const { return value().toStdString(); }
    void setValue(const QString &value) { m_value = value; }
    void setValueJs(const std::string &value) { setValue(QString::fromStdString(value)); }

    QHTMLReference *clone() const override { return new QHTMLKeyword(*this); }

private:
    QString m_value;
};

class QHTMLNamedReference final : public QHTMLReference
{
public:
    explicit QHTMLNamedReference(const QString &name = QString(), const QString &targetUUID = QString())
        : QHTMLReference(QStringLiteral("QHTMLNamedReference"), name),
          m_targetUUID(targetUUID)
    {
    }

    QString targetUUID() const { return m_targetUUID; }
    std::string targetUUIDJs() const { return targetUUID().toStdString(); }
    void setTargetUUID(const QString &uuid) { m_targetUUID = uuid; }
    void setTargetUUIDJs(const std::string &uuid) { setTargetUUID(QString::fromStdString(uuid)); }

    QHTMLReference *clone() const override { return new QHTMLNamedReference(*this); }

private:
    QString m_targetUUID;
};

class QHTMLObjectReference final : public QHTMLReference
{
public:
    explicit QHTMLObjectReference(const QString &name = QString(), QHTMLReference *target = nullptr)
        : QHTMLReference(QStringLiteral("QHTMLObjectReference"),
                         name,
                         target ? target->qhtmlUUID() : QString()),
          m_target(target)
    {
    }

    QHTMLReference *target() const { return m_target; }
    QHTMLReference *clone() const override { return new QHTMLObjectReference(*this); }

private:
    QHTMLReference *m_target = nullptr;
};

class QHTMLContext
{
public:
    explicit QHTMLContext(QHTMLContext *parentContext = nullptr)
        : m_parentContext(parentContext)
    {
    }

    QHTMLContext(const QHTMLContext &other)
        : m_parentContext(other.m_parentContext)
    {
        for (auto it = other.m_references.constBegin(); it != other.m_references.constEnd(); ++it) {
            m_references.insert(it.key(), it.value() ? it.value()->clone() : nullptr);
        }
    }

    QHTMLContext &operator=(const QHTMLContext &other)
    {
        if (this == &other) {
            return *this;
        }
        clear();
        m_parentContext = other.m_parentContext;
        for (auto it = other.m_references.constBegin(); it != other.m_references.constEnd(); ++it) {
            m_references.insert(it.key(), it.value() ? it.value()->clone() : nullptr);
        }
        return *this;
    }

    ~QHTMLContext() { clear(); }

    void setParentContext(QHTMLContext *parentContext) { m_parentContext = parentContext; }
    QHTMLContext *parentContext() const { return m_parentContext; }

    void clear()
    {
        qDeleteAll(m_references);
        m_references.clear();
    }

    void setReference(const QString &key, QHTMLReference *reference)
    {
        if (key.trimmed().isEmpty() || !reference) {
            delete reference;
            return;
        }
        delete m_references.take(key);
        m_references.insert(key, reference);
    }

    void updateKeywordReference(const QString &name, const QString &value)
    {
        setReference(name, new QHTMLKeyword(name, value));
    }

    void updateNamedReference(const QString &name, const QString &uuid)
    {
        setReference(name, new QHTMLNamedReference(name, uuid));
    }

    void updateObjectReference(const QString &name, QHTMLReference *target)
    {
        setReference(name, new QHTMLObjectReference(name, target));
    }

    QHTMLReference *resolve(const QString &key) const
    {
        if (m_references.contains(key)) {
            QHTMLReference *reference = m_references.value(key);
            if (reference && reference->qhtmlType() == QStringLiteral("QHTMLObjectReference")) {
                return static_cast<QHTMLObjectReference *>(reference)->target();
            }
            return reference;
        }
        return m_parentContext ? m_parentContext->resolve(key) : nullptr;
    }

    bool containsLocalReference(const QString &key) const
    {
        return m_references.contains(key);
    }

    std::string resolveTypeJs(const std::string &key) const
    {
        QHTMLReference *reference = resolve(QString::fromStdString(key));
        return reference ? reference->qhtmlType().toStdString() : std::string();
    }

    QStringList keys() const { return m_references.keys(); }
    int size() const { return m_references.size(); }

private:
    QHash<QString, QHTMLReference *> m_references;
    QHTMLContext *m_parentContext = nullptr;
};

class QHTMLNode : public QHTMLReference
{
public:
    explicit QHTMLNode(const QString &type = QStringLiteral("QHTMLNode"),
                       const QString &name = QString())
        : QHTMLReference(type, name),
          qhtmlContext(new QHTMLContext())
    {
    }

    ~QHTMLNode() override
    {
        clearChildren();
        delete qhtmlContext;
    }

    QHTMLNode(const QHTMLNode &) = delete;
    QHTMLNode &operator=(const QHTMLNode &) = delete;

    QHTMLNode *qhtmlParent = nullptr;
    QHash<int, QHTMLNode *> qhtmlChildren;
    QHash<QString, QString> qhtmlProperties;
    QHTMLContext *qhtmlContext = nullptr;

    QHTMLNode *parent() const { return qhtmlParent; }
    QHTMLNode *parentJs() const { return qhtmlParent; }

    int childCount() const { return qhtmlChildren.size(); }

    QHTMLNode *childAt(int index) const
    {
        return qhtmlChildren.value(index, nullptr);
    }

    QVector<QHTMLNode *> children() const
    {
        QVector<QHTMLNode *> out;
        out.reserve(qhtmlChildren.size());
        for (int i = 0; i < qhtmlChildren.size(); ++i) {
            if (QHTMLNode *child = qhtmlChildren.value(i, nullptr)) {
                out.append(child);
            }
        }
        return out;
    }

    void appendChild(QHTMLNode *child)
    {
        if (!child) {
            return;
        }
        child->qhtmlParent = this;
        if (child->qhtmlContext) {
            child->qhtmlContext->setParentContext(qhtmlContext);
        }
        qhtmlChildren.insert(qhtmlChildren.size(), child);
    }

    void clearChildren()
    {
        qDeleteAll(qhtmlChildren);
        qhtmlChildren.clear();
    }

    void setProperty(const QString &key, const QString &value)
    {
        if (!key.trimmed().isEmpty()) {
            qhtmlProperties.insert(key, value);
        }
    }

    void setPropertyJs(const std::string &key, const std::string &value)
    {
        setProperty(QString::fromStdString(key), QString::fromStdString(value));
    }

    QString property(const QString &key) const { return qhtmlProperties.value(key); }
    std::string propertyJs(const std::string &key) const
    {
        return property(QString::fromStdString(key)).toStdString();
    }

    void updateKeywordReference(const QString &name, const QString &value)
    {
        qhtmlContext->updateKeywordReference(name, value);
    }

    void updateKeywordReferenceJs(const std::string &name, const std::string &value)
    {
        updateKeywordReference(QString::fromStdString(name), QString::fromStdString(value));
    }

    void updateNamedReference(const QString &name, const QString &uuid)
    {
        qhtmlContext->updateNamedReference(name, uuid);
    }

    void updateNamedReferenceJs(const std::string &name, const std::string &uuid)
    {
        updateNamedReference(QString::fromStdString(name), QString::fromStdString(uuid));
    }

    void updateObjectReference(const QString &name, QHTMLReference *target)
    {
        qhtmlContext->updateObjectReference(name, target);
    }

    QHTMLReference *resolve(const QString &key) const
    {
        return qhtmlContext ? qhtmlContext->resolve(key) : nullptr;
    }

    QHTMLReference *resolveJs(const std::string &key) const
    {
        return resolve(QString::fromStdString(key));
    }

    std::string resolveTypeJs(const std::string &key) const
    {
        return qhtmlContext ? qhtmlContext->resolveTypeJs(key) : std::string();
    }

    virtual void runtime()
    {
        for (QHTMLNode *child : children()) {
            child->runtime();
        }
    }

    virtual QString renderHtml() const
    {
        QString out;
        for (QHTMLNode *child : children()) {
            out += child->renderHtml();
        }
        return out;
    }

    std::string renderHtmlJs() const { return renderHtml().toStdString(); }

    static QString escapeText(const QString &value)
    {
        QString out;
        out.reserve(value.size());
        for (const QChar ch : value) {
            if (ch == QLatin1Char('&')) {
                out += QStringLiteral("&amp;");
            } else if (ch == QLatin1Char('<')) {
                out += QStringLiteral("&lt;");
            } else if (ch == QLatin1Char('>')) {
                out += QStringLiteral("&gt;");
            } else {
                out += ch;
            }
        }
        return out;
    }

    static QString escapeAttribute(const QString &value)
    {
        QString out = escapeText(value);
        out.replace(QLatin1Char('"'), QStringLiteral("&quot;"));
        return out;
    }
};

class QHTMLDomNode : public QHTMLNode
{
public:
    explicit QHTMLDomNode(const QString &type = QStringLiteral("QHTMLDomNode"),
                          const QString &name = QString())
        : QHTMLNode(type, name)
    {
    }
};

class QHTMLDomElement final : public QHTMLDomNode
{
public:
    explicit QHTMLDomElement(const QString &tagName = QString(),
                             const QHash<QString, QString> &attributes = {})
        : QHTMLDomNode(QStringLiteral("QHTMLDomElement"), tagName),
          m_tagName(tagName),
          m_attributes(attributes)
    {
    }

    QString tagName() const { return m_tagName; }
    std::string tagNameJs() const { return tagName().toStdString(); }

    void setAttribute(const QString &key, const QString &value)
    {
        if (!key.trimmed().isEmpty()) {
            m_attributes.insert(key, value);
        }
    }

    void setAttributeJs(const std::string &key, const std::string &value)
    {
        setAttribute(QString::fromStdString(key), QString::fromStdString(value));
    }

    QString attribute(const QString &key) const { return m_attributes.value(key); }
    std::string attributeJs(const std::string &key) const
    {
        return attribute(QString::fromStdString(key)).toStdString();
    }

    QString renderHtml() const override
    {
        if (m_tagName.trimmed().isEmpty()) {
            return QHTMLDomNode::renderHtml();
        }

        QString out = QStringLiteral("<") + m_tagName;
        const QStringList keys = m_attributes.keys();
        for (const QString &key : keys) {
            const QString value = m_attributes.value(key);
            if (!value.isEmpty()) {
                out += QStringLiteral(" ") + key + QStringLiteral("=\"") + escapeAttribute(value) + QStringLiteral("\"");
            }
        }
        out += QStringLiteral(">");
        out += QHTMLDomNode::renderHtml();
        out += QStringLiteral("</") + m_tagName + QStringLiteral(">");
        return out;
    }

private:
    QString m_tagName;
    QHash<QString, QString> m_attributes;
};

class QHTMLTextFragment final : public QHTMLDomNode
{
public:
    explicit QHTMLTextFragment(const QString &value = QString())
        : QHTMLDomNode(QStringLiteral("QHTMLTextFragment"), QStringLiteral("text")),
          m_value(value)
    {
    }

    QString value() const { return m_value; }
    std::string valueJs() const { return value().toStdString(); }
    QString renderHtml() const override { return escapeText(m_value); }

private:
    QString m_value;
};

class QHTMLHTMLFragment final : public QHTMLDomNode
{
public:
    explicit QHTMLHTMLFragment(const QString &value = QString())
        : QHTMLDomNode(QStringLiteral("QHTMLHTMLFragment"), QStringLiteral("html")),
          m_value(value)
    {
    }

    QString value() const { return m_value; }
    std::string valueJs() const { return value().toStdString(); }
    QString renderHtml() const override { return m_value; }

private:
    QString m_value;
};

class QHTMLUnknownFragment final : public QHTMLDomNode
{
public:
    explicit QHTMLUnknownFragment(const QString &value = QString())
        : QHTMLDomNode(QStringLiteral("QHTMLUnknownFragment")),
          m_value(value.trimmed())
    {
    }

    QString value() const { return m_value; }
    std::string valueJs() const { return value().toStdString(); }
    QString renderHtml() const override { return escapeText(m_value); }

private:
    QString m_value;
};

class QHTMLTypedNode : public QHTMLDomNode
{
public:
    explicit QHTMLTypedNode(const QString &keyword = QString(),
                            const QString &name = QString(),
                            const QHash<QString, QString> &attributes = {})
        : QHTMLDomNode(QStringLiteral("QHTMLTypedNode"), name),
          m_keyword(keyword),
          m_attributes(attributes)
    {
        setProperty(QStringLiteral("keyword"), keyword);
    }

    QString keyword() const { return m_keyword; }
    std::string keywordJs() const { return keyword().toStdString(); }
    QHash<QString, QString> attributes() const { return m_attributes; }

    void setAttribute(const QString &key, const QString &value)
    {
        if (!key.trimmed().isEmpty()) {
            m_attributes.insert(key, value);
        }
    }

    QString renderHtml() const override
    {
        return QHTMLDomNode::renderHtml();
    }

private:
    QString m_keyword;
    QHash<QString, QString> m_attributes;
};

class QHTMLFunction final : public QHTMLTypedNode
{
public:
    explicit QHTMLFunction(const QString &name = QString(),
                           const QHash<QString, QString> &attributes = {},
                           const QString &body = QString())
        : QHTMLTypedNode(QStringLiteral("function"), name, attributes),
          m_parameters(parseParameters(attributes.value(QStringLiteral("parameters")))),
          m_body(body.trimmed())
    {
        setQHTMLType(QStringLiteral("QHTMLFunction"));
        setProperty(QStringLiteral("kind"), QStringLiteral("function"));
    }

    QStringList parameters() const { return m_parameters; }
    QString parameterList() const { return m_parameters.join(QStringLiteral(", ")); }
    std::string parameterListJs() const { return parameterList().toStdString(); }

    QString body() const { return m_body; }
    std::string bodyJs() const { return m_body.toStdString(); }

    QStringList lastArguments() const { return m_lastArguments; }
    QString lastArgumentList() const { return m_lastArguments.join(QStringLiteral(", ")); }
    std::string lastArgumentListJs() const { return lastArgumentList().toStdString(); }

    QString lastSenderUUID() const { return m_lastSenderUUID; }
    std::string lastSenderUUIDJs() const { return m_lastSenderUUID.toStdString(); }

    QString lastSignalUUID() const { return m_lastSignalUUID; }
    std::string lastSignalUUIDJs() const { return m_lastSignalUUID.toStdString(); }

    int callCount() const { return m_callCount; }

    QString call(const QStringList &arguments,
                 QHTMLNode *sender = nullptr,
                 QHTMLReference *signal = nullptr)
    {
        m_lastArguments = arguments;
        m_lastSenderUUID = sender ? sender->qhtmlUUID() : QString();
        m_lastSignalUUID = signal ? signal->qhtmlUUID() : QString();
        ++m_callCount;

        for (int i = 0; i < m_parameters.size() && i < arguments.size(); ++i) {
            if (qhtmlContext) {
                qhtmlContext->updateKeywordReference(m_parameters.at(i), arguments.at(i));
            }
        }
        return m_body;
    }

    std::string callJs(const std::string &argumentList)
    {
        return call(parseParameters(QString::fromStdString(argumentList))).toStdString();
    }

    QHTMLFunction *cloneFunction() const
    {
        QHash<QString, QString> clonedAttributes = attributes();
        clonedAttributes.insert(QStringLiteral("parameters"), parameterList());
        QHTMLFunction *cloned = new QHTMLFunction(qhtmlName(), clonedAttributes, m_body);
        return cloned;
    }

    QString renderHtml() const override { return QString(); }

    static QStringList parseParameters(const QString &value)
    {
        QStringList out;
        for (const QString &part : value.split(QLatin1Char(','), Qt::SkipEmptyParts)) {
            const QString parameter = part.trimmed();
            if (!parameter.isEmpty()) {
                out.append(parameter);
            }
        }
        return out;
    }

private:
    QStringList m_parameters;
    QString m_body;
    QStringList m_lastArguments;
    QString m_lastSenderUUID;
    QString m_lastSignalUUID;
    int m_callCount = 0;
};

class QHTMLSignal final : public QHTMLTypedNode
{
public:
    explicit QHTMLSignal(const QString &name = QString(),
                         const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-signal"), name, attributes),
          m_parameters(QHTMLFunction::parseParameters(attributes.value(QStringLiteral("parameters"))))
    {
        setQHTMLType(QStringLiteral("QHTMLSignal"));
        setProperty(QStringLiteral("kind"), QStringLiteral("signal"));
    }

    void setSignalBus(QHTMLSignalBus *bus) { m_signalBus = bus; }
    QHTMLSignalBus *signalBus() const { return m_signalBus; }
    QHTMLSignalBus *signalBusJs() const { return m_signalBus; }

    QStringList parameters() const { return m_parameters; }
    QString parameterList() const { return m_parameters.join(QStringLiteral(", ")); }
    std::string parameterListJs() const { return parameterList().toStdString(); }

    bool connect(QHTMLFunction *function);
    int emitSignal(const QStringList &arguments, QHTMLNode *sender = nullptr);
    int emitSignalJs(const std::string &argumentList)
    {
        return emitSignal(QHTMLFunction::parseParameters(QString::fromStdString(argumentList)));
    }

    QHTMLSignal *cloneSignal() const
    {
        QHash<QString, QString> clonedAttributes = attributes();
        clonedAttributes.insert(QStringLiteral("parameters"), parameterList());
        QHTMLSignal *cloned = new QHTMLSignal(qhtmlName(), clonedAttributes);
        cloned->setSignalBus(m_signalBus);
        return cloned;
    }

    QString renderHtml() const override { return QString(); }

private:
    QStringList m_parameters;
    QHTMLSignalBus *m_signalBus = nullptr;
};

class QHTMLSignalConnection final
{
public:
    QHTMLSignalConnection(QHTMLSignal *signal = nullptr, QHTMLFunction *function = nullptr)
        : m_signal(signal),
          m_function(function)
    {
    }

    QHTMLSignal *signal() const { return m_signal; }
    QHTMLFunction *function() const { return m_function; }

    QString signalUUID() const { return m_signal ? m_signal->qhtmlUUID() : QString(); }
    QString functionUUID() const { return m_function ? m_function->qhtmlUUID() : QString(); }
    QString receiverUUID() const { return m_function && m_function->parent() ? m_function->parent()->qhtmlUUID() : QString(); }

private:
    QHTMLSignal *m_signal = nullptr;
    QHTMLFunction *m_function = nullptr;
};

class QHTMLSignalBus final
{
public:
    bool connect(QHTMLSignal *signal, QHTMLFunction *function)
    {
        if (!signal || !function) {
            return false;
        }

        const QString key = signal->qhtmlUUID();
        QVector<QHTMLSignalConnection> connections = m_connections.value(key);
        for (const QHTMLSignalConnection &connection : connections) {
            if (connection.function() == function) {
                return true;
            }
        }

        connections.append(QHTMLSignalConnection(signal, function));
        m_connections.insert(key, connections);
        return true;
    }

    int emitSignal(QHTMLSignal *signal, QHTMLNode *sender, const QStringList &arguments)
    {
        if (!signal) {
            return 0;
        }

        m_lastSignalUUID = signal->qhtmlUUID();
        m_lastSenderUUID = sender ? sender->qhtmlUUID() : QString();
        m_lastArguments = arguments;

        int invoked = 0;
        const QVector<QHTMLSignalConnection> connections = m_connections.value(signal->qhtmlUUID());
        for (const QHTMLSignalConnection &connection : connections) {
            if (QHTMLFunction *function = connection.function()) {
                m_lastFunctionUUID = function->qhtmlUUID();
                m_lastReceiverUUID = connection.receiverUUID();
                m_lastScriptBody = function->call(arguments, sender, signal);
                ++invoked;
            }
        }
        m_lastDispatchCount = invoked;
        return invoked;
    }

    bool connectJs(QHTMLSignal *signal, QHTMLFunction *function)
    {
        return connect(signal, function);
    }

    int emitSignalJs(QHTMLSignal *signal, QHTMLNode *sender, const std::string &argumentList)
    {
        return emitSignal(signal, sender, QHTMLFunction::parseParameters(QString::fromStdString(argumentList)));
    }

    int connectionCount(QHTMLSignal *signal) const
    {
        return signal ? m_connections.value(signal->qhtmlUUID()).size() : 0;
    }

    QString lastSignalUUID() const { return m_lastSignalUUID; }
    std::string lastSignalUUIDJs() const { return m_lastSignalUUID.toStdString(); }

    QString lastSenderUUID() const { return m_lastSenderUUID; }
    std::string lastSenderUUIDJs() const { return m_lastSenderUUID.toStdString(); }

    QString lastFunctionUUID() const { return m_lastFunctionUUID; }
    std::string lastFunctionUUIDJs() const { return m_lastFunctionUUID.toStdString(); }

    QString lastReceiverUUID() const { return m_lastReceiverUUID; }
    std::string lastReceiverUUIDJs() const { return m_lastReceiverUUID.toStdString(); }

    QString lastScriptBody() const { return m_lastScriptBody; }
    std::string lastScriptBodyJs() const { return m_lastScriptBody.toStdString(); }

    QString lastArgumentList() const { return m_lastArguments.join(QStringLiteral(", ")); }
    std::string lastArgumentListJs() const { return lastArgumentList().toStdString(); }

    int lastDispatchCount() const { return m_lastDispatchCount; }

private:
    QHash<QString, QVector<QHTMLSignalConnection>> m_connections;
    QString m_lastSignalUUID;
    QString m_lastSenderUUID;
    QString m_lastFunctionUUID;
    QString m_lastReceiverUUID;
    QString m_lastScriptBody;
    QStringList m_lastArguments;
    int m_lastDispatchCount = 0;
};

inline bool QHTMLSignal::connect(QHTMLFunction *function)
{
    return m_signalBus ? m_signalBus->connect(this, function) : false;
}

inline int QHTMLSignal::emitSignal(const QStringList &arguments, QHTMLNode *sender)
{
    QHTMLNode *resolvedSender = sender ? sender : parent();
    return m_signalBus ? m_signalBus->emitSignal(this, resolvedSender, arguments) : 0;
}

class QHTMLComponentDefinition final : public QHTMLTypedNode
{
public:
    explicit QHTMLComponentDefinition(const QString &name = QString(),
                                      const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-component"), name, attributes)
    {
        setQHTMLType(QStringLiteral("QHTMLComponentDefinition"));
        setProperty(QStringLiteral("kind"), QStringLiteral("component-definition"));
    }

    QString renderHtml() const override { return QString(); }
    QString renderTemplateHtml() const { return QHTMLTypedNode::renderHtml(); }
    std::string renderTemplateHtmlJs() const { return renderTemplateHtml().toStdString(); }
};

class QHTMLComponentInstance final : public QHTMLTypedNode
{
public:
    explicit QHTMLComponentInstance(const QString &name = QString(),
                                    const QHash<QString, QString> &attributes = {},
                                    QHTMLComponentDefinition *definition = nullptr)
        : QHTMLTypedNode(QStringLiteral("q-component-instance"), name, attributes)
    {
        setQHTMLType(QStringLiteral("QHTMLComponentInstance"));
        m_definition = definition;
        setProperty(QStringLiteral("kind"), QStringLiteral("component-instance"));
    }

    void setDefinition(QHTMLComponentDefinition *definition) { m_definition = definition; }
    QHTMLComponentDefinition *definition() const { return m_definition; }
    QHTMLComponentDefinition *definitionJs() const { return m_definition; }

    QString componentDefinitionUUID() const
    {
        return m_definition ? m_definition->qhtmlUUID() : QString();
    }

    std::string componentDefinitionUUIDJs() const
    {
        return componentDefinitionUUID().toStdString();
    }

    QString renderHtml() const override
    {
        if (!m_definition) {
            return QHTMLTypedNode::renderHtml();
        }

        const QString tagName = m_definition->qhtmlName().trimmed();
        if (tagName.isEmpty()) {
            return m_definition->renderTemplateHtml() + QHTMLTypedNode::renderHtml();
        }

        QString out = QStringLiteral("<") + tagName;
        const QHash<QString, QString> localAttributes = attributes();
        const QStringList keys = localAttributes.keys();
        for (const QString &key : keys) {
            const QString value = localAttributes.value(key);
            if (!value.isEmpty()) {
                out += QStringLiteral(" ") + key + QStringLiteral("=\"") + escapeAttribute(value) + QStringLiteral("\"");
            }
        }
        out += QStringLiteral(" component-definition=\"") + escapeAttribute(m_definition->qhtmlUUID()) + QStringLiteral("\"");
        out += QStringLiteral(" component-instance=\"") + escapeAttribute(qhtmlUUID()) + QStringLiteral("\">");
        out += m_definition->renderTemplateHtml();
        out += QHTMLTypedNode::renderHtml();
        out += QStringLiteral("</") + tagName + QStringLiteral(">");
        return out;
    }

private:
    QHTMLComponentDefinition *m_definition = nullptr;
};

class QHTMLArrayNode final : public QHTMLNode
{
public:
    explicit QHTMLArrayNode(const QString &literal = QString())
        : QHTMLNode(QStringLiteral("QHTMLArrayNode"), QStringLiteral("array")),
          m_values(splitTopLevel(arrayInner(literal)))
    {
    }

    int size() const { return m_values.size(); }
    QString at(int index) const { return index >= 0 && index < m_values.size() ? m_values.at(index) : QString(); }
    std::string atJs(int index) const { return at(index).toStdString(); }

    void push(const QString &value) { m_values.append(value); }
    void pushJs(const std::string &value) { push(QString::fromStdString(value)); }

    QString pop()
    {
        return m_values.isEmpty() ? QString() : m_values.takeLast();
    }
    std::string popJs() { return pop().toStdString(); }

    void unshift(const QString &value) { m_values.prepend(value); }
    void unshiftJs(const std::string &value) { unshift(QString::fromStdString(value)); }

    QString shift()
    {
        return m_values.isEmpty() ? QString() : m_values.takeFirst();
    }
    std::string shiftJs() { return shift().toStdString(); }

    QHTMLArrayNode *slice(int start, int end) const
    {
        QHTMLArrayNode *out = new QHTMLArrayNode();
        const int normalizedStart = start < 0 ? 0 : start;
        const int normalizedEnd = end < 0 || end > m_values.size() ? m_values.size() : end;
        for (int i = normalizedStart; i < normalizedEnd; ++i) {
            out->push(m_values.at(i));
        }
        return out;
    }

    QString valuesLiteral() const
    {
        return QStringLiteral("[") + m_values.join(QStringLiteral(", ")) + QStringLiteral("]");
    }
    std::string valuesLiteralJs() const { return valuesLiteral().toStdString(); }

    QHTMLArrayNode *cloneArray() const
    {
        return new QHTMLArrayNode(valuesLiteral());
    }

    static QStringList splitTopLevel(const QString &source)
    {
        QStringList out;
        QString current;
        int depth = 0;
        QChar quote;
        bool escape = false;
        for (const QChar ch : source) {
            if (!quote.isNull()) {
                current += ch;
                if (escape) {
                    escape = false;
                } else if (ch == QLatin1Char('\\')) {
                    escape = true;
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
            if (ch == QLatin1Char('[') || ch == QLatin1Char('{') || ch == QLatin1Char('(')) {
                ++depth;
            } else if (ch == QLatin1Char(']') || ch == QLatin1Char('}') || ch == QLatin1Char(')')) {
                --depth;
            }
            if (ch == QLatin1Char(',') && depth == 0) {
                const QString value = current.trimmed();
                if (!value.isEmpty()) {
                    out.append(value);
                }
                current.clear();
            } else {
                current += ch;
            }
        }
        const QString value = current.trimmed();
        if (!value.isEmpty()) {
            out.append(value);
        }
        return out;
    }

private:
    static QString arrayInner(QString literal)
    {
        literal = literal.trimmed();
        if (literal.startsWith(QLatin1Char('[')) && literal.endsWith(QLatin1Char(']')) && literal.size() >= 2) {
            return literal.mid(1, literal.size() - 2);
        }
        return literal;
    }

    QStringList m_values;
};

class QHTMLMapNode final : public QHTMLNode
{
public:
    explicit QHTMLMapNode(const QString &literal = QString())
        : QHTMLNode(QStringLiteral("QHTMLMapNode"), QStringLiteral("map"))
    {
        parseLiteral(literal);
    }

    QString value(const QString &key) const { return m_values.value(key); }
    std::string valueJs(const std::string &key) const { return value(QString::fromStdString(key)).toStdString(); }

    void setValue(const QString &key, const QString &value)
    {
        if (!key.trimmed().isEmpty()) {
            m_values.insert(key.trimmed(), value.trimmed());
        }
    }
    void setValueJs(const std::string &key, const std::string &value)
    {
        setValue(QString::fromStdString(key), QString::fromStdString(value));
    }

    bool remove(const QString &key) { return m_values.remove(key) > 0; }
    bool removeJs(const std::string &key) { return remove(QString::fromStdString(key)); }

    QString keysLiteral() const { return m_values.keys().join(QStringLiteral(", ")); }
    std::string keysLiteralJs() const { return keysLiteral().toStdString(); }

    QString valuesLiteral() const
    {
        QStringList parts;
        const QStringList keys = m_values.keys();
        for (const QString &key : keys) {
            parts.append(key + QStringLiteral(": ") + m_values.value(key));
        }
        return QStringLiteral("{") + parts.join(QStringLiteral(", ")) + QStringLiteral("}");
    }
    std::string valuesLiteralJs() const { return valuesLiteral().toStdString(); }

    QHTMLMapNode *cloneMap() const
    {
        return new QHTMLMapNode(valuesLiteral());
    }

private:
    void parseLiteral(QString literal)
    {
        literal = literal.trimmed();
        if (literal.startsWith(QLatin1Char('{')) && literal.endsWith(QLatin1Char('}'))) {
            literal = literal.mid(1, literal.size() - 2);
        }
        for (const QString &entry : QHTMLArrayNode::splitTopLevel(literal)) {
            const int colon = entry.indexOf(QLatin1Char(':'));
            if (colon <= 0) {
                continue;
            }
            QString key = entry.left(colon).trimmed();
            if ((key.startsWith(QLatin1Char('"')) && key.endsWith(QLatin1Char('"'))) ||
                (key.startsWith(QLatin1Char('\'')) && key.endsWith(QLatin1Char('\'')))) {
                key = key.mid(1, key.size() - 2);
            }
            setValue(key, entry.mid(colon + 1).trimmed());
        }
    }

    QHash<QString, QString> m_values;
};

class QHTMLProperty final : public QHTMLTypedNode
{
public:
    explicit QHTMLProperty(const QString &name = QString(),
                           const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-property"), name, attributes),
          m_value(attributes.value(QStringLiteral("value")))
    {
        setQHTMLType(QStringLiteral("QHTMLProperty"));
        setProperty(QStringLiteral("kind"), QStringLiteral("property"));
        m_valueNode = createValueNode(m_value);
    }

    ~QHTMLProperty() override { delete m_valueNode; }

    QString value() const { return m_value; }
    std::string valueJs() const { return m_value.toStdString(); }
    void setValue(const QString &value)
    {
        m_value = value;
        delete m_valueNode;
        m_valueNode = createValueNode(m_value);
    }
    void setValueJs(const std::string &value) { setValue(QString::fromStdString(value)); }
    QString structuredType() const { return m_valueNode ? m_valueNode->qhtmlType() : QString(); }
    std::string structuredTypeJs() const { return structuredType().toStdString(); }
    QHTMLNode *structuredValue() const { return m_valueNode; }
    QHTMLNode *structuredValueJs() const { return m_valueNode; }

    QHTMLProperty *cloneProperty() const
    {
        QHash<QString, QString> clonedAttributes = attributes();
        clonedAttributes.insert(QStringLiteral("value"), m_value);
        return new QHTMLProperty(qhtmlName(), clonedAttributes);
    }

    QString renderHtml() const override { return QString(); }

private:
    static QHTMLNode *createValueNode(QString value)
    {
        value = value.trimmed();
        if (value.startsWith(QLatin1Char('[')) && value.endsWith(QLatin1Char(']'))) {
            return new QHTMLArrayNode(value);
        }
        if (value.startsWith(QLatin1Char('{')) && value.endsWith(QLatin1Char('}'))) {
            return new QHTMLMapNode(value);
        }
        return nullptr;
    }

    QString m_value;
    QHTMLNode *m_valueNode = nullptr;
};

class QHTMLEventHandler final : public QHTMLTypedNode
{
public:
    explicit QHTMLEventHandler(const QString &eventName = QString(),
                               const QHash<QString, QString> &attributes = {},
                               const QString &body = QString())
        : QHTMLTypedNode(QStringLiteral("q-event-handler"), eventName.toLower(), attributes),
          m_eventName(eventName.toLower()),
          m_parameters(QHTMLFunction::parseParameters(attributes.value(QStringLiteral("parameters")))),
          m_body(body.trimmed())
    {
        setQHTMLType(QStringLiteral("QHTMLEventHandler"));
        setProperty(QStringLiteral("kind"), QStringLiteral("event-handler"));
    }

    QString eventName() const { return m_eventName; }
    std::string eventNameJs() const { return m_eventName.toStdString(); }

    QStringList parameters() const { return m_parameters; }
    QString parameterList() const { return m_parameters.join(QStringLiteral(", ")); }
    std::string parameterListJs() const { return parameterList().toStdString(); }

    QString body() const { return m_body; }
    std::string bodyJs() const { return m_body.toStdString(); }

    QHTMLEventHandler *cloneEventHandler() const
    {
        QHash<QString, QString> clonedAttributes = attributes();
        clonedAttributes.insert(QStringLiteral("parameters"), parameterList());
        return new QHTMLEventHandler(m_eventName, clonedAttributes, m_body);
    }

    QString renderHtml() const override { return QString(); }

private:
    QString m_eventName;
    QStringList m_parameters;
    QString m_body;
};

class QHTMLStyle final : public QHTMLTypedNode
{
public:
    explicit QHTMLStyle(const QString &name = QString(),
                        const QHash<QString, QString> &attributes = {},
                        const QString &body = QString())
        : QHTMLTypedNode(QStringLiteral("q-style"), name, attributes),
          m_body(body.trimmed())
    {
        setQHTMLType(QStringLiteral("QHTMLStyle"));
        setProperty(QStringLiteral("kind"), QStringLiteral("style"));
    }

    QString body() const { return m_body; }
    std::string bodyJs() const { return m_body.toStdString(); }
    void setBody(const QString &body) { m_body = body.trimmed(); }
    void setBodyJs(const std::string &body) { setBody(QString::fromStdString(body)); }
    void setCssTextJs(const std::string &body) { setBody(QString::fromStdString(body)); }

    QString classList() const
    {
        QStringList classes;
        QRegularExpression rx(QStringLiteral("q-style-class\\s*\\{([^}]*)\\}"),
                              QRegularExpression::DotMatchesEverythingOption);
        QRegularExpressionMatchIterator it = rx.globalMatch(m_body);
        while (it.hasNext()) {
            const QRegularExpressionMatch match = it.next();
            for (const QString &className : match.captured(1).split(QRegularExpression(QStringLiteral("\\s+")),
                                                                    Qt::SkipEmptyParts)) {
                classes.append(className.trimmed());
            }
        }
        classes.removeDuplicates();
        return classes.join(QLatin1Char(' '));
    }
    std::string classListJs() const { return classList().toStdString(); }

    QString cssText() const
    {
        QString out = m_body;
        QRegularExpression rx(QStringLiteral("q-style-class\\s*\\{[^}]*\\}"),
                              QRegularExpression::DotMatchesEverythingOption);
        out.remove(rx);
        return out.trimmed();
    }
    std::string cssTextJs() const { return cssText().toStdString(); }

    QString renderHtml() const override { return QString(); }
    QHTMLStyle *cloneStyle() const { return new QHTMLStyle(qhtmlName(), attributes(), m_body); }

private:
    QString m_body;
};

class QHTMLTheme final : public QHTMLTypedNode
{
public:
    explicit QHTMLTheme(const QString &keyword = QStringLiteral("q-theme"),
                        const QString &name = QString(),
                        const QHash<QString, QString> &attributes = {},
                        const QString &body = QString())
        : QHTMLTypedNode(keyword, name, attributes),
          m_body(body.trimmed()),
          m_defaultTheme(keyword == QStringLiteral("q-default-theme"))
    {
        setQHTMLType(QStringLiteral("QHTMLTheme"));
        setProperty(QStringLiteral("kind"), m_defaultTheme ? QStringLiteral("default-theme") : QStringLiteral("theme"));
    }

    QString body() const { return m_body; }
    std::string bodyJs() const { return m_body.toStdString(); }
    void setBody(const QString &body) { m_body = body.trimmed(); }
    void setBodyJs(const std::string &body) { setBody(QString::fromStdString(body)); }
    bool isDefaultTheme() const { return m_defaultTheme; }

    QString renderHtml() const override { return QString(); }
    QHTMLTheme *cloneTheme() const { return new QHTMLTheme(keyword(), qhtmlName(), attributes(), m_body); }

private:
    QString m_body;
    bool m_defaultTheme = false;
};

class QHTMLStyleApplication final : public QHTMLTypedNode
{
public:
    explicit QHTMLStyleApplication(QHTMLStyle *style = nullptr)
        : QHTMLTypedNode(QStringLiteral("q-style-application"), style ? style->qhtmlName() : QString())
    {
        setQHTMLType(QStringLiteral("QHTMLStyleApplication"));
        m_style = style;
        setProperty(QStringLiteral("kind"), QStringLiteral("style-application"));
    }

    QHTMLStyle *style() const { return m_style; }
    QHTMLStyle *styleJs() const { return m_style; }
    QString styleUUID() const { return m_style ? m_style->qhtmlUUID() : QString(); }
    std::string styleUUIDJs() const { return styleUUID().toStdString(); }

    QString renderHtml() const override
    {
        QString out = QStringLiteral("<q-style-application qhtml-style=\"") + escapeAttribute(qhtmlName()) +
                      QStringLiteral("\" qhtml-style-uuid=\"") + escapeAttribute(styleUUID()) +
                      QStringLiteral("\" qhtml-application=\"") + escapeAttribute(qhtmlUUID()) +
                      QStringLiteral("\">");
        out += QHTMLTypedNode::renderHtml();
        out += QStringLiteral("</q-style-application>");
        return out;
    }

private:
    QHTMLStyle *m_style = nullptr;
};

class QHTMLThemeApplication final : public QHTMLTypedNode
{
public:
    explicit QHTMLThemeApplication(QHTMLTheme *theme = nullptr)
        : QHTMLTypedNode(QStringLiteral("q-theme-application"), theme ? theme->qhtmlName() : QString())
    {
        setQHTMLType(QStringLiteral("QHTMLThemeApplication"));
        m_theme = theme;
        setProperty(QStringLiteral("kind"), QStringLiteral("theme-application"));
    }

    QHTMLTheme *theme() const { return m_theme; }
    QHTMLTheme *themeJs() const { return m_theme; }
    QString themeUUID() const { return m_theme ? m_theme->qhtmlUUID() : QString(); }
    std::string themeUUIDJs() const { return themeUUID().toStdString(); }

    QString renderHtml() const override
    {
        QString out = QStringLiteral("<q-theme-application qhtml-theme=\"") + escapeAttribute(qhtmlName()) +
                      QStringLiteral("\" qhtml-theme-uuid=\"") + escapeAttribute(themeUUID()) +
                      QStringLiteral("\" qhtml-application=\"") + escapeAttribute(qhtmlUUID()) +
                      QStringLiteral("\">");
        out += QHTMLTypedNode::renderHtml();
        out += QStringLiteral("</q-theme-application>");
        return out;
    }

private:
    QHTMLTheme *m_theme = nullptr;
};

class QHTMLSlot final : public QHTMLTypedNode
{
public:
    explicit QHTMLSlot(const QString &name = QString(),
                       const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("slot"), name, attributes)
    {
    }
};

class QHTMLClass final : public QHTMLTypedNode
{
public:
    explicit QHTMLClass(const QString &name = QString(),
                        const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-class"), name, attributes)
    {
    }
};

class QHTMLVar final : public QHTMLTypedNode
{
public:
    explicit QHTMLVar(const QString &name = QString(),
                      const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-var"), name, attributes)
    {
    }
};

class QHTMLArray final : public QHTMLTypedNode
{
public:
    explicit QHTMLArray(const QString &name = QString(),
                        const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-array"), name, attributes)
    {
    }
};

class QHTMLMap final : public QHTMLTypedNode
{
public:
    explicit QHTMLMap(const QString &name = QString(),
                      const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-map"), name, attributes)
    {
    }
};

class QHTMLTemplate final : public QHTMLTypedNode
{
public:
    explicit QHTMLTemplate(const QString &name = QString(),
                           const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-template"), name, attributes)
    {
    }
};

class QHTMLScript final : public QHTMLTypedNode
{
public:
    explicit QHTMLScript(const QString &name = QString(),
                         const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("script"), name, attributes)
    {
    }
};

class QHTMLModelView final : public QHTMLTypedNode
{
public:
    explicit QHTMLModelView(const QString &name = QString(),
                            const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-model-view"), name, attributes)
    {
    }
};

class QHTMLFactory final : public QHTMLTypedNode
{
public:
    explicit QHTMLFactory(const QString &name = QString(),
                          const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-factory"), name, attributes)
    {
    }
};

class QHTMLMethod final : public QHTMLTypedNode
{
public:
    explicit QHTMLMethod(const QString &name = QString(),
                         const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("function"), name, attributes)
    {
    }
};

class QHTMLSourceFragment final : public QHTMLTypedNode
{
public:
    explicit QHTMLSourceFragment(const QString &name = QString(),
                                 const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-source"), name, attributes)
    {
    }
};

class QHTMLDomTree final : public QHTMLDomNode
{
public:
    QHTMLDomTree()
        : QHTMLDomNode(QStringLiteral("QHTMLDomTree"), QStringLiteral("root"))
    {
        qhtmlSignalBus = new QHTMLSignalBus();
    }

    ~QHTMLDomTree() override { delete qhtmlSignalBus; }

    QHTMLSignalBus *qhtmlSignalBus = nullptr;

    void loadFromAST(QHTMLAstNode *astRoot);
    void clear() { clearChildren(); }
    QHTMLNode *root() { return this; }
    QHTMLNode *rootJs() { return this; }
    QHTMLSignalBus *signalBus() const { return qhtmlSignalBus; }
    QHTMLSignalBus *signalBusJs() const { return qhtmlSignalBus; }

private:
    void indexComponentDefinitions();
    void indexComponentDefinitionsFor(QHTMLNode *scope);
    void instantiateStyleThemeApplications();
    void instantiateStyleThemeApplicationsFor(QHTMLNode *scope);
    void instantiateComponents();
    void instantiateComponentsFor(QHTMLNode *scope);
    void bindComponentMembers();
    void bindComponentMembersFor(QHTMLNode *scope);
    void bindLocalReferences(QHTMLNode *scope);
    void cloneDefinitionMembers(QHTMLComponentInstance *instance);
    bool hasLocalReference(QHTMLNode *scope, const QString &name) const;
    QHTMLComponentDefinition *resolveComponentDefinition(QHTMLNode *scope, const QString &path) const;
    QHTMLStyle *resolveStyle(QHTMLNode *scope, const QString &path) const;
    QHTMLTheme *resolveTheme(QHTMLNode *scope, const QString &path) const;
    QHTMLNode *resolveDotPath(QHTMLNode *scope, const QString &path) const;
    QHTMLNode *componentInstanceFrom(QHTMLTypedNode *node, QHTMLComponentDefinition *definition) const;
    QHTMLNode *styleApplicationFrom(QHTMLDomElement *node, QHTMLStyle *style) const;
    QHTMLNode *themeApplicationFrom(QHTMLDomElement *node, QHTMLTheme *theme) const;
    static void moveChildren(QHTMLNode *from, QHTMLNode *to);
};
