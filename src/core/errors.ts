import * as z from "zod";

export function errorText(err: unknown): string {
    if (err instanceof z.ZodError) {
        return err.issues
            .map(issue => {
                const at = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
                return `${at}${issue.message}`;
            })
            .join("; ");
    }
    return err instanceof Error ? err.message : String(err);
}
