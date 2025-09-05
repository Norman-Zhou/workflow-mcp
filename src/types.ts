// Common types for the spec workflow MCP server

import { SessionManager } from './session-manager.js';

export interface ToolContext {
    projectPath: string;
    sessionManager?: SessionManager; // Optional for accessing session data
}

export interface SpecData {
    name: string;
    description?: string;
    createdAt: string;
    lastModified: string;
    phases: {
        requirements: PhaseStatus;
        design: PhaseStatus;
        tasks: PhaseStatus;
        implementation: PhaseStatus;
    };
    taskProgress?: {
        total: number;
        completed: number;
        pending: number;
    };
}

export interface PhaseStatus {
    exists: boolean;
    approved?: boolean; // Optional for backwards compatibility  
    lastModified?: string;
    content?: string;
}


export interface SteeringStatus {
    exists: boolean;
    documents: {
        product: boolean;
        tech: boolean;
        structure: boolean;
    };
    lastModified?: string;
}

export interface TaskInfo {
    id: string;
    description: string;
    leverage?: string;
    requirements?: string;
    completed: boolean;
    details?: string[];
}

export interface ToolResponse {
    success: boolean;
    message: string;
    data?: any;
    nextSteps?: string[]; // Optional for backwards compatibility
    projectContext?: {
        projectPath: string;
        workflowRoot: string;
        specName?: string;
        currentPhase?: string;
        dashboardUrl?: string; // Optional for backwards compatibility
    };
}

// MCP-compliant response format (matches CallToolResult from MCP SDK)
export interface MCPToolResponse {
    content: Array<{
        type: "text";
        text: string;
    }>;
    isError?: boolean;
    _meta?: Record<string, any>;
}

// Helper function to convert ToolResponse to MCP format
export function toMCPResponse(response: ToolResponse, isError: boolean = false): MCPToolResponse {
    return {
        content: [{
            type: "text",
            text: JSON.stringify(response, null, 2)
        }],
        isError
    };
}