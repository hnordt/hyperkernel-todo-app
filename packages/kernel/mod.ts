import type * as z from "zod";

type RecordSchema = z.ZodType<Record<string, unknown>>;

type CommandDescriptor<
  TType extends string = string,
  TInputSchema extends RecordSchema = RecordSchema,
> = Readonly<{
  kind: "command";
  type: TType;
  inputSchema: TInputSchema;
}>;

type EventDescriptor<
  TType extends string = string,
  TDataSchema extends RecordSchema = RecordSchema,
> = Readonly<{
  kind: "event";
  type: TType;
  dataSchema: TDataSchema;
}>;

export function command<
  TType extends string,
  TInputSchema extends RecordSchema,
>(
  type: TType,
  inputSchema: TInputSchema,
): CommandDescriptor<TType, TInputSchema> {
  return {
    kind: "command",
    type,
    inputSchema,
  };
}

export function event<
  TType extends string,
  TDataSchema extends RecordSchema,
>(
  type: TType,
  dataSchema: TDataSchema,
): EventDescriptor<TType, TDataSchema> {
  return {
    kind: "event",
    type,
    dataSchema,
  };
}

type CommandInput<TCommandDescriptor extends CommandDescriptor> = z.output<
  TCommandDescriptor["inputSchema"]
>;
type EventData<TEventDescriptor extends EventDescriptor> = z.output<
  TEventDescriptor["dataSchema"]
>;

type CompatibleCommandInputKey<
  TCommandDescriptor extends CommandDescriptor,
  TValue,
> = {
  [K in Extract<keyof CommandInput<TCommandDescriptor>, string>]:
    CommandInput<TCommandDescriptor>[K] extends TValue ? K : never;
}[Extract<keyof CommandInput<TCommandDescriptor>, string>];

type CommandInputBindings<TCommandDescriptor extends CommandDescriptor> = {
  readonly [K in keyof CommandInput<TCommandDescriptor>]-?: `unsafe.${string}`;
};

type EventDataBindings<
  TCommandDescriptor extends CommandDescriptor,
  TEventDescriptor extends EventDescriptor,
> = {
  readonly [K in keyof EventData<TEventDescriptor>]-?:
    `command.${CompatibleCommandInputKey<
      TCommandDescriptor,
      EventData<TEventDescriptor>[K]
    >}`;
};

type ProcedureEventBinding<
  TCommandDescriptor extends CommandDescriptor,
  TEventDescriptor extends EventDescriptor,
> = readonly [
  TEventDescriptor,
  EventDataBindings<TCommandDescriptor, TEventDescriptor>,
];

type ProcedureDescriptor<
  TCommandDescriptor extends CommandDescriptor = CommandDescriptor,
  TEventDescriptors extends readonly EventDescriptor[] =
    readonly EventDescriptor[],
> = Readonly<{
  kind: "procedure";
  command: readonly [
    TCommandDescriptor,
    CommandInputBindings<TCommandDescriptor>,
  ];
  events: {
    readonly [I in keyof TEventDescriptors]: ProcedureEventBinding<
      TCommandDescriptor,
      TEventDescriptors[I]
    >;
  };
}>;

export function procedure<
  const TCommandDescriptor extends CommandDescriptor,
  const TEventDescriptors extends readonly EventDescriptor[],
>(
  command: readonly [
    TCommandDescriptor,
    CommandInputBindings<TCommandDescriptor>,
  ],
  ...events: {
    [I in keyof TEventDescriptors]: ProcedureEventBinding<
      TCommandDescriptor,
      TEventDescriptors[I]
    >;
  }
): ProcedureDescriptor<TCommandDescriptor, TEventDescriptors> {
  return {
    kind: "procedure",
    command: [command[0], command[1]],
    events: events.map((event) => [event[0], event[1]]) as ProcedureDescriptor<
      TCommandDescriptor,
      TEventDescriptors
    >["events"],
  };
}

export function kernel<
  const TProcedureDescriptors extends readonly ProcedureDescriptor[],
>(
  ...procedures: TProcedureDescriptors
): {
  dispatch: (
    type: string,
    unsafeInput: unknown,
  ) => void;
} {
  return {
    dispatch(type, unsafeInput) {
      for (const procedure of procedures) {
        if (procedure.command[0].type === type) {
          // @todo: command input bindings (`command[1]`)
          const safeInput = procedure.command[0].inputSchema.parse(unsafeInput);

          for (const event of procedure.events) {
            // @todo
            console.info(event[0].type, {
              unsafeInput,
              safeInput,
            });
          }
        }
      }
    },
  };
}
