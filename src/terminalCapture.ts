import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { stripAnsi } from './ansiStrip';

const ERROR_PATTERNS = [
  /error/i,
  /exception/i,
  /traceback/i,
  /failed/i,
  /fatal/i,
  /panic/i,
  /segfault/i,
  /ENOENT/,
  /EACCES/,
  /ECONNREFUSED/,
  /SyntaxError/,
  /TypeError/,
  /ReferenceError/,
  /ModuleNotFoundError/,
  /ImportError/,
  /exit code [1-9]/i,
  /command not found/,
];

export class TerminalCaptureManager {
  private disposables: vscode.Disposable[] = [];
  private outputPath: string;
  private maxFileSizeBytes: number;
  private lastErrorPromptTime = 0;
  private static ERROR_COOLDOWN_MS = 10000; // Don't spam — 10s between prompts

  constructor(config: vscode.WorkspaceConfiguration) {
    const relativePath = config.get<string>('outputPath', '.vscode/terminal-output.log');
    const maxKB = config.get<number>('maxFileSizeKB', 512);
    this.maxFileSizeBytes = maxKB * 1024;

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      this.outputPath = path.join(workspaceFolder.uri.fsPath, relativePath);
    } else {
      this.outputPath = path.join(process.env.HOME || '/tmp', '.claude-terminal-output.log');
    }
  }

  start(): void {
    if (this.disposables.length > 0) {
      return; // already capturing
    }

    // Ensure output directory exists
    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Listen for command executions starting
    this.disposables.push(
      vscode.window.onDidStartTerminalShellExecution((e) => {
        this.captureExecution(e.terminal, e.execution);
      })
    );
  }

  stop(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }

  clearLog(): void {
    try {
      fs.writeFileSync(this.outputPath, '');
    } catch {
      // file may not exist yet
    }
  }

  private async captureExecution(
    terminal: vscode.Terminal,
    execution: vscode.TerminalShellExecution
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const commandLine = execution.commandLine.value;
    let output = '';

    const stream = execution.read();
    for await (const chunk of stream) {
      output += chunk;
    }

    const cleaned = stripAnsi(output)
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    if (cleaned.trim().length === 0 && !commandLine) {
      return;
    }

    const entry =
      `\n=== Terminal: "${terminal.name}" | ${timestamp} ===\n` +
      `$ ${commandLine}\n` +
      cleaned;

    try {
      fs.appendFileSync(this.outputPath, entry);
      this.truncateIfNeeded();
    } catch (err) {
      console.error('Claude Terminal Capture: failed to write log', err);
    }

    // Check for errors and offer to fix
    if (this.hasError(cleaned)) {
      this.promptAutoFix(commandLine, terminal);
    }
  }

  private hasError(output: string): boolean {
    return ERROR_PATTERNS.some((p) => p.test(output));
  }

  private promptAutoFix(commandLine: string, sourceTerminal: vscode.Terminal): void {
    const now = Date.now();
    if (now - this.lastErrorPromptTime < TerminalCaptureManager.ERROR_COOLDOWN_MS) {
      return;
    }
    this.lastErrorPromptTime = now;

    vscode.window
      .showWarningMessage(
        `Error detected in terminal: \`${commandLine}\``,
        'Fix with Claude Code',
        'Dismiss'
      )
      .then((choice) => {
        if (choice === 'Fix with Claude Code') {
          this.sendToClaudeCode(commandLine, sourceTerminal);
        }
      });
  }

  private sendToClaudeCode(commandLine: string, sourceTerminal: vscode.Terminal): void {
    // Find an existing terminal running Claude Code
    const claudeTerminal = vscode.window.terminals.find(
      (t) => t.name.toLowerCase().includes('claude') && t !== sourceTerminal
    );

    const message =
      `The command \`${commandLine}\` just failed in my terminal. ` +
      `Use the get_terminal_errors MCP tool to see the full error output, ` +
      `then read the relevant source files and fix the issue.`;

    if (claudeTerminal) {
      claudeTerminal.show();
      claudeTerminal.sendText(message);
    } else {
      // No Claude terminal found — open one
      const newTerminal = vscode.window.createTerminal('Claude Code');
      newTerminal.show();
      newTerminal.sendText(`claude "${message.replace(/"/g, '\\"')}"`);
    }
  }

  private truncateIfNeeded(): void {
    try {
      const stat = fs.statSync(this.outputPath);
      if (stat.size > this.maxFileSizeBytes) {
        const content = fs.readFileSync(this.outputPath, 'utf-8');
        const keepFrom = Math.floor(content.length * 0.25);
        const truncated = content.substring(keepFrom);
        const headerIndex = truncated.indexOf('\n=== Terminal:');
        const cleanContent =
          headerIndex >= 0
            ? truncated.substring(headerIndex)
            : truncated;
        fs.writeFileSync(this.outputPath, '[...truncated...]\n' + cleanContent);
      }
    } catch {
      // ignore
    }
  }
}
