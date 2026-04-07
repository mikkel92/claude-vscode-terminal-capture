import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';


function resolveLogPath(): string {
  if (process.env.TERMINAL_LOG_PATH) {
    return process.env.TERMINAL_LOG_PATH;
  }
  return path.join(process.cwd(), '.vscode', 'terminal-output.log');
}

function readLog(logPath: string): string {
  try {
    return fs.readFileSync(logPath, 'utf-8');
  } catch {
    return '';
  }
}

interface ParsedBlock {
  terminal: string;
  timestamp: string;
  command: string;
  output: string;
}

function parseBlocks(raw: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const parts = raw.split(/\n=== Terminal: "([^"]*)" \| ([^\n=]+) ===/);

  for (let i = 1; i + 2 < parts.length; i += 3) {
    const terminal = parts[i];
    const timestamp = parts[i + 1].trim();
    const content = parts[i + 2];
    const lines = content.split('\n');

    let command = '';
    let outputStart = 0;
    for (let j = 0; j < lines.length; j++) {
      if (lines[j].startsWith('$ ')) {
        command = lines[j].substring(2);
        outputStart = j + 1;
        break;
      }
    }

    const output = lines.slice(outputStart).join('\n').trim();
    blocks.push({ terminal, timestamp, command, output });
  }

  return blocks;
}

const ERROR_PATTERNS = [
  /error/i, /exception/i, /traceback/i, /failed/i, /fatal/i, /panic/i,
  /segfault/i, /ENOENT/, /EACCES/, /ECONNREFUSED/, /SyntaxError/,
  /TypeError/, /ReferenceError/, /ModuleNotFoundError/, /ImportError/,
  /exit code [1-9]/i, /command not found/,
];

function hasError(block: ParsedBlock): boolean {
  return ERROR_PATTERNS.some((p) => p.test(block.output) || p.test(block.command));
}

async function main() {
  const logPath = resolveLogPath();

  const server = new McpServer({
    name: 'claude-terminal-capture',
    version: '0.0.1',
  });

  server.tool(
    'get_terminal_output',
    'Get recent terminal output captured from VS Code. Returns the last N command executions with their output.',
    { count: z.number().optional().describe('Number of recent commands to return (default 10)') },
    async ({ count }) => {
      const raw = readLog(logPath);
      if (!raw) {
        return { content: [{ type: 'text' as const, text: 'No terminal output captured yet. Make sure the Claude Terminal Capture extension is running in VS Code.' }] };
      }
      const blocks = parseBlocks(raw);
      const recent = blocks.slice(-(count ?? 10));
      const text = recent
        .map((b) => `[${b.timestamp}] Terminal: "${b.terminal}"\n$ ${b.command}\n${b.output}`)
        .join('\n\n---\n\n');
      return { content: [{ type: 'text' as const, text: text || 'No commands found in log.' }] };
    }
  );

  server.tool(
    'get_terminal_errors',
    'Get recent terminal commands that produced errors. Use this to diagnose crashed scripts or failed commands.',
    { count: z.number().optional().describe('Number of recent errors to return (default 5)') },
    async ({ count }) => {
      const raw = readLog(logPath);
      if (!raw) {
        return { content: [{ type: 'text' as const, text: 'No terminal output captured yet.' }] };
      }
      const errors = parseBlocks(raw).filter(hasError);
      const recent = errors.slice(-(count ?? 5));
      if (recent.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No errors found in recent terminal output.' }] };
      }
      const text = recent
        .map((b) => `[${b.timestamp}] Terminal: "${b.terminal}"\n$ ${b.command}\n${b.output}`)
        .join('\n\n---\n\n');
      return { content: [{ type: 'text' as const, text }] };
    }
  );

  server.tool(
    'search_terminal_output',
    'Search terminal output for a specific pattern (case-insensitive). Useful for finding specific errors or output.',
    { query: z.string().describe('Text to search for in terminal output') },
    async ({ query }) => {
      const raw = readLog(logPath);
      if (!raw) {
        return { content: [{ type: 'text' as const, text: 'No terminal output captured yet.' }] };
      }
      const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const matches = parseBlocks(raw).filter((b) => pattern.test(b.output) || pattern.test(b.command));
      if (matches.length === 0) {
        return { content: [{ type: 'text' as const, text: `No matches found for "${query}".` }] };
      }
      const text = matches
        .slice(-10)
        .map((b) => `[${b.timestamp}] Terminal: "${b.terminal}"\n$ ${b.command}\n${b.output}`)
        .join('\n\n---\n\n');
      return { content: [{ type: 'text' as const, text }] };
    }
  );

  server.tool(
    'run_script',
    'Run a script in the VS Code terminal and return its output. The script runs in a visible terminal tab. If the script fails, read the source file and fix the bug, then run again.',
    {
      command: z.string().describe('The command to run (e.g. "python test_script.py", "node app.js")'),
      cwd: z.string().optional().describe('Working directory (defaults to current workspace)'),
      venv: z.string().optional().describe('Absolute path to a Python venv to activate before running'),
      env: z.record(z.string(), z.string()).optional().describe('Extra environment variables to set before running'),
    },
    async ({ command, cwd: workDir, venv, env: extraEnv }) => {
      const runDir = workDir || process.cwd();
      const requestFile = path.join(runDir, '.vscode', 'mcp-command-request.json');
      const responseFile = path.join(runDir, '.vscode', 'mcp-command-response.json');

      const vscodeDir = path.join(runDir, '.vscode');
      if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir, { recursive: true });
      }

      if (fs.existsSync(responseFile)) { fs.unlinkSync(responseFile); }

      fs.writeFileSync(requestFile, JSON.stringify({
        command: 'run_in_terminal',
        shellCommand: command,
        cwd: runDir,
        venv,
        env: extraEnv,
      }));

      for (let i = 0; i < 240; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (fs.existsSync(responseFile)) {
          const raw = fs.readFileSync(responseFile, 'utf-8');
          fs.unlinkSync(responseFile);
          const response = JSON.parse(raw);
          return {
            content: [{ type: 'text' as const, text: response.output || 'No output.' }],
            isError: response.exitCode !== 0,
          };
        }
      }

      return {
        content: [{ type: 'text' as const, text: 'Timeout waiting for script to finish (120s). Check the VS Code terminal for output.' }],
        isError: true,
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
