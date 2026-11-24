import type { RunFilter, RunPatch, RunRecord, RunSpec, RunStore } from "./types.ts";

export function createMemoryStore(): RunStore {
    const runs = new Map<string, RunRecord>();

    return {
        async create(spec: RunSpec) {
            const startedAt = Date.now();
            const run: RunRecord = {
                id: `${startedAt.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                brief: spec.brief,
                projectDir: spec.projectDir,
                phase: "intake",
                status: "queued",
                startedAt,
                deadlineAt: startedAt + spec.budgetMinutes * 60000,
                updatedAt: startedAt
            };
            runs.set(run.id, run);

            return run;
        },

        async get(id: string) {
            return runs.get(id);
        },

        async list(filter: RunFilter = {}) {
            const { status, limit = 20 } = filter;
            return [...runs.values()]
                .filter(e => !status || e.status === status)
                .sort((a, b) => b.startedAt - a.startedAt)
                .slice(0, limit);
        },

        async update(id: string, patch: RunPatch) {
            const exists = runs.get(id);
            if (!exists) {
                throw new Error(`Unknown run: ${id}`);
            }
            const next: RunRecord = {
                ...exists,
                ...patch,
                id: exists.id,
                startedAt: exists.startedAt,
                updatedAt: Date.now()
            };
            runs.set(id, next);

            return next;
        }
    };
}
