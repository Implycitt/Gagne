import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod";

import { createMemoryStore } from "../core/store.ts";

const store = createMemoryStore();

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

    return server;
}

void serveStdio(createServer);
