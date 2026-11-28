import * as z from "zod";

import { mcpEditFile } from "./fs/edit.ts";
import { mcpListFiles } from "./fs/list.ts";
import { mcpReadFile } from "./fs/read.ts";
import { mcpSearch } from "./fs/search.ts";
import { mcpWriteFile } from "./fs/write.ts";

export type Capability = {
    name: string;
    description: string;
    schema: z.ZodObject<z.ZodRawShape>;
    run: (args: any) => Promise<string>;
};

export const capabilities: Capability[] = [
    {
        name: "read",
        description:
            "Read a slice of a text file. The first line of the result is a header: [lines a-b of total]. Lines are one indexed so from=1 is the first line. Defaults to the first 250 lines. At most 250 lines or 16KB per call. Read a small window first, or use search to get line numbers, then jump to them. Keep reading until the header says you have seen the lines you need.",
        schema: z.object({
            path: z.string().min(1).describe("absolute path"),
            from: z.number().int().min(1).default(1).describe("first line, one indexed"),
            to: z.number().int().min(1).optional().describe("last line, inclusive. Defaults to from + 249")
        }),
        run: async ({ path, from, to }) => mcpReadFile(path, from, to)
    },
    {
        name: "write",
        description:
            "create a file with exactly the text given. Overwrites the file if it already exists and creates parent directories as needed. Anything already in it and not included in the text gets wiped. There is no undo. Use it only for a file that does not exist yet. To change a file that exists use edit. The result reports the byte count written.",
        schema: z.object({
            path: z.string().min(1).describe("absolute path"),
            text: z.string().describe("text to write to the file")
        }),
        run: async ({ path, text }) => `wrote ${await mcpWriteFile(path, text)} bytes to ${path}`
    },
    {
        name: "list",
        description:
            "list a directory tree. Depth is 2 (default), max 10. Include files inside subdirectories; use 1 for just the top level and 3 for deeper trees. Directories end in /, files show byte size.",
        schema: z.object({
            path: z.string().min(1).describe("absolute path"),
            depth: z.number().int().min(1).max(10).default(2)
        }),
        run: async ({ path, depth }) => mcpListFiles(path, depth)
    },
    {
        name: "edit",
        description:
            "Replace one exact occurrence of find. Returns the line number; do not re-read the file to verify. If it reports multiple matches, include more surrounding lines. Use the shortest unique fragment.",
        schema: z.object({
            path: z.string().min(1).describe("absolute path"),
            find: z.string().min(1).describe("exact existing text, exactly one occurence"),
            replace: z.string().describe("replacement text; may be empty to delete")
        }),
        run: async ({ path, find, replace }) => mcpEditFile(path, find, replace)
    },
    {
        name: "search",
        description:
            "Search file contents by regex or literal string, in one file or a directory tree. Returns one based path:line:text. Use to locate code when you do not know the file or line, or to find all uses of a name. Then, read around a hit. Skips certain folders. Caps at 50 matches or 1000 files and says so. Invalid regex falls back to literal text.",
        schema: z.object({
            pattern: z.string().min(1).describe("regular expression or plain string of what to try to find"),
            path: z.string().min(1).describe("absolute path")
        }),
        run: async ({ pattern, path }) => mcpSearch(pattern, path)
    }
];
