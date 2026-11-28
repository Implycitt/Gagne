import { readFile, readdir, stat, realpath } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";

import { assertAbsolute, splitLines } from "./paths.ts";

const SKIP = new Set(["node_modules", ".git", "dist", "build", "coverage", ".venv", "__pycache__"]);

const MAX_MATCHES = 50;
const MAX_FILES = 1000;
const MAX_FILE_BYTES = 500000;

export async function mcpSearch(pattern: string, path: string): Promise<string> {
    assertAbsolute(path);

    if (pattern.length === 0) {
        throw new Error("cannot have no pattern");
    }

    let test: (line: string) => boolean;
    try {
        const re = RegExp(pattern);
        test = line => re.test(line);
    } catch {
        test = line => line.includes(pattern);
    }

    const root = resolve(path);
    const rootInfo = await stat(root);
    const hits: string[] = [];
    const seen = new Set<string>();

    let scanned = 0;
    const full = (): boolean => hits.length >= MAX_MATCHES || scanned >= MAX_FILES;

    const scan = async (file: string, label: string, size: number): Promise<void> => {
        if (full() || size === 0 || size > MAX_FILE_BYTES) {
            return;
        }
        scanned++;

        let buf: Buffer;
        try {
            buf = await readFile(file);
        } catch {
            return;
        }

        if (buf.includes(0)) {
            return;
        }

        const lines = splitLines(buf.toString("utf8"));
        for (let i = 0; i < lines.length && hits.length < MAX_MATCHES; ++i) {
            if (test(lines[i]!)) {
                hits.push(`${label}:${i + 1}: ${lines[i]}`);
            }
        }
    };

    const walk = async (dir: string): Promise<void> => {
        let real: string;
        let names: string[];

        try {
            [real, names] = await Promise.all([realpath(dir), readdir(dir)]);
        } catch {
            return;
        }

        if (seen.has(real)) {
            return;
        }
        seen.add(real);

        for (const name of names) {
            if (full()) {
                return;
            }

            const file = join(dir, name);
            let info = await stat(file).catch(() => null);
            if (!info) {
                continue;
            }

            if (!info.isDirectory()) {
                await scan(file, relative(root, file).split(sep).join("/"), info.size);
            } else if (!SKIP.has(name)) {
                await walk(file);
            }
        }
    };

    if (rootInfo.isFile()) {
        await scan(root, basename(root), rootInfo.size);
    } else {
        await walk(root);
    }

    if (hits.length === 0) {
        return scanned >= MAX_FILES
            ? `Checked ${MAX_FILES} files under ${path}, no matches`
            : `no matches for ${JSON.stringify(pattern)} in ${path}`;
    }

    const tail =
        hits.length >= MAX_MATCHES
            ? `${MAX_MATCHES} matches, please narrow`
            : scanned >= MAX_FILES
              ? `stopped after ${MAX_FILES}, path too broad`
              : `${hits.length} match${hits.length === 1 ? "" : "es"}`;

    return `${hits.join("\n")}\n${tail}`;
}
