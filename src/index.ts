import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { homedir } from 'os';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateProjectPath } from './path-utils.js';
import { workflowCreate } from "./tools/workflow-create.js";
import { workflowDefine } from "./tools/workflow-define.js";
import { workflowRun } from "./tools/workflow-run.js";
import { workflowSave } from "./tools/workflow-save.js";


function expandTildePath(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return path.replace('~', homedir());
  }
  return path;
}

// Get version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));


// MCP server
const server = new McpServer({
  name: 'workflow-mcp',
  version: packageJson.version
});

async function registerTools(server: McpServer, projectPath: string) {
  // Validate project path
  await validateProjectPath(projectPath);
  workflowDefine(server);
  workflowCreate(server, projectPath);
  workflowSave(server, projectPath);
  workflowRun(server, projectPath);
}


async function main() {
  try {
    const args = process.argv.slice(2);
    // Default to current working directory if no path provided
    const projectPath = expandTildePath(args[0] || process.cwd());

    // Register tools
    await registerTools(server, projectPath);

    // Connect to stdio transport
    const transport = new StdioServerTransport();

    await server.connect(transport);
    await server.sendLoggingMessage({
      level: "info",
      data: `Workflow MCP Server initialized with project path: ${projectPath}`
    });
    // MCP server initialized successfully

    process.on('SIGINT', () => {
      server.close();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      server.close();
      process.exit(0);
    });
  } catch (error: any) {
    await server.sendLoggingMessage({
      level: "info",
      data: `Error in Workflow MCP Server: ${error.message}`
    });
    process.exit(1);
  }

}

main().catch(() => process.exit(1));
