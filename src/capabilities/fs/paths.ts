import { isAbsolute } from "node:path";

export function assertAbsolute(path: string): void {
    if (!isAbsolute(path)) {
        throw new Error(`Path must be absolute ${path}`);
    }
}

export function splitLines(raw: string): string[] {
    const lines = raw.split(/\r?\n/);
    if (raw.endsWith("\n")) {
        lines.pop();
    }
    return lines;
}
