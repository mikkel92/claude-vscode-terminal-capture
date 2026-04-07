---
description: Run a Python script with Databricks Connect using the configured venv
user-invocable: true
---

# Run with Databricks Connect

Run the specified Python file using Databricks Connect, exactly like the "Run current file with Databricks Connect" button.

## Steps

1. First, read `.claude/config.local.json` to get `venvPath` and `bootstrapScript`.
   If it doesn't exist, tell the user to copy `config.local.json.example` and fill in their paths (see SETUP.md).

2. Use the `run_script` MCP tool with these parameters:
   - `command`: `<venvPath>/bin/python <bootstrapScript> <file>`
     Replace `<file>` with the file path from `$ARGUMENTS`.

   Do NOT pass the `venv` parameter — the bootstrap handles everything.

3. If the script fails:
   1. Read the error output
   2. Read the source file
   3. Fix the bug
   4. Re-run with the same `run_script` call
   5. Repeat until it succeeds

**IMPORTANT**: Do NOT change `SparkSession.builder.getOrCreate()` to `DatabricksSession`. The bootstrap script handles the session setup. Never modify the Spark session setup unless the user explicitly asks.
