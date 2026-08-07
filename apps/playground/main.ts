import { createKernel } from "@hyperkernel/kernel";
import { Projects } from "./Projects.ts";
import { Tasks } from "./Tasks.ts";

const kernel = createKernel({
  config: {
    database: {
      path: "./local.db",
    },
  },
  modules: {
    Projects,
    Tasks,
  },
});

kernel.dispatch("CreateProject", { name: "Hyperkernel" });

kernel.dispatch("CreateTask", { text: "Write documentation" });
