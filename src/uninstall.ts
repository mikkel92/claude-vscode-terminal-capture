import { execFile } from 'child_process';

// Runs when the extension is uninstalled via VS Code
// Removes the MCP server registration from Claude Code
const MCP_NAME = 'claude-terminal-capture';

execFile('claude', ['mcp', 'remove', MCP_NAME], { timeout: 10000 }, (error) => {
  if (error) {
    // Best effort — CLI might not be available
    console.log(`Could not remove MCP registration: ${error.message}`);
  } else {
    console.log('Claude Terminal Capture: MCP server unregistered from Claude Code.');
  }
});
