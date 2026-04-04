import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { stripAnsi } from './ansiStrip';

export class TerminalCaptureManager {
  private disposables: vscode.Disposable[] = [];
  private outputPath: string;
  private maxFileSizeBytes: number;

  constructor(private config: vscode.WorkspaceConfiguration) {
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
  }

  private truncateIfNeeded(): void {
    try {
      const stat = fs.statSync(this.outputPath);
      if (stat.size > this.maxFileSizeBytes) {
        const content = fs.readFileSync(this.outputPath, 'utf-8');
        // Keep the last 75% of content
        const keepFrom = Math.floor(content.length * 0.25);
        const truncated = content.substring(keepFrom);
        // Find the first section header to make a clean cut
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
