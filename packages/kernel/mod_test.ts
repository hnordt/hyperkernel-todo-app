import assert from "node:assert/strict";

import { createKernel, defineModule } from "./mod.ts";

const config = {
  database: {
    path: ":memory:",
  },
} as const;

function createValidModule() {
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
  const kernel = createKernel({
    config,
    modules: {
      Tasks: createValidModule(),
    },
  });

  assert.equal(typeof kernel.dispatch, "function");
});

Deno.test("createKernel requires a database path", () => {
  assert.throws(
    () =>
      createKernel({
        config: {
          database: {},
        },
        modules: {
          Tasks: createValidModule(),
        },
      } as never),
    { name: "TypeError", message: "Database path must be set" },
  );
});

if (false) {
  createKernel({
    // @ts-expect-error The database path is required.
    config: { database: {} },
    modules: { Tasks: createValidModule() },
  });
}

Deno.test("defineModule returns the module definition unchanged", () => {
  const definition = createValidModule();

  assert.equal(defineModule(definition), definition);
});

Deno.test("createKernel merges multiple definitions", () => {
  const definition = createValidModule();
  const kernel = createKernel({
    config,
    modules: {
      Schemas: {
        schemas: definition.schemas,
        commands: {},
        events: {},
        procedures: {},
      },
      Tasks: {
        schemas: {},
        commands: definition.commands,
        events: definition.events,
        procedures: definition.procedures,
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
  ]);
});

Deno.test("createKernel rejects conflicts between definitions", () => {
  const definition = createValidModule();
  const emptyDefinition = {
    schemas: {},
    commands: {},
    events: {},
    procedures: {},
  } as const;

  assert.throws(
    () =>
      createKernel({
        config,
        modules: {
          Tasks: definition,
          Duplicate: {
            ...emptyDefinition,
            schemas: definition.schemas,
          },
        },
      }),
    { name: "TypeError", message: "Task conflict: Task" },
  );
  assert.throws(
    () =>
      createKernel({
        config,
        modules: {
          Tasks: definition,
          Duplicate: {
            ...emptyDefinition,
            commands: definition.commands,
          },
        },
      }),
    { name: "TypeError", message: "Command conflict: CreateTask" },
  );
  assert.throws(
    () =>
      createKernel({
        config,
        modules: {
          Tasks: definition,
          Duplicate: {
            ...emptyDefinition,
            events: definition.events,
          },
        },
      }),
    { name: "TypeError", message: "Event conflict: TaskCreated" },
  );
  assert.throws(
    () =>
      createKernel({
        config,
        modules: {
          Tasks: definition,
          Duplicate: {
            ...emptyDefinition,
            procedures: definition.procedures,
          },
        },
      }),
    { name: "TypeError", message: "Procedure conflict: TaskCreation" },
  );
});

Deno.test("createKernel rejects unknown schema references", () => {
  const definition = createValidModule();

  assert.throws(
    () =>
      createKernel({
        config,
        modules: {
          Tasks: {
            ...definition,
            commands: {
              CreateTask: {
                text: "Unknown.text",
              },
            },
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
  const definition = createValidModule();

  assert.throws(
    () =>
      createKernel({
        config,
        modules: {
          Tasks: {
            ...definition,
            events: {
              CreateTask: {
                text: "Task.text",
              },
            },
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
  const definition = createValidModule();

  assert.throws(
    () =>
      createKernel({
        config,
        modules: {
          Tasks: {
            ...definition,
            procedures: {
              TaskCreation: {
                handle: definition.procedures.TaskCreation.handle,
                raise: {},
              },
            },
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
  const definition = createValidModule();

  assert.throws(
    () =>
      createKernel({
        config,
        modules: {
          Tasks: {
            ...definition,
            procedures: {
              TaskCreation: {
                ...definition.procedures.TaskCreation,
                handle: {
                  CreateTask: {
                    text: "command.text",
                  },
                },
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
  const kernel = createKernel({
    config,
    modules: {
      Tasks: createValidModule(),
    },
  });

  assert.throws(
    () => kernel.dispatch("CreateTask", { text: 42 } as never),
    {
      name: "TypeError",
      message: "Expected Task.text to be a string",
    },
  );
});

Deno.test("dispatch rolls back its transaction when emission fails", () => {
  const kernel = createKernel({
    config,
    modules: {
      Tasks: createValidModule(),
    },
  });
  const originalConsoleInfo = console.info;
  let shouldFail = true;

  console.info = () => {
    if (shouldFail) {
      shouldFail = false;
      throw new Error("Emission failed");
    }
  };

  try {
    assert.throws(
      () => kernel.dispatch("CreateTask", { text: "Write documentation" }),
      { name: "Error", message: "Emission failed" },
    );
    assert.doesNotThrow(() =>
      kernel.dispatch("CreateTask", { text: "Write documentation" })
    );
  } finally {
    console.info = originalConsoleInfo;
  }
});
