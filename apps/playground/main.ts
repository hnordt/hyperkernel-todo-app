import * as k from "@hyperkernel/kernel";
import * as z from "zod";

const Task = z.strictObject({
  text: z.string(),
});

const CreateTask = k.command("CreateTask", Task);

const TaskCreated = k.event("TaskCreated", Task);

const TaskCreation = k.procedure(
  [CreateTask, {
    text: "unsafe.text",
  }],
  [TaskCreated, {
    text: "command.text",
  }],
);

const kernel = k.kernel(TaskCreation);

kernel.dispatch("CreateTask", { text: "Hello" });
