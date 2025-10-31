"""
Lua Script Processor
Executes Lua scripts in a sandboxed environment with access to processing utilities.
"""

import logging
import json
import uuid
from typing import Any, Dict, Optional, Callable
from enum import Enum

# Try to import lupa for Lua support
try:
    import lupa
    LUPA_AVAILABLE = True
except ImportError:
    LUPA_AVAILABLE = False
    lupa = None

logger = logging.getLogger(__name__)


class LuaExecutionMode(Enum):
    """Execution modes for Lua scripts."""
    ISOLATED = "isolated"  # No access to system functions
    STANDARD = "standard"  # Standard Lua library access
    EXTENDED = "extended"  # Extended library with custom functions


class LuaScriptError(Exception):
    """Raised when Lua script execution fails."""
    pass


class LuaProcessor:
    """
    Processes and executes Lua scripts in a sandboxed environment.
    Provides controlled access to processing functions and data.
    """

    def __init__(self, mode: LuaExecutionMode = LuaExecutionMode.STANDARD):
        """
        Initialize the Lua processor.

        Args:
            mode: Execution mode (isolated, standard, or extended)
        """
        if not LUPA_AVAILABLE:
            raise RuntimeError(
                "Lupa library not installed. Install with: pip install lupa"
            )

        self.mode = mode
        self.runtime = lupa.LuaRuntime(unpack_returned_tuples=True)
        self.globals = self.runtime.globals()
        self.setup_environment()
        logger.info(f"Lua processor initialized in {mode.value} mode")

    def setup_environment(self) -> None:
        """Setup the Lua environment based on execution mode."""
        if self.mode == LuaExecutionMode.ISOLATED:
            self._setup_isolated_environment()
        elif self.mode == LuaExecutionMode.STANDARD:
            self._setup_standard_environment()
        elif self.mode == LuaExecutionMode.EXTENDED:
            self._setup_extended_environment()

    def _setup_isolated_environment(self) -> None:
        """Setup an isolated environment with minimal Lua functions."""
        # Remove dangerous functions
        self.globals.os = None
        self.globals.io = None
        self.globals.debug = None
        self.globals.package = None
        self.globals.require = None
        self.globals.load = None
        self.globals.loadstring = None
        self.globals.dofile = None

        # Keep only safe functions
        logger.debug("Isolated Lua environment configured")

    def _setup_standard_environment(self) -> None:
        """Setup standard Lua environment with restricted system access."""
        # Remove most dangerous functions but keep standard library
        self.globals.os = None
        self.globals.io = None
        self.globals.debug = None
        self.globals.package = None
        self.globals.require = None

        # Keep math, string, table, and basic functions
        logger.debug("Standard Lua environment configured")

    def _setup_extended_environment(self) -> None:
        """Setup extended environment with custom processing functions."""
        # Standard library is available
        self._register_custom_functions()
        logger.debug("Extended Lua environment configured with custom functions")

    def _register_custom_functions(self) -> None:
        """Register custom functions available to Lua scripts."""
        # Logging function
        def lua_log(message: str, level: str = "info") -> None:
            """Log message from Lua script."""
            level_map = {
                "debug": logger.debug,
                "info": logger.info,
                "warning": logger.warning,
                "error": logger.error,
            }
            log_func = level_map.get(level.lower(), logger.info)
            log_func(f"[LUA] {message}")

        self.globals.log = lua_log

        # JSON utilities
        def lua_json_encode(obj: Any) -> str:
            """Convert Lua object to JSON string."""
            return json.dumps(obj)

        def lua_json_decode(json_str: str) -> Any:
            """Parse JSON string to Lua object."""
            return json.loads(json_str)

        self.globals.json_encode = lua_json_encode
        self.globals.json_decode = lua_json_decode

        # Utility functions
        def lua_uuid() -> str:
            """Generate UUID."""
            return str(uuid.uuid4())

        self.globals.uuid = lua_uuid

        logger.debug("Custom functions registered")

    def execute(
        self,
        script: str,
        context: Optional[Dict[str, Any]] = None,
        timeout_ms: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Execute a Lua script.

        Args:
            script: Lua script code
            context: Variables to inject into Lua environment
            timeout_ms: Execution timeout in milliseconds (not enforced, for future use)

        Returns:
            Dict with keys: success (bool), result (any), error (str or None)
        """
        try:
            # Inject context variables
            if context:
                for key, value in context.items():
                    self.globals[key] = value

            logger.debug(f"Executing Lua script ({len(script)} chars)")

            # Execute script
            result = self.runtime.execute(script)

            logger.debug("Lua script executed successfully")

            return {
                "success": True,
                "result": result,
                "error": None,
            }

        except lupa.LuaSyntaxError as e:
            error_msg = f"Lua syntax error: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "result": None,
                "error": error_msg,
            }

        except lupa.LuaError as e:
            error_msg = f"Lua runtime error: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "result": None,
                "error": error_msg,
            }

        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "result": None,
                "error": error_msg,
            }

    def eval(
        self,
        expression: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate a Lua expression.

        Args:
            expression: Lua expression to evaluate
            context: Variables to inject into Lua environment

        Returns:
            Dict with keys: success (bool), result (any), error (str or None)
        """
        try:
            # Inject context variables
            if context:
                for key, value in context.items():
                    self.globals[key] = value

            logger.debug(f"Evaluating Lua expression: {expression[:50]}...")

            # Evaluate expression
            result = self.runtime.eval(expression)

            logger.debug("Lua expression evaluated successfully")

            return {
                "success": True,
                "result": result,
                "error": None,
            }

        except lupa.LuaSyntaxError as e:
            error_msg = f"Lua syntax error: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "result": None,
                "error": error_msg,
            }

        except lupa.LuaError as e:
            error_msg = f"Lua runtime error: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "result": None,
                "error": error_msg,
            }

        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "result": None,
                "error": error_msg,
            }

    def call_function(
        self,
        script: str,
        function_name: str,
        args: Optional[list] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Define a function in Lua and call it.

        Args:
            script: Lua script containing function definition
            function_name: Name of function to call
            args: Arguments to pass to function
            context: Variables to inject into Lua environment

        Returns:
            Dict with keys: success (bool), result (any), error (str or None)
        """
        try:
            # Inject context variables
            if context:
                for key, value in context.items():
                    self.globals[key] = value

            logger.debug(f"Loading Lua script with function: {function_name}")

            # Execute script to define function
            self.runtime.execute(script)

            # Get function from Lua environment
            lua_func = self.globals[function_name]
            if not callable(lua_func):
                raise LuaScriptError(f"{function_name} is not a function")

            logger.debug(f"Calling Lua function: {function_name}")

            # Call function with args
            if args:
                result = lua_func(*args)
            else:
                result = lua_func()

            logger.debug(f"Lua function {function_name} executed successfully")

            return {
                "success": True,
                "result": result,
                "error": None,
            }

        except LuaScriptError as e:
            error_msg = str(e)
            logger.error(error_msg)
            return {
                "success": False,
                "result": None,
                "error": error_msg,
            }

        except (lupa.LuaSyntaxError, lupa.LuaError) as e:
            error_msg = f"Lua error: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "result": None,
                "error": error_msg,
            }

        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "result": None,
                "error": error_msg,
            }

    def cleanup(self) -> None:
        """Cleanup Lua runtime."""
        try:
            if self.runtime:
                self.globals.clear()
                logger.debug("Lua runtime cleaned up")
        except Exception as e:
            logger.warning(f"Error cleaning up Lua runtime: {e}")
