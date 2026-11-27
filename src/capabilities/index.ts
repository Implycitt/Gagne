import * as z from "zod";

import { mcpReadFile, mcpWriteFile } from "./fs.ts";

export type Capability = {
    name: string;
    description: string;
    schema: z.ZodObject<z.ZodRawShape>;
    run: (args: any) => Promise<string>;
};

export const capabilities: Capability[] = [
    {
        name: "read",
        description: "read a file",
        schema: z.object({
            path: z.string().min(1).describe("absolute path")
        }),
        run: async ({ path }) => mcpReadFile(path)
    },
    {
        name: "write",
        description: "write to a file",
        schema: z.object({
            path: z.string().min(1).describe("absolute path"),
            text: z.string().describe("text to write to the file")
        }),
        run: async ({ path, text }) => `wrote ${await mcpWriteFile(path, text)} bytes to ${path}`
    }
];
