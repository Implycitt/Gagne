export const phases = ["intake", "concept", "plan", "build", "test", "harden", "package"] as const;

export type Phase = (typeof phases)[number];

export type RunStatus = "queued" | "running" | "blocked" | "done" | "failed" | "cancelled";

export type RunPatch = Partial<Omit<RunRecord, "id" | "startedAt">>;

export interface RunRecord {
    id: string;
    brief: string;
    projectDir: string;
    phase: Phase;
    status: RunStatus;
    startedAt: number;
    deadlineAt: number;
    updatedAt: number;
    note?: string;
}

export interface RunSpec {
    brief: string;
    projectDir: string;
    budgetMinutes: number;
}

export interface RunFilter {
    status?: RunStatus;
    limit?: number;
}

export interface RunStore {
    create(spec: RunSpec): Promise<RunRecord>;
    get(id: string): Promise<RunRecord | undefined>;
    list(filter?: RunFilter): Promise<RunRecord[]>;
    update(id: string, patch: RunPatch): Promise<RunRecord>;
}

export interface AgentRequest {
    agent: string;
    system: string;
    messages: { role: "user" | "assistant"; content: string }[];
    temperature?: number;
    maxTokens?: number;
}

export interface StationResponse {
    text: string;
    promptEvalCount: number;
    evalCount: number;
    duration: number;
}

export interface Postman {
    run(req: AgentRequest): Promise<StationResponse>;
}
