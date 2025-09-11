import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { writeFile } from "fs/promises";
import { z } from "zod";

export function workflowSave(server: McpServer, projectPath: string) {
    server.tool(
        "workflow-save",
        "Saves a workflow definition to the project directory.",
        {
            name: z.string().describe("Name of the workflow, user defined in kebab-case, string only."),
            content: z.string().describe("Workflow execution flow in Json format."),
        },
        async ({ name, content }, extra): Promise<CallToolResult> => {
            const fileName = projectPath + '/.workflow/' + name + '.md';
            await server.sendLoggingMessage({
                level: "info",
                data: `Saving workflow '${name}' to ${fileName}`
            }, extra.sessionId);
            await writeFile(fileName, content, { encoding: 'utf8' });
            return {
                content: [
                    {
                        type: "text",
                        text: `Workflow '${name}' saved successfully.`,
                    },
                ],
            };
        }
    )
}