import * as z from "zod";

import { createInterface } from "node:readline/promises";

import { capabilities } from "../capabilities/index.ts";
import { chat, type Message } from "../model/ollama.ts";

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

const history: Message[] = [
    {
        role: "system",
        content:
            "You are a coding agent with file tools. Use them to act on disc. Every path is absolute. Only claim a file was written when a tool result says so."
    }
];

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

// TODO: The model wants to spit out a human readable response but like I don't care so yank that so it go faster.
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

            for (let turn = 1; turn <= 10; turn++) {
                const reply = await chat(history, tools);
                history.push(reply);

                const calls = reply.tool_calls ?? [];
                if (calls.length === 0) {
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
                            result = err instanceof Error ? err.message : String(err);
                            if (history.at(-1)?.role === "user") {
                                history.pop();
                            }
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
                console.log("10 turns and no answer");
            }
        } catch (err) {
            console.log(err instanceof Error ? err.message : String(err));
        }
    }
} catch {
    console.log("stdin closed");
}

rl.close();
