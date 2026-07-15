#pragma once

#include <QtCore/QHash>
#include <QtCore/QByteArray>
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
#include <QtCore/QtMath>

#include <emscripten/bind.h>

#include <algorithm>
#include <cstring>
#include <string>

#if defined(QHTML_QUICKJS_ENABLED)
extern "C" {
#include "quickjs.h"
}
#endif

inline constexpr const char QHTML_VERSION[] = "v7.3.7";
inline constexpr int QHTML_QUICKJS_SIZE_BUDGET_BYTES = 614400;

inline std::string qhtmlVersionJs()
{
    return std::string(QHTML_VERSION);
}

inline QString qhtmlCssShortcutPropertyName(const QString &name)
{
    static const QHash<QString, QString> cssShortcuts = {
        {QStringLiteral("alignContent"), QStringLiteral("align-content")},
        {QStringLiteral("alignItems"), QStringLiteral("align-items")},
        {QStringLiteral("alignSelf"), QStringLiteral("align-self")},
        {QStringLiteral("aspectRatio"), QStringLiteral("aspect-ratio")},
        {QStringLiteral("background"), QStringLiteral("background")},
        {QStringLiteral("backgroundColor"), QStringLiteral("background-color")},
        {QStringLiteral("backgroundImage"), QStringLiteral("background-image")},
        {QStringLiteral("backgroundPosition"), QStringLiteral("background-position")},
        {QStringLiteral("backgroundRepeat"), QStringLiteral("background-repeat")},
        {QStringLiteral("backgroundSize"), QStringLiteral("background-size")},
        {QStringLiteral("borderColor"), QStringLiteral("border-color")},
        {QStringLiteral("borderRadius"), QStringLiteral("border-radius")},
        {QStringLiteral("borderStyle"), QStringLiteral("border-style")},
        {QStringLiteral("borderWidth"), QStringLiteral("border-width")},
        {QStringLiteral("bottom"), QStringLiteral("bottom")},
        {QStringLiteral("boxShadow"), QStringLiteral("box-shadow")},
        {QStringLiteral("boxSizing"), QStringLiteral("box-sizing")},
        {QStringLiteral("color"), QStringLiteral("color")},
        {QStringLiteral("columnGap"), QStringLiteral("column-gap")},
        {QStringLiteral("cursor"), QStringLiteral("cursor")},
        {QStringLiteral("display"), QStringLiteral("display")},
        {QStringLiteral("filter"), QStringLiteral("filter")},
        {QStringLiteral("flex"), QStringLiteral("flex")},
        {QStringLiteral("flexBasis"), QStringLiteral("flex-basis")},
        {QStringLiteral("flexDirection"), QStringLiteral("flex-direction")},
        {QStringLiteral("flexGrow"), QStringLiteral("flex-grow")},
        {QStringLiteral("flexShrink"), QStringLiteral("flex-shrink")},
        {QStringLiteral("flexWrap"), QStringLiteral("flex-wrap")},
        {QStringLiteral("fontFamily"), QStringLiteral("font-family")},
        {QStringLiteral("fontSize"), QStringLiteral("font-size")},
        {QStringLiteral("fontStyle"), QStringLiteral("font-style")},
        {QStringLiteral("fontWeight"), QStringLiteral("font-weight")},
        {QStringLiteral("gap"), QStringLiteral("gap")},
        {QStringLiteral("gridArea"), QStringLiteral("grid-area")},
        {QStringLiteral("gridColumn"), QStringLiteral("grid-column")},
        {QStringLiteral("gridRow"), QStringLiteral("grid-row")},
        {QStringLiteral("height"), QStringLiteral("height")},
        {QStringLiteral("justifyContent"), QStringLiteral("justify-content")},
        {QStringLiteral("justifyItems"), QStringLiteral("justify-items")},
        {QStringLiteral("justifySelf"), QStringLiteral("justify-self")},
        {QStringLiteral("left"), QStringLiteral("left")},
        {QStringLiteral("letterSpacing"), QStringLiteral("letter-spacing")},
        {QStringLiteral("lineHeight"), QStringLiteral("line-height")},
        {QStringLiteral("listStyle"), QStringLiteral("list-style")},
        {QStringLiteral("listStyleType"), QStringLiteral("list-style-type")},
        {QStringLiteral("margin"), QStringLiteral("margin")},
        {QStringLiteral("marginBottom"), QStringLiteral("margin-bottom")},
        {QStringLiteral("marginLeft"), QStringLiteral("margin-left")},
        {QStringLiteral("marginRight"), QStringLiteral("margin-right")},
        {QStringLiteral("marginTop"), QStringLiteral("margin-top")},
        {QStringLiteral("maxHeight"), QStringLiteral("max-height")},
        {QStringLiteral("maxWidth"), QStringLiteral("max-width")},
        {QStringLiteral("minHeight"), QStringLiteral("min-height")},
        {QStringLiteral("minWidth"), QStringLiteral("min-width")},
        {QStringLiteral("objectFit"), QStringLiteral("object-fit")},
        {QStringLiteral("objectPosition"), QStringLiteral("object-position")},
        {QStringLiteral("opacity"), QStringLiteral("opacity")},
        {QStringLiteral("order"), QStringLiteral("order")},
        {QStringLiteral("overflow"), QStringLiteral("overflow")},
        {QStringLiteral("overflowX"), QStringLiteral("overflow-x")},
        {QStringLiteral("overflowY"), QStringLiteral("overflow-y")},
        {QStringLiteral("padding"), QStringLiteral("padding")},
        {QStringLiteral("paddingBottom"), QStringLiteral("padding-bottom")},
        {QStringLiteral("paddingLeft"), QStringLiteral("padding-left")},
        {QStringLiteral("paddingRight"), QStringLiteral("padding-right")},
        {QStringLiteral("paddingTop"), QStringLiteral("padding-top")},
        {QStringLiteral("pointerEvents"), QStringLiteral("pointer-events")},
        {QStringLiteral("position"), QStringLiteral("position")},
        {QStringLiteral("right"), QStringLiteral("right")},
        {QStringLiteral("rowGap"), QStringLiteral("row-gap")},
        {QStringLiteral("textAlign"), QStringLiteral("text-align")},
        {QStringLiteral("textDecoration"), QStringLiteral("text-decoration")},
        {QStringLiteral("textOverflow"), QStringLiteral("text-overflow")},
        {QStringLiteral("textTransform"), QStringLiteral("text-transform")},
        {QStringLiteral("top"), QStringLiteral("top")},
        {QStringLiteral("transform"), QStringLiteral("transform")},
        {QStringLiteral("transformOrigin"), QStringLiteral("transform-origin")},
        {QStringLiteral("transition"), QStringLiteral("transition")},
        {QStringLiteral("visibility"), QStringLiteral("visibility")},
        {QStringLiteral("whiteSpace"), QStringLiteral("white-space")},
        {QStringLiteral("width"), QStringLiteral("width")},
        {QStringLiteral("wordBreak"), QStringLiteral("word-break")},
        {QStringLiteral("x"), QStringLiteral("left")},
        {QStringLiteral("y"), QStringLiteral("top")},
        {QStringLiteral("zIndex"), QStringLiteral("z-index")}
    };

    const QString trimmed = name.trimmed();
    if (cssShortcuts.contains(trimmed)) {
        return cssShortcuts.value(trimmed);
    }

    const QString lower = trimmed.toLower();
    for (auto it = cssShortcuts.constBegin(); it != cssShortcuts.constEnd(); ++it) {
        if (it.key().toLower() == lower || it.value().toLower() == lower) {
            return it.value();
        }
    }
    return QString();
}

inline bool qhtmlIsCssShortcutProperty(const QString &name)
{
    return !qhtmlCssShortcutPropertyName(name).isEmpty();
}

inline QString qhtmlScalarValue(QString value)
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

inline QString qhtmlJsStringLiteral(const QString &value)
{
    QJsonArray array;
    array.append(value);
    QString json = QString::fromUtf8(QJsonDocument(array).toJson(QJsonDocument::Compact));
    if (json.startsWith(QLatin1Char('[')) && json.endsWith(QLatin1Char(']'))) {
        return json.mid(1, json.size() - 2);
    }
    return QStringLiteral("\"\"");
}

inline QString qhtmlScriptBody(QString value)
{
    value.replace(QStringLiteral("</script"), QStringLiteral("<\\/script"), Qt::CaseInsensitive);
    return value;
}

class QHTMLAstNode;
class QHTMLFunction;
class QHTMLSignal;
class QHTMLSignalBus;
class QHTMLComponentSlot;
class QHTMLComponentInstance;
class QHTMLComponentInstanceSlot;
class QHTMLWorker;
class QHTMLStyle;
class QHTMLTheme;
class QHTMLImportNode;
class QHTMLPainter;
class QHTMLCanvas;
class QHTMLVideo;
class QHTMLVideoAsset;
class QHTMLVideoPlayer;
class QHTMLParticleEmitter;
class QHTMLNode;
class QHTMLJavaScriptRuntime;

inline QString qhtmlInterpolateTextForContext(QString value, const QHTMLNode *contextNode);
inline QString qhtmlResolvePropertyValue(QString rawValue, const QHTMLNode *contextNode, QSet<QString> &resolving, int depth);
inline QString qhtmlResolveCssValueForContext(QString value, const QHTMLNode *contextNode);

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
    virtual QHTMLJavaScriptRuntime *javascriptRuntime() const
    {
        return qhtmlParent ? qhtmlParent->javascriptRuntime() : nullptr;
    }

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

    QHTMLNode *takeChildAt(int index)
    {
        QHTMLNode *child = qhtmlChildren.take(index);
        if (!child) {
            return nullptr;
        }

        QHash<int, QHTMLNode *> compacted;
        int outIndex = 0;
        for (int i = 0; i <= qhtmlChildren.size(); ++i) {
            if (QHTMLNode *existing = qhtmlChildren.value(i, nullptr)) {
                compacted.insert(outIndex++, existing);
            }
        }
        qhtmlChildren = compacted;
        child->qhtmlParent = nullptr;
        if (child->qhtmlContext) {
            child->qhtmlContext->setParentContext(nullptr);
        }
        return child;
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

    void insertChild(int index, QHTMLNode *child)
    {
        if (!child) {
            return;
        }
        const int boundedIndex = qBound(0, index, qhtmlChildren.size());
        QHash<int, QHTMLNode *> shifted;
        for (int i = 0; i < qhtmlChildren.size(); ++i) {
            if (QHTMLNode *existing = qhtmlChildren.value(i, nullptr)) {
                shifted.insert(i < boundedIndex ? i : i + 1, existing);
            }
        }
        child->qhtmlParent = this;
        if (child->qhtmlContext) {
            child->qhtmlContext->setParentContext(qhtmlContext);
        }
        shifted.insert(boundedIndex, child);
        qhtmlChildren = shifted;
    }

    void appendChildJs(QHTMLNode *child) { appendChild(child); }
    void insertChildJs(int index, QHTMLNode *child) { insertChild(index, child); }

    bool removeChildAt(int index)
    {
        delete takeChildAt(index);
        return true;
    }

    bool removeChildAtJs(int index) { return removeChildAt(index); }

    void clearChildren()
    {
        qDeleteAll(qhtmlChildren);
        qhtmlChildren.clear();
    }

    void clearChildrenJs() { clearChildren(); }

    int appendQHTMLSource(const QString &source);
    int appendQHTMLSourceJs(const std::string &source) { return appendQHTMLSource(QString::fromStdString(source)); }
    int insertQHTMLSource(int index, const QString &source);
    int insertQHTMLSourceJs(int index, const std::string &source) { return insertQHTMLSource(index, QString::fromStdString(source)); }
    int replaceChildWithQHTMLSource(int index, const QString &source);
    int replaceChildWithQHTMLSourceJs(int index, const std::string &source)
    {
        return replaceChildWithQHTMLSource(index, QString::fromStdString(source));
    }
    QString evaluateExpression(const QString &expression) const;
    std::string evaluateExpressionJs(const std::string &expression) const
    {
        return evaluateExpression(QString::fromStdString(expression)).toStdString();
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

    virtual QString sourceQHTML(int indentLevel = 0) const
    {
        QString out;
        for (QHTMLNode *child : children()) {
            if (!out.isEmpty()) {
                out += QLatin1Char('\n');
            }
            out += child->sourceQHTML(indentLevel);
        }
        return out;
    }

    std::string sourceQHTMLJs() const { return sourceQHTML().toStdString(); }

    QString toQHTML(int indentLevel = 0) const { return sourceQHTML(indentLevel); }
    std::string toQHTMLJs() const { return toQHTML().toStdString(); }
    int fromQHTML(const QString &source);
    int fromQHTMLJs(const std::string &source) { return fromQHTML(QString::fromStdString(source)); }

    QString toHTML() const;
    std::string toHTMLJs() const { return toHTML().toStdString(); }

    QJsonValue toJsonValue() const;
    QJsonObject toJsonObject() const;
    QString toJSONText() const;
    std::string toJSONTextJs() const { return toJSONText().toStdString(); }
    emscripten::val toJSONJs() const;
    bool fromJsonValue(const QJsonValue &value);
    bool fromJsonObject(const QJsonObject &object);
    bool fromJSONText(const QString &json);
    bool fromJSONTextJs(const std::string &json) { return fromJSONText(QString::fromStdString(json)); }
    bool fromJSONJs(emscripten::val value);

    static QHTMLNode *nodeFromJsonObject(const QJsonObject &object, QHTMLNode *ownerScope = nullptr);

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

    static QString sourceIndent(int indentLevel)
    {
        return QString(qMax(0, indentLevel) * 2, QLatin1Char(' '));
    }

    static QString sourceQuote(QString value)
    {
        value.replace(QLatin1Char('\\'), QStringLiteral("\\\\"));
        value.replace(QLatin1Char('"'), QStringLiteral("\\\""));
        return QStringLiteral("\"") + value + QStringLiteral("\"");
    }

    static QString sourceBlock(const QString &header, const QString &body, int indentLevel)
    {
        const QString pad = sourceIndent(indentLevel);
        const QString trimmedBody = body.trimmed();
        if (trimmedBody.isEmpty()) {
            return pad + header + QStringLiteral(" { }");
        }
        QString out = pad + header + QStringLiteral(" {\n");
        const QStringList lines = trimmedBody.split(QLatin1Char('\n'));
        for (const QString &line : lines) {
            out += sourceIndent(indentLevel + 1) + line + QLatin1Char('\n');
        }
        out += pad + QStringLiteral("}");
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
    void setTagName(const QString &tagName)
    {
        m_tagName = tagName.trimmed();
        setQHTMLName(m_tagName);
    }
    void setTagNameJs(const std::string &tagName) { setTagName(QString::fromStdString(tagName)); }

    void clearAttributes() { m_attributes.clear(); }
    void setAttributes(const QHash<QString, QString> &attributes) { m_attributes = attributes; }

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

    QString inlineStyleForContext(const QHTMLNode *contextNode) const;
    QString assignmentAttributesForContext(const QHTMLNode *contextNode) const;

    QString renderHtml() const override
    {
        return renderHtmlForContext(nullptr);
    }

    QString renderHtmlInContext(const QHTMLNode *contextNode) const override
    {
        return renderHtmlForContext(contextNode);
    }

    QString sourceQHTML(int indentLevel = 0) const override
    {
        QString header = m_tagName;
        const QString id = m_attributes.value(QStringLiteral("id")).trimmed();
        const QString klass = m_attributes.value(QStringLiteral("class")).trimmed();
        if (!id.isEmpty()) {
            header += QStringLiteral("#") + id;
        }
        if (!klass.isEmpty()) {
            for (const QString &part : klass.split(QRegularExpression(QStringLiteral("\\s+")), Qt::SkipEmptyParts)) {
                header += QStringLiteral(".") + part;
            }
        }

        QStringList lines;
        const QStringList keys = m_attributes.keys();
        for (const QString &key : keys) {
            if (key == QStringLiteral("id") || key == QStringLiteral("class")) {
                continue;
            }
            lines.append(key + QStringLiteral(": ") + sourceQuote(m_attributes.value(key)));
        }
        for (QHTMLNode *child : children()) {
            lines.append(child->sourceQHTML(0));
        }
        return sourceBlock(header, lines.join(QLatin1Char('\n')), indentLevel);
    }

private:
    QString renderHtmlForContext(const QHTMLNode *contextNode) const
    {
        if (m_tagName.trimmed().isEmpty()) {
            return QHTMLDomNode::renderHtml();
        }

        QString out = QStringLiteral("<") + m_tagName;
        const QHTMLNode *childContext = contextNode ? contextNode : this;
        const QStringList keys = m_attributes.keys();
        for (const QString &key : keys) {
            if (key == QStringLiteral("style")) {
                continue;
            }
            const QString value = m_attributes.value(key);
            if (!value.isEmpty()) {
                out += QStringLiteral(" ") + key + QStringLiteral("=\"") +
                       escapeAttribute(qhtmlInterpolateTextForContext(value, childContext)) +
                       QStringLiteral("\"");
            }
        }
        out += assignmentAttributesForContext(childContext);
        const QString inlineStyle = inlineStyleForContext(childContext);
        if (!inlineStyle.trimmed().isEmpty()) {
            out += QStringLiteral(" style=\"") + escapeAttribute(inlineStyle) + QStringLiteral("\"");
        }
        out += QStringLiteral(" qhtml-node=\"") + escapeAttribute(qhtmlUUID()) + QStringLiteral("\"");
        out += QStringLiteral(">");
        for (QHTMLNode *child : children()) {
            out += child->renderHtmlInContext(childContext);
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
    void setValue(const QString &value) { m_value = value; }
    void setValueJs(const std::string &value) { setValue(QString::fromStdString(value)); }
    QString renderHtml() const override { return escapeText(m_value); }
    QString renderHtmlInContext(const QHTMLNode *contextNode) const override
    {
        return escapeText(qhtmlInterpolateTextForContext(m_value, contextNode));
    }
    QString sourceQHTML(int indentLevel = 0) const override
    {
        return sourceBlock(QStringLiteral("text"), m_value, indentLevel);
    }

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
    void setValue(const QString &value) { m_value = value; }
    void setValueJs(const std::string &value) { setValue(QString::fromStdString(value)); }
    QString renderHtml() const override { return m_value; }
    QString renderHtmlInContext(const QHTMLNode *contextNode) const override
    {
        return qhtmlInterpolateTextForContext(m_value, contextNode);
    }
    QString sourceQHTML(int indentLevel = 0) const override
    {
        return sourceBlock(QStringLiteral("html"), m_value, indentLevel);
    }

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
    void setValue(const QString &value) { m_value = value.trimmed(); }
    void setValueJs(const std::string &value) { setValue(QString::fromStdString(value)); }
    QString renderHtml() const override { return escapeText(m_value); }
    QString renderHtmlInContext(const QHTMLNode *contextNode) const override
    {
        return escapeText(qhtmlInterpolateTextForContext(m_value, contextNode));
    }
    QString sourceQHTML(int indentLevel = 0) const override
    {
        return sourceBlock(qhtmlName().isEmpty() ? qhtmlType() : qhtmlName(), m_value, indentLevel);
    }

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
    void setKeyword(const QString &keyword)
    {
        m_keyword = keyword.trimmed();
        setProperty(QStringLiteral("keyword"), m_keyword);
    }
    void setKeywordJs(const std::string &keyword) { setKeyword(QString::fromStdString(keyword)); }
    QHash<QString, QString> attributes() const { return m_attributes; }
    QString attribute(const QString &key) const { return m_attributes.value(key); }
    std::string attributeJs(const std::string &key) const
    {
        return attribute(QString::fromStdString(key)).toStdString();
    }
    void clearAttributes() { m_attributes.clear(); }
    void setAttributes(const QHash<QString, QString> &attributes) { m_attributes = attributes; }

    void setAttribute(const QString &key, const QString &value)
    {
        if (!key.trimmed().isEmpty()) {
            m_attributes.insert(key, value);
        }
    }

    QString renderHtml() const override
    {
        if (m_keyword == QStringLiteral("q-var") ||
            m_keyword == QStringLiteral("q-callback") ||
            m_keyword == QStringLiteral("q-macro") ||
            m_keyword == QStringLiteral("q-rewrite") ||
            m_keyword == QStringLiteral("q-switch")) {
            return QString();
        }
        return QHTMLDomNode::renderHtml();
    }

    QString sourceQHTML(int indentLevel = 0) const override
    {
        QString header = m_keyword;
        if (!qhtmlName().trimmed().isEmpty()) {
            header += QLatin1Char(' ') + qhtmlName().trimmed();
        }

        QStringList lines;
        const QStringList keys = m_attributes.keys();
        for (const QString &key : keys) {
            const QString value = m_attributes.value(key);
            if (!key.trimmed().isEmpty() && !value.isEmpty()) {
                lines.append(key + QStringLiteral(": ") + sourceQuote(value));
            }
        }
        for (QHTMLNode *child : children()) {
            lines.append(child->sourceQHTML(0));
        }
        return sourceBlock(header, lines.join(QLatin1Char('\n')), indentLevel);
    }

private:
    QString m_keyword;
    QHash<QString, QString> m_attributes;
};

class QHTMLJavaScriptBlock final : public QHTMLDomNode
{
public:
    explicit QHTMLJavaScriptBlock(const QString &contents = QString())
        : QHTMLDomNode(QStringLiteral("QHTMLJavaScriptBlock"), QStringLiteral("script")),
          m_contents(contents.trimmed())
    {
    }

    QString contents() const { return m_contents; }
    QString body() const { return m_contents; }
    QString value() const { return m_contents; }
    std::string contentsJs() const { return m_contents.toStdString(); }
    void setContents(const QString &contents) { m_contents = contents.trimmed(); }
    void setContentsJs(const std::string &contents) { setContents(QString::fromStdString(contents)); }

    QString renderHtml() const override { return QString(); }
    QString sourceQHTML(int indentLevel = 0) const override
    {
        const QString pad = sourceIndent(indentLevel);
        QString out;
        const QStringList lines = m_contents.split(QLatin1Char('\n'));
        for (const QString &line : lines) {
            if (!out.isEmpty()) {
                out += QLatin1Char('\n');
            }
            out += pad + line;
        }
        return out;
    }

private:
    QString m_contents;
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
    void setParameters(const QStringList &parameters)
    {
        m_parameters = parameters;
        setAttribute(QStringLiteral("parameters"), parameterList());
    }
    void setParameterList(const QString &parameters) { setParameters(parseParameters(parameters)); }
    void setParameterListJs(const std::string &parameters) { setParameterList(QString::fromStdString(parameters)); }

    QString body() const { return m_body; }
    std::string bodyJs() const { return m_body.toStdString(); }
    void setBody(const QString &body) { m_body = body.trimmed(); }
    void setBodyJs(const std::string &body) { setBody(QString::fromStdString(body)); }

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
    QString sourceQHTML(int indentLevel = 0) const override
    {
        return sourceBlock(QStringLiteral("function ") + qhtmlName() + QStringLiteral("(") + parameterList() + QStringLiteral(")"),
                           m_body,
                           indentLevel);
    }

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
    void setParameters(const QStringList &parameters)
    {
        m_parameters = parameters;
        setAttribute(QStringLiteral("parameters"), parameterList());
    }
    void setParameterList(const QString &parameters) { setParameters(QHTMLFunction::parseParameters(parameters)); }
    void setParameterListJs(const std::string &parameters) { setParameterList(QString::fromStdString(parameters)); }

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
    QString sourceQHTML(int indentLevel = 0) const override
    {
        return sourceIndent(indentLevel) + QStringLiteral("q-signal ") + qhtmlName() +
               QStringLiteral("(") + parameterList() + QStringLiteral(")");
    }

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
    QString renderHtmlInContext(const QHTMLNode *contextNode) const override;
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
    QString sourceQHTML(int indentLevel = 0) const override
    {
        QStringList lines;
        for (QHTMLNode *child : children()) {
            lines.append(child->sourceQHTML(0));
        }
        return sourceBlock(QStringLiteral("q-slot-default ") + qhtmlName(), lines.join(QLatin1Char('\n')), indentLevel);
    }
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
    void setValue(const QString &value)
    {
        m_value = value;
        setAttribute(QStringLiteral("value"), value);
    }
    void setValueJs(const std::string &value) { setValue(QString::fromStdString(value)); }
    QHTMLPropertyAssignment *cloneAssignment() const
    {
        QHash<QString, QString> clonedAttributes = attributes();
        clonedAttributes.insert(QStringLiteral("value"), m_value);
        return new QHTMLPropertyAssignment(qhtmlName(), clonedAttributes);
    }
    QString renderHtml() const override { return QString(); }
    QString sourceQHTML(int indentLevel = 0) const override
    {
        return sourceIndent(indentLevel) + qhtmlName() + QStringLiteral(": ") + m_value;
    }

private:
    QString m_value;
};

inline QString QHTMLDomElement::inlineStyleForContext(const QHTMLNode *contextNode) const
{
    const QHTMLNode *childContext = contextNode ? contextNode : this;
    QStringList declarations;
    const QString existingStyle = m_attributes.value(QStringLiteral("style")).trimmed();
    if (!existingStyle.isEmpty()) {
        declarations << qhtmlInterpolateTextForContext(existingStyle, childContext);
    }
    QSet<QString> emitted;
    for (QHTMLNode *child : children()) {
        QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child);
        if (!assignment) {
            continue;
        }
        const QString cssName = qhtmlCssShortcutPropertyName(assignment->qhtmlName());
        if (cssName.isEmpty() || emitted.contains(cssName)) {
            continue;
        }
        declarations << cssName + QStringLiteral(":") +
                            qhtmlResolveCssValueForContext(assignment->value(), childContext);
        emitted.insert(cssName);
    }
    return declarations.join(QStringLiteral(";"));
}

inline QString QHTMLDomElement::assignmentAttributesForContext(const QHTMLNode *contextNode) const
{
    const QHTMLNode *childContext = contextNode ? contextNode : this;
    QSet<QString> declaredProperties;
    for (QHTMLNode *child : children()) {
        if (child && child->qhtmlType() == QStringLiteral("QHTMLProperty") && !child->qhtmlName().trimmed().isEmpty()) {
            declaredProperties.insert(child->qhtmlName().trimmed().toLower());
        }
    }

    QSet<QString> emitted;
    for (const QString &key : m_attributes.keys()) {
        emitted.insert(key.toLower());
    }

    QString out;
    for (QHTMLNode *child : children()) {
        QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child);
        if (!assignment) {
            continue;
        }
        const QString name = assignment->qhtmlName().trimmed();
        const QString lowerName = name.toLower();
        if (name.isEmpty() ||
            emitted.contains(lowerName) ||
            declaredProperties.contains(lowerName) ||
            qhtmlIsCssShortcutProperty(name) ||
            lowerName == QStringLiteral("style")) {
            continue;
        }
        out += QStringLiteral(" ") + name + QStringLiteral("=\"") +
               escapeAttribute(qhtmlInterpolateTextForContext(qhtmlScalarValue(assignment->value()), childContext)) +
               QStringLiteral("\"");
        emitted.insert(lowerName);
    }
    return out;
}

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

    QHTMLLayout *addRow(QHTMLLayout *row)
    {
        if (row) {
            appendChild(row);
            refreshLayoutContextReferences();
        }
        return row;
    }

    QHTMLLayout *addRowJs(QHTMLLayout *row) { return addRow(row); }

    QHTMLLayout *addCol(QHTMLLayout *col)
    {
        if (col) {
            appendChild(col);
            refreshLayoutContextReferences();
        }
        return col;
    }

    QHTMLLayout *addColJs(QHTMLLayout *col) { return addCol(col); }

    QHTMLLayout *addLayout(QHTMLLayout *layout)
    {
        if (layout) {
            appendChild(layout);
            refreshLayoutContextReferences();
        }
        return layout;
    }

    QHTMLLayout *addLayoutJs(QHTMLLayout *layout) { return addLayout(layout); }

    QHTMLLayout *insertRow(int index, const QHash<QString, QString> &attributes = {})
    {
        QHTMLLayout *row = new QHTMLLayout(QStringLiteral("q-row"),
                                           QString(),
                                           attributes,
                                           QStringLiteral("row"),
                                           QStringLiteral("QHTMLRowLayout"));
        row->setProperty(QStringLiteral("kind"), QStringLiteral("row-layout"));
        insertChild(index, row);
        refreshLayoutContextReferences();
        return row;
    }

    QHTMLLayout *insertRowJs(int index, emscripten::val attributes)
    {
        return insertRow(index, attributesFromJs(attributes));
    }

    QHTMLLayout *insertCol(int index, const QHash<QString, QString> &attributes = {})
    {
        QHTMLLayout *col = new QHTMLLayout(QStringLiteral("q-col"),
                                           QString(),
                                           attributes,
                                           QStringLiteral("column"),
                                           QStringLiteral("QHTMLColumnLayout"));
        col->setProperty(QStringLiteral("kind"), QStringLiteral("column-layout"));
        insertChild(index, col);
        refreshLayoutContextReferences();
        return col;
    }

    QHTMLLayout *insertColJs(int index, emscripten::val attributes)
    {
        return insertCol(index, attributesFromJs(attributes));
    }

    int rows() const { return assignmentIntValue(QStringLiteral("rows"), 0); }
    int rowsJs() const { return rows(); }
    int cols() const { return assignmentIntValue(QStringLiteral("cols"), 0); }
    int colsJs() const { return cols(); }

    QVector<QHTMLNode *> layoutChildren() const
    {
        QVector<QHTMLNode *> out;
        for (QHTMLNode *child : children()) {
            if (child && !isLayoutNode(child) && !isRuntimeLayoutChild(child)) {
                out.append(child);
            }
        }
        return out;
    }

    emscripten::val layoutChildrenJs() const
    {
        emscripten::val out = emscripten::val::array();
        int index = 0;
        for (QHTMLNode *child : layoutChildren()) {
            out.set(index++, child);
        }
        return out;
    }

    int layoutChildCount() const { return layoutChildren().size(); }
    int layoutChildCountJs() const { return layoutChildCount(); }

    QHTMLNode *layoutChildAt(int index) const
    {
        const QVector<QHTMLNode *> filtered = layoutChildren();
        return index >= 0 && index < filtered.size() ? filtered.at(index) : nullptr;
    }

    QHTMLNode *layoutChildAtJs(int index) const { return layoutChildAt(index); }

    void runtime() override
    {
        refreshLayoutContextReferences();
        QHTMLTypedNode::runtime();
    }

    QString renderHtml() const override
    {
        return renderHtmlForContext(nullptr);
    }

    QString renderHtmlInContext(const QHTMLNode *contextNode) const override
    {
        return renderHtmlForContext(contextNode);
    }

private:
    static QHash<QString, QString> attributesFromJs(emscripten::val attributes)
    {
        QHash<QString, QString> out;
        if (attributes.isUndefined() || attributes.isNull()) {
            return out;
        }
        emscripten::val keys = emscripten::val::global("Object").call<emscripten::val>("keys", attributes);
        const int length = keys["length"].as<int>();
        for (int i = 0; i < length; ++i) {
            const std::string key = keys[i].as<std::string>();
            const std::string value = attributes[key.c_str()].as<std::string>();
            out.insert(QString::fromStdString(key), QString::fromStdString(value));
        }
        return out;
    }

    QString renderHtmlForContext(const QHTMLNode *contextNode) const
    {
        QString out = QStringLiteral("<div qhtml-layout=\"") + escapeAttribute(keyword()) +
                      QStringLiteral("\" qhtml-node=\"") + escapeAttribute(qhtmlUUID()) +
                      QStringLiteral("\" class=\"") + escapeAttribute(layoutClass()) +
                      QStringLiteral("\" style=\"") + escapeAttribute(layoutStyle()) +
                      QStringLiteral("\"") + layoutAttributes(contextNode) + QStringLiteral(">");
        out += renderLayoutChildren(contextNode ? contextNode : this);
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

    int assignmentIntValue(const QString &name, int fallback = 0) const
    {
        bool ok = false;
        const int value = assignmentValue(name).toInt(&ok);
        return ok ? value : fallback;
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
        appendCssShortcutDeclarations(declarations);
        return declarations.join(QStringLiteral(";")) + QStringLiteral(";");
    }

    void appendCssShortcutDeclarations(QStringList &declarations) const
    {
        const QSet<QString> handled = {
            QStringLiteral("width"),
            QStringLiteral("height"),
            QStringLiteral("flex"),
            QStringLiteral("gap"),
            QStringLiteral("alignItems"),
            QStringLiteral("align-items"),
            QStringLiteral("justifyContent"),
            QStringLiteral("justify-content"),
            QStringLiteral("overflow"),
            QStringLiteral("padding"),
            QStringLiteral("margin"),
            QStringLiteral("rows"),
            QStringLiteral("cols"),
            QStringLiteral("class"),
            QStringLiteral("style")
        };
        QSet<QString> emitted;
        for (const QString &declaration : declarations) {
            const int colon = declaration.indexOf(QLatin1Char(':'));
            if (colon > 0) {
                emitted.insert(declaration.left(colon).trimmed());
            }
        }
        for (QHTMLNode *child : children()) {
            QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child);
            if (!assignment || handled.contains(assignment->qhtmlName())) {
                continue;
            }
            const QString cssName = qhtmlCssShortcutPropertyName(assignment->qhtmlName());
            if (cssName.isEmpty() || emitted.contains(cssName)) {
                continue;
            }
            declarations << cssName + QStringLiteral(":") + cssValue(assignment->value());
            emitted.insert(cssName);
        }
    }

    QString layoutAttributes(const QHTMLNode *contextNode) const
    {
        QString out;
        const QHTMLNode *childContext = contextNode ? contextNode : this;
        const QStringList layoutPropertyNames = {
            QStringLiteral("width"),
            QStringLiteral("height"),
            QStringLiteral("flex"),
            QStringLiteral("gap"),
            QStringLiteral("alignitems"),
            QStringLiteral("align-items"),
            QStringLiteral("justifycontent"),
            QStringLiteral("justify-content"),
            QStringLiteral("overflow"),
            QStringLiteral("padding"),
            QStringLiteral("margin"),
            QStringLiteral("rows"),
            QStringLiteral("cols"),
            QStringLiteral("class"),
            QStringLiteral("style")
        };

        for (QHTMLNode *child : children()) {
            QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child);
            if (!assignment) {
                continue;
            }
            const QString name = assignment->qhtmlName().trimmed();
            const QString lowerName = name.toLower();
            if (name.isEmpty() || layoutPropertyNames.contains(lowerName)) {
                continue;
            }
            if (!lowerName.startsWith(QStringLiteral("data-")) &&
                !lowerName.startsWith(QStringLiteral("aria-")) &&
                lowerName != QStringLiteral("id") &&
                lowerName != QStringLiteral("name") &&
                lowerName != QStringLiteral("role") &&
                lowerName != QStringLiteral("title") &&
                lowerName != QStringLiteral("tabindex")) {
                continue;
            }
            out += QStringLiteral(" ") + name + QStringLiteral("=\"") +
                   escapeAttribute(qhtmlInterpolateTextForContext(cssValue(assignment->value()), childContext)) +
                   QStringLiteral("\"");
        }
        return out;
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
        if (hasGeneratedGrid()) {
            return renderGeneratedGrid(contextNode);
        }
        return renderSequentialLayoutChildren(contextNode);
    }

    QString renderSequentialLayoutChildren(const QHTMLNode *contextNode) const
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

    bool hasGeneratedGrid() const
    {
        return rows() > 0 || cols() > 0;
    }

    QVector<QHTMLNode *> gridItems() const
    {
        QVector<QHTMLNode *> out;
        for (QHTMLNode *child : children()) {
            if (child && !isRuntimeLayoutChild(child)) {
                out.append(child);
            }
        }
        return out;
    }

    QString renderGeneratedGrid(const QHTMLNode *contextNode) const
    {
        const QVector<QHTMLNode *> items = gridItems();
        int rowCount = qMax(1, rows());
        int colCount = qMax(1, cols());
        if (rows() <= 0 && cols() > 0) {
            rowCount = qMax(1, qCeil(double(items.size()) / double(colCount)));
        }
        if (cols() <= 0 && rows() > 0) {
            colCount = qMax(1, qCeil(double(items.size()) / double(rowCount)));
        }

        QString out;
        int itemIndex = 0;
        for (int row = 0; row < rowCount; ++row) {
            out += layoutBoxHtml(QStringLiteral("q-row"),
                                 QStringLiteral("row"),
                                 QStringLiteral("qhtml-layout qhtml-layout-row"),
                                 generatedRowStyle());
            for (int col = 0; col < colCount; ++col) {
                QHTMLNode *item = itemIndex < items.size() ? items.at(itemIndex++) : nullptr;
                if (item && item->qhtmlType() == QStringLiteral("QHTMLColumnLayout")) {
                    out += item->renderHtmlInContext(contextNode);
                } else {
                    out += layoutBoxHtml(QStringLiteral("q-col"),
                                         QStringLiteral("column"),
                                         QStringLiteral("qhtml-layout qhtml-layout-col"),
                                         generatedColStyle());
                    if (item) {
                        out += QStringLiteral("<div qhtml-layout-item=\"1\" class=\"qhtml-layout-item\" style=\"") +
                               escapeAttribute(itemStyle()) + QStringLiteral("\">") +
                               item->renderHtmlInContext(contextNode) +
                               QStringLiteral("</div>");
                    }
                    out += QStringLiteral("</div>");
                }
            }
            out += QStringLiteral("</div>");
        }
        return out;
    }

    static QString layoutBoxHtml(const QString &keyword,
                                 const QString &direction,
                                 const QString &className,
                                 const QString &style)
    {
        return QStringLiteral("<div qhtml-layout=\"") + escapeAttribute(keyword) +
               QStringLiteral("\" qhtml-generated-layout=\"1\" class=\"") + escapeAttribute(className) +
               QStringLiteral("\" style=\"") + escapeAttribute(style) +
               QStringLiteral("\" data-qhtml-direction=\"") + escapeAttribute(direction) +
               QStringLiteral("\">");
    }

    QString generatedRowStyle() const
    {
        QStringList declarations;
        declarations << QStringLiteral("display:flex");
        declarations << QStringLiteral("flex-direction:row");
        declarations << QStringLiteral("box-sizing:border-box");
        declarations << QStringLiteral("min-width:0");
        declarations << QStringLiteral("min-height:0");
        declarations << QStringLiteral("flex:1 1 0");
        declarations << QStringLiteral("width:100%");
        declarations << QStringLiteral("height:auto");
        return declarations.join(QStringLiteral(";")) + QStringLiteral(";");
    }

    QString generatedColStyle() const
    {
        QStringList declarations;
        declarations << QStringLiteral("display:flex");
        declarations << QStringLiteral("flex-direction:column");
        declarations << QStringLiteral("box-sizing:border-box");
        declarations << QStringLiteral("min-width:0");
        declarations << QStringLiteral("min-height:0");
        declarations << QStringLiteral("flex:1 1 0");
        declarations << QStringLiteral("width:100%");
        declarations << QStringLiteral("height:100%");
        return declarations.join(QStringLiteral(";")) + QStringLiteral(";");
    }

    void refreshLayoutContextReferences()
    {
        collectLayoutContextReferences(this);
    }

    void collectLayoutContextReferences(QHTMLNode *scope)
    {
        if (!scope) {
            return;
        }
        for (QHTMLNode *child : scope->children()) {
            if (!child || isRuntimeLayoutChild(child)) {
                continue;
            }
            if (isLayoutNode(child)) {
                if (!child->qhtmlName().isEmpty()) {
                    updateObjectReference(child->qhtmlName(), child);
                }
                collectLayoutContextReferences(child);
                continue;
            }
            if (isLayoutReferenceChild(child) && !child->qhtmlName().isEmpty()) {
                updateObjectReference(child->qhtmlName(), child);
            }
        }
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
               type == QStringLiteral("QHTMLScript") ||
               type == QStringLiteral("QHTMLWorker") ||
               type == QStringLiteral("QHTMLImportNode");
    }

    static bool isLayoutReferenceChild(QHTMLNode *node)
    {
        if (!node) {
            return false;
        }
        const QString type = node->qhtmlType();
        if (type == QStringLiteral("QHTMLComponentDefinition") ||
            type == QStringLiteral("QHTMLComponentInstance")) {
            return false;
        }
        return dynamic_cast<QHTMLTypedNode *>(node) != nullptr;
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

class QHTMLComponentInstanceSlot final : public QHTMLTypedNode
{
public:
    QHTMLComponentInstanceSlot(QHTMLComponentInstance *owner = nullptr,
                               QHTMLComponentSlot *definitionSlot = nullptr);

    QHTMLComponentInstance *owner() const { return m_owner; }
    QHTMLComponentInstance *ownerJs() const { return m_owner; }
    QHTMLComponentSlot *definitionSlot() const { return m_definitionSlot; }
    QHTMLComponentSlot *definitionSlotJs() const { return m_definitionSlot; }

    QHTMLNode *append(QHTMLNode *node);
    QHTMLNode *appendJs(QHTMLNode *node) { return append(node); }
    bool remove(QHTMLNode *node);
    bool removeJs(QHTMLNode *node) { return remove(node); }
    QVector<QHTMLNode *> children() const;
    emscripten::val childrenJs() const;

private:
    QHTMLComponentInstance *m_owner = nullptr;
    QHTMLComponentSlot *m_definitionSlot = nullptr;
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

    ~QHTMLComponentInstance() override
    {
        qDeleteAll(m_slotViews);
        m_slotViews.clear();
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

    QString sourceQHTML(int indentLevel = 0) const override
    {
        QString header = m_definition ? m_definition->qhtmlName().trimmed() : keyword().trimmed();
        if (header.isEmpty()) {
            header = QStringLiteral("q-component-instance");
        }
        if (!qhtmlName().trimmed().isEmpty()) {
            header += QLatin1Char(' ') + qhtmlName().trimmed();
        }

        QStringList lines;
        const QStringList keys = attributes().keys();
        for (const QString &key : keys) {
            const QString value = attributes().value(key);
            if (!key.trimmed().isEmpty() && !value.isEmpty()) {
                lines.append(key + QStringLiteral(": ") + sourceQuote(value));
            }
        }
        for (QHTMLNode *child : children()) {
            lines.append(child->sourceQHTML(0));
        }
        return sourceBlock(header, lines.join(QLatin1Char('\n')), indentLevel);
    }

    int slotCount() const { return collectSlots().size(); }

    emscripten::val slotsJs() const
    {
        refreshSlotViews();
        emscripten::val out = emscripten::val::array();
        for (int i = 0; i < m_slotViews.size(); ++i) {
            out.set(i, m_slotViews.at(i));
        }
        return out;
    }

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

    QHTMLNode *appendToSlot(const QString &slotName, QHTMLNode *node)
    {
        if (slotName.isEmpty() || !node || !slot(slotName)) {
            return nullptr;
        }
        QHTMLNode *overrideNode = slotOverride(slotName, true);
        QHTMLNode *cloned = cloneSlotApiNode(node);
        if (!overrideNode || !cloned) {
            delete cloned;
            return nullptr;
        }
        overrideNode->appendChild(cloned);
        return cloned;
    }

    bool removeFromSlot(const QString &slotName, QHTMLNode *node)
    {
        QHTMLNode *overrideNode = slotOverride(slotName, false);
        if (!overrideNode || !node) {
            return false;
        }
        for (int i = 0; i < overrideNode->childCount(); ++i) {
            QHTMLNode *child = overrideNode->childAt(i);
            if (child == node || (child && child->qhtmlUUID() == node->qhtmlUUID())) {
                return overrideNode->removeChildAt(i);
            }
        }
        return false;
    }

    QVector<QHTMLNode *> slotChildren(const QString &slotName) const
    {
        QVector<QHTMLNode *> out;
        if (slotName.isEmpty()) {
            return out;
        }
        if (QHTMLNode *overrideNode = slotOverride(slotName, false)) {
            return overrideNode->children();
        }
        if (QHTMLComponentSlot *componentSlot = slot(slotName)) {
            if (componentSlot->childCount() > 0) {
                return componentSlot->children();
            }
        }
        if (QHTMLSlotDefault *slotDefault = defaultForSlot(slotName)) {
            return slotDefault->children();
        }
        return out;
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

    QString renderSlotForOwnedDefinition(QHTMLComponentSlot *componentSlot) const
    {
        SlotRenderContext context;
        return renderSlot(componentSlot, context.withInstance(this));
    }

    static QString ownerDefinitionUUIDForSlot(QHTMLComponentSlot *componentSlot)
    {
        return componentSlotOwnerDefinitionUUID(componentSlot);
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
            if (key == QStringLiteral("style")) {
                continue;
            }
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
        const QString inlineStyle = instanceInlineStyle();
        if (!inlineStyle.trimmed().isEmpty()) {
            out += QStringLiteral(" style=\"") + escapeAttribute(inlineStyle) + QStringLiteral("\"");
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
            if (qhtmlIsCssShortcutProperty(assignment->qhtmlName())) {
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

    QString instanceInlineStyle() const
    {
        QStringList declarations;
        const QString existingStyle = attributes().value(QStringLiteral("style")).trimmed();
        if (!existingStyle.isEmpty()) {
            declarations << qhtmlInterpolateTextForContext(existingStyle, this);
        }
        QSet<QString> emitted;
        for (QHTMLNode *child : children()) {
            QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child);
            if (!assignment) {
                continue;
            }
            const QString cssName = qhtmlCssShortcutPropertyName(assignment->qhtmlName());
            if (cssName.isEmpty() || emitted.contains(cssName)) {
                continue;
            }
            declarations << cssName + QStringLiteral(":") +
                                qhtmlResolveCssValueForContext(assignment->value(), this);
            emitted.insert(cssName);
        }
        return declarations.join(QStringLiteral(";"));
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
        if (QHTMLTypedNode *typedNode = dynamic_cast<QHTMLTypedNode *>(node)) {
            if (typedNode->keyword() == QStringLiteral("q-var") ||
                typedNode->keyword() == QStringLiteral("q-callback")) {
                return QString();
            }
        }
        if (isRuntimeInstanceChild(node)) {
            return QString();
        }
        if (QHTMLDomElement *element = dynamic_cast<QHTMLDomElement *>(node)) {
            QString out = QStringLiteral("<") + element->tagName();
            const QHash<QString, QString> localAttributes = element->attributes();
            const QStringList keys = localAttributes.keys();
            for (const QString &key : keys) {
                if (key == QStringLiteral("style")) {
                    continue;
                }
                const QString value = localAttributes.value(key);
                if (!value.isEmpty()) {
                    out += QStringLiteral(" ") + key + QStringLiteral("=\"") + escapeAttribute(value) + QStringLiteral("\"");
                }
            }
            const QString inlineStyle = element->inlineStyleForContext(this);
            if (!inlineStyle.trimmed().isEmpty()) {
                out += QStringLiteral(" style=\"") + escapeAttribute(inlineStyle) + QStringLiteral("\"");
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
        if (!ownerDefinitionUUID.isEmpty()) {
            const QHTMLComponentInstance *ownerInstance = context.instanceForDefinitionUUID(ownerDefinitionUUID);
            if (ownerInstance) {
                return ownerInstance->renderOwnedSlot(componentSlot, context);
            }
            if (ownerDefinitionUUID != componentDefinitionUUID()) {
                return QString();
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

    QHTMLNode *slotOverride(const QString &name, bool createIfMissing = false) const
    {
        if (name.isEmpty()) {
            return nullptr;
        }
        for (QHTMLNode *child : children()) {
            if (child && child->qhtmlName() == name) {
                return child;
            }
        }
        if (createIfMissing) {
            QHTMLNode *overrideNode = new QHTMLNode(QStringLiteral("QHTMLComponentInstanceSlotOverride"), name);
            const_cast<QHTMLComponentInstance *>(this)->appendChild(overrideNode);
            return overrideNode;
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
               type == QStringLiteral("QHTMLSequentialAnimation") ||
               type == QStringLiteral("QHTMLParallelAnimation") ||
               type == QStringLiteral("QHTMLScriptAction") ||
               type == QStringLiteral("QHTMLBehavior") ||
               type == QStringLiteral("QHTMLImportNode") ||
               type == QStringLiteral("QHTMLStyle") ||
               type == QStringLiteral("QHTMLTheme") ||
               type == QStringLiteral("QHTMLClass") ||
               type == QStringLiteral("QHTMLScript") ||
               type == QStringLiteral("QHTMLWorker") ||
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
        return qhtmlInterpolateTextForContext(value, this);
    }

    QString resolveInterpolationValue(QString expression) const
    {
        expression = expression.trimmed();
        if (expression.startsWith(QStringLiteral("this."))) {
            expression = expression.mid(5).trimmed();
        }
        const QString resolved = qhtmlInterpolateTextForContext(QStringLiteral("${") + expression + QStringLiteral("}"), this);
        return resolved == QStringLiteral("${") + expression + QStringLiteral("}") ? propertyValueForName(expression) : resolved;
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
    mutable QVector<QHTMLComponentInstanceSlot *> m_slotViews;

    void refreshSlotViews() const
    {
        qDeleteAll(m_slotViews);
        m_slotViews.clear();
        for (QHTMLComponentSlot *componentSlot : collectSlots()) {
            m_slotViews.append(new QHTMLComponentInstanceSlot(const_cast<QHTMLComponentInstance *>(this), componentSlot));
        }
    }

    static QHTMLNode *cloneSlotApiNode(QHTMLNode *node)
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
                cloned->appendChild(cloneSlotApiNode(child));
            }
            return cloned;
        }
        if (QHTMLComponentSlot *componentSlot = dynamic_cast<QHTMLComponentSlot *>(node)) {
            return componentSlot->cloneSlot();
        }
        if (QHTMLComponentInstance *component = dynamic_cast<QHTMLComponentInstance *>(node)) {
            QHTMLComponentInstance *cloned = new QHTMLComponentInstance(component->qhtmlName(),
                                                                       component->attributes(),
                                                                       component->definition());
            for (QHTMLNode *child : component->children()) {
                cloned->appendChild(cloneSlotApiNode(child));
            }
            return cloned;
        }
        if (QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(node)) {
            return assignment->cloneAssignment();
        }
        QHTMLNode *cloned = new QHTMLNode(node->qhtmlType(), node->qhtmlName());
        for (QHTMLNode *child : node->children()) {
            cloned->appendChild(cloneSlotApiNode(child));
        }
        return cloned;
    }
};

inline QHTMLComponentInstanceSlot::QHTMLComponentInstanceSlot(QHTMLComponentInstance *owner,
                                                             QHTMLComponentSlot *definitionSlot)
    : QHTMLTypedNode(QStringLiteral("q-component-instance-slot"),
                     definitionSlot ? definitionSlot->qhtmlName() : QString())
{
    m_owner = owner;
    m_definitionSlot = definitionSlot;
    setQHTMLType(QStringLiteral("QHTMLComponentInstanceSlot"));
    setProperty(QStringLiteral("kind"), QStringLiteral("component-instance-slot"));
}

inline QHTMLNode *QHTMLComponentInstanceSlot::append(QHTMLNode *node)
{
    return m_owner && m_definitionSlot ? m_owner->appendToSlot(qhtmlName(), node) : nullptr;
}

inline bool QHTMLComponentInstanceSlot::remove(QHTMLNode *node)
{
    return m_owner && m_definitionSlot ? m_owner->removeFromSlot(qhtmlName(), node) : false;
}

inline QVector<QHTMLNode *> QHTMLComponentInstanceSlot::children() const
{
    return m_owner && m_definitionSlot ? m_owner->slotChildren(qhtmlName()) : QVector<QHTMLNode *>();
}

inline emscripten::val QHTMLComponentInstanceSlot::childrenJs() const
{
    emscripten::val out = emscripten::val::array();
    const QVector<QHTMLNode *> localChildren = children();
    for (int i = 0; i < localChildren.size(); ++i) {
        out.set(i, localChildren.at(i));
    }
    return out;
}

class QHTMLWorker final : public QHTMLTypedNode
{
public:
    explicit QHTMLWorker(const QString &name = QString(),
                         const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("q-worker"), name, attributes)
    {
        setQHTMLType(QStringLiteral("QHTMLWorker"));
        setProperty(QStringLiteral("kind"), QStringLiteral("worker"));
    }

    QString renderHtml() const override { return QString(); }
};

inline QString QHTMLComponentSlot::renderHtmlInContext(const QHTMLNode *contextNode) const
{
    const QHTMLComponentInstance *componentInstance = dynamic_cast<const QHTMLComponentInstance *>(contextNode);
    if (componentInstance) {
        QHTMLComponentSlot *slot = const_cast<QHTMLComponentSlot *>(this);
        const QString ownerDefinitionUUID = QHTMLComponentInstance::ownerDefinitionUUIDForSlot(slot);
        if (ownerDefinitionUUID.isEmpty() || ownerDefinitionUUID == componentInstance->componentDefinitionUUID()) {
            return componentInstance->renderSlotForOwnedDefinition(slot);
        }
        return QString();
    }
    return renderHtml();
}

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
    QString sourceQHTML(int indentLevel = 0) const override
    {
        QStringList lines;
        for (QHTMLNode *child : children()) {
            lines.append(child->sourceQHTML(0));
        }
        if (!lines.isEmpty()) {
            return sourceBlock(QStringLiteral("q-property ") + qhtmlName() + QStringLiteral(": ") + m_value,
                               lines.join(QLatin1Char('\n')),
                               indentLevel);
        }
        return sourceIndent(indentLevel) + QStringLiteral("q-property ") + qhtmlName() + QStringLiteral(": ") + m_value;
    }

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

class QHTMLJavaScriptRuntime
{
public:
    QHTMLJavaScriptRuntime()
    {
#if defined(QHTML_QUICKJS_ENABLED)
        m_runtime = JS_NewRuntime();
        if (!m_runtime) {
            return;
        }
        JS_SetMemoryLimit(m_runtime, 4 * 1024 * 1024);
        JS_SetMaxStackSize(m_runtime, 256 * 1024);
        JS_SetInterruptHandler(m_runtime, &QHTMLJavaScriptRuntime::interruptHandler, this);
        m_context = JS_NewContext(m_runtime);
#endif
    }

    ~QHTMLJavaScriptRuntime()
    {
#if defined(QHTML_QUICKJS_ENABLED)
        if (m_context) {
            JS_FreeContext(m_context);
        }
        if (m_runtime) {
            JS_FreeRuntime(m_runtime);
        }
#endif
    }

    bool isAvailable() const
    {
#if defined(QHTML_QUICKJS_ENABLED)
        return m_runtime && m_context;
#else
        return false;
#endif
    }

    bool evaluateExpression(const QString &expression, const QHTMLNode *contextNode, QString *out)
    {
#if defined(QHTML_QUICKJS_ENABLED)
        if (!isAvailable() || !contextNode || !out) {
            return false;
        }

        const QString trimmed = expression.trimmed();
        if (trimmed.isEmpty()) {
            return false;
        }

        m_interruptBudget = 50000;
        JSValue thisObject = scopeObject(contextNode);
        const QString source = QStringLiteral("(function(){ with (this) { return (") +
                               trimmed +
                               QStringLiteral("); } }).call(this)");
        const QByteArray sourceUtf8 = source.toUtf8();
        JSValue result = JS_EvalThis(m_context,
                                     thisObject,
                                     sourceUtf8.constData(),
                                     size_t(sourceUtf8.size()),
                                     "<qhtml-expression>",
                                     JS_EVAL_TYPE_GLOBAL);
        const bool ok = !JS_IsException(result);
        if (ok) {
            *out = valueToString(result);
        }
        JS_FreeValue(m_context, result);
        JS_FreeValue(m_context, thisObject);
        return ok;
#else
        Q_UNUSED(expression);
        Q_UNUSED(contextNode);
        Q_UNUSED(out);
        return false;
#endif
    }

    bool compileOnly(const QString &source, const QString &filename = QStringLiteral("<qhtml>"))
    {
#if defined(QHTML_QUICKJS_ENABLED)
        if (!isAvailable()) {
            return false;
        }
        m_interruptBudget = 50000;
        const QByteArray sourceUtf8 = source.toUtf8();
        const QByteArray filenameUtf8 = filename.toUtf8();
        JSValue compiled = JS_Eval(m_context,
                                   sourceUtf8.constData(),
                                   size_t(sourceUtf8.size()),
                                   filenameUtf8.constData(),
                                   JS_EVAL_TYPE_GLOBAL | JS_EVAL_FLAG_COMPILE_ONLY);
        const bool ok = !JS_IsException(compiled);
        JS_FreeValue(m_context, compiled);
        return ok;
#else
        Q_UNUSED(source);
        Q_UNUSED(filename);
        return false;
#endif
    }

private:
#if defined(QHTML_QUICKJS_ENABLED)
    static int interruptHandler(JSRuntime *, void *opaque)
    {
        QHTMLJavaScriptRuntime *self = static_cast<QHTMLJavaScriptRuntime *>(opaque);
        if (!self) {
            return 1;
        }
        --self->m_interruptBudget;
        return self->m_interruptBudget <= 0 ? 1 : 0;
    }

    JSValue scalarToValue(QString value)
    {
        value = qhtmlScalarValue(value).trimmed();
        if (value.isEmpty()) {
            return JS_NewString(m_context, "");
        }
        const QString lowered = value.toLower();
        if (lowered == QStringLiteral("true")) {
            return JS_NewBool(m_context, true);
        }
        if (lowered == QStringLiteral("false")) {
            return JS_NewBool(m_context, false);
        }
        if (lowered == QStringLiteral("null")) {
            return JS_NULL;
        }

        bool numberOk = false;
        const double number = value.toDouble(&numberOk);
        if (numberOk) {
            return JS_NewFloat64(m_context, number);
        }

        if ((value.startsWith(QLatin1Char('{')) && value.endsWith(QLatin1Char('}'))) ||
            (value.startsWith(QLatin1Char('[')) && value.endsWith(QLatin1Char(']')))) {
            const QByteArray jsonUtf8 = value.toUtf8();
            JSValue parsed = JS_ParseJSON(m_context, jsonUtf8.constData(), size_t(jsonUtf8.size()), "<qhtml-json>");
            if (!JS_IsException(parsed)) {
                return parsed;
            }
            JS_FreeValue(m_context, parsed);
        }

        const QByteArray text = value.toUtf8();
        return JS_NewStringLen(m_context, text.constData(), size_t(text.size()));
    }

    JSValue nodeObject(const QHTMLNode *node, int depth)
    {
        JSValue object = JS_NewObject(m_context);
        if (!node || depth > 4) {
            return object;
        }

        setObjectProperty(object, QStringLiteral("qhtmlName"), JS_NewString(m_context, node->qhtmlName().toUtf8().constData()));
        setObjectProperty(object, QStringLiteral("qhtmlType"), JS_NewString(m_context, node->qhtmlType().toUtf8().constData()));
        applyNodeProperties(object, node, depth);

        return object;
    }

    JSValue scopeObject(const QHTMLNode *node)
    {
        JSValue object = JS_NewObject(m_context);
        QVector<const QHTMLNode *> chain;
        for (const QHTMLNode *cursor = node; cursor; cursor = cursor->parent()) {
            chain.prepend(cursor);
        }
        for (const QHTMLNode *scope : chain) {
            applyNodeProperties(object, scope, 0);
        }
        if (node) {
            setObjectProperty(object, QStringLiteral("qhtmlName"), JS_NewString(m_context, node->qhtmlName().toUtf8().constData()));
            setObjectProperty(object, QStringLiteral("qhtmlType"), JS_NewString(m_context, node->qhtmlType().toUtf8().constData()));
        }
        return object;
    }

    void applyNodeProperties(JSValueConst object, const QHTMLNode *node, int depth)
    {
        if (!node || depth > 4) {
            return;
        }
        for (QHTMLNode *child : node->children()) {
            if (!child || child->qhtmlName().trimmed().isEmpty()) {
                continue;
            }

            JSValue value = JS_UNDEFINED;
            if (QHTMLProperty *property = dynamic_cast<QHTMLProperty *>(child)) {
                value = scalarToValue(property->value());
            } else if (QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child)) {
                value = scalarToValue(assignment->value());
            } else if (QHTMLTypedNode *typed = dynamic_cast<QHTMLTypedNode *>(child)) {
                const QString typedValue = typed->attributes().value(QStringLiteral("value"));
                value = typedValue.isEmpty() ? nodeObject(child, depth + 1) : scalarToValue(typedValue);
            } else {
                value = nodeObject(child, depth + 1);
            }

            setObjectProperty(object, child->qhtmlName(), value);
        }
    }

    void setObjectProperty(JSValueConst object, const QString &name, JSValue value)
    {
        const QByteArray key = name.toUtf8();
        JS_SetPropertyStr(m_context, object, key.constData(), value);
    }

    QString valueToString(JSValueConst value)
    {
        if (JS_IsUndefined(value) || JS_IsNull(value)) {
            return QString();
        }
        if (JS_IsBool(value)) {
            return JS_ToBool(m_context, value) ? QStringLiteral("true") : QStringLiteral("false");
        }
        if (JS_IsNumber(value)) {
            double number = 0;
            if (JS_ToFloat64(m_context, &number, value) == 0) {
                return QString::number(number, 'g', 15);
            }
        }
        const char *text = JS_ToCString(m_context, value);
        if (!text) {
            return QString();
        }
        const QString out = QString::fromUtf8(text);
        JS_FreeCString(m_context, text);
        return out;
    }

    JSRuntime *m_runtime = nullptr;
    JSContext *m_context = nullptr;
    int m_interruptBudget = 0;
#endif
};

inline bool qhtmlExpressionCanResolve(QString expression, const QHTMLNode *contextNode);

inline QString qhtmlResolveExpressionValue(QString expression,
                                           const QHTMLNode *contextNode,
                                           QSet<QString> &resolving,
                                           int depth);

inline QString QHTMLNode::evaluateExpression(const QString &expression) const
{
    QHTMLJavaScriptRuntime *runtime = javascriptRuntime();
    QString out;
    if (runtime && runtime->evaluateExpression(expression, this, &out)) {
        return out;
    }

    QSet<QString> resolving;
    return qhtmlResolveExpressionValue(expression, this, resolving, 0);
}

inline QString qhtmlResolvePropertyValue(QString rawValue,
                                         const QHTMLNode *contextNode,
                                         QSet<QString> &resolving,
                                         int depth)
{
    QString value = qhtmlScalarValue(rawValue);
    if (value.contains(QStringLiteral("${"))) {
        value = qhtmlInterpolateTextForContext(value, contextNode);
    }

    const bool dottedPath = value.contains(QLatin1Char('.')) || value.startsWith(QStringLiteral("this."));
    if ((dottedPath || qhtmlExpressionCanResolve(value, contextNode)) && depth < 16) {
        const QString resolved = qhtmlResolveExpressionValue(value, contextNode, resolving, depth + 1);
        if (!resolved.isNull()) {
            return resolved;
        }
    }

    return value;
}

inline QString qhtmlNodeScalarValue(const QHTMLNode *node,
                                    const QHTMLNode *contextNode,
                                    QSet<QString> &resolving,
                                    int depth)
{
    if (!node) {
        return QString();
    }
    if (const QHTMLProperty *property = dynamic_cast<const QHTMLProperty *>(node)) {
        return qhtmlResolvePropertyValue(property->value(), contextNode, resolving, depth);
    }
    if (const QHTMLPropertyAssignment *assignment = dynamic_cast<const QHTMLPropertyAssignment *>(node)) {
        return qhtmlResolvePropertyValue(assignment->value(), contextNode, resolving, depth);
    }
    return QString();
}

inline QString qhtmlResolveCssValueForContext(QString value, const QHTMLNode *contextNode)
{
    QSet<QString> resolving;
    return qhtmlResolvePropertyValue(value, contextNode, resolving, 0);
}

inline bool qhtmlExpressionCanResolve(QString expression, const QHTMLNode *contextNode)
{
    expression = expression.trimmed();
    if (!contextNode || expression.isEmpty()) {
        return false;
    }
    if (expression.startsWith(QStringLiteral("this.")) ||
        expression.startsWith(QStringLiteral("object."))) {
        return true;
    }
    const QString firstPart = expression.split(QLatin1Char('.'), Qt::SkipEmptyParts).value(0).trimmed();
    return !firstPart.isEmpty() && contextNode->resolve(firstPart) != nullptr;
}

inline QString qhtmlResolveExpressionValue(QString expression,
                                           const QHTMLNode *contextNode,
                                           QSet<QString> &resolving,
                                           int depth)
{
    expression = expression.trimmed();
    if (!contextNode || expression.isEmpty() || depth > 16) {
        return QString();
    }

    if (QHTMLJavaScriptRuntime *runtime = contextNode->javascriptRuntime()) {
        QString quickValue;
        if (runtime->evaluateExpression(expression, contextNode, &quickValue)) {
            return quickValue;
        }
    }

    const QString guard = QStringLiteral("%1:%2").arg(contextNode->qhtmlUUID(), expression);
    if (resolving.contains(guard)) {
        return QString();
    }
    resolving.insert(guard);

    QStringList parts = expression.split(QLatin1Char('.'), Qt::SkipEmptyParts);
    if (parts.isEmpty()) {
        resolving.remove(guard);
        return QString();
    }

    QHTMLReference *current = nullptr;
    const QHTMLNode *currentNode = nullptr;
    int index = 0;
    if (parts.first() == QStringLiteral("this") || parts.first() == QStringLiteral("object")) {
        currentNode = contextNode;
        current = const_cast<QHTMLNode *>(contextNode);
        index = 1;
    } else {
        current = contextNode->resolve(parts.first());
        currentNode = dynamic_cast<QHTMLNode *>(current);
        index = 1;
    }

    while (currentNode && index < parts.size()) {
        const QString part = parts.at(index).trimmed();
        if (part == QStringLiteral("qhtmlParent")) {
            currentNode = currentNode->parent();
            current = const_cast<QHTMLNode *>(currentNode);
            ++index;
            continue;
        }

        if (const QHTMLProperty *property = dynamic_cast<const QHTMLProperty *>(currentNode)) {
            QHTMLJsonDocument document(property->value());
            const QString jsonValue = document.valueAtPath(parts.mid(index).join(QStringLiteral(".")));
            resolving.remove(guard);
            return jsonValue;
        }

        current = currentNode->resolve(part);
        currentNode = dynamic_cast<QHTMLNode *>(current);
        ++index;
    }

    const QString resolved = qhtmlNodeScalarValue(currentNode, contextNode, resolving, depth + 1);
    resolving.remove(guard);
    if (!resolved.isNull()) {
        return resolved;
    }

    if (currentNode && currentNode != contextNode) {
        return currentNode->qhtmlName();
    }
    return QString();
}

inline QString qhtmlInterpolateTextForContext(QString value, const QHTMLNode *contextNode)
{
    if (!contextNode || !value.contains(QStringLiteral("${"))) {
        return value;
    }

    static const QRegularExpression rx(QStringLiteral("\\$\\{\\s*([^}]+?)\\s*\\}"));
    QRegularExpressionMatchIterator it = rx.globalMatch(value);
    int offset = 0;
    QSet<QString> resolving;
    while (it.hasNext()) {
        const QRegularExpressionMatch match = it.next();
        const QString replacement = qhtmlResolveExpressionValue(match.captured(1).trimmed(), contextNode, resolving, 0);
        value.replace(match.capturedStart(0) + offset, match.capturedLength(0), replacement);
        offset += replacement.size() - match.capturedLength(0);
    }
    return value;
}

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
    void setBody(const QString &body)
    {
        m_body = body.trimmed();
        m_path.clear();
        m_cacheMode = QStringLiteral("default");
        parseBody(m_body);
        setProperty(QStringLiteral("path"), m_path);
        setProperty(QStringLiteral("cache"), m_cacheMode);
    }
    void setBodyJs(const std::string &body) { setBody(QString::fromStdString(body)); }

    QString renderHtml() const override { return QString(); }
    QString sourceQHTML(int indentLevel = 0) const override
    {
        return sourceBlock(importKind(), m_body, indentLevel);
    }

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
    void setVariableName(const QString &variableName)
    {
        m_variableName = variableName.trimmed();
        setQHTMLName(m_variableName);
        setProperty(QStringLiteral("variable"), m_variableName);
    }
    void setVariableNameJs(const std::string &variableName) { setVariableName(QString::fromStdString(variableName)); }

    QString collectionExpression() const { return m_collectionExpression; }
    std::string collectionExpressionJs() const { return m_collectionExpression.toStdString(); }
    void setCollectionExpression(const QString &collectionExpression)
    {
        m_collectionExpression = collectionExpression.trimmed();
        setAttribute(QStringLiteral("collection"), m_collectionExpression);
        setProperty(QStringLiteral("collection"), m_collectionExpression);
    }
    void setCollectionExpressionJs(const std::string &collectionExpression)
    {
        setCollectionExpression(QString::fromStdString(collectionExpression));
    }

    QString body() const { return m_body; }
    std::string bodyJs() const { return m_body.toStdString(); }
    void setBody(const QString &body) { m_body = body; }
    void setBodyJs(const std::string &body) { setBody(QString::fromStdString(body)); }

    QString renderHtml() const override
    {
        return renderHtmlForContext(nullptr);
    }

    QString renderHtmlInContext(const QHTMLNode *contextNode) const override
    {
        return renderHtmlForContext(contextNode);
    }

    QString sourceQHTML(int indentLevel = 0) const override
    {
        QString header = m_collectionExpression.isEmpty()
            ? QStringLiteral("for (") + m_variableName + QStringLiteral(")")
            : QStringLiteral("for (") + m_variableName + QStringLiteral(" in ") + m_collectionExpression + QStringLiteral(")");
        if (!m_body.trimmed().isEmpty()) {
            return sourceBlock(header, m_body, indentLevel);
        }
        QStringList lines;
        for (QHTMLNode *child : children()) {
            lines.append(child->sourceQHTML(0));
        }
        return sourceBlock(header, lines.join(QLatin1Char('\n')), indentLevel);
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
    void setEventName(const QString &eventName)
    {
        m_eventName = eventName.trimmed().toLower();
        setQHTMLName(m_eventName);
    }
    void setEventNameJs(const std::string &eventName) { setEventName(QString::fromStdString(eventName)); }

    QStringList parameters() const { return m_parameters; }
    QString parameterList() const { return m_parameters.join(QStringLiteral(", ")); }
    std::string parameterListJs() const { return parameterList().toStdString(); }
    void setParameters(const QStringList &parameters)
    {
        m_parameters = parameters;
        setAttribute(QStringLiteral("parameters"), parameterList());
    }
    void setParameterList(const QString &parameters) { setParameters(QHTMLFunction::parseParameters(parameters)); }
    void setParameterListJs(const std::string &parameters) { setParameterList(QString::fromStdString(parameters)); }

    QString body() const { return m_body; }
    std::string bodyJs() const { return m_body.toStdString(); }
    void setBody(const QString &body) { m_body = body.trimmed(); }
    void setBodyJs(const std::string &body) { setBody(QString::fromStdString(body)); }

    bool propagate() const
    {
        const bool present = attributes().contains(QStringLiteral("propagate")) ||
                             attributes().contains(QStringLiteral("propogate"));
        const QString value = attributes().value(QStringLiteral("propagate"),
                                                 attributes().value(QStringLiteral("propogate"))).trimmed().toLower();
        if (!present) {
            return false;
        }
        if (value.isEmpty()) {
            return true;
        }
        return value == QStringLiteral("true") ||
               value == QStringLiteral("1") ||
               value == QStringLiteral("yes") ||
               value == QStringLiteral("on");
    }

    QHTMLEventHandler *cloneEventHandler() const
    {
        QHash<QString, QString> clonedAttributes = attributes();
        clonedAttributes.insert(QStringLiteral("parameters"), parameterList());
        return new QHTMLEventHandler(m_eventName, clonedAttributes, m_body);
    }

    QString renderHtml() const override { return QString(); }
    QString sourceQHTML(int indentLevel = 0) const override
    {
        QString header = propagate() ? QStringLiteral("propagate ") + m_eventName : m_eventName;
        if (!parameterList().isEmpty()) {
            header += QStringLiteral("(") + parameterList() + QStringLiteral(")");
        }
        return sourceBlock(header, m_body, indentLevel);
    }

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
               type == QStringLiteral("QHTMLStyle") ||
               type == QStringLiteral("QHTMLScript") ||
               type == QStringLiteral("QHTMLWorker");
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

struct QHTMLVideoTile
{
    int x = 0;
    int y = 0;
    int w = 0;
    int h = 0;
    QByteArray bytes;
};

class QHTMLVideoAsset final : public QHTMLReference
{
public:
    QHTMLVideoAsset()
        : QHTMLReference(QStringLiteral("QHTMLVideoAsset"), QStringLiteral("video-asset"))
    {
    }

    bool loadJson(const QString &json)
    {
        clear();
        QJsonParseError parseError;
        const QJsonDocument document = QJsonDocument::fromJson(json.toUtf8(), &parseError);
        if (parseError.error != QJsonParseError::NoError || !document.isObject()) {
            m_lastError = QStringLiteral("Invalid q-vid asset JSON: ") + parseError.errorString();
            return false;
        }

        const QJsonObject root = document.object();
        const QJsonObject asset = root.value(QStringLiteral("asset")).isObject()
            ? root.value(QStringLiteral("asset")).toObject()
            : root;

        m_format = asset.value(QStringLiteral("format")).toString();
        if (!isSupportedFormat(m_format)) {
            m_lastError = QStringLiteral("Unsupported q-vid asset format: ") + (m_format.isEmpty() ? QStringLiteral("unknown") : m_format);
            return false;
        }

        m_name = asset.value(QStringLiteral("name")).toString(QStringLiteral("q_vid_asset"));
        m_src = asset.value(QStringLiteral("src")).toString(m_name);
        m_width = asset.value(QStringLiteral("width")).toInt(0);
        m_height = asset.value(QStringLiteral("height")).toInt(0);
        m_sourceWidth = asset.value(QStringLiteral("sourceWidth")).toInt(m_width);
        m_sourceHeight = asset.value(QStringLiteral("sourceHeight")).toInt(m_height);
        m_frameCount = asset.value(QStringLiteral("frameCount")).toInt(0);
        m_tileSize = asset.value(QStringLiteral("tileSize")).toInt(32);
        m_tolerance = asset.value(QStringLiteral("tolerance")).toInt(0);
        m_codec = asset.value(QStringLiteral("codec")).toString(QStringLiteral("raw"));
        m_deltaMode = asset.value(QStringLiteral("deltaMode")).toString(QStringLiteral("tile"));
        m_pack = asset.value(QStringLiteral("pack")).toString(QStringLiteral("legacy"));
        m_frameStep = qMax(1, asset.value(QStringLiteral("frameStep")).toInt(1));
        m_defaultFrameDuration = qMax(1, asset.value(QStringLiteral("defaultFrameDuration")).toInt(30));
        m_interpolation = asset.value(QStringLiteral("interpolation")).toString();

        if (m_width < 1 || m_height < 1) {
            m_lastError = QStringLiteral("Invalid q-vid asset dimensions.");
            return false;
        }
        if (m_frameCount < 1) {
            m_lastError = QStringLiteral("Invalid q-vid asset frameCount.");
            return false;
        }
        if (m_codec != QStringLiteral("raw") && !m_codec.isEmpty()) {
            m_lastError = QStringLiteral("Unsupported q-vid codec in C++ decoder: ") + m_codec +
                QStringLiteral(". qhtml-element.js must normalize compressed payloads before loadJson().");
            return false;
        }

        m_keyFrameBytes = QByteArray::fromBase64(asset.value(QStringLiteral("keyFrame")).toString().toLatin1());
        const qsizetype expectedBytes = static_cast<qsizetype>(m_width) * static_cast<qsizetype>(m_height) * 4;
        if (m_keyFrameBytes.size() != expectedBytes) {
            m_lastError = QStringLiteral("Invalid q-vid keyframe byte length. Expected %1, got %2.")
                .arg(expectedBytes)
                .arg(m_keyFrameBytes.size());
            return false;
        }

        normalizeStoredFrameNumbers(asset.value(QStringLiteral("storedFrameNumbers")).toArray());
        if (m_interpolation.isEmpty()) {
            m_interpolation = m_storedFrameNumbers.size() < m_frameCount
                ? QStringLiteral("linear-rgba-v1")
                : QStringLiteral("none");
        }

        m_deltas = asset.value(QStringLiteral("deltas")).toArray();
        m_frameCache.insert(0, m_keyFrameBytes);
        m_loaded = true;
        m_lastError.clear();
        return true;
    }

    bool loadJsonJs(const std::string &json) { return loadJson(QString::fromStdString(json)); }

    void clear()
    {
        m_loaded = false;
        m_lastError.clear();
        m_format.clear();
        m_name.clear();
        m_src.clear();
        m_width = 0;
        m_height = 0;
        m_sourceWidth = 0;
        m_sourceHeight = 0;
        m_frameCount = 0;
        m_tileSize = 32;
        m_tolerance = 0;
        m_codec = QStringLiteral("raw");
        m_deltaMode = QStringLiteral("tile");
        m_pack = QStringLiteral("legacy");
        m_frameStep = 1;
        m_defaultFrameDuration = 30;
        m_interpolation.clear();
        m_storedFrameNumbers.clear();
        m_deltas = QJsonArray();
        m_keyFrameBytes.clear();
        m_deltaCache.clear();
        m_frameCache.clear();
    }

    bool isLoaded() const { return m_loaded; }
    int width() const { return m_width; }
    int height() const { return m_height; }
    int sourceWidth() const { return m_sourceWidth; }
    int sourceHeight() const { return m_sourceHeight; }
    int frameCount() const { return m_frameCount; }
    int storedFrameCount() const { return m_storedFrameNumbers.size(); }
    int frameStep() const { return m_frameStep; }
    int defaultFrameDuration() const { return m_defaultFrameDuration; }
    QString format() const { return m_format; }
    QString codec() const { return m_codec; }
    QString interpolation() const { return m_interpolation; }
    QString name() const { return m_name; }
    QString src() const { return m_src; }
    QString lastError() const { return m_lastError; }

    std::string formatJs() const { return m_format.toStdString(); }
    std::string codecJs() const { return m_codec.toStdString(); }
    std::string interpolationJs() const { return m_interpolation.toStdString(); }
    std::string nameJs() const { return m_name.toStdString(); }
    std::string srcJs() const { return m_src.toStdString(); }
    std::string lastErrorJs() const { return m_lastError.toStdString(); }

    QByteArray frameBytes(int frameIndex) const
    {
        if (!m_loaded || m_frameCount < 1) {
            return QByteArray();
        }
        const int target = clampInt(frameIndex, 0, m_frameCount - 1);
        if (m_storedFrameNumbers.size() < m_frameCount) {
            const StoredFrameBlend blend = storedFrameBlend(target);
            const QByteArray before = storedFrameBytes(blend.beforeIndex);
            const QByteArray after = blend.afterIndex == blend.beforeIndex ? before : storedFrameBytes(blend.afterIndex);
            if (after == before || blend.alpha <= 0.0) {
                return before;
            }
            if (blend.alpha >= 1.0) {
                return after;
            }
            return blendBytes(before, after, blend.alpha);
        }
        return storedFrameBytes(target);
    }

    QString frameBase64(int frameIndex) const
    {
        return QString::fromLatin1(frameBytes(frameIndex).toBase64());
    }

    std::string frameBase64Js(int frameIndex) const { return frameBase64(frameIndex).toStdString(); }

    QString frameJson(int frameIndex) const
    {
        QJsonObject object;
        object.insert(QStringLiteral("frameIndex"), clampInt(frameIndex, 0, qMax(0, m_frameCount - 1)));
        object.insert(QStringLiteral("width"), m_width);
        object.insert(QStringLiteral("height"), m_height);
        object.insert(QStringLiteral("bytes"), frameBase64(frameIndex));
        return QString::fromUtf8(QJsonDocument(object).toJson(QJsonDocument::Compact));
    }

    std::string frameJsonJs(int frameIndex) const { return frameJson(frameIndex).toStdString(); }

    QString metadataJson() const
    {
        QJsonObject object;
        object.insert(QStringLiteral("format"), m_format);
        object.insert(QStringLiteral("name"), m_name);
        object.insert(QStringLiteral("src"), m_src);
        object.insert(QStringLiteral("width"), m_width);
        object.insert(QStringLiteral("height"), m_height);
        object.insert(QStringLiteral("sourceWidth"), m_sourceWidth);
        object.insert(QStringLiteral("sourceHeight"), m_sourceHeight);
        object.insert(QStringLiteral("frameCount"), m_frameCount);
        object.insert(QStringLiteral("storedFrameCount"), m_storedFrameNumbers.size());
        object.insert(QStringLiteral("frameStep"), m_frameStep);
        object.insert(QStringLiteral("defaultFrameDuration"), m_defaultFrameDuration);
        object.insert(QStringLiteral("codec"), m_codec);
        object.insert(QStringLiteral("deltaMode"), m_deltaMode);
        object.insert(QStringLiteral("pack"), m_pack);
        object.insert(QStringLiteral("interpolation"), m_interpolation);
        QJsonArray stored;
        for (int frame : m_storedFrameNumbers) {
            stored.append(frame);
        }
        object.insert(QStringLiteral("storedFrameNumbers"), stored);
        return QString::fromUtf8(QJsonDocument(object).toJson(QJsonDocument::Compact));
    }

    std::string metadataJsonJs() const { return metadataJson().toStdString(); }

private:
    struct StoredFrameBlend
    {
        int beforeIndex = 0;
        int afterIndex = 0;
        double alpha = 0.0;
    };

    static bool isSupportedFormat(const QString &format)
    {
        return format == QStringLiteral("q-vid-rgba-tile-v1") ||
               format == QStringLiteral("q-vid-delta-binary-v1") ||
               format == QStringLiteral("sprite-delta-rgba-tile-v1") ||
               format == QStringLiteral("sprite-delta-binary-v2");
    }

    bool usesPackedBinaryDeltas() const
    {
        return m_format == QStringLiteral("q-vid-delta-binary-v1") ||
               m_format == QStringLiteral("sprite-delta-binary-v2");
    }

    static int clampInt(int value, int min, int max)
    {
        if (max < min) {
            return min;
        }
        return qMin(max, qMax(min, value));
    }

    static quint32 readU32LE(const QByteArray &bytes, int offset)
    {
        const uchar *p = reinterpret_cast<const uchar *>(bytes.constData() + offset);
        return static_cast<quint32>(p[0]) |
               (static_cast<quint32>(p[1]) << 8) |
               (static_cast<quint32>(p[2]) << 16) |
               (static_cast<quint32>(p[3]) << 24);
    }

    void normalizeStoredFrameNumbers(const QJsonArray &source)
    {
        QVector<int> numbers;
        if (!source.isEmpty()) {
            for (const QJsonValue &value : source) {
                numbers.append(clampInt(value.toInt(0), 0, m_frameCount - 1));
            }
        } else {
            numbers.reserve(m_frameCount);
            for (int i = 0; i < m_frameCount; ++i) {
                numbers.append(i);
            }
        }

        if (numbers.isEmpty() || numbers.first() != 0) {
            numbers.prepend(0);
        }
        std::sort(numbers.begin(), numbers.end());
        m_storedFrameNumbers.clear();
        for (int value : numbers) {
            if (!m_storedFrameNumbers.contains(value)) {
                m_storedFrameNumbers.append(value);
            }
        }
        if (m_storedFrameNumbers.isEmpty() || m_storedFrameNumbers.first() != 0) {
            m_storedFrameNumbers.prepend(0);
        }
    }

    QVector<QHTMLVideoTile> decodeDelta(int deltaIndex) const
    {
        if (m_deltaCache.contains(deltaIndex)) {
            return m_deltaCache.value(deltaIndex);
        }

        const int index = clampInt(deltaIndex, 0, qMax(0, m_deltas.size() - 1));
        QVector<QHTMLVideoTile> tiles = usesPackedBinaryDeltas()
            ? unpackPackedDelta(QByteArray::fromBase64(m_deltas.at(index).toString().toLatin1()))
            : unpackJsonDelta(m_deltas.at(index).toArray());
        m_deltaCache.insert(deltaIndex, tiles);
        return tiles;
    }

    QVector<QHTMLVideoTile> unpackJsonDelta(const QJsonArray &delta) const
    {
        QVector<QHTMLVideoTile> tiles;
        tiles.reserve(delta.size());
        for (const QJsonValue &value : delta) {
            const QJsonObject object = value.toObject();
            QHTMLVideoTile tile;
            tile.x = object.value(QStringLiteral("x")).toInt(0);
            tile.y = object.value(QStringLiteral("y")).toInt(0);
            tile.w = object.value(QStringLiteral("w")).toInt(0);
            tile.h = object.value(QStringLiteral("h")).toInt(0);
            tile.bytes = QByteArray::fromBase64(object.value(QStringLiteral("bytes")).toString().toLatin1());
            const qsizetype expected = static_cast<qsizetype>(tile.w) * static_cast<qsizetype>(tile.h) * 4;
            if (tile.w > 0 && tile.h > 0 && tile.bytes.size() == expected && tileWithinBounds(tile)) {
                tiles.append(tile);
            }
        }
        return tiles;
    }

    QVector<QHTMLVideoTile> unpackPackedDelta(const QByteArray &bytes) const
    {
        QVector<QHTMLVideoTile> tiles;
        if (bytes.size() < 4) {
            m_lastError = QStringLiteral("Invalid q-vid delta stream: missing tile count.");
            return tiles;
        }
        int offset = 0;
        const quint32 tileCount = readU32LE(bytes, offset);
        offset += 4;
        tiles.reserve(static_cast<int>(qMin<quint32>(tileCount, static_cast<quint32>(4096))));
        for (quint32 i = 0; i < tileCount; ++i) {
            if (offset + 16 > bytes.size()) {
                m_lastError = QStringLiteral("Invalid q-vid delta stream: truncated tile header.");
                return tiles;
            }
            QHTMLVideoTile tile;
            tile.x = static_cast<int>(readU32LE(bytes, offset)); offset += 4;
            tile.y = static_cast<int>(readU32LE(bytes, offset)); offset += 4;
            tile.w = static_cast<int>(readU32LE(bytes, offset)); offset += 4;
            tile.h = static_cast<int>(readU32LE(bytes, offset)); offset += 4;
            const qsizetype length = static_cast<qsizetype>(tile.w) * static_cast<qsizetype>(tile.h) * 4;
            if (!tileWithinBounds(tile) || length < 0) {
                m_lastError = QStringLiteral("Invalid q-vid tile bounds.");
                return tiles;
            }
            if (offset + length > bytes.size()) {
                m_lastError = QStringLiteral("Invalid q-vid delta stream: truncated tile payload.");
                return tiles;
            }
            tile.bytes = bytes.mid(offset, length);
            offset += static_cast<int>(length);
            tiles.append(tile);
        }
        return tiles;
    }

    bool tileWithinBounds(const QHTMLVideoTile &tile) const
    {
        return tile.x >= 0 && tile.y >= 0 && tile.w > 0 && tile.h > 0 &&
               tile.x + tile.w <= m_width && tile.y + tile.h <= m_height;
    }

    void applyTiles(QByteArray &target, const QVector<QHTMLVideoTile> &tiles) const
    {
        const qsizetype expectedBytes = static_cast<qsizetype>(m_width) * static_cast<qsizetype>(m_height) * 4;
        if (target.size() != expectedBytes) {
            target.resize(expectedBytes);
        }
        for (const QHTMLVideoTile &tile : tiles) {
            const qsizetype rowBytes = static_cast<qsizetype>(tile.w) * 4;
            for (int row = 0; row < tile.h; ++row) {
                const qsizetype srcStart = static_cast<qsizetype>(row) * rowBytes;
                const qsizetype dstStart = (static_cast<qsizetype>(tile.y + row) * m_width + tile.x) * 4;
                if (srcStart + rowBytes <= tile.bytes.size() && dstStart + rowBytes <= target.size()) {
                    memcpy(target.data() + dstStart, tile.bytes.constData() + srcStart, static_cast<size_t>(rowBytes));
                }
            }
        }
    }

    int nearestCachedStoredFrameBefore(int target) const
    {
        int nearest = 0;
        for (auto it = m_frameCache.constBegin(); it != m_frameCache.constEnd(); ++it) {
            const int key = it.key();
            if (key < target && key > nearest) {
                nearest = key;
            }
        }
        return nearest;
    }

    QByteArray storedFrameBytes(int storedFrameIndex) const
    {
        const int target = clampInt(storedFrameIndex, 0, qMax(0, m_storedFrameNumbers.size() - 1));
        if (m_frameCache.contains(target)) {
            return m_frameCache.value(target);
        }
        const int start = nearestCachedStoredFrameBefore(target);
        QByteArray working = m_frameCache.value(start, m_keyFrameBytes);
        for (int frame = start + 1; frame <= target; ++frame) {
            applyTiles(working, decodeDelta(frame - 1));
            m_frameCache.insert(frame, working);
        }
        return m_frameCache.value(target);
    }

    StoredFrameBlend storedFrameBlend(int frameIndex) const
    {
        StoredFrameBlend blend;
        if (m_storedFrameNumbers.isEmpty()) {
            return blend;
        }
        blend.afterIndex = m_storedFrameNumbers.size() - 1;
        for (int i = 0; i < m_storedFrameNumbers.size(); ++i) {
            const int frameNumber = m_storedFrameNumbers.at(i);
            if (frameNumber <= frameIndex) {
                blend.beforeIndex = i;
            }
            if (frameNumber >= frameIndex) {
                blend.afterIndex = i;
                break;
            }
        }
        const int beforeFrame = m_storedFrameNumbers.at(blend.beforeIndex);
        const int afterFrame = m_storedFrameNumbers.at(blend.afterIndex);
        const int span = afterFrame - beforeFrame;
        blend.alpha = span > 0 ? static_cast<double>(frameIndex - beforeFrame) / static_cast<double>(span) : 0.0;
        if (blend.alpha < 0.0) blend.alpha = 0.0;
        if (blend.alpha > 1.0) blend.alpha = 1.0;
        return blend;
    }

    QByteArray blendBytes(const QByteArray &before, const QByteArray &after, double alpha) const
    {
        const int size = qMin(before.size(), after.size());
        QByteArray out;
        out.resize(size);
        const double inverse = 1.0 - alpha;
        const uchar *b = reinterpret_cast<const uchar *>(before.constData());
        const uchar *a = reinterpret_cast<const uchar *>(after.constData());
        uchar *o = reinterpret_cast<uchar *>(out.data());
        for (int i = 0; i < size; ++i) {
            o[i] = static_cast<uchar>(qBound(0, static_cast<int>(qRound(static_cast<double>(b[i]) * inverse + static_cast<double>(a[i]) * alpha)), 255));
        }
        return out;
    }

    mutable QString m_lastError;
    bool m_loaded = false;
    QString m_format;
    QString m_name;
    QString m_src;
    int m_width = 0;
    int m_height = 0;
    int m_sourceWidth = 0;
    int m_sourceHeight = 0;
    int m_frameCount = 0;
    int m_tileSize = 32;
    int m_tolerance = 0;
    QString m_codec = QStringLiteral("raw");
    QString m_deltaMode = QStringLiteral("tile");
    QString m_pack = QStringLiteral("legacy");
    int m_frameStep = 1;
    int m_defaultFrameDuration = 30;
    QString m_interpolation;
    QVector<int> m_storedFrameNumbers;
    QJsonArray m_deltas;
    QByteArray m_keyFrameBytes;
    mutable QHash<int, QVector<QHTMLVideoTile>> m_deltaCache;
    mutable QHash<int, QByteArray> m_frameCache;
};

class QHTMLVideoPlayer final : public QHTMLReference
{
public:
    QHTMLVideoPlayer()
        : QHTMLReference(QStringLiteral("QHTMLVideoPlayer"), QStringLiteral("video-player"))
    {
    }

    bool loadAssetJson(const QString &json)
    {
        const bool ok = m_asset.loadJson(json);
        if (!ok) {
            return false;
        }
        m_startFrame = 0;
        m_endFrame = qMax(0, m_asset.frameCount() - 1);
        m_currentFrame = m_reverse ? m_endFrame : m_startFrame;
        if (m_frameDuration < 1) {
            m_frameDuration = m_asset.defaultFrameDuration();
        }
        return true;
    }

    bool loadAssetJsonJs(const std::string &json) { return loadAssetJson(QString::fromStdString(json)); }

    bool isLoaded() const { return m_asset.isLoaded(); }
    QHTMLVideoAsset *asset() { return &m_asset; }
    QHTMLVideoAsset *assetJs() { return &m_asset; }
    int width() const { return m_asset.width(); }
    int height() const { return m_asset.height(); }
    int frameCount() const { return m_asset.frameCount(); }
    int storedFrameCount() const { return m_asset.storedFrameCount(); }
    int currentFrame() const { return m_currentFrame; }
    int startFrame() const { return m_startFrame; }
    int endFrame() const { return m_endFrame; }
    int frameDuration() const { return m_frameDuration; }
    bool reverse() const { return m_reverse; }
    bool repeat() const { return m_repeat; }
    bool running() const { return m_running; }
    QString lastError() const { return m_asset.lastError(); }
    std::string lastErrorJs() const { return lastError().toStdString(); }

    void setFrameDuration(int ms) { m_frameDuration = qMax(1, ms); }
    void setFrameDurationJs(int ms) { setFrameDuration(ms); }
    void setReverse(bool value) { m_reverse = value; }
    void setReverseJs(bool value) { setReverse(value); }
    void setRepeat(bool value) { m_repeat = value; }
    void setRepeatJs(bool value) { setRepeat(value); }
    void setRunning(bool value) { m_running = value; }
    void setRunningJs(bool value) { setRunning(value); }

    void setRange(int startFrame, int endFrame)
    {
        if (!m_asset.isLoaded()) {
            m_startFrame = qMax(0, startFrame);
            m_endFrame = qMax(0, endFrame);
            return;
        }
        m_startFrame = clampInt(startFrame, 0, m_asset.frameCount() - 1);
        m_endFrame = clampInt(endFrame, 0, m_asset.frameCount() - 1);
        setCurrentFrame(m_currentFrame);
    }
    void setRangeJs(int startFrame, int endFrame) { setRange(startFrame, endFrame); }

    void setStartFrame(int frame) { setRange(frame, m_endFrame); }
    void setStartFrameJs(int frame) { setStartFrame(frame); }
    void setEndFrame(int frame) { setRange(m_startFrame, frame); }
    void setEndFrameJs(int frame) { setEndFrame(frame); }

    void setCurrentFrame(int frame)
    {
        if (!m_asset.isLoaded()) {
            m_currentFrame = qMax(0, frame);
            return;
        }
        m_currentFrame = clampInt(frame, qMin(m_startFrame, m_endFrame), qMax(m_startFrame, m_endFrame));
    }
    void setCurrentFrameJs(int frame) { setCurrentFrame(frame); }

    int step(int count = 1)
    {
        if (!m_asset.isLoaded()) {
            return m_currentFrame;
        }
        const int direction = m_reverse ? -1 : 1;
        const int minFrame = qMin(m_startFrame, m_endFrame);
        const int maxFrame = qMax(m_startFrame, m_endFrame);
        const int requested = m_currentFrame + direction * count;
        if (m_repeat) {
            m_currentFrame = wrapInclusive(requested, minFrame, maxFrame);
        } else {
            m_currentFrame = clampInt(requested, minFrame, maxFrame);
            if (requested != m_currentFrame) {
                m_running = false;
            }
        }
        return m_currentFrame;
    }
    int stepJs(int count) { return step(count); }

    QString frameBase64() const { return m_asset.frameBase64(m_currentFrame); }
    QString frameBase64At(int frameIndex) const { return m_asset.frameBase64(frameIndex); }
    std::string frameBase64Js() const { return frameBase64().toStdString(); }
    std::string frameBase64AtJs(int frameIndex) const { return frameBase64At(frameIndex).toStdString(); }

    QString metadataJson() const
    {
        QJsonObject player;
        player.insert(QStringLiteral("currentFrame"), m_currentFrame);
        player.insert(QStringLiteral("startFrame"), m_startFrame);
        player.insert(QStringLiteral("endFrame"), m_endFrame);
        player.insert(QStringLiteral("frameDuration"), m_frameDuration);
        player.insert(QStringLiteral("reverse"), m_reverse);
        player.insert(QStringLiteral("repeat"), m_repeat);
        player.insert(QStringLiteral("running"), m_running);
        QJsonObject root;
        root.insert(QStringLiteral("asset"), QJsonDocument::fromJson(m_asset.metadataJson().toUtf8()).object());
        root.insert(QStringLiteral("player"), player);
        return QString::fromUtf8(QJsonDocument(root).toJson(QJsonDocument::Compact));
    }
    std::string metadataJsonJs() const { return metadataJson().toStdString(); }

private:
    static int clampInt(int value, int min, int max)
    {
        if (max < min) {
            return min;
        }
        return qMin(max, qMax(min, value));
    }

    static int wrapInclusive(int value, int min, int max)
    {
        if (max < min) {
            return min;
        }
        const int span = max - min + 1;
        return ((((value - min) % span) + span) % span) + min;
    }

    QHTMLVideoAsset m_asset;
    int m_frameDuration = 30;
    bool m_reverse = false;
    bool m_repeat = true;
    bool m_running = false;
    int m_startFrame = 0;
    int m_endFrame = 0;
    int m_currentFrame = 0;
};

class QHTMLVideo final : public QHTMLTypedNode
{
public:
    explicit QHTMLVideo(const QString &keyword = QStringLiteral("q-vid-player"),
                        const QString &name = QString(),
                        const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(keyword, name, attributes),
          m_tagName(keyword == QStringLiteral("q-video") ? QStringLiteral("q-vid-player") : keyword)
    {
        setQHTMLType(QStringLiteral("QHTMLVideo"));
        setProperty(QStringLiteral("kind"), QStringLiteral("video"));
    }

    QString tagName() const { return m_tagName; }
    std::string tagNameJs() const { return m_tagName.toStdString(); }

    QString assignmentValue(const QString &name, const QString &fallback = QString()) const
    {
        const QString lowerName = name.toLower();
        for (QHTMLNode *child : children()) {
            QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child);
            if (assignment && assignment->qhtmlName().toLower() == lowerName) {
                return stripQuotes(assignment->value().trimmed());
            }
        }
        const QString attributeValue = attributes().value(name);
        return attributeValue.isEmpty() ? fallback : stripQuotes(attributeValue);
    }

    std::string assignmentValueJs(const std::string &name) const
    {
        return assignmentValue(QString::fromStdString(name)).toStdString();
    }

    QString renderHtml() const override
    {
        QString out = QStringLiteral("<") + m_tagName +
                      QStringLiteral(" qhtml-video=\"1\" qhtml-node=\"") + escapeAttribute(qhtmlUUID()) + QStringLiteral("\"");
        const QString nodeName = qhtmlName().trimmed();
        if (!nodeName.isEmpty()) {
            out += QStringLiteral(" name=\"") + escapeAttribute(nodeName) + QStringLiteral("\"");
        }

        QSet<QString> written;
        const QStringList attributeKeys = attributes().keys();
        for (const QString &key : attributeKeys) {
            const QString value = attributes().value(key);
            if (!key.trimmed().isEmpty() && !value.isEmpty()) {
                out += QStringLiteral(" ") + key + QStringLiteral("=\"") + escapeAttribute(stripQuotes(value)) + QStringLiteral("\"");
                written.insert(key.toLower());
            }
        }
        for (QHTMLNode *child : children()) {
            QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child);
            if (!assignment || assignment->qhtmlName().isEmpty()) {
                continue;
            }
            const QString key = assignment->qhtmlName();
            if (written.contains(key.toLower())) {
                continue;
            }
            if (qhtmlIsCssShortcutProperty(key)) {
                continue;
            }
            out += QStringLiteral(" ") + key + QStringLiteral("=\"") + escapeAttribute(stripQuotes(assignment->value())) + QStringLiteral("\"");
            written.insert(key.toLower());
        }
        out += QStringLiteral("><canvas qhtml-video-canvas=\"1\"></canvas></") + m_tagName + QStringLiteral(">");
        return out;
    }

private:
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

    QString m_tagName;
};

class QHTMLParticleEmitter final : public QHTMLTypedNode
{
public:
    explicit QHTMLParticleEmitter(const QString &keyword = QStringLiteral("particle-emitter"),
                                  const QString &name = QString(),
                                  const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(keyword, name, attributes),
          m_tagName(QStringLiteral("particle-emitter"))
    {
        setQHTMLType(QStringLiteral("QHTMLParticleEmitter"));
        setProperty(QStringLiteral("kind"), QStringLiteral("particle-emitter"));
    }

    QString tagName() const { return m_tagName; }
    std::string tagNameJs() const { return m_tagName.toStdString(); }

    QString assignmentValue(const QString &name, const QString &fallback = QString()) const
    {
        const QString lowerName = name.toLower();
        for (QHTMLNode *child : children()) {
            QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child);
            if (assignment && assignment->qhtmlName().toLower() == lowerName) {
                return stripQuotes(assignment->value().trimmed());
            }
        }
        const QString attributeValue = attributes().value(name);
        return attributeValue.isEmpty() ? fallback : stripQuotes(attributeValue);
    }

    std::string assignmentValueJs(const std::string &name) const
    {
        return assignmentValue(QString::fromStdString(name)).toStdString();
    }

    QString renderHtml() const override
    {
        QString out = QStringLiteral("<") + m_tagName +
                      QStringLiteral(" qhtml-particle-emitter=\"1\" qhtml-node=\"") +
                      escapeAttribute(qhtmlUUID()) + QStringLiteral("\"");
        const QString nodeName = qhtmlName().trimmed();
        if (!nodeName.isEmpty()) {
            out += QStringLiteral(" name=\"") + escapeAttribute(nodeName) + QStringLiteral("\"");
        }

        QSet<QString> written;
        const QStringList attributeKeys = attributes().keys();
        for (const QString &key : attributeKeys) {
            const QString value = attributes().value(key);
            if (!key.trimmed().isEmpty() && !value.isEmpty()) {
                out += QStringLiteral(" ") + key + QStringLiteral("=\"") +
                       escapeAttribute(stripQuotes(value)) + QStringLiteral("\"");
                written.insert(key.toLower());
            }
        }
        for (QHTMLNode *child : children()) {
            QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child);
            if (!assignment || assignment->qhtmlName().isEmpty()) {
                continue;
            }
            const QString key = assignment->qhtmlName();
            if (written.contains(key.toLower())) {
                continue;
            }
            out += QStringLiteral(" ") + key + QStringLiteral("=\"") +
                   escapeAttribute(stripQuotes(assignment->value())) + QStringLiteral("\"");
            written.insert(key.toLower());
        }
        out += QStringLiteral("></") + m_tagName + QStringLiteral(">");
        return out;
    }

private:
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

    QString m_tagName;
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
    void setBody(const QString &body) { m_body = body.trimmed(); }
    void setBodyJs(const std::string &body) { setBody(QString::fromStdString(body)); }

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
    QString sourceQHTML(int indentLevel = 0) const override
    {
        return sourceBlock(QStringLiteral("q-connect"), m_body, indentLevel);
    }

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
        m_steppedSignal = appendBuiltInSignal(QStringLiteral("stepped"), QStringLiteral("stepNum, value"));
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
                    QString::number(m_currentStep),
                    QString::number(x, 'g', 16)
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
    int m_steps = 100;
    int m_currentStep = 0;
    double m_from = 0.0;
    double m_to = 0.0;
    double m_stepAmount = 0.0;
    QVector<double> m_stepStones;
    bool m_running = false;
};

class QHTMLScriptAction final : public QHTMLTypedNode
{
public:
    explicit QHTMLScriptAction(const QString &name = QString(),
                               const QHash<QString, QString> &attributes = {},
                               const QString &body = QString())
        : QHTMLTypedNode(QStringLiteral("q-script-action"), name, attributes),
          m_body(body.trimmed())
    {
        setQHTMLType(QStringLiteral("QHTMLScriptAction"));
        setProperty(QStringLiteral("kind"), QStringLiteral("script-action"));
        m_startedSignal = appendBuiltInSignal(QStringLiteral("started"));
        m_finishedSignal = appendBuiltInSignal(QStringLiteral("finished"));
    }

    QString body() const { return m_body; }
    std::string bodyJs() const { return m_body.toStdString(); }
    void setBody(const QString &body) { m_body = body; }
    void setBodyJs(const std::string &body) { setBody(QString::fromStdString(body)); }

    QHTMLSignal *startedSignal() const { return m_startedSignal; }
    QHTMLSignal *startedSignalJs() const { return m_startedSignal; }
    QHTMLSignal *finishedSignal() const { return m_finishedSignal; }
    QHTMLSignal *finishedSignalJs() const { return m_finishedSignal; }

    void setSignalBus(QHTMLSignalBus *bus)
    {
        for (QHTMLSignal *signal : { m_startedSignal, m_finishedSignal }) {
            if (signal) {
                signal->setSignalBus(bus);
            }
        }
    }

    void run()
    {
        if (m_startedSignal) {
            m_startedSignal->emitSignal(QStringList(), this);
        }
        if (m_finishedSignal) {
            m_finishedSignal->emitSignal(QStringList(), this);
        }
    }

    void runJs() { run(); }

    QHTMLScriptAction *cloneScriptAction() const
    {
        QHTMLScriptAction *cloned = new QHTMLScriptAction(qhtmlName(), attributes(), m_body);
        for (QHTMLNode *child : children()) {
            if (!child || child == m_startedSignal || child == m_finishedSignal) {
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

    QString sourceQHTML(int indentLevel = 0) const override
    {
        QString header = QStringLiteral("q-script-action");
        if (!qhtmlName().trimmed().isEmpty()) {
            header += QLatin1Char(' ') + qhtmlName().trimmed();
        }
        return sourceBlock(header, m_body, indentLevel);
    }

private:
    QHTMLSignal *appendBuiltInSignal(const QString &name)
    {
        QHTMLSignal *signal = new QHTMLSignal(name);
        appendChild(signal);
        return signal;
    }

    QString m_body;
    QHTMLSignal *m_startedSignal = nullptr;
    QHTMLSignal *m_finishedSignal = nullptr;
};

class QHTMLAnimationGroup : public QHTMLTypedNode
{
public:
    explicit QHTMLAnimationGroup(const QString &keyword,
                                 const QString &type,
                                 const QString &kind,
                                 const QString &name = QString(),
                                 const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(keyword, name, attributes)
    {
        setQHTMLType(type);
        setProperty(QStringLiteral("kind"), kind);
        m_startedSignal = appendBuiltInSignal(QStringLiteral("started"));
        m_stoppedSignal = appendBuiltInSignal(QStringLiteral("stopped"));
        m_finishedSignal = appendBuiltInSignal(QStringLiteral("finished"));
    }

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
    QHTMLSignal *finishedSignal() const { return m_finishedSignal; }
    QHTMLSignal *finishedSignalJs() const { return m_finishedSignal; }

    void setSignalBus(QHTMLSignalBus *bus)
    {
        for (QHTMLSignal *signal : { m_startedSignal, m_stoppedSignal, m_finishedSignal }) {
            if (signal) {
                signal->setSignalBus(bus);
            }
        }
        for (QHTMLNode *child : children()) {
            if (QHTMLPropertyAnimation *animation = dynamic_cast<QHTMLPropertyAnimation *>(child)) {
                animation->setSignalBus(bus);
            } else if (QHTMLAnimationGroup *group = dynamic_cast<QHTMLAnimationGroup *>(child)) {
                group->setSignalBus(bus);
            } else if (QHTMLScriptAction *action = dynamic_cast<QHTMLScriptAction *>(child)) {
                action->setSignalBus(bus);
            }
        }
    }

    void start()
    {
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

    void finish()
    {
        m_running = false;
        if (m_finishedSignal) {
            m_finishedSignal->emitSignal(QStringList(), this);
        }
    }

    QHTMLAnimationGroup *cloneAnimationGroup() const
    {
        QHTMLAnimationGroup *cloned = cloneEmptyGroup();
        cloned->m_running = m_running;
        for (QHTMLNode *child : children()) {
            if (!child ||
                child == m_startedSignal ||
                child == m_stoppedSignal ||
                child == m_finishedSignal) {
                continue;
            }
            if (QHTMLPropertyAnimation *animation = dynamic_cast<QHTMLPropertyAnimation *>(child)) {
                cloned->appendChild(animation->cloneAnimation());
            } else if (QHTMLAnimationGroup *group = dynamic_cast<QHTMLAnimationGroup *>(child)) {
                cloned->appendChild(group->cloneAnimationGroup());
            } else if (QHTMLScriptAction *action = dynamic_cast<QHTMLScriptAction *>(child)) {
                cloned->appendChild(action->cloneScriptAction());
            } else if (QHTMLEventHandler *handler = dynamic_cast<QHTMLEventHandler *>(child)) {
                cloned->appendChild(handler->cloneEventHandler());
            } else if (QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child)) {
                cloned->appendChild(assignment->cloneAssignment());
            }
        }
        return cloned;
    }

    QString renderHtml() const override { return QString(); }

    QString sourceQHTML(int indentLevel = 0) const override
    {
        QStringList lines;
        for (QHTMLNode *child : children()) {
            if (!child ||
                child == m_startedSignal ||
                child == m_stoppedSignal ||
                child == m_finishedSignal) {
                continue;
            }
            lines.append(child->sourceQHTML(0));
        }
        QString header = keyword();
        if (!qhtmlName().trimmed().isEmpty()) {
            header += QLatin1Char(' ') + qhtmlName().trimmed();
        }
        return sourceBlock(header, lines.join(QLatin1Char('\n')), indentLevel);
    }

protected:
    virtual QHTMLAnimationGroup *cloneEmptyGroup() const = 0;

private:
    QHTMLSignal *appendBuiltInSignal(const QString &name)
    {
        QHTMLSignal *signal = new QHTMLSignal(name);
        appendChild(signal);
        return signal;
    }

    bool m_running = false;
    QHTMLSignal *m_startedSignal = nullptr;
    QHTMLSignal *m_stoppedSignal = nullptr;
    QHTMLSignal *m_finishedSignal = nullptr;
};

class QHTMLSequentialAnimation final : public QHTMLAnimationGroup
{
public:
    explicit QHTMLSequentialAnimation(const QString &name = QString(),
                                      const QHash<QString, QString> &attributes = {})
        : QHTMLAnimationGroup(QStringLiteral("q-sequential-animation"),
                              QStringLiteral("QHTMLSequentialAnimation"),
                              QStringLiteral("sequential-animation"),
                              name,
                              attributes)
    {
    }

protected:
    QHTMLAnimationGroup *cloneEmptyGroup() const override
    {
        return new QHTMLSequentialAnimation(qhtmlName(), attributes());
    }
};

class QHTMLParallelAnimation final : public QHTMLAnimationGroup
{
public:
    explicit QHTMLParallelAnimation(const QString &name = QString(),
                                    const QHash<QString, QString> &attributes = {})
        : QHTMLAnimationGroup(QStringLiteral("q-parallel-animation"),
                              QStringLiteral("QHTMLParallelAnimation"),
                              QStringLiteral("parallel-animation"),
                              name,
                              attributes)
    {
    }

protected:
    QHTMLAnimationGroup *cloneEmptyGroup() const override
    {
        return new QHTMLParallelAnimation(qhtmlName(), attributes());
    }
};

class QHTMLBehavior final : public QHTMLTypedNode
{
public:
    explicit QHTMLBehavior(const QString &propertyName = QString(),
                           const QHash<QString, QString> &attributes = {})
        : QHTMLTypedNode(QStringLiteral("behavior"), propertyName, attributes)
    {
        setQHTMLType(QStringLiteral("QHTMLBehavior"));
        setProperty(QStringLiteral("kind"), QStringLiteral("behavior"));
        setProperty(QStringLiteral("property"), propertyName);
    }

    QString propertyName() const { return qhtmlName(); }
    std::string propertyNameJs() const { return propertyName().toStdString(); }

    QHTMLBehavior *cloneBehavior() const
    {
        QHTMLBehavior *cloned = new QHTMLBehavior(qhtmlName(), attributes());
        for (QHTMLNode *child : children()) {
            if (QHTMLPropertyAnimation *animation = dynamic_cast<QHTMLPropertyAnimation *>(child)) {
                cloned->appendChild(animation->cloneAnimation());
            } else if (QHTMLAnimationGroup *group = dynamic_cast<QHTMLAnimationGroup *>(child)) {
                cloned->appendChild(group->cloneAnimationGroup());
            } else if (QHTMLScriptAction *action = dynamic_cast<QHTMLScriptAction *>(child)) {
                cloned->appendChild(action->cloneScriptAction());
            } else if (QHTMLEventHandler *handler = dynamic_cast<QHTMLEventHandler *>(child)) {
                cloned->appendChild(handler->cloneEventHandler());
            } else if (QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child)) {
                cloned->appendChild(assignment->cloneAssignment());
            }
        }
        return cloned;
    }

    QString renderHtml() const override { return QString(); }

    QString sourceQHTML(int indentLevel = 0) const override
    {
        QStringList lines;
        for (QHTMLNode *child : children()) {
            if (child) {
                lines.append(child->sourceQHTML(0));
            }
        }
        return sourceBlock(QStringLiteral("behavior on ") + qhtmlName(), lines.join(QLatin1Char('\n')), indentLevel);
    }
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
    QString sourceQHTML(int indentLevel = 0) const override
    {
        return sourceBlock(QStringLiteral("q-style ") + qhtmlName(), m_body, indentLevel);
    }
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
    QString sourceQHTML(int indentLevel = 0) const override
    {
        return sourceBlock(keyword() + QLatin1Char(' ') + qhtmlName(), m_body, indentLevel);
    }
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
    QString sourceQHTML(int indentLevel = 0) const override
    {
        return sourceBlock(QStringLiteral("q-class ") + qhtmlName(), m_body, indentLevel);
    }

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
                         const QHash<QString, QString> &attributes = {},
                         const QString &body = QString())
        : QHTMLTypedNode(QStringLiteral("script"), name, attributes),
          m_body(body.trimmed())
    {
        setQHTMLType(QStringLiteral("QHTMLScript"));
        setProperty(QStringLiteral("kind"), QStringLiteral("script"));
    }

    QString body() const { return m_body; }
    std::string bodyJs() const { return body().toStdString(); }
    void setBody(const QString &body) { m_body = body.trimmed(); }
    void setBodyJs(const std::string &body) { setBody(QString::fromStdString(body)); }

    QString renderHtml() const override { return QString(); }

private:
    QString m_body;
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
        qhtmlJavaScriptRuntime = new QHTMLJavaScriptRuntime();
    }

    ~QHTMLDomTree() override
    {
        delete qhtmlJavaScriptRuntime;
        delete qhtmlSignalBus;
    }

    QHTMLSignalBus *qhtmlSignalBus = nullptr;
    QHTMLJavaScriptRuntime *qhtmlJavaScriptRuntime = nullptr;

    void loadFromAST(QHTMLAstNode *astRoot);
    void clear() { clearChildren(); }
    QHTMLNode *root() { return this; }
    QHTMLNode *rootJs() { return this; }
    QHTMLSignalBus *signalBus() const { return qhtmlSignalBus; }
    QHTMLSignalBus *signalBusJs() const { return qhtmlSignalBus; }
    QHTMLJavaScriptRuntime *javascriptRuntime() const override { return qhtmlJavaScriptRuntime; }
    bool quickJSAvailable() const { return qhtmlJavaScriptRuntime && qhtmlJavaScriptRuntime->isAvailable(); }
    bool quickJSAvailableJs() const { return quickJSAvailable(); }
    bool compileJavaScript(const QString &source)
    {
        return qhtmlJavaScriptRuntime && qhtmlJavaScriptRuntime->compileOnly(source);
    }
    bool compileJavaScriptJs(const std::string &source)
    {
        return compileJavaScript(QString::fromStdString(source));
    }

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

inline QString qhtmlStandaloneHtmlSelectorForNode(const QHTMLNode *node)
{
    if (!node || dynamic_cast<const QHTMLDomTree *>(node)) {
        return QStringLiteral("document");
    }
    if (dynamic_cast<const QHTMLComponentInstance *>(node)) {
        return QStringLiteral("[component-instance='") + node->qhtmlUUID() + QStringLiteral("']");
    }
    return QStringLiteral("[qhtml-node='") + node->qhtmlUUID() + QStringLiteral("']");
}

inline QString qhtmlStandaloneHtmlDomEventName(QString eventName)
{
    eventName = eventName.trimmed().toLower();
    if (eventName.startsWith(QStringLiteral("on")) && eventName.size() > 2) {
        return eventName.mid(2);
    }
    return eventName;
}

inline QString qhtmlStandaloneHtmlJsIdentifier(QString name)
{
    name = name.trimmed();
    QString out;
    for (int i = 0; i < name.size(); ++i) {
        const QChar ch = name.at(i);
        const bool valid = ch.isLetterOrNumber() || ch == QLatin1Char('_') || ch == QLatin1Char('$');
        out += valid ? ch : QLatin1Char('_');
    }
    if (out.isEmpty() || out.at(0).isDigit()) {
        out.prepend(QLatin1Char('_'));
    }
    return out;
}

inline QString qhtmlStandaloneHtmlElementName(const QHTMLComponentDefinition *definition)
{
    if (!definition) {
        return QStringLiteral("qhtml-component");
    }
    QString base = definition->qhtmlName().trimmed().toLower();
    QString out;
    for (const QChar ch : base) {
        if ((ch >= QLatin1Char('a') && ch <= QLatin1Char('z')) ||
            (ch >= QLatin1Char('0') && ch <= QLatin1Char('9')) ||
            ch == QLatin1Char('-') ||
            ch == QLatin1Char('_') ||
            ch == QLatin1Char('.')) {
            out += ch;
        } else {
            out += QLatin1Char('-');
        }
    }
    if (out.isEmpty()) {
        out = QStringLiteral("qhtml-component");
    }
    if (!out.at(0).isLetter()) {
        out.prepend(QStringLiteral("qhtml-"));
    }
    if (!out.contains(QLatin1Char('-'))) {
        out += QLatin1Char('-') + definition->qhtmlUUID().left(8).toLower();
    }
    return out;
}

inline QString qhtmlStandaloneHtmlHandlerName(const QHTMLNode *node, const QHTMLEventHandler *handler)
{
    QString seed = node ? node->qhtmlUUID() : QHTMLReference::createUUID();
    seed.remove(QLatin1Char('-'));
    const QString eventName = handler ? qhtmlStandaloneHtmlDomEventName(handler->eventName()) : QStringLiteral("event");
    return QStringLiteral("qhtml_handler_") + seed.left(16) + QStringLiteral("_") + qhtmlStandaloneHtmlJsIdentifier(eventName);
}

inline void qhtmlAppendStandaloneComponentClass(const QHTMLComponentDefinition *definition, QStringList &lines)
{
    if (!definition || definition->qhtmlName().trimmed().isEmpty()) {
        return;
    }

    QHash<QString, QString> localSignalNames;
    for (QHTMLNode *child : definition->children()) {
        if (const QHTMLSignal *signalNode = dynamic_cast<const QHTMLSignal *>(child)) {
            if (!signalNode->qhtmlName().trimmed().isEmpty()) {
                localSignalNames.insert(signalNode->qhtmlName().trimmed().toLower(), signalNode->qhtmlName().trimmed());
            }
        }
    }

    const QString tagName = qhtmlStandaloneHtmlElementName(definition);
    const QString className = qhtmlStandaloneHtmlJsIdentifier(definition->qhtmlName().trimmed() + QStringLiteral("_") + definition->qhtmlUUID().left(8));
    lines.append(QStringLiteral("class ") + className + QStringLiteral(" extends HTMLElement {"));
    lines.append(QStringLiteral("  connectedCallback() {"));
    lines.append(QStringLiteral("    if (this.__qhtmlStandaloneConnected) return;"));
    lines.append(QStringLiteral("    this.__qhtmlStandaloneConnected = true;"));
    for (QHTMLNode *child : definition->children()) {
        if (const QHTMLEventHandler *handler = dynamic_cast<const QHTMLEventHandler *>(child)) {
            const QString rawEventName = qhtmlStandaloneHtmlDomEventName(handler->eventName());
            const QString eventName = localSignalNames.value(rawEventName.toLower(), rawEventName);
            const bool signalEvent = localSignalNames.contains(rawEventName.toLower());
            if (!eventName.trimmed().isEmpty()) {
                const QString params = handler->parameterList().trimmed().isEmpty()
                                           ? QStringLiteral("event")
                                           : handler->parameterList().trimmed();
                lines.append(QStringLiteral("    this.addEventListener(") + qhtmlJsStringLiteral(eventName) + QStringLiteral(", function(event) {"));
                lines.append(QStringLiteral("      return (function(") + params + QStringLiteral(") {"));
                const QStringList bodyLines = qhtmlScriptBody(handler->body()).split(QLatin1Char('\n'));
                for (const QString &bodyLine : bodyLines) {
                    lines.append(QStringLiteral("        ") + bodyLine);
                }
                lines.append(QStringLiteral("      }).apply(this, ") +
                             (signalEvent ? QStringLiteral("Array.isArray(event.detail) ? event.detail : [event]);")
                                          : QStringLiteral("[event]);")));
                lines.append(QStringLiteral("    });"));
            }
        }
    }
    lines.append(QStringLiteral("  }"));
    for (QHTMLNode *child : definition->children()) {
        if (const QHTMLFunction *functionNode = dynamic_cast<const QHTMLFunction *>(child)) {
            if (!functionNode->qhtmlName().trimmed().isEmpty()) {
                lines.append(QStringLiteral("  ") + qhtmlStandaloneHtmlJsIdentifier(functionNode->qhtmlName()) +
                             QStringLiteral("(") + functionNode->parameterList() + QStringLiteral(") {"));
                const QStringList bodyLines = qhtmlScriptBody(functionNode->body()).split(QLatin1Char('\n'));
                for (const QString &bodyLine : bodyLines) {
                    lines.append(QStringLiteral("    ") + bodyLine);
                }
                lines.append(QStringLiteral("  }"));
            }
        } else if (const QHTMLSignal *signalNode = dynamic_cast<const QHTMLSignal *>(child)) {
            if (!signalNode->qhtmlName().trimmed().isEmpty()) {
                lines.append(QStringLiteral("  ") + qhtmlStandaloneHtmlJsIdentifier(signalNode->qhtmlName()) +
                             QStringLiteral("(") + signalNode->parameterList() + QStringLiteral(") {"));
                lines.append(QStringLiteral("    this.dispatchEvent(new CustomEvent(") +
                             qhtmlJsStringLiteral(signalNode->qhtmlName().trimmed()) +
                             QStringLiteral(", { detail: Array.prototype.slice.call(arguments), bubbles: true }));"));
                lines.append(QStringLiteral("  }"));
            }
        }
    }
    lines.append(QStringLiteral("}"));
    lines.append(QStringLiteral("if (!customElements.get(") + qhtmlJsStringLiteral(tagName) +
                 QStringLiteral(")) customElements.define(") + qhtmlJsStringLiteral(tagName) +
                 QStringLiteral(", ") + className + QStringLiteral(");"));
}

inline void qhtmlAppendStandaloneHtmlNodeBootstrap(const QHTMLNode *node, QStringList &lines)
{
    if (!node || dynamic_cast<const QHTMLComponentInstance *>(node)) {
        return;
    }
    for (QHTMLNode *child : node->children()) {
        if (const QHTMLEventHandler *handler = dynamic_cast<const QHTMLEventHandler *>(child)) {
            const QString eventName = qhtmlStandaloneHtmlDomEventName(handler->eventName());
            if (!eventName.trimmed().isEmpty()) {
                const QString params = handler->parameterList().trimmed().isEmpty()
                                           ? QStringLiteral("event")
                                           : handler->parameterList().trimmed();
                lines.append(QStringLiteral("function ") + qhtmlStandaloneHtmlHandlerName(node, handler) +
                             QStringLiteral("(") + params + QStringLiteral(") {"));
                const QStringList bodyLines = qhtmlScriptBody(handler->body()).split(QLatin1Char('\n'));
                for (const QString &bodyLine : bodyLines) {
                    lines.append(QStringLiteral("  ") + bodyLine);
                }
                lines.append(QStringLiteral("}"));
            }
        }
    }
}

inline void qhtmlCollectStandaloneHtmlScript(const QHTMLNode *node, QStringList &lines, QStringList &scriptBlocks)
{
    if (!node) {
        return;
    }

    if (dynamic_cast<const QHTMLDomTree *>(node) ||
        dynamic_cast<const QHTMLDomElement *>(node) ||
        dynamic_cast<const QHTMLComponentInstance *>(node) ||
        dynamic_cast<const QHTMLLayout *>(node) ||
        dynamic_cast<const QHTMLCanvas *>(node) ||
        dynamic_cast<const QHTMLVideo *>(node) ||
        dynamic_cast<const QHTMLParticleEmitter *>(node)) {
        qhtmlAppendStandaloneHtmlNodeBootstrap(node, lines);
    }

    if (const QHTMLJavaScriptBlock *script = dynamic_cast<const QHTMLJavaScriptBlock *>(node)) {
        if (!script->body().trimmed().isEmpty()) {
            scriptBlocks.append(qhtmlScriptBody(script->body()));
        }
    } else if (const QHTMLConnect *connect = dynamic_cast<const QHTMLConnect *>(node)) {
        if (!connect->sourcePath().trimmed().isEmpty() && !connect->targetPath().trimmed().isEmpty()) {
            scriptBlocks.append(QStringLiteral("__qhtmlConnect(") +
                                qhtmlJsStringLiteral(connect->sourcePath().trimmed()) +
                                QStringLiteral(", ") +
                                qhtmlJsStringLiteral(connect->targetPath().trimmed()) +
                                QStringLiteral(");"));
        }
    }

    for (QHTMLNode *child : node->children()) {
        qhtmlCollectStandaloneHtmlScript(child, lines, scriptBlocks);
    }
}

inline void qhtmlCollectStandaloneComponentClasses(const QHTMLNode *node, QStringList &lines)
{
    if (!node) {
        return;
    }
    if (const QHTMLComponentDefinition *definition = dynamic_cast<const QHTMLComponentDefinition *>(node)) {
        qhtmlAppendStandaloneComponentClass(definition, lines);
    }
    for (QHTMLNode *child : node->children()) {
        qhtmlCollectStandaloneComponentClasses(child, lines);
    }
}

inline QString qhtmlStandaloneHtmlScript(const QHTMLNode *node)
{
    QStringList classLines;
    QStringList lines;
    QStringList scriptBlocks;
    qhtmlCollectStandaloneComponentClasses(node, classLines);
    qhtmlCollectStandaloneHtmlScript(node, lines, scriptBlocks);
    if (classLines.isEmpty() && lines.isEmpty() && scriptBlocks.isEmpty()) {
        return QString();
    }

    QStringList out;
    out.append(QStringLiteral("<script>"));
    out.append(classLines);
    out.append(lines);
    bool needsConnect = false;
    for (const QString &scriptBlock : scriptBlocks) {
        if (scriptBlock.contains(QStringLiteral("__qhtmlConnect("))) {
            needsConnect = true;
            break;
        }
    }
    if (needsConnect) {
        out.append(QStringLiteral("function __qhtmlResolve(path) { return String(path).split('.').reduce(function(value, part) { return value && value[part]; }, window); }"));
        out.append(QStringLiteral("function __qhtmlConnect(sourcePath, targetPath) {"));
        out.append(QStringLiteral("  var sourceParts = String(sourcePath).split('.');"));
        out.append(QStringLiteral("  var eventName = sourceParts.pop();"));
        out.append(QStringLiteral("  var owner = __qhtmlResolve(sourceParts.join('.'));"));
        out.append(QStringLiteral("  var target = __qhtmlResolve(targetPath);"));
        out.append(QStringLiteral("  owner.addEventListener(eventName, function(event) { target.apply(owner, event.detail || []); });"));
        out.append(QStringLiteral("}"));
    }
    for (const QString &scriptBlock : scriptBlocks) {
        const QStringList bodyLines = scriptBlock.split(QLatin1Char('\n'));
        for (const QString &bodyLine : bodyLines) {
            out.append(bodyLine);
        }
    }
    out.append(QStringLiteral("</script>"));
    return out.join(QLatin1Char('\n'));
}

inline void qhtmlApplyStandaloneHtmlIdsForNode(const QHTMLNode *node, QString &html)
{
    if (!node) {
        return;
    }
    if (const QHTMLComponentInstance *instance = dynamic_cast<const QHTMLComponentInstance *>(node)) {
        if (instance->definition() && !instance->definition()->qhtmlName().trimmed().isEmpty()) {
            const QString originalTag = QRegularExpression::escape(instance->definition()->qhtmlName().trimmed());
            const QString replacementTag = qhtmlStandaloneHtmlElementName(instance->definition());
            html.replace(QRegularExpression(QStringLiteral("<") + originalTag + QStringLiteral("(?=[\\s>])")),
                         QStringLiteral("<") + replacementTag);
            html.replace(QRegularExpression(QStringLiteral("</") + originalTag + QStringLiteral(">")),
                         QStringLiteral("</") + replacementTag + QStringLiteral(">"));
        }
        if (!instance->qhtmlName().trimmed().isEmpty()) {
            const QString marker = QStringLiteral(" component-instance=\"") + QHTMLNode::escapeAttribute(instance->qhtmlUUID()) + QStringLiteral("\"");
            const QString replacement = QStringLiteral(" id=\"") + QHTMLNode::escapeAttribute(instance->qhtmlName().trimmed()) + QStringLiteral("\"") + marker;
            html.replace(marker, replacement);
        }
    } else if (!dynamic_cast<const QHTMLDomTree *>(node) &&
               (dynamic_cast<const QHTMLDomElement *>(node) ||
                dynamic_cast<const QHTMLLayout *>(node) ||
                dynamic_cast<const QHTMLCanvas *>(node) ||
                dynamic_cast<const QHTMLVideo *>(node) ||
                dynamic_cast<const QHTMLParticleEmitter *>(node))) {
        QString eventAttributes;
        for (QHTMLNode *child : node->children()) {
            if (const QHTMLEventHandler *handler = dynamic_cast<const QHTMLEventHandler *>(child)) {
                const QString eventName = qhtmlStandaloneHtmlDomEventName(handler->eventName());
                if (!eventName.trimmed().isEmpty()) {
                    eventAttributes += QStringLiteral(" on") + QHTMLNode::escapeAttribute(eventName.trimmed()) +
                                       QStringLiteral("=\"") +
                                       QHTMLNode::escapeAttribute(qhtmlStandaloneHtmlHandlerName(node, handler) + QStringLiteral("(event)")) +
                                       QStringLiteral("\"");
                }
            }
        }
        const QString marker = QStringLiteral(" qhtml-node=\"") + QHTMLNode::escapeAttribute(node->qhtmlUUID()) + QStringLiteral("\"");
        const QString replacement = QStringLiteral(" id=\"") + QHTMLNode::escapeAttribute(node->qhtmlUUID()) + QStringLiteral("\"") + eventAttributes + marker;
        html.replace(marker, replacement);
    }
    for (QHTMLNode *child : node->children()) {
        qhtmlApplyStandaloneHtmlIdsForNode(child, html);
    }
}

inline QString qhtmlStandaloneHtmlMarkup(const QHTMLNode *node)
{
    QString html = node ? node->renderHtml() : QString();
    qhtmlApplyStandaloneHtmlIdsForNode(node, html);
    return html;
}

inline QString qhtmlScriptElementText(QString value)
{
    value.replace(QRegularExpression(QStringLiteral("</script"), QRegularExpression::CaseInsensitiveOption),
                  QStringLiteral("<\\/script"));
    return value;
}

inline QString qhtmlBase64EncodeUtf8(const QString &value);
inline QString qhtmlBase64DecodeUtf8(const QString &value);
inline void qhtmlInsertBase64Body(QJsonObject &object, const QString &body);

inline QString QHTMLNode::toHTML() const
{
    const QString rollId = qhtmlUUID().trimmed().isEmpty()
                               ? QHTMLReference::createUUID()
                               : qhtmlUUID();
    const QString html = renderHtml();
    const QString jsonPayload = qhtmlBase64EncodeUtf8(toJSONText());
    QString out;
    out += QStringLiteral("<div data-qhtml-rolled-root=\"") + escapeAttribute(rollId) +
           QStringLiteral("\" style=\"display: contents;\">");
    out += html;
    out += QStringLiteral("\n");
    out += QStringLiteral("<script>");
    out += QStringLiteral("(function(script){");
    out += QStringLiteral("var done=false;");
    out += QStringLiteral("function run(){");
    out += QStringLiteral("if(done)return;done=true;");
    out += QStringLiteral("var root=script.closest('[data-qhtml-rolled-root=\"") +
           escapeAttribute(rollId) + QStringLiteral("\"]');");
    out += QStringLiteral("var obj=document.createElement('q-html');");
    out += QStringLiteral("var json=new TextDecoder().decode(Uint8Array.from(atob(") +
           qhtmlJsStringLiteral(jsonPayload) +
           QStringLiteral("),function(ch){return ch.charCodeAt(0);}));");
    out += QStringLiteral("obj.fromJSON(JSON.parse(json));");
    out += QStringLiteral("root.replaceWith(obj);");
    out += QStringLiteral("}");
    out += QStringLiteral("document.addEventListener('QHTML7Ready',run,{once:true});");
    out += QStringLiteral("if(window.QHTML7Ready){window.QHTML7Ready.then(run);}");
    out += QStringLiteral("})(document.currentScript);");
    out += QStringLiteral("</script>");
    out += QStringLiteral("</div>");
    return out;
}

inline QJsonObject qhtmlStringHashToJsonObject(const QHash<QString, QString> &values)
{
    QJsonObject object;
    const QStringList keys = values.keys();
    for (const QString &key : keys) {
        object.insert(key, values.value(key));
    }
    return object;
}

inline QHash<QString, QString> qhtmlStringHashFromJsonObject(const QJsonObject &object)
{
    QHash<QString, QString> values;
    for (auto it = object.constBegin(); it != object.constEnd(); ++it) {
        if (it.key().trimmed().isEmpty()) {
            continue;
        }
        QString value;
        if (it.value().isString()) {
            value = it.value().toString();
        } else if (it.value().isDouble()) {
            const double number = it.value().toDouble();
            const qint64 rounded = qRound64(number);
            value = qAbs(number - double(rounded)) < 0.000000000001
                        ? QString::number(rounded)
                        : QString::number(number, 'g', 15);
        } else if (it.value().isBool()) {
            value = it.value().toBool() ? QStringLiteral("true") : QStringLiteral("false");
        } else if (it.value().isNull()) {
            value = QStringLiteral("null");
        } else if (it.value().isArray()) {
            value = QString::fromUtf8(QJsonDocument(it.value().toArray()).toJson(QJsonDocument::Compact));
        } else if (it.value().isObject()) {
            value = QString::fromUtf8(QJsonDocument(it.value().toObject()).toJson(QJsonDocument::Compact));
        }
        values.insert(it.key(), value);
    }
    return values;
}

inline QString qhtmlFirstJsonString(const QJsonObject &object, std::initializer_list<const char *> keys, const QString &fallback = QString())
{
    for (const char *key : keys) {
        const QString qKey = QString::fromLatin1(key);
        if (!object.contains(qKey)) {
            continue;
        }
        const QJsonValue value = object.value(qKey);
        if (value.isString()) {
            return value.toString();
        }
        if (value.isDouble()) {
            const double number = value.toDouble();
            const qint64 rounded = qRound64(number);
            if (qAbs(number - double(rounded)) < 0.000000000001) {
                return QString::number(rounded);
            }
            return QString::number(number, 'g', 15);
        }
        if (value.isBool()) {
            return value.toBool() ? QStringLiteral("true") : QStringLiteral("false");
        }
        if (value.isNull()) {
            return QStringLiteral("null");
        }
        if (value.isArray()) {
            return QString::fromUtf8(QJsonDocument(value.toArray()).toJson(QJsonDocument::Compact));
        }
        if (value.isObject()) {
            return QString::fromUtf8(QJsonDocument(value.toObject()).toJson(QJsonDocument::Compact));
        }
    }
    return fallback;
}

inline QJsonArray qhtmlStringListToJsonArray(const QStringList &values)
{
    QJsonArray array;
    for (const QString &value : values) {
        array.append(value);
    }
    return array;
}

inline QStringList qhtmlStringListFromJsonValue(const QJsonValue &value)
{
    QStringList out;
    if (value.isArray()) {
        const QJsonArray array = value.toArray();
        for (const QJsonValue &item : array) {
            if (item.isString()) {
                out.append(item.toString());
            } else {
                QJsonObject wrapper;
                wrapper.insert(QStringLiteral("value"), item);
                out.append(qhtmlFirstJsonString(wrapper, {"value"}));
            }
        }
    } else if (value.isString()) {
        out = QHTMLFunction::parseParameters(value.toString());
    }
    return out;
}

inline bool qhtmlIsInternalRuntimeChild(const QHTMLNode *parent, const QHTMLNode *child)
{
    if (!parent || !child) {
        return false;
    }
    if (const QHTMLTimer *timer = dynamic_cast<const QHTMLTimer *>(parent)) {
        return child == timer->timeoutSignal();
    }
    if (const QHTMLPropertyAnimation *animation = dynamic_cast<const QHTMLPropertyAnimation *>(parent)) {
        return child == animation->startedSignal() ||
               child == animation->stoppedSignal() ||
               child == animation->steppedSignal() ||
               child == animation->endedSignal() ||
               child == animation->finishedSignal();
    }
    if (const QHTMLScriptAction *action = dynamic_cast<const QHTMLScriptAction *>(parent)) {
        return child == action->startedSignal() ||
               child == action->finishedSignal();
    }
    if (const QHTMLAnimationGroup *group = dynamic_cast<const QHTMLAnimationGroup *>(parent)) {
        return child == group->startedSignal() ||
               child == group->stoppedSignal() ||
               child == group->finishedSignal();
    }
    return false;
}

inline QString qhtmlBase64EncodeUtf8(const QString &value)
{
    return QString::fromLatin1(value.toUtf8().toBase64());
}

inline QString qhtmlBase64DecodeUtf8(const QString &value)
{
    return QString::fromUtf8(QByteArray::fromBase64(value.toLatin1()));
}

inline void qhtmlInsertBase64Body(QJsonObject &object, const QString &body)
{
    const QString encoded = qhtmlBase64EncodeUtf8(body);
    object.insert(QStringLiteral("qhtmlContents"), encoded);
    object.insert(QStringLiteral("body"), encoded);
    object.insert(QStringLiteral("qhtmlContentsEncoding"), QStringLiteral("base64"));
    object.insert(QStringLiteral("bodyEncoding"), QStringLiteral("base64"));
}

inline QJsonArray qhtmlChildArrayFromNode(const QHTMLNode *node)
{
    QJsonArray childrenArray;
    if (!node) {
        return childrenArray;
    }

    if (const QHTMLFunction *functionNode = dynamic_cast<const QHTMLFunction *>(node)) {
        if (!functionNode->body().trimmed().isEmpty()) {
            QJsonObject body;
            body.insert(QStringLiteral("qhtmlType"), QStringLiteral("QHTMLJavaScriptBlock"));
            qhtmlInsertBase64Body(body, functionNode->body());
            childrenArray.append(body);
        }
    }

    for (QHTMLNode *child : node->children()) {
        if (child && !qhtmlIsInternalRuntimeChild(node, child)) {
            childrenArray.append(child->toJsonObject());
        }
    }
    return childrenArray;
}

inline QString qhtmlJsonValueToQHTMLSource(const QJsonValue &value)
{
    if (value.isObject()) {
        const QJsonObject object = value.toObject();
        if (object.contains(QStringLiteral("value"))) {
            return qhtmlJsonValueToQHTMLSource(object.value(QStringLiteral("value")));
        }
        return QString::fromUtf8(QJsonDocument(object).toJson(QJsonDocument::Compact));
    }
    if (value.isArray()) {
        return QString::fromUtf8(QJsonDocument(value.toArray()).toJson(QJsonDocument::Compact));
    }
    if (value.isString()) {
        return value.toString();
    }
    if (value.isDouble()) {
        const double number = value.toDouble();
        const qint64 rounded = qRound64(number);
        if (qAbs(number - double(rounded)) < 0.000000000001) {
            return QString::number(rounded);
        }
        return QString::number(number, 'g', 15);
    }
    if (value.isBool()) {
        return value.toBool() ? QStringLiteral("true") : QStringLiteral("false");
    }
    if (value.isNull()) {
        return QStringLiteral("null");
    }
    return QString();
}

inline QJsonObject qhtmlPropertyValueObject(const QString &source)
{
    const QString value = source.trimmed();
    QJsonObject object;
    if (value == QStringLiteral("true") || value == QStringLiteral("false")) {
        object.insert(QStringLiteral("type"), QStringLiteral("boolean"));
        object.insert(QStringLiteral("value"), value);
        return object;
    }
    if (value == QStringLiteral("null")) {
        object.insert(QStringLiteral("type"), QStringLiteral("null"));
        object.insert(QStringLiteral("value"), value);
        return object;
    }
    if (value.startsWith(QLatin1Char('`')) && value.endsWith(QLatin1Char('`'))) {
        object.insert(QStringLiteral("type"), QStringLiteral("template"));
        object.insert(QStringLiteral("value"), value);
        return object;
    }
    if (value.startsWith(QLatin1Char('[')) || value.startsWith(QLatin1Char('{'))) {
        QJsonParseError error;
        const QJsonDocument document = QJsonDocument::fromJson(value.toUtf8(), &error);
        if (error.error == QJsonParseError::NoError) {
            object.insert(QStringLiteral("type"), document.isArray() ? QStringLiteral("array") : QStringLiteral("object"));
            object.insert(QStringLiteral("value"), document.isArray() ? QJsonValue(document.array()) : QJsonValue(document.object()));
            object.insert(QStringLiteral("source"), value);
            return object;
        }
    }
    if (QRegularExpression(QStringLiteral("^[-+]?(?:\\d+|\\d*\\.\\d+)$")).match(value).hasMatch()) {
        object.insert(QStringLiteral("type"), QStringLiteral("number"));
        object.insert(QStringLiteral("value"), value);
        return object;
    }
    if (QRegularExpression(QStringLiteral("^[-+]?(?:\\d+|\\d*\\.\\d+)(?:%|px|em|rem|vw|vh|vmin|vmax|ch|ex|cm|mm|in|pt|pc|deg|rad|turn|s|ms)$")).match(value).hasMatch()) {
        object.insert(QStringLiteral("type"), QStringLiteral("css-unit"));
        object.insert(QStringLiteral("value"), value);
        return object;
    }
    if (value.endsWith(QStringLiteral(")")) && value.contains(QLatin1Char('('))) {
        object.insert(QStringLiteral("type"), QStringLiteral("call"));
        object.insert(QStringLiteral("value"), value);
        return object;
    }
    if (value.contains(QLatin1Char('.')) && !value.contains(QRegularExpression(QStringLiteral("\\s")))) {
        object.insert(QStringLiteral("type"), QStringLiteral("reference"));
        object.insert(QStringLiteral("value"), value);
        return object;
    }
    object.insert(QStringLiteral("type"), QStringLiteral("string"));
    object.insert(QStringLiteral("value"), value);
    return object;
}

inline QString qhtmlBodyFromJsonObject(const QJsonObject &object)
{
    const QString qhtmlContentsEncoding = qhtmlFirstJsonString(object, {"qhtmlContentsEncoding", "contentsEncoding"}).toLower();
    const QString bodyEncoding = qhtmlFirstJsonString(object, {"bodyEncoding", "qhtmlBodyEncoding"}).toLower();
    const QString qhtmlContents = qhtmlFirstJsonString(object, {"qhtmlContents", "qhtmlBody", "contents", "value"});
    const QString body = qhtmlFirstJsonString(object, {"body"});
    if (qhtmlContentsEncoding == QStringLiteral("base64") && !qhtmlContents.isNull()) {
        return qhtmlBase64DecodeUtf8(qhtmlContents);
    }
    if (bodyEncoding == QStringLiteral("base64") && !body.isNull()) {
        return qhtmlBase64DecodeUtf8(body);
    }
    const QString qhtmlContentsBase64 = qhtmlFirstJsonString(object, {"qhtmlContentsBase64", "contentsBase64"});
    if (!qhtmlContentsBase64.isNull() && !qhtmlContentsBase64.isEmpty()) {
        return qhtmlBase64DecodeUtf8(qhtmlContentsBase64);
    }
    const QString bodyBase64 = qhtmlFirstJsonString(object, {"bodyBase64", "qhtmlBodyBase64"});
    if (!bodyBase64.isNull() && !bodyBase64.isEmpty()) {
        return qhtmlBase64DecodeUtf8(bodyBase64);
    }
    const QString direct = qhtmlFirstJsonString(object, {"qhtmlContents", "qhtmlBody", "body", "contents", "value"});
    if (!direct.isNull() && !direct.isEmpty()) {
        return direct;
    }
    const QJsonArray children = object.value(QStringLiteral("qhtmlChildren")).toArray(object.value(QStringLiteral("children")).toArray());
    for (const QJsonValue &childValue : children) {
        if (!childValue.isObject()) {
            continue;
        }
        const QJsonObject child = childValue.toObject();
        const QString type = qhtmlFirstJsonString(child, {"qhtmlType", "type"});
        if (type == QStringLiteral("QHTMLJavaScriptBlock")) {
            return qhtmlBodyFromJsonObject(child);
        }
    }
    return QString();
}

inline bool qhtmlNodeConsumesJavaScriptBlock(const QHTMLNode *node)
{
    return dynamic_cast<const QHTMLFunction *>(node) ||
           dynamic_cast<const QHTMLEventHandler *>(node) ||
           dynamic_cast<const QHTMLScript *>(node) ||
           dynamic_cast<const QHTMLScriptAction *>(node) ||
           dynamic_cast<const QHTMLClass *>(node) ||
           dynamic_cast<const QHTMLStyle *>(node) ||
           dynamic_cast<const QHTMLTheme *>(node) ||
           dynamic_cast<const QHTMLPainter *>(node) ||
           dynamic_cast<const QHTMLForNode *>(node) ||
           dynamic_cast<const QHTMLConnect *>(node) ||
           dynamic_cast<const QHTMLImportNode *>(node);
}

inline const QHTMLNode *qhtmlTopScope(const QHTMLNode *node)
{
    const QHTMLNode *scope = node;
    while (scope && scope->parent()) {
        scope = scope->parent();
    }
    return scope ? scope : node;
}

inline QHTMLComponentDefinition *qhtmlFindComponentDefinitionByNameIn(QHTMLNode *node, const QString &name)
{
    if (!node || name.trimmed().isEmpty()) {
        return nullptr;
    }
    if (QHTMLComponentDefinition *definition = dynamic_cast<QHTMLComponentDefinition *>(node)) {
        if (definition->qhtmlName() == name) {
            return definition;
        }
    }
    for (QHTMLNode *child : node->children()) {
        if (QHTMLComponentDefinition *found = qhtmlFindComponentDefinitionByNameIn(child, name)) {
            return found;
        }
    }
    return nullptr;
}

inline void qhtmlResolveComponentInstanceDefinitions(QHTMLNode *node, QHTMLNode *scope = nullptr)
{
    if (!node) {
        return;
    }
    QHTMLNode *lookupScope = scope ? scope : node;
    if (QHTMLComponentInstance *instance = dynamic_cast<QHTMLComponentInstance *>(node)) {
        QString componentName = instance->property(QStringLiteral("qhtmlComponentName")).trimmed();
        if (componentName.isEmpty()) {
            componentName = instance->property(QStringLiteral("componentName")).trimmed();
        }
        if (componentName.isEmpty() && instance->definition()) {
            componentName = instance->definition()->qhtmlName();
        }
        if (!componentName.isEmpty()) {
            if (!instance->definition() || instance->definition()->qhtmlName() != componentName) {
                instance->setDefinition(qhtmlFindComponentDefinitionByNameIn(lookupScope, componentName));
            }
            instance->setProperty(QStringLiteral("qhtmlComponentName"), componentName);
            instance->setProperty(QStringLiteral("componentName"), componentName);
        }
    }
    for (QHTMLNode *child : node->children()) {
        qhtmlResolveComponentInstanceDefinitions(child, lookupScope);
    }
}

inline QJsonArray qhtmlComponentInheritsArray(const QHTMLComponentDefinition *definition)
{
    QJsonArray inherits;
    if (!definition) {
        return inherits;
    }
    QHTMLNode *top = const_cast<QHTMLNode *>(qhtmlTopScope(definition));
    QSet<QString> emitted;
    for (const QString &baseName : definition->extendsList()) {
        if (baseName.trimmed().isEmpty()) {
            continue;
        }
        QHTMLComponentDefinition *base = qhtmlFindComponentDefinitionByNameIn(top, baseName.trimmed());
        if (!base || base == definition || emitted.contains(base->qhtmlUUID())) {
            QJsonObject unresolved;
            unresolved.insert(QStringLiteral("qhtmlType"), QStringLiteral("QHTMLComponentDefinition"));
            unresolved.insert(QStringLiteral("qhtmlName"), baseName.trimmed());
            unresolved.insert(QStringLiteral("qhtmlUnresolved"), true);
            inherits.append(unresolved);
            continue;
        }
        emitted.insert(base->qhtmlUUID());
        inherits.append(base->toJsonObject());
    }
    return inherits;
}

inline QJsonValue QHTMLNode::toJsonValue() const
{
    if (dynamic_cast<const QHTMLDomTree *>(this)) {
        QJsonArray childrenArray;
        for (QHTMLNode *child : children()) {
            if (child) {
                childrenArray.append(child->toJsonObject());
            }
        }
        return childrenArray;
    }
    return toJsonObject();
}

inline QJsonObject QHTMLNode::toJsonObject() const
{
    QJsonObject object;
    object.insert(QStringLiteral("qhtmlType"), qhtmlType());
    object.insert(QStringLiteral("qhtmlName"), qhtmlName());
    object.insert(QStringLiteral("qhtmlUUID"), qhtmlUUID());

    // Compatibility aliases for older tooling that consumed the previous serializer.
    object.insert(QStringLiteral("type"), qhtmlType());
    object.insert(QStringLiteral("name"), qhtmlName());
    object.insert(QStringLiteral("uuid"), qhtmlUUID());

    object.insert(QStringLiteral("qhtmlProperties"), qhtmlStringHashToJsonObject(qhtmlProperties));
    object.insert(QStringLiteral("properties"), qhtmlStringHashToJsonObject(qhtmlProperties));

    if (const QHTMLDomElement *element = dynamic_cast<const QHTMLDomElement *>(this)) {
        object.insert(QStringLiteral("qhtmlTagName"), element->tagName());
        object.insert(QStringLiteral("tagName"), element->tagName());
        object.insert(QStringLiteral("qhtmlAttributes"), qhtmlStringHashToJsonObject(element->attributes()));
        object.insert(QStringLiteral("attributes"), qhtmlStringHashToJsonObject(element->attributes()));
    }

    if (const QHTMLTypedNode *typed = dynamic_cast<const QHTMLTypedNode *>(this)) {
        object.insert(QStringLiteral("qhtmlKeyword"), typed->keyword());
        object.insert(QStringLiteral("keyword"), typed->keyword());
        object.insert(QStringLiteral("qhtmlAttributes"), qhtmlStringHashToJsonObject(typed->attributes()));
        object.insert(QStringLiteral("attributes"), qhtmlStringHashToJsonObject(typed->attributes()));
    }

    if (const QHTMLTextFragment *text = dynamic_cast<const QHTMLTextFragment *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), text->value());
        object.insert(QStringLiteral("value"), text->value());
    } else if (const QHTMLHTMLFragment *html = dynamic_cast<const QHTMLHTMLFragment *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), html->value());
        object.insert(QStringLiteral("value"), html->value());
    } else if (const QHTMLUnknownFragment *unknown = dynamic_cast<const QHTMLUnknownFragment *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), unknown->value());
        object.insert(QStringLiteral("value"), unknown->value());
    } else if (const QHTMLJavaScriptBlock *scriptBlock = dynamic_cast<const QHTMLJavaScriptBlock *>(this)) {
        qhtmlInsertBase64Body(object, scriptBlock->contents());
    } else if (const QHTMLArrayNode *arrayNode = dynamic_cast<const QHTMLArrayNode *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), arrayNode->valuesLiteral());
        object.insert(QStringLiteral("valuesLiteral"), arrayNode->valuesLiteral());
    } else if (const QHTMLMapNode *mapNode = dynamic_cast<const QHTMLMapNode *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), mapNode->valuesLiteral());
        object.insert(QStringLiteral("keysLiteral"), mapNode->keysLiteral());
        object.insert(QStringLiteral("valuesLiteral"), mapNode->valuesLiteral());
    } else if (const QHTMLJsonValue *jsonValue = dynamic_cast<const QHTMLJsonValue *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), jsonValue->toJson());
        object.insert(QStringLiteral("qhtmlJson"), jsonValue->toJson());
        object.insert(QStringLiteral("qhtmlJsonType"), jsonValue->typeName());
    } else if (const QHTMLJsonArray *jsonArray = dynamic_cast<const QHTMLJsonArray *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), jsonArray->valuesLiteral());
        object.insert(QStringLiteral("qhtmlJson"), jsonArray->valuesLiteral());
    } else if (const QHTMLJsonObject *jsonObject = dynamic_cast<const QHTMLJsonObject *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), jsonObject->valuesLiteral());
        object.insert(QStringLiteral("qhtmlJson"), jsonObject->valuesLiteral());
    } else if (const QHTMLJsonDocument *jsonDocument = dynamic_cast<const QHTMLJsonDocument *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), jsonDocument->toJson());
        object.insert(QStringLiteral("qhtmlJson"), jsonDocument->toJson());
        object.insert(QStringLiteral("parseError"), jsonDocument->parseError());
    } else if (const QHTMLArray *arrayBlock = dynamic_cast<const QHTMLArray *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), arrayBlock->valuesLiteral());
        object.insert(QStringLiteral("valuesLiteral"), arrayBlock->valuesLiteral());
    } else if (const QHTMLMap *mapBlock = dynamic_cast<const QHTMLMap *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), mapBlock->valuesLiteral());
        object.insert(QStringLiteral("keysLiteral"), mapBlock->keysLiteral());
        object.insert(QStringLiteral("valuesLiteral"), mapBlock->valuesLiteral());
    } else if (const QHTMLModel *modelBlock = dynamic_cast<const QHTMLModel *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), modelBlock->valuesLiteral());
        object.insert(QStringLiteral("valuesLiteral"), modelBlock->valuesLiteral());
    } else if (const QHTMLProperty *propertyNode = dynamic_cast<const QHTMLProperty *>(this)) {
        object.insert(QStringLiteral("qhtmlValue"), qhtmlPropertyValueObject(propertyNode->value()));
        object.insert(QStringLiteral("value"), propertyNode->value());
    } else if (const QHTMLPropertyAssignment *assignment = dynamic_cast<const QHTMLPropertyAssignment *>(this)) {
        object.insert(QStringLiteral("qhtmlValue"), qhtmlPropertyValueObject(assignment->value()));
        object.insert(QStringLiteral("value"), assignment->value());
    } else if (const QHTMLFunction *functionNode = dynamic_cast<const QHTMLFunction *>(this)) {
        object.insert(QStringLiteral("qhtmlParameters"), qhtmlStringListToJsonArray(functionNode->parameters()));
        object.insert(QStringLiteral("parameters"), functionNode->parameterList());
        qhtmlInsertBase64Body(object, functionNode->body());
    } else if (const QHTMLSignal *signalNode = dynamic_cast<const QHTMLSignal *>(this)) {
        object.insert(QStringLiteral("qhtmlParameters"), qhtmlStringListToJsonArray(signalNode->parameters()));
        object.insert(QStringLiteral("parameters"), signalNode->parameterList());
    } else if (const QHTMLEventHandler *handler = dynamic_cast<const QHTMLEventHandler *>(this)) {
        object.insert(QStringLiteral("qhtmlEventName"), handler->eventName());
        object.insert(QStringLiteral("qhtmlParameters"), qhtmlStringListToJsonArray(handler->parameters()));
        object.insert(QStringLiteral("parameters"), handler->parameterList());
        qhtmlInsertBase64Body(object, handler->body());
    } else if (const QHTMLScript *script = dynamic_cast<const QHTMLScript *>(this)) {
        qhtmlInsertBase64Body(object, script->body());
    } else if (const QHTMLScriptAction *action = dynamic_cast<const QHTMLScriptAction *>(this)) {
        qhtmlInsertBase64Body(object, action->body());
    } else if (const QHTMLStyle *style = dynamic_cast<const QHTMLStyle *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), style->body());
        object.insert(QStringLiteral("body"), style->body());
        object.insert(QStringLiteral("qhtmlCssText"), style->cssText());
        object.insert(QStringLiteral("cssText"), style->cssText());
    } else if (const QHTMLTheme *theme = dynamic_cast<const QHTMLTheme *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), theme->body());
        object.insert(QStringLiteral("body"), theme->body());
    } else if (const QHTMLClass *classNode = dynamic_cast<const QHTMLClass *>(this)) {
        qhtmlInsertBase64Body(object, classNode->body());
    } else if (const QHTMLForNode *forNode = dynamic_cast<const QHTMLForNode *>(this)) {
        object.insert(QStringLiteral("qhtmlVariable"), forNode->variableName());
        object.insert(QStringLiteral("qhtmlCollection"), forNode->collectionExpression());
        object.insert(QStringLiteral("qhtmlContents"), forNode->body());
        object.insert(QStringLiteral("body"), forNode->body());
    } else if (const QHTMLConnect *connect = dynamic_cast<const QHTMLConnect *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), connect->body());
        object.insert(QStringLiteral("body"), connect->body());
        object.insert(QStringLiteral("qhtmlSourcePath"), connect->sourcePath());
        object.insert(QStringLiteral("qhtmlTargetPath"), connect->targetPath());
    } else if (const QHTMLImportNode *importNode = dynamic_cast<const QHTMLImportNode *>(this)) {
        object.insert(QStringLiteral("qhtmlContents"), importNode->body());
        object.insert(QStringLiteral("body"), importNode->body());
        object.insert(QStringLiteral("qhtmlPath"), importNode->path());
        object.insert(QStringLiteral("path"), importNode->path());
        object.insert(QStringLiteral("qhtmlCacheMode"), importNode->cacheMode());
        object.insert(QStringLiteral("qhtmlImportKind"), importNode->importKind());
        object.insert(QStringLiteral("importKind"), importNode->importKind());
    } else if (const QHTMLPainter *painter = dynamic_cast<const QHTMLPainter *>(this)) {
        qhtmlInsertBase64Body(object, painter->body());
    } else if (const QHTMLComponentDefinition *definition = dynamic_cast<const QHTMLComponentDefinition *>(this)) {
        object.insert(QStringLiteral("qhtmlInherits"), qhtmlComponentInheritsArray(definition));
        object.insert(QStringLiteral("componentName"), definition->qhtmlName());
        object.insert(QStringLiteral("extends"), definition->extendsList().join(QStringLiteral(" ")));
    } else if (const QHTMLComponentInstance *instance = dynamic_cast<const QHTMLComponentInstance *>(this)) {
        object.insert(QStringLiteral("qhtmlComponentDefinitionUUID"), instance->componentDefinitionUUID());
        object.insert(QStringLiteral("qhtmlComponentName"), instance->definition() ? instance->definition()->qhtmlName() : QString());
        object.insert(QStringLiteral("componentDefinitionUUID"), instance->componentDefinitionUUID());
        object.insert(QStringLiteral("componentName"), instance->definition() ? instance->definition()->qhtmlName() : QString());
    }

    object.insert(QStringLiteral("qhtmlSource"), sourceQHTML(0));
    object.insert(QStringLiteral("source"), sourceQHTML(0));
    object.insert(QStringLiteral("qhtmlHTML"), renderHtml());
    object.insert(QStringLiteral("html"), renderHtml());

    const QJsonArray childrenArray = qhtmlChildArrayFromNode(this);
    object.insert(QStringLiteral("qhtmlChildren"), childrenArray);
    object.insert(QStringLiteral("children"), childrenArray);
    return object;
}

inline QString QHTMLNode::toJSONText() const
{
    const QJsonValue value = toJsonValue();
    if (value.isArray()) {
        return QString::fromUtf8(QJsonDocument(value.toArray()).toJson(QJsonDocument::Compact));
    }
    if (value.isObject()) {
        return QString::fromUtf8(QJsonDocument(value.toObject()).toJson(QJsonDocument::Compact));
    }
    return QStringLiteral("null");
}

inline emscripten::val QHTMLNode::toJSONJs() const
{
    const std::string json = toJSONText().toStdString();
    return emscripten::val::global("JSON").call<emscripten::val>("parse", json);
}

inline QHTMLNode *QHTMLNode::nodeFromJsonObject(const QJsonObject &object, QHTMLNode *ownerScope)
{
    const QString type = qhtmlFirstJsonString(object, {"qhtmlType", "qhtmltype", "type"}, QStringLiteral("QHTMLNode"));
    const QString name = qhtmlFirstJsonString(object, {"qhtmlName", "name"});
    const QString keyword = qhtmlFirstJsonString(object, {"qhtmlKeyword", "keyword"});
    const QJsonObject attributeObject = object.value(QStringLiteral("qhtmlAttributes")).toObject(object.value(QStringLiteral("attributes")).toObject());
    QHash<QString, QString> attributes = qhtmlStringHashFromJsonObject(attributeObject);
    const QString body = qhtmlBodyFromJsonObject(object);

    QHTMLNode *node = nullptr;
    if (type == QStringLiteral("QHTMLDomTree")) {
        node = new QHTMLDomTree();
    } else if (type == QStringLiteral("QHTMLDomElement") || type == QStringLiteral("QHTMLAnonNode")) {
        const QString tagName = qhtmlFirstJsonString(object, {"qhtmlTagName", "tagName"}, name);
        node = new QHTMLDomElement(tagName, attributes);
    } else if (type == QStringLiteral("QHTMLTextFragment")) {
        node = new QHTMLTextFragment(qhtmlFirstJsonString(object, {"qhtmlContents", "value", "contents"}));
    } else if (type == QStringLiteral("QHTMLHTMLFragment")) {
        node = new QHTMLHTMLFragment(qhtmlFirstJsonString(object, {"qhtmlContents", "value", "contents"}));
    } else if (type == QStringLiteral("QHTMLUnknownFragment")) {
        node = new QHTMLUnknownFragment(qhtmlFirstJsonString(object, {"qhtmlContents", "value", "contents"}));
    } else if (type == QStringLiteral("QHTMLJavaScriptBlock")) {
        node = new QHTMLJavaScriptBlock(body);
    } else if (type == QStringLiteral("QHTMLArrayNode")) {
        node = new QHTMLArrayNode(qhtmlFirstJsonString(object, {"qhtmlContents", "valuesLiteral", "value"}));
    } else if (type == QStringLiteral("QHTMLMapNode")) {
        node = new QHTMLMapNode(qhtmlFirstJsonString(object, {"qhtmlContents", "valuesLiteral", "value"}));
    } else if (type == QStringLiteral("QHTMLJsonValue")) {
        node = new QHTMLJsonValue(qhtmlFirstJsonString(object, {"qhtmlJson", "qhtmlContents", "valuesLiteral", "value"}));
    } else if (type == QStringLiteral("QHTMLJsonArray")) {
        node = new QHTMLJsonArray(qhtmlFirstJsonString(object, {"qhtmlJson", "qhtmlContents", "valuesLiteral", "value"}));
    } else if (type == QStringLiteral("QHTMLJsonObject")) {
        node = new QHTMLJsonObject(qhtmlFirstJsonString(object, {"qhtmlJson", "qhtmlContents", "valuesLiteral", "value"}));
    } else if (type == QStringLiteral("QHTMLJsonDocument")) {
        node = new QHTMLJsonDocument(qhtmlFirstJsonString(object, {"qhtmlJson", "qhtmlContents", "valuesLiteral", "value"}));
    } else if (type == QStringLiteral("QHTMLComponentDefinition")) {
        QString extends = qhtmlFirstJsonString(object, {"extends"});
        if (extends.trimmed().isEmpty() && object.value(QStringLiteral("qhtmlInherits")).isArray()) {
            QStringList names;
            for (const QJsonValue &inheritValue : object.value(QStringLiteral("qhtmlInherits")).toArray()) {
                if (inheritValue.isObject()) {
                    const QString baseName = qhtmlFirstJsonString(inheritValue.toObject(), {"qhtmlName", "name", "componentName"});
                    if (!baseName.trimmed().isEmpty()) {
                        names.append(baseName.trimmed());
                    }
                } else if (inheritValue.isString()) {
                    names.append(inheritValue.toString().trimmed());
                }
            }
            extends = names.join(QLatin1Char(' '));
        }
        if (!extends.trimmed().isEmpty()) {
            attributes.insert(QStringLiteral("extends"), extends.trimmed());
        }
        node = new QHTMLComponentDefinition(name, attributes);
    } else if (type == QStringLiteral("QHTMLComponentInstance")) {
        QHTMLComponentDefinition *definition = nullptr;
        const QString componentName = qhtmlFirstJsonString(object, {"qhtmlComponentName", "componentName"});
        if (ownerScope && !componentName.isEmpty()) {
            definition = qhtmlFindComponentDefinitionByNameIn(qhtmlTopScope(ownerScope) ? const_cast<QHTMLNode *>(qhtmlTopScope(ownerScope)) : ownerScope, componentName);
        }
        node = new QHTMLComponentInstance(name, attributes, definition);
    } else if (type == QStringLiteral("QHTMLFunction")) {
        const QStringList parameters = qhtmlStringListFromJsonValue(object.value(QStringLiteral("qhtmlParameters")));
        if (!parameters.isEmpty()) {
            attributes.insert(QStringLiteral("parameters"), parameters.join(QStringLiteral(", ")));
        } else if (object.contains(QStringLiteral("parameters"))) {
            attributes.insert(QStringLiteral("parameters"), qhtmlFirstJsonString(object, {"parameters"}));
        }
        node = new QHTMLFunction(name, attributes, body);
    } else if (type == QStringLiteral("QHTMLSignal")) {
        const QStringList parameters = qhtmlStringListFromJsonValue(object.value(QStringLiteral("qhtmlParameters")));
        if (!parameters.isEmpty()) {
            attributes.insert(QStringLiteral("parameters"), parameters.join(QStringLiteral(", ")));
        } else if (object.contains(QStringLiteral("parameters"))) {
            attributes.insert(QStringLiteral("parameters"), qhtmlFirstJsonString(object, {"parameters"}));
        }
        node = new QHTMLSignal(name, attributes);
    } else if (type == QStringLiteral("QHTMLComponentSlot") || type == QStringLiteral("QHTMLSlot")) {
        node = new QHTMLComponentSlot(name, attributes);
    } else if (type == QStringLiteral("QHTMLSlotDefault")) {
        node = new QHTMLSlotDefault(name, attributes);
    } else if (type == QStringLiteral("QHTMLProperty")) {
        attributes.insert(QStringLiteral("value"), object.contains(QStringLiteral("qhtmlValue"))
                                                   ? qhtmlJsonValueToQHTMLSource(object.value(QStringLiteral("qhtmlValue")))
                                                   : qhtmlFirstJsonString(object, {"value"}));
        node = new QHTMLProperty(name, attributes);
    } else if (type == QStringLiteral("QHTMLPropertyAssignment")) {
        attributes.insert(QStringLiteral("value"), object.contains(QStringLiteral("qhtmlValue"))
                                                   ? qhtmlJsonValueToQHTMLSource(object.value(QStringLiteral("qhtmlValue")))
                                                   : qhtmlFirstJsonString(object, {"value"}));
        node = new QHTMLPropertyAssignment(name, attributes);
    } else if (type == QStringLiteral("QHTMLEventHandler")) {
        const QString eventName = qhtmlFirstJsonString(object, {"qhtmlEventName", "eventName"}, name);
        const QStringList parameters = qhtmlStringListFromJsonValue(object.value(QStringLiteral("qhtmlParameters")));
        if (!parameters.isEmpty()) {
            attributes.insert(QStringLiteral("parameters"), parameters.join(QStringLiteral(", ")));
        } else if (object.contains(QStringLiteral("parameters"))) {
            attributes.insert(QStringLiteral("parameters"), qhtmlFirstJsonString(object, {"parameters"}));
        }
        node = new QHTMLEventHandler(eventName, attributes, body);
    } else if (type == QStringLiteral("QHTMLScript")) {
        node = new QHTMLScript(name, attributes, body);
    } else if (type == QStringLiteral("QHTMLScriptAction")) {
        node = new QHTMLScriptAction(name, attributes, body);
    } else if (type == QStringLiteral("QHTMLStyle")) {
        node = new QHTMLStyle(name, attributes, body);
    } else if (type == QStringLiteral("QHTMLTheme")) {
        node = new QHTMLTheme(keyword.isEmpty() ? QStringLiteral("q-theme") : keyword, name, attributes, body);
    } else if (type == QStringLiteral("QHTMLClass")) {
        node = new QHTMLClass(name, attributes, body);
    } else if (type == QStringLiteral("QHTMLVar")) {
        node = new QHTMLVar(name, attributes);
    } else if (type == QStringLiteral("QHTMLArray")) {
        node = new QHTMLArray(name, attributes);
    } else if (type == QStringLiteral("QHTMLMap")) {
        node = new QHTMLMap(name, attributes);
    } else if (type == QStringLiteral("QHTMLModel")) {
        node = new QHTMLModel(name, attributes);
    } else if (type == QStringLiteral("QHTMLTemplate")) {
        node = new QHTMLTemplate(name, attributes);
    } else if (type == QStringLiteral("QHTMLModelView")) {
        node = new QHTMLModelView(name, attributes);
    } else if (type == QStringLiteral("QHTMLFactory")) {
        node = new QHTMLFactory(name, attributes);
    } else if (type == QStringLiteral("QHTMLTimer")) {
        node = new QHTMLTimer(name, attributes);
    } else if (type == QStringLiteral("QHTMLPropertyAnimation")) {
        node = new QHTMLPropertyAnimation(name, attributes);
    } else if (type == QStringLiteral("QHTMLSequentialAnimation")) {
        node = new QHTMLSequentialAnimation(name, attributes);
    } else if (type == QStringLiteral("QHTMLParallelAnimation")) {
        node = new QHTMLParallelAnimation(name, attributes);
    } else if (type == QStringLiteral("QHTMLBehavior")) {
        node = new QHTMLBehavior(name, attributes);
    } else if (type == QStringLiteral("QHTMLPainter")) {
        node = new QHTMLPainter(name, attributes, body);
    } else if (type == QStringLiteral("QHTMLCanvas")) {
        node = new QHTMLCanvas(name, attributes);
    } else if (type == QStringLiteral("QHTMLVideo")) {
        node = new QHTMLVideo(keyword.isEmpty() ? QStringLiteral("q-video") : keyword, name, attributes);
    } else if (type == QStringLiteral("QHTMLParticleEmitter")) {
        node = new QHTMLParticleEmitter(keyword.isEmpty() ? QStringLiteral("particle-emitter") : keyword, name, attributes);
    } else if (type == QStringLiteral("QHTMLLayout")) {
        node = new QHTMLLayout(keyword.isEmpty() ? QStringLiteral("q-layout") : keyword, name, attributes);
    } else if (type == QStringLiteral("QHTMLRowLayout")) {
        node = new QHTMLRowLayout(name, attributes);
    } else if (type == QStringLiteral("QHTMLColumnLayout")) {
        node = new QHTMLColumnLayout(name, attributes);
    } else if (type == QStringLiteral("QHTMLForNode")) {
        const QString variable = qhtmlFirstJsonString(object, {"qhtmlVariable", "variable"}, name);
        const QString collection = qhtmlFirstJsonString(object, {"qhtmlCollection", "collection"});
        if (!collection.trimmed().isEmpty()) {
            attributes.insert(QStringLiteral("collection"), collection.trimmed());
        }
        node = new QHTMLForNode(variable, attributes, body);
    } else if (type == QStringLiteral("QHTMLImportNode")) {
        const QString importKind = qhtmlFirstJsonString(object, {"qhtmlImportKind", "importKind"}, keyword.isEmpty() ? QStringLiteral("q-import") : keyword);
        QString importBody = body;
        if (importBody.trimmed().isEmpty()) {
            importBody = qhtmlFirstJsonString(object, {"qhtmlPath", "path"});
            const QString cache = qhtmlFirstJsonString(object, {"qhtmlCacheMode", "cacheMode"});
            if (!cache.trimmed().isEmpty() && cache != QStringLiteral("default")) {
                importBody += QLatin1Char(' ') + cache.trimmed();
            }
        }
        node = new QHTMLImportNode(importKind, importBody, attributes);
    } else if (type == QStringLiteral("QHTMLConnect")) {
        node = new QHTMLConnect(body);
    } else if (type == QStringLiteral("QHTMLStyleApplication")) {
        node = new QHTMLStyleApplication(nullptr);
        node->setQHTMLName(name);
    } else if (type == QStringLiteral("QHTMLThemeApplication")) {
        node = new QHTMLThemeApplication(nullptr);
        node->setQHTMLName(name);
    } else if (type == QStringLiteral("QHTMLWorker")) {
        node = new QHTMLWorker(name, attributes);
    } else if (type == QStringLiteral("QHTMLSourceFragment")) {
        node = new QHTMLSourceFragment(name, attributes);
    } else {
        node = new QHTMLTypedNode(keyword.isEmpty() ? type : keyword, name, attributes);
        node->setQHTMLType(type);
    }

    if (!node) {
        return nullptr;
    }

    const QString uuid = qhtmlFirstJsonString(object, {"qhtmlUUID", "uuid"});
    if (!uuid.trimmed().isEmpty()) {
        node->setQHTMLUUID(uuid.trimmed());
    }
    node->fromJsonObject(object);
    if (QHTMLComponentInstance *instance = dynamic_cast<QHTMLComponentInstance *>(node)) {
        const QString componentName = qhtmlFirstJsonString(object, {"qhtmlComponentName", "componentName"});
        if (!componentName.trimmed().isEmpty()) {
            instance->setProperty(QStringLiteral("qhtmlComponentName"), componentName.trimmed());
            instance->setProperty(QStringLiteral("componentName"), componentName.trimmed());
        }
    }
    return node;
}

inline bool QHTMLNode::fromJsonValue(const QJsonValue &value)
{
    if (value.isArray()) {
        QVector<QHTMLNode *> preservedRuntimeChildren;
        for (int i = childCount() - 1; i >= 0; --i) {
            QHTMLNode *candidate = childAt(i);
            if (qhtmlIsInternalRuntimeChild(this, candidate)) {
                preservedRuntimeChildren.prepend(takeChildAt(i));
            }
        }
        clearChildren();
        for (QHTMLNode *preserved : preservedRuntimeChildren) {
            appendChild(preserved);
        }
        const QJsonArray array = value.toArray();
        for (const QJsonValue &childValue : array) {
            if (!childValue.isObject()) {
                continue;
            }
            if (QHTMLNode *child = QHTMLNode::nodeFromJsonObject(childValue.toObject(), this)) {
                appendChild(child);
            }
        }
        qhtmlResolveComponentInstanceDefinitions(this, this);
        return true;
    }
    if (value.isObject()) {
        const bool loaded = fromJsonObject(value.toObject());
        if (loaded) {
            qhtmlResolveComponentInstanceDefinitions(this, this);
        }
        return loaded;
    }
    return false;
}

inline bool QHTMLNode::fromJsonObject(const QJsonObject &object)
{
    const QString name = qhtmlFirstJsonString(object, {"qhtmlName", "name"});
    if (!name.isNull()) {
        setQHTMLName(name);
    }
    const QString uuid = qhtmlFirstJsonString(object, {"qhtmlUUID", "uuid"});
    if (!uuid.trimmed().isEmpty()) {
        setQHTMLUUID(uuid.trimmed());
    }

    qhtmlProperties.clear();
    const QJsonObject propertyObject = object.value(QStringLiteral("qhtmlProperties")).toObject(object.value(QStringLiteral("properties")).toObject());
    for (auto it = propertyObject.constBegin(); it != propertyObject.constEnd(); ++it) {
        setProperty(it.key(), qhtmlJsonValueToQHTMLSource(it.value()));
    }

    const QJsonObject attributeObject = object.value(QStringLiteral("qhtmlAttributes")).toObject(object.value(QStringLiteral("attributes")).toObject());
    const QHash<QString, QString> attributes = qhtmlStringHashFromJsonObject(attributeObject);
    if (QHTMLDomElement *element = dynamic_cast<QHTMLDomElement *>(this)) {
        element->setTagName(qhtmlFirstJsonString(object, {"qhtmlTagName", "tagName"}, element->tagName()));
        element->setAttributes(attributes);
    }
    if (QHTMLTypedNode *typed = dynamic_cast<QHTMLTypedNode *>(this)) {
        typed->setKeyword(qhtmlFirstJsonString(object, {"qhtmlKeyword", "keyword"}, typed->keyword()));
        typed->setAttributes(attributes);
    }

    if (QHTMLTextFragment *text = dynamic_cast<QHTMLTextFragment *>(this)) {
        text->setValue(qhtmlFirstJsonString(object, {"qhtmlContents", "value", "contents"}));
    } else if (QHTMLHTMLFragment *html = dynamic_cast<QHTMLHTMLFragment *>(this)) {
        html->setValue(qhtmlFirstJsonString(object, {"qhtmlContents", "value", "contents"}));
    } else if (QHTMLUnknownFragment *unknown = dynamic_cast<QHTMLUnknownFragment *>(this)) {
        unknown->setValue(qhtmlFirstJsonString(object, {"qhtmlContents", "value", "contents"}));
    } else if (QHTMLJavaScriptBlock *scriptBlock = dynamic_cast<QHTMLJavaScriptBlock *>(this)) {
        scriptBlock->setContents(qhtmlBodyFromJsonObject(object));
    } else if (QHTMLProperty *propertyNode = dynamic_cast<QHTMLProperty *>(this)) {
        propertyNode->setValue(object.contains(QStringLiteral("qhtmlValue"))
                               ? qhtmlJsonValueToQHTMLSource(object.value(QStringLiteral("qhtmlValue")))
                               : qhtmlFirstJsonString(object, {"value"}));
    } else if (QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(this)) {
        assignment->setValue(object.contains(QStringLiteral("qhtmlValue"))
                             ? qhtmlJsonValueToQHTMLSource(object.value(QStringLiteral("qhtmlValue")))
                             : qhtmlFirstJsonString(object, {"value"}));
    } else if (QHTMLFunction *functionNode = dynamic_cast<QHTMLFunction *>(this)) {
        QStringList parameters = qhtmlStringListFromJsonValue(object.value(QStringLiteral("qhtmlParameters")));
        if (parameters.isEmpty()) {
            parameters = QHTMLFunction::parseParameters(qhtmlFirstJsonString(object, {"parameters"}));
        }
        functionNode->setParameters(parameters);
        functionNode->setBody(qhtmlBodyFromJsonObject(object));
    } else if (QHTMLSignal *signalNode = dynamic_cast<QHTMLSignal *>(this)) {
        QStringList parameters = qhtmlStringListFromJsonValue(object.value(QStringLiteral("qhtmlParameters")));
        if (parameters.isEmpty()) {
            parameters = QHTMLFunction::parseParameters(qhtmlFirstJsonString(object, {"parameters"}));
        }
        signalNode->setParameters(parameters);
    } else if (QHTMLEventHandler *handler = dynamic_cast<QHTMLEventHandler *>(this)) {
        handler->setEventName(qhtmlFirstJsonString(object, {"qhtmlEventName", "eventName"}, handler->eventName()));
        QStringList parameters = qhtmlStringListFromJsonValue(object.value(QStringLiteral("qhtmlParameters")));
        if (parameters.isEmpty()) {
            parameters = QHTMLFunction::parseParameters(qhtmlFirstJsonString(object, {"parameters"}));
        }
        handler->setParameters(parameters);
        handler->setBody(qhtmlBodyFromJsonObject(object));
    } else if (QHTMLScript *script = dynamic_cast<QHTMLScript *>(this)) {
        script->setBody(qhtmlBodyFromJsonObject(object));
    } else if (QHTMLScriptAction *action = dynamic_cast<QHTMLScriptAction *>(this)) {
        action->setBody(qhtmlBodyFromJsonObject(object));
    } else if (QHTMLStyle *style = dynamic_cast<QHTMLStyle *>(this)) {
        style->setBody(qhtmlBodyFromJsonObject(object));
    } else if (QHTMLTheme *theme = dynamic_cast<QHTMLTheme *>(this)) {
        theme->setBody(qhtmlBodyFromJsonObject(object));
    } else if (QHTMLClass *classNode = dynamic_cast<QHTMLClass *>(this)) {
        classNode->setBody(qhtmlBodyFromJsonObject(object));
    } else if (QHTMLForNode *forNode = dynamic_cast<QHTMLForNode *>(this)) {
        forNode->setVariableName(qhtmlFirstJsonString(object, {"qhtmlVariable", "variable"}, forNode->variableName()));
        forNode->setCollectionExpression(qhtmlFirstJsonString(object, {"qhtmlCollection", "collection"}, forNode->collectionExpression()));
        forNode->setBody(qhtmlBodyFromJsonObject(object));
    } else if (QHTMLConnect *connect = dynamic_cast<QHTMLConnect *>(this)) {
        connect->setBody(qhtmlBodyFromJsonObject(object));
    } else if (QHTMLImportNode *importNode = dynamic_cast<QHTMLImportNode *>(this)) {
        importNode->setBody(qhtmlBodyFromJsonObject(object));
    } else if (QHTMLPainter *painter = dynamic_cast<QHTMLPainter *>(this)) {
        painter->setBody(qhtmlBodyFromJsonObject(object));
    }

    if (QHTMLComponentDefinition *definition = dynamic_cast<QHTMLComponentDefinition *>(this)) {
        QStringList inherits;
        const QJsonArray inheritedArray = object.value(QStringLiteral("qhtmlInherits")).toArray();
        for (const QJsonValue &inheritValue : inheritedArray) {
            if (inheritValue.isObject()) {
                const QString baseName = qhtmlFirstJsonString(inheritValue.toObject(), {"qhtmlName", "name", "componentName"});
                if (!baseName.trimmed().isEmpty()) {
                    inherits.append(baseName.trimmed());
                }
            } else if (inheritValue.isString()) {
                inherits.append(inheritValue.toString().trimmed());
            }
        }
        if (!inherits.isEmpty()) {
            definition->setAttribute(QStringLiteral("extends"), inherits.join(QLatin1Char(' ')));
        }
    }

    QVector<QHTMLNode *> preservedRuntimeChildren;
    for (int i = childCount() - 1; i >= 0; --i) {
        QHTMLNode *candidate = childAt(i);
        if (qhtmlIsInternalRuntimeChild(this, candidate)) {
            preservedRuntimeChildren.prepend(takeChildAt(i));
        }
    }
    clearChildren();
    for (QHTMLNode *preserved : preservedRuntimeChildren) {
        appendChild(preserved);
    }

    const QJsonArray childrenArray = object.value(QStringLiteral("qhtmlChildren")).toArray(object.value(QStringLiteral("children")).toArray());
    for (const QJsonValue &childValue : childrenArray) {
        if (!childValue.isObject()) {
            continue;
        }
        const QJsonObject childObject = childValue.toObject();
        const QString childType = qhtmlFirstJsonString(childObject, {"qhtmlType", "qhtmltype", "type"});
        if (childType == QStringLiteral("QHTMLJavaScriptBlock") && qhtmlNodeConsumesJavaScriptBlock(this)) {
            continue;
        }
        if (QHTMLNode *child = QHTMLNode::nodeFromJsonObject(childObject, this)) {
            appendChild(child);
        }
    }
    qhtmlResolveComponentInstanceDefinitions(this, qhtmlTopScope(this) ? const_cast<QHTMLNode *>(qhtmlTopScope(this)) : this);
    return true;
}

inline bool QHTMLNode::fromJSONText(const QString &json)
{
    QJsonParseError error;
    const QJsonDocument document = QJsonDocument::fromJson(json.toUtf8(), &error);
    if (error.error != QJsonParseError::NoError) {
        return false;
    }
    if (document.isArray()) {
        return fromJsonValue(QJsonValue(document.array()));
    }
    if (document.isObject()) {
        return fromJsonValue(QJsonValue(document.object()));
    }
    return false;
}

inline bool QHTMLNode::fromJSONJs(emscripten::val value)
{
    if (value.isUndefined() || value.isNull()) {
        return false;
    }
    if (value.typeOf().as<std::string>() == std::string("string")) {
        return fromJSONText(QString::fromStdString(value.as<std::string>()));
    }
    const std::string json = emscripten::val::global("JSON").call<std::string>("stringify", value);
    return fromJSONText(QString::fromStdString(json));
}

inline int QHTMLNode::fromQHTML(const QString &source)
{
    clearChildren();
    const int inserted = appendQHTMLSource(source);
    if (inserted == 1 && childCount() == 1 && !dynamic_cast<QHTMLDomTree *>(this)) {
        QHTMLNode *parsed = childAt(0);
        if (parsed && parsed->qhtmlType() == qhtmlType()) {
            const QJsonObject object = parsed->toJsonObject();
            delete takeChildAt(0);
            return fromJsonObject(object) ? 1 : 0;
        }
    }
    return inserted;
}
