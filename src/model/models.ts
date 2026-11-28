export type ModelSpec = {
    id: string;
    numContext: number;
    numPredict: number;
    temperature: number;
    think: false | "low" | "medium" | "high";
};

export const models = {
    reason: {
        id: "gpt-oss:20b",
        numContext: 16384,
        numPredict: 4096,
        temperature: 0.2,
        think: "low"
    },
    code: {
        id: "hf.co/unsloth/Qwen3.6-35B-A3B-GGUF:UD-IQ3_XXS",
        numContext: 16384,
        numPredict: 4096,
        temperature: 0.2,
        think: false
    }
} satisfies Record<string, ModelSpec>;

export type ModelKey = keyof typeof models;
