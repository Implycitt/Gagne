import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod";

import { capabilities } from "../capabilities/index.ts";
import { errorText } from "../core/errors.ts";
import { createMemoryStore } from "../core/store.ts";
import { executeRun } from "../engine/run.ts";

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
            description:
                "Starts a run and returns its record immediately. The run advances through its phases in the background. Use status to follow.",
            inputSchema: z.object({
                brief: z.string().min(1).describe("product brief"),
                projectDir: z.string().min(1).describe("Directory the run has access to for read and write operations"),
                budgetMinutes: z.number().int().positive().max(480).default(60)
            })
        },
        async ({ brief, projectDir, budgetMinutes }) => {
            const run = await store.create({ brief, projectDir, budgetMinutes });
            void executeRun(run, store);
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
            title: "run status",
            description:
                "Returns a full run record by id (status, current phase, and the note) or error if there is no id",
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

    for (const capability of capabilities) {
        server.registerTool(
            capability.name,
            {
                description: capability.description,
                inputSchema: capability.schema
            },
            async args => {
                try {
                    return {
                        content: [
                            {
                                type: "text" as const,
                                text: await capability.run(args)
                            }
                        ]
                    };
                } catch (err) {
                    return fail(errorText(err));
                }
            }
        );
    }

    return server;
}

void serveStdio(createServer);
