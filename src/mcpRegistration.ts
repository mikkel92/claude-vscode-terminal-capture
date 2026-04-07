import * as vscode from 'vscode';
import { execFile } from 'child_process';
import * as path from 'path';

const MCP_NAME = 'claude-terminal-capture';

function findClaudeCli(): string {
  // Claude Code CLI is typically just "claude" on PATH
  return 'claude';
}

function getMcpServerPath(extensionPath: string): string {
  return path.join(extensionPath, 'out-mcp', 'mcpServer.js');
}

function exec(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export async function ensureMcpRegistered(extensionPath: string): Promise<void> {
  const cli = findClaudeCli();
  const serverPath = getMcpServerPath(extensionPath);

  try {
    // Check if already registered by listing MCP servers
    const { stdout } = await exec(cli, ['mcp', 'list']);
    if (stdout.includes(MCP_NAME)) {
      // Already registered — update in case the path changed (e.g. extension updated)
      try {
        await exec(cli, ['mcp', 'remove', MCP_NAME]);
      } catch {
        // ignore removal failure
      }
    }
  } catch {
    // claude CLI not found or mcp list failed — show a helpful message
    vscode.window.showWarningMessage(
      'Claude Terminal Capture: Could not find the "claude" CLI. Install Claude Code to enable auto-debug via MCP.'
    );
    return;
  }

  try {
    await exec(cli, [
      'mcp', 'add',
      '--transport', 'stdio',
      MCP_NAME,
      '--',
      'node', serverPath,
    ]);
    vscode.window.showInformationMessage(
      'Claude Terminal Capture: MCP server registered with Claude Code.'
    );
  } catch (err) {
    vscode.window.showWarningMessage(
      `Claude Terminal Capture: Failed to register MCP server — ${err}`
    );
  }
}

