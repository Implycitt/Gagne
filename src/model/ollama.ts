import { type ModelSpec } from "./models.ts";

export type ToolCall = {
    function: {
        name: string;
        arguments: Record<string, unknown>;
    };
};

export type AssistantMessage = {
    role: "assistant";
    content: string;
    tool_calls?: ToolCall[];
};

export type Reply = {
    message: AssistantMessage;
    doneReason: string;
    evalCount: number;
    promptTokens: number;
    cachedTokens: number;
};

type Wire = {
    message?: {
        content?: string;
        thinking?: string;
        tool_calls?: ToolCall[];
    };
    done_reason?: string;
    eval_count?: number;
    prompt_eval_count?: number;
    prompt_eval_cached_count?: number;
};

export type Message =
    | { role: "system" | "user"; content: string }
    | AssistantMessage
    | { role: "tool"; tool_name: string; content: string };

export async function chat(spec: ModelSpec, messages: Message[], tools: unknown[]): Promise<Reply> {
    for (let attempt = 1; attempt <= 3; attempt++) {
        const response = await fetch("http://127.0.0.1:11434/api/chat", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                model: spec.id,
                messages,
                tools,
                stream: false,
                think: spec.think,
                options: {
                    num_ctx: spec.numContext,
                    num_predict: spec.numPredict,
                    temperature: spec.temperature
                },
                keep_alive: "24h"
            })
        });

        if (!response.ok) {
            const detail = (await response.text()).slice(0, 300);
            if (response.status >= 500 && attempt < 3) {
                console.log(`\n ollama ${response.status}`);
                continue;
            }
            throw new Error(`ollama ${response.status}: ${detail}`);
        }

        const body = (await response.json()) as Wire | null;
        if (!body?.message) {
            throw new Error(`unexpected body ${JSON.stringify(body).slice(0, 200)}`);
        }

        return {
            message: {
                role: "assistant",
                content: body.message.content ?? "",
                tool_calls: body.message.tool_calls
            },
            doneReason: String(body.done_reason ?? ""),
            evalCount: Number(body.eval_count ?? 0),
            promptTokens: Number(body.prompt_eval_count ?? 0),
            cachedTokens: Number(body.prompt_eval_cached_count ?? 0)
        };
    }
    throw new Error("unreachable");
}
