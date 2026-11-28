import { runAgent } from "./agent.ts";

import { errorText } from "../core/errors.ts";
import { phases } from "../core/phases.ts";
import { phaseNames, type RunRecord, type RunStore } from "../core/types.ts";
import { models } from "../model/models.ts";

const SYSTEM = `You are Gagne, one agent in a staged pipeline that turns a brief into working code. You are working inside the project directory named below, and nothing outside it is yours to change. Every path you pass to a tool must be absolute. Use the tools to act on disk. Only say a file was read, written or changed when a tool result says so. This run is unattended. Never ask a question and never stop to confirm: choose, act, and report what you did.`;

function oneLine(text: string): string {
    return text.replace(/\s+/g, " ").trim().slice(0, 160);
}

export async function executeRun(run: RunRecord, store: RunStore): Promise<void> {
    try {
        let record = await store.update(run.id, {
            status: "running",
            note: "starting"
        });

        const system = `${SYSTEM}\n\nBrief: ${run.brief}\nProject directory: ${run.projectDir}`;
        let carried = "";

        for (let index = phaseNames.indexOf(record.phase); index < phaseNames.length; ++index) {
            const name = phaseNames[index];

            if (!name) {
                break;
            }

            const phase = phases[name];

            if (!phase) {
                continue;
            }

            if (Date.now() >= record.deadlineAt) {
                await store.update(run.id, {
                    status: "blocked",
                    note: `out of budget before ${name}: ${phase.model}`
                });
                return;
            }

            record = await store.update(run.id, {
                phase: name,
                note: `${name}: ${phase.model}`
            });

            const task = carried
                ? `The previous phase produced this plan:\n\n${carried}\n\n--\n\n${phase.done}`
                : phase.done;

            let calls = 0;
            let writes = 0;

            const result = await runAgent({
                spec: models[phase.model],
                system,
                task,
                maxTurns: phase.maxTurns,
                tools: phase.tools,
                shouldStop: () => Date.now() >= record.deadlineAt,
                onTool: async (tool, output) => {
                    calls++;
                    if (tool == "write" || tool == "edit") {
                        writes++;
                    }
                    await store.update(run.id, {
                        note: `${name}: ${tool} -> ${oneLine(output)}`
                    });
                }
            });

            if (result.stopped) {
                await store.update(run.id, {
                    status: "blocked",
                    note: `out of budget during ${name}`
                });
                return;
            }

            const builds = phase.tools.includes("write");

            if (builds ? writes === 0 : calls === 0) {
                await store.update(run.id, {
                    status: "failed",
                    note: oneLine(
                        `${name} finished without ${builds ? "writing a file" : "reading the project"}: ${result.text}`
                    )
                });
                return;
            }
            carried = result.text;
            record = await store.update(run.id, {
                note: `${name}: ${result.turns} turns -> ${oneLine(carried)}`
            });
        }
        await store.update(run.id, {
            status: "done",
            note: oneLine(carried) || "done"
        });
    } catch (err) {
        const note = oneLine(errorText(err));

        try {
            await store.update(run.id, {
                status: "failed",
                note
            });
        } catch (storeErr) {
            console.error(`could not record failure for ${run.id}: ${errorText(storeErr)}`);
        }
    }
}
