#pragma once

#include <cstdint>
#include <string>
#include <utility>
#include <vector>

#include <emscripten/val.h>

namespace qhtml {

using DomHandleValue = std::uint32_t;

enum class DomOpcode : std::uint8_t {
    SetAttribute = 0,
    SetProperty = 1,
    SetStyle = 2,
    AppendChild = 3,
    Remove = 4
};

struct DomMutation {
    DomOpcode opcode;
    DomHandleValue target;
    std::uint32_t nameOffset;
    std::uint32_t valueOffset;
};

struct DomMutationCommand {
    DomOpcode opcode = DomOpcode::SetAttribute;
    DomHandleValue target = 0;
    std::string name;
    std::string value;
};

struct QHTMLTreeMutationCommand {
    std::string operation;
    std::string treeUUID;
    std::string parentUUID;
    std::string targetUUID;
    std::string beforeUUID;
    std::string componentUUID;
    std::string slotName;
    std::string qhtmlType;
    std::string qhtmlName;
    std::string qhtmlSource;
    std::string htmlSource;
    std::string jsonSource;
    std::string attributeName;
    std::string attributeValue;
    int index = -1;
    int count = 0;
};

class DomBridge final {
public:
    [[nodiscard]]
    static emscripten::val bridge()
    {
        // Resolve the browser bridge for every operation. The bridge may be
        // installed or replaced after WASM initialization, so caching the JS
        // object would reproduce the stale-reference problem this layer is
        // intended to avoid.
        return emscripten::val::global("QHTMLBrowserBridge");
    }

    [[nodiscard]]
    static bool isAvailable()
    {
        const emscripten::val instance = bridge();
        return !instance.isUndefined() && !instance.isNull();
    }

    [[nodiscard]]
    static bool hasFunction(const char *name)
    {
        if (!isAvailable() || !name) {
            return false;
        }
        const emscripten::val member = bridge()[std::string(name)];
        return !member.isUndefined() &&
               !member.isNull() &&
               member.typeOf().as<std::string>() == std::string("function");
    }

    [[nodiscard]]
    static DomHandleValue querySelector(const std::string &selector)
    {
        return bridge().call<DomHandleValue>("querySelector", selector);
    }

    [[nodiscard]]
    static DomHandleValue createElement(const std::string &tagName)
    {
        return bridge().call<DomHandleValue>("createElement", tagName);
    }

    static bool appendChild(DomHandleValue parent, DomHandleValue child)
    {
        return bridge().call<bool>("appendChild", parent, child);
    }

    static bool setAttribute(DomHandleValue handle,
                             const std::string &name,
                             const std::string &value)
    {
        return bridge().call<bool>("setAttribute", handle, name, value);
    }

    static bool setProperty(DomHandleValue handle,
                            const std::string &property,
                            const emscripten::val &value)
    {
        return bridge().call<bool>("setProperty", handle, property, value);
    }

    static bool setStyle(DomHandleValue handle,
                         const std::string &property,
                         const std::string &value)
    {
        return bridge().call<bool>("setStyle", handle, property, value);
    }

    static bool remove(DomHandleValue handle)
    {
        return bridge().call<bool>("remove", handle);
    }

    static void release(DomHandleValue handle)
    {
        if (handle != 0) {
            bridge().call<bool>("release", handle);
        }
    }

    static emscripten::val mutationValue(const QHTMLTreeMutationCommand &command)
    {
        emscripten::val item = emscripten::val::object();
        item.set("operation", command.operation);
        item.set("treeUUID", command.treeUUID);
        item.set("parentUUID", command.parentUUID);
        item.set("targetUUID", command.targetUUID);
        item.set("beforeUUID", command.beforeUUID);
        item.set("componentUUID", command.componentUUID);
        item.set("slotName", command.slotName);
        item.set("qhtmlType", command.qhtmlType);
        item.set("qhtmlName", command.qhtmlName);
        item.set("qhtml", command.qhtmlSource);
        item.set("html", command.htmlSource);
        item.set("json", command.jsonSource);
        item.set("attributeName", command.attributeName);
        item.set("attributeValue", command.attributeValue);
        item.set("index", command.index);
        item.set("count", command.count);
        return item;
    }

    static bool notifyQHTMLMutation(const QHTMLTreeMutationCommand &command)
    {
        if (!hasFunction("applyQHTMLMutation")) {
            return false;
        }
        return bridge().call<bool>("applyQHTMLMutation", mutationValue(command));
    }

    static bool notifyQHTMLMutations(const std::vector<QHTMLTreeMutationCommand> &commands)
    {
        if (commands.empty()) {
            return true;
        }
        if (hasFunction("applyQHTMLMutationBatch")) {
            emscripten::val out = emscripten::val::array();
            for (std::size_t i = 0; i < commands.size(); ++i) {
                out.set(i, mutationValue(commands.at(i)));
            }
            return bridge().call<bool>("applyQHTMLMutationBatch", out);
        }
        bool applied = false;
        for (const QHTMLTreeMutationCommand &command : commands) {
            applied = notifyQHTMLMutation(command) || applied;
        }
        return applied;
    }

    static bool applyMutationBatch(const emscripten::val &commands)
    {
        return bridge().call<bool>("applyMutationBatch", commands);
    }

    static bool applyMutationBatch(const std::vector<DomMutationCommand> &commands)
    {
        emscripten::val out = emscripten::val::array();

        for (std::size_t i = 0; i < commands.size(); ++i) {
            const DomMutationCommand &command = commands.at(i);
            emscripten::val item = emscripten::val::object();
            item.set("opcode", static_cast<int>(command.opcode));
            item.set("target", command.target);
            item.set("name", command.name);
            item.set("value", command.value);
            out.set(i, item);
        }

        return applyMutationBatch(out);
    }
};

class DomHandle final {
public:
    DomHandle() = default;

    explicit DomHandle(DomHandleValue value)
        : value_(value)
    {
    }

    DomHandle(const DomHandle &) = delete;
    DomHandle &operator=(const DomHandle &) = delete;

    DomHandle(DomHandle &&other) noexcept
        : value_(std::exchange(other.value_, 0))
    {
    }

    DomHandle &operator=(DomHandle &&other) noexcept
    {
        if (this != &other) {
            reset();
            value_ = std::exchange(other.value_, 0);
        }

        return *this;
    }

    ~DomHandle()
    {
        reset();
    }

    [[nodiscard]]
    DomHandleValue value() const noexcept
    {
        return value_;
    }

    [[nodiscard]]
    explicit operator bool() const noexcept
    {
        return value_ != 0;
    }

    [[nodiscard]]
    DomHandleValue releaseOwnership() noexcept
    {
        return std::exchange(value_, 0);
    }

    void reset(DomHandleValue replacement = 0)
    {
        if (value_ != 0) {
            DomBridge::release(value_);
        }

        value_ = replacement;
    }

private:
    DomHandleValue value_ = 0;
};

class DomMutationBatch final {
public:
    void setAttribute(DomHandleValue target,
                      const std::string &name,
                      const std::string &value)
    {
        commands_.push_back({DomOpcode::SetAttribute, target, name, value});
    }

    void setProperty(DomHandleValue target,
                     const std::string &property,
                     const std::string &value)
    {
        commands_.push_back({DomOpcode::SetProperty, target, property, value});
    }

    void setStyle(DomHandleValue target,
                  const std::string &property,
                  const std::string &value)
    {
        commands_.push_back({DomOpcode::SetStyle, target, property, value});
    }

    void appendChild(DomHandleValue parent, DomHandleValue child)
    {
        commands_.push_back({DomOpcode::AppendChild, parent, std::string(), std::to_string(child)});
    }

    void remove(DomHandleValue target)
    {
        commands_.push_back({DomOpcode::Remove, target, std::string(), std::string()});
    }

    [[nodiscard]]
    bool empty() const noexcept
    {
        return commands_.empty();
    }

    [[nodiscard]]
    std::size_t size() const noexcept
    {
        return commands_.size();
    }

    bool apply()
    {
        const bool ok = DomBridge::applyMutationBatch(commands_);
        if (ok) {
            commands_.clear();
        }
        return ok;
    }

    void clear()
    {
        commands_.clear();
    }

private:
    std::vector<DomMutationCommand> commands_;
};

} // namespace qhtml
