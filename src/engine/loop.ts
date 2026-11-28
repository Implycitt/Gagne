import * as z from "zod";

import { createInterface } from "node:readline/promises";

import { capabilities } from "../capabilities/index.ts";
import { errorText } from "../core/errors.ts";
import { models } from "../model/models.ts";
import { chat, type Message } from "../model/ollama.ts";

const MAX_TURNS = 40;
const MAX_HISTORY_CHARS = 32000;

const tools = capabilities.map(capability => {
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

const system: Message = {
    role: "system",
    content:
        "You are a coding agent with file tools. Use them to act on disk. Every path must be absolute. Only claim a file was written when a tool result says so. Work step by step: call tools until the task is complete, then reply with a short plaintext summary of what you did. Do not ask for confirmation."
};

const history: Message[] = [system];

function trimHistory(): void {
    const turns: Message[][] = [];
    let current: Message[] = [];

    for (const message of history.slice(1)) {
        if (message.role === "user" && current.length > 0) {
            turns.push(current);
            current = [];
        }
        current.push(message);
    }

    if (current.length > 0) {
        turns.push(current);
    }

    while (turns.length > 1 && JSON.stringify([system, ...turns.flat()]).length > MAX_HISTORY_CHARS) {
        turns.shift();
    }

    history.splice(0, history.length, system, ...turns.flat());
}

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

const spec = models.code;

try {
    while (true) {
        const line = (await rl.question("\n> ")).trim();

        if (line === "/exit") {
            break;
        }

        if (!line) {
            continue;
        }

        history.push({
            role: "user",
            content: line
        });

        try {
            let finished = false;
            let truncated = 0;

            for (let turn = 1; turn <= MAX_TURNS; turn++) {
                trimHistory();

                const reply = await chat(spec, history, tools);
                history.push(reply.message);

                const calls = reply.message.tool_calls ?? [];

                if (reply.doneReason === "length" && calls.length === 0) {
                    history.pop();
                    if (++truncated >= 2) {
                        console.log("output hit the token limit twice.");
                        finished = true;
                        break;
                    }
                    history.push({
                        role: "system",
                        content: "The previous assistant reply was cut off by the output limit."
                    });
                    continue;
                }
                truncated = 0;

                if (calls.length === 0 && reply.message.content.trim() === "") {
                    history.pop();
                    continue;
                }

                if (calls.length === 0) {
                    console.log(reply.message.content);
                    finished = true;
                    break;
                }

                for (const call of calls) {
                    const capability = capabilities.find(item => item.name === call.function.name);
                    let result: string;

                    if (!capability) {
                        result = `No tool name ${call.function.name}`;
                    } else {
                        try {
                            result = await capability.run(capability.schema.parse(call.function.arguments));
                        } catch (err) {
                            result = errorText(err);
                        }
                    }

                    console.log(result);
                    history.push({
                        role: "tool",
                        tool_name: call.function.name,
                        content: result
                    });
                }
            }

            if (!finished) {
                console.log(`${MAX_TURNS} turns and no answer`);
            }
        } catch (err) {
            console.log(errorText(err));
        }
    }
} catch {
    console.log("stdin closed");
}

rl.close();
