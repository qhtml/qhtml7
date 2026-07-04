#pragma once

#include <QtCore/QHash>
#include <QtCore/QList>
#include <QtCore/QSet>
#include <QtCore/QString>
#include <QtCore/QStringList>
#include <QtCore/QUuid>
#include <QtCore/QVector>

#include <string>

class QHTMLAstNode;

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

    QHTMLReference *resolve(const QString &key) const
    {
        if (m_references.contains(key)) {
            return m_references.value(key);
        }
        return m_parentContext ? m_parentContext->resolve(key) : nullptr;
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

    QHTMLReference *resolve(const QString &key) const
    {
        return qhtmlContext ? qhtmlContext->resolve(key) : nullptr;
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

    QString renderHtml() const override
    {
        return QHTMLDomNode::renderHtml();
    }

private:
    QString m_keyword;
    QHash<QString, QString> m_attributes;
};

class QHTMLComponentDefinition final : public QHTMLTypedNode
{
public:
    explicit QHTMLComponentDefinition(const QString &name = QString(),
                                      const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-component"), name, attributes)
    {
        setProperty(QStringLiteral("kind"), QStringLiteral("component-definition"));
    }
};

class QHTMLComponentInstance final : public QHTMLTypedNode
{
public:
    explicit QHTMLComponentInstance(const QString &name = QString(),
                                    const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-component-instance"), name, attributes)
    {
        setProperty(QStringLiteral("kind"), QStringLiteral("component-instance"));
    }
};

class QHTMLProperty final : public QHTMLTypedNode
{
public:
    explicit QHTMLProperty(const QString &name = QString(),
                           const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-property"), name, attributes)
    {
    }
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

class QHTMLSignal final : public QHTMLTypedNode
{
public:
    explicit QHTMLSignal(const QString &name = QString(),
                         const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-signal"), name, attributes)
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
    }

    void loadFromAST(QHTMLAstNode *astRoot);
    void clear() { clearChildren(); }
    QHTMLNode *root() { return this; }
    QHTMLNode *rootJs() { return this; }
};

