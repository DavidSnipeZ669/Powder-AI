"""
Lua Script Utilities
Helper functions for working with Lua scripts and the processor.
"""

import logging
from typing import Any, Dict, List, Optional
import json

logger = logging.getLogger(__name__)


class LuaScriptBuilder:
    """Builder for constructing Lua scripts programmatically."""

    def __init__(self):
        """Initialize the script builder."""
        self.lines: List[str] = []

    def add_comment(self, comment: str) -> "LuaScriptBuilder":
        """Add a comment line."""
        self.lines.append(f"-- {comment}")
        return self

    def add_blank_line(self) -> "LuaScriptBuilder":
        """Add a blank line."""
        self.lines.append("")
        return self

    def add_function(
        self,
        name: str,
        parameters: Optional[List[str]] = None,
        body: Optional[List[str]] = None,
    ) -> "LuaScriptBuilder":
        """Add a function definition."""
        params = ", ".join(parameters) if parameters else ""
        self.lines.append(f"function {name}({params})")

        if body:
            for line in body:
                self.lines.append(f"  {line}")

        self.lines.append("end")
        return self

    def add_line(self, code: str, indent: int = 0) -> "LuaScriptBuilder":
        """Add a code line with optional indentation."""
        prefix = "  " * indent
        self.lines.append(f"{prefix}{code}")
        return self

    def add_variable(self, name: str, value: Any) -> "LuaScriptBuilder":
        """Add a variable assignment."""
        if isinstance(value, str):
            self.lines.append(f'{name} = "{value}"')
        elif isinstance(value, bool):
            self.lines.append(f"{name} = {'true' if value else 'false'}")
        elif isinstance(value, (int, float)):
            self.lines.append(f"{name} = {value}")
        elif isinstance(value, dict):
            self.lines.append(f"{name} = {self._dict_to_lua(value)}")
        elif isinstance(value, list):
            self.lines.append(f"{name} = {self._list_to_lua(value)}")
        else:
            self.lines.append(f"{name} = nil")

        return self

    def add_table(self, name: str, data: Dict[str, Any]) -> "LuaScriptBuilder":
        """Add a table definition."""
        self.lines.append(f"{name} = {{")
        for key, value in data.items():
            if isinstance(value, str):
                self.lines.append(f'  {key} = "{value}",')
            elif isinstance(value, bool):
                self.lines.append(f"  {key} = {'true' if value else 'false'},")
            elif isinstance(value, (int, float)):
                self.lines.append(f"  {key} = {value},")
            else:
                self.lines.append(f"  {key} = {json.dumps(value)},")
        self.lines.append("}")

        return self

    def add_array(self, name: str, data: List[Any]) -> "LuaScriptBuilder":
        """Add an array/table definition."""
        self.lines.append(f"{name} = {{")
        for item in data:
            if isinstance(item, str):
                self.lines.append(f'  "{item}",')
            elif isinstance(item, bool):
                self.lines.append(f"  {'true' if item else 'false'},")
            elif isinstance(item, (int, float)):
                self.lines.append(f"  {item},")
            else:
                self.lines.append(f"  {json.dumps(item)},")
        self.lines.append("}")

        return self

    def add_for_loop(
        self,
        var: str,
        start: int,
        end: int,
        body: Optional[List[str]] = None,
        step: int = 1,
    ) -> "LuaScriptBuilder":
        """Add a for loop."""
        if step != 1:
            self.lines.append(f"for {var} = {start}, {end}, {step} do")
        else:
            self.lines.append(f"for {var} = {start}, {end} do")

        if body:
            for line in body:
                self.lines.append(f"  {line}")

        self.lines.append("end")
        return self

    def add_if_statement(
        self,
        condition: str,
        then_body: Optional[List[str]] = None,
        else_body: Optional[List[str]] = None,
    ) -> "LuaScriptBuilder":
        """Add an if statement."""
        self.lines.append(f"if {condition} then")

        if then_body:
            for line in then_body:
                self.lines.append(f"  {line}")

        if else_body:
            self.lines.append("else")
            for line in else_body:
                self.lines.append(f"  {line}")

        self.lines.append("end")
        return self

    def build(self) -> str:
        """Build and return the complete script."""
        return "\n".join(self.lines)

    @staticmethod
    def _dict_to_lua(data: Dict[str, Any]) -> str:
        """Convert Python dict to Lua table string."""
        items = []
        for key, value in data.items():
            if isinstance(value, str):
                items.append(f'["{key}"] = "{value}"')
            elif isinstance(value, bool):
                items.append(f'["{key}"] = {"true" if value else "false"}')
            elif isinstance(value, (int, float)):
                items.append(f'["{key}"] = {value}')
            else:
                items.append(f'["{key}"] = {json.dumps(value)}')

        return "{" + ", ".join(items) + "}"

    @staticmethod
    def _list_to_lua(data: List[Any]) -> str:
        """Convert Python list to Lua table string."""
        items = []
        for item in data:
            if isinstance(item, str):
                items.append(f'"{item}"')
            elif isinstance(item, bool):
                items.append("true" if item else "false")
            elif isinstance(item, (int, float)):
                items.append(str(item))
            else:
                items.append(json.dumps(item))

        return "{" + ", ".join(items) + "}"


class LuaExpressionBuilder:
    """Builder for constructing Lua expressions."""

    @staticmethod
    def table_access(table: str, key: str) -> str:
        """Create a table access expression."""
        return f"{table}.{key}"

    @staticmethod
    def array_access(array: str, index: int) -> str:
        """Create an array access expression (1-indexed in Lua)."""
        return f"{array}[{index}]"

    @staticmethod
    def function_call(name: str, args: Optional[List[str]] = None) -> str:
        """Create a function call expression."""
        if args:
            return f"{name}({', '.join(args)})"
        return f"{name}()"

    @staticmethod
    def math_operation(left: str, op: str, right: str) -> str:
        """Create a math operation expression."""
        return f"({left} {op} {right})"

    @staticmethod
    def string_concat(parts: List[str]) -> str:
        """Create a string concatenation expression."""
        return " .. ".join(parts)

    @staticmethod
    def conditional(condition: str, true_val: str, false_val: str) -> str:
        """Create a ternary/conditional expression."""
        return f"({condition} and {true_val} or {false_val})"


class LuaLibraryLoader:
    """Loader for common Lua libraries and utilities."""

    @staticmethod
    def get_json_lib() -> str:
        """Get a simple JSON-like library for Lua."""
        return """
-- Simple JSON support
local json = {}

function json.encode(value)
    if type(value) == "string" then
        return '"' .. value .. '"'
    elseif type(value) == "number" then
        return tostring(value)
    elseif type(value) == "boolean" then
        return value and "true" or "false"
    elseif type(value) == "table" then
        local items = {}
        for k, v in pairs(value) do
            table.insert(items, '"' .. k .. '":' .. json.encode(v))
        end
        return "{" .. table.concat(items, ",") .. "}"
    else
        return "null"
    end
end

return json
"""

    @staticmethod
    def get_math_lib() -> str:
        """Get math utilities library."""
        return """
-- Math utilities
local math_utils = {}

function math_utils.clamp(value, min_val, max_val)
    if value < min_val then return min_val end
    if value > max_val then return max_val end
    return value
end

function math_utils.lerp(a, b, t)
    return a + (b - a) * t
end

function math_utils.distance(x1, y1, x2, y2)
    local dx = x2 - x1
    local dy = y2 - y1
    return math.sqrt(dx * dx + dy * dy)
end

return math_utils
"""

    @staticmethod
    def get_string_lib() -> str:
        """Get string utilities library."""
        return """
-- String utilities
local string_utils = {}

function string_utils.split(str, delimiter)
    local result = {}
    local pattern = "([^" .. delimiter .. "]+)"
    for match in string.gmatch(str, pattern) do
        table.insert(result, match)
    end
    return result
end

function string_utils.trim(str)
    return string.gsub(str, "^%s*(.-)%s*$", "%1")
end

function string_utils.starts_with(str, prefix)
    return string.sub(str, 1, string.len(prefix)) == prefix
end

function string_utils.ends_with(str, suffix)
    return suffix == "" or string.sub(str, -string.len(suffix)) == suffix
end

return string_utils
"""
