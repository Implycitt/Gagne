import { readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";

import { assertAbsolute } from "./paths.ts";

export async function mcpEditFile(path: string, find: string, replace: string): Promise<string> {
    assertAbsolute(path);
    if (find.length === 0) {
        throw new Error(`find is empty`);
    }

    const target = resolve(path);
    const raw = await readFile(target, "utf8");
    const crlf = raw.includes("\r\n");
    const text = crlf ? raw.replace(/\r\n/g, "\n") : raw;
    const needle = find.replace(/\r\n/g, "\n");

    if (needle === replace) {
        throw new Error("find and replace are identical, no changes");
    }

    const parts = text.split(needle);
    if (parts.length === 1) {
        throw new Error(`not found in ${path}`);
    }
    if (parts.length > 2) {
        throw new Error(`${parts.length - 1} matches in ${path}`);
    }

    const next = parts.join(replace);
    const tmp = `${target}.tmp`;
    await writeFile(tmp, crlf ? next.replace(/\n/g, "\r\n") : next, "utf8");
    await rename(tmp, target);

    const line = text.slice(0, parts[0]!.length).split("\n").length;
    return `edited ${path}:${line} (${replace.length}+ ${needle.length}-)`;
}
