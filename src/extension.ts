import * as vscode from 'vscode';
import { TerminalCaptureManager } from './terminalCapture';

let captureManager: TerminalCaptureManager | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('claudeTerminal');
  captureManager = new TerminalCaptureManager(config);

  // Status bar
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
}

function updateStatusBar(capturing: boolean) {
  if (!statusBarItem) {
    return;
  }
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
