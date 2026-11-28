import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

export async function mcpWriteFile(path: string, text: string): Promise<number> {
    if (!isAbsolute(path)) {
        throw new Error(`path must be absolute: ${path}`);
    }

    const target = resolve(path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text, "utf8");

    return Buffer.byteLength(text, "utf8");
}
