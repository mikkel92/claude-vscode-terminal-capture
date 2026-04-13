# Claude Terminal Capture

A VS Code extension that captures terminal output and exposes it to Claude Code via MCP. This lets Claude read terminal output, detect errors, and auto-debug failing scripts.

## Prerequisites

- [VS Code](https://code.visualstudio.com/) 1.93+
- [Claude Code](https://claude.ai/code) CLI installed and on PATH
- Node.js 18+

For Databricks Connect support:
- [Databricks VS Code extension](https://marketplace.visualstudio.com/items?itemName=databricks.databricks) installed and configured
- A Python venv with `databricks-connect` installed

## Install

```bash
git clone <this-repo>
cd claude-terminal-capture
npm install
npm run compile
```

Then install the extension in VS Code:
1. Open this folder in VS Code
2. Press `F5` to launch an Extension Development Host

The extension auto-registers itself as an MCP server with Claude Code on activation.

## Setup

Open Claude Code and ask it to set up the `/run-databricks` skill:

```
Set up the /run-databricks skill for my machine. Find my Databricks Connect
venv and the bootstrap script, then configure the global skill.
```

Claude will find the paths, create `~/.claude/skills/run-databricks/SKILL.md` with your local paths filled in, and you're done.

### Manual setup

If you prefer to configure it yourself:

1. **Find your Databricks Connect venv Python** — the Python binary inside the venv where `databricks-connect` is installed:
   ```bash
   ls /path/to/your/project/.venv/bin/python
   ```

2. **Find the bootstrap script** — shipped with the Databricks VS Code extension:
   ```bash
   ls ~/.vscode/extensions/databricks.databricks-*/resources/python/dbconnect-bootstrap.py
   ```

3. **Configure the global skill**:
   ```bash
   mkdir -p ~/.claude/skills/run-databricks
   cp .claude/skills/run-databricks/SKILL.md ~/.claude/skills/run-databricks/SKILL.md
   ```
   Edit `~/.claude/skills/run-databricks/SKILL.md` and replace:
   - `VENV_PYTHON` → full path to your venv's Python binary
   - `BOOTSTRAP_SCRIPT` → full path to the bootstrap script

## Usage

### Terminal capture

Terminal capture starts automatically. Use the status bar item or commands:
- `Claude Terminal: Start Capture`
- `Claude Terminal: Stop Capture`
- `Claude Terminal: Clear Log`

### Running scripts

Ask Claude Code to run a script:
```
run test_script.py
```

Claude will use `run_script` to execute it in a visible VS Code terminal, read the output, and auto-debug if it fails.

### Databricks Connect

After setup, use the skill:
```
/run-databricks my_spark_script.py
```

Claude will run it with Databricks Connect, show output in the VS Code terminal, and auto-debug errors.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `claudeTerminal.outputPath` | `.vscode/terminal-output.log` | Log file path (relative to workspace) |
| `claudeTerminal.maxFileSizeKB` | `512` | Max log size before truncation |
| `claudeTerminal.captureOnStartup` | `true` | Auto-start capture on activation |
