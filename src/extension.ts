import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TerminalCaptureManager } from './terminalCapture';
import { ensureMcpRegistered } from './mcpRegistration';

let captureManager: TerminalCaptureManager | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('claudeTerminal');
  captureManager = new TerminalCaptureManager(config);

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  updateStatusBar(false);
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeTerminal.startCapture', () => {
      captureManager?.start();
      updateStatusBar(true);
      vscode.window.showInformationMessage('Terminal capture started');
    }),
    vscode.commands.registerCommand('claudeTerminal.stopCapture', () => {
      captureManager?.stop();
      updateStatusBar(false);
      vscode.window.showInformationMessage('Terminal capture stopped');
    }),
    vscode.commands.registerCommand('claudeTerminal.clearLog', () => {
      captureManager?.clearLog();
      vscode.window.showInformationMessage('Terminal log cleared');
    })
  );

  if (config.get<boolean>('captureOnStartup', true)) {
    captureManager.start();
    updateStatusBar(true);
  }

  startCommandWatcher(context);
  ensureMcpRegistered(context.extensionPath);
}

function startCommandWatcher(context: vscode.ExtensionContext) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) { return; }

  // Use a fixed shared location for IPC so MCP server and extension always agree
  const ipcDir = path.join(process.env.HOME || '/tmp', '.claude-terminal-capture');
  if (!fs.existsSync(ipcDir)) { fs.mkdirSync(ipcDir, { recursive: true }); }

  const requestFile = path.join(ipcDir, 'mcp-command-request.json');
  const responseFile = path.join(ipcDir, 'mcp-command-response.json');
  const logFile = path.join(workspaceFolder, '.vscode', 'terminal-output.log');

  let processing = false;

  const interval = setInterval(async () => {
    if (!fs.existsSync(requestFile)) { return; }
    if (processing) { return; }
    processing = true;

    try {
      const raw = fs.readFileSync(requestFile, 'utf-8');
      fs.unlinkSync(requestFile);
      const request = JSON.parse(raw);

      if (request.command === 'run_in_terminal') {
        const { shellCommand, cwd: runDir, venv, env: extraEnv } = request;

        // Build env var exports if provided
        const envExports = extraEnv
          ? Object.entries(extraEnv as Record<string, string>).map(([k, v]) => `export ${k}="${v}"`).join(' && ') + ' && '
          : '';

        const fullCommand = venv
          ? `source "${venv}/bin/activate" && ${envExports}cd "${runDir}" && ${shellCommand}`
          : `${envExports}cd "${runDir}" && ${shellCommand}`;

        // Reuse existing "Run Script" terminal or create one
        let terminal = vscode.window.terminals.find(t => t.name === 'Run Script');
        if (!terminal) {
          terminal = vscode.window.createTerminal({
            name: 'Run Script',
            cwd: runDir,
          });
        }
        terminal.show();

        const disposable = vscode.window.onDidEndTerminalShellExecution((e) => {
          if (e.terminal === terminal) {
            disposable.dispose();

            const logContent = fs.existsSync(logFile)
              ? fs.readFileSync(logFile, 'utf-8')
              : '';
            const blocks = logContent.split(/\n=== Terminal:/);
            const lastBlock = blocks.length > 1 ? '=== Terminal:' + blocks[blocks.length - 1] : '';

            fs.writeFileSync(responseFile, JSON.stringify({
              output: lastBlock || 'Command completed. Check the terminal for output.',
              exitCode: e.exitCode ?? 0,
            }));
            processing = false;
          }
        });

        terminal.sendText(fullCommand);

        setTimeout(() => {
          if (processing) {
            disposable.dispose();
            fs.writeFileSync(responseFile, JSON.stringify({
              output: 'Command may still be running. Check the VS Code terminal.',
              exitCode: -1,
            }));
            processing = false;
          }
        }, 110000);

      } else if (request.command === 'databricks_connect_run') {
        // Open the file so it's the active editor, then trigger the Databricks extension
        const filePath = request.filePath;
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);

        // Listen for terminal execution to complete (Databricks extension opens a terminal)
        const disposable = vscode.window.onDidEndTerminalShellExecution((e) => {
          disposable.dispose();

          const logContent = fs.existsSync(logFile)
            ? fs.readFileSync(logFile, 'utf-8')
            : '';
          const blocks = logContent.split(/\n=== Terminal:/);
          const lastBlock = blocks.length > 1 ? '=== Terminal:' + blocks[blocks.length - 1] : '';

          fs.writeFileSync(responseFile, JSON.stringify({
            output: lastBlock || 'Command completed. Check the terminal for output.',
            exitCode: e.exitCode ?? 0,
          }));
          processing = false;
        });

        await vscode.commands.executeCommand('databricks.run.dbconnect.run');

        // Ensure the terminal panel is visible
        await vscode.commands.executeCommand('workbench.action.terminal.focus');

        setTimeout(() => {
          if (processing) {
            disposable.dispose();
            fs.writeFileSync(responseFile, JSON.stringify({
              output: 'Databricks Connect run timed out. Check the VS Code terminal.',
              exitCode: -1,
            }));
            processing = false;
          }
        }, 300000); // 5 min timeout for Databricks runs
      }
    } catch (err) {
      fs.writeFileSync(responseFile, JSON.stringify({
        output: `Error: ${err}`,
        exitCode: 1,
      }));
      processing = false;
    }
  }, 500);

  context.subscriptions.push({ dispose: () => clearInterval(interval) });
}

function updateStatusBar(capturing: boolean) {
  if (!statusBarItem) { return; }
  if (capturing) {
    statusBarItem.text = '$(terminal) Capturing';
    statusBarItem.tooltip = 'Claude Terminal Capture: Active (click to stop)';
    statusBarItem.command = 'claudeTerminal.stopCapture';
  } else {
    statusBarItem.text = '$(terminal) Capture Off';
    statusBarItem.tooltip = 'Claude Terminal Capture: Inactive (click to start)';
    statusBarItem.command = 'claudeTerminal.startCapture';
  }
  statusBarItem.show();
}

export function deactivate() {
  captureManager?.stop();
}
