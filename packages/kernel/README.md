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

The current public entry point is `createKernel(...definitions)`. It merges one
or more definitions and returns a kernel with a typed
`dispatch(commandType, input)` method. Conflicting Task, Command, Event, or
Procedure names throw a `TypeError` during creation. `defineModule(definition)`
type-checks a standalone definition while preserving its inferred literal types.

```ts
import { createKernel, defineModule } from "@hyperkernel/kernel";

const TaskManagement = defineModule({
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

const kernel = createKernel(TaskManagement);

kernel.dispatch("CreateTask", { text: "Write documentation" });
```

## Tests

Run the package's unit and integration tests with Deno:

```sh
deno test
```
