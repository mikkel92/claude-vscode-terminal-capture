---
description: Run a Python script with Databricks Connect using the ml_model venv
user-invocable: true
---

# Run with Databricks Connect

Run the specified Python file using Databricks Connect, exactly like the "Run current file with Databricks Connect" button.

Use the `run_script` MCP tool with these parameters:
- `command`: The venv python + bootstrap script + the user's file:
  ```
  /Users/mikkeljensen/Desktop/code/proprty.ai/claude_code/git_folders/ml_model/.venv/bin/python /Users/mikkeljensen/.vscode/extensions/databricks.databricks-2.10.6-darwin-arm64/resources/python/dbconnect-bootstrap.py <file>
  ```
  Replace `<file>` with the file path from `$ARGUMENTS`.

Do NOT pass the `venv` parameter — the bootstrap handles everything.

If the script fails:
1. Read the error output
2. Read the source file
3. Fix the bug
4. Re-run with the same `run_script` call
5. Repeat until it succeeds

**IMPORTANT**: Do NOT change `SparkSession.builder.getOrCreate()` to `DatabricksSession`. The bootstrap script handles the session setup.
