#pragma once

#include "qhtml_types.hpp"

#include <QtCore/QChar>
#include <QtCore/QFile>
#include <QtCore/QPair>
#include <QtCore/QRegularExpression>

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#endif

class QHTMLAstAnonNode;
class QHTMLAstNamedTypeNode;
class QHTMLAstUnknownFragment;

class QHTMLAstNode
{
public:
    explicit QHTMLAstNode(const QString &source = QString(), bool scanNow = true)
        : qhtmlContent(source),
          qhtmlUUID(QHTMLReference::createUUID()),
          qhtmlNode(new QHTMLNode(QStringLiteral("QHTMLAstContextNode")))
    {
        if (scanNow) {
            scan(source);
        }
    }

    explicit QHTMLAstNode(const std::string &source)
        : QHTMLAstNode(QString::fromStdString(source), true)
    {
    }

    virtual ~QHTMLAstNode()
    {
        qDeleteAll(astChildren);
        delete qhtmlNode;
    }

    QHTMLAstNode(const QHTMLAstNode &) = delete;
    QHTMLAstNode &operator=(const QHTMLAstNode &) = delete;

    QHash<int, QHTMLAstNode *> astChildren;
    QHash<int, QString> astChildrenUUIDs;
    QHash<QString, QString> astChildrenUUIDKeywords;
    QString qhtmlName;
    QString qhtmlContent;
    QString qhtmlUUID;
    QString qhtmlKeyword;
    QHTMLNode *qhtmlNode = nullptr;

    virtual QString astType() const { return QStringLiteral("QHTMLAstNode"); }
    std::string astTypeJs() const { return astType().toStdString(); }

    virtual QString qhtmlType() const { return qhtmlKeyword; }
    std::string qhtmlTypeJs() const { return qhtmlType().toStdString(); }

    int childCount() const { return astChildren.size(); }
    QHTMLAstNode *childAt(int index) const { return astChildren.value(index, nullptr); }

    void appendAstChild(QHTMLAstNode *node)
    {
        if (!node) {
            return;
        }
        astChildren.insert(astChildren.size(), node);
    }

    void scan(const QString &source);

    void enumerateKeywords()
    {
        installDefaultKeywordsDeep();
        for (int i = 0; i < astChildren.size(); ++i) {
            QHTMLAstNode *child = astChildren.value(i, nullptr);
            if (!child) {
                continue;
            }
            if (child->qhtmlUUID.isEmpty()) {
                child->qhtmlUUID = QHTMLReference::createUUID();
            }
            astChildrenUUIDs.insert(i, child->qhtmlUUID);
            astChildrenUUIDKeywords.insert(child->qhtmlUUID, child->qhtmlType());
            child->enumerateKeywords();
        }
        applyLocalKeywordDeclarations();
        enumerateNamedReferencesDeep();
    }

    QString uuidForChildIndex(int index) const
    {
        return astChildrenUUIDs.value(index);
    }

    std::string uuidForChildIndexJs(int index) const
    {
        return uuidForChildIndex(index).toStdString();
    }

    QString uuidForChild(QHTMLAstNode *node) const
    {
        if (!node) {
            return QString();
        }
        for (int i = 0; i < astChildren.size(); ++i) {
            if (astChildren.value(i) == node) {
                return astChildrenUUIDs.value(i);
            }
        }
        return QString();
    }

    QHTMLAstNode *findChildByUUID(const QString &uuid) const
    {
        for (int i = 0; i < astChildren.size(); ++i) {
            QHTMLAstNode *child = astChildren.value(i, nullptr);
            if (child && child->qhtmlUUID == uuid) {
                return child;
            }
        }
        return nullptr;
    }

    virtual QHTMLNode *toQHTMLNode() const
    {
        QHTMLNode *node = new QHTMLNode(QStringLiteral("QHTMLNode"), qhtmlName);
        node->setQHTMLUUID(qhtmlUUID);
        for (int i = 0; i < astChildren.size(); ++i) {
            if (QHTMLAstNode *child = astChildren.value(i, nullptr)) {
                node->appendChild(child->toQHTMLNode());
            }
        }
        return node;
    }

protected:
    static QStringList defaultKeywords()
    {
        return {
            QStringLiteral("q-component"),
            QStringLiteral("q-worker"),
            QStringLiteral("q-property"),
            QStringLiteral("q-signal"),
            QStringLiteral("q-class"),
            QStringLiteral("q-var"),
            QStringLiteral("q-callback"),
            QStringLiteral("q-array"),
            QStringLiteral("q-map"),
            QStringLiteral("q-model"),
            QStringLiteral("q-template"),
            QStringLiteral("q-macro"),
            QStringLiteral("q-rewrite"),
            QStringLiteral("q-switch"),
            QStringLiteral("q-script"),
            QStringLiteral("behavior"),
            QStringLiteral("q-model-view"),
            QStringLiteral("q-factory"),
            QStringLiteral("q-timer"),
            QStringLiteral("q-property-animation"),
            QStringLiteral("q-sequential-animation"),
            QStringLiteral("q-parallel-animation"),
            QStringLiteral("q-script-action"),
            QStringLiteral("q-painter"),
            QStringLiteral("q-canvas"),
            QStringLiteral("q-video"),
            QStringLiteral("q-vid-player"),
            QStringLiteral("native-vid-player"),
            QStringLiteral("q-style-painter"),
            QStringLiteral("q-layout"),
            QStringLiteral("q-row"),
            QStringLiteral("q-col"),
            QStringLiteral("q-column"),
            QStringLiteral("q-connect"),
            QStringLiteral("for"),
            QStringLiteral("q-import"),
            QStringLiteral("q-require"),
            QStringLiteral("style"),
            QStringLiteral("q-style"),
            QStringLiteral("q-style-class"),
            QStringLiteral("q-theme"),
            QStringLiteral("q-default-theme"),
            QStringLiteral("q-child-theme"),
            QStringLiteral("function"),
            QStringLiteral("q-event-handler"),
            QStringLiteral("slot"),
            QStringLiteral("q-slot"),
            QStringLiteral("q-slot-default"),
            QStringLiteral("html"),
            QStringLiteral("text")
        };
    }

    void installDefaultKeywordsDeep()
    {
        for (const QString &keyword : defaultKeywords()) {
            qhtmlNode->updateKeywordReference(keyword, keyword);
        }
        for (int i = 0; i < astChildren.size(); ++i) {
            if (QHTMLAstNode *child = astChildren.value(i, nullptr)) {
                child->installDefaultKeywordsDeep();
            }
        }
    }

    void updateKeywordReferenceDeep(const QString &name, const QString &value)
    {
        qhtmlNode->updateKeywordReference(name, value);
        for (int i = 0; i < astChildren.size(); ++i) {
            if (QHTMLAstNode *child = astChildren.value(i, nullptr)) {
                child->updateKeywordReferenceDeep(name, value);
            }
        }
    }

    void applyLocalKeywordDeclarations()
    {
        for (int i = 0; i < astChildren.size(); ++i) {
            QHTMLAstNode *child = astChildren.value(i, nullptr);
            if (!child || child->qhtmlType() != QStringLiteral("q-keyword")) {
                continue;
            }
            const QString name = child->qhtmlName.trimmed();
            const QString value = child->qhtmlContent.trimmed();
            if (!name.isEmpty() && isSingleWord(value)) {
                updateKeywordReferenceDeep(name, value);
            }
        }
    }

    void enumerateNamedReferencesDeep()
    {
        for (int i = 0; i < astChildren.size(); ++i) {
            QHTMLAstNode *child = astChildren.value(i, nullptr);
            if (!child) {
                continue;
            }
            if (child->astType() == QStringLiteral("QHTMLAstNamedTypeNode") && !child->qhtmlName.isEmpty()) {
                qhtmlNode->updateNamedReference(child->qhtmlName, child->qhtmlUUID);
                child->qhtmlNode->updateNamedReference(child->qhtmlName, child->qhtmlUUID);
            }
            child->enumerateNamedReferencesDeep();
        }
    }

    static bool isSingleWord(const QString &value)
    {
        static const QRegularExpression rx(QStringLiteral("^[A-Za-z_][A-Za-z0-9_+\\-]*$"));
        return rx.match(value).hasMatch();
    }
};

class QHTMLAstAnonNode final : public QHTMLAstNode
{
public:
    QHTMLAstAnonNode(const QString &tagName,
                     const QHash<QString, QString> &attributes,
                     const QString &innerText,
                     bool scanInner = true)
        : QHTMLAstNode(innerText, false),
          m_tagName(tagName),
          m_attributes(attributes)
    {
        qhtmlKeyword.clear();
        qhtmlName = tagName;
        if (scanInner && !isSpecialFragment()) {
            scan(innerText);
        }
    }

    QString astType() const override { return QStringLiteral("QHTMLAstAnonNode"); }
    QString tagName() const { return m_tagName; }
    bool isSpecialFragment() const
    {
        return m_tagName == QStringLiteral("text") || m_tagName == QStringLiteral("html");
    }

    QHTMLNode *toQHTMLNode() const override
    {
        if (m_tagName == QStringLiteral("text")) {
            return new QHTMLTextFragment(qhtmlContent.trimmed());
        }
        if (m_tagName == QStringLiteral("html")) {
            return new QHTMLHTMLFragment(qhtmlContent.trimmed());
        }

        QHTMLDomElement *element = new QHTMLDomElement(m_tagName, m_attributes);
        element->setQHTMLUUID(qhtmlUUID);
        for (int i = 0; i < astChildren.size(); ++i) {
            if (QHTMLAstNode *child = astChildren.value(i, nullptr)) {
                element->appendChild(child->toQHTMLNode());
            }
        }
        return element;
    }

private:
    QString m_tagName;
    QHash<QString, QString> m_attributes;
};

class QHTMLAstNamedTypeNode final : public QHTMLAstNode
{
public:
    QHTMLAstNamedTypeNode(const QString &keyword,
                          const QString &name,
                          const QHash<QString, QString> &attributes,
                          const QString &innerText)
        : QHTMLAstNode(innerText, false),
          m_attributes(attributes)
    {
        qhtmlKeyword = keyword;
        qhtmlName = name;
        if (!isRawScriptBodyKeyword(qhtmlKeyword)) {
            scan(innerText);
        }
    }

    QString astType() const override { return QStringLiteral("QHTMLAstNamedTypeNode"); }
    QString qhtmlType() const override { return qhtmlKeyword; }

    QHTMLNode *toQHTMLNode() const override
    {
        QHTMLTypedNode *node = createTypedNode();
        node->setQHTMLUUID(qhtmlUUID);
        for (int i = 0; i < astChildren.size(); ++i) {
            if (QHTMLAstNode *child = astChildren.value(i, nullptr)) {
                node->appendChild(child->toQHTMLNode());
            }
        }
        return node;
    }

private:
    static bool isRawScriptBodyKeyword(const QString &keyword)
    {
        return keyword == QStringLiteral("q-event-handler") ||
               keyword == QStringLiteral("function") ||
               keyword == QStringLiteral("q-connect") ||
               keyword == QStringLiteral("q-class") ||
               keyword == QStringLiteral("q-script") ||
               keyword == QStringLiteral("q-script-action") ||
               keyword == QStringLiteral("script");
    }

    QHTMLTypedNode *createTypedNode() const
    {
        if (qhtmlKeyword == QStringLiteral("q-component")) {
            return new QHTMLComponentDefinition(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-worker")) {
            return new QHTMLWorker(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-property")) {
            return new QHTMLProperty(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-signal")) {
            return new QHTMLSignal(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("slot") || qhtmlKeyword == QStringLiteral("q-slot")) {
            return new QHTMLComponentSlot(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-slot-default")) {
            return new QHTMLSlotDefault(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-property-assignment")) {
            return new QHTMLPropertyAssignment(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-class")) {
            return new QHTMLClass(qhtmlName, m_attributes, qhtmlContent);
        }
        if (qhtmlKeyword == QStringLiteral("q-var")) {
            return new QHTMLVar(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-array")) {
            return new QHTMLArray(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-map")) {
            return new QHTMLMap(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-model")) {
            return new QHTMLModel(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-template")) {
            return new QHTMLTemplate(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-macro") ||
            qhtmlKeyword == QStringLiteral("q-rewrite") ||
            qhtmlKeyword == QStringLiteral("q-switch")) {
            return new QHTMLTypedNode(qhtmlKeyword, qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-script") || qhtmlKeyword == QStringLiteral("script")) {
            return new QHTMLScript(qhtmlName, m_attributes, qhtmlContent);
        }
        if (qhtmlKeyword == QStringLiteral("behavior")) {
            return new QHTMLBehavior(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-model-view")) {
            return new QHTMLModelView(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-factory")) {
            return new QHTMLFactory(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-timer")) {
            return new QHTMLTimer(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-property-animation")) {
            return new QHTMLPropertyAnimation(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-sequential-animation")) {
            return new QHTMLSequentialAnimation(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-parallel-animation")) {
            return new QHTMLParallelAnimation(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-script-action")) {
            return new QHTMLScriptAction(qhtmlName, m_attributes, qhtmlContent);
        }
        if (qhtmlKeyword == QStringLiteral("q-painter")) {
            return new QHTMLPainter(qhtmlName, m_attributes, qhtmlContent);
        }
        if (qhtmlKeyword == QStringLiteral("q-canvas")) {
            return new QHTMLCanvas(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-video") ||
            qhtmlKeyword == QStringLiteral("q-vid-player") ||
            qhtmlKeyword == QStringLiteral("native-vid-player")) {
            return new QHTMLVideo(qhtmlKeyword, qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("particle-emitter") ||
            qhtmlKeyword == QStringLiteral("q-particle-emitter")) {
            return new QHTMLParticleEmitter(qhtmlKeyword, qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-layout")) {
            return new QHTMLLayout(qhtmlKeyword, qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-row")) {
            return new QHTMLRowLayout(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-col") || qhtmlKeyword == QStringLiteral("q-column")) {
            return new QHTMLColumnLayout(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("for")) {
            return new QHTMLForNode(qhtmlName, m_attributes, qhtmlContent);
        }
        if (qhtmlKeyword == QStringLiteral("q-import") || qhtmlKeyword == QStringLiteral("q-require")) {
            return new QHTMLImportNode(qhtmlKeyword, qhtmlContent, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-connect")) {
            return new QHTMLConnect(qhtmlContent);
        }
        if (qhtmlKeyword == QStringLiteral("q-style") || qhtmlKeyword == QStringLiteral("style")) {
            return new QHTMLStyle(qhtmlName, m_attributes, qhtmlContent);
        }
        if (qhtmlKeyword == QStringLiteral("q-theme") || qhtmlKeyword == QStringLiteral("q-default-theme")) {
            return new QHTMLTheme(qhtmlKeyword, qhtmlName, m_attributes, qhtmlContent);
        }
        if (qhtmlKeyword == QStringLiteral("function")) {
            return new QHTMLFunction(qhtmlName, m_attributes, qhtmlContent);
        }
        if (qhtmlKeyword == QStringLiteral("q-event-handler")) {
            return new QHTMLEventHandler(qhtmlName, m_attributes, qhtmlContent);
        }
        if (qhtmlKeyword == QStringLiteral("q-source")) {
            return new QHTMLSourceFragment(qhtmlName, m_attributes);
        }
        return new QHTMLTypedNode(qhtmlKeyword, qhtmlName, m_attributes);
    }

    QHash<QString, QString> m_attributes;
};

class QHTMLAstUnknownFragment final : public QHTMLAstNode
{
public:
    explicit QHTMLAstUnknownFragment(const QString &source)
        : QHTMLAstNode(source, false)
    {
        qhtmlName = QStringLiteral("unknown");
    }

    QString astType() const override { return QStringLiteral("QHTMLAstUnknownFragment"); }

    QHTMLNode *toQHTMLNode() const override
    {
        return new QHTMLUnknownFragment(qhtmlContent);
    }
};

class QHTMLParser
{
public:
    QHTMLParser() = default;
    ~QHTMLParser() { clear(); }

    QHTMLAstNode *parse(const QString &source)
    {
        clear();
        m_lastRoot = new QHTMLAstNode(source);
        m_lastRoot->enumerateKeywords();
        return m_lastRoot;
    }

    QHTMLAstNode *parse(const std::string &source)
    {
        return parse(QString::fromStdString(source));
    }

    QHTMLAstNode *lastRoot() const { return m_lastRoot; }

    void clear()
    {
        delete m_lastRoot;
        m_lastRoot = nullptr;
    }

private:
    QHTMLAstNode *m_lastRoot = nullptr;
};

namespace qhtml7_parser_detail {

inline QString stripComments(const QString &source)
{
    QString out;
    out.reserve(source.size());
    QChar quote;
    bool escape = false;
    bool blockComment = false;

    for (int i = 0; i < source.size(); ++i) {
        const QChar ch = source.at(i);
        const QChar next = i + 1 < source.size() ? source.at(i + 1) : QChar();

        if (blockComment) {
            if (ch == QLatin1Char('*') && next == QLatin1Char('/')) {
                out += QLatin1Char(' ');
                out += QLatin1Char(' ');
                blockComment = false;
                ++i;
            } else {
                out += ch == QLatin1Char('\n') ? ch : QLatin1Char(' ');
            }
            continue;
        }

        if (!quote.isNull()) {
            out += ch;
            if (escape) {
                escape = false;
            } else if (ch == QLatin1Char('\\')) {
                escape = true;
            } else if (ch == quote) {
                quote = QChar();
            }
            continue;
        }

        if (ch == QLatin1Char('/') && next == QLatin1Char('*')) {
            out += QLatin1Char(' ');
            out += QLatin1Char(' ');
            blockComment = true;
            ++i;
            continue;
        }

        if (ch == QLatin1Char('"') || ch == QLatin1Char('\'') || ch == QLatin1Char('`')) {
            quote = ch;
        }
        out += ch;
    }

    return out;
}

struct SelectorParts {
    QString tagName;
    QHash<QString, QString> attributes;
    bool valid = false;
};

struct TypedSignatureParts {
    QString keyword;
    QString name;
    QStringList extendsNames;
    QHash<QString, QString> attributes;
    bool valid = false;
};

inline SelectorParts parseSelector(QString selector);

inline bool isWordStart(QChar ch)
{
    return ch.isLetter() || ch == QLatin1Char('_');
}

inline bool isWordChar(QChar ch)
{
    return ch.isLetterOrNumber() || ch == QLatin1Char('_') || ch == QLatin1Char('+') || ch == QLatin1Char('-');
}

inline bool isKeywordToken(const QString &token)
{
    if (token.isEmpty() || !isWordStart(token.at(0))) {
        return false;
    }
    for (const QChar ch : token) {
        if (!isWordChar(ch)) {
            return false;
        }
    }
    return true;
}

inline bool isTypePathToken(const QString &token)
{
    if (token.trimmed().isEmpty()) {
        return false;
    }
    const QStringList parts = token.split(QLatin1Char('.'));
    for (const QString &part : parts) {
        if (!isKeywordToken(part)) {
            return false;
        }
    }
    return true;
}

inline TypedSignatureParts parseTypedSignature(const QString &header)
{
    TypedSignatureParts out;
    const QString trimmedHeader = header.trimmed();
    const int firstSpace = trimmedHeader.indexOf(QRegularExpression(QStringLiteral("\\s+")));
    if (firstSpace < 0) {
        return out;
    }

    out.keyword = trimmedHeader.left(firstSpace).trimmed();
    if (!isTypePathToken(out.keyword)) {
        return {};
    }

    QString nameExpression = trimmedHeader.mid(firstSpace + 1).trimmed();
    QString parameters;
    const int openParen = nameExpression.indexOf(QLatin1Char('('));
    if (openParen >= 0) {
        const int closeParen = nameExpression.lastIndexOf(QLatin1Char(')'));
        if (closeParen < openParen || closeParen != nameExpression.size() - 1) {
            return {};
        }
        parameters = nameExpression.mid(openParen + 1, closeParen - openParen - 1).trimmed();
        nameExpression = nameExpression.left(openParen).trimmed();
    }

    QStringList extendsNames;
    if (out.keyword == QStringLiteral("q-component")) {
        const QRegularExpression extendsPattern(QStringLiteral("\\s+extends\\s+"));
        const QRegularExpressionMatch extendsMatch = extendsPattern.match(nameExpression);
        if (extendsMatch.hasMatch()) {
            QString extendsExpression = nameExpression.mid(extendsMatch.capturedEnd()).trimmed();
            nameExpression = nameExpression.left(extendsMatch.capturedStart()).trimmed();
            extendsExpression.replace(QLatin1Char(','), QLatin1Char(' '));
            const QStringList candidateNames = extendsExpression.split(QRegularExpression(QStringLiteral("\\s+")),
                                                                       Qt::SkipEmptyParts);
            for (const QString &candidateName : candidateNames) {
                if (!isTypePathToken(candidateName)) {
                    return {};
                }
                extendsNames.append(candidateName);
            }
        }
    }

    const SelectorParts nameSelector = parseSelector(nameExpression);
    if (!nameSelector.valid) {
        return {};
    }

    out.name = nameSelector.tagName;
    out.extendsNames = extendsNames;
    out.attributes = nameSelector.attributes;
    if (!extendsNames.isEmpty()) {
        out.attributes.insert(QStringLiteral("extends"), extendsNames.join(QStringLiteral(", ")));
    }
    if (!parameters.isEmpty()) {
        out.attributes.insert(QStringLiteral("parameters"), parameters);
    }
    out.valid = true;
    return out;
}

inline SelectorParts parseSelector(QString selector)
{
    SelectorParts out;
    selector = selector.trimmed();
    if (selector.isEmpty() || !isWordStart(selector.at(0))) {
        return out;
    }

    int index = 0;
    while (index < selector.size() && isWordChar(selector.at(index))) {
        out.tagName += selector.at(index++);
    }

    QString id;
    QStringList classes;
    while (index < selector.size()) {
        const QChar marker = selector.at(index++);
        if (marker != QLatin1Char('#') && marker != QLatin1Char('.')) {
            return {};
        }
        if (index >= selector.size() || !isWordStart(selector.at(index))) {
            return {};
        }
        QString value;
        while (index < selector.size() && isWordChar(selector.at(index))) {
            value += selector.at(index++);
        }
        if (marker == QLatin1Char('#')) {
            id = value;
        } else {
            classes.append(value);
        }
    }

    if (!id.isEmpty()) {
        out.attributes.insert(QStringLiteral("id"), id);
    }
    if (!classes.isEmpty()) {
        out.attributes.insert(QStringLiteral("class"), classes.join(QLatin1Char(' ')));
    }
    out.valid = !out.tagName.isEmpty();
    return out;
}

inline int findMatchingBrace(const QString &source, int openIndex)
{
    int depth = 0;
    QChar quote;
    bool escape = false;
    bool lineComment = false;
    bool blockComment = false;

    for (int i = openIndex; i < source.size(); ++i) {
        const QChar ch = source.at(i);
        const QChar next = i + 1 < source.size() ? source.at(i + 1) : QChar();

        if (lineComment) {
            if (ch == QLatin1Char('\n')) {
                lineComment = false;
            }
            continue;
        }

        if (blockComment) {
            if (ch == QLatin1Char('*') && next == QLatin1Char('/')) {
                blockComment = false;
                ++i;
            }
            continue;
        }

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

        if (ch == QLatin1Char('/') && next == QLatin1Char('/')) {
            lineComment = true;
            ++i;
            continue;
        }

        if (ch == QLatin1Char('/') && next == QLatin1Char('*')) {
            blockComment = true;
            ++i;
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
                return i;
            }
        }
    }
    return -1;
}


inline bool headerLooksLikeInlineValueStatement(const QString &header)
{
    const QString text = header.trimmed();
    if (text.isEmpty()) {
        return false;
    }

    static const QRegularExpression propertyRx(
        QStringLiteral("^\\s*q-property\\s+[A-Za-z_][A-Za-z0-9_+\\-]*\\s*:\\s*$"));
    if (propertyRx.match(text).hasMatch()) {
        return true;
    }

    static const QRegularExpression assignmentRx(
        QStringLiteral("^\\s*[A-Za-z_][A-Za-z0-9_+\\-]*\\s*:\\s*$"));
    return assignmentRx.match(text).hasMatch();
}


struct StructuredValueStatement
{
    bool matched = false;
    int endIndex = -1;
    QString statement;
};

inline QChar expectedCloserForStructuredOpener(QChar opener)
{
    if (opener == QLatin1Char('[')) {
        return QLatin1Char(']');
    }
    if (opener == QLatin1Char('{')) {
        return QLatin1Char('}');
    }
    if (opener == QLatin1Char('(')) {
        return QLatin1Char(')');
    }
    return QChar();
}

inline bool isStructuredValueOpener(QChar ch)
{
    return ch == QLatin1Char('[') || ch == QLatin1Char('{');
}

inline int findStructuredValueEnd(const QString &source, int valueStartIndex)
{
    if (valueStartIndex < 0 || valueStartIndex >= source.size()) {
        return -1;
    }

    const QChar first = source.at(valueStartIndex);
    if (!isStructuredValueOpener(first)) {
        return -1;
    }

    QVector<QChar> expectedClosers;
    expectedClosers.append(expectedCloserForStructuredOpener(first));

    QChar quote;
    bool escape = false;
    bool lineComment = false;
    bool blockComment = false;

    for (int i = valueStartIndex + 1; i < source.size(); ++i) {
        const QChar ch = source.at(i);
        const QChar next = i + 1 < source.size() ? source.at(i + 1) : QChar();

        if (lineComment) {
            if (ch == QLatin1Char('\n')) {
                lineComment = false;
            }
            continue;
        }

        if (blockComment) {
            if (ch == QLatin1Char('*') && next == QLatin1Char('/')) {
                blockComment = false;
                ++i;
            }
            continue;
        }

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

        if (ch == QLatin1Char('/') && next == QLatin1Char('/')) {
            lineComment = true;
            ++i;
            continue;
        }

        if (ch == QLatin1Char('/') && next == QLatin1Char('*')) {
            blockComment = true;
            ++i;
            continue;
        }

        if (ch == QLatin1Char('"') || ch == QLatin1Char('\'') || ch == QLatin1Char('`')) {
            quote = ch;
            continue;
        }

        if (ch == QLatin1Char('[') || ch == QLatin1Char('{') || ch == QLatin1Char('(')) {
            expectedClosers.append(expectedCloserForStructuredOpener(ch));
            continue;
        }

        if (ch == QLatin1Char(']') || ch == QLatin1Char('}') || ch == QLatin1Char(')')) {
            if (expectedClosers.isEmpty()) {
                return -1;
            }
            const QChar expected = expectedClosers.last();
            if (ch != expected) {
                return -1;
            }
            expectedClosers.removeLast();
            if (expectedClosers.isEmpty()) {
                return i + 1;
            }
        }
    }

    return -1;
}

inline StructuredValueStatement structuredValueStatementAt(const QString &source, int cursor)
{
    StructuredValueStatement result;
    if (cursor < 0 || cursor >= source.size()) {
        return result;
    }

    int index = cursor;
    while (index < source.size() && source.at(index).isSpace()) {
        ++index;
    }
    if (index >= source.size()) {
        return result;
    }

    static const QRegularExpression propertyPrefixRx(
        QStringLiteral("^q-property\\s+[A-Za-z_][A-Za-z0-9_+\\-]*\\s*:"));
    static const QRegularExpression assignmentPrefixRx(
        QStringLiteral("^[A-Za-z_][A-Za-z0-9_+\\-]*\\s*:"));

    QString remaining = source.mid(index);
    QRegularExpressionMatch match = propertyPrefixRx.match(remaining);
    if (!match.hasMatch()) {
        match = assignmentPrefixRx.match(remaining);
    }
    if (!match.hasMatch()) {
        return result;
    }

    int valueStart = index + match.capturedEnd(0);
    while (valueStart < source.size() && source.at(valueStart).isSpace()) {
        ++valueStart;
    }
    if (valueStart >= source.size() || !isStructuredValueOpener(source.at(valueStart))) {
        return result;
    }

    const int valueEnd = findStructuredValueEnd(source, valueStart);
    if (valueEnd < 0) {
        return result;
    }

    int end = valueEnd;
    while (end < source.size() && (source.at(end).isSpace() && source.at(end) != QLatin1Char('\n'))) {
        ++end;
    }
    if (end < source.size() && source.at(end) == QLatin1Char(';')) {
        ++end;
    }

    result.matched = true;
    result.endIndex = end;
    result.statement = source.mid(index, valueEnd - index).trimmed();
    return result;
}

inline int findNextQHTMLBlockOpen(const QString &source, int cursor)
{
    QChar quote;
    bool escape = false;
    bool lineComment = false;
    bool blockComment = false;
    int squareParenDepth = 0;

    for (int i = cursor; i < source.size(); ++i) {
        const QChar ch = source.at(i);
        const QChar next = i + 1 < source.size() ? source.at(i + 1) : QChar();

        if (lineComment) {
            if (ch == QLatin1Char('\n')) {
                lineComment = false;
            }
            continue;
        }
        if (blockComment) {
            if (ch == QLatin1Char('*') && next == QLatin1Char('/')) {
                blockComment = false;
                ++i;
            }
            continue;
        }
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
        if (ch == QLatin1Char('/') && next == QLatin1Char('/')) {
            lineComment = true;
            ++i;
            continue;
        }
        if (ch == QLatin1Char('/') && next == QLatin1Char('*')) {
            blockComment = true;
            ++i;
            continue;
        }
        if (ch == QLatin1Char('"') || ch == QLatin1Char('\'') || ch == QLatin1Char('`')) {
            quote = ch;
            continue;
        }
        if (ch == QLatin1Char('[') || ch == QLatin1Char('(')) {
            ++squareParenDepth;
            continue;
        }
        if (ch == QLatin1Char(']') || ch == QLatin1Char(')')) {
            if (squareParenDepth > 0) {
                --squareParenDepth;
            }
            continue;
        }
        if (ch != QLatin1Char('{') || squareParenDepth != 0) {
            continue;
        }

        const QString header = source.mid(cursor, i - cursor).trimmed();
        if (headerLooksLikeInlineValueStatement(header)) {
            const int closeIndex = findMatchingBrace(source, i);
            if (closeIndex >= 0) {
                i = closeIndex;
                continue;
            }
        }
        return i;
    }
    return -1;
}

inline int findStatementBoundaryBeforeBlock(const QString &source, int cursor, int blockOpenIndex)
{
    QChar quote;
    bool escape = false;
    bool lineComment = false;
    bool blockComment = false;
    int depth = 0;

    for (int i = cursor; i < blockOpenIndex && i < source.size(); ++i) {
        const QChar ch = source.at(i);
        const QChar next = i + 1 < source.size() ? source.at(i + 1) : QChar();

        if (lineComment) {
            if (ch == QLatin1Char('\n')) {
                lineComment = false;
                if (depth == 0) {
                    return i;
                }
            }
            continue;
        }
        if (blockComment) {
            if (ch == QLatin1Char('*') && next == QLatin1Char('/')) {
                blockComment = false;
                ++i;
            }
            continue;
        }
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
        if (ch == QLatin1Char('/') && next == QLatin1Char('/')) {
            lineComment = true;
            ++i;
            continue;
        }
        if (ch == QLatin1Char('/') && next == QLatin1Char('*')) {
            blockComment = true;
            ++i;
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
        if ((ch == QLatin1Char('\n') || ch == QLatin1Char(';')) && depth == 0) {
            return i;
        }
    }
    return -1;
}

inline QStringList splitSelectors(const QString &header)
{
    QStringList selectors;
    for (const QString &part : header.split(QLatin1Char(','))) {
        const QString trimmed = part.trimmed();
        if (!trimmed.isEmpty()) {
            selectors.append(trimmed);
        }
    }
    return selectors;
}

inline QStringList splitWords(const QString &header)
{
    QStringList words;
    for (const QString &word : header.split(QRegularExpression(QStringLiteral("\\s+")), Qt::SkipEmptyParts)) {
        words.append(word.trimmed());
    }
    return words;
}

inline QStringList splitStatements(const QString &source)
{
    QStringList statements;
    QString current;
    int depth = 0;
    QChar quote;
    bool escape = false;
    bool lineComment = false;
    bool blockComment = false;

    for (int i = 0; i < source.size(); ++i) {
        const QChar ch = source.at(i);
        const QChar next = i + 1 < source.size() ? source.at(i + 1) : QChar();

        if (lineComment) {
            if (ch == QLatin1Char('\n')) {
                lineComment = false;
                const QString statement = current.trimmed();
                if (!statement.isEmpty()) {
                    statements.append(statement);
                }
                current.clear();
            } else {
                current += ch;
            }
            continue;
        }

        if (blockComment) {
            current += ch;
            if (ch == QLatin1Char('*') && next == QLatin1Char('/')) {
                current += next;
                blockComment = false;
                ++i;
            }
            continue;
        }

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

        if (ch == QLatin1Char('/') && next == QLatin1Char('/')) {
            lineComment = true;
            ++i;
            continue;
        }

        if (ch == QLatin1Char('/') && next == QLatin1Char('*')) {
            blockComment = true;
            current += ch;
            current += next;
            ++i;
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

        if ((ch == QLatin1Char(';') || ch == QLatin1Char('\n')) && depth == 0) {
            const QString statement = current.trimmed();
            if (!statement.isEmpty()) {
                statements.append(statement);
            }
            current.clear();
            continue;
        }

        current += ch;
    }

    const QString statement = current.trimmed();
    if (!statement.isEmpty()) {
        statements.append(statement);
    }
    return statements;
}

inline bool specialSelectorIsOnlyAtEnd(const QStringList &selectors)
{
    for (int i = 0; i < selectors.size(); ++i) {
        const SelectorParts parts = parseSelector(selectors.at(i));
        if (!parts.valid) {
            return false;
        }
        const bool special = parts.tagName == QStringLiteral("text") || parts.tagName == QStringLiteral("html");
        if (special && i != selectors.size() - 1) {
            return false;
        }
    }
    return true;
}

inline QHTMLAstAnonNode *buildAnonymousChain(const QStringList &selectors, int index, const QString &content)
{
    const SelectorParts parts = parseSelector(selectors.at(index));
    if (!parts.valid) {
        return nullptr;
    }
    const bool last = index == selectors.size() - 1;
    QHash<QString, QString> attributes = parts.attributes;
    attributes.insert(QStringLiteral("__qhtml-anonymous-chain"), QString());
    QHTMLAstAnonNode *node = new QHTMLAstAnonNode(parts.tagName, attributes, last ? content : QString(), last);
    if (!last) {
        node->appendAstChild(buildAnonymousChain(selectors, index + 1, content));
    }
    return node;
}

inline QHTMLAstNode *nodeFromHeader(const QString &header, const QString &content)
{
    const QString trimmedHeader = header.trimmed();
    if (trimmedHeader.isEmpty()) {
        return new QHTMLAstUnknownFragment(content);
    }

    if (trimmedHeader == QStringLiteral("slot") || trimmedHeader == QStringLiteral("q-slot")) {
        const QString slotName = content.trimmed();
        if (!slotName.isEmpty() && isKeywordToken(slotName)) {
            return new QHTMLAstNamedTypeNode(QStringLiteral("slot"), slotName, {}, QString());
        }
    }

    static const QRegularExpression forRx(
        QStringLiteral("^\\s*for\\s*\\(\\s*([A-Za-z_][A-Za-z0-9_]*)\\s+in\\s+([^\\)]+?)\\s*\\)\\s*$"));
    const QRegularExpressionMatch forMatch = forRx.match(trimmedHeader);
    if (forMatch.hasMatch()) {
        QHash<QString, QString> attributes;
        attributes.insert(QStringLiteral("collection"), forMatch.captured(2).trimmed());
        return new QHTMLAstNamedTypeNode(QStringLiteral("for"),
                                        forMatch.captured(1).trimmed(),
                                        attributes,
                                        content);
    }

    static const QRegularExpression legacyTypedPropertyRx(
        QStringLiteral("^\\s*q-property\\s+([A-Za-z_][A-Za-z0-9_+\\-]*)\\s*:\\s*(q-array|q-map|q-model)\\s*$"));
    const QRegularExpressionMatch legacyTypedPropertyMatch = legacyTypedPropertyRx.match(trimmedHeader);
    if (legacyTypedPropertyMatch.hasMatch()) {
        QHash<QString, QString> attributes;
        attributes.insert(QStringLiteral("value"), legacyTypedPropertyMatch.captured(2).trimmed());
        return new QHTMLAstNamedTypeNode(QStringLiteral("q-property"),
                                        legacyTypedPropertyMatch.captured(1).trimmed(),
                                        attributes,
                                        content);
    }

    static const QRegularExpression objectPropertyRx(
        QStringLiteral("^\\s*q-property\\s+([A-Za-z_][A-Za-z0-9_+\\-]*)\\s*:\\s*$"));
    const QRegularExpressionMatch objectPropertyMatch = objectPropertyRx.match(trimmedHeader);
    if (objectPropertyMatch.hasMatch()) {
        QHash<QString, QString> attributes;
        attributes.insert(QStringLiteral("value"), QStringLiteral("{") + content.trimmed() + QStringLiteral("}"));
        return new QHTMLAstNamedTypeNode(QStringLiteral("q-property"),
                                        objectPropertyMatch.captured(1).trimmed(),
                                        attributes,
                                        QString());
    }

    static const QRegularExpression eventHandlerRx(
        QStringLiteral("^\\s*(?:(propagate|propogate)\\s+)?on([A-Za-z_][A-Za-z0-9_+\\-]*)(?:\\s*\\((.*?)\\))?\\s*$"),
        QRegularExpression::CaseInsensitiveOption);
    const QRegularExpressionMatch eventHandlerMatch = eventHandlerRx.match(trimmedHeader);
    if (eventHandlerMatch.hasMatch()) {
        QHash<QString, QString> attributes;
        attributes.insert(QStringLiteral("parameters"), eventHandlerMatch.captured(3).trimmed());
        if (!eventHandlerMatch.captured(1).trimmed().isEmpty()) {
            attributes.insert(QStringLiteral("propagate"), QStringLiteral("true"));
        }
        return new QHTMLAstNamedTypeNode(QStringLiteral("q-event-handler"),
                                        eventHandlerMatch.captured(2).trimmed().toLower(),
                                        attributes,
                                        content);
    }

    const QStringList selectors = splitSelectors(trimmedHeader);
    if (selectors.size() > 1 && specialSelectorIsOnlyAtEnd(selectors)) {
        return buildAnonymousChain(selectors, 0, content);
    }

    if (trimmedHeader == QStringLiteral("q-connect")) {
        return new QHTMLAstNamedTypeNode(QStringLiteral("q-connect"),
                                        QString(),
                                        {},
                                        content);
    }

    if (trimmedHeader == QStringLiteral("style")) {
        return new QHTMLAstNamedTypeNode(QStringLiteral("style"),
                                        QString(),
                                        {},
                                        content);
    }

    static const QRegularExpression behaviorRx(
        QStringLiteral("^\\s*behavior\\s+on\\s+([A-Za-z_][A-Za-z0-9_+\\-]*)\\s*$"),
        QRegularExpression::CaseInsensitiveOption);
    const QRegularExpressionMatch behaviorMatch = behaviorRx.match(trimmedHeader);
    if (behaviorMatch.hasMatch()) {
        return new QHTMLAstNamedTypeNode(QStringLiteral("behavior"),
                                        behaviorMatch.captured(1).trimmed(),
                                        {},
                                        content);
    }

    if (trimmedHeader == QStringLiteral("q-import") || trimmedHeader == QStringLiteral("q-require")) {
        return new QHTMLAstNamedTypeNode(trimmedHeader,
                                        QString(),
                                        {},
                                        content);
    }

    if (trimmedHeader == QStringLiteral("q-array") ||
        trimmedHeader == QStringLiteral("q-map") ||
        trimmedHeader == QStringLiteral("q-model") ||
        trimmedHeader == QStringLiteral("q-layout") ||
        trimmedHeader == QStringLiteral("q-row") ||
        trimmedHeader == QStringLiteral("q-col") ||
        trimmedHeader == QStringLiteral("q-column") ||
        trimmedHeader == QStringLiteral("q-canvas") ||
        trimmedHeader == QStringLiteral("q-property-animation") ||
        trimmedHeader == QStringLiteral("q-sequential-animation") ||
        trimmedHeader == QStringLiteral("q-parallel-animation") ||
        trimmedHeader == QStringLiteral("q-script-action")) {
        return new QHTMLAstNamedTypeNode(trimmedHeader,
                                        QString(),
                                        {},
                                        content);
    }

    const SelectorParts singleSelector = parseSelector(trimmedHeader);
    if (singleSelector.valid) {
        return new QHTMLAstAnonNode(singleSelector.tagName, singleSelector.attributes, content);
    }

    const TypedSignatureParts typedSignature = parseTypedSignature(trimmedHeader);
    if (typedSignature.valid) {
        return new QHTMLAstNamedTypeNode(typedSignature.keyword,
                                        typedSignature.name,
                                        typedSignature.attributes,
                                        content);
    }

    return new QHTMLAstUnknownFragment(trimmedHeader + QStringLiteral(" { ") + content + QStringLiteral(" }"));
}

inline bool appendLegacyPropertyList(QHTMLAstNode *parent, const QString &header, const QString &content)
{
    if (!parent || header.trimmed() != QStringLiteral("q-property")) {
        return false;
    }

    const QStringList names = splitWords(content.trimmed());
    if (names.isEmpty()) {
        return false;
    }

    for (const QString &name : names) {
        if (!isKeywordToken(name)) {
            return false;
        }
    }

    for (const QString &name : names) {
        parent->appendAstChild(new QHTMLAstNamedTypeNode(QStringLiteral("q-property"),
                                                        name,
                                                        {},
                                                        QString()));
    }
    return true;
}

inline QString unquoteQHTMLCallArgument(QString value)
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

inline QHTMLAstNode *nodeFromStatement(const QString &statement)
{
    if (statement.trimmed() == QStringLiteral(";")) {
        return nullptr;
    }

    static const QRegularExpression qhtmlCallRx(
        QStringLiteral("^\\s*qhtml\\s*\\((.*)\\)\\s*$"),
        QRegularExpression::DotMatchesEverythingOption);
    const QRegularExpressionMatch qhtmlCallMatch = qhtmlCallRx.match(statement);
    if (qhtmlCallMatch.hasMatch()) {
        return new QHTMLAstAnonNode(QStringLiteral("html"),
                                    {},
                                    unquoteQHTMLCallArgument(qhtmlCallMatch.captured(1).trimmed()),
                                    false);
    }

    static const QRegularExpression scriptStatementRx(
        QStringLiteral("^\\s*(?:[A-Za-z_$][A-Za-z0-9_$]*(?:\\.[A-Za-z_$][A-Za-z0-9_$]*)+\\s*(?:\\(|=)|(?:const|let|var)\\s+[A-Za-z_$][A-Za-z0-9_$]*\\s*=)"),
        QRegularExpression::DotMatchesEverythingOption);
    if (scriptStatementRx.match(statement).hasMatch()) {
        return new QHTMLAstNamedTypeNode(QStringLiteral("q-script"),
                                        QString(),
                                        {},
                                        statement);
    }

    static const QRegularExpression propertyRx(
        QStringLiteral("^\\s*q-property\\s+([A-Za-z_][A-Za-z0-9_+\\-]*)\\s*:\\s*(.*?)\\s*$"),
        QRegularExpression::DotMatchesEverythingOption);
    const QRegularExpressionMatch propertyMatch = propertyRx.match(statement);
    if (propertyMatch.hasMatch()) {
        QHash<QString, QString> attributes;
        attributes.insert(QStringLiteral("value"), propertyMatch.captured(2).trimmed());
        return new QHTMLAstNamedTypeNode(QStringLiteral("q-property"),
                                        propertyMatch.captured(1).trimmed(),
                                        attributes,
                                        QString());
    }

    static const QRegularExpression assignmentRx(
        QStringLiteral("^\\s*([A-Za-z_][A-Za-z0-9_+\\-]*)\\s*:\\s*(.*?)\\s*$"),
        QRegularExpression::DotMatchesEverythingOption);
    const QRegularExpressionMatch assignmentMatch = assignmentRx.match(statement);
    if (assignmentMatch.hasMatch()) {
        QHash<QString, QString> attributes;
        attributes.insert(QStringLiteral("value"), assignmentMatch.captured(2).trimmed());
        return new QHTMLAstNamedTypeNode(QStringLiteral("q-property-assignment"),
                                        assignmentMatch.captured(1).trimmed(),
                                        attributes,
                                        QString());
    }

    const TypedSignatureParts typedSignature = parseTypedSignature(statement);
    if (typedSignature.valid && typedSignature.keyword == QStringLiteral("q-signal")) {
        return new QHTMLAstNamedTypeNode(typedSignature.keyword,
                                        typedSignature.name,
                                        typedSignature.attributes,
                                        QString());
    }
    return nullptr;
}

inline void appendStatementOrUnknown(QHTMLAstNode *parent, const QString &source)
{
    for (const QString &part : splitStatements(source)) {
        const QString statement = part.trimmed();
        if (statement.isEmpty()) {
            continue;
        }
        if (QHTMLAstNode *node = nodeFromStatement(statement)) {
            parent->appendAstChild(node);
        } else {
            parent->appendAstChild(new QHTMLAstUnknownFragment(statement));
        }
    }
}

} // namespace qhtml7_parser_detail

inline void QHTMLAstNode::scan(const QString &source)
{
    const QString cleanedSource = qhtml7_parser_detail::stripComments(source);
    int cursor = 0;
    while (cursor < cleanedSource.size()) {
        while (cursor < cleanedSource.size() &&
               (cleanedSource.at(cursor).isSpace() ||
                cleanedSource.at(cursor) == QLatin1Char(',') ||
                cleanedSource.at(cursor) == QLatin1Char(';'))) {
            ++cursor;
        }
        if (cursor >= cleanedSource.size()) {
            break;
        }

        const qhtml7_parser_detail::StructuredValueStatement structuredStatement =
            qhtml7_parser_detail::structuredValueStatementAt(cleanedSource, cursor);
        if (structuredStatement.matched) {
            if (QHTMLAstNode *node = qhtml7_parser_detail::nodeFromStatement(structuredStatement.statement)) {
                appendAstChild(node);
            } else {
                appendAstChild(new QHTMLAstUnknownFragment(structuredStatement.statement));
            }
            cursor = structuredStatement.endIndex;
            continue;
        }

        const int openIndex = qhtml7_parser_detail::findNextQHTMLBlockOpen(cleanedSource, cursor);
        if (openIndex < 0) {
            const QString fragment = cleanedSource.mid(cursor).trimmed();
            if (!fragment.isEmpty()) {
                qhtml7_parser_detail::appendStatementOrUnknown(this, fragment);
            }
            break;
        }

        const int statementBoundaryBeforeBlock =
            qhtml7_parser_detail::findStatementBoundaryBeforeBlock(cleanedSource, cursor, openIndex);
        if (statementBoundaryBeforeBlock >= 0 && statementBoundaryBeforeBlock < openIndex) {
            const QString statement = cleanedSource.mid(cursor, statementBoundaryBeforeBlock - cursor).trimmed();
            if (QHTMLAstNode *node = qhtml7_parser_detail::nodeFromStatement(statement)) {
                appendAstChild(node);
                cursor = statementBoundaryBeforeBlock + 1;
                continue;
            }
        }

        const QString header = cleanedSource.mid(cursor, openIndex - cursor).trimmed();
        const int closeIndex = qhtml7_parser_detail::findMatchingBrace(cleanedSource, openIndex);
        if (closeIndex < 0) {
            appendAstChild(new QHTMLAstUnknownFragment(cleanedSource.mid(cursor).trimmed()));
            break;
        }

        const QString content = cleanedSource.mid(openIndex + 1, closeIndex - openIndex - 1);
        if (!qhtml7_parser_detail::appendLegacyPropertyList(this, header, content)) {
            appendAstChild(qhtml7_parser_detail::nodeFromHeader(header, content));
        }
        cursor = closeIndex + 1;
    }
}

inline void QHTMLDomTree::loadFromAST(QHTMLAstNode *astRoot)
{
    clearChildren();
    if (!astRoot) {
        return;
    }
    astRoot->enumerateKeywords();
    for (int i = 0; i < astRoot->astChildren.size(); ++i) {
        if (QHTMLAstNode *child = astRoot->astChildren.value(i, nullptr)) {
            appendChild(child->toQHTMLNode());
        }
    }
    indexComponentDefinitions();
    resolveComponentExtends();
    instantiateStyleThemeApplications();
    instantiateComponents();
    bindComponentMembers();
}

inline int QHTMLNode::insertQHTMLSource(int index, const QString &source)
{
    QHTMLParser parser;
    QHTMLDomTree parsedTree;
    parsedTree.loadFromAST(parser.parse(source));

    int inserted = 0;
    const int boundedIndex = qBound(0, index, childCount());
    while (parsedTree.childCount() > 0) {
        if (QHTMLNode *child = parsedTree.takeChildAt(0)) {
            insertChild(boundedIndex + inserted, child);
            ++inserted;
        }
    }
    return inserted;
}

inline int QHTMLNode::appendQHTMLSource(const QString &source)
{
    return insertQHTMLSource(childCount(), source);
}

inline int QHTMLNode::replaceChildWithQHTMLSource(int index, const QString &source)
{
    if (index < 0 || index >= childCount()) {
        return 0;
    }
    removeChildAt(index);
    return insertQHTMLSource(index, source);
}

inline void QHTMLDomTree::indexComponentDefinitions()
{
    indexComponentDefinitionsFor(this);
}

inline void QHTMLDomTree::indexComponentDefinitionsFor(QHTMLNode *scope)
{
    if (!scope) {
        return;
    }

    for (int i = 0; i < scope->qhtmlChildren.size(); ++i) {
        QHTMLNode *child = scope->qhtmlChildren.value(i, nullptr);
        if (!child) {
            continue;
        }

        if (QHTMLComponentDefinition *definition = dynamic_cast<QHTMLComponentDefinition *>(child)) {
            if (scope->qhtmlContext) {
                scope->qhtmlContext->updateObjectReference(definition->qhtmlName(), definition);
            }
            if (definition->qhtmlContext) {
                definition->qhtmlContext->updateObjectReference(definition->qhtmlName(), definition);
            }
        }
        if (QHTMLStyle *style = dynamic_cast<QHTMLStyle *>(child)) {
            if (scope->qhtmlContext) {
                scope->qhtmlContext->updateObjectReference(style->qhtmlName(), style);
            }
            if (style->qhtmlContext) {
                style->qhtmlContext->updateObjectReference(style->qhtmlName(), style);
            }
        }
        if (QHTMLTheme *theme = dynamic_cast<QHTMLTheme *>(child)) {
            if (scope->qhtmlContext) {
                scope->qhtmlContext->updateObjectReference(theme->qhtmlName(), theme);
            }
            if (theme->qhtmlContext) {
                theme->qhtmlContext->updateObjectReference(theme->qhtmlName(), theme);
            }
        }

        indexComponentDefinitionsFor(child);
    }
}

inline bool isComponentExtendsMember(QHTMLNode *node)
{
    return dynamic_cast<QHTMLProperty *>(node) ||
           dynamic_cast<QHTMLFunction *>(node) ||
           dynamic_cast<QHTMLSignal *>(node);
}

inline QString componentExtendsMemberKind(QHTMLNode *node)
{
    if (dynamic_cast<QHTMLProperty *>(node)) {
        return QStringLiteral("property");
    }
    if (dynamic_cast<QHTMLFunction *>(node)) {
        return QStringLiteral("function");
    }
    if (dynamic_cast<QHTMLSignal *>(node)) {
        return QStringLiteral("signal");
    }
    return QString();
}

inline QString componentExtendsMemberKey(QHTMLNode *node)
{
    const QString kind = componentExtendsMemberKind(node);
    if (kind.isEmpty() || !node) {
        return QString();
    }
    return kind + QLatin1Char(':') + node->qhtmlName();
}

inline QHTMLNode *cloneComponentExtendsMember(QHTMLNode *node)
{
    if (QHTMLProperty *property = dynamic_cast<QHTMLProperty *>(node)) {
        return property->cloneProperty();
    }
    if (QHTMLFunction *function = dynamic_cast<QHTMLFunction *>(node)) {
        return function->cloneFunction();
    }
    if (QHTMLSignal *signal = dynamic_cast<QHTMLSignal *>(node)) {
        return signal->cloneSignal();
    }
    return nullptr;
}

inline QHTMLProperty *componentPropertyFromAssignment(QHTMLPropertyAssignment *assignment)
{
    if (!assignment) {
        return nullptr;
    }
    QHash<QString, QString> attributes = assignment->attributes();
    attributes.insert(QStringLiteral("value"), assignment->value());
    QHTMLProperty *property = new QHTMLProperty(assignment->qhtmlName(), attributes);
    property->setQHTMLUUID(assignment->qhtmlUUID());
    return property;
}

inline int findComponentMemberIndex(const QVector<QHTMLNode *> &members, const QString &key)
{
    if (key.isEmpty()) {
        return -1;
    }
    for (int i = 0; i < members.size(); ++i) {
        if (componentExtendsMemberKey(members.at(i)) == key) {
            return i;
        }
    }
    return -1;
}

inline void appendOrReplaceComponentMember(QVector<QHTMLNode *> &members,
                                           QSet<QString> &memberKeys,
                                           QHTMLNode *member)
{
    if (!member) {
        return;
    }

    const QString key = componentExtendsMemberKey(member);
    if (key.isEmpty()) {
        members.append(member);
        return;
    }

    const int existingIndex = findComponentMemberIndex(members, key);
    if (existingIndex >= 0) {
        QHTMLNode *oldMember = members.at(existingIndex);
        if (oldMember && !oldMember->parent()) {
            delete oldMember;
        }
        members[existingIndex] = member;
        memberKeys.insert(key);
        return;
    }

    members.append(member);
    memberKeys.insert(key);
}

inline void QHTMLDomTree::resolveComponentExtends()
{
    QSet<QString> resolving;
    QSet<QString> resolved;

    QVector<QHTMLNode *> scopes;
    scopes.append(this);
    for (int cursor = 0; cursor < scopes.size(); ++cursor) {
        QHTMLNode *scope = scopes.at(cursor);
        if (!scope) {
            continue;
        }
        if (QHTMLComponentDefinition *definition = dynamic_cast<QHTMLComponentDefinition *>(scope)) {
            resolveComponentExtendsFor(definition, resolving, resolved);
        }
        for (int i = 0; i < scope->qhtmlChildren.size(); ++i) {
            if (QHTMLNode *child = scope->qhtmlChildren.value(i, nullptr)) {
                scopes.append(child);
            }
        }
    }
}

inline void QHTMLDomTree::resolveComponentExtendsFor(QHTMLComponentDefinition *definition,
                                                     QSet<QString> &resolving,
                                                     QSet<QString> &resolved)
{
    if (!definition || !definition->hasExtends()) {
        return;
    }

    const QString definitionUUID = definition->qhtmlUUID();
    if (resolved.contains(definitionUUID) || resolving.contains(definitionUUID)) {
        return;
    }

    resolving.insert(definitionUUID);
    QVector<QHTMLComponentDefinition *> bases;
    for (const QString &baseName : definition->extendsList()) {
        if (QHTMLComponentDefinition *base = resolveComponentDefinition(definition, baseName)) {
            if (base == definition) {
                continue;
            }
            resolveComponentExtendsFor(base, resolving, resolved);
            bases.append(base);
        }
    }
    mergeInheritedComponentMembers(definition, bases);
    resolving.remove(definitionUUID);
    resolved.insert(definitionUUID);
}

inline void QHTMLDomTree::mergeInheritedComponentMembers(QHTMLComponentDefinition *definition,
                                                         const QVector<QHTMLComponentDefinition *> &bases)
{
    if (!definition || bases.isEmpty()) {
        return;
    }

    QVector<QHTMLNode *> mergedChildren;
    QSet<QString> inheritedMemberKeys;

    for (QHTMLComponentDefinition *base : bases) {
        if (!base) {
            continue;
        }
        for (int i = 0; i < base->qhtmlChildren.size(); ++i) {
            QHTMLNode *baseChild = base->qhtmlChildren.value(i, nullptr);
            if (!isComponentExtendsMember(baseChild)) {
                continue;
            }
            appendOrReplaceComponentMember(mergedChildren,
                                           inheritedMemberKeys,
                                           cloneComponentExtendsMember(baseChild));
        }
    }

    QVector<QHTMLNode *> ownChildren;
    ownChildren.reserve(definition->qhtmlChildren.size());
    for (int i = 0; i < definition->qhtmlChildren.size(); ++i) {
        if (QHTMLNode *child = definition->qhtmlChildren.value(i, nullptr)) {
            ownChildren.append(child);
        }
    }

    for (QHTMLNode *child : ownChildren) {
        if (!child) {
            continue;
        }

        if (isComponentExtendsMember(child)) {
            appendOrReplaceComponentMember(mergedChildren,
                                           inheritedMemberKeys,
                                           child);
            continue;
        }

        if (QHTMLPropertyAssignment *assignment = dynamic_cast<QHTMLPropertyAssignment *>(child)) {
            const QString inheritedPropertyKey = QStringLiteral("property:") + assignment->qhtmlName();
            if (inheritedMemberKeys.contains(inheritedPropertyKey)) {
                appendOrReplaceComponentMember(mergedChildren,
                                               inheritedMemberKeys,
                                               componentPropertyFromAssignment(assignment));
                continue;
            }
        }

        mergedChildren.append(child);
    }

    definition->qhtmlChildren.clear();
    for (QHTMLNode *child : mergedChildren) {
        definition->appendChild(child);
    }
}

inline void QHTMLDomTree::instantiateStyleThemeApplications()
{
    instantiateStyleThemeApplicationsFor(this);
}

inline void QHTMLDomTree::instantiateStyleThemeApplicationsFor(QHTMLNode *scope)
{
    if (!scope) {
        return;
    }

    const int childTotal = scope->qhtmlChildren.size();
    for (int i = 0; i < childTotal; ++i) {
        QHTMLNode *child = scope->qhtmlChildren.value(i, nullptr);
        if (!child) {
            continue;
        }

        if (QHTMLDomElement *element = dynamic_cast<QHTMLDomElement *>(child)) {
            if (QHTMLStyle *style = resolveStyle(element, element->tagName())) {
                QHTMLNode *application = styleApplicationFrom(element, style);
                scope->qhtmlChildren.insert(i, application);
                delete element;
                child = application;
            } else if (QHTMLTheme *theme = resolveTheme(element, element->tagName())) {
                QHTMLNode *application = themeApplicationFrom(element, theme);
                scope->qhtmlChildren.insert(i, application);
                delete element;
                child = application;
            }
        }

        instantiateStyleThemeApplicationsFor(child);
    }
}

inline void QHTMLDomTree::instantiateComponents()
{
    instantiateComponentsFor(this);
}

inline void QHTMLDomTree::instantiateComponentsFor(QHTMLNode *scope)
{
    if (!scope) {
        return;
    }

    const int childTotal = scope->qhtmlChildren.size();
    for (int i = 0; i < childTotal; ++i) {
        QHTMLNode *child = scope->qhtmlChildren.value(i, nullptr);
        if (!child) {
            continue;
        }

        if (QHTMLDomElement *element = dynamic_cast<QHTMLDomElement *>(child)) {
            const bool fromCommaChain = element->attributes().contains(QStringLiteral("__qhtml-anonymous-chain"));
            if (!fromCommaChain) {
                if (QHTMLComponentDefinition *definition = resolveComponentDefinition(element, element->tagName())) {
                    QHTMLNode *instance = anonymousComponentInstanceFrom(element, definition);
                    scope->qhtmlChildren.insert(i, instance);
                    delete element;
                    child = instance;
                }
            }
        }

        if (QHTMLTypedNode *typed = dynamic_cast<QHTMLTypedNode *>(child)) {
            const bool alreadyConcreteComponent =
                dynamic_cast<QHTMLComponentDefinition *>(typed) ||
                dynamic_cast<QHTMLComponentInstance *>(typed) ||
                dynamic_cast<QHTMLWorker *>(typed) ||
                dynamic_cast<QHTMLComponentSlot *>(typed) ||
                dynamic_cast<QHTMLSlotDefault *>(typed) ||
                dynamic_cast<QHTMLPropertyAssignment *>(typed) ||
                dynamic_cast<QHTMLConnect *>(typed) ||
                dynamic_cast<QHTMLTimer *>(typed) ||
                dynamic_cast<QHTMLPropertyAnimation *>(typed) ||
                dynamic_cast<QHTMLAnimationGroup *>(typed) ||
                dynamic_cast<QHTMLScriptAction *>(typed) ||
                dynamic_cast<QHTMLBehavior *>(typed) ||
                dynamic_cast<QHTMLForNode *>(typed) ||
                dynamic_cast<QHTMLImportNode *>(typed) ||
                dynamic_cast<QHTMLStyle *>(typed) ||
                dynamic_cast<QHTMLTheme *>(typed) ||
                dynamic_cast<QHTMLClass *>(typed) ||
                dynamic_cast<QHTMLScript *>(typed) ||
                dynamic_cast<QHTMLStyleApplication *>(typed) ||
                dynamic_cast<QHTMLThemeApplication *>(typed);
            if (!alreadyConcreteComponent) {
                if (QHTMLComponentDefinition *definition = resolveComponentDefinition(typed, typed->keyword())) {
                    QHTMLNode *instance = componentInstanceFrom(typed, definition);
                    scope->qhtmlChildren.insert(i, instance);
                    delete typed;
                    child = instance;

                    if (scope->qhtmlContext) {
                        scope->qhtmlContext->updateObjectReference(child->qhtmlName(), child);
                    }
                    if (child->qhtmlContext) {
                        child->qhtmlContext->updateObjectReference(child->qhtmlName(), child);
                    }
                }
            }
        }

        instantiateComponentsFor(child);
    }
}

inline void QHTMLDomTree::bindComponentMembers()
{
    bindComponentMembersFor(this);
}

inline void QHTMLDomTree::bindComponentMembersFor(QHTMLNode *scope)
{
    if (!scope) {
        return;
    }

    if (QHTMLComponentInstance *instance = dynamic_cast<QHTMLComponentInstance *>(scope)) {
        cloneDefinitionMembers(instance);
    }

    ensureReadySignal(scope);
    bindLocalReferences(scope);

    const int childTotal = scope->qhtmlChildren.size();
    for (int i = 0; i < childTotal; ++i) {
        bindComponentMembersFor(scope->qhtmlChildren.value(i, nullptr));
    }
}

inline void QHTMLDomTree::ensureReadySignal(QHTMLNode *scope)
{
    if (!scope) {
        return;
    }

    const bool renderedSignalOwner =
        dynamic_cast<QHTMLDomElement *>(scope) ||
        dynamic_cast<QHTMLComponentInstance *>(scope) ||
        dynamic_cast<QHTMLWorker *>(scope);
    if (!renderedSignalOwner) {
        return;
    }

    for (QHTMLNode *child : scope->children()) {
        if (QHTMLSignal *signal = dynamic_cast<QHTMLSignal *>(child)) {
            if (signal->qhtmlName().toLower() == QStringLiteral("ready")) {
                signal->setSignalBus(qhtmlSignalBus);
                return;
            }
        }
    }

    QHTMLSignal *ready = new QHTMLSignal(QStringLiteral("ready"));
    ready->setSignalBus(qhtmlSignalBus);
    scope->appendChild(ready);
}

inline void QHTMLDomTree::bindLocalReferences(QHTMLNode *scope)
{
    if (!scope || !scope->qhtmlContext) {
        return;
    }

    for (int i = 0; i < scope->qhtmlChildren.size(); ++i) {
        QHTMLNode *child = scope->qhtmlChildren.value(i, nullptr);
        if (!child || child->qhtmlName().isEmpty()) {
            continue;
        }

        if (QHTMLSignal *signal = dynamic_cast<QHTMLSignal *>(child)) {
            signal->setSignalBus(qhtmlSignalBus);
        }
        if (QHTMLTimer *timer = dynamic_cast<QHTMLTimer *>(child)) {
            timer->setSignalBus(qhtmlSignalBus);
            timer->initialize();
        }
        if (QHTMLPropertyAnimation *animation = dynamic_cast<QHTMLPropertyAnimation *>(child)) {
            animation->setSignalBus(qhtmlSignalBus);
        }
        if (QHTMLAnimationGroup *animationGroup = dynamic_cast<QHTMLAnimationGroup *>(child)) {
            animationGroup->setSignalBus(qhtmlSignalBus);
        }
        if (QHTMLScriptAction *scriptAction = dynamic_cast<QHTMLScriptAction *>(child)) {
            scriptAction->setSignalBus(qhtmlSignalBus);
        }

        if (dynamic_cast<QHTMLFunction *>(child) ||
            dynamic_cast<QHTMLSignal *>(child) ||
            dynamic_cast<QHTMLProperty *>(child) ||
            dynamic_cast<QHTMLEventHandler *>(child) ||
            dynamic_cast<QHTMLConnect *>(child) ||
            dynamic_cast<QHTMLForNode *>(child) ||
           dynamic_cast<QHTMLModelView *>(child) ||
            dynamic_cast<QHTMLModel *>(child) ||
            dynamic_cast<QHTMLArray *>(child) ||
            dynamic_cast<QHTMLMap *>(child) ||
            dynamic_cast<QHTMLComponentSlot *>(child) ||
            dynamic_cast<QHTMLSlotDefault *>(child) ||
            dynamic_cast<QHTMLPropertyAssignment *>(child) ||
            dynamic_cast<QHTMLTimer *>(child) ||
            dynamic_cast<QHTMLPropertyAnimation *>(child) ||
            dynamic_cast<QHTMLAnimationGroup *>(child) ||
            dynamic_cast<QHTMLScriptAction *>(child) ||
            dynamic_cast<QHTMLImportNode *>(child) ||
            dynamic_cast<QHTMLStyle *>(child) ||
            dynamic_cast<QHTMLTheme *>(child) ||
            dynamic_cast<QHTMLClass *>(child) ||
            dynamic_cast<QHTMLScript *>(child) ||
            dynamic_cast<QHTMLWorker *>(child) ||
            dynamic_cast<QHTMLComponentDefinition *>(child) ||
            dynamic_cast<QHTMLComponentInstance *>(child)) {
            scope->qhtmlContext->updateObjectReference(child->qhtmlName(), child);
            if (child->qhtmlContext) {
                child->qhtmlContext->updateObjectReference(child->qhtmlName(), child);
            }
        }
    }
}

inline void QHTMLDomTree::cloneDefinitionMembers(QHTMLComponentInstance *instance)
{
    if (!instance || !instance->definition()) {
        return;
    }

    QHTMLComponentDefinition *definition = instance->definition();
    const int childTotal = definition->qhtmlChildren.size();
    for (int i = 0; i < childTotal; ++i) {
        QHTMLNode *definitionChild = definition->qhtmlChildren.value(i, nullptr);
        if (!definitionChild) {
            continue;
        }

        if (QHTMLConnect *connection = dynamic_cast<QHTMLConnect *>(definitionChild)) {
            instance->appendChild(connection->cloneConnect());
            continue;
        }

        if (definitionChild->qhtmlName().isEmpty()) {
            continue;
        }

        if (QHTMLEventHandler *handler = dynamic_cast<QHTMLEventHandler *>(definitionChild)) {
            instance->appendChild(handler->cloneEventHandler());
            continue;
        }

        if (QHTMLProperty *property = dynamic_cast<QHTMLProperty *>(definitionChild)) {
            bool hasLocalProperty = false;
            QHTMLPropertyAssignment *assignment = nullptr;
            for (QHTMLNode *instanceChild : instance->children()) {
                if (!instanceChild || instanceChild->qhtmlName() != property->qhtmlName()) {
                    continue;
                }
                if (dynamic_cast<QHTMLProperty *>(instanceChild)) {
                    hasLocalProperty = true;
                    break;
                }
                if (!assignment) {
                    assignment = dynamic_cast<QHTMLPropertyAssignment *>(instanceChild);
                }
            }
            if (!hasLocalProperty) {
                QHTMLProperty *clonedProperty = property->cloneProperty();
                if (assignment) {
                    clonedProperty->setValue(assignment->value());
                }
                instance->appendChild(clonedProperty);
            }
            continue;
        }

        if (QHTMLBehavior *behavior = dynamic_cast<QHTMLBehavior *>(definitionChild)) {
            instance->appendChild(behavior->cloneBehavior());
            continue;
        }

        if (hasLocalReference(instance, definitionChild->qhtmlName())) {
            continue;
        }

        if (QHTMLFunction *function = dynamic_cast<QHTMLFunction *>(definitionChild)) {
            instance->appendChild(function->cloneFunction());
        } else if (QHTMLSignal *signal = dynamic_cast<QHTMLSignal *>(definitionChild)) {
            QHTMLSignal *clonedSignal = signal->cloneSignal();
            clonedSignal->setSignalBus(qhtmlSignalBus);
            instance->appendChild(clonedSignal);
        } else if (QHTMLTimer *timer = dynamic_cast<QHTMLTimer *>(definitionChild)) {
            QHTMLTimer *clonedTimer = timer->cloneTimer();
            clonedTimer->setSignalBus(qhtmlSignalBus);
            instance->appendChild(clonedTimer);
        } else if (QHTMLPropertyAnimation *animation = dynamic_cast<QHTMLPropertyAnimation *>(definitionChild)) {
            QHTMLPropertyAnimation *clonedAnimation = animation->cloneAnimation();
            clonedAnimation->setSignalBus(qhtmlSignalBus);
            instance->appendChild(clonedAnimation);
        } else if (QHTMLAnimationGroup *animationGroup = dynamic_cast<QHTMLAnimationGroup *>(definitionChild)) {
            QHTMLAnimationGroup *clonedAnimationGroup = animationGroup->cloneAnimationGroup();
            clonedAnimationGroup->setSignalBus(qhtmlSignalBus);
            instance->appendChild(clonedAnimationGroup);
        } else if (QHTMLScriptAction *scriptAction = dynamic_cast<QHTMLScriptAction *>(definitionChild)) {
            QHTMLScriptAction *clonedScriptAction = scriptAction->cloneScriptAction();
            clonedScriptAction->setSignalBus(qhtmlSignalBus);
            instance->appendChild(clonedScriptAction);
        } else if (QHTMLStyle *style = dynamic_cast<QHTMLStyle *>(definitionChild)) {
            instance->appendChild(style->cloneStyle());
        } else if (QHTMLTheme *theme = dynamic_cast<QHTMLTheme *>(definitionChild)) {
            instance->appendChild(theme->cloneTheme());
        }
    }
}

inline bool QHTMLDomTree::hasLocalReference(QHTMLNode *scope, const QString &name) const
{
    if (!scope || name.isEmpty()) {
        return false;
    }

    if (scope->qhtmlContext && scope->qhtmlContext->containsLocalReference(name)) {
        return true;
    }

    for (int i = 0; i < scope->qhtmlChildren.size(); ++i) {
        QHTMLNode *child = scope->qhtmlChildren.value(i, nullptr);
        if (child && child->qhtmlName() == name) {
            return true;
        }
    }
    return false;
}

inline QHTMLComponentDefinition *QHTMLDomTree::resolveComponentDefinition(QHTMLNode *scope, const QString &path) const
{
    QHTMLNode *resolved = resolveDotPath(scope, path);
    return dynamic_cast<QHTMLComponentDefinition *>(resolved);
}

inline QHTMLStyle *QHTMLDomTree::resolveStyle(QHTMLNode *scope, const QString &path) const
{
    QHTMLNode *resolved = resolveDotPath(scope, path);
    return dynamic_cast<QHTMLStyle *>(resolved);
}

inline QHTMLTheme *QHTMLDomTree::resolveTheme(QHTMLNode *scope, const QString &path) const
{
    QHTMLNode *resolved = resolveDotPath(scope, path);
    return dynamic_cast<QHTMLTheme *>(resolved);
}

inline QHTMLNode *QHTMLDomTree::resolveDotPath(QHTMLNode *scope, const QString &path) const
{
    if (!scope || path.trimmed().isEmpty()) {
        return nullptr;
    }

    const QStringList parts = path.split(QLatin1Char('.'), Qt::SkipEmptyParts);
    if (parts.isEmpty()) {
        return nullptr;
    }

    QHTMLReference *current = scope->resolve(parts.first());
    QHTMLNode *currentNode = dynamic_cast<QHTMLNode *>(current);

    for (int i = 1; i < parts.size(); ++i) {
        const QString part = parts.at(i);
        if (part == QStringLiteral("qhtmlParent")) {
            currentNode = currentNode ? currentNode->parent() : nullptr;
            current = currentNode;
            continue;
        }

        if (!currentNode) {
            return nullptr;
        }
        current = currentNode->resolve(part);
        currentNode = dynamic_cast<QHTMLNode *>(current);
    }

    return currentNode;
}

inline QHTMLNode *QHTMLDomTree::componentInstanceFrom(QHTMLTypedNode *node, QHTMLComponentDefinition *definition) const
{
    QHTMLComponentInstance *instance = new QHTMLComponentInstance(node->qhtmlName(), node->attributes(), definition);
    instance->setQHTMLUUID(node->qhtmlUUID());
    instance->qhtmlParent = node->qhtmlParent;
    if (instance->qhtmlContext && node->qhtmlContext) {
        instance->qhtmlContext->setParentContext(node->qhtmlContext->parentContext());
    }
    moveChildren(node, instance);
    return instance;
}

inline QHTMLNode *QHTMLDomTree::anonymousComponentInstanceFrom(QHTMLDomElement *node, QHTMLComponentDefinition *definition) const
{
    QHash<QString, QString> attributes = node->attributes();
    attributes.remove(QStringLiteral("__qhtml-anonymous-chain"));
    QHTMLComponentInstance *instance = new QHTMLComponentInstance(QString(), attributes, definition);
    instance->setQHTMLUUID(node->qhtmlUUID());
    instance->qhtmlParent = node->qhtmlParent;
    if (instance->qhtmlContext && node->qhtmlContext) {
        instance->qhtmlContext->setParentContext(node->qhtmlContext->parentContext());
    }
    moveChildren(node, instance);
    return instance;
}

inline QHTMLNode *QHTMLDomTree::styleApplicationFrom(QHTMLDomElement *node, QHTMLStyle *style) const
{
    QHTMLStyleApplication *application = new QHTMLStyleApplication(style);
    application->setQHTMLUUID(node->qhtmlUUID());
    application->qhtmlParent = node->qhtmlParent;
    if (application->qhtmlContext && node->qhtmlContext) {
        application->qhtmlContext->setParentContext(node->qhtmlContext->parentContext());
    }
    moveChildren(node, application);
    return application;
}

inline QHTMLNode *QHTMLDomTree::themeApplicationFrom(QHTMLDomElement *node, QHTMLTheme *theme) const
{
    QHTMLThemeApplication *application = new QHTMLThemeApplication(theme);
    application->setQHTMLUUID(node->qhtmlUUID());
    application->qhtmlParent = node->qhtmlParent;
    if (application->qhtmlContext && node->qhtmlContext) {
        application->qhtmlContext->setParentContext(node->qhtmlContext->parentContext());
    }
    moveChildren(node, application);
    return application;
}

inline void QHTMLDomTree::moveChildren(QHTMLNode *from, QHTMLNode *to)
{
    if (!from || !to) {
        return;
    }

    const int childTotal = from->qhtmlChildren.size();
    for (int i = 0; i < childTotal; ++i) {
        if (QHTMLNode *child = from->qhtmlChildren.take(i)) {
            to->appendChild(child);
        }
    }
    from->qhtmlChildren.clear();
}

inline std::string qhtmlReadResourceTextJs(const std::string &path)
{
    QString resourcePath = QString::fromStdString(path).trimmed();
    if (resourcePath.isEmpty()) {
        return {};
    }
    if (!resourcePath.startsWith(QStringLiteral(":"))) {
        resourcePath.prepend(QStringLiteral(":/"));
    }
    QFile file(resourcePath);
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        return {};
    }
    return QString::fromUtf8(file.readAll()).toStdString();
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_BINDINGS(qhtml7_core)
{
    using emscripten::allow_raw_pointers;
    using emscripten::base;
    using emscripten::class_;
    using emscripten::constant;
    using emscripten::function;

    constant("QHTML_VERSION", std::string(QHTML_VERSION));
    constant("QHTML_QUICKJS_ENABLED", true);
    constant("QHTML_QUICKJS_SIZE_BUDGET_BYTES", QHTML_QUICKJS_SIZE_BUDGET_BYTES);
    function("qhtmlVersion", &qhtmlVersionJs);
    function("readResourceText", &qhtmlReadResourceTextJs);

    class_<QHTMLReference>("QHTMLReference")
        .function("qhtmlType", &QHTMLReference::qhtmlTypeJs)
        .function("qhtmlUUID", &QHTMLReference::qhtmlUUIDJs)
        .function("setQHTMLUUID", &QHTMLReference::setQHTMLUUIDJs)
        .function("qhtmlName", &QHTMLReference::qhtmlNameJs)
        .function("setQHTMLName", &QHTMLReference::setQHTMLNameJs);

    class_<QHTMLNode, base<QHTMLReference>>("QHTMLNode")
        .function("parent", &QHTMLNode::parentJs, allow_raw_pointers())
        .function("childCount", &QHTMLNode::childCount)
        .function("childAt", &QHTMLNode::childAt, allow_raw_pointers())
        .function("appendChild", &QHTMLNode::appendChildJs, allow_raw_pointers())
        .function("insertChild", &QHTMLNode::insertChildJs, allow_raw_pointers())
        .function("removeChildAt", &QHTMLNode::removeChildAtJs)
        .function("clearChildren", &QHTMLNode::clearChildrenJs)
        .function("appendQHTMLSource", &QHTMLNode::appendQHTMLSourceJs)
        .function("insertQHTMLSource", &QHTMLNode::insertQHTMLSourceJs)
        .function("replaceChildWithQHTMLSource", &QHTMLNode::replaceChildWithQHTMLSourceJs)
        .function("setProperty", &QHTMLNode::setPropertyJs)
        .function("setPropertyText", &QHTMLNode::setPropertyTextJs)
        .function("property", &QHTMLNode::propertyJs)
        .function("updateKeywordReference", &QHTMLNode::updateKeywordReferenceJs)
        .function("updateNamedReference", &QHTMLNode::updateNamedReferenceJs)
        .function("resolve", &QHTMLNode::resolveJs, allow_raw_pointers())
        .function("resolveType", &QHTMLNode::resolveTypeJs)
        .function("evaluateExpression", &QHTMLNode::evaluateExpressionJs)
        .function("runtime", &QHTMLNode::runtime)
        .function("renderHtml", &QHTMLNode::renderHtmlJs)
        .function("toHTML", &QHTMLNode::toHTMLJs)
        .function("sourceQHTML", &QHTMLNode::sourceQHTMLJs)
        .function("toQHTML", &QHTMLNode::toQHTMLJs)
        .function("fromQHTML", &QHTMLNode::fromQHTMLJs)
        .function("toJSON", &QHTMLNode::toJSONJs)
        .function("toJSONText", &QHTMLNode::toJSONTextJs)
        .function("fromJSON", &QHTMLNode::fromJSONJs)
        .function("fromJSONText", &QHTMLNode::fromJSONTextJs);

    class_<QHTMLDomNode, base<QHTMLNode>>("QHTMLDomNode");
    class_<QHTMLDomElement, base<QHTMLDomNode>>("QHTMLDomElement")
        .function("tagName", &QHTMLDomElement::tagNameJs)
        .function("setAttribute", &QHTMLDomElement::setAttributeJs)
        .function("attribute", &QHTMLDomElement::attributeJs);
    class_<QHTMLTextFragment, base<QHTMLDomNode>>("QHTMLTextFragment")
        .function("value", &QHTMLTextFragment::valueJs);
    class_<QHTMLHTMLFragment, base<QHTMLDomNode>>("QHTMLHTMLFragment")
        .function("value", &QHTMLHTMLFragment::valueJs);
    class_<QHTMLUnknownFragment, base<QHTMLDomNode>>("QHTMLUnknownFragment")
        .function("value", &QHTMLUnknownFragment::valueJs);
    class_<QHTMLJavaScriptBlock, base<QHTMLDomNode>>("QHTMLJavaScriptBlock")
        .function("contents", &QHTMLJavaScriptBlock::contentsJs)
        .function("setContents", &QHTMLJavaScriptBlock::setContentsJs);
    class_<QHTMLTypedNode, base<QHTMLDomNode>>("QHTMLTypedNode")
        .function("keyword", &QHTMLTypedNode::keywordJs)
        .function("attribute", &QHTMLTypedNode::attributeJs);
    class_<QHTMLWorker, base<QHTMLTypedNode>>("QHTMLWorker");
    class_<QHTMLFunction, base<QHTMLTypedNode>>("QHTMLFunction")
        .function("parameters", &QHTMLFunction::parameterListJs)
        .function("body", &QHTMLFunction::bodyJs)
        .function("call", &QHTMLFunction::callJs)
        .function("callCount", &QHTMLFunction::callCount)
        .function("lastArguments", &QHTMLFunction::lastArgumentListJs)
        .function("lastSenderUUID", &QHTMLFunction::lastSenderUUIDJs)
        .function("lastSignalUUID", &QHTMLFunction::lastSignalUUIDJs);
    class_<QHTMLSignal, base<QHTMLTypedNode>>("QHTMLSignal")
        .function("parameters", &QHTMLSignal::parameterListJs)
        .function("connect", &QHTMLSignal::connect, allow_raw_pointers())
        .function("emit", &QHTMLSignal::emitSignalJs)
        .function("signalBus", &QHTMLSignal::signalBusJs, allow_raw_pointers());
    class_<QHTMLSignalBus>("QHTMLSignalBus")
        .function("connect", &QHTMLSignalBus::connectJs, allow_raw_pointers())
        .function("emitSignal", &QHTMLSignalBus::emitSignalJs, allow_raw_pointers())
        .function("connectionCount", &QHTMLSignalBus::connectionCount, allow_raw_pointers())
        .function("lastSignalUUID", &QHTMLSignalBus::lastSignalUUIDJs)
        .function("lastSenderUUID", &QHTMLSignalBus::lastSenderUUIDJs)
        .function("lastFunctionUUID", &QHTMLSignalBus::lastFunctionUUIDJs)
        .function("lastReceiverUUID", &QHTMLSignalBus::lastReceiverUUIDJs)
        .function("lastScriptBody", &QHTMLSignalBus::lastScriptBodyJs)
        .function("lastArguments", &QHTMLSignalBus::lastArgumentListJs)
        .function("lastDispatchCount", &QHTMLSignalBus::lastDispatchCount);
    class_<QHTMLArrayNode, base<QHTMLNode>>("QHTMLArrayNode")
        .function("size", &QHTMLArrayNode::size)
        .function("at", &QHTMLArrayNode::atJs)
        .function("push", &QHTMLArrayNode::pushJs)
        .function("pop", &QHTMLArrayNode::popJs)
        .function("unshift", &QHTMLArrayNode::unshiftJs)
        .function("shift", &QHTMLArrayNode::shiftJs)
        .function("slice", &QHTMLArrayNode::slice, allow_raw_pointers())
        .function("valuesLiteral", &QHTMLArrayNode::valuesLiteralJs);
    class_<QHTMLMapNode, base<QHTMLNode>>("QHTMLMapNode")
        .function("value", &QHTMLMapNode::valueJs)
        .function("setValue", &QHTMLMapNode::setValueJs)
        .function("remove", &QHTMLMapNode::removeJs)
        .function("keysLiteral", &QHTMLMapNode::keysLiteralJs)
        .function("valuesLiteral", &QHTMLMapNode::valuesLiteralJs);
    class_<QHTMLJsonValue, base<QHTMLNode>>("QHTMLJsonValue")
        .function("typeName", &QHTMLJsonValue::typeNameJs)
        .function("isArray", &QHTMLJsonValue::isArray)
        .function("isObject", &QHTMLJsonValue::isObject)
        .function("isString", &QHTMLJsonValue::isString)
        .function("isNumber", &QHTMLJsonValue::isNumber)
        .function("isBool", &QHTMLJsonValue::isBool)
        .function("isNull", &QHTMLJsonValue::isNull)
        .function("isUndefined", &QHTMLJsonValue::isUndefined)
        .function("toString", &QHTMLJsonValue::toStringValueJs)
        .function("toNumber", &QHTMLJsonValue::toNumber)
        .function("toBool", &QHTMLJsonValue::toBool)
        .function("toJson", &QHTMLJsonValue::toJsonJs)
        .function("array", &QHTMLJsonValue::arrayJs, allow_raw_pointers())
        .function("object", &QHTMLJsonValue::objectJs, allow_raw_pointers())
        .function("valueAtPath", &QHTMLJsonValue::valueAtPathJs, allow_raw_pointers())
        .function("stringAtPath", &QHTMLJsonValue::stringAtPathJs);
    class_<QHTMLJsonArray, base<QHTMLNode>>("QHTMLJsonArray")
        .function("size", &QHTMLJsonArray::size)
        .function("at", &QHTMLJsonArray::atJs)
        .function("atJson", &QHTMLJsonArray::atJson, allow_raw_pointers())
        .function("push", &QHTMLJsonArray::pushJs)
        .function("pop", &QHTMLJsonArray::popJs)
        .function("unshift", &QHTMLJsonArray::unshiftJs)
        .function("shift", &QHTMLJsonArray::shiftJs)
        .function("slice", &QHTMLJsonArray::slice, allow_raw_pointers())
        .function("valuesLiteral", &QHTMLJsonArray::valuesLiteralJs);
    class_<QHTMLJsonObject, base<QHTMLNode>>("QHTMLJsonObject")
        .function("size", &QHTMLJsonObject::size)
        .function("contains", &QHTMLJsonObject::containsJs)
        .function("value", &QHTMLJsonObject::valueJs)
        .function("jsonValue", &QHTMLJsonObject::jsonValueJs, allow_raw_pointers())
        .function("valueAtPath", &QHTMLJsonObject::valueAtPathJs)
        .function("setValue", &QHTMLJsonObject::setValueJs)
        .function("remove", &QHTMLJsonObject::removeJs)
        .function("keysLiteral", &QHTMLJsonObject::keysLiteralJs)
        .function("valuesLiteral", &QHTMLJsonObject::valuesLiteralJs);
    class_<QHTMLJsonDocument, base<QHTMLNode>>("QHTMLJsonDocument")
        .function("parse", &QHTMLJsonDocument::parseJs)
        .function("isArray", &QHTMLJsonDocument::isArray)
        .function("isObject", &QHTMLJsonDocument::isObject)
        .function("isEmpty", &QHTMLJsonDocument::isEmpty)
        .function("parseError", &QHTMLJsonDocument::parseErrorJs)
        .function("size", &QHTMLJsonDocument::size)
        .function("rootValue", &QHTMLJsonDocument::rootValueJs, allow_raw_pointers())
        .function("array", &QHTMLJsonDocument::arrayJs, allow_raw_pointers())
        .function("object", &QHTMLJsonDocument::objectJs, allow_raw_pointers())
        .function("valueAtPath", &QHTMLJsonDocument::valueAtPathJs)
        .function("valuesLiteral", &QHTMLJsonDocument::valuesLiteralJs)
        .function("toJson", &QHTMLJsonDocument::toJsonJs);
    class_<QHTMLArray, base<QHTMLTypedNode>>("QHTMLArray")
        .function("arrayValue", &QHTMLArray::arrayValueJs, allow_raw_pointers())
        .function("jsonDocument", &QHTMLArray::jsonDocumentJs, allow_raw_pointers())
        .function("valuesLiteral", &QHTMLArray::valuesLiteralJs);
    class_<QHTMLMap, base<QHTMLTypedNode>>("QHTMLMap")
        .function("objectValue", &QHTMLMap::objectValueJs, allow_raw_pointers())
        .function("jsonDocument", &QHTMLMap::jsonDocumentJs, allow_raw_pointers())
        .function("value", &QHTMLMap::valueJs)
        .function("keysLiteral", &QHTMLMap::keysLiteralJs)
        .function("valuesLiteral", &QHTMLMap::valuesLiteralJs);
    class_<QHTMLModel, base<QHTMLTypedNode>>("QHTMLModel")
        .function("jsonDocument", &QHTMLModel::jsonDocumentJs, allow_raw_pointers())
        .function("valuesLiteral", &QHTMLModel::valuesLiteralJs);
    class_<QHTMLModelView, base<QHTMLTypedNode>>("QHTMLModelView")
        .function("aliasName", &QHTMLModelView::aliasNameJs)
        .function("modelDocument", &QHTMLModelView::modelDocumentJs, allow_raw_pointers());
    class_<QHTMLProperty, base<QHTMLTypedNode>>("QHTMLProperty")
        .function("value", &QHTMLProperty::valueJs)
        .function("setValue", &QHTMLProperty::setValueJs)
        .function("structuredType", &QHTMLProperty::structuredTypeJs)
        .function("structuredValue", &QHTMLProperty::structuredValueJs, allow_raw_pointers());
    class_<QHTMLForNode, base<QHTMLTypedNode>>("QHTMLForNode")
        .function("variableName", &QHTMLForNode::variableNameJs)
        .function("collectionExpression", &QHTMLForNode::collectionExpressionJs)
        .function("body", &QHTMLForNode::bodyJs);
    class_<QHTMLImportNode, base<QHTMLTypedNode>>("QHTMLImportNode")
        .function("isRequire", &QHTMLImportNode::isRequire)
        .function("importKind", &QHTMLImportNode::importKindJs)
        .function("path", &QHTMLImportNode::pathJs)
        .function("cacheMode", &QHTMLImportNode::cacheModeJs)
        .function("body", &QHTMLImportNode::bodyJs);
    class_<QHTMLPropertyAssignment, base<QHTMLTypedNode>>("QHTMLPropertyAssignment")
        .function("value", &QHTMLPropertyAssignment::valueJs);
    class_<QHTMLEventHandler, base<QHTMLTypedNode>>("QHTMLEventHandler")
        .function("eventName", &QHTMLEventHandler::eventNameJs)
        .function("parameters", &QHTMLEventHandler::parameterListJs)
        .function("propagate", &QHTMLEventHandler::propagate)
        .function("body", &QHTMLEventHandler::bodyJs);
    class_<QHTMLConnect, base<QHTMLTypedNode>>("QHTMLConnect")
        .function("body", &QHTMLConnect::bodyJs)
        .function("sourcePath", &QHTMLConnect::sourcePathJs)
        .function("targetPath", &QHTMLConnect::targetPathJs);
    class_<QHTMLScript, base<QHTMLTypedNode>>("QHTMLScript")
        .function("body", &QHTMLScript::bodyJs)
        .function("setBody", &QHTMLScript::setBodyJs);
    class_<QHTMLTimer, base<QHTMLTypedNode>>("QHTMLTimer")
        .function("interval", &QHTMLTimer::interval)
        .function("setInterval", &QHTMLTimer::setIntervalJs)
        .function("running", &QHTMLTimer::running)
        .function("setRunning", &QHTMLTimer::setRunningJs)
        .function("repeat", &QHTMLTimer::repeat)
        .function("setRepeat", &QHTMLTimer::setRepeatJs)
        .function("start", &QHTMLTimer::start)
        .function("stop", &QHTMLTimer::stop)
        .function("tick", &QHTMLTimer::tickJs)
        .function("timeoutSignal", &QHTMLTimer::timeoutSignalJs, allow_raw_pointers());
    class_<QHTMLPropertyAnimation, base<QHTMLTypedNode>>("QHTMLPropertyAnimation")
        .function("duration", &QHTMLPropertyAnimation::duration)
        .function("setDuration", &QHTMLPropertyAnimation::setDurationJs)
        .function("easing", &QHTMLPropertyAnimation::easingJs)
        .function("setEasing", &QHTMLPropertyAnimation::setEasingJs)
        .function("repeat", &QHTMLPropertyAnimation::repeat)
        .function("setRepeat", &QHTMLPropertyAnimation::setRepeatJs)
        .function("steps", &QHTMLPropertyAnimation::steps)
        .function("setSteps", &QHTMLPropertyAnimation::setStepsJs)
        .function("from", &QHTMLPropertyAnimation::from)
        .function("setFrom", &QHTMLPropertyAnimation::setFromJs)
        .function("to", &QHTMLPropertyAnimation::to)
        .function("setTo", &QHTMLPropertyAnimation::setToJs)
        .function("stepAmount", &QHTMLPropertyAnimation::stepAmountJs)
        .function("stepStones", &QHTMLPropertyAnimation::stepStonesJs)
        .function("running", &QHTMLPropertyAnimation::running)
        .function("setRunning", &QHTMLPropertyAnimation::setRunningJs)
        .function("currentStep", &QHTMLPropertyAnimation::currentStep)
        .function("setCurrentStep", &QHTMLPropertyAnimation::setCurrentStepJs)
        .function("i_handleXChange", &QHTMLPropertyAnimation::i_handleXChangeJs)
        .function("start", &QHTMLPropertyAnimation::start)
        .function("stop", &QHTMLPropertyAnimation::stop)
        .function("startedSignal", &QHTMLPropertyAnimation::startedSignalJs, allow_raw_pointers())
        .function("stoppedSignal", &QHTMLPropertyAnimation::stoppedSignalJs, allow_raw_pointers())
        .function("steppedSignal", &QHTMLPropertyAnimation::steppedSignalJs, allow_raw_pointers())
        .function("endedSignal", &QHTMLPropertyAnimation::endedSignalJs, allow_raw_pointers())
        .function("finishedSignal", &QHTMLPropertyAnimation::finishedSignalJs, allow_raw_pointers());
    class_<QHTMLScriptAction, base<QHTMLTypedNode>>("QHTMLScriptAction")
        .function("body", &QHTMLScriptAction::bodyJs)
        .function("setBody", &QHTMLScriptAction::setBodyJs)
        .function("run", &QHTMLScriptAction::runJs)
        .function("startedSignal", &QHTMLScriptAction::startedSignalJs, allow_raw_pointers())
        .function("finishedSignal", &QHTMLScriptAction::finishedSignalJs, allow_raw_pointers());
    class_<QHTMLAnimationGroup, base<QHTMLTypedNode>>("QHTMLAnimationGroup")
        .function("running", &QHTMLAnimationGroup::running)
        .function("setRunning", &QHTMLAnimationGroup::setRunningJs)
        .function("start", &QHTMLAnimationGroup::start)
        .function("stop", &QHTMLAnimationGroup::stop)
        .function("finish", &QHTMLAnimationGroup::finish)
        .function("startedSignal", &QHTMLAnimationGroup::startedSignalJs, allow_raw_pointers())
        .function("stoppedSignal", &QHTMLAnimationGroup::stoppedSignalJs, allow_raw_pointers())
        .function("finishedSignal", &QHTMLAnimationGroup::finishedSignalJs, allow_raw_pointers());
    class_<QHTMLSequentialAnimation, base<QHTMLAnimationGroup>>("QHTMLSequentialAnimation");
    class_<QHTMLParallelAnimation, base<QHTMLAnimationGroup>>("QHTMLParallelAnimation");
    class_<QHTMLBehavior, base<QHTMLTypedNode>>("QHTMLBehavior")
        .function("propertyName", &QHTMLBehavior::propertyNameJs);
    class_<QHTMLLayout, base<QHTMLTypedNode>>("QHTMLLayout")
        .function("direction", &QHTMLLayout::directionJs)
        .function("addRow", &QHTMLLayout::addRowJs, allow_raw_pointers())
        .function("addCol", &QHTMLLayout::addColJs, allow_raw_pointers())
        .function("addLayout", &QHTMLLayout::addLayoutJs, allow_raw_pointers())
        .function("insertRow", &QHTMLLayout::insertRowJs, allow_raw_pointers())
        .function("insertCol", &QHTMLLayout::insertColJs, allow_raw_pointers())
        .function("rows", &QHTMLLayout::rowsJs)
        .function("cols", &QHTMLLayout::colsJs)
        .function("children", &QHTMLLayout::layoutChildrenJs)
        .function("layoutChildCount", &QHTMLLayout::layoutChildCountJs)
        .function("layoutChildAt", &QHTMLLayout::layoutChildAtJs, allow_raw_pointers());
    class_<QHTMLRowLayout, base<QHTMLLayout>>("QHTMLRowLayout");
    class_<QHTMLColumnLayout, base<QHTMLLayout>>("QHTMLColumnLayout");
    class_<QHTMLPainter, base<QHTMLTypedNode>>("QHTMLPainter")
        .function("body", &QHTMLPainter::bodyJs)
        .function("setBody", &QHTMLPainter::setBodyJs)
        .function("paintHandler", &QHTMLPainter::paintHandlerJs, allow_raw_pointers());
    class_<QHTMLCanvas, base<QHTMLTypedNode>>("QHTMLCanvas")
        .function("paintBody", &QHTMLCanvas::paintBodyJs)
        .function("paintHandler", &QHTMLCanvas::paintHandlerJs, allow_raw_pointers());
    class_<QHTMLVideoAsset, base<QHTMLReference>>("QHTMLVideoAsset")
        .constructor<>()
        .function("loadJson", &QHTMLVideoAsset::loadJsonJs)
        .function("isLoaded", &QHTMLVideoAsset::isLoaded)
        .function("width", &QHTMLVideoAsset::width)
        .function("height", &QHTMLVideoAsset::height)
        .function("sourceWidth", &QHTMLVideoAsset::sourceWidth)
        .function("sourceHeight", &QHTMLVideoAsset::sourceHeight)
        .function("frameCount", &QHTMLVideoAsset::frameCount)
        .function("storedFrameCount", &QHTMLVideoAsset::storedFrameCount)
        .function("frameStep", &QHTMLVideoAsset::frameStep)
        .function("defaultFrameDuration", &QHTMLVideoAsset::defaultFrameDuration)
        .function("format", &QHTMLVideoAsset::formatJs)
        .function("codec", &QHTMLVideoAsset::codecJs)
        .function("interpolation", &QHTMLVideoAsset::interpolationJs)
        .function("name", &QHTMLVideoAsset::nameJs)
        .function("src", &QHTMLVideoAsset::srcJs)
        .function("lastError", &QHTMLVideoAsset::lastErrorJs)
        .function("frameBase64", &QHTMLVideoAsset::frameBase64Js)
        .function("frameJson", &QHTMLVideoAsset::frameJsonJs)
        .function("metadataJson", &QHTMLVideoAsset::metadataJsonJs);
    class_<QHTMLVideoPlayer, base<QHTMLReference>>("QHTMLVideoPlayer")
        .constructor<>()
        .function("loadAssetJson", &QHTMLVideoPlayer::loadAssetJsonJs)
        .function("isLoaded", &QHTMLVideoPlayer::isLoaded)
        .function("asset", &QHTMLVideoPlayer::assetJs, allow_raw_pointers())
        .function("width", &QHTMLVideoPlayer::width)
        .function("height", &QHTMLVideoPlayer::height)
        .function("frameCount", &QHTMLVideoPlayer::frameCount)
        .function("storedFrameCount", &QHTMLVideoPlayer::storedFrameCount)
        .function("currentFrame", &QHTMLVideoPlayer::currentFrame)
        .function("startFrame", &QHTMLVideoPlayer::startFrame)
        .function("endFrame", &QHTMLVideoPlayer::endFrame)
        .function("frameDuration", &QHTMLVideoPlayer::frameDuration)
        .function("reverse", &QHTMLVideoPlayer::reverse)
        .function("repeat", &QHTMLVideoPlayer::repeat)
        .function("running", &QHTMLVideoPlayer::running)
        .function("lastError", &QHTMLVideoPlayer::lastErrorJs)
        .function("setFrameDuration", &QHTMLVideoPlayer::setFrameDurationJs)
        .function("setReverse", &QHTMLVideoPlayer::setReverseJs)
        .function("setRepeat", &QHTMLVideoPlayer::setRepeatJs)
        .function("setRunning", &QHTMLVideoPlayer::setRunningJs)
        .function("setRange", &QHTMLVideoPlayer::setRangeJs)
        .function("setStartFrame", &QHTMLVideoPlayer::setStartFrameJs)
        .function("setEndFrame", &QHTMLVideoPlayer::setEndFrameJs)
        .function("setCurrentFrame", &QHTMLVideoPlayer::setCurrentFrameJs)
        .function("step", &QHTMLVideoPlayer::stepJs)
        .function("frameBase64", &QHTMLVideoPlayer::frameBase64Js)
        .function("frameBase64At", &QHTMLVideoPlayer::frameBase64AtJs)
        .function("metadataJson", &QHTMLVideoPlayer::metadataJsonJs);
    class_<QHTMLVideo, base<QHTMLTypedNode>>("QHTMLVideo")
        .function("tagName", &QHTMLVideo::tagNameJs)
        .function("assignmentValue", &QHTMLVideo::assignmentValueJs);
    class_<QHTMLParticleEmitter, base<QHTMLTypedNode>>("QHTMLParticleEmitter")
        .function("tagName", &QHTMLParticleEmitter::tagNameJs)
        .function("assignmentValue", &QHTMLParticleEmitter::assignmentValueJs);
    class_<QHTMLComponentSlot, base<QHTMLTypedNode>>("QHTMLComponentSlot");
    class_<QHTMLSlotDefault, base<QHTMLTypedNode>>("QHTMLSlotDefault");
    class_<QHTMLStyle, base<QHTMLTypedNode>>("QHTMLStyle")
        .function("body", &QHTMLStyle::bodyJs)
        .function("setBody", &QHTMLStyle::setBodyJs)
        .function("setCssText", &QHTMLStyle::setCssTextJs)
        .function("cssText", &QHTMLStyle::cssTextJs)
        .function("classList", &QHTMLStyle::classListJs);
    class_<QHTMLTheme, base<QHTMLTypedNode>>("QHTMLTheme")
        .function("body", &QHTMLTheme::bodyJs)
        .function("setBody", &QHTMLTheme::setBodyJs)
        .function("isDefaultTheme", &QHTMLTheme::isDefaultTheme);
    class_<QHTMLClass, base<QHTMLTypedNode>>("QHTMLClass")
        .function("body", &QHTMLClass::bodyJs)
        .function("setBody", &QHTMLClass::setBodyJs);
    class_<QHTMLVar, base<QHTMLTypedNode>>("QHTMLVar");
    class_<QHTMLStyleApplication, base<QHTMLTypedNode>>("QHTMLStyleApplication")
        .function("style", &QHTMLStyleApplication::styleJs, allow_raw_pointers())
        .function("styleUUID", &QHTMLStyleApplication::styleUUIDJs);
    class_<QHTMLThemeApplication, base<QHTMLTypedNode>>("QHTMLThemeApplication")
        .function("theme", &QHTMLThemeApplication::themeJs, allow_raw_pointers())
        .function("themeUUID", &QHTMLThemeApplication::themeUUIDJs);
    class_<QHTMLComponentDefinition, base<QHTMLTypedNode>>("QHTMLComponentDefinition")
        .function("renderTemplateHtml", &QHTMLComponentDefinition::renderTemplateHtmlJs)
        .function("extendsList", &QHTMLComponentDefinition::extendsListJs)
        .function("hasExtends", &QHTMLComponentDefinition::hasExtends);
    class_<QHTMLComponentInstanceSlot, base<QHTMLTypedNode>>("QHTMLComponentInstanceSlot")
        .function("owner", &QHTMLComponentInstanceSlot::ownerJs, allow_raw_pointers())
        .function("definitionSlot", &QHTMLComponentInstanceSlot::definitionSlotJs, allow_raw_pointers())
        .function("append", &QHTMLComponentInstanceSlot::appendJs, allow_raw_pointers())
        .function("remove", &QHTMLComponentInstanceSlot::removeJs, allow_raw_pointers())
        .function("children", &QHTMLComponentInstanceSlot::childrenJs);
    class_<QHTMLComponentInstance, base<QHTMLTypedNode>>("QHTMLComponentInstance")
        .function("component", &QHTMLComponentInstance::definitionJs, allow_raw_pointers())
        .function("componentDefinition", &QHTMLComponentInstance::definitionJs, allow_raw_pointers())
        .function("componentDefinitionUUID", &QHTMLComponentInstance::componentDefinitionUUIDJs)
        .function("slots", &QHTMLComponentInstance::slotsJs)
        .function("slotCount", &QHTMLComponentInstance::slotCount)
        .function("slotAt", &QHTMLComponentInstance::slotAt, allow_raw_pointers())
        .function("slot", &QHTMLComponentInstance::slotJs, allow_raw_pointers())
        .function("slotNames", &QHTMLComponentInstance::slotNamesJs)
        .function("findChildComponentsOfType", &QHTMLComponentInstance::findChildComponentsOfTypeJs);

    class_<QHTMLDomTree, base<QHTMLDomNode>>("QHTMLDomTree")
        .constructor<>()
        .function("loadFromAST", &QHTMLDomTree::loadFromAST, allow_raw_pointers())
        .function("clear", &QHTMLDomTree::clear)
        .function("root", &QHTMLDomTree::rootJs, allow_raw_pointers())
        .function("signalBus", &QHTMLDomTree::signalBusJs, allow_raw_pointers())
        .function("quickJSAvailable", &QHTMLDomTree::quickJSAvailableJs)
        .function("compileJavaScript", &QHTMLDomTree::compileJavaScriptJs)
        .function("renderHtml", &QHTMLDomTree::renderHtmlJs)
        .function("toHTML", &QHTMLDomTree::toHTMLJs)
        .function("sourceQHTML", &QHTMLDomTree::sourceQHTMLJs)
        .function("toQHTML", &QHTMLDomTree::toQHTMLJs)
        .function("fromQHTML", &QHTMLDomTree::fromQHTMLJs)
        .function("toJSON", &QHTMLDomTree::toJSONJs)
        .function("toJSONText", &QHTMLDomTree::toJSONTextJs)
        .function("fromJSON", &QHTMLDomTree::fromJSONJs)
        .function("fromJSONText", &QHTMLDomTree::fromJSONTextJs);

    class_<QHTMLAstNode>("QHTMLAstNode")
        .function("astType", &QHTMLAstNode::astTypeJs)
        .function("qhtmlType", &QHTMLAstNode::qhtmlTypeJs)
        .function("childCount", &QHTMLAstNode::childCount)
        .function("childAt", &QHTMLAstNode::childAt, allow_raw_pointers())
        .function("enumerateKeywords", &QHTMLAstNode::enumerateKeywords)
        .function("uuidForChildIndex", &QHTMLAstNode::uuidForChildIndexJs)
        .function("toQHTMLNode", &QHTMLAstNode::toQHTMLNode, allow_raw_pointers());

    class_<QHTMLParser>("QHTMLParser")
        .constructor<>()
        .function("parse", emscripten::select_overload<QHTMLAstNode *(const std::string &)>(&QHTMLParser::parse), allow_raw_pointers())
        .function("lastRoot", &QHTMLParser::lastRoot, allow_raw_pointers())
        .function("clear", &QHTMLParser::clear);
}
#endif
