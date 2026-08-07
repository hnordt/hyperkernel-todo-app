import { defineModule } from "@hyperkernel/kernel";

export const Projects = defineModule({
  schemas: {
    Project: {
      name: {
        type: "string",
      },
    },
  },
  commands: {
    CreateProject: {
      name: "Project.name",
    },
  },
  events: {
    ProjectCreated: {
      name: "Project.name",
    },
  },
  procedures: {
    ProjectCreation: {
      handle: {
        CreateProject: {
          name: "unsafe.name",
        },
      },
      raise: {
        ProjectCreated: {
          name: "command.name",
        },
      },
    },
  },
});
