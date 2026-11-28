import { createInterface } from "node:readline/promises";

import { executeRun } from "./run.ts";

import { errorText } from "../core/errors.ts";
import { createMemoryStore } from "../core/store.ts";

const dir = "D:/dev/projects/CSC3501";
const BUDGET_MINUTES = 60;

const store = createMemoryStore();
const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

try {
    while (true) {
        const line = (await rl.question("\n> ")).trim();

        if (line === "/exit") {
            break;
        }

        if (!line) {
            continue;
        }

        try {
            const run = await store.create({
                brief: line,
                projectDir: dir,
                budgetMinutes: BUDGET_MINUTES
            });

            console.log(`\nrun ${run.id} -> ${dir}`);

            const done = executeRun(run, store);
            const deadline = run.deadlineAt + 120000;
            let shown = "";

            while (Date.now() < deadline) {
                const now = await store.get(run.id);

                if (!now) {
                    break;
                }

                const state = `${now.status} ${now.phase} ${now.note ?? ""}`;

                if (state !== shown) {
                    shown = state;
                    console.log(`[${now.status}] ${now.phase}: ${now.note ?? ""}`);
                }

                if (now.status !== "running" && now.status !== "queued") {
                    break;
                }

                await Bun.sleep(1000);
            }
            await done;
        } catch (err) {
            console.log(errorText(err));
        }
    }
} catch {
    console.log("stdin closed");
}

rl.close();
