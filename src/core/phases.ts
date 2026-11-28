import type { PhaseName, PhaseSpec } from "./types.ts";

export const phases: Partial<Record<PhaseName, PhaseSpec>> = {
    plan: {
        model: "reason",
        tools: ["read", "list", "search"],
        maxTurns: 20,
        done: `Turn the brief into a scaffold the build phase can execute without making an architectural decision of its own. Work in this order. 1. Inventory. list the project root, then read the entry point and every file the goal touches. Search when you do not know where something lives. 2. Ground. Every file, symbol and line range you name must be one you actually read. Say "not read" rather than guessing. 3. Decompose. For each unit of work give: its file (new or existing), one line of responsibility, and the exported name or signature where it matters. 4. Wire. For each unit say which existing call site changes and what it calls instead. 5. Order. Number the steps so the project still runs after every one. 6. Decide. Where two approaches are plausible, choose one and justify it in a sentence. Leave no fork open. If the goal is vague (a look, a feel, a quality bar), do not ask and do not stay general: pick the concrete changes that best serve it. This could be layout, spacing, color, type, or components. State them as values. Stop when the scaffold covers the goal end to end. Do not restate the goal, do not list what you would need to know.`
    },
    build: {
        model: "code",
        tools: ["read", "write", "edit", "list", "search"],
        maxTurns: 60,
        done: "Carry out the plan above with the file tools. Read each file before you edit it, and use edit for changes to files that already exist. Write replaces a whole file, so use it only to create a new one. Keep every change precise and within the plan. Do not add dependencies, do not reformat lines you are not changing, and do not leave a step half done. When every step is complete, reply with the absolute path of each file you created or changed."
    }
};
