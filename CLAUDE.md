# Claude Terminal Capture

This project is a VS Code extension + MCP server that captures terminal output so Claude Code can read it.

## MCP Tools Available

- `get_terminal_output` — get recent terminal command output (last N commands)
- `get_terminal_errors` — get commands that produced errors (crashes, exceptions, failures)
- `search_terminal_output` — search terminal output for a specific pattern

## Auto-Debug Workflow

When a user says a script crashed or isn't working, use `get_terminal_errors` to see the error output, then read the relevant source files and fix the issue.

When asked to run a script:
1. Run it with Bash
2. If it fails, immediately read the error, open the source file, and fix the bug
3. Re-run to confirm the fix works
4. Repeat until the script runs successfully
