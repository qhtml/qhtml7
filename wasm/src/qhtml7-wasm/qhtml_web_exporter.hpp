#pragma once

#include <QtCore/QJsonObject>
#include <QtCore/QString>
#include <QtCore/QVector>

class QHTMLNode;

struct QHTMLWebExportOptions
{
    enum class DocumentMode
    {
        Fragment,
        StandaloneDocument
    };

    DocumentMode documentMode = DocumentMode::StandaloneDocument;
    bool includeStyles = true;
    bool includeBehavior = true;
    bool includeGeneratorMetadata = true;
    bool prettyPrint = true;
    bool failOnUnsupportedBehavior = false;
    bool warnOnWasmOnlyDynamicObjectApi = true;
    QString documentTitle = QStringLiteral("QHTML Export");
    QString language = QStringLiteral("en");
    QString rootAttribute = QStringLiteral("data-qhtml-export-root");
};

struct QHTMLWebExportDiagnostic
{
    enum class Severity
    {
        Information,
        Warning,
        Error
    };

    Severity severity = Severity::Information;
    QString code;
    QString message;
    QString nodeType;
    QString nodeName;
    QString nodeUuid;
};

struct QHTMLWebBundle
{
    QString markup;
    QString css;
    QString javascript;
    QString html;
    QJsonObject manifest;
    QVector<QHTMLWebExportDiagnostic> diagnostics;

    bool succeeded() const;
    bool hasWarnings() const;
};

class QHTMLWebExporter final
{
public:
    explicit QHTMLWebExporter(QHTMLWebExportOptions options = QHTMLWebExportOptions());

    const QHTMLWebExportOptions &options() const;
    void setOptions(const QHTMLWebExportOptions &options);

    QHTMLWebBundle exportNode(const QHTMLNode &node) const;
    QString toHTML(const QHTMLNode &node) const;

private:
    QHTMLWebExportOptions m_options;
};
