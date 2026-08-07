import { defineModule } from "@hyperkernel/kernel";

export const Tasks = defineModule({
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
