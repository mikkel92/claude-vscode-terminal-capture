# Setup Guide

## Prerequisites

- VS Code with the [Databricks extension](https://marketplace.visualstudio.com/items?itemName=databricks.databricks) installed and configured
- A Python venv with `databricks-connect` and `pyspark` installed
- [Claude Code](https://claude.ai/code) installed (CLI or VS Code extension)
- Node.js (for building the extension and MCP server)

## 1. Build the extension

```bash
npm install
npm run compile
```

## 2. Install the VS Code extension

```bash
# Package the extension
npx vsce package

# Install it (adjust the path to your VS Code CLI)
code --install-extension claude-terminal-capture-0.0.1.vsix
```

Reload VS Code after installing.

## 3. Configure local paths

Copy the example config:

```bash
cp .claude/config.local.json.example .claude/config.local.json
```

Edit `.claude/config.local.json` with your paths:

```json
{
  "venvPath": "/path/to/your/databricks-connect/.venv",
  "bootstrapScript": "/path/to/.vscode/extensions/databricks.databricks-<version>/resources/python/dbconnect-bootstrap.py"
}
```

**Finding the bootstrap script path:**
```bash
ls ~/.vscode/extensions/databricks.databricks-*/resources/python/dbconnect-bootstrap.py
```

**Finding your venv path:**  
Use the venv where you installed `databricks-connect`. This is typically the Python environment selected in your Databricks-connected VS Code workspace.

## 4. Register the MCP server with Claude Code

```bash
claude mcp add --transport stdio claude-terminal-capture -- node $(pwd)/out-mcp/mcpServer.js
```

## 5. Verify

Start a new Claude Code session in this project and type:

```
/run-databricks test_script.py
```

Claude will run the script using Databricks Connect, see the output in the VS Code terminal, and auto-debug any errors.

## How it works

1. **VS Code extension** captures terminal output using the Shell Integration API and writes it to `.vscode/terminal-output.log`
2. **MCP server** exposes tools (`get_terminal_output`, `get_terminal_errors`, `search_terminal_output`, `run_script`) that Claude Code can call
3. **`run_script`** sends a command to the VS Code extension via file-based IPC, which opens a terminal and runs it — output is captured and returned to Claude
4. **`/run-databricks` skill** tells Claude to use the Databricks Connect bootstrap script with your configured venv, then auto-fix any errors
