#pragma once

#include "qhtml_types.hpp"

#include <QtCore/QChar>
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
            QStringLiteral("q-property"),
            QStringLiteral("q-signal"),
            QStringLiteral("q-class"),
            QStringLiteral("q-var"),
            QStringLiteral("q-array"),
            QStringLiteral("q-map"),
            QStringLiteral("q-template"),
            QStringLiteral("q-script"),
            QStringLiteral("q-model-view"),
            QStringLiteral("q-factory"),
            QStringLiteral("function"),
            QStringLiteral("slot"),
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
        scan(innerText);
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
    QHTMLTypedNode *createTypedNode() const
    {
        if (qhtmlKeyword == QStringLiteral("q-component")) {
            return new QHTMLComponentDefinition(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-property")) {
            return new QHTMLProperty(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-signal")) {
            return new QHTMLSignal(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("slot")) {
            return new QHTMLSlot(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-class")) {
            return new QHTMLClass(qhtmlName, m_attributes);
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
        if (qhtmlKeyword == QStringLiteral("q-template")) {
            return new QHTMLTemplate(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-script") || qhtmlKeyword == QStringLiteral("script")) {
            return new QHTMLScript(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-model-view")) {
            return new QHTMLModelView(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("q-factory")) {
            return new QHTMLFactory(qhtmlName, m_attributes);
        }
        if (qhtmlKeyword == QStringLiteral("function")) {
            return new QHTMLMethod(qhtmlName, m_attributes);
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

struct SelectorParts {
    QString tagName;
    QHash<QString, QString> attributes;
    bool valid = false;
};

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
    for (int i = openIndex; i < source.size(); ++i) {
        const QChar ch = source.at(i);
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
    QHTMLAstAnonNode *node = new QHTMLAstAnonNode(parts.tagName, parts.attributes, last ? content : QString(), last);
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

    const QStringList selectors = splitSelectors(trimmedHeader);
    if (selectors.size() > 1 && specialSelectorIsOnlyAtEnd(selectors)) {
        return buildAnonymousChain(selectors, 0, content);
    }

    const SelectorParts singleSelector = parseSelector(trimmedHeader);
    if (singleSelector.valid) {
        return new QHTMLAstAnonNode(singleSelector.tagName, singleSelector.attributes, content);
    }

    const QStringList words = splitWords(trimmedHeader);
    if (words.size() == 2 && isKeywordToken(words.at(0))) {
        const SelectorParts nameSelector = parseSelector(words.at(1));
        if (nameSelector.valid) {
            return new QHTMLAstNamedTypeNode(words.at(0), nameSelector.tagName, nameSelector.attributes, content);
        }
    }

    return new QHTMLAstUnknownFragment(trimmedHeader + QStringLiteral(" { ") + content + QStringLiteral(" }"));
}

} // namespace qhtml7_parser_detail

inline void QHTMLAstNode::scan(const QString &source)
{
    int cursor = 0;
    while (cursor < source.size()) {
        while (cursor < source.size() && source.at(cursor).isSpace()) {
            ++cursor;
        }
        if (cursor >= source.size()) {
            break;
        }

        const int openIndex = source.indexOf(QLatin1Char('{'), cursor);
        if (openIndex < 0) {
            const QString fragment = source.mid(cursor).trimmed();
            if (!fragment.isEmpty()) {
                appendAstChild(new QHTMLAstUnknownFragment(fragment));
            }
            break;
        }

        const QString header = source.mid(cursor, openIndex - cursor).trimmed();
        const int closeIndex = qhtml7_parser_detail::findMatchingBrace(source, openIndex);
        if (closeIndex < 0) {
            appendAstChild(new QHTMLAstUnknownFragment(source.mid(cursor).trimmed()));
            break;
        }

        const QString content = source.mid(openIndex + 1, closeIndex - openIndex - 1);
        appendAstChild(qhtml7_parser_detail::nodeFromHeader(header, content));
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
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_BINDINGS(qhtml7_core)
{
    using emscripten::allow_raw_pointers;
    using emscripten::base;
    using emscripten::class_;

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
        .function("setProperty", &QHTMLNode::setPropertyJs)
        .function("property", &QHTMLNode::propertyJs)
        .function("updateKeywordReference", &QHTMLNode::updateKeywordReferenceJs)
        .function("updateNamedReference", &QHTMLNode::updateNamedReferenceJs)
        .function("resolveType", &QHTMLNode::resolveTypeJs)
        .function("runtime", &QHTMLNode::runtime)
        .function("renderHtml", &QHTMLNode::renderHtmlJs);

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
    class_<QHTMLTypedNode, base<QHTMLDomNode>>("QHTMLTypedNode")
        .function("keyword", &QHTMLTypedNode::keywordJs);

    class_<QHTMLDomTree, base<QHTMLDomNode>>("QHTMLDomTree")
        .constructor<>()
        .function("loadFromAST", &QHTMLDomTree::loadFromAST, allow_raw_pointers())
        .function("clear", &QHTMLDomTree::clear)
        .function("root", &QHTMLDomTree::rootJs, allow_raw_pointers())
        .function("renderHtml", &QHTMLDomTree::renderHtmlJs);

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
