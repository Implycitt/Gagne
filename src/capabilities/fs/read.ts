import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

import { assertAbsolute, splitLines } from "./paths.ts";

const MAX_LINES = 250;
const MAX_BYTES = 16000;

export async function mcpReadFile(path: string, from: number = 1, to?: number): Promise<string> {
    assertAbsolute(path);

    if (!Number.isInteger(from) || from < 1) {
        throw new Error("Integer can't be less than 1");
    }

    if (to !== undefined && (!Number.isInteger(to) || to < from)) {
        throw new Error("to has to be geq from");
    }

    const raw = await readFile(resolve(path), "utf8");
    if (raw.length === 0) {
      return `[lines 0-0 of 0]\n`;
    }
    const lines = splitLines(raw);
    const total = lines.length;

    if (from > total) {
        throw new Error("Start can't be greater than end");
    }

    let last = Math.min(to ?? from + MAX_LINES - 1, from + MAX_LINES - 1, total);
    let body = lines.slice(from - 1, last).join("\n");
    let note = "";

    if (body.length > MAX_BYTES) {
        const cut = body.lastIndexOf("\n", MAX_BYTES);
        body = body.slice(0, cut > 0 ? cut : MAX_BYTES);
        last = from + body.split("\n").length - 1;
        note = `, ${body.length} of ${raw.length} bytes`;
    }

    return `[lines ${from}-${last} of ${total}${note}\n${body}]`;
}
