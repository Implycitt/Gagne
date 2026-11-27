import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod";

import { mcpReadFile, mcpWriteFile } from "../capabilities/fs.ts";
import { createMemoryStore } from "../core/store.ts";

const store = createMemoryStore();

function fail(text: string): CallToolResult {
    return {
        content: [
            {
                type: "text" as const,
                text
            }
        ],
        isError: true
    };
}

function createServer(): McpServer {
    const server = new McpServer({ name: "gagne", version: "1.0" });

    server.registerTool(
        "start",
        {
            title: "Start a run",
            description: "Starts and queues a run. Returns the full run record.",
            inputSchema: z.object({
                brief: z.string().min(1).describe("product brief"),
                projectDir: z.string().min(1).describe("Directory the run has access to for read and write operations"),
                budgetMinutes: z.number().int().positive().max(480).default(60)
            })
        },
        async ({ brief, projectDir, budgetMinutes }) => {
            const run = await store.create({ brief, projectDir, budgetMinutes });
            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(run, null, 2)
                    }
                ]
            };
        }
    );

    server.registerTool(
        "status",
        {
            title: "Get run status",
            description: "Return a run id or error",
            inputSchema: z.object({ id: z.string().min(1) })
        },
        async ({ id }) => {
            const run = await store.get(id);
            if (!run) {
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: `No run with id ${id}`
                        }
                    ],
                    isError: true
                };
            }
            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(run, null, 2)
                    }
                ]
            };
        }
    );

    server.registerTool(
        "Write",
        {
            title: "Write to a file",
            description: "Write to a file",
            inputSchema: z.object({
                path: z.string().min(1).describe("absolute path"),
                text: z.string().describe("text to write")
            })
        },

        async ({ path, text }) => {
            try {
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: `wrote ${await mcpWriteFile(path, text)} bytes to ${path}`
                        }
                    ]
                };
            } catch (err) {
                return fail(err instanceof Error ? err.message : String(err));
            }
        }
    );

    server.registerTool(
        "Read",
        {
            title: "Read a file",
            description: "Read a file",
            inputSchema: z.object({
                path: z.string().min(1).describe("absolute path")
            })
        },

        async ({ path }) => {
            try {
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: await mcpReadFile(path)
                        }
                    ]
                };
            } catch (err) {
                return fail(err instanceof Error ? err.message : String(err));
            }
        }
    );

    return server;
}

void serveStdio(createServer);
