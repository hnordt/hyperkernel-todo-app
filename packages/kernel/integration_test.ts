import assert from "node:assert/strict";

import { createKernel } from "./mod.ts";

Deno.test("dispatch emits configured events from an in-memory transaction", () => {
  const kernel = createKernel({
    config: {
      database: {
        path: ":memory:",
      },
    },
    modules: {
      Tasks: {
        schemas: {
          Task: {
            text: { type: "string" },
          },
        },
        commands: {
          CreateTask: {
            text: "Task.text",
          },
        },
        events: {
          TaskCreated: {
            text: "Task.text",
          },
          TaskCreationRecorded: {
            text: "Task.text",
          },
        },
        procedures: {
          TaskCreation: {
            handle: {
              CreateTask: {
                text: "unsafe.text",
              },
            },
            raise: {
              TaskCreated: {
                text: "command.text",
              },
              TaskCreationRecorded: {
                text: "command.text",
              },
            },
          },
        },
      },
    },
  });
  const raised: unknown[][] = [];
  const originalConsoleInfo = console.info;

  console.info = (...args: unknown[]) => raised.push(args);

  try {
    kernel.dispatch("CreateTask", { text: "Write documentation" });
  } finally {
    console.info = originalConsoleInfo;
  }

  assert.deepEqual(raised, [
    ["TaskCreated", { text: "Write documentation" }],
    ["TaskCreationRecorded", { text: "Write documentation" }],
  ]);
});
