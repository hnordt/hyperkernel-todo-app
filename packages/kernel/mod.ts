import { DatabaseSync } from "node:sqlite";

type FieldSchema = Readonly<{
  type: "string";
}>;

type SchemaDefinition = Readonly<Record<string, FieldSchema>>;
type SchemaRegistry = Readonly<Record<string, SchemaDefinition>>;

type SchemaReference<TSchemas extends SchemaRegistry> = {
  [TSchemaName in Extract<keyof TSchemas, string>]: `${TSchemaName}.${Extract<
    keyof TSchemas[TSchemaName],
    string
  >}`;
}[Extract<keyof TSchemas, string>];

type MessageDefinition<TSchemas extends SchemaRegistry> = Readonly<
  Record<string, SchemaReference<TSchemas>>
>;

type MessageRegistry<TSchemas extends SchemaRegistry> = Readonly<
  Record<string, MessageDefinition<TSchemas>>
>;

type ReferenceValue<
  TSchemas extends SchemaRegistry,
  TReference extends SchemaReference<TSchemas>,
> = TReference extends `${infer TSchemaName}.${infer TFieldName}`
  ? TSchemaName extends keyof TSchemas
    ? TFieldName extends keyof TSchemas[TSchemaName]
      ? TSchemas[TSchemaName][TFieldName] extends { type: "string" } ? string
      : never
    : never
  : never
  : never;

type MessageValue<
  TSchemas extends SchemaRegistry,
  TMessage extends MessageDefinition<TSchemas>,
> = {
  [K in keyof TMessage]: ReferenceValue<
    TSchemas,
    TMessage[K] & SchemaReference<TSchemas>
  >;
};

type CompatibleMessageKey<
  TSchemas extends SchemaRegistry,
  TCommand extends MessageDefinition<TSchemas>,
  TValue,
> = {
  [K in Extract<keyof MessageValue<TSchemas, TCommand>, string>]:
    MessageValue<TSchemas, TCommand>[K] extends TValue ? K : never;
}[Extract<keyof MessageValue<TSchemas, TCommand>, string>];

type CommandInputBindings<
  TSchemas extends SchemaRegistry,
  TCommand extends MessageDefinition<TSchemas>,
> = {
  readonly [K in Extract<keyof MessageValue<TSchemas, TCommand>, string>]-?:
    `unsafe.${K}`;
};

type EventDataBindings<
  TSchemas extends SchemaRegistry,
  TCommand extends MessageDefinition<TSchemas>,
  TEvent extends MessageDefinition<TSchemas>,
> = {
  readonly [K in keyof MessageValue<TSchemas, TEvent>]-?:
    `command.${CompatibleMessageKey<
      TSchemas,
      TCommand,
      MessageValue<TSchemas, TEvent>[K]
    >}`;
};

type ProcedureEvents<
  TSchemas extends SchemaRegistry,
  TCommand extends MessageDefinition<TSchemas>,
  TEvents extends MessageRegistry<TSchemas>,
> = {
  [TEventType in Extract<keyof TEvents, string>]: Readonly<
    & {
      [K in Extract<keyof TEvents, string>]?: EventDataBindings<
        TSchemas,
        TCommand,
        TEvents[K]
      >;
    }
    & {
      [K in TEventType]-?: EventDataBindings<
        TSchemas,
        TCommand,
        TEvents[K]
      >;
    }
  >;
}[Extract<keyof TEvents, string>];

type ProcedureDescriptor<
  TSchemas extends SchemaRegistry,
  TCommands extends MessageRegistry<TSchemas>,
  TEvents extends MessageRegistry<TSchemas>,
> = {
  [TCommandType in Extract<keyof TCommands, string>]: Readonly<{
    handle: Readonly<
      {
        [K in TCommandType]: CommandInputBindings<
          TSchemas,
          TCommands[TCommandType]
        >;
      }
    >;
    raise: ProcedureEvents<
      TSchemas,
      TCommands[TCommandType],
      TEvents
    >;
  }>;
}[Extract<keyof TCommands, string>];

type ModuleDefinition<
  TSchemas extends SchemaRegistry,
  TCommands extends MessageRegistry<TSchemas>,
  TEvents extends MessageRegistry<TSchemas>,
  TProcedures extends Readonly<
    Record<string, ProcedureDescriptor<TSchemas, TCommands, TEvents>>
  >,
> = Readonly<{
  schemas: TSchemas;
  commands: TCommands;
  events: TEvents;
  procedures: TProcedures;
}>;

type UnionToIntersection<T> = (
  T extends unknown ? (value: T) => void : never
) extends (value: infer TIntersection) => void ? TIntersection : never;

type NestedInput<TPath extends string, TValue> = TPath extends
  `${infer THead}.${infer TTail}` ? { [K in THead]: NestedInput<TTail, TValue> }
  : { [K in TPath]: TValue };

type Simplify<TValue> = TValue extends Readonly<Record<string, unknown>> ? {
    [K in keyof TValue]: Simplify<TValue[K]>;
  }
  : TValue;

type ProcedureCommandBindings<
  TProcedure,
  TCommandType extends PropertyKey,
> = TProcedure extends { readonly handle: infer THandle }
  ? TCommandType extends keyof THandle ? THandle[TCommandType]
  : never
  : never;

type DispatchInput<
  TSchemas extends SchemaRegistry,
  TCommand extends MessageDefinition<TSchemas>,
  TBindings,
> = Simplify<
  UnionToIntersection<
    {
      [K in keyof MessageValue<TSchemas, TCommand>]: K extends keyof TBindings
        ? TBindings[K] extends `unsafe.${infer TPath}`
          ? NestedInput<TPath, MessageValue<TSchemas, TCommand>[K]>
        : never
        : never;
    }[keyof MessageValue<TSchemas, TCommand>]
  >
>;

type RuntimeMessageDefinition = Readonly<Record<string, string>>;
type RuntimeBindings = Readonly<Record<string, string>>;
type RuntimeProcedureDefinition = Readonly<{
  handle: Readonly<Record<string, RuntimeBindings>>;
  raise: Readonly<Record<string, RuntimeBindings>>;
}>;

type KernelDefinition = Readonly<{
  schemas: SchemaRegistry;
  commands: Readonly<Record<string, RuntimeMessageDefinition>>;
  events: Readonly<Record<string, RuntimeMessageDefinition>>;
  procedures: Readonly<Record<string, RuntimeProcedureDefinition>>;
}>;

type KernelModules = Readonly<Record<string, KernelDefinition>>;

type KernelConfig = Readonly<{
  database: Readonly<{
    path: string;
  }>;
}>;

type MergedRegistry<
  TModules extends KernelModules,
  TRegistry extends keyof KernelDefinition,
> = Simplify<UnionToIntersection<TModules[keyof TModules][TRegistry]>>;

type MergedSchemas<TModules extends KernelModules> = MergedRegistry<
  TModules,
  "schemas"
> extends infer TSchemas extends SchemaRegistry ? TSchemas : never;

type MergedCommands<TModules extends KernelModules> = {
  readonly [K in keyof MergedRegistry<TModules, "commands">]:
    MergedRegistry<TModules, "commands">[K] extends MessageDefinition<
      MergedSchemas<TModules>
    > ? MergedRegistry<TModules, "commands">[K]
      : never;
};

type MergedEvents<TModules extends KernelModules> = {
  readonly [K in keyof MergedRegistry<TModules, "events">]:
    MergedRegistry<TModules, "events">[K] extends MessageDefinition<
      MergedSchemas<TModules>
    > ? MergedRegistry<TModules, "events">[K]
      : never;
};

type MergedProcedures<TModules extends KernelModules> = {
  readonly [K in keyof MergedRegistry<TModules, "procedures">]:
    MergedRegistry<TModules, "procedures">[K] extends ProcedureDescriptor<
      MergedSchemas<TModules>,
      MergedCommands<TModules>,
      MergedEvents<TModules>
    > ? MergedRegistry<TModules, "procedures">[K]
      : never;
};

type RegistrySelection<TRegistry, TMergedRegistry> = {
  readonly [K in keyof TRegistry]: K extends keyof TMergedRegistry
    ? TMergedRegistry[K]
    : never;
};

type ValidKernelModules<TModules extends KernelModules> = {
  readonly [K in keyof TModules]: TModules[K] extends KernelDefinition
    ? Readonly<{
      schemas: TModules[K]["schemas"];
      commands: RegistrySelection<
        TModules[K]["commands"],
        MergedCommands<TModules>
      >;
      events: RegistrySelection<
        TModules[K]["events"],
        MergedEvents<TModules>
      >;
      procedures: RegistrySelection<
        TModules[K]["procedures"],
        MergedProcedures<TModules>
      >;
    }>
    : never;
};

type Kernel<
  TSchemas extends SchemaRegistry,
  TCommands extends MessageRegistry<TSchemas>,
  TProcedures extends Readonly<Record<string, unknown>>,
> = Readonly<{
  dispatch<TCommandType extends Extract<keyof TCommands, string>>(
    type: TCommandType,
    unsafeInput: DispatchInput<
      TSchemas,
      TCommands[TCommandType],
      ProcedureCommandBindings<
        TProcedures[Extract<keyof TProcedures, string>],
        TCommandType
      >
    >,
  ): void;
}>;

function getFieldSchema(
  schemas: SchemaRegistry,
  reference: string,
): FieldSchema {
  const separator = reference.indexOf(".");
  const schemaName = reference.slice(0, separator);
  const fieldName = reference.slice(separator + 1);
  const fieldSchema = schemas[schemaName]?.[fieldName];

  if (separator < 1 || fieldName.length === 0 || fieldSchema === undefined) {
    throw new TypeError(`Unknown schema reference: ${reference}`);
  }

  return fieldSchema;
}

function validateSchemas(schemas: SchemaRegistry): void {
  for (const [schemaName, schema] of Object.entries(schemas)) {
    for (const [fieldName, field] of Object.entries(schema)) {
      if (field.type !== "string") {
        throw new TypeError(
          `Unsupported schema type at ${schemaName}.${fieldName}`,
        );
      }
    }
  }
}

function validateMessageRegistry(
  schemas: SchemaRegistry,
  registry: Readonly<Record<string, RuntimeMessageDefinition>>,
): void {
  for (const definition of Object.values(registry)) {
    for (const reference of Object.values(definition)) {
      getFieldSchema(schemas, reference);
    }
  }
}

function validateBindings(
  messageType: string,
  definition: RuntimeMessageDefinition,
  bindings: RuntimeBindings,
  namespace: "unsafe" | "command",
): void {
  for (const field of Object.keys(definition)) {
    const binding = bindings[field];

    if (typeof binding !== "string" || !binding.startsWith(`${namespace}.`)) {
      throw new TypeError(
        `Invalid ${messageType}.${field} binding: ${String(binding)}`,
      );
    }
  }

  for (const field of Object.keys(bindings)) {
    if (!Object.hasOwn(definition, field)) {
      throw new TypeError(`Unknown ${messageType} field: ${field}`);
    }
  }
}

function readBinding(
  namespace: "unsafe" | "command",
  binding: string,
  source: unknown,
): unknown {
  const path = binding.slice(namespace.length + 1).split(".");
  let value = source;

  for (const segment of path) {
    if (
      typeof value !== "object" || value === null ||
      !Object.hasOwn(value, segment)
    ) {
      throw new TypeError(`Binding source does not exist: ${binding}`);
    }

    value = (value as Record<string, unknown>)[segment];
  }

  return value;
}

function materializeMessage(
  schemas: SchemaRegistry,
  definition: RuntimeMessageDefinition,
  bindings: RuntimeBindings,
  namespace: "unsafe" | "command",
  source: unknown,
): Record<string, unknown> {
  const message: Record<string, unknown> = {};

  for (const [field, reference] of Object.entries(definition)) {
    const value = readBinding(namespace, bindings[field], source);
    const fieldSchema = getFieldSchema(schemas, reference);

    if (fieldSchema.type === "string" && typeof value !== "string") {
      throw new TypeError(`Expected ${reference} to be a string`);
    }

    message[field] = value;
  }

  return message;
}

function mergeRegistry<TValue>(
  registries: readonly Readonly<Record<string, TValue>>[],
  definitionType: "Task" | "Command" | "Event" | "Procedure",
): Readonly<Record<string, TValue>> {
  const merged: Record<string, TValue> = Object.create(null);

  for (const registry of registries) {
    for (const [name, definition] of Object.entries(registry)) {
      if (Object.hasOwn(merged, name)) {
        throw new TypeError(`${definitionType} conflict: ${name}`);
      }

      merged[name] = definition;
    }
  }

  return merged;
}

function mergeDefinitions(
  definitions: readonly KernelDefinition[],
): KernelDefinition {
  return {
    schemas: mergeRegistry(
      definitions.map((definition) => definition.schemas),
      "Task",
    ),
    commands: mergeRegistry(
      definitions.map((definition) => definition.commands),
      "Command",
    ),
    events: mergeRegistry(
      definitions.map((definition) => definition.events),
      "Event",
    ),
    procedures: mergeRegistry(
      definitions.map((definition) => definition.procedures),
      "Procedure",
    ),
  };
}

export function defineModule<
  const TSchemas extends SchemaRegistry,
  const TCommands extends MessageRegistry<TSchemas>,
  const TEvents extends MessageRegistry<TSchemas>,
  const TProcedures extends Readonly<
    Record<string, ProcedureDescriptor<TSchemas, TCommands, TEvents>>
  >,
>(
  definition: ModuleDefinition<
    TSchemas,
    TCommands,
    TEvents,
    TProcedures
  >,
): ModuleDefinition<TSchemas, TCommands, TEvents, TProcedures> {
  return definition;
}

export function createKernel<
  const TModules extends KernelModules,
>(
  options: Readonly<{
    config: KernelConfig;
    modules: TModules & ValidKernelModules<TModules>;
  }>,
): Kernel<
  MergedSchemas<TModules>,
  MergedCommands<TModules>,
  MergedProcedures<TModules>
> {
  if (typeof options.config?.database?.path !== "string") {
    throw new TypeError("Database path must be set");
  }

  const kernelDefinition = mergeDefinitions(Object.values(options.modules));

  validateSchemas(kernelDefinition.schemas);
  validateMessageRegistry(kernelDefinition.schemas, kernelDefinition.commands);
  validateMessageRegistry(kernelDefinition.schemas, kernelDefinition.events);

  const duplicateTypes = Object.keys(kernelDefinition.commands).filter((type) =>
    Object.hasOwn(kernelDefinition.events, type)
  );

  if (duplicateTypes.length > 0) {
    throw new TypeError(
      `Commands and events must have distinct names: ${
        duplicateTypes.join(", ")
      }`,
    );
  }

  const procedures = Object.entries(kernelDefinition.procedures).map(
    ([procedureName, definition]) => {
      const procedure = definition as RuntimeProcedureDefinition;
      const commandTypes = Object.keys(procedure.handle).filter((type) =>
        Object.hasOwn(kernelDefinition.commands, type)
      );
      const eventTypes = Object.keys(procedure.raise).filter((type) =>
        Object.hasOwn(kernelDefinition.events, type)
      );
      const unknownCommandTypes = Object.keys(procedure.handle).filter((type) =>
        !Object.hasOwn(kernelDefinition.commands, type)
      );
      const unknownEventTypes = Object.keys(procedure.raise).filter((type) =>
        !Object.hasOwn(kernelDefinition.events, type)
      );

      if (unknownCommandTypes.length > 0 || unknownEventTypes.length > 0) {
        throw new TypeError(
          `Procedure ${procedureName} has unknown types: ${
            [...unknownCommandTypes, ...unknownEventTypes].join(", ")
          }`,
        );
      }

      if (commandTypes.length !== 1 || eventTypes.length === 0) {
        throw new TypeError(
          `Procedure ${procedureName} must handle exactly one command and raise at least one event`,
        );
      }

      const commandType = commandTypes[0];
      const commandDefinition = kernelDefinition.commands[commandType];
      const commandBindings = procedure.handle[commandType];

      validateBindings(
        commandType,
        commandDefinition,
        commandBindings,
        "unsafe",
      );

      for (const eventType of eventTypes) {
        const eventDefinition = kernelDefinition.events[eventType];
        const eventBindings = procedure.raise[eventType];

        validateBindings(
          eventType,
          eventDefinition,
          eventBindings,
          "command",
        );

        for (const binding of Object.values(eventBindings)) {
          const commandField = binding.slice("command.".length);

          if (!Object.hasOwn(commandDefinition, commandField)) {
            throw new TypeError(`Binding source does not exist: ${binding}`);
          }
        }
      }

      return {
        commandType,
        eventTypes,
        commandBindings,
        eventBindings: procedure.raise,
      };
    },
  );

  const database = new DatabaseSync(options.config.database.path);

  database.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY,
      type TEXT NOT NULL,
      payload JSON NOT NULL
    )
  `);

  const insertEvent = database.prepare(
    "INSERT INTO events (type, payload) VALUES (?, ?)",
  );

  return {
    dispatch(
      type: string,
      unsafeInput: unknown,
    ): void {
      database.exec("BEGIN IMMEDIATE");

      try {
        for (const procedure of procedures) {
          if (procedure.commandType === type) {
            const command = materializeMessage(
              kernelDefinition.schemas,
              kernelDefinition.commands[type],
              procedure.commandBindings,
              "unsafe",
              unsafeInput,
            );

            for (const eventType of procedure.eventTypes) {
              const event = materializeMessage(
                kernelDefinition.schemas,
                kernelDefinition.events[eventType],
                procedure.eventBindings[eventType],
                "command",
                command,
              );

              insertEvent.run(eventType, JSON.stringify(event));
              console.info(eventType, event);
            }
          }
        }

        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
  } as Kernel<
    MergedSchemas<TModules>,
    MergedCommands<TModules>,
    MergedProcedures<TModules>
  >;
}
