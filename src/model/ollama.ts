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
            }
        })
    });

    if (!response.ok) {
        throw new Error(`ollama ${response.status}: ${await response.text()}`);
    }

    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("message" in body)) {
        throw new Error(`unexpected body ${JSON.stringify(body).slice(0, 200)}`);
    }

    return body.message as AssistantMessage;
}
