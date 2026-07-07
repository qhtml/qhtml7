#pragma once

#include <QtCore/QHash>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QJsonParseError>
#include <QtCore/QJsonValue>
#include <QtCore/QList>
#include <QtCore/QObject>
#include <QtCore/QRegularExpression>
#include <QtCore/QSet>
#include <QtCore/QString>
#include <QtCore/QStringList>
#include <QtCore/QTimer>
#include <QtCore/QUuid>
#include <QtCore/QVector>

#include <string>

inline constexpr const char QHTML_VERSION[] = "v7.3.3";

inline std::string qhtmlVersionJs()
{
    return std::string(QHTML_VERSION);
}

class QHTMLAstNode;
class QHTMLFunction;
class QHTMLSignal;
class QHTMLSignalBus;
class QHTMLComponentSlot;
class QHTMLStyle;
class QHTMLTheme;
class QHTMLImportNode;
class QHTMLPainter;
class QHTMLCanvas;

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

    QHTMLNode *findDescendantByUUID(const QString &uuid) const
    {
        const QString wantedUUID = uuid.trimmed();
        if (wantedUUID.isEmpty()) {
            return nullptr;
        }
        for (QHTMLNode *child : children()) {
            if (!child) {
                continue;
            }
            if (child->qhtmlUUID() == wantedUUID) {
                return child;
            }
            if (QHTMLNode *found = child->findDescendantByUUID(wantedUUID)) {
                return found;
            }
        }
        return nullptr;
    }

    bool containsDescendantUUID(const QString &uuid) const
    {
        return findDescendantByUUID(uuid) != nullptr;
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

    virtual QString renderHtmlInContext(const QHTMLNode *contextNode) const
    {
        Q_UNUSED(contextNode);
        return renderHtml();
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
    QHash<QString, QString> attributes() const { return m_attributes; }

    QString renderHtml() const override
    {
        return renderHtmlForContext(nullptr);
    }

    QString renderHtmlInContext(const QHTMLNode *contextNode) const override
    {
        return renderHtmlForContext(contextNode);
    }

private:
    QString renderHtmlForContext(const QHTMLNode *contextNode) const
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
        out += QStringLiteral(" qhtml-node=\"") + escapeAttribute(qhtmlUUID()) + QStringLiteral("\"");
        out += QStringLiteral(">");
        for (QHTMLNode *child : children()) {
            out += contextNode ? child->renderHtmlInContext(contextNode) : child->renderHtml();
        }
        out += QStringLiteral("</") + m_tagName + QStringLiteral(">");
        return out;
    }

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

class QHTMLComponentSlot final : public QHTMLTypedNode
{
public:
    explicit QHTMLComponentSlot(const QString &name = QString(),
                                const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("slot"), name, attributes)
    {
        setQHTMLType(QStringLiteral("QHTMLComponentSlot"));
        setProperty(QStringLiteral("kind"), QStringLiteral("component-slot"));
    }

    QString renderHtml() const override { return QHTMLTypedNode::renderHtml(); }
    QHTMLComponentSlot *cloneSlot() const
    {
        QHTMLComponentSlot *cloned = new QHTMLComponentSlot(qhtmlName(), attributes());
        for (QHTMLNode *child : children()) {
            if (child) {
                cloned->appendChild(cloneRenderableNode(child));
            }
        }
        return cloned;
    }

private:
    static QHTMLNode *cloneRenderableNode(QHTMLNode *node)
    {
        if (!node) {
            return nullptr;
        }
        if (QHTMLTextFragment *text = dynamic_cast<QHTMLTextFragment *>(node)) {
            return new QHTMLTextFragment(text->value());
        }
        if (QHTMLHTMLFragment *html = dynamic_cast<QHTMLHTMLFragment *>(node)) {
            return new QHTMLHTMLFragment(html->value());
        }
        if (QHTMLUnknownFragment *unknown = dynamic_cast<QHTMLUnknownFragment *>(node)) {
            return new QHTMLUnknownFragment(unknown->value());
        }
        if (QHTMLDomElement *element = dynamic_cast<QHTMLDomElement *>(node)) {
            QHTMLDomElement *cloned = new QHTMLDomElement(element->tagName(), element->attributes());
            for (QHTMLNode *child : element->children()) {
                cloned->appendChild(cloneRenderableNode(child));
            }
            return cloned;
        }
        if (QHTMLComponentSlot *slot = dynamic_cast<QHTMLComponentSlot *>(node)) {
            return slot->cloneSlot();
        }
        QHTMLNode *cloned = new QHTMLNode(node->qhtmlType(), node->qhtmlName());
        for (QHTMLNode *child : node->children()) {
            cloned->appendChild(cloneRenderableNode(child));
        }
        return cloned;
    }
};

class QHTMLSlotDefault final : public QHTMLTypedNode
{
public:
    explicit QHTMLSlotDefault(const QString &name = QString(),
                              const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-slot-default"), name, attributes)
    {
        setQHTMLType(QStringLiteral("QHTMLSlotDefault"));
        setProperty(QStringLiteral("kind"), QStringLiteral("slot-default"));
    }

    QString renderHtml() const override { return QString(); }
};

class QHTMLPropertyAssignment final : public QHTMLTypedNode
{
public:
    explicit QHTMLPropertyAssignment(const QString &name = QString(),
                                     const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-property-assignment"), name, attributes),
          m_value(attributes.value(QStringLiteral("value")))
    {
        setQHTMLType(QStringLiteral("QHTMLPropertyAssignment"));
        setProperty(QStringLiteral("kind"), QStringLiteral("property-assignment"));
    }

    QString value() const { return m_value; }
    std::string valueJs() const { return m_value.toStdString(); }
    QHTMLPropertyAssignment *cloneAssignment() const
    {
        QHash<QString, QString> clonedAttributes = attributes();
        clonedAttributes.insert(QStringLiteral("value"), m_value);
        return new QHTMLPropertyAssignment(qhtmlName(), clonedAttributes);
    }
    QString renderHtml() const override { return QString(); }

private:
    QString m_value;
};

class QHTMLLayout : public QHTMLTypedNode
{
public:
    explicit QHTMLLayout(const QString &keyword = QStringLiteral("q-layout"),
                         const QString &name = QString(),
                         const QHash<QString, QString> &attributes = {},
                         const QString &direction = QStringLiteral("column"),
                         const QString &layoutType = QStringLiteral("QHTMLLayout"))
        : QHTMLTypedNode(keyword, name, attributes),
          m_direction(direction)
    {
        setQHTMLType(layoutType);
        setProperty(QStringLiteral("kind"), QStringLiteral("layout"));
        setProperty(QStringLiteral("direction"), m_direction);
    }

    QString direction() const { return m_direction; }
    std::string directionJs() const { return m_direction.toStdString(); }

    QString renderHtml() const override
    {
        return renderHtmlForContext(nullptr);
    }

    QString renderHtmlInContext(const QHTMLNode *contextNode) const override
    {
        return renderHtmlForContext(contextNode);
    }

private:
    QString renderHtmlForContext(const QHTMLNode *contextNode) const
    {
        QString out = QStringLiteral("<div qhtml-layout=\"") + escapeAttribute(keyword()) +
                      QStringLiteral("\" qhtml-node=\"") + escapeAttribute(qhtmlUUID()) +
                      QStringLiteral("\" class=\"") + escapeAttribute(layoutClass()) +
                      QStringLiteral("\" style=\"") + escapeAttribute(layoutStyle()) +
                      QStringLiteral("\">");
        out += renderLayoutChildren(contextNode);
        out += QStringLiteral("</div>");
        return out;
    }

protected:
    QString layoutClass() const
    {
        if (m_direction == QStringLiteral("row")) {
            return QStringLiteral("qhtml-layout qhtml-layout-row");
        }
        if (m_direction == QStringLiteral("column") && keyword() == QStringLiteral("q-col")) {
            return QStringLiteral("qhtml-layout qhtml-layout-col");
        }
        return QStringLiteral("qhtml-layout");
    }

    QString assignmentValue(const QString &name, const QString &fallback = QString()) const
    {
        const QString lowerName = name.toLower();
        for (QHTMLNode *child : children()) {
            QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child);
            if (!assignment) {
                continue;
            }
            if (assignment->qhtmlName().toLower() == lowerName) {
                return cssValue(assignment->value());
            }
        }
        return fallback;
    }

    QString layoutStyle() const
    {
        QStringList declarations;
        declarations << QStringLiteral("display:flex");
        declarations << QStringLiteral("flex-direction:") + m_direction;
        declarations << QStringLiteral("box-sizing:border-box");
        declarations << QStringLiteral("min-width:0");
        declarations << QStringLiteral("min-height:0");

        if (keyword() == QStringLiteral("q-layout")) {
            declarations << QStringLiteral("width:") + assignmentValue(QStringLiteral("width"), QStringLiteral("100%"));
            declarations << QStringLiteral("height:") + assignmentValue(QStringLiteral("height"), QStringLiteral("100%"));
        } else {
            declarations << QStringLiteral("flex:") + assignmentValue(QStringLiteral("flex"), QStringLiteral("1 1 0"));
            declarations << QStringLiteral("width:") + assignmentValue(QStringLiteral("width"), QStringLiteral("100%"));
            declarations << QStringLiteral("height:") + assignmentValue(QStringLiteral("height"), QStringLiteral("100%"));
        }

        appendOptionalDeclaration(declarations, QStringLiteral("gap"));
        appendOptionalDeclaration(declarations, QStringLiteral("align-items"), QStringLiteral("alignItems"));
        appendOptionalDeclaration(declarations, QStringLiteral("justify-content"), QStringLiteral("justifyContent"));
        appendOptionalDeclaration(declarations, QStringLiteral("overflow"));
        appendOptionalDeclaration(declarations, QStringLiteral("padding"));
        appendOptionalDeclaration(declarations, QStringLiteral("margin"));
        return declarations.join(QStringLiteral(";")) + QStringLiteral(";");
    }

    void appendOptionalDeclaration(QStringList &declarations,
                                   const QString &cssName,
                                   const QString &assignmentName = QString()) const
    {
        QString value = assignmentValue(assignmentName.isEmpty() ? cssName : assignmentName);
        if (value.isEmpty() && !assignmentName.isEmpty()) {
            value = assignmentValue(cssName);
        }
        if (!value.isEmpty()) {
            declarations << cssName + QStringLiteral(":") + value;
        }
    }

    QString itemStyle() const
    {
        return QStringLiteral("flex:1 1 0;min-width:0;min-height:0;box-sizing:border-box;");
    }

    QString renderLayoutChildren(const QHTMLNode *contextNode) const
    {
        QString out;
        for (QHTMLNode *child : children()) {
            if (!child || isRuntimeLayoutChild(child)) {
                continue;
            }
            if (isLayoutNode(child)) {
                out += child->renderHtmlInContext(contextNode);
            } else {
                out += QStringLiteral("<div qhtml-layout-item=\"1\" class=\"qhtml-layout-item\" style=\"") +
                       escapeAttribute(itemStyle()) + QStringLiteral("\">") +
                       child->renderHtmlInContext(contextNode) +
                       QStringLiteral("</div>");
            }
        }
        return out;
    }

    static QString cssValue(QString value)
    {
        value = value.trimmed();
        if (value.size() >= 2) {
            const QChar first = value.at(0);
            const QChar last = value.at(value.size() - 1);
            if ((first == QLatin1Char('"') && last == QLatin1Char('"')) ||
                (first == QLatin1Char('\'') && last == QLatin1Char('\'')) ||
                (first == QLatin1Char('`') && last == QLatin1Char('`'))) {
                return value.mid(1, value.size() - 2);
            }
        }
        return value;
    }

    static bool isLayoutNode(QHTMLNode *node)
    {
        if (!node) {
            return false;
        }
        const QString type = node->qhtmlType();
        return type == QStringLiteral("QHTMLLayout") ||
               type == QStringLiteral("QHTMLRowLayout") ||
               type == QStringLiteral("QHTMLColumnLayout");
    }

    static bool isRuntimeLayoutChild(QHTMLNode *node)
    {
        if (!node) {
            return true;
        }
        const QString type = node->qhtmlType();
        return type == QStringLiteral("QHTMLPropertyAssignment") ||
               type == QStringLiteral("QHTMLProperty") ||
               type == QStringLiteral("QHTMLFunction") ||
               type == QStringLiteral("QHTMLSignal") ||
               type == QStringLiteral("QHTMLEventHandler") ||
               type == QStringLiteral("QHTMLConnect") ||
               type == QStringLiteral("QHTMLStyle") ||
               type == QStringLiteral("QHTMLTheme") ||
               type == QStringLiteral("QHTMLImportNode");
    }

private:
    QString m_direction;
};

class QHTMLRowLayout final : public QHTMLLayout
{
public:
    explicit QHTMLRowLayout(const QString &name = QString(),
                            const QHash<QString, QString> &attributes = {})
        : QHTMLLayout(QStringLiteral("q-row"),
                      name,
                      attributes,
                      QStringLiteral("row"),
                      QStringLiteral("QHTMLRowLayout"))
    {
        setProperty(QStringLiteral("kind"), QStringLiteral("row-layout"));
    }
};

class QHTMLColumnLayout final : public QHTMLLayout
{
public:
    explicit QHTMLColumnLayout(const QString &name = QString(),
                               const QHash<QString, QString> &attributes = {})
        : QHTMLLayout(QStringLiteral("q-col"),
                      name,
                      attributes,
                      QStringLiteral("column"),
                      QStringLiteral("QHTMLColumnLayout"))
    {
        setProperty(QStringLiteral("kind"), QStringLiteral("column-layout"));
    }
};

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

    QStringList extendsList() const
    {
        QString value = attributes().value(QStringLiteral("extends")).trimmed();
        if (value.isEmpty()) {
            return {};
        }
        value.replace(QLatin1Char(','), QLatin1Char(' '));
        return value.split(QRegularExpression(QStringLiteral("\\s+")), Qt::SkipEmptyParts);
    }

    std::string extendsListJs() const
    {
        return extendsList().join(QStringLiteral(", ")).toStdString();
    }

    bool hasExtends() const { return !extendsList().isEmpty(); }
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

    int slotCount() const { return collectSlots().size(); }

    QHTMLComponentSlot *slotAt(int index) const
    {
        const QVector<QHTMLComponentSlot *> localSlots = collectSlots();
        return index >= 0 && index < localSlots.size() ? localSlots.at(index) : nullptr;
    }

    QHTMLComponentSlot *slot(const QString &name) const
    {
        for (QHTMLComponentSlot *componentSlot : collectSlots()) {
            if (componentSlot && componentSlot->qhtmlName() == name) {
                return componentSlot;
            }
        }
        return nullptr;
    }

    QHTMLComponentSlot *slotJs(const std::string &name) const
    {
        return slot(QString::fromStdString(name));
    }

    QString slotNames() const
    {
        QStringList names;
        for (QHTMLComponentSlot *componentSlot : collectSlots()) {
            if (componentSlot && !componentSlot->qhtmlName().isEmpty()) {
                names.append(componentSlot->qhtmlName());
            }
        }
        names.removeDuplicates();
        return names.join(QStringLiteral(", "));
    }
    std::string slotNamesJs() const { return slotNames().toStdString(); }

    QString findChildComponentsOfType(const QString &componentType) const
    {
        const QString wantedType = componentType.trimmed();
        QJsonArray records;
        if (wantedType.isEmpty()) {
            return QStringLiteral("[]");
        }

        for (QHTMLNode *child : children()) {
            QHTMLComponentInstance *component = dynamic_cast<QHTMLComponentInstance *>(child);
            if (!component || !component->definition()) {
                continue;
            }
            if (component->definition()->qhtmlName() != wantedType &&
                component->keyword() != wantedType &&
                component->qhtmlName() != wantedType) {
                continue;
            }

            QJsonObject record;
            record.insert(QStringLiteral("type"), component->definition()->qhtmlName());
            record.insert(QStringLiteral("id"), component->qhtmlUUID());
            record.insert(QStringLiteral("name"), component->slotPlainText(QStringLiteral("name")));
            record.insert(QStringLiteral("label"), component->slotPlainText(QStringLiteral("name")));
            record.insert(QStringLiteral("body"), component->slotHtml(QStringLiteral("body"), QStringLiteral("content")));
            record.insert(QStringLiteral("content"), component->slotHtml(QStringLiteral("content"), QStringLiteral("body")));
            records.append(record);
        }

        return QString::fromUtf8(QJsonDocument(records).toJson(QJsonDocument::Compact));
    }

    std::string findChildComponentsOfTypeJs(const std::string &componentType) const
    {
        return findChildComponentsOfType(QString::fromStdString(componentType)).toStdString();
    }

private:
    class SlotRenderContext
    {
    public:
        SlotRenderContext withInstance(const QHTMLComponentInstance *instance) const
        {
            SlotRenderContext copy(*this);
            if (instance) {
                copy.m_stack.append(instance);
            }
            return copy;
        }

        const QHTMLComponentInstance *instanceForDefinitionUUID(const QString &definitionUUID) const
        {
            if (definitionUUID.isEmpty()) {
                return nullptr;
            }
            for (int i = m_stack.size() - 1; i >= 0; --i) {
                const QHTMLComponentInstance *candidate = m_stack.at(i);
                if (candidate && candidate->componentDefinitionUUID() == definitionUUID) {
                    return candidate;
                }
            }
            return nullptr;
        }

    private:
        QVector<const QHTMLComponentInstance *> m_stack;
    };

public:
    QString renderHtml() const override
    {
        SlotRenderContext context;
        return renderHtmlWithContext(context);
    }

private:
    QString renderHtmlWithContext(const SlotRenderContext &context) const
    {
        if (!m_definition) {
            return QHTMLTypedNode::renderHtml();
        }

        const QString tagName = m_definition->qhtmlName().trimmed();
        const SlotRenderContext localContext = context.withInstance(this);
        if (tagName.isEmpty()) {
            return renderTemplateWithSlots(localContext) + renderUnslottedInstanceChildren(localContext);
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
        const QHash<QString, QString> assignedAttributes = attributeAssignments();
        const QStringList assignedKeys = assignedAttributes.keys();
        for (const QString &key : assignedKeys) {
            const QString value = assignedAttributes.value(key);
            out += QStringLiteral(" ") + key + QStringLiteral("=\"") + escapeAttribute(value) + QStringLiteral("\"");
        }
        out += QStringLiteral(" component-definition=\"") + escapeAttribute(m_definition->qhtmlUUID()) + QStringLiteral("\"");
        out += QStringLiteral(" component-instance=\"") + escapeAttribute(qhtmlUUID()) + QStringLiteral("\"");
        out += QStringLiteral(">");
        out += renderTemplateWithSlots(localContext);
        out += renderUnslottedInstanceChildren(localContext);
        out += QStringLiteral("</") + tagName + QStringLiteral(">");
        return out;
    }

    QVector<QHTMLComponentSlot *> collectSlots() const
    {
        QVector<QHTMLComponentSlot *> out;
        collectSlotsFor(m_definition, m_definition, out);
        return out;
    }

    static void collectSlotsFor(QHTMLNode *node,
                                QHTMLComponentDefinition *ownerDefinition,
                                QVector<QHTMLComponentSlot *> &out)
    {
        if (!node || !ownerDefinition) {
            return;
        }
        if (node != ownerDefinition && dynamic_cast<QHTMLComponentDefinition *>(node)) {
            return;
        }
        if (QHTMLComponentSlot *componentSlot = dynamic_cast<QHTMLComponentSlot *>(node)) {
            if (componentDefinitionOwnsNode(ownerDefinition, componentSlot)) {
                out.append(componentSlot);
            }
        }
        for (QHTMLNode *child : node->children()) {
            collectSlotsFor(child, ownerDefinition, out);
        }
    }

    QSet<QString> slotNameSet() const
    {
        QSet<QString> names;
        for (QHTMLComponentSlot *componentSlot : collectSlots()) {
            if (componentSlot && !componentSlot->qhtmlName().isEmpty()) {
                names.insert(componentSlot->qhtmlName());
            }
        }
        return names;
    }

    bool definitionHasProperty(const QString &name) const
    {
        return definitionHasPropertyIn(m_definition, name);
    }

    static bool definitionHasPropertyIn(QHTMLNode *node, const QString &name)
    {
        if (!node || name.isEmpty()) {
            return false;
        }
        if (node->qhtmlType() == QStringLiteral("QHTMLProperty") && node->qhtmlName() == name) {
            return true;
        }
        for (QHTMLNode *child : node->children()) {
            if (definitionHasPropertyIn(child, name)) {
                return true;
            }
        }
        return false;
    }

    QHash<QString, QString> attributeAssignments() const
    {
        QHash<QString, QString> out;
        for (QHTMLNode *child : children()) {
            QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child);
            if (!assignment || assignment->qhtmlName().isEmpty()) {
                continue;
            }
            if (definitionHasProperty(assignment->qhtmlName())) {
                continue;
            }
            out.insert(assignment->qhtmlName(), htmlAttributeValue(assignment->value()));
        }
        return out;
    }

    static QString htmlAttributeValue(QString value)
    {
        value = value.trimmed();
        if (value.size() >= 2) {
            const QChar first = value.at(0);
            const QChar last = value.at(value.size() - 1);
            if ((first == QLatin1Char('"') && last == QLatin1Char('"')) ||
                (first == QLatin1Char('\'') && last == QLatin1Char('\'')) ||
                (first == QLatin1Char('`') && last == QLatin1Char('`'))) {
                return value.mid(1, value.size() - 2);
            }
        }
        return value;
    }

    QString renderTemplateWithSlots(const SlotRenderContext &context) const
    {
        return renderChildrenWithSlots(m_definition, context);
    }

    QString renderChildrenWithSlots(QHTMLNode *node, const SlotRenderContext &context) const
    {
        QString out;
        if (!node) {
            return out;
        }
        for (QHTMLNode *child : node->children()) {
            out += renderNodeWithSlots(child, context);
        }
        return out;
    }

    QString renderNodeWithSlots(QHTMLNode *node, const SlotRenderContext &context) const
    {
        if (!node) {
            return QString();
        }

        if (QHTMLComponentSlot *componentSlot = dynamic_cast<QHTMLComponentSlot *>(node)) {
            return renderSlot(componentSlot, context);
        }
        if (dynamic_cast<QHTMLSlotDefault *>(node)) {
            return QString();
        }
        if (isRuntimeInstanceChild(node)) {
            return QString();
        }
        if (QHTMLDomElement *element = dynamic_cast<QHTMLDomElement *>(node)) {
            QString out = QStringLiteral("<") + element->tagName();
            const QHash<QString, QString> localAttributes = element->attributes();
            const QStringList keys = localAttributes.keys();
            for (const QString &key : keys) {
                const QString value = localAttributes.value(key);
                if (!value.isEmpty()) {
                    out += QStringLiteral(" ") + key + QStringLiteral("=\"") + escapeAttribute(value) + QStringLiteral("\"");
                }
            }
            out += QStringLiteral(" qhtml-node=\"") + escapeAttribute(element->qhtmlUUID()) + QStringLiteral("\"");
            out += QStringLiteral(">");
            out += renderChildrenWithSlots(element, context);
            out += QStringLiteral("</") + element->tagName() + QStringLiteral(">");
            return out;
        }

        if (QHTMLTextFragment *text = dynamic_cast<QHTMLTextFragment *>(node)) {
            return escapeText(interpolateInstanceText(text->value()));
        }
        if (QHTMLHTMLFragment *html = dynamic_cast<QHTMLHTMLFragment *>(node)) {
            return interpolateInstanceText(html->value());
        }
        if (QHTMLUnknownFragment *unknown = dynamic_cast<QHTMLUnknownFragment *>(node)) {
            return escapeText(interpolateInstanceText(unknown->value()));
        }

        if (node->qhtmlType() == QStringLiteral("QHTMLForNode")) {
            return node->renderHtmlInContext(this);
        }

        if (node->qhtmlType() == QStringLiteral("QHTMLLayout") ||
            node->qhtmlType() == QStringLiteral("QHTMLRowLayout") ||
            node->qhtmlType() == QStringLiteral("QHTMLColumnLayout")) {
            return node->renderHtmlInContext(this);
        }

        if (QHTMLComponentInstance *componentInstance = dynamic_cast<QHTMLComponentInstance *>(node)) {
            return componentInstance->renderHtmlWithContext(context);
        }

        if (node->qhtmlType() == QStringLiteral("QHTMLStyleApplication")) {
            QString out = QStringLiteral("<q-style-application qhtml-style=\"") + escapeAttribute(node->qhtmlName()) +
                          QStringLiteral("\" qhtml-application=\"") + escapeAttribute(node->qhtmlUUID()) +
                          QStringLiteral("\">");
            out += renderChildrenWithSlots(node, context);
            out += QStringLiteral("</q-style-application>");
            return out;
        }

        if (node->qhtmlType() == QStringLiteral("QHTMLThemeApplication")) {
            QString out = QStringLiteral("<q-theme-application qhtml-theme=\"") + escapeAttribute(node->qhtmlName()) +
                          QStringLiteral("\" qhtml-application=\"") + escapeAttribute(node->qhtmlUUID()) +
                          QStringLiteral("\">");
            out += renderChildrenWithSlots(node, context);
            out += QStringLiteral("</q-theme-application>");
            return out;
        }

        return renderChildrenWithSlots(node, context);
    }

    QString renderSlot(QHTMLComponentSlot *componentSlot, const SlotRenderContext &context) const
    {
        if (!componentSlot) {
            return QString();
        }

        const QString ownerDefinitionUUID = componentSlotOwnerDefinitionUUID(componentSlot);
        const QString currentDefinitionUUID = componentDefinitionUUID();
        if (!ownerDefinitionUUID.isEmpty() && ownerDefinitionUUID != currentDefinitionUUID) {
            const QHTMLComponentInstance *ownerInstance = context.instanceForDefinitionUUID(ownerDefinitionUUID);
            if (ownerInstance && ownerInstance != this) {
                return ownerInstance->renderOwnedSlot(componentSlot, context);
            }
        }
        return renderOwnedSlot(componentSlot, context);
    }

    QString renderOwnedSlot(QHTMLComponentSlot *componentSlot, const SlotRenderContext &context) const
    {
        if (!componentSlot) {
            return QString();
        }
        const QVector<QHTMLComponentSlot *> ownedSlots = collectSlots();
        if (ownedSlots.size() == 1) {
            const QString implicitContent = renderSingleSlotInstanceChildren(componentSlot->qhtmlName(), context);
            if (!implicitContent.isEmpty()) {
                return implicitContent;
            }
        } else {
            if (QHTMLNode *overrideNode = slotOverride(componentSlot->qhtmlName())) {
                return renderChildrenWithSlots(overrideNode, context);
            }
        }
        if (componentSlot->childCount() > 0) {
            return renderChildrenWithSlots(componentSlot, context);
        }
        if (QHTMLSlotDefault *slotDefault = defaultForSlot(componentSlot->qhtmlName())) {
            return renderChildrenWithSlots(slotDefault, context);
        }
        return QString();
    }

    QHTMLNode *slotOverride(const QString &name) const
    {
        if (name.isEmpty()) {
            return nullptr;
        }
        for (QHTMLNode *child : children()) {
            if (child && child->qhtmlName() == name) {
                return child;
            }
        }
        return nullptr;
    }

    QString renderSingleSlotInstanceChildren(const QString &slotName, const SlotRenderContext &context) const
    {
        QString out;
        for (QHTMLNode *child : children()) {
            if (!child || !isRenderableInstanceChild(child)) {
                continue;
            }
            if (child->qhtmlName() == slotName) {
                out += renderChildrenWithSlots(child, context);
            } else {
                out += renderNodeWithSlots(child, context);
            }
        }
        return out;
    }

    QHTMLSlotDefault *defaultForSlot(const QString &name) const
    {
        return defaultForSlotIn(m_definition, m_definition, name);
    }

    static QHTMLSlotDefault *defaultForSlotIn(QHTMLNode *node,
                                              QHTMLComponentDefinition *ownerDefinition,
                                              const QString &name)
    {
        if (!node || !ownerDefinition) {
            return nullptr;
        }
        if (node != ownerDefinition && dynamic_cast<QHTMLComponentDefinition *>(node)) {
            return nullptr;
        }
        if (QHTMLSlotDefault *slotDefault = dynamic_cast<QHTMLSlotDefault *>(node)) {
            if (slotDefault->qhtmlName() == name && componentDefinitionOwnsNode(ownerDefinition, slotDefault)) {
                return slotDefault;
            }
        }
        for (QHTMLNode *child : node->children()) {
            if (QHTMLSlotDefault *found = defaultForSlotIn(child, ownerDefinition, name)) {
                return found;
            }
        }
        return nullptr;
    }

    static QHTMLNode *rootNodeFor(QHTMLNode *node)
    {
        if (!node) {
            return nullptr;
        }
        QHTMLNode *root = node;
        while (root->parent()) {
            root = root->parent();
        }
        return root;
    }

    static bool findOwningDefinitionIn(QHTMLNode *node,
                                       const QString &targetUUID,
                                       QHTMLComponentDefinition **ownerDefinition)
    {
        if (!node || targetUUID.isEmpty()) {
            return false;
        }

        bool containsTarget = node->qhtmlUUID() == targetUUID;
        for (QHTMLNode *child : node->children()) {
            if (findOwningDefinitionIn(child, targetUUID, ownerDefinition)) {
                containsTarget = true;
            }
        }

        if (containsTarget && ownerDefinition && !*ownerDefinition) {
            if (QHTMLComponentDefinition *definition = dynamic_cast<QHTMLComponentDefinition *>(node)) {
                *ownerDefinition = definition;
            }
        }
        return containsTarget;
    }

    static QHTMLComponentDefinition *componentDefinitionOwningNode(QHTMLNode *node)
    {
        if (!node) {
            return nullptr;
        }
        QHTMLNode *root = rootNodeFor(node);
        if (!root) {
            return nullptr;
        }
        QHTMLComponentDefinition *ownerDefinition = nullptr;
        findOwningDefinitionIn(root, node->qhtmlUUID(), &ownerDefinition);
        return ownerDefinition;
    }

    static bool componentDefinitionOwnsNode(QHTMLComponentDefinition *definition, QHTMLNode *node)
    {
        if (!definition || !node) {
            return false;
        }
        return componentDefinitionOwningNode(node) == definition;
    }

    static QString componentSlotOwnerDefinitionUUID(QHTMLComponentSlot *componentSlot)
    {
        QHTMLComponentDefinition *ownerDefinition = componentDefinitionOwningNode(componentSlot);
        return ownerDefinition ? ownerDefinition->qhtmlUUID() : QString();
    }

    static bool isRuntimeInstanceChild(QHTMLNode *child)
    {
        if (!child) {
            return true;
        }
        const QString type = child->qhtmlType();
        return type == QStringLiteral("QHTMLFunction") ||
               type == QStringLiteral("QHTMLSignal") ||
               type == QStringLiteral("QHTMLProperty") ||
               type == QStringLiteral("QHTMLEventHandler") ||
               type == QStringLiteral("QHTMLConnect") ||
               type == QStringLiteral("QHTMLPropertyAssignment") ||
               type == QStringLiteral("QHTMLTimer") ||
               type == QStringLiteral("QHTMLPropertyAnimation") ||
               type == QStringLiteral("QHTMLImportNode") ||
               type == QStringLiteral("QHTMLStyle") ||
               type == QStringLiteral("QHTMLTheme") ||
               type == QStringLiteral("QHTMLClass") ||
               type == QStringLiteral("QHTMLComponentSlot") ||
               type == QStringLiteral("QHTMLSlotDefault");
    }

    static bool isRenderableInstanceChild(QHTMLNode *child)
    {
        return child && !isRuntimeInstanceChild(child);
    }

    QString renderUnslottedInstanceChildren(const SlotRenderContext &context) const
    {
        QString out;
        if (truthyValue(propertyValueForName(QStringLiteral("suppressUnslottedChildren")))) {
            return out;
        }
        if (collectSlots().size() == 1) {
            return out;
        }
        const QSet<QString> slotNames = slotNameSet();
        for (QHTMLNode *child : children()) {
            if (!child) {
                continue;
            }
            if (slotNames.contains(child->qhtmlName())) {
                continue;
            }
            if (!isRenderableInstanceChild(child)) {
                continue;
            }
            out += renderNodeWithSlots(child, context);
        }
        return out;
    }

    QString slotHtml(const QString &primaryName, const QString &fallbackName = QString()) const
    {
        SlotRenderContext context;
        context = context.withInstance(this);
        if (QHTMLNode *primary = slotOverride(primaryName)) {
            return renderChildrenWithSlots(primary, context);
        }
        if (!fallbackName.isEmpty()) {
            if (QHTMLNode *fallback = slotOverride(fallbackName)) {
                return renderChildrenWithSlots(fallback, context);
            }
        }
        return QString();
    }

    QString slotPlainText(const QString &primaryName, const QString &fallbackName = QString()) const
    {
        if (QHTMLNode *primary = slotOverride(primaryName)) {
            return plainTextForNode(primary).trimmed();
        }
        if (!fallbackName.isEmpty()) {
            if (QHTMLNode *fallback = slotOverride(fallbackName)) {
                return plainTextForNode(fallback).trimmed();
            }
        }
        const QString label = propertyValueForName(QStringLiteral("label")).trimmed();
        if (!label.isEmpty()) {
            return label;
        }
        return qhtmlName();
    }

    static QString plainTextForNode(QHTMLNode *node)
    {
        if (!node) {
            return QString();
        }
        if (QHTMLTextFragment *text = dynamic_cast<QHTMLTextFragment *>(node)) {
            return text->value();
        }
        if (QHTMLHTMLFragment *html = dynamic_cast<QHTMLHTMLFragment *>(node)) {
            return html->value().remove(QRegularExpression(QStringLiteral("<[^>]*>")));
        }
        if (QHTMLUnknownFragment *unknown = dynamic_cast<QHTMLUnknownFragment *>(node)) {
            return unknown->value();
        }
        QString out;
        for (QHTMLNode *child : node->children()) {
            out += plainTextForNode(child);
        }
        return out;
    }

    static bool truthyValue(QString value)
    {
        value = htmlAttributeValue(value).trimmed().toLower();
        return value == QStringLiteral("1") ||
               value == QStringLiteral("true") ||
               value == QStringLiteral("yes") ||
               value == QStringLiteral("on");
    }

    QString interpolateInstanceText(QString value) const
    {
        static const QRegularExpression rx(QStringLiteral("\\$\\{\\s*([^}]+?)\\s*\\}"));
        QRegularExpressionMatchIterator it = rx.globalMatch(value);
        int offset = 0;
        while (it.hasNext()) {
            const QRegularExpressionMatch match = it.next();
            const QString replacement = resolveInterpolationValue(match.captured(1).trimmed());
            value.replace(match.capturedStart(0) + offset, match.capturedLength(0), replacement);
            offset += replacement.size() - match.capturedLength(0);
        }
        return value;
    }

    QString resolveInterpolationValue(QString expression) const
    {
        expression = expression.trimmed();
        if (expression.startsWith(QStringLiteral("this."))) {
            expression = expression.mid(5).trimmed();
        }
        const int dot = expression.indexOf(QLatin1Char('.'));
        if (dot > 0) {
            expression = expression.left(dot).trimmed();
        }
        return propertyValueForName(expression);
    }

    QString propertyValueForName(const QString &name) const
    {
        if (name.isEmpty()) {
            return QString();
        }
        const QVector<QHTMLNode *> localChildren = children();
        for (int i = localChildren.size() - 1; i >= 0; --i) {
            QHTMLNode *child = localChildren.at(i);
            if (!child || child->qhtmlName() != name) {
                continue;
            }
            if (child->qhtmlType() == QStringLiteral("QHTMLProperty")) {
                if (QHTMLTypedNode *typed = dynamic_cast<QHTMLTypedNode *>(child)) {
                    return htmlAttributeValue(typed->attributes().value(QStringLiteral("value")));
                }
            }
            if (QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child)) {
                return htmlAttributeValue(assignment->value());
            }
        }
        for (QHTMLNode *child : children()) {
            if (!child || child->qhtmlName() != name || child->qhtmlType() != QStringLiteral("QHTMLProperty")) {
                continue;
            }
            if (QHTMLTypedNode *typed = dynamic_cast<QHTMLTypedNode *>(child)) {
                return htmlAttributeValue(typed->attributes().value(QStringLiteral("value")));
            }
        }
        return QString();
    }

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

class QHTMLJsonArray;
class QHTMLJsonObject;
class QHTMLJsonDocument;

class QHTMLJsonTools final
{
public:
    static QString toStrictJson(QString literal)
    {
        literal = literal.trimmed();
        if (literal.startsWith(QLatin1Char('[')) && literal.endsWith(QLatin1Char(']'))) {
            QStringList values;
            for (const QString &value : QHTMLArrayNode::splitTopLevel(literal.mid(1, literal.size() - 2))) {
                values.append(toStrictJson(value));
            }
            return QStringLiteral("[") + values.join(QStringLiteral(",")) + QStringLiteral("]");
        }
        if (literal.startsWith(QLatin1Char('{')) && literal.endsWith(QLatin1Char('}'))) {
            QStringList entries;
            for (const QString &entry : QHTMLArrayNode::splitTopLevel(literal.mid(1, literal.size() - 2))) {
                const int colon = topLevelColonIndex(entry);
                if (colon <= 0) {
                    continue;
                }
                const QString key = normalizeObjectKey(entry.left(colon));
                const QString value = toStrictJson(entry.mid(colon + 1));
                entries.append(jsonString(key) + QStringLiteral(":") + value);
            }
            return QStringLiteral("{") + entries.join(QStringLiteral(",")) + QStringLiteral("}");
        }
        if (isQuoted(literal)) {
            return jsonString(stripQuotes(literal));
        }
        const QString lower = literal.toLower();
        if (lower == QStringLiteral("true") ||
            lower == QStringLiteral("false") ||
            lower == QStringLiteral("null")) {
            return lower;
        }
        if (isNumber(literal)) {
            return literal;
        }
        return jsonString(literal);
    }

    static QJsonDocument parseDocument(const QString &literal, QString *errorMessage = nullptr)
    {
        QJsonParseError parseError;
        const QString json = toStrictJson(literal);
        QJsonDocument document = QJsonDocument::fromJson(json.toUtf8(), &parseError);
        if (errorMessage) {
            *errorMessage = parseError.error == QJsonParseError::NoError
                                ? QString()
                                : parseError.errorString();
        }
        return document;
    }

    static QJsonValue parseValue(const QString &literal, QString *errorMessage = nullptr)
    {
        const QString json = toStrictJson(literal);
        if (json.startsWith(QLatin1Char('[')) || json.startsWith(QLatin1Char('{'))) {
            QJsonDocument document = parseDocument(json, errorMessage);
            if (document.isArray()) {
                return QJsonValue(document.array());
            }
            if (document.isObject()) {
                return QJsonValue(document.object());
            }
            return QJsonValue();
        }

        QJsonParseError parseError;
        QJsonDocument document = QJsonDocument::fromJson((QStringLiteral("[") + json + QStringLiteral("]")).toUtf8(), &parseError);
        if (errorMessage) {
            *errorMessage = parseError.error == QJsonParseError::NoError
                                ? QString()
                                : parseError.errorString();
        }
        return document.isArray() && !document.array().isEmpty() ? document.array().at(0) : QJsonValue();
    }

    static QString documentToJson(const QJsonDocument &document)
    {
        return QString::fromUtf8(document.toJson(QJsonDocument::Compact));
    }

    static QString valueToJson(const QJsonValue &value)
    {
        QJsonArray wrapper;
        wrapper.append(value);
        const QString json = QString::fromUtf8(QJsonDocument(wrapper).toJson(QJsonDocument::Compact));
        return json.size() >= 2 ? json.mid(1, json.size() - 2) : QString();
    }

    static QString valueToString(const QJsonValue &value)
    {
        if (value.isString()) {
            return value.toString();
        }
        if (value.isDouble()) {
            return QString::number(value.toDouble(), 'g', 15);
        }
        if (value.isBool()) {
            return value.toBool() ? QStringLiteral("true") : QStringLiteral("false");
        }
        if (value.isNull()) {
            return QStringLiteral("null");
        }
        if (value.isUndefined()) {
            return QString();
        }
        return valueToJson(value);
    }

    static QString typeName(const QJsonValue &value)
    {
        if (value.isArray()) {
            return QStringLiteral("array");
        }
        if (value.isObject()) {
            return QStringLiteral("object");
        }
        if (value.isString()) {
            return QStringLiteral("string");
        }
        if (value.isDouble()) {
            return QStringLiteral("number");
        }
        if (value.isBool()) {
            return QStringLiteral("bool");
        }
        if (value.isNull()) {
            return QStringLiteral("null");
        }
        return QStringLiteral("undefined");
    }

    static QStringList arrayValues(const QJsonArray &array)
    {
        QStringList out;
        for (const QJsonValue &value : array) {
            out.append(value.isArray() || value.isObject() ? valueToJson(value) : valueToString(value));
        }
        return out;
    }

    static QJsonValue valueAtPath(QJsonValue current, const QString &path)
    {
        for (const QString &part : path.split(QLatin1Char('.'), Qt::SkipEmptyParts)) {
            if (current.isObject()) {
                current = current.toObject().value(part);
                continue;
            }
            if (current.isArray()) {
                bool ok = false;
                const int index = part.toInt(&ok);
                current = ok ? current.toArray().at(index) : QJsonValue(QJsonValue::Undefined);
                continue;
            }
            return QJsonValue(QJsonValue::Undefined);
        }
        return current;
    }

private:
    static bool isQuoted(const QString &value)
    {
        if (value.size() < 2) {
            return false;
        }
        const QChar first = value.at(0);
        const QChar last = value.at(value.size() - 1);
        return (first == QLatin1Char('"') && last == QLatin1Char('"')) ||
               (first == QLatin1Char('\'') && last == QLatin1Char('\'')) ||
               (first == QLatin1Char('`') && last == QLatin1Char('`'));
    }

    static QString stripQuotes(QString value)
    {
        value = value.trimmed();
        return isQuoted(value) ? value.mid(1, value.size() - 2) : value;
    }

    static QString jsonString(const QString &value)
    {
        QJsonArray wrapper;
        wrapper.append(value);
        const QString json = QString::fromUtf8(QJsonDocument(wrapper).toJson(QJsonDocument::Compact));
        return json.size() >= 2 ? json.mid(1, json.size() - 2) : QStringLiteral("\"\"");
    }

    static QString normalizeObjectKey(QString key)
    {
        key = key.trimmed();
        return stripQuotes(key);
    }

    static bool isNumber(const QString &value)
    {
        static const QRegularExpression rx(QStringLiteral("^-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+\\-]?[0-9]+)?$"));
        return rx.match(value.trimmed()).hasMatch();
    }

    static int topLevelColonIndex(const QString &source)
    {
        int depth = 0;
        QChar quote;
        bool escape = false;
        for (int i = 0; i < source.size(); ++i) {
            const QChar ch = source.at(i);
            if (!quote.isNull()) {
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
                continue;
            }
            if (ch == QLatin1Char('[') || ch == QLatin1Char('{') || ch == QLatin1Char('(')) {
                ++depth;
                continue;
            }
            if (ch == QLatin1Char(']') || ch == QLatin1Char('}') || ch == QLatin1Char(')')) {
                --depth;
                continue;
            }
            if (ch == QLatin1Char(':') && depth == 0) {
                return i;
            }
        }
        return -1;
    }
};

class QHTMLJsonValue final : public QHTMLNode
{
public:
    explicit QHTMLJsonValue(const QJsonValue &value = QJsonValue())
        : QHTMLNode(QStringLiteral("QHTMLJsonValue"), QStringLiteral("value")),
          m_value(value)
    {
        setProperty(QStringLiteral("kind"), QStringLiteral("json-value"));
    }

    explicit QHTMLJsonValue(const QString &literal)
        : QHTMLJsonValue(QHTMLJsonTools::parseValue(literal))
    {
    }

    QJsonValue value() const { return m_value; }
    QString typeName() const { return QHTMLJsonTools::typeName(m_value); }
    std::string typeNameJs() const { return typeName().toStdString(); }
    bool isArray() const { return m_value.isArray(); }
    bool isObject() const { return m_value.isObject(); }
    bool isString() const { return m_value.isString(); }
    bool isNumber() const { return m_value.isDouble(); }
    bool isBool() const { return m_value.isBool(); }
    bool isNull() const { return m_value.isNull(); }
    bool isUndefined() const { return m_value.isUndefined(); }
    QString toStringValue() const { return QHTMLJsonTools::valueToString(m_value); }
    std::string toStringValueJs() const { return toStringValue().toStdString(); }
    double toNumber(double fallback = 0.0) const { return m_value.isDouble() ? m_value.toDouble() : fallback; }
    bool toBool(bool fallback = false) const { return m_value.isBool() ? m_value.toBool() : fallback; }
    QString toJson() const { return QHTMLJsonTools::valueToJson(m_value); }
    std::string toJsonJs() const { return toJson().toStdString(); }
    QHTMLJsonArray *array() const;
    QHTMLJsonArray *arrayJs() const;
    QHTMLJsonObject *object() const;
    QHTMLJsonObject *objectJs() const;
    QHTMLJsonValue *valueAtPath(const QString &path) const
    {
        return new QHTMLJsonValue(QHTMLJsonTools::valueAtPath(m_value, path));
    }
    QHTMLJsonValue *valueAtPathJs(const std::string &path) const { return valueAtPath(QString::fromStdString(path)); }
    QString stringAtPath(const QString &path) const
    {
        return QHTMLJsonTools::valueToString(QHTMLJsonTools::valueAtPath(m_value, path));
    }
    std::string stringAtPathJs(const std::string &path) const { return stringAtPath(QString::fromStdString(path)).toStdString(); }

private:
    QJsonValue m_value;
};

class QHTMLJsonArray final : public QHTMLNode
{
public:
    explicit QHTMLJsonArray(const QJsonArray &array = QJsonArray())
        : QHTMLNode(QStringLiteral("QHTMLJsonArray"), QStringLiteral("array")),
          m_array(array)
    {
        setProperty(QStringLiteral("kind"), QStringLiteral("json-array"));
    }

    explicit QHTMLJsonArray(const QString &literal)
        : QHTMLJsonArray(QHTMLJsonTools::parseValue(literal).toArray())
    {
    }

    QJsonArray array() const { return m_array; }
    int size() const { return m_array.size(); }
    QHTMLJsonValue *atJson(int index) const
    {
        return new QHTMLJsonValue(index >= 0 && index < m_array.size()
                                      ? m_array.at(index)
                                      : QJsonValue(QJsonValue::Undefined));
    }
    QString at(int index) const
    {
        return index >= 0 && index < m_array.size() ? QHTMLJsonTools::valueToString(m_array.at(index)) : QString();
    }
    std::string atJs(int index) const { return at(index).toStdString(); }
    void push(const QString &value) { m_array.append(QHTMLJsonTools::parseValue(value)); }
    void pushJs(const std::string &value) { push(QString::fromStdString(value)); }
    QString pop()
    {
        if (m_array.isEmpty()) {
            return QString();
        }
        const QString value = QHTMLJsonTools::valueToString(m_array.at(m_array.size() - 1));
        m_array.removeAt(m_array.size() - 1);
        return value;
    }
    std::string popJs() { return pop().toStdString(); }
    void unshift(const QString &value) { m_array.insert(0, QHTMLJsonTools::parseValue(value)); }
    void unshiftJs(const std::string &value) { unshift(QString::fromStdString(value)); }
    QString shift()
    {
        if (m_array.isEmpty()) {
            return QString();
        }
        const QString value = QHTMLJsonTools::valueToString(m_array.at(0));
        m_array.removeAt(0);
        return value;
    }
    std::string shiftJs() { return shift().toStdString(); }
    QHTMLJsonArray *slice(int start, int end) const
    {
        QJsonArray out;
        const int normalizedStart = start < 0 ? 0 : start;
        const int normalizedEnd = end < 0 || end > m_array.size() ? m_array.size() : end;
        for (int i = normalizedStart; i < normalizedEnd; ++i) {
            out.append(m_array.at(i));
        }
        return new QHTMLJsonArray(out);
    }
    QString valuesLiteral() const { return QHTMLJsonTools::valueToJson(QJsonValue(m_array)); }
    std::string valuesLiteralJs() const { return valuesLiteral().toStdString(); }
    QStringList values() const { return QHTMLJsonTools::arrayValues(m_array); }
    QHTMLJsonArray *cloneArray() const { return new QHTMLJsonArray(m_array); }

private:
    QJsonArray m_array;
};

class QHTMLJsonObject final : public QHTMLNode
{
public:
    explicit QHTMLJsonObject(const QJsonObject &object = QJsonObject())
        : QHTMLNode(QStringLiteral("QHTMLJsonObject"), QStringLiteral("object")),
          m_object(object)
    {
        setProperty(QStringLiteral("kind"), QStringLiteral("json-object"));
    }

    explicit QHTMLJsonObject(const QString &literal)
        : QHTMLJsonObject(QHTMLJsonTools::parseValue(literal).toObject())
    {
    }

    QJsonObject object() const { return m_object; }
    int size() const { return m_object.size(); }
    bool contains(const QString &key) const { return m_object.contains(key); }
    bool containsJs(const std::string &key) const { return contains(QString::fromStdString(key)); }
    QHTMLJsonValue *jsonValue(const QString &key) const { return new QHTMLJsonValue(m_object.value(key)); }
    QHTMLJsonValue *jsonValueJs(const std::string &key) const { return jsonValue(QString::fromStdString(key)); }
    QString value(const QString &key) const { return QHTMLJsonTools::valueToString(m_object.value(key)); }
    std::string valueJs(const std::string &key) const { return value(QString::fromStdString(key)).toStdString(); }
    QString valueAtPath(const QString &path) const
    {
        return QHTMLJsonTools::valueToString(QHTMLJsonTools::valueAtPath(QJsonValue(m_object), path));
    }
    std::string valueAtPathJs(const std::string &path) const { return valueAtPath(QString::fromStdString(path)).toStdString(); }
    void setValue(const QString &key, const QString &value)
    {
        if (!key.trimmed().isEmpty()) {
            m_object.insert(key.trimmed(), QHTMLJsonTools::parseValue(value));
        }
    }
    void setValueJs(const std::string &key, const std::string &value)
    {
        setValue(QString::fromStdString(key), QString::fromStdString(value));
    }
    bool remove(const QString &key)
    {
        const bool existed = m_object.contains(key);
        m_object.remove(key);
        return existed;
    }
    bool removeJs(const std::string &key) { return remove(QString::fromStdString(key)); }
    QString keysLiteral() const { return m_object.keys().join(QStringLiteral(", ")); }
    std::string keysLiteralJs() const { return keysLiteral().toStdString(); }
    QString valuesLiteral() const { return QHTMLJsonTools::valueToJson(QJsonValue(m_object)); }
    std::string valuesLiteralJs() const { return valuesLiteral().toStdString(); }
    QHTMLJsonObject *cloneObject() const { return new QHTMLJsonObject(m_object); }

private:
    QJsonObject m_object;
};

class QHTMLJsonDocument final : public QHTMLNode
{
public:
    explicit QHTMLJsonDocument(const QString &literal = QString())
        : QHTMLNode(QStringLiteral("QHTMLJsonDocument"), QStringLiteral("json"))
    {
        setProperty(QStringLiteral("kind"), QStringLiteral("json-document"));
        parse(literal);
    }

    explicit QHTMLJsonDocument(const QJsonDocument &document)
        : QHTMLNode(QStringLiteral("QHTMLJsonDocument"), QStringLiteral("json")),
          m_document(document)
    {
        setProperty(QStringLiteral("kind"), QStringLiteral("json-document"));
        m_jsonText = QHTMLJsonTools::documentToJson(m_document);
    }

    void parse(const QString &literal)
    {
        m_document = QHTMLJsonTools::parseDocument(literal, &m_parseError);
        m_jsonText = QHTMLJsonTools::documentToJson(m_document);
    }
    void parseJs(const std::string &literal) { parse(QString::fromStdString(literal)); }
    bool isArray() const { return m_document.isArray(); }
    bool isObject() const { return m_document.isObject(); }
    bool isEmpty() const { return m_document.isEmpty(); }
    QString parseError() const { return m_parseError; }
    std::string parseErrorJs() const { return parseError().toStdString(); }
    int size() const
    {
        if (m_document.isArray()) {
            return m_document.array().size();
        }
        if (m_document.isObject()) {
            return m_document.object().size();
        }
        return 0;
    }
    QHTMLJsonValue *rootValue() const
    {
        if (m_document.isArray()) {
            return new QHTMLJsonValue(QJsonValue(m_document.array()));
        }
        if (m_document.isObject()) {
            return new QHTMLJsonValue(QJsonValue(m_document.object()));
        }
        return new QHTMLJsonValue(QJsonValue(QJsonValue::Undefined));
    }
    QHTMLJsonValue *rootValueJs() const { return rootValue(); }
    QHTMLJsonArray *array() const { return new QHTMLJsonArray(m_document.array()); }
    QHTMLJsonArray *arrayJs() const { return array(); }
    QHTMLJsonObject *object() const { return new QHTMLJsonObject(m_document.object()); }
    QHTMLJsonObject *objectJs() const { return object(); }
    QString valueAtPath(const QString &path) const
    {
        QJsonValue root;
        if (m_document.isArray()) {
            root = QJsonValue(m_document.array());
        } else if (m_document.isObject()) {
            root = QJsonValue(m_document.object());
        }
        return QHTMLJsonTools::valueToString(QHTMLJsonTools::valueAtPath(root, path));
    }
    std::string valueAtPathJs(const std::string &path) const { return valueAtPath(QString::fromStdString(path)).toStdString(); }
    QStringList arrayValues() const { return m_document.isArray() ? QHTMLJsonTools::arrayValues(m_document.array()) : QStringList(); }
    QString valuesLiteral() const { return m_jsonText; }
    std::string valuesLiteralJs() const { return valuesLiteral().toStdString(); }
    QString toJson() const { return m_jsonText; }
    std::string toJsonJs() const { return toJson().toStdString(); }
    QHTMLJsonDocument *cloneDocument() const { return new QHTMLJsonDocument(m_document); }

private:
    QJsonDocument m_document;
    QString m_jsonText;
    QString m_parseError;
};

inline QHTMLJsonArray *QHTMLJsonValue::array() const
{
    return new QHTMLJsonArray(m_value.toArray());
}

inline QHTMLJsonArray *QHTMLJsonValue::arrayJs() const
{
    return array();
}

inline QHTMLJsonObject *QHTMLJsonValue::object() const
{
    return new QHTMLJsonObject(m_value.toObject());
}

inline QHTMLJsonObject *QHTMLJsonValue::objectJs() const
{
    return object();
}


class QHTMLArray final : public QHTMLTypedNode
{
public:
    explicit QHTMLArray(const QString &name = QString(),
                        const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-array"), name, attributes)
    {
        setQHTMLType(QStringLiteral("QHTMLArray"));
        setProperty(QStringLiteral("kind"), QStringLiteral("array"));
    }

    QJsonArray jsonArray() const;
    QHTMLJsonArray *arrayValue() const;
    QHTMLJsonArray *arrayValueJs() const;
    QHTMLJsonDocument *jsonDocument() const;
    QHTMLJsonDocument *jsonDocumentJs() const;
    QString valuesLiteral() const;
    std::string valuesLiteralJs() const { return valuesLiteral().toStdString(); }
    QHTMLArray *cloneArrayBlock() const;
    QString renderHtml() const override { return QString(); }

    static QJsonArray jsonArrayFromChildren(const QHTMLNode *scope);
};

class QHTMLMap final : public QHTMLTypedNode
{
public:
    explicit QHTMLMap(const QString &name = QString(),
                      const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-map"), name, attributes)
    {
        setQHTMLType(QStringLiteral("QHTMLMap"));
        setProperty(QStringLiteral("kind"), QStringLiteral("map"));
    }

    QJsonObject jsonObject() const;
    QHTMLJsonObject *objectValue() const;
    QHTMLJsonObject *objectValueJs() const;
    QHTMLJsonDocument *jsonDocument() const;
    QHTMLJsonDocument *jsonDocumentJs() const;
    QString value(const QString &key) const;
    std::string valueJs(const std::string &key) const { return value(QString::fromStdString(key)).toStdString(); }
    QString keysLiteral() const;
    std::string keysLiteralJs() const { return keysLiteral().toStdString(); }
    QString valuesLiteral() const;
    std::string valuesLiteralJs() const { return valuesLiteral().toStdString(); }
    QHTMLMap *cloneMapBlock() const;
    QString renderHtml() const override { return QString(); }

    static QJsonObject jsonObjectFromChildren(const QHTMLNode *scope);
};

class QHTMLModel final : public QHTMLTypedNode
{
public:
    explicit QHTMLModel(const QString &name = QString(),
                        const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-model"), name, attributes)
    {
        setQHTMLType(QStringLiteral("QHTMLModel"));
        setProperty(QStringLiteral("kind"), QStringLiteral("model"));
    }

    QJsonValue jsonValue() const;
    QHTMLJsonDocument *jsonDocument() const;
    QHTMLJsonDocument *jsonDocumentJs() const { return jsonDocument(); }
    QString valuesLiteral() const;
    std::string valuesLiteralJs() const { return valuesLiteral().toStdString(); }
    QHTMLModel *cloneModelBlock() const;
    QString renderHtml() const override { return QString(); }
};

inline QString qhtmlLegacyStripTrailingSeparators(QString value)
{
    value = value.trimmed();
    while (!value.isEmpty() && (value.endsWith(QLatin1Char(',')) || value.endsWith(QLatin1Char(';')))) {
        value.chop(1);
        value = value.trimmed();
    }
    return value;
}

inline QString qhtmlLegacyStripQuotes(QString value)
{
    value = value.trimmed();
    if (value.size() >= 2) {
        const QChar first = value.at(0);
        const QChar last = value.at(value.size() - 1);
        if ((first == QLatin1Char('"') && last == QLatin1Char('"')) ||
            (first == QLatin1Char('\'') && last == QLatin1Char('\'')) ||
            (first == QLatin1Char('`') && last == QLatin1Char('`'))) {
            return value.mid(1, value.size() - 2);
        }
    }
    return value;
}

inline int qhtmlLegacyTopLevelColonIndex(const QString &source)
{
    int depth = 0;
    QChar quote;
    bool escape = false;
    for (int i = 0; i < source.size(); ++i) {
        const QChar ch = source.at(i);
        if (!quote.isNull()) {
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
            continue;
        }
        if (ch == QLatin1Char('[') || ch == QLatin1Char('{') || ch == QLatin1Char('(')) {
            ++depth;
            continue;
        }
        if (ch == QLatin1Char(']') || ch == QLatin1Char('}') || ch == QLatin1Char(')')) {
            if (depth > 0) {
                --depth;
            }
            continue;
        }
        if (ch == QLatin1Char(':') && depth == 0) {
            return i;
        }
    }
    return -1;
}

inline QJsonValue qhtmlLegacyParseJsonValue(QString value)
{
    value = qhtmlLegacyStripTrailingSeparators(value);
    if (value.isEmpty()) {
        return QJsonValue(QString());
    }
    return QHTMLJsonTools::parseValue(value);
}

inline void qhtmlLegacyAppendArrayItemsFromSource(QJsonArray &array, QString source)
{
    source = qhtmlLegacyStripTrailingSeparators(source);
    if (source.isEmpty()) {
        return;
    }
    for (QString value : QHTMLArrayNode::splitTopLevel(source)) {
        value = qhtmlLegacyStripTrailingSeparators(value);
        if (!value.isEmpty()) {
            array.append(qhtmlLegacyParseJsonValue(value));
        }
    }
}

inline void qhtmlLegacyAppendMapEntriesFromSource(QJsonObject &object, QString source)
{
    source = qhtmlLegacyStripTrailingSeparators(source);
    if (source.isEmpty()) {
        return;
    }
    for (QString entry : QHTMLArrayNode::splitTopLevel(source)) {
        entry = qhtmlLegacyStripTrailingSeparators(entry);
        if (entry.isEmpty()) {
            continue;
        }
        const int colon = qhtmlLegacyTopLevelColonIndex(entry);
        if (colon <= 0) {
            continue;
        }
        const QString key = qhtmlLegacyStripQuotes(entry.left(colon));
        if (key.trimmed().isEmpty()) {
            continue;
        }
        object.insert(key.trimmed(), qhtmlLegacyParseJsonValue(entry.mid(colon + 1)));
    }
}

inline QHTMLNode *qhtmlLegacyCloneDataChild(QHTMLNode *child)
{
    if (!child) {
        return nullptr;
    }
    if (QHTMLArray *array = dynamic_cast<QHTMLArray *>(child)) {
        return array->cloneArrayBlock();
    }
    if (QHTMLMap *map = dynamic_cast<QHTMLMap *>(child)) {
        return map->cloneMapBlock();
    }
    if (QHTMLModel *model = dynamic_cast<QHTMLModel *>(child)) {
        return model->cloneModelBlock();
    }
    if (QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child)) {
        return assignment->cloneAssignment();
    }
    if (QHTMLTextFragment *text = dynamic_cast<QHTMLTextFragment *>(child)) {
        return new QHTMLTextFragment(text->value());
    }
    if (QHTMLHTMLFragment *html = dynamic_cast<QHTMLHTMLFragment *>(child)) {
        return new QHTMLHTMLFragment(html->value());
    }
    if (QHTMLUnknownFragment *unknown = dynamic_cast<QHTMLUnknownFragment *>(child)) {
        return new QHTMLUnknownFragment(unknown->value());
    }
    if (QHTMLDomElement *element = dynamic_cast<QHTMLDomElement *>(child)) {
        QHTMLDomElement *cloned = new QHTMLDomElement(element->tagName(), element->attributes());
        for (QHTMLNode *nested : element->children()) {
            if (QHTMLNode *nestedClone = qhtmlLegacyCloneDataChild(nested)) {
                cloned->appendChild(nestedClone);
            }
        }
        return cloned;
    }
    return nullptr;
}

inline QJsonArray QHTMLArray::jsonArrayFromChildren(const QHTMLNode *scope)
{
    QJsonArray array;
    if (!scope) {
        return array;
    }
    for (QHTMLNode *child : scope->children()) {
        if (!child) {
            continue;
        }
        if (QHTMLArray *nestedArray = dynamic_cast<QHTMLArray *>(child)) {
            array.append(QJsonValue(nestedArray->jsonArray()));
            continue;
        }
        if (QHTMLMap *nestedMap = dynamic_cast<QHTMLMap *>(child)) {
            array.append(QJsonValue(nestedMap->jsonObject()));
            continue;
        }
        if (QHTMLModel *model = dynamic_cast<QHTMLModel *>(child)) {
            array.append(model->jsonValue());
            continue;
        }
        if (QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child)) {
            qhtmlLegacyAppendArrayItemsFromSource(array, assignment->value());
            continue;
        }
        if (QHTMLTextFragment *text = dynamic_cast<QHTMLTextFragment *>(child)) {
            qhtmlLegacyAppendArrayItemsFromSource(array, text->value());
            continue;
        }
        if (QHTMLHTMLFragment *html = dynamic_cast<QHTMLHTMLFragment *>(child)) {
            qhtmlLegacyAppendArrayItemsFromSource(array, html->value());
            continue;
        }
        if (QHTMLUnknownFragment *unknown = dynamic_cast<QHTMLUnknownFragment *>(child)) {
            qhtmlLegacyAppendArrayItemsFromSource(array, unknown->value());
            continue;
        }
    }
    return array;
}

inline QJsonArray QHTMLArray::jsonArray() const
{
    return jsonArrayFromChildren(this);
}

inline QHTMLJsonArray *QHTMLArray::arrayValue() const
{
    return new QHTMLJsonArray(jsonArray());
}

inline QHTMLJsonArray *QHTMLArray::arrayValueJs() const
{
    return arrayValue();
}

inline QHTMLJsonDocument *QHTMLArray::jsonDocument() const
{
    return new QHTMLJsonDocument(QJsonDocument(jsonArray()));
}

inline QHTMLJsonDocument *QHTMLArray::jsonDocumentJs() const
{
    return jsonDocument();
}

inline QString QHTMLArray::valuesLiteral() const
{
    return QHTMLJsonTools::valueToJson(QJsonValue(jsonArray()));
}

inline QHTMLArray *QHTMLArray::cloneArrayBlock() const
{
    QHTMLArray *cloned = new QHTMLArray(qhtmlName(), attributes());
    for (QHTMLNode *child : children()) {
        if (QHTMLNode *childClone = qhtmlLegacyCloneDataChild(child)) {
            cloned->appendChild(childClone);
        }
    }
    return cloned;
}

inline QJsonObject QHTMLMap::jsonObjectFromChildren(const QHTMLNode *scope)
{
    QJsonObject object;
    if (!scope) {
        return object;
    }
    for (QHTMLNode *child : scope->children()) {
        if (!child) {
            continue;
        }
        if (QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child)) {
            qhtmlLegacyAppendMapEntriesFromSource(object, assignment->qhtmlName() + QStringLiteral(": ") + assignment->value());
            continue;
        }
        if (QHTMLArray *nestedArray = dynamic_cast<QHTMLArray *>(child)) {
            if (!nestedArray->qhtmlName().trimmed().isEmpty()) {
                object.insert(nestedArray->qhtmlName().trimmed(), QJsonValue(nestedArray->jsonArray()));
            }
            continue;
        }
        if (QHTMLMap *nestedMap = dynamic_cast<QHTMLMap *>(child)) {
            if (!nestedMap->qhtmlName().trimmed().isEmpty()) {
                object.insert(nestedMap->qhtmlName().trimmed(), QJsonValue(nestedMap->jsonObject()));
            }
            continue;
        }
        if (QHTMLModel *model = dynamic_cast<QHTMLModel *>(child)) {
            if (!model->qhtmlName().trimmed().isEmpty()) {
                object.insert(model->qhtmlName().trimmed(), model->jsonValue());
            }
            continue;
        }
        if (QHTMLTextFragment *text = dynamic_cast<QHTMLTextFragment *>(child)) {
            qhtmlLegacyAppendMapEntriesFromSource(object, text->value());
            continue;
        }
        if (QHTMLHTMLFragment *html = dynamic_cast<QHTMLHTMLFragment *>(child)) {
            qhtmlLegacyAppendMapEntriesFromSource(object, html->value());
            continue;
        }
        if (QHTMLUnknownFragment *unknown = dynamic_cast<QHTMLUnknownFragment *>(child)) {
            qhtmlLegacyAppendMapEntriesFromSource(object, unknown->value());
            continue;
        }
    }
    return object;
}

inline QJsonObject QHTMLMap::jsonObject() const
{
    return jsonObjectFromChildren(this);
}

inline QHTMLJsonObject *QHTMLMap::objectValue() const
{
    return new QHTMLJsonObject(jsonObject());
}

inline QHTMLJsonObject *QHTMLMap::objectValueJs() const
{
    return objectValue();
}

inline QHTMLJsonDocument *QHTMLMap::jsonDocument() const
{
    return new QHTMLJsonDocument(QJsonDocument(jsonObject()));
}

inline QHTMLJsonDocument *QHTMLMap::jsonDocumentJs() const
{
    return jsonDocument();
}

inline QString QHTMLMap::value(const QString &key) const
{
    return QHTMLJsonTools::valueToString(jsonObject().value(key));
}

inline QString QHTMLMap::keysLiteral() const
{
    return jsonObject().keys().join(QStringLiteral(", "));
}

inline QString QHTMLMap::valuesLiteral() const
{
    return QHTMLJsonTools::valueToJson(QJsonValue(jsonObject()));
}

inline QHTMLMap *QHTMLMap::cloneMapBlock() const
{
    QHTMLMap *cloned = new QHTMLMap(qhtmlName(), attributes());
    for (QHTMLNode *child : children()) {
        if (QHTMLNode *childClone = qhtmlLegacyCloneDataChild(child)) {
            cloned->appendChild(childClone);
        }
    }
    return cloned;
}

inline QJsonValue QHTMLModel::jsonValue() const
{
    QJsonObject objectFromAssignments;
    bool hasAssignments = false;
    QString literalSource;

    for (QHTMLNode *child : children()) {
        if (!child) {
            continue;
        }
        if (QHTMLArray *array = dynamic_cast<QHTMLArray *>(child)) {
            return QJsonValue(array->jsonArray());
        }
        if (QHTMLMap *map = dynamic_cast<QHTMLMap *>(child)) {
            return QJsonValue(map->jsonObject());
        }
        if (QHTMLModel *model = dynamic_cast<QHTMLModel *>(child)) {
            return model->jsonValue();
        }
        if (QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child)) {
            hasAssignments = true;
            qhtmlLegacyAppendMapEntriesFromSource(objectFromAssignments,
                                                 assignment->qhtmlName() + QStringLiteral(": ") + assignment->value());
            continue;
        }
        if (QHTMLTextFragment *text = dynamic_cast<QHTMLTextFragment *>(child)) {
            literalSource += text->value() + QLatin1Char('\n');
            continue;
        }
        if (QHTMLHTMLFragment *html = dynamic_cast<QHTMLHTMLFragment *>(child)) {
            literalSource += html->value() + QLatin1Char('\n');
            continue;
        }
        if (QHTMLUnknownFragment *unknown = dynamic_cast<QHTMLUnknownFragment *>(child)) {
            literalSource += unknown->value() + QLatin1Char('\n');
            continue;
        }
    }

    if (hasAssignments) {
        return QJsonValue(objectFromAssignments);
    }

    literalSource = qhtmlLegacyStripTrailingSeparators(literalSource);
    if (!literalSource.isEmpty()) {
        return qhtmlLegacyParseJsonValue(literalSource);
    }

    return QJsonValue(QJsonArray());
}

inline QHTMLJsonDocument *QHTMLModel::jsonDocument() const
{
    const QJsonValue root = jsonValue();
    if (root.isArray()) {
        return new QHTMLJsonDocument(QJsonDocument(root.toArray()));
    }
    if (root.isObject()) {
        return new QHTMLJsonDocument(QJsonDocument(root.toObject()));
    }
    QJsonArray wrapper;
    wrapper.append(root);
    return new QHTMLJsonDocument(QJsonDocument(wrapper));
}

inline QString QHTMLModel::valuesLiteral() const
{
    const QJsonValue root = jsonValue();
    return QHTMLJsonTools::valueToJson(root);
}

inline QHTMLModel *QHTMLModel::cloneModelBlock() const
{
    QHTMLModel *cloned = new QHTMLModel(qhtmlName(), attributes());
    for (QHTMLNode *child : children()) {
        if (QHTMLNode *childClone = qhtmlLegacyCloneDataChild(child)) {
            cloned->appendChild(childClone);
        }
    }
    return cloned;
}

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

    ~QHTMLProperty() override
    {
        delete m_valueNode;
        delete m_legacyValueNode;
    }

    QString value() const { return m_value; }
    std::string valueJs() const { return m_value.toStdString(); }
    void setValue(const QString &value)
    {
        m_value = value;
        setAttribute(QStringLiteral("value"), value);
        delete m_valueNode;
        delete m_legacyValueNode;
        m_legacyValueNode = nullptr;
        m_valueNode = createValueNode(m_value);
    }
    void setValueJs(const std::string &value) { setValue(QString::fromStdString(value)); }
    QString structuredType() const
    {
        QHTMLNode *node = structuredValue();
        return node ? node->qhtmlType() : QString();
    }
    std::string structuredTypeJs() const { return structuredType().toStdString(); }
    QHTMLNode *structuredValue() const
    {
        if (m_valueNode) {
            return m_valueNode;
        }
        return legacyStructuredValue();
    }
    QHTMLNode *structuredValueJs() const { return structuredValue(); }

    QHTMLProperty *cloneProperty() const
    {
        QHash<QString, QString> clonedAttributes = attributes();
        clonedAttributes.insert(QStringLiteral("value"), m_value);
        QHTMLProperty *cloned = new QHTMLProperty(qhtmlName(), clonedAttributes);
        for (QHTMLNode *child : children()) {
            if (QHTMLNode *childClone = qhtmlLegacyCloneDataChild(child)) {
                cloned->appendChild(childClone);
            }
        }
        return cloned;
    }

    QString renderHtml() const override { return QString(); }

private:
    static QHTMLNode *createValueNode(QString value)
    {
        value = value.trimmed();
        if (value.startsWith(QLatin1Char('[')) && value.endsWith(QLatin1Char(']'))) {
            return new QHTMLJsonDocument(value);
        }
        if (value.startsWith(QLatin1Char('{')) && value.endsWith(QLatin1Char('}'))) {
            return new QHTMLJsonDocument(value);
        }
        return nullptr;
    }

    QHTMLNode *legacyStructuredValue() const
    {
        const QString type = m_value.trimmed();
        if (type != QStringLiteral("q-array") &&
            type != QStringLiteral("q-map") &&
            type != QStringLiteral("q-model")) {
            return nullptr;
        }
        if (m_legacyValueNode) {
            return m_legacyValueNode;
        }
        if (type == QStringLiteral("q-array")) {
            m_legacyValueNode = new QHTMLJsonDocument(QJsonDocument(QHTMLArray::jsonArrayFromChildren(this)));
        } else if (type == QStringLiteral("q-map")) {
            m_legacyValueNode = new QHTMLJsonDocument(QJsonDocument(QHTMLMap::jsonObjectFromChildren(this)));
        } else {
            QHTMLModel model;
            for (QHTMLNode *child : children()) {
                if (QHTMLNode *childClone = qhtmlLegacyCloneDataChild(child)) {
                    model.appendChild(childClone);
                }
            }
            m_legacyValueNode = model.jsonDocument();
        }
        return m_legacyValueNode;
    }

    QString m_value;
    QHTMLNode *m_valueNode = nullptr;
    mutable QHTMLNode *m_legacyValueNode = nullptr;
};

class QHTMLImportNode final : public QHTMLTypedNode
{
public:
    explicit QHTMLImportNode(const QString &keyword = QStringLiteral("q-import"),
                             const QString &body = QString(),
                             const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(keyword, QString(), attributes),
          m_required(keyword == QStringLiteral("q-require")),
          m_body(body.trimmed())
    {
        setQHTMLType(QStringLiteral("QHTMLImportNode"));
        parseBody(m_body);
        setProperty(QStringLiteral("kind"), m_required ? QStringLiteral("require") : QStringLiteral("import"));
        setProperty(QStringLiteral("path"), m_path);
        setProperty(QStringLiteral("cache"), m_cacheMode);
    }

    bool isRequire() const { return m_required; }
    QString importKind() const { return m_required ? QStringLiteral("q-require") : QStringLiteral("q-import"); }
    std::string importKindJs() const { return importKind().toStdString(); }

    QString path() const { return m_path; }
    std::string pathJs() const { return m_path.toStdString(); }

    QString cacheMode() const { return m_cacheMode; }
    std::string cacheModeJs() const { return m_cacheMode.toStdString(); }

    QString body() const { return m_body; }
    std::string bodyJs() const { return m_body.toStdString(); }

    QString renderHtml() const override { return QString(); }

private:
    void parseBody(const QString &body)
    {
        const QStringList parts = splitDirective(body);
        if (parts.isEmpty()) {
            return;
        }

        m_path = stripQuotes(parts.first());
        m_cacheMode = QStringLiteral("default");
        for (int i = 1; i < parts.size(); ++i) {
            const QString token = parts.at(i).trimmed().toLower();
            if (token == QStringLiteral("cache") || token == QStringLiteral("nocache")) {
                m_cacheMode = token;
            }
        }
    }

    static QStringList splitDirective(const QString &source)
    {
        QStringList out;
        QString current;
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
            if (ch.isSpace()) {
                const QString token = current.trimmed();
                if (!token.isEmpty()) {
                    out.append(token);
                }
                current.clear();
                continue;
            }
            current += ch;
        }
        const QString token = current.trimmed();
        if (!token.isEmpty()) {
            out.append(token);
        }
        return out;
    }

    static QString stripQuotes(QString value)
    {
        value = value.trimmed();
        if (value.size() >= 2) {
            const QChar first = value.at(0);
            const QChar last = value.at(value.size() - 1);
            if ((first == QLatin1Char('"') && last == QLatin1Char('"')) ||
                (first == QLatin1Char('\'') && last == QLatin1Char('\'')) ||
                (first == QLatin1Char('`') && last == QLatin1Char('`'))) {
                return value.mid(1, value.size() - 2);
            }
        }
        return value;
    }

    bool m_required = false;
    QString m_path;
    QString m_cacheMode = QStringLiteral("default");
    QString m_body;
};

class QHTMLForNode final : public QHTMLTypedNode
{
public:
    explicit QHTMLForNode(const QString &variableName = QString(),
                          const QHash<QString, QString> &attributes = {},
                          const QString &body = QString())
        : QHTMLTypedNode(QStringLiteral("for"), variableName, attributes),
          m_variableName(variableName.trimmed()),
          m_collectionExpression(attributes.value(QStringLiteral("collection")).trimmed()),
          m_body(body)
    {
        setQHTMLType(QStringLiteral("QHTMLForNode"));
        setProperty(QStringLiteral("kind"), QStringLiteral("for"));
        setProperty(QStringLiteral("variable"), m_variableName);
        setProperty(QStringLiteral("collection"), m_collectionExpression);
    }

    QString variableName() const { return m_variableName; }
    std::string variableNameJs() const { return m_variableName.toStdString(); }

    QString collectionExpression() const { return m_collectionExpression; }
    std::string collectionExpressionJs() const { return m_collectionExpression.toStdString(); }

    QString body() const { return m_body; }
    std::string bodyJs() const { return m_body.toStdString(); }

    QString renderHtml() const override
    {
        return renderHtmlForContext(nullptr);
    }

    QString renderHtmlInContext(const QHTMLNode *contextNode) const override
    {
        return renderHtmlForContext(contextNode);
    }

private:
    QString renderHtmlForContext(const QHTMLNode *contextNode) const
    {
        QString out = QStringLiteral("<!--qhtml-for-start:") + qhtmlUUID() + QStringLiteral("-->");
        const QStringList values = collectionValues(contextNode);
        for (const QString &value : values) {
            for (QHTMLNode *child : children()) {
                out += renderNodeForValue(child, value);
            }
        }
        out += QStringLiteral("<!--qhtml-for-end:") + qhtmlUUID() + QStringLiteral("-->");
        return out;
    }

    QStringList collectionValues(const QHTMLNode *contextNode) const
    {
        if (QHTMLProperty *property = findCollectionProperty(contextNode)) {
            if (QHTMLJsonDocument *document = dynamic_cast<QHTMLJsonDocument *>(property->structuredValue())) {
                if (document->isArray()) {
                    return document->arrayValues();
                }
            }
            if (QHTMLArrayNode *array = dynamic_cast<QHTMLArrayNode *>(property->structuredValue())) {
                QStringList out;
                for (int i = 0; i < array->size(); ++i) {
                    out.append(normalizeLoopValue(array->at(i)));
                }
                return out;
            }
            const QString evaluated = evaluateCollectionExpression(property->value(), contextNode);
            if (!evaluated.isEmpty()) {
                return valuesFromLiteral(evaluated);
            }
            return valuesFromLiteral(property->value());
        }
        const QString evaluated = evaluateCollectionExpression(m_collectionExpression, contextNode);
        if (!evaluated.isEmpty()) {
            return valuesFromLiteral(evaluated);
        }
        return valuesFromLiteral(m_collectionExpression);
    }

    QHTMLProperty *findCollectionProperty(const QHTMLNode *contextNode) const
    {
        const QString name = collectionPropertyName();
        if (name.isEmpty()) {
            return nullptr;
        }
        if (contextNode) {
            if (QHTMLProperty *property = findPropertyInChildren(const_cast<QHTMLNode *>(contextNode), name)) {
                return property;
            }
        }
        for (QHTMLNode *scope = parent(); scope; scope = scope->parent()) {
            if (QHTMLProperty *property = findPropertyInChildren(scope, name)) {
                return property;
            }
        }
        return nullptr;
    }

    static QHTMLProperty *findPropertyInChildren(QHTMLNode *scope, const QString &name)
    {
        if (!scope || name.isEmpty()) {
            return nullptr;
        }
        for (QHTMLNode *child : scope->children()) {
            if (QHTMLProperty *property = dynamic_cast<QHTMLProperty *>(child)) {
                if (property->qhtmlName() == name) {
                    return property;
                }
            }
        }
        return nullptr;
    }

    QString collectionPropertyName() const
    {
        QString expression = m_collectionExpression.trimmed();
        if (expression.startsWith(QStringLiteral("this."))) {
            expression = expression.mid(5).trimmed();
        }
        const int dot = expression.indexOf(QLatin1Char('.'));
        if (dot > 0) {
            expression = expression.left(dot).trimmed();
        }
        return expression;
    }

    static QString evaluateCollectionExpression(QString expression, const QHTMLNode *contextNode)
    {
        expression = expression.trimmed();
        if (expression.startsWith(QStringLiteral("this."))) {
            expression = expression.mid(5).trimmed();
        }

        static const QRegularExpression findChildrenRx(
            QStringLiteral("^findChildComponentsOfType\\s*\\(\\s*[\"']([^\"']+)[\"']\\s*\\)\\s*$"));
        const QRegularExpressionMatch match = findChildrenRx.match(expression);
        if (!match.hasMatch()) {
            return QString();
        }

        const QHTMLComponentInstance *component = dynamic_cast<const QHTMLComponentInstance *>(contextNode);
        return component ? component->findChildComponentsOfType(match.captured(1).trimmed()) : QStringLiteral("[]");
    }

    static QStringList valuesFromLiteral(QString literal)
    {
        literal = literal.trimmed();
        if ((literal.startsWith(QLatin1Char('[')) && literal.endsWith(QLatin1Char(']'))) ||
            (literal.startsWith(QLatin1Char('{')) && literal.endsWith(QLatin1Char('}')))) {
            QHTMLJsonDocument document(literal);
            if (document.isArray()) {
                return document.arrayValues();
            }
            if (document.isObject()) {
                QStringList out;
                QHTMLJsonObject *object = document.object();
                for (const QString &key : object->keysLiteral().split(QRegularExpression(QStringLiteral("\\s*,\\s*")), Qt::SkipEmptyParts)) {
                    out.append(object->value(key));
                }
                delete object;
                return out;
            }
        }
        if (literal.startsWith(QLatin1Char('[')) && literal.endsWith(QLatin1Char(']'))) {
            QStringList out;
            for (const QString &value : QHTMLArrayNode::splitTopLevel(literal.mid(1, literal.size() - 2))) {
                out.append(normalizeLoopValue(value));
            }
            return out;
        }
        if (literal.startsWith(QLatin1Char('{')) && literal.endsWith(QLatin1Char('}'))) {
            QStringList out;
            for (const QString &entry : QHTMLArrayNode::splitTopLevel(literal.mid(1, literal.size() - 2))) {
                const int colon = entry.indexOf(QLatin1Char(':'));
                if (colon > 0) {
                    out.append(normalizeLoopValue(entry.mid(colon + 1)));
                }
            }
            return out;
        }
        return QStringList();
    }

    static QString normalizeLoopValue(QString value)
    {
        value = value.trimmed();
        if (value.size() >= 2) {
            const QChar first = value.at(0);
            const QChar last = value.at(value.size() - 1);
            if ((first == QLatin1Char('"') && last == QLatin1Char('"')) ||
                (first == QLatin1Char('\'') && last == QLatin1Char('\'')) ||
                (first == QLatin1Char('`') && last == QLatin1Char('`'))) {
                return value.mid(1, value.size() - 2);
            }
        }
        return value;
    }

    QString interpolate(QString value, const QString &loopValue) const
    {
        static const QRegularExpression rx(QStringLiteral("\\$\\{\\s*([^}]+?)\\s*\\}"));
        QRegularExpressionMatchIterator it = rx.globalMatch(value);
        int offset = 0;
        while (it.hasNext()) {
            const QRegularExpressionMatch match = it.next();
            const QString expression = match.captured(1).trimmed();
            const QString replacement = resolveLoopExpression(expression, loopValue);
            value.replace(match.capturedStart(0) + offset, match.capturedLength(0), replacement);
            offset += replacement.size() - match.capturedLength(0);
        }
        return value;
    }

    QString resolveLoopExpression(QString expression, const QString &loopValue) const
    {
        expression = expression.trimmed();
        if (expression.startsWith(QStringLiteral("this."))) {
            expression = expression.mid(5).trimmed();
        }

        if (expression == m_variableName) {
            return normalizeLoopValue(loopValue);
        }

        const QString prefix = m_variableName + QLatin1Char('.');
        if (!expression.startsWith(prefix)) {
            return QStringLiteral("${") + expression + QStringLiteral("}");
        }

        const QString fieldPath = expression.mid(prefix.size()).trimmed();
        if (fieldPath.isEmpty()) {
            return QString();
        }

        QHTMLJsonDocument document(loopValue);
        return document.valueAtPath(fieldPath);
    }

    QString renderNodeForValue(QHTMLNode *node, const QString &loopValue) const
    {
        if (!node) {
            return QString();
        }
        if (QHTMLTextFragment *text = dynamic_cast<QHTMLTextFragment *>(node)) {
            return escapeText(interpolate(text->value(), loopValue));
        }
        if (QHTMLHTMLFragment *html = dynamic_cast<QHTMLHTMLFragment *>(node)) {
            return interpolate(html->value(), loopValue);
        }
        if (QHTMLUnknownFragment *unknown = dynamic_cast<QHTMLUnknownFragment *>(node)) {
            return escapeText(interpolate(unknown->value(), loopValue));
        }
        if (QHTMLDomElement *element = dynamic_cast<QHTMLDomElement *>(node)) {
            QString out = QStringLiteral("<") + element->tagName();
            const QHash<QString, QString> localAttributes = element->attributes();
            const QStringList keys = localAttributes.keys();
            for (const QString &key : keys) {
                const QString value = localAttributes.value(key);
                if (!value.isEmpty()) {
                    out += QStringLiteral(" ") + key + QStringLiteral("=\"") + escapeAttribute(interpolate(value, loopValue)) + QStringLiteral("\"");
                }
            }
            for (QHTMLNode *child : element->children()) {
                QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child);
                if (!assignment || assignment->qhtmlName().isEmpty()) {
                    continue;
                }
                out += QStringLiteral(" ") + assignment->qhtmlName() + QStringLiteral("=\"") +
                       escapeAttribute(interpolate(normalizeLoopValue(assignment->value()), loopValue)) +
                       QStringLiteral("\"");
            }
            out += QStringLiteral(" qhtml-node=\"") + escapeAttribute(element->qhtmlUUID()) + QStringLiteral("\"");
            out += QStringLiteral(" qhtml-for-node=\"") + escapeAttribute(qhtmlUUID()) + QStringLiteral("\"");
            out += QStringLiteral(">");
            for (QHTMLNode *child : element->children()) {
                if (dynamic_cast<QHTMLPropertyAssignment *>(child)) {
                    continue;
                }
                out += renderNodeForValue(child, loopValue);
            }
            out += QStringLiteral("</") + element->tagName() + QStringLiteral(">");
            return out;
        }

        QString html = node->renderHtml();
        html = interpolate(html, loopValue);
        return addForMetadataToHtml(html);
    }

    QString addForMetadataToHtml(QString html) const
    {
        static const QRegularExpression tagRx(QStringLiteral("<([A-Za-z][A-Za-z0-9_+\\-]*)([^>]*)>"));
        int offset = 0;
        QRegularExpressionMatchIterator it = tagRx.globalMatch(html);
        while (it.hasNext()) {
            const QRegularExpressionMatch match = it.next();
            if (match.captured(0).contains(QStringLiteral(" qhtml-for-node="))) {
                continue;
            }
            const int insertAt = match.capturedStart(2) + offset;
            const QString attribute = QStringLiteral(" qhtml-for-node=\"") + escapeAttribute(qhtmlUUID()) + QStringLiteral("\"");
            html.insert(insertAt, attribute);
            offset += attribute.size();
        }
        return html;
    }

    QString m_variableName;
    QString m_collectionExpression;
    QString m_body;
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


class QHTMLPainter final : public QHTMLTypedNode
{
public:
    explicit QHTMLPainter(const QString &name = QString(),
                          const QHash<QString, QString> &attributes = {},
                          const QString &body = QString())
        : QHTMLTypedNode(QStringLiteral("q-painter"), name, attributes),
          m_body(body.trimmed())
    {
        setQHTMLType(QStringLiteral("QHTMLPainter"));
        setProperty(QStringLiteral("kind"), QStringLiteral("painter"));
    }

    QString body() const
    {
        const QString childBody = paintHandlerBody();
        return childBody.isEmpty() ? m_body : childBody;
    }
    std::string bodyJs() const { return body().toStdString(); }

    void setBody(const QString &body) { m_body = body.trimmed(); }
    void setBodyJs(const std::string &body) { setBody(QString::fromStdString(body)); }

    QHTMLEventHandler *paintHandler() const
    {
        for (QHTMLNode *child : children()) {
            QHTMLEventHandler *handler = dynamic_cast<QHTMLEventHandler *>(child);
            if (handler && handler->eventName() == QStringLiteral("paint")) {
                return handler;
            }
        }
        return nullptr;
    }

    QHTMLEventHandler *paintHandlerJs() const { return paintHandler(); }

    QHTMLPainter *clonePainter() const
    {
        QHTMLPainter *cloned = new QHTMLPainter(qhtmlName(), attributes(), m_body);
        for (QHTMLNode *child : children()) {
            if (QHTMLEventHandler *handler = dynamic_cast<QHTMLEventHandler *>(child)) {
                cloned->appendChild(handler->cloneEventHandler());
            } else if (QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child)) {
                cloned->appendChild(assignment->cloneAssignment());
            } else if (QHTMLProperty *property = dynamic_cast<QHTMLProperty *>(child)) {
                cloned->appendChild(property->cloneProperty());
            }
        }
        return cloned;
    }

    QString renderHtml() const override { return QString(); }

private:
    QString paintHandlerBody() const
    {
        QHTMLEventHandler *handler = paintHandler();
        return handler ? handler->body() : QString();
    }

    QString m_body;
};

class QHTMLCanvas final : public QHTMLTypedNode
{
public:
    explicit QHTMLCanvas(const QString &name = QString(),
                         const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-canvas"), name, attributes)
    {
        setQHTMLType(QStringLiteral("QHTMLCanvas"));
        setProperty(QStringLiteral("kind"), QStringLiteral("canvas"));
    }

    QString renderHtml() const override
    {
        QString out = QStringLiteral("<canvas qhtml-canvas=\"1\" qhtml-node=\"") + escapeAttribute(qhtmlUUID()) + QStringLiteral("\"");
        const QString nameValue = qhtmlName().trimmed();
        if (!nameValue.isEmpty()) {
            out += QStringLiteral(" name=\"") + escapeAttribute(nameValue) + QStringLiteral("\"");
        }
        const QString idValue = assignmentValue(QStringLiteral("id"));
        if (!idValue.isEmpty()) {
            out += QStringLiteral(" id=\"") + escapeAttribute(stripQuotes(idValue)) + QStringLiteral("\"");
        }
        const QString classValue = assignmentValue(QStringLiteral("class"));
        if (!classValue.isEmpty()) {
            out += QStringLiteral(" class=\"") + escapeAttribute(stripQuotes(classValue)) + QStringLiteral("\"");
        }
        out += QStringLiteral(" style=\"") + escapeAttribute(canvasStyle()) + QStringLiteral("\"");
        out += QStringLiteral(">");
        out += renderFallbackChildren();
        out += QStringLiteral("</canvas>");
        return out;
    }

    QString paintBody() const
    {
        for (QHTMLNode *child : children()) {
            QHTMLEventHandler *handler = dynamic_cast<QHTMLEventHandler *>(child);
            if (handler && handler->eventName() == QStringLiteral("paint")) {
                return handler->body();
            }
        }
        return QString();
    }
    std::string paintBodyJs() const { return paintBody().toStdString(); }

    QHTMLEventHandler *paintHandler() const
    {
        for (QHTMLNode *child : children()) {
            QHTMLEventHandler *handler = dynamic_cast<QHTMLEventHandler *>(child);
            if (handler && handler->eventName() == QStringLiteral("paint")) {
                return handler;
            }
        }
        return nullptr;
    }
    QHTMLEventHandler *paintHandlerJs() const { return paintHandler(); }

private:
    QString assignmentValue(const QString &name, const QString &fallback = QString()) const
    {
        const QString lowerName = name.toLower();
        for (QHTMLNode *child : children()) {
            QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child);
            if (!assignment) {
                continue;
            }
            if (assignment->qhtmlName().toLower() == lowerName) {
                return assignment->value().trimmed();
            }
        }
        return fallback;
    }

    static QString stripQuotes(QString value)
    {
        value = value.trimmed();
        if (value.size() >= 2) {
            const QChar first = value.at(0);
            const QChar last = value.at(value.size() - 1);
            if ((first == QLatin1Char('"') && last == QLatin1Char('"')) ||
                (first == QLatin1Char('\'') && last == QLatin1Char('\'')) ||
                (first == QLatin1Char('`') && last == QLatin1Char('`'))) {
                return value.mid(1, value.size() - 2);
            }
        }
        return value;
    }

    static QString cssValue(QString value)
    {
        value = stripQuotes(value);
        if (value.endsWith(QLatin1Char(';'))) {
            value.chop(1);
        }
        return value.trimmed();
    }

    void appendOptionalDeclaration(QStringList &declarations,
                                   const QString &cssName,
                                   const QString &assignmentName = QString()) const
    {
        QString value = assignmentValue(assignmentName.isEmpty() ? cssName : assignmentName);
        if (value.isEmpty() && !assignmentName.isEmpty()) {
            value = assignmentValue(cssName);
        }
        if (!value.isEmpty()) {
            declarations << cssName + QStringLiteral(":") + cssValue(value);
        }
    }

    QString canvasStyle() const
    {
        QStringList declarations;
        declarations << QStringLiteral("display:block");
        declarations << QStringLiteral("box-sizing:border-box");
        declarations << QStringLiteral("width:") + cssValue(assignmentValue(QStringLiteral("width"), QStringLiteral("300px")));
        declarations << QStringLiteral("height:") + cssValue(assignmentValue(QStringLiteral("height"), QStringLiteral("150px")));
        appendOptionalDeclaration(declarations, QStringLiteral("min-width"), QStringLiteral("minWidth"));
        appendOptionalDeclaration(declarations, QStringLiteral("min-height"), QStringLiteral("minHeight"));
        appendOptionalDeclaration(declarations, QStringLiteral("max-width"), QStringLiteral("maxWidth"));
        appendOptionalDeclaration(declarations, QStringLiteral("max-height"), QStringLiteral("maxHeight"));
        appendOptionalDeclaration(declarations, QStringLiteral("background"));
        appendOptionalDeclaration(declarations, QStringLiteral("border"));
        appendOptionalDeclaration(declarations, QStringLiteral("border-radius"), QStringLiteral("borderRadius"));
        appendOptionalDeclaration(declarations, QStringLiteral("margin"));
        appendOptionalDeclaration(declarations, QStringLiteral("padding"));
        return declarations.join(QStringLiteral(";")) + QStringLiteral(";");
    }

    static bool isRuntimeChild(QHTMLNode *child)
    {
        if (!child) {
            return true;
        }
        const QString type = child->qhtmlType();
        return type == QStringLiteral("QHTMLPropertyAssignment") ||
               type == QStringLiteral("QHTMLProperty") ||
               type == QStringLiteral("QHTMLEventHandler") ||
               type == QStringLiteral("QHTMLSignal") ||
               type == QStringLiteral("QHTMLFunction") ||
               type == QStringLiteral("QHTMLStyle");
    }

    QString renderFallbackChildren() const
    {
        QString out;
        for (QHTMLNode *child : children()) {
            if (!isRuntimeChild(child)) {
                out += child->renderHtml();
            }
        }
        return out;
    }
};

class QHTMLConnect final : public QHTMLTypedNode
{
public:
    explicit QHTMLConnect(const QString &body = QString())
        : QHTMLTypedNode(QStringLiteral("q-connect"), QString()),
          m_body(body.trimmed())
    {
        setQHTMLType(QStringLiteral("QHTMLConnect"));
        setProperty(QStringLiteral("kind"), QStringLiteral("connect"));
    }

    QString body() const { return m_body; }
    std::string bodyJs() const { return m_body.toStdString(); }

    QString sourcePath() const
    {
        const QStringList parts = connectionParts();
        return parts.size() > 0 ? parts.at(0) : QString();
    }
    std::string sourcePathJs() const { return sourcePath().toStdString(); }

    QString targetPath() const
    {
        const QStringList parts = connectionParts();
        return parts.size() > 1 ? parts.at(1) : QString();
    }
    std::string targetPathJs() const { return targetPath().toStdString(); }

    QHTMLConnect *cloneConnect() const { return new QHTMLConnect(m_body); }

    QString renderHtml() const override { return QString(); }

private:
    QStringList connectionParts() const
    {
        QString normalized = m_body;
        normalized.replace(QLatin1Char(';'), QLatin1Char(' '));
        return normalized.split(QRegularExpression(QStringLiteral("\\s+")), Qt::SkipEmptyParts);
    }

    QString m_body;
};

class QHTMLTimer final : public QHTMLTypedNode
{
public:
    explicit QHTMLTimer(const QString &name = QString(),
                        const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-timer"), name, attributes)
    {
        setQHTMLType(QStringLiteral("QHTMLTimer"));
        setProperty(QStringLiteral("kind"), QStringLiteral("timer"));
        m_timer = new QTimer();
        QObject::connect(m_timer, &QTimer::timeout, [this]() {
            tick();
        });
        m_timeoutSignal = new QHTMLSignal(QStringLiteral("timeout"));
        appendChild(m_timeoutSignal);
    }

    ~QHTMLTimer() override
    {
        if (m_timer) {
            m_timer->stop();
        }
        delete m_timer;
    }

    int interval() const { return m_interval; }
    void setInterval(int interval)
    {
        m_interval = interval < 0 ? 0 : interval;
        m_intervalExplicit = true;
        if (m_timer) {
            m_timer->setInterval(m_interval);
        }
    }
    void setIntervalJs(int interval) { setInterval(interval); }

    bool running() const { return m_running; }
    void setRunning(bool running)
    {
        if (running) {
            start();
        } else {
            stop();
        }
    }
    void setRunningJs(bool running) { setRunning(running); }

    bool repeat() const { return m_repeat; }
    void setRepeat(bool repeat)
    {
        m_repeat = repeat;
        m_repeatExplicit = true;
        if (m_timer) {
            m_timer->setSingleShot(!m_repeat);
        }
    }
    void setRepeatJs(bool repeat) { setRepeat(repeat); }

    QHTMLSignal *timeoutSignal() const { return m_timeoutSignal; }
    QHTMLSignal *timeoutSignalJs() const { return m_timeoutSignal; }

    void setSignalBus(QHTMLSignalBus *bus)
    {
        if (m_timeoutSignal) {
            m_timeoutSignal->setSignalBus(bus);
        }
    }

    void start()
    {
        applyConfigurationFromChildren();
        m_running = true;
        if (m_timer) {
            m_timer->setInterval(m_interval);
            m_timer->setSingleShot(!m_repeat);
            m_timer->start();
        }
    }

    void initialize()
    {
        applyConfigurationFromChildren();
        if (m_running) {
            start();
        }
    }

    void stop()
    {
        m_running = false;
        if (m_timer) {
            m_timer->stop();
        }
    }

    int tick()
    {
        if (!m_repeat) {
            m_running = false;
        }
        return m_timeoutSignal ? m_timeoutSignal->emitSignal(QStringList(), this) : 0;
    }

    int tickJs() { return tick(); }

    QHTMLTimer *cloneTimer() const
    {
        QHTMLTimer *cloned = new QHTMLTimer(qhtmlName(), attributes());
        for (QHTMLNode *child : children()) {
            if (!child || child == m_timeoutSignal) {
                continue;
            }
            if (QHTMLEventHandler *handler = dynamic_cast<QHTMLEventHandler *>(child)) {
                cloned->appendChild(handler->cloneEventHandler());
            } else if (QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child)) {
                cloned->appendChild(assignment->cloneAssignment());
            }
        }
        return cloned;
    }

    QString renderHtml() const override { return QString(); }

private:
    void applyConfigurationFromChildren()
    {
        for (QHTMLNode *child : children()) {
            QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child);
            if (!assignment) {
                continue;
            }
            const QString name = assignment->qhtmlName().toLower();
            const QString value = assignment->value().trimmed();
            if (name == QStringLiteral("interval") && !m_intervalExplicit) {
                const int nextInterval = value.toInt();
                m_interval = nextInterval < 0 ? 0 : nextInterval;
            } else if (name == QStringLiteral("running")) {
                m_running = boolValue(value, m_running);
            } else if (name == QStringLiteral("repeat") && !m_repeatExplicit) {
                m_repeat = boolValue(value, m_repeat);
            }
        }
    }

    static bool boolValue(QString value, bool fallback)
    {
        value = value.trimmed().toLower();
        if (value == QStringLiteral("true") || value == QStringLiteral("1") || value == QStringLiteral("yes")) {
            return true;
        }
        if (value == QStringLiteral("false") || value == QStringLiteral("0") || value == QStringLiteral("no")) {
            return false;
        }
        return fallback;
    }

    QTimer *m_timer = nullptr;
    QHTMLSignal *m_timeoutSignal = nullptr;
    int m_interval = 0;
    bool m_running = false;
    bool m_repeat = true;
    bool m_intervalExplicit = false;
    bool m_repeatExplicit = false;
};

class QHTMLPropertyAnimation final : public QHTMLTypedNode
{
public:
    explicit QHTMLPropertyAnimation(const QString &name = QString(),
                                    const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-property-animation"), name, attributes)
    {
        setQHTMLType(QStringLiteral("QHTMLPropertyAnimation"));
        setProperty(QStringLiteral("kind"), QStringLiteral("property-animation"));
        m_startedSignal = appendBuiltInSignal(QStringLiteral("started"));
        m_stoppedSignal = appendBuiltInSignal(QStringLiteral("stopped"));
        m_steppedSignal = appendBuiltInSignal(QStringLiteral("stepped"), QStringLiteral("value, currentStep"));
        m_endedSignal = appendBuiltInSignal(QStringLiteral("ended"));
        m_finishedSignal = appendBuiltInSignal(QStringLiteral("finished"));
    }

    int duration() const { return m_duration; }
    void setDuration(int duration) { m_duration = duration < 0 ? 0 : duration; }
    void setDurationJs(int duration) { setDuration(duration); }

    QString easing() const { return m_easing; }
    std::string easingJs() const { return m_easing.toStdString(); }
    void setEasing(const QString &easing) { m_easing = easing.trimmed().isEmpty() ? QStringLiteral("linear") : easing.trimmed(); }
    void setEasingJs(const std::string &easing) { setEasing(QString::fromStdString(easing)); }

    bool repeat() const { return m_repeat; }
    void setRepeat(bool repeat) { m_repeat = repeat; }
    void setRepeatJs(bool repeat) { setRepeat(repeat); }

    int steps() const { return m_steps; }
    void setSteps(int steps)
    {
        m_steps = steps < 0 ? 0 : steps;
        rebuildStepStones();
    }
    void setStepsJs(int steps) { setSteps(steps); }

    int currentStep() const { return m_currentStep; }
    void setCurrentStep(int step) { m_currentStep = step < 0 ? 0 : step; }
    void setCurrentStepJs(int step) { setCurrentStep(step); }

    double from() const { return m_from; }
    void setFrom(double value)
    {
        m_from = value;
        rebuildStepStones();
    }
    void setFromJs(double value) { setFrom(value); }

    double to() const { return m_to; }
    void setTo(double value)
    {
        m_to = value;
        rebuildStepStones();
    }
    void setToJs(double value) { setTo(value); }

    double stepAmount() const { return m_stepAmount; }
    double stepAmountJs() const { return stepAmount(); }

    QString stepStones() const
    {
        QStringList values;
        for (double value : m_stepStones) {
            values.append(QString::number(value, 'g', 16));
        }
        return values.join(QStringLiteral(", "));
    }
    std::string stepStonesJs() const { return stepStones().toStdString(); }

    bool running() const { return m_running; }
    void setRunning(bool running)
    {
        if (running) {
            start();
        } else {
            stop();
        }
    }
    void setRunningJs(bool running) { setRunning(running); }

    QHTMLSignal *startedSignal() const { return m_startedSignal; }
    QHTMLSignal *startedSignalJs() const { return m_startedSignal; }
    QHTMLSignal *stoppedSignal() const { return m_stoppedSignal; }
    QHTMLSignal *stoppedSignalJs() const { return m_stoppedSignal; }
    QHTMLSignal *steppedSignal() const { return m_steppedSignal; }
    QHTMLSignal *steppedSignalJs() const { return m_steppedSignal; }
    QHTMLSignal *endedSignal() const { return m_endedSignal; }
    QHTMLSignal *endedSignalJs() const { return m_endedSignal; }
    QHTMLSignal *finishedSignal() const { return m_finishedSignal; }
    QHTMLSignal *finishedSignalJs() const { return m_finishedSignal; }

    void setSignalBus(QHTMLSignalBus *bus)
    {
        for (QHTMLSignal *signal : { m_startedSignal, m_stoppedSignal, m_steppedSignal, m_endedSignal, m_finishedSignal }) {
            if (signal) {
                signal->setSignalBus(bus);
            }
        }
    }

    void start()
    {
        applyConfigurationFromChildren();
        m_currentStep = 0;
        rebuildStepStones();
        m_running = true;
        if (m_startedSignal) {
            m_startedSignal->emitSignal(QStringList(), this);
        }
    }

    void stop()
    {
        const bool wasRunning = m_running;
        m_running = false;
        if (wasRunning && m_stoppedSignal) {
            m_stoppedSignal->emitSignal(QStringList(), this);
        }
    }

    int i_handleXChange(double x)
    {
        int emitted = 0;
        while (m_currentStep < m_stepStones.size()) {
            const double stone = m_stepStones.at(m_currentStep);
            const bool crossed = m_stepAmount < 0 ? x <= stone : x >= stone;
            if (!crossed) {
                break;
            }
            ++m_currentStep;
            if (m_steppedSignal) {
                emitted += m_steppedSignal->emitSignal({
                    QString::number(x, 'g', 16),
                    QString::number(m_currentStep)
                }, this);
            }
        }
        return emitted;
    }
    int i_handleXChangeJs(double x) { return i_handleXChange(x); }

    QHTMLPropertyAnimation *cloneAnimation() const
    {
        QHTMLPropertyAnimation *cloned = new QHTMLPropertyAnimation(qhtmlName(), attributes());
        cloned->m_duration = m_duration;
        cloned->m_easing = m_easing;
        cloned->m_repeat = m_repeat;
        cloned->m_steps = m_steps;
        cloned->m_currentStep = m_currentStep;
        cloned->m_from = m_from;
        cloned->m_to = m_to;
        cloned->m_stepAmount = m_stepAmount;
        cloned->m_stepStones = m_stepStones;
        cloned->m_running = m_running;
        for (QHTMLNode *child : children()) {
            if (!child ||
                child == m_startedSignal ||
                child == m_stoppedSignal ||
                child == m_steppedSignal ||
                child == m_endedSignal ||
                child == m_finishedSignal) {
                continue;
            }
            if (QHTMLEventHandler *handler = dynamic_cast<QHTMLEventHandler *>(child)) {
                cloned->appendChild(handler->cloneEventHandler());
            } else if (QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child)) {
                cloned->appendChild(assignment->cloneAssignment());
            }
        }
        return cloned;
    }

    QString renderHtml() const override { return QString(); }

private:
    QHTMLSignal *appendBuiltInSignal(const QString &name, const QString &parameters = QString())
    {
        QHash<QString, QString> attributes;
        if (!parameters.isEmpty()) {
            attributes.insert(QStringLiteral("parameters"), parameters);
        }
        QHTMLSignal *signal = new QHTMLSignal(name, attributes);
        appendChild(signal);
        return signal;
    }

    void rebuildStepStones()
    {
        m_stepStones.clear();
        const double delta = m_to - m_from;
        m_stepAmount = m_steps > 0 ? delta / m_steps : delta;
        if (m_steps <= 0 || delta == 0.0) {
            return;
        }
        for (int i = 1; i <= m_steps; ++i) {
            m_stepStones.append(m_from + m_stepAmount * i);
        }
    }

    void applyConfigurationFromChildren()
    {
        for (QHTMLNode *child : children()) {
            QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child);
            if (!assignment) {
                continue;
            }
            const QString name = assignment->qhtmlName().toLower();
            const QString value = assignment->value().trimmed();
            if (name == QStringLiteral("duration")) {
                setDuration(value.toInt());
            } else if (name == QStringLiteral("steps")) {
                setSteps(value.toInt());
            } else if (name == QStringLiteral("from") || name == QStringLiteral("start") || name == QStringLiteral("startvalue")) {
                setFrom(value.toDouble());
            } else if (name == QStringLiteral("to") || name == QStringLiteral("end") || name == QStringLiteral("endvalue")) {
                setTo(value.toDouble());
            } else if (name == QStringLiteral("running")) {
                m_running = boolValue(value, m_running);
            } else if (name == QStringLiteral("repeat")) {
                setRepeat(boolValue(value, m_repeat));
            } else if (name == QStringLiteral("easing")) {
                setEasing(unquoted(value));
            }
        }
    }

    static QString unquoted(QString value)
    {
        value = value.trimmed();
        if (value.size() >= 2) {
            const QChar first = value.at(0);
            const QChar last = value.at(value.size() - 1);
            if ((first == QLatin1Char('"') && last == QLatin1Char('"')) ||
                (first == QLatin1Char('\'') && last == QLatin1Char('\'')) ||
                (first == QLatin1Char('`') && last == QLatin1Char('`'))) {
                return value.mid(1, value.size() - 2);
            }
        }
        return value;
    }

    static bool boolValue(QString value, bool fallback)
    {
        value = value.trimmed().toLower();
        if (value == QStringLiteral("true") || value == QStringLiteral("1") || value == QStringLiteral("yes")) {
            return true;
        }
        if (value == QStringLiteral("false") || value == QStringLiteral("0") || value == QStringLiteral("no")) {
            return false;
        }
        return fallback;
    }

    QHTMLSignal *m_startedSignal = nullptr;
    QHTMLSignal *m_stoppedSignal = nullptr;
    QHTMLSignal *m_steppedSignal = nullptr;
    QHTMLSignal *m_endedSignal = nullptr;
    QHTMLSignal *m_finishedSignal = nullptr;
    int m_duration = 0;
    QString m_easing = QStringLiteral("linear");
    bool m_repeat = false;
    int m_steps = 60;
    int m_currentStep = 0;
    double m_from = 0.0;
    double m_to = 0.0;
    double m_stepAmount = 0.0;
    QVector<double> m_stepStones;
    bool m_running = false;
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
                        const QHash<QString, QString> &attributes = {},
                        const QString &body = QString())
        : QHTMLTypedNode(QStringLiteral("q-class"), name, attributes),
          m_body(body.trimmed())
    {
        setQHTMLType(QStringLiteral("QHTMLClass"));
        setProperty(QStringLiteral("kind"), QStringLiteral("class"));
    }

    QString body() const { return m_body; }
    std::string bodyJs() const { return m_body.toStdString(); }
    void setBody(const QString &body) { m_body = body.trimmed(); }
    void setBodyJs(const std::string &body) { setBody(QString::fromStdString(body)); }

    QString renderHtml() const override { return QString(); }

private:
    QString m_body;
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
        setQHTMLType(QStringLiteral("QHTMLModelView"));
        setProperty(QStringLiteral("kind"), QStringLiteral("model-view"));
    }

    QString aliasName() const
    {
        if (QHTMLNode *alias = controlSlot(QStringLiteral("as"))) {
            const QString value = nodeText(alias).trimmed();
            if (!value.isEmpty()) {
                return value;
            }
        }
        return attributes().value(QStringLiteral("as")).trimmed();
    }
    std::string aliasNameJs() const { return aliasName().toStdString(); }

    QHTMLJsonDocument *modelDocument() const
    {
        if (QHTMLNode *source = modelSourceNode()) {
            return jsonDocumentFromSourceNode(source);
        }
        return new QHTMLJsonDocument(QStringLiteral("[]"));
    }
    QHTMLJsonDocument *modelDocumentJs() const { return modelDocument(); }

    QString renderHtml() const override
    {
        const QString variable = aliasName().isEmpty() ? QStringLiteral("item") : aliasName();
        QHTMLJsonDocument *document = modelDocument();
        const QStringList values = document && document->isArray() ? document->arrayValues() : QStringList();
        delete document;

        QString out = QStringLiteral("<!--qhtml-model-view-start:") + qhtmlUUID() + QStringLiteral("-->");
        for (const QString &value : values) {
            for (QHTMLNode *child : repeatTemplateChildren()) {
                out += renderNodeForValue(child, variable, value);
            }
        }
        out += QStringLiteral("<!--qhtml-model-view-end:") + qhtmlUUID() + QStringLiteral("-->");
        return out;
    }

private:
    static bool isNamedWrapper(QHTMLNode *node, const QString &name)
    {
        return node && node->qhtmlName().compare(name, Qt::CaseInsensitive) == 0;
    }

    static bool isIgnorableTextNode(QHTMLNode *node)
    {
        QString value;
        if (QHTMLTextFragment *text = dynamic_cast<QHTMLTextFragment *>(node)) {
            value = text->value();
        } else if (QHTMLHTMLFragment *html = dynamic_cast<QHTMLHTMLFragment *>(node)) {
            value = html->value();
        } else if (QHTMLUnknownFragment *unknown = dynamic_cast<QHTMLUnknownFragment *>(node)) {
            value = unknown->value();
        } else {
            return false;
        }
        value = value.trimmed();
        return value.isEmpty() || value == QStringLiteral(",") || value == QStringLiteral(";");
    }

    static bool isControlSlot(QHTMLNode *node)
    {
        return isNamedWrapper(node, QStringLiteral("model")) ||
               isNamedWrapper(node, QStringLiteral("as"));
    }

    static QString nodeText(QHTMLNode *node)
    {
        if (!node) {
            return QString();
        }
        if (QHTMLTextFragment *text = dynamic_cast<QHTMLTextFragment *>(node)) {
            return text->value();
        }
        if (QHTMLHTMLFragment *html = dynamic_cast<QHTMLHTMLFragment *>(node)) {
            return html->value();
        }
        if (QHTMLUnknownFragment *unknown = dynamic_cast<QHTMLUnknownFragment *>(node)) {
            return unknown->value();
        }
        QString out;
        for (QHTMLNode *child : node->children()) {
            out += nodeText(child);
        }
        return out;
    }

    QHTMLNode *controlSlot(const QString &name) const
    {
        for (QHTMLNode *child : children()) {
            if (isNamedWrapper(child, name)) {
                return child;
            }
        }
        return nullptr;
    }

    QList<QHTMLNode *> repeatTemplateChildren() const
    {
        QList<QHTMLNode *> out;
        for (QHTMLNode *child : children()) {
            if (!child || isControlSlot(child) || isIgnorableTextNode(child)) {
                continue;
            }
            out.append(child);
        }
        return out;
    }

    QHTMLNode *modelSourceNode() const
    {
        if (QHTMLNode *slot = controlSlot(QStringLiteral("model"))) {
            return firstMeaningfulChild(slot);
        }

        // Compatibility for older/direct forms such as:
        // q-model-view { q-model { ... } as { item } ... }
        // q-model-view { q-array { ... } as { item } ... }
        for (QHTMLNode *child : children()) {
            if (!child || isControlSlot(child) || isIgnorableTextNode(child)) {
                continue;
            }
            if (dynamic_cast<QHTMLModel *>(child) ||
                dynamic_cast<QHTMLArray *>(child) ||
                dynamic_cast<QHTMLMap *>(child) ||
                dynamic_cast<QHTMLJsonDocument *>(child) ||
                dynamic_cast<QHTMLProperty *>(child)) {
                return child;
            }
        }
        return nullptr;
    }

    static QHTMLNode *firstMeaningfulChild(QHTMLNode *slot)
    {
        if (!slot) {
            return nullptr;
        }
        for (QHTMLNode *child : slot->children()) {
            if (!child || isIgnorableTextNode(child)) {
                continue;
            }
            return child;
        }
        return nullptr;
    }

    static QHTMLJsonDocument *jsonDocumentFromValue(const QJsonValue &value)
    {
        if (value.isArray()) {
            return new QHTMLJsonDocument(QJsonDocument(value.toArray()));
        }
        if (value.isObject()) {
            return new QHTMLJsonDocument(QJsonDocument(value.toObject()));
        }
        QJsonArray wrapper;
        wrapper.append(value);
        return new QHTMLJsonDocument(QJsonDocument(wrapper));
    }

    static QHTMLJsonDocument *jsonDocumentFromText(QString value)
    {
        value = qhtmlLegacyStripTrailingSeparators(value);
        if (value.isEmpty()) {
            return new QHTMLJsonDocument(QStringLiteral("[]"));
        }
        return jsonDocumentFromValue(qhtmlLegacyParseJsonValue(value));
    }

    static QHTMLJsonDocument *jsonDocumentFromSourceNode(QHTMLNode *node)
    {
        if (!node) {
            return new QHTMLJsonDocument(QStringLiteral("[]"));
        }
        if (QHTMLArray *array = dynamic_cast<QHTMLArray *>(node)) {
            return array->jsonDocument();
        }
        if (QHTMLMap *map = dynamic_cast<QHTMLMap *>(node)) {
            return map->jsonDocument();
        }
        if (QHTMLModel *model = dynamic_cast<QHTMLModel *>(node)) {
            return model->jsonDocument();
        }
        if (QHTMLJsonDocument *document = dynamic_cast<QHTMLJsonDocument *>(node)) {
            return document->cloneDocument();
        }
        if (QHTMLProperty *property = dynamic_cast<QHTMLProperty *>(node)) {
            if (QHTMLJsonDocument *document = dynamic_cast<QHTMLJsonDocument *>(property->structuredValue())) {
                return document->cloneDocument();
            }
            return jsonDocumentFromText(property->value());
        }
        if (QHTMLTextFragment *text = dynamic_cast<QHTMLTextFragment *>(node)) {
            return jsonDocumentFromText(text->value());
        }
        if (QHTMLHTMLFragment *html = dynamic_cast<QHTMLHTMLFragment *>(node)) {
            return jsonDocumentFromText(html->value());
        }
        if (QHTMLUnknownFragment *unknown = dynamic_cast<QHTMLUnknownFragment *>(node)) {
            return jsonDocumentFromText(unknown->value());
        }

        // Last-resort adapter for wrapper-like nodes: preserve the slot semantics by
        // adapting only the first meaningful child, not by recursively collecting every
        // q-model in the subtree.
        if (QHTMLNode *first = firstMeaningfulChild(node)) {
            return jsonDocumentFromSourceNode(first);
        }
        return new QHTMLJsonDocument(QStringLiteral("[]"));
    }

    static QString normalizeLoopValue(QString value)
    {
        value = value.trimmed();
        if (value.size() >= 2) {
            const QChar first = value.at(0);
            const QChar last = value.at(value.size() - 1);
            if ((first == QLatin1Char('"') && last == QLatin1Char('"')) ||
                (first == QLatin1Char('\'') && last == QLatin1Char('\'')) ||
                (first == QLatin1Char('`') && last == QLatin1Char('`'))) {
                return value.mid(1, value.size() - 2);
            }
        }
        return value;
    }

    static QString interpolate(QString value, const QString &variable, const QString &loopValue)
    {
        static const QRegularExpression rx(QStringLiteral("\\$\\{\\s*([^}]+?)\\s*\\}"));
        QRegularExpressionMatchIterator it = rx.globalMatch(value);
        int offset = 0;
        while (it.hasNext()) {
            const QRegularExpressionMatch match = it.next();
            const QString replacement = resolveLoopExpression(match.captured(1).trimmed(), variable, loopValue);
            value.replace(match.capturedStart(0) + offset, match.capturedLength(0), replacement);
            offset += replacement.size() - match.capturedLength(0);
        }
        return value;
    }

    static QString resolveLoopExpression(QString expression, const QString &variable, const QString &loopValue)
    {
        expression = expression.trimmed();
        if (expression.startsWith(QStringLiteral("this."))) {
            expression = expression.mid(5).trimmed();
        }
        if (expression == variable) {
            return normalizeLoopValue(loopValue);
        }
        const QString prefix = variable + QLatin1Char('.');
        if (!expression.startsWith(prefix)) {
            return QStringLiteral("${") + expression + QStringLiteral("}");
        }
        const QString fieldPath = expression.mid(prefix.size()).trimmed();
        if (fieldPath.isEmpty()) {
            return QString();
        }
        QHTMLJsonDocument document(loopValue);
        return document.valueAtPath(fieldPath);
    }

    QString renderNodeForValue(QHTMLNode *node, const QString &variable, const QString &loopValue) const
    {
        if (!node) {
            return QString();
        }
        if (QHTMLTextFragment *text = dynamic_cast<QHTMLTextFragment *>(node)) {
            return escapeText(interpolate(text->value(), variable, loopValue));
        }
        if (QHTMLHTMLFragment *html = dynamic_cast<QHTMLHTMLFragment *>(node)) {
            return interpolate(html->value(), variable, loopValue);
        }
        if (QHTMLUnknownFragment *unknown = dynamic_cast<QHTMLUnknownFragment *>(node)) {
            return escapeText(interpolate(unknown->value(), variable, loopValue));
        }
        if (QHTMLDomElement *element = dynamic_cast<QHTMLDomElement *>(node)) {
            QString out = QStringLiteral("<") + element->tagName();
            const QHash<QString, QString> localAttributes = element->attributes();
            const QStringList keys = localAttributes.keys();
            for (const QString &key : keys) {
                const QString attrValue = localAttributes.value(key);
                if (!attrValue.isEmpty()) {
                    out += QStringLiteral(" ") + key + QStringLiteral("=\"") + escapeAttribute(interpolate(attrValue, variable, loopValue)) + QStringLiteral("\"");
                }
            }
            out += QStringLiteral(" qhtml-node=\"") + escapeAttribute(element->qhtmlUUID()) + QStringLiteral("\"");
            out += QStringLiteral(" qhtml-model-view-node=\"") + escapeAttribute(qhtmlUUID()) + QStringLiteral("\"");
            out += QStringLiteral(">");
            for (QHTMLNode *child : element->children()) {
                out += renderNodeForValue(child, variable, loopValue);
            }
            out += QStringLiteral("</") + element->tagName() + QStringLiteral(">");
            return out;
        }

        QString html = node->renderHtml();
        html = interpolate(html, variable, loopValue);
        return addModelViewMetadataToHtml(html);
    }

    QString addModelViewMetadataToHtml(QString html) const
    {
        static const QRegularExpression tagRx(QStringLiteral("<([A-Za-z][A-Za-z0-9_+\\-]*)([^>]*)>"));
        int offset = 0;
        QRegularExpressionMatchIterator it = tagRx.globalMatch(html);
        while (it.hasNext()) {
            const QRegularExpressionMatch match = it.next();
            if (match.captured(0).contains(QStringLiteral(" qhtml-model-view-node="))) {
                continue;
            }
            const int insertAt = match.capturedStart(2) + offset;
            const QString attribute = QStringLiteral(" qhtml-model-view-node=\"") + escapeAttribute(qhtmlUUID()) + QStringLiteral("\"");
            html.insert(insertAt, attribute);
            offset += attribute.size();
        }
        return html;
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
    void resolveComponentExtends();
    void resolveComponentExtendsFor(QHTMLComponentDefinition *definition,
                                    QSet<QString> &resolving,
                                    QSet<QString> &resolved);
    void mergeInheritedComponentMembers(QHTMLComponentDefinition *definition,
                                        const QVector<QHTMLComponentDefinition *> &bases);
    void instantiateStyleThemeApplications();
    void instantiateStyleThemeApplicationsFor(QHTMLNode *scope);
    void instantiateComponents();
    void instantiateComponentsFor(QHTMLNode *scope);
    void bindComponentMembers();
    void bindComponentMembersFor(QHTMLNode *scope);
    void ensureReadySignal(QHTMLNode *scope);
    void bindLocalReferences(QHTMLNode *scope);
    void cloneDefinitionMembers(QHTMLComponentInstance *instance);
    bool hasLocalReference(QHTMLNode *scope, const QString &name) const;
    QHTMLComponentDefinition *resolveComponentDefinition(QHTMLNode *scope, const QString &path) const;
    QHTMLStyle *resolveStyle(QHTMLNode *scope, const QString &path) const;
    QHTMLTheme *resolveTheme(QHTMLNode *scope, const QString &path) const;
    QHTMLNode *resolveDotPath(QHTMLNode *scope, const QString &path) const;
    QHTMLNode *componentInstanceFrom(QHTMLTypedNode *node, QHTMLComponentDefinition *definition) const;
    QHTMLNode *anonymousComponentInstanceFrom(QHTMLDomElement *node, QHTMLComponentDefinition *definition) const;
    QHTMLNode *styleApplicationFrom(QHTMLDomElement *node, QHTMLStyle *style) const;
    QHTMLNode *themeApplicationFrom(QHTMLDomElement *node, QHTMLTheme *theme) const;
    static void moveChildren(QHTMLNode *from, QHTMLNode *to);
};
