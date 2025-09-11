import { server } from '../server.js';
import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { readFile } from "fs/promises";
import { z } from "zod";

export function workflowRun(projectPath: string) {
    server.prompt(
        "workflow-run",
        "Run a step in a workflow. Tip: Use this tool recursively to run all steps in a workflow.",
        {
            name: z.string().describe("Name of the workflow."),
            step: z.string().optional().describe("Step number to run. Default to 1."),
            inputs: z.any().describe("Inputs of the step."),
        },
        async ({ name, step, inputs }): Promise<GetPromptResult> => {
            const fileName = projectPath + '/.workflow/' + name + '.md';
            const content = await readFile(fileName, { encoding: 'utf8' });
            const obj = JSON.parse(content);

            // default to step 1
            if (!step) {
                step = '1';
            }

            // error handling
            if (Number(step) < 1) {
                return {
                    messages: [
                        {
                            role: 'assistant',
                            content: {
                                type: 'text',
                                text: `Error: Step number must be greater than 0.`,
                            },
                        },
                    ],
                };
            }


            // ending condition
            if (Number(step) > obj.steps.length) {
                return {
                    messages: [
                        {
                            role: 'assistant',
                            content: {
                                type: 'text',
                                text: `Workflow '${name}' run successfully. All ${obj.steps.length} steps have been completed. Final outputs are: ${JSON.stringify(inputs)}`,
                            },
                        },
                    ],
                };
            }

            const step_obj = obj.steps[Number(step) - 1];

            let prompt: string = `Running step ${step} in workflow ${name}:

Step definition: \`\`\`${JSON.stringify(step_obj)}\`\`\`


`;

            if (step_obj.type === 'prompt') {
                prompt = step_obj.template;
                for (const [key, value] of Object.entries(inputs)) {
                    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
                    prompt = prompt.replace(regex, String(value));
                }
            } else if (step_obj.type === 'mcp') {
                const toolName = step_obj.tool;
                prompt = `Use the MCP tool '${toolName}' to process the following inputs and generate the outputs as defined.\n\nInputs:\n`;
                for (const [key, value] of Object.entries(inputs)) {
                    prompt += `- ${key}: ${value}\n`;
                }
                prompt += `\nMake sure to follow the output format as specified in the step definition.\n`;
            } else if (step_obj.type === 'workflow') {
                // not supported yet
                return {
                    messages: [
                        {
                            role: 'assistant',
                            content: {
                                type: 'text',
                                text: `Error: Nested workflows are not supported in this version.`,
                            },
                        },
                    ],
                };
            }

            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: prompt + `

Finally, Invoke the MCP tool /workflow-run-step with the following inputs:
- name: ${name}
- step: ${Number(step) + 1}
- inputs: (the outputs of this step, in json format)

Make sure to strictly follow the instructions and the output format.`,
                        },
                    },
                ],
            };
        }
    )
}