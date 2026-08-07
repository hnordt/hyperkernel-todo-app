# @hyperkernel/kernel

> [!CAUTION]
> This module is experimental. It was intentionally implemented with artificial
> intelligence without any human supervision or review. It must not be used in
> production.

`@hyperkernel/kernel` is an experiment in declaring schemas, commands, events,
and procedures as one explicit kernel configuration.

## Current goal

The current goal is to stabilize the public API. The implementation will be
reviewed only after that API has been stabilized. Until then, behavior, types,
and configuration may change without notice.

The current public entry point is `createKernel(config)`. It returns a kernel
with a typed `dispatch(commandType, input)` method:

```ts
import { createKernel } from "@hyperkernel/kernel";

const kernel = createKernel({
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
});

kernel.dispatch("CreateTask", { text: "Write documentation" });
```

## Tests

Run the package's unit and integration tests with Deno:

```sh
deno test
```
