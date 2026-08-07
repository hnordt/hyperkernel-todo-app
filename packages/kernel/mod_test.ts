import assert from "node:assert/strict";

import { createKernel } from "./mod.ts";

function createValidConfig() {
  return {
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
        },
      },
    },
  } as const;
}

Deno.test("createKernel exposes the dispatch API", () => {
  const kernel = createKernel(createValidConfig());

  assert.equal(typeof kernel.dispatch, "function");
});

Deno.test("createKernel rejects unknown schema references", () => {
  const config = createValidConfig();

  assert.throws(
    () =>
      createKernel({
        ...config,
        commands: {
          CreateTask: {
            text: "Unknown.text",
          },
        },
      } as never),
    {
      name: "TypeError",
      message: "Unknown schema reference: Unknown.text",
    },
  );
});

Deno.test("createKernel rejects names shared by commands and events", () => {
  const config = createValidConfig();

  assert.throws(
    () =>
      createKernel({
        ...config,
        events: {
          CreateTask: {
            text: "Task.text",
          },
        },
      } as never),
    {
      name: "TypeError",
      message: "Commands and events must have distinct names: CreateTask",
    },
  );
});

Deno.test("createKernel rejects procedures without an event", () => {
  const config = createValidConfig();

  assert.throws(
    () =>
      createKernel({
        ...config,
        procedures: {
          TaskCreation: {
            handle: config.procedures.TaskCreation.handle,
            raise: {},
          },
        },
      } as never),
    {
      name: "TypeError",
      message:
        "Procedure TaskCreation must handle exactly one command and raise at least one event",
    },
  );
});

Deno.test("createKernel rejects bindings from the wrong namespace", () => {
  const config = createValidConfig();

  assert.throws(
    () =>
      createKernel({
        ...config,
        procedures: {
          TaskCreation: {
            ...config.procedures.TaskCreation,
            handle: {
              CreateTask: {
                text: "command.text",
              },
            },
          },
        },
      } as never),
    {
      name: "TypeError",
      message: "Invalid CreateTask.text binding: command.text",
    },
  );
});

Deno.test("dispatch rejects values that do not satisfy the schema", () => {
  const kernel = createKernel(createValidConfig());

  assert.throws(
    () => kernel.dispatch("CreateTask", { text: 42 } as never),
    {
      name: "TypeError",
      message: "Expected Task.text to be a string",
    },
  );
});
