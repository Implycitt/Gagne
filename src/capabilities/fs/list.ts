import { type Dirent } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

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
