---
name: run-databricks
description: Run a Python script with Databricks Connect using the configured venv
user-invocable: true
---

# Run with Databricks Connect

Run the specified Python file using Databricks Connect, exactly like the "Run current file with Databricks Connect" button.

Use the `run_script` MCP tool with these parameters:
- `command`: `<VENV_PATH>/bin/python <BOOTSTRAP_SCRIPT> <file>`
  Replace `<file>` with the file path from `$ARGUMENTS`.

Paths (fill these in during setup — see SETUP.md):
- VENV_PATH: REPLACE_WITH_YOUR_VENV_PATH
- BOOTSTRAP_SCRIPT: REPLACE_WITH_YOUR_BOOTSTRAP_SCRIPT_PATH

Do NOT pass the `venv` parameter — the bootstrap handles everything.

If the script fails:
1. Read the error output
2. Read the source file
3. Fix the bug
4. Re-run with the same `run_script` call
5. Repeat until it succeeds

**IMPORTANT**: Do NOT change `SparkSession.builder.getOrCreate()` to `DatabricksSession`. The bootstrap script handles the session setup. Never modify the Spark session setup unless the user explicitly asks.
