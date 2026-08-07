import { createKernel } from "@hyperkernel/kernel";

const kernel = createKernel({
  schemas: {
    Task: {
      text: {
        type: "string",
      },
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
