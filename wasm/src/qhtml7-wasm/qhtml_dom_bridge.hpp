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

class DomBridge final {
public:
    [[nodiscard]]
    static emscripten::val bridge()
    {
        thread_local emscripten::val instance =
            emscripten::val::global("QHTMLBrowserBridge");

        return instance;
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
