# Claude Terminal Capture

This project is a VS Code extension + MCP server that captures terminal output so Claude Code can read it.

## MCP Tools Available

- `get_terminal_output` — get recent terminal command output (last N commands)
- `get_terminal_errors` — get commands that produced errors (crashes, exceptions, failures)
- `search_terminal_output` — search terminal output for a specific pattern
- `run_script` — run a script in a visible VS Code terminal and return its output

## Auto-Debug Workflow

When a user says a script crashed or isn't working, use `get_terminal_errors` to see the error output, then read the relevant source files and fix the issue.

When asked to run a script:
1. Run it with `run_script`
2. If it fails, immediately read the error, open the source file, and fix the bug
3. Re-run to confirm the fix works
4. Repeat until the script runs successfully

## Databricks Connect

For Python scripts that use PySpark / Databricks Connect, use the `/run-databricks` skill.
This activates the correct venv and runs on serverless compute.

The skill requires setup on each machine — see README.md for instructions, or ask Claude to set it up by finding the venv Python path and the Databricks bootstrap script path.

**IMPORTANT**: Do NOT change `SparkSession.builder.getOrCreate()` to `DatabricksSession`. The existing `SparkSession` import works correctly with Databricks Connect when the venv is activated. Never modify the Spark session setup unless the user explicitly asks.

## Development

- `npm run compile` — build both extension and MCP server
- The extension auto-registers the MCP server with Claude Code on activation
- IPC between MCP server and extension uses `~/.claude-terminal-capture/` directory
- No user-specific paths should be committed to the repo — use placeholders in `.claude/skills/` and configure real paths in `~/.claude/skills/`
