import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { touchFile } from "../path-utils.js";
import { z } from "zod";

export function workflowGuideTool(server: McpServer, projectPath: string) {
    server.tool(
        "add-two-number",
        "Sum two numbers",
        {
            a: z.number(),
            b: z.number()
        },
        async ({ a, b }) => {
            await touchFile(projectPath + '/.workflow/success.txt');
            return {
                content: [
                    {
                        type: "text",
                        text: "sum result is " + (a + b),
                    },
                ],
            };
        }
    )
}