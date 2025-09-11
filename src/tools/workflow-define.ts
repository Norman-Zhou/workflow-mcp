import { server } from '../server.js';
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export function workflowDefine() {
    server.tool(
        'workflow-define',
        'Provides definitions for creating a workflow',
        {},
        async ({ }): Promise<CallToolResult> => {
            return {
                content: [
                    {
                        type: "text",
                        text: `# Workflow

## Overview

A Workflow is a series of steps that are executed in order.
Workflow must have a name using kebab-case (e.g., user-authentication), so that Workflow can be referenced as a step in other Workflows.
Workflow must have at least one step.
Each step must define inputs and.
Each step must include a description that explains how the step transforms its inputs into its outputs.
The Final step's outputs are the outputs of the Workflow.
Inputs and Outputs of a Step must be a valid json format.

Each step can be a single prompt or a MCP tool or a sub-workflow.
Steps can only use at most ONE MCP tool, keep the Step Simple.
Workflow can be nested, but a Workflow CANNOT call itself recursively.

## Inputs/Outpus Definition
Inputs/Outpus are key-value pairs, where key is the name, value is the type.
Input/Output types are defined as follows:
- string
- number
- boolean
- object
- array

## Workflow Definition
Workflow definition is a json file, which contains the following fields:
- name: string, required, kebab-case, (e.g. 'user-authentication').
- desc: string, required, a brief description of the workflow process.
- steps: array, required, at least one step.
- inputs: object, required, must match the inputs of the first step
- outputs: object, required, must match the outputs of the final step

### Step Definition
Each step is a json object, different step types have different fields.

#### Prompt Step
Prompt step takes a prompt template, replace the placeholders with the input values, and use the MCP tool 'workflow-run-step' to return the result.
- type: string, 'prompt'
- template: string, the prompt template, must contain placeholders in the format {{placeholder}} , and explain how to generate its outputs.
- inputs: object, required, must match the placeholders in the prompt template.
- outputs: object, required, must match the outputs defined in the prompt template.

#### MCP Step
MCP step uses a MCP tool to process the inputs and return the outputs.
- type: string, 'mcp'
- tool: string, required, must be a valid MCP tool name
- inputs: object, required, must match the inputs of the MCP tool
- outputs: object, required, must match the outputs of the MCP tool

#### Workflow Step
Workflow step is a sub-Workflow, which uses another Workflow.
- workflow: string, required, kebab-case, must be a valid Workflow name, use the MCP tool 'workflow-valid' to check the validation.
- inputs: object, required, must match the inputs of the specified Workflow.
- outputs: object, required, must match the outputs of the specified Workflow.


## Workflow Example
Here is am example of Workflow: First it extends the keyword into 5 related topics, search the web, and summarize into a list of points or opinions.
\`\`\`
{
    "name": "workflow-demo",
    "desc": "An example of query related topics, search the web, and summarize the results.",
    "inputs": {
        "query": "string"
    },
    "outputs": {
        "text": "string"
    },
    "steps": [
        {
            "type": "prompt",
            "template": "Please find 5 queries related to {{query}} as the outputs.",
            "inputs": {
                "query": "string"
            },
            "outputs": {
                "query": "string"
            }
        },
        {
            "type": "mcp",
            "tool": "web-search",
            "inputs": {
                "query": "string"
            },
            "outputs": {
                "text": "string"
            }
        },
        {
            "type": "prompt",
            "template": "Please sumarize the results of {{text}} and return a list of key points or opinions.",
            "inputs": {
                "text": "string"
            },
            "outputs": {
                "text": "string"
            }
        }
    ]
}\`\`\`
`,
                    },
                ],
            };;
        }
    );
}