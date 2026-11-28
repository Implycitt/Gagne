import * as z from "zod";

import { capabilities } from "../capabilities/index.ts";
import { errorText } from "../core/errors.ts";
import type { ModelSpec } from "../model/models.ts";
import { chat, type Message } from "../model/ollama.ts";

const MAX_HISTORY_CHARS = 32000;
const MAX_LENGTH_RETRIES = 2;

export type AgentOptions = {
    spec: ModelSpec;
    system: string;
    task: string;
    maxTurns: number;
    tools?: string[];
    history?: Message[];
    shouldStop?: () => boolean;
    onText?: (text: string) => void | Promise<void>;
    onTool?: (name: string, result: string) => void | Promise<void>;
};

export type AgentResult = {
    text: string;
    turns: number;
    history: Message[];
    stopped: boolean;
};

const toolCache = new Map<string, unknown[]>();

function toolDefinitions(allowed: string[] | undefined): unknown[] {
    const key = allowed ? [...allowed].sort().join(",") : "*";
    const cached = toolCache.get(key);

    if (cached) {
        return cached;
    }

    const picked = allowed ? capabilities.filter(capability => allowed.includes(capability.name)) : capabilities;
    const tools = picked.map(capability => {
        const parameters = z.toJSONSchema(capability.schema) as Record<string, unknown>;
        delete parameters.$schema;

        return {
            type: "function" as const,
            function: {
                name: capability.name,
                description: capability.description,
                parameters
            }
        };
    });

    toolCache.set(key, tools);
    return tools;
}

function trimHistory(history: Message[]): void {
    const head = history[0];

    if (!head || head.role !== "system") {
        return;
    }

    const task = history[1];

    if (!task || task.role !== "user") {
        return;
    }

    const groups: Message[][] = [];
    let current: Message[] = [];

    for (const message of history.slice(2)) {
        if (message.role === "assistant" && current.length > 0) {
            groups.push(current);
            current = [];
        }
        current.push(message);
    }

    if (current.length > 0) {
        groups.push(current);
    }

    while (groups.length > 1 && JSON.stringify([head, task, ...groups.flat()]).length > MAX_HISTORY_CHARS) {
        groups.shift();
    }

    history.splice(0, history.length, head, task, ...groups.flat());
}

export async function runAgent(options: AgentOptions): Promise<AgentResult> {
    const history: Message[] = [
        {
            role: "system",
            content: options.system
        },
        ...(options.history ?? [])
    ];

    if (options.task.trim()) {
        history.push({
            role: "user",
            content: options.task
        });
    }

    const tools = toolDefinitions(options.tools);
    let turns = 0;
    let truncated = 0;

    while (turns < options.maxTurns) {
        if (options.shouldStop?.()) {
            return {
                text: "",
                turns,
                history,
                stopped: true
            };
        }

        turns++;
        trimHistory(history);

        const reply = await chat(options.spec, history, tools);
        history.push(reply.message);

        const calls = reply.message.tool_calls ?? [];

        if (reply.doneReason === "length" && calls.length === 0) {
            history.pop();
            if (++truncated >= MAX_LENGTH_RETRIES) {
                throw new Error("output hit the token limit twice");
            }
            history.push({
                role: "system",
                content: "the previous assistants reply got cut off by the output limit."
            });
            continue;
        }
        truncated = 0;

        if (calls.length === 0) {
            const text = reply.message.content.trim();

            if (!text) {
                history.pop();
                continue;
            }

            await options.onText?.(text);
            return {
                text,
                turns,
                history,
                stopped: false
            };
        }

        for (const call of calls) {
            const capability = capabilities.find(item => item.name === call.function.name);
            let result: string;

            if (!capability) {
                result = `No tool named ${call.function.name}`;
            } else {
                try {
                    result = await capability.run(capability.schema.parse(call.function.arguments));
                } catch (err) {
                    result = errorText(err);
                }
            }

            await options.onTool?.(call.function.name, result);
            history.push({
                role: "tool",
                tool_name: call.function.name,
                content: result
            });
        }
    }

    throw new Error(`${options.maxTurns} turns and no answer`);
}
