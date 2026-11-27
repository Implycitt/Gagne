import * as z from "zod";

import { mcpEditFile, mcpListFiles, mcpReadFile, mcpWriteFile } from "./fs.ts";

export type Capability = {
    name: string;
    description: string;
    schema: z.ZodObject<z.ZodRawShape>;
    run: (args: any) => Promise<string>;
};

export const capabilities: Capability[] = [
    {
        name: "read",
        //TODO: write a better description so the model isn't lobotomized
        description: "read a file",
        schema: z.object({
            path: z.string().min(1).describe("absolute path")
        }),
        run: async ({ path }) => mcpReadFile(path)
    },
    {
        name: "write",
        //TODO: write a better description so the model isn't lobotomized
        description: "write to a file",
        schema: z.object({
            path: z.string().min(1).describe("absolute path"),
            text: z.string().describe("text to write to the file")
        }),
        run: async ({ path, text }) => `wrote ${await mcpWriteFile(path, text)} bytes to ${path}`
    },
    {
        name: "list",
        description:
            "list a directory tree. Depth is 2 (default). Include files inside subdirectories; use 1 for just the top level and 3 for deeper trees. Directories end in /, files show byte size.",
        schema: z.object({
            path: z.string().min(1).describe("absolute path"),
            depth: z.number().int().min(1).max(3).default(2)
        }),
        run: async ({ path, depth }) => mcpListFiles(path, depth)
    },
    {
        name: "edit",
        description:
            "Replace one exact occurence of find. Returns the line number; do not re-read the file to verify. If it reports multiple matches, include more surrounding lines. Use the shortest unique fragment.",
        schema: z.object({
            path: z.string().min(1).describe("absolute path"),
            find: z.string().min(1).describe("exact existing text, exactly one occurence"),
            replace: z.string().describe("replacement text; may be empty to delete")
        }),
        run: async ({ path, find, replace }) => mcpEditFile(path, find, replace)
    }
];
