import assert from "node:assert/strict";

import { createKernel, defineModule } from "./mod.ts";

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

Deno.test("defineModule returns the module definition unchanged", () => {
  const definition = createValidConfig();

  assert.equal(defineModule(definition), definition);
});

Deno.test("createKernel merges multiple definitions", () => {
  const config = createValidConfig();
  const kernel = createKernel(
    {
      schemas: config.schemas,
      commands: {},
      events: {},
      procedures: {},
    },
    {
      schemas: {},
      commands: config.commands,
      events: config.events,
      procedures: config.procedures,
    },
  );
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
  ]);
});

Deno.test("createKernel rejects conflicts between definitions", () => {
  const config = createValidConfig();
  const emptyDefinition = {
    schemas: {},
    commands: {},
    events: {},
    procedures: {},
  } as const;

  assert.throws(
    () =>
      createKernel(config, {
        ...emptyDefinition,
        schemas: config.schemas,
      }),
    { name: "TypeError", message: "Task conflict: Task" },
  );
  assert.throws(
    () =>
      createKernel(config, {
        ...emptyDefinition,
        commands: config.commands,
      }),
    { name: "TypeError", message: "Command conflict: CreateTask" },
  );
  assert.throws(
    () =>
      createKernel(config, {
        ...emptyDefinition,
        events: config.events,
      }),
    { name: "TypeError", message: "Event conflict: TaskCreated" },
  );
  assert.throws(
    () =>
      createKernel(config, {
        ...emptyDefinition,
        procedures: config.procedures,
      }),
    { name: "TypeError", message: "Procedure conflict: TaskCreation" },
  );
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
