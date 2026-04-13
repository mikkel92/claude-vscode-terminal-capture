---
name: run-databricks
description: Run a Python script with Databricks Connect using the configured venv
user-invocable: true
---

# Run with Databricks Connect

Run the specified Python file using Databricks Connect in a visible VS Code terminal.

If `$ARGUMENTS` is empty or not provided, glob for `**/*.py` in the workspace (excluding venvs, `.venv`, `__pycache__`, and hidden directories), present the list as a numbered menu, and ask the user which script to run before proceeding.

## Setup (first-time only)

Before this skill can work, you need to find two paths on the user's machine:

1. **VENV_PYTHON** — the Python binary inside the Databricks Connect venv.
   Find it by looking for a `.venv` directory in the user's Databricks-related project, or ask the user. The path looks like: `<project>/.venv/bin/python`

2. **BOOTSTRAP_SCRIPT** — the Databricks VS Code extension's bootstrap script.
   Find it by running: `ls ~/.vscode/extensions/databricks.databricks-*/resources/python/dbconnect-bootstrap.py`

Once found, copy this skill file to `~/.claude/skills/run-databricks/SKILL.md` and replace the placeholders below with the actual paths. The repo copy must keep placeholders.

## Running

Use the `run_script` MCP tool with these parameters:
- `command`: `VENV_PYTHON "BOOTSTRAP_SCRIPT" <file>`
  Replace `<file>` with the absolute path of the file from `$ARGUMENTS`.
  Replace `VENV_PYTHON` and `BOOTSTRAP_SCRIPT` with the paths found during setup.
- `cwd`: the workspace root (directory containing the file)

Do NOT pass the `venv` parameter — the bootstrap handles everything.

## Auto-debug loop

After running, check the output:
1. If the script **fails** (exit code ≠ 0 or error in output):
   - Read the error output carefully
   - Read the source file that caused the error
   - Fix the bug
   - Re-run with the same `run_script` call
   - Repeat until it succeeds or you've tried 3 times
2. If the script **succeeds**, show a short summary of the output.

**IMPORTANT**: Do NOT change `SparkSession.builder.getOrCreate()` to `DatabricksSession`. The bootstrap script handles the session setup. Never modify the Spark session setup unless the user explicitly asks.
