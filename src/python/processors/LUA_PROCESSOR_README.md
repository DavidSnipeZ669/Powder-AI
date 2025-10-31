# Lua Script Processor

The Powder-AI Lua Script Processor enables executing Lua scripts within the Python engine through the Electron IPC system. This allows the UI to dynamically execute scripts for processing, calculations, and automation without redeploying the application.

## Features

- **Sandboxed Execution**: Scripts run in isolated environments with configurable access levels
- **Three Execution Modes**:
  - `ISOLATED`: No access to system functions (safest)
  - `STANDARD`: Standard Lua library with restricted system access
  - `EXTENDED`: Access to custom processing functions and utilities
- **Custom Functions**: Built-in support for logging, JSON, and UUID generation
- **Error Handling**: Comprehensive error reporting with line numbers and messages
- **Type Safety**: Full TypeScript support in the Electron frontend

## Architecture

```
┌─────────────────────────────────────────┐
│  React UI (Renderer Process)            │
│  ├─ window.powder.script.execute()      │
│  ├─ window.powder.script.eval()         │
│  └─ window.powder.script.call()         │
└──────────────┬──────────────────────────┘
               │ IPC
┌──────────────▼──────────────────────────┐
│  Electron Main Process                  │
│  ├─ script:execute (IPC handler)        │
│  ├─ script:eval (IPC handler)           │
│  └─ script:call (IPC handler)           │
└──────────────┬──────────────────────────┘
               │ subprocess
┌──────────────▼──────────────────────────┐
│  Python Engine (engine.py)              │
│  ├─ cmd_script_execute()                │
│  ├─ cmd_script_eval()                   │
│  └─ cmd_script_call()                   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  LuaProcessor                           │
│  ├─ execute(script, context)            │
│  ├─ eval(expression, context)           │
│  └─ call_function(script, func, args)   │
└─────────────────────────────────────────┘
```

## Usage

### Basic Script Execution

Execute a complete Lua script:

```typescript
// From React UI
const result = await window.powder.script.execute({
  script: `
    local name = "World"
    print("Hello " .. name)
    return name
  `
});
// result.success: true
// result.data.output: "World"
```

### Expression Evaluation

Evaluate Lua expressions with context:

```typescript
const result = await window.powder.script.eval({
  expression: 'x * 2 + y',
  context: {
    x: 10,
    y: 5
  }
});
// result.data.value: 25
```

### Function Calls

Define and call functions:

```typescript
const result = await window.powder.script.call({
  script: `
    function fibonacci(n)
      if n <= 1 then
        return n
      end
      return fibonacci(n-1) + fibonacci(n-2)
    end
  `,
  function: 'fibonacci',
  args: [10]
});
// result.data.output: 55
```

### With Context Variables

Pass data to scripts:

```typescript
const result = await window.powder.script.execute({
  script: `
    local sum = 0
    for i = 1, #numbers do
      sum = sum + numbers[i]
    end
    return sum
  `,
  context: {
    numbers: [1, 2, 3, 4, 5]
  }
});
// result.data.output: 15
```

### Using Custom Functions

Built-in functions available in EXTENDED mode:

```typescript
// Logging
await window.powder.script.execute({
  script: `
    log("Processing started", "info")
    log("Warning: Invalid input", "warning")
    log("Error occurred", "error")
  `
});

// JSON operations
await window.powder.script.execute({
  script: `
    local data = { name = "Alice", age = 30 }
    local json_str = json_encode(data)
    log("JSON: " .. json_str)

    local decoded = json_decode('{"x": 100}')
    log("Decoded x: " .. decoded.x)
  `
});

// UUID generation
await window.powder.script.execute({
  script: `
    local id = uuid()
    log("Generated ID: " .. id)
  `
});
```

## Lua Script Utilities

The `lua_utils.py` module provides helper classes for building scripts programmatically:

### LuaScriptBuilder

Build complex scripts programmatically:

```python
from processors.lua_utils import LuaScriptBuilder

builder = LuaScriptBuilder()
script = builder \
  .add_comment("Process data") \
  .add_variable("count", 10) \
  .add_array("items", ["apple", "banana", "cherry"]) \
  .add_for_loop("i", 1, 10, ["log('Item: ' .. i)"]) \
  .build()
```

### LuaExpressionBuilder

Create Lua expressions:

```python
from processors.lua_utils import LuaExpressionBuilder

expr = LuaExpressionBuilder.math_operation("x", "+", "y")
# Result: "(x + y)"

conditional = LuaExpressionBuilder.conditional(
  "x > 10",
  '"big"',
  '"small"'
)
# Result: "(x > 10 and "big" or "small")"
```

### LuaLibraryLoader

Load common Lua libraries:

```python
from processors.lua_utils import LuaLibraryLoader

# Get utility libraries
json_lib = LuaLibraryLoader.get_json_lib()
math_lib = LuaLibraryLoader.get_math_lib()
string_lib = LuaLibraryLoader.get_string_lib()
```

## Error Handling

The processor provides detailed error information:

```typescript
const result = await window.powder.script.execute({
  script: `
    invalid lua syntax here !!!
  `
});

if (!result.success) {
  console.error("Lua error:", result.error);
  // Error contains: "Lua syntax error: ..."
}
```

## Security Considerations

### Execution Modes

- **ISOLATED**: Use for untrusted scripts (strict sandbox)
- **STANDARD**: Default mode, suitable for most use cases
- **EXTENDED**: Only with trusted scripts (has logging, JSON, etc.)

### Best Practices

1. **Input Validation**: Always validate context data before passing to scripts
2. **Timeout Management**: Python engine enforces 30-second timeout per command
3. **Resource Limits**: Monitor script execution for CPU/memory usage
4. **Audit Logging**: All script executions are logged to Python engine logs
5. **Sandboxing**: Dangerous functions (os, io, debug) are disabled

## Performance

- **Script Compilation**: Scripts are compiled on first execution
- **Caching**: Not cached; each execution is independent
- **Memory**: Lua runtime is persistent across calls within a session
- **Timeout**: 30-second maximum execution time per command

## Limitations

- Scripts cannot modify the main engine state permanently
- Cannot spawn external processes or modify files
- Limited to available Lua libraries (math, string, table)
- Maximum context size is JSON-serializable data

## Examples

### Data Processing

```lua
-- Process data array and return statistics
function calculate_stats(data)
  local sum = 0
  local count = 0
  local min = data[1]
  local max = data[1]

  for i = 1, #data do
    local value = data[i]
    sum = sum + value
    count = count + 1
    if value < min then min = value end
    if value > max then max = value end
  end

  return {
    sum = sum,
    count = count,
    average = sum / count,
    min = min,
    max = max
  }
end
```

### String Manipulation

```lua
function process_text(text)
  local words = {}
  for word in text:gmatch("%w+") do
    table.insert(words, word)
  end

  return {
    word_count = #words,
    words = words,
    text_length = #text
  }
end
```

### Configuration Processing

```lua
function merge_configs(base, override)
  local result = {}

  -- Copy base config
  for k, v in pairs(base) do
    result[k] = v
  end

  -- Override with provided values
  for k, v in pairs(override) do
    result[k] = v
  end

  return result
end
```

## Debugging

Enable debug logging by setting environment variables:

```bash
LOG_LEVEL=debug npm start
```

This outputs all Lua execution details to the logs:

```
[2024-01-15T10:30:45.123Z] [DEBUG] [LUA] Executing Lua script (45 chars)
[2024-01-15T10:30:45.125Z] [DEBUG] [LUA] Lua script executed successfully
```

## Dependencies

- `lupa>=2.0.0`: Python wrapper for Lua interpreter
- Lua 5.1+ runtime (required by lupa)

## Installation

```bash
pip install lupa
```

Note: On some systems, you may need to install Lua development libraries:

```bash
# Ubuntu/Debian
sudo apt-get install lua5.1 liblua5.1-dev

# macOS (with Homebrew)
brew install lua

# Windows (with vcpkg)
vcpkg install lua
```
