import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { assertAbsolute } from "./paths.ts";

export async function mcpWriteFile(path: string, text: string): Promise<number> {
    assertAbsolute(path);

    const target = resolve(path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text, "utf8");

    return Buffer.byteLength(text, "utf8");
}
