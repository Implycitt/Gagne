import { type Dirent } from "node:fs";
import { mkdir, readFile, writeFile, readdir, stat, rename } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

export async function mcpReadFile(path: string): Promise<string> {
    if (!isAbsolute(path)) {
        throw new Error(`path must be absolute: ${path}`);
    }

    return readFile(resolve(path), "utf8");
}

export async function mcpListFiles(path: string, depth: number = 1): Promise<string> {
    if (!isAbsolute(path)) {
        throw new Error(`path must be absolute: ${path}`);
    }

    const root = resolve(path);
    const lines: string[] = [];
    let hidden = 0;

    async function walk(dir: string, level: number, known?: Dirent[]): Promise<void> {
        const entries =
            known ??
            (await readdir(dir, {
                withFileTypes: true
            }));
        entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));

        for (const entry of entries) {
            if (lines.length >= 200) {
                hidden++;
                continue;
            }

            const full = join(dir, entry.name);
            const rel = relative(root, full).split("\\").join("/");

            if (!entry.isDirectory()) {
                const { size } = await stat(full);
                lines.push(`${rel} ${size}b`);
                continue;
            }

            const children = await readdir(full, {
                withFileTypes: true
            });
            const broad = children.length > 40;
            const dotted = entry.name.startsWith(".");

            lines.push(`${rel}/${broad ? ` (${children.length} entries)` : ""}`);
            if (level < depth && !broad && !dotted) {
                await walk(full, level + 1, children);
            }
        }
    }

    await walk(root, 1);
    return lines.join("\n") + (hidden ? `\n...+${hidden} more` : "");
}

export async function mcpWriteFile(path: string, text: string): Promise<number> {
    if (!isAbsolute(path)) {
        throw new Error(`path must be absolute: ${path}`);
    }

    const target = resolve(path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text, "utf8");

    return Buffer.byteLength(text, "utf8");
}

export async function mcpEditFile(path: string, find: string, replace: string): Promise<string> {
    if (!isAbsolute(path)) {
        throw new Error(`path must be absolute: ${path}`);
    }
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
