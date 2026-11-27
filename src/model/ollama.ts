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

export type Message =
    | { role: "system" | "user"; content: string }
    | AssistantMessage
    | { role: "tool"; tool_name: string; content: string };

export async function chat(messages: Message[], tools: unknown[]): Promise<AssistantMessage> {
    for (let attempt = 1; attempt <= 3; attempt++) {
        const response = await fetch("http://127.0.0.1:11434/api/chat", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                model: "qwen3.8:latest",
                messages,
                tools,
                stream: false,
                think: false,
                options: {
                    num_ctx: 20000,
                    num_predict: 512,
                    temperature: 0.2
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

        const body: unknown = await response.json();
        if (typeof body !== "object" || body === null || !("message" in body)) {
            throw new Error(`unexpected body ${JSON.stringify(body).slice(0, 200)}`);
        }

        return body.message as AssistantMessage;
    }
    throw new Error("unreachable");
}
