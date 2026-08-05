# Hyperkernel: Architectural Goals and Minimal Use Case

## Purpose of this document

This document formalizes:

- The goals of the Hyperkernel architecture.
- Its role as a constrained environment for generating business logic with artificial intelligence.
- The responsibilities and boundaries of the current primitives.
- Future capabilities that have already been identified but remain out of scope.
- The technical constraints assumed by the first implementation.
- A method for evaluating the architecture's coherence and sufficiency.
- A minimal task application used as the first use case.

The To Do App is not the main subject of this document. It was chosen because it is simple enough to expose real needs without introducing unnecessary domain or infrastructure concerns.

Its role is to allow the architecture to be evaluated through concrete functionality. At each stage of the application, it will be possible to verify:

- Which contracts are required.
- Which primitives can express them.
- Whether the responsibilities of the primitives remain clear.
- Whether any capability is missing.
- What the smallest implementable and verifiable increment is.

## Architectural goals

### A business language for artificial intelligence and humans

The primary goal of Hyperkernel is to allow artificial intelligence to declare an application's business and domain logic using a small set of explicit and constrained contracts.

These contracts form a business language. Commands, policies, errors, events, projections, queries, and procedures represent the vocabulary and relationships of the domain. Larger features are built by composing these elements.

The same representation must serve two audiences:

- Artificial intelligence receives clear boundaries for what it may declare within each primitive.
- A person can read the contracts and understand intentions, rules, failures, facts, reads, and compositions without reconstructing the behavior from generic code.

Hyperkernel provides the application's common mechanism:

- Validation and interpretation of contracts.
- Registration and ordering of events.
- Execution of queries and updating of projections.
- Transaction and consistency boundaries.
- Composition and execution of features.
- Integration with the permitted infrastructure.

The contracts declared for each application provide its domain language. As a result, consumers and composers of these contracts remain strongly separated from the details of storage, transactions, concurrency, and execution.

This decoupling does not mean that every contract definition is independent of technical details, nor that the domain is independent of Hyperkernel. The domain deliberately depends on the constrained vocabulary provided by the architecture, and some contracts need to understand the mechanism they encapsulate.

### Boundaries for implementation details

Hyperkernel does not aim to eliminate every implementation detail. It aims to constrain where each detail may appear and prevent it from spreading throughout the rest of the application.

Defining a primitive may require technical knowledge. For example, creating a query may require its author to understand SQL, the available projections, and the structure of the queried data.

After the query has been created, its consumers use only its contract:

- Its identity.
- Its inputs.
- Its typed result.
- The dependencies it declares.
- The guarantees provided by Hyperkernel.

A policy, resolver, or procedure that uses this query does not need to know the internal SQL used to produce its result.

The same rule applies to the other primitives: unavoidable details remain confined to the contract-definition boundary, while usage and composition depend only on the declared interface.

The goal, therefore, is not absolute decoupling. It is to reduce the reach of implementation details, create clear boundaries, and prevent a local technical decision from becoming required knowledge throughout the business logic.

A boundary is working when the internal implementation of a primitive can change without changing its consumers, as long as its contract and behavior remain the same.

### Code generation with constraints

Hyperkernel seeks to reduce the degrees of freedom available to artificial intelligence while generating business logic.

- Each primitive allows only one responsibility.
- Inputs, dependencies, and results are declared.
- Business rules and expected failures have their own contracts.
- Handlers do not receive general capabilities for changing the system.
- The possible forms of composition are defined by the architecture.
- Invalid contracts or forbidden combinations must be rejected by the system.

These constraints do not guarantee that artificial intelligence will never make an incorrect decision. They make incompatible behavior harder to express and make omissions, inventions, and misplaced responsibilities easier to identify during human review.

In this sense, Hyperkernel acts as a framework for formally declaring the business and using that declaration to build a coherent application.

### Explicit contracts

Everything that determines system behavior must be declared explicitly.

Business rules, expected failures, facts, read structures, and composition relationships must not remain hidden inside handlers, callbacks, or internal execution details.

Contracts exist primarily to make the system visible, inspectable, and verifiable. Their potential for reuse is a secondary benefit, not their main purpose.

When designing a feature, it must be possible to answer:

- Which command represents the intention?
- Which policies determine whether it may proceed?
- Which errors represent the expected rejections?
- Which events describe what happened?
- Which projections represent the state required for reading?
- Which queries provide those reads?
- Which procedure composes these contracts?

### Single responsibility

Each primitive or executable contract must do only one thing.

- An intention contract declares a possible action.
- A decision contract declares a business rule.
- A calculation contract declares a data transformation.
- An error contract declares an expected failure.
- A fact contract declares something that happened.
- A read contract declares the data that may be observed.
- An effect contract declares an external interaction.
- An orchestration contract declares how other contracts are combined.

Responsibilities must not be combined for convenience inside the same handler.

### Pure and constrained functions

Handlers and callbacks receive only the inputs declared by their contracts and return only the descriptions those contracts permit.

They do not receive broad capabilities for changing the system and must not hide:

- Side effects.
- Business decisions.
- Expected failures.
- Calculations that belong to another responsibility.

A calculation remains allowed when it constitutes the explicit responsibility of a contract. For example, a resolver may purely calculate event data from a command and its declared queries. It must not use that calculation to hide a policy, produce an effect, or change state directly.

### Enforcement boundary

Hyperkernel provides the explicit architectural path that application code and code generated by artificial intelligence are expected to follow. It restricts the inputs and capabilities supplied to handlers and validates the boundaries it controls.

Hyperkernel is not a sandbox or a separate domain-specific language. A JavaScript function may still access ambient APIs, imported modules, or captured mutable state. Avoiding those paths remains the responsibility of the architect, the instructions given to artificial intelligence, supporting tools, and human review.

Handlers receive only their declared inputs, query results, primitive contracts, and limited context capabilities. They do not receive the SQLite connection, the kernel instance, or general infrastructure access. Deno permissions should also be reduced to the capabilities required by the application.

### Explicit composition

Procedures compose the contracts required for an individual feature.

In the future, workflows may coordinate multiple procedures when there is a dependent or multi-step flow.

The orchestration layer knows the composition but does not absorb the responsibilities of the elements it coordinates.

### Determinism

The architecture seeks to reduce the number of implicit paths through which a feature may be declared or executed.

- Dependencies are declared.
- Inputs and results have contracts.
- Expected rejections are named.
- The internal execution order is determined by the system.
- External effects are not mixed into the synchronous core.

The goal is for artificial intelligence to have few valid paths for generating a feature and for the contracts to reveal the possible behavior before a person needs to follow the internal execution code.

### Explicit primitive relationships

A primitive does not know the implementation, consumers, or undeclared dependencies of another primitive. Every relationship between primitives exists only through contracts explicitly provided during composition.

A primitive may use only the primitive descriptors, query results, inputs, and context capabilities explicitly supplied to it. It does not discover dependencies through a global registry during execution. A primitive may know the contracts it receives, but it does not know their internal implementations or the consumers that use its own contract.

## Contract terminology and provenance

### Primitive descriptor

A primitive descriptor is a frozen, process-local contract object created only through a Hyperkernel factory. It declares the identity, schemas, dependencies, and limits of one primitive.

The descriptor object's identity is its authoritative runtime identity. Its declared name exists for human-readable contracts, diagnostics, composition validation, and persisted event identification, but the name is not runtime authority. A structurally similar object, including one with the same name, is not the same descriptor.

Hyperkernel stores each descriptor's internal record in a module-private `WeakMap`. The record contains its primitive kind, schemas, dependencies, constructors, validation rules, and other kind-specific implementation details. These values are not exposed as public properties.

The public descriptor exposes only stable contract-level information, such as its kind and name, and the operations permitted for that primitive. Event and error descriptors expose their official proposal constructors. Execution remains the responsibility of the kernel.

Descriptor factories return nominally typed objects using non-public TypeScript brands. Nominal typing prevents structurally similar object literals from satisfying descriptor types during compilation. At runtime, Hyperkernel recognizes descriptors only through private `WeakMap` membership and exact object identity.

Registration belongs to an individual kernel rather than to the descriptor. The same descriptor may be registered with multiple kernels, but each kernel independently validates its names, dependencies, and compositions.

Descriptor objects are process-local capabilities. Cloning, spreading, serializing, or reconstructing a descriptor does not preserve its identity and produces a value that Hyperkernel will not recognize.

### Runtime proposal

A runtime proposal is a frozen, opaque, process-local value created through the official constructor of an event or error descriptor.

Hyperkernel stores proposal provenance in a separate module-private `WeakMap`. The private record contains the exact descriptor that created the proposal, an immutable snapshot of its payload, unresolved context references, and any lifecycle metadata required by the kernel.

Proposal provenance and payload are not represented by public mutable properties. A structurally similar object is not a valid proposal, even when it contains the same descriptor name and payload.

Before accepting a proposal, the kernel verifies that the proposal and its originating descriptor exist in their respective private registries, that the exact descriptor is registered with the executing kernel, that it was explicitly authorized by the current composition, and that its primitive kind is valid in that position.

After context references have been materialized, the kernel validates the concrete payload against the originating descriptor's schema. A provenance or validation failure is a technical failure.

Runtime proposals are not serialized or persisted. The event log receives only materialized event identity and payload. When an accepted value must be returned publicly, such as a declared business rejection, Hyperkernel creates a separate immutable value containing the public descriptor reference and validated payload. Internal descriptor and proposal metadata never crosses that boundary.

### Materialized and committed values

A materialized value is a runtime proposal whose context references have been replaced with concrete values and whose final schema has been validated. A committed value is a materialized value that the kernel has successfully accepted and persisted.

The lifecycle is:

```text
primitive descriptor
  → runtime proposal
  → materialized value
  → committed value
```

Before accepting a runtime proposal, the kernel verifies that:

- Its primitive descriptor has been registered with that kernel.
- The descriptor was explicitly supplied to the relevant composition.
- The proposal is permitted in that position, such as an event declared by a resolver or an error declared by a policy.
- Its provenance and payload have not been replaced by a merely structurally similar object.

A primitive descriptor may be registered with more than one kernel. A kernel accepts only proposals whose originating descriptor is registered and authorized by its own composition.

## Current primitives

All current primitives have synchronous contracts. Defining or combining them does not produce side effects by itself.

### Command

A `command` describes an action that may be requested.

It declares the accepted data and its structural validations. Policies determine whether the action may be accepted, and resolvers describe the events that are produced.

### Event

An `event` describes something that happened in the system.

It declares the identity and schema of that occurrence and provides an event constructor. The primitive does not execute the occurrence or produce its consequences.

Events are preserved in sequence. A change does not edit a previous event: it produces a new event that declares what happened.

### Error

An `error` declares an expected failure known to the system.

Each failure has an explicit contract identifying why an action could not be performed.

A declared error represents an expected business rejection. An unexpected exception represents a technical failure in the application or Hyperkernel and is not part of the business contract.

Both a rejection and a technical failure interrupt the current execution and cause the transaction to roll back. Capturing and sending technical failures to an error reporter belongs to a future capability.

### Policy

A `policy` declares a business decision based on the current state.

A policy may declare its own input schema. It receives only the validated input required for its decision and the named results of one or more declared queries.

Each policy declares exactly one error that represents its possible rejection. It returns `true` when its condition is satisfied or a runtime proposal for that error when the action must be rejected. Two distinct rejections require two distinct policies.

A policy does not validate the structure of data, change state, or execute the action.

A policy does not know or invoke other policies. Its only relationships are the input, queries, and error explicitly supplied to its own composition.

The procedure binds validated command fields to the input of each policy. Each policy binds fields from its validated input to the inputs of its queries. These bindings may select or rename fields, but they must not contain business decisions or business calculations. The concrete API used to represent a binding remains open.

A policy may omit its input schema when it has no input of its own. It may still decide from a declared query result, including the result of a query that also has no input.

Policies are evaluated when the system attempts to register new events. At that point, their queries observe the current state protected by SQLite's single-writer model.

When a procedure declares more than one policy, they are evaluated in declaration order. Evaluation stops at the first error, avoiding the execution of unnecessary policies and queries.

If a policy rejects the action, none of the procedure's resolvers are executed and no event is registered.

### Projection

A `projection` defines an atomic read model and exclusively owns one or more declared SQLite structures.

Each projection explicitly declares the registered event descriptors it accepts and exactly one synchronous transition for each accepted event. Events not declared by the projection do not affect it. Multiple projections may accept the same event.

A transition determines the projection's next state from its current state and one materialized, validated event. It may read and modify only structures owned by that projection. It does not receive context, queries, other projections, the event log, the kernel, or the SQLite connection.

A transition may change multiple rows and multiple owned structures as one atomic update. It cannot make business decisions, reject an event, produce another event, or perform external effects.

The projection declares its complete storage schema, including its tables, columns, constraints, and indexes. These structures are created during kernel initialization. Event transitions may change data but cannot create or alter the schema.

Queries declare their own result schemas independently. The projection's declared SQLite schema is its resulting storage format and is not a public query result contract.

Committed events are applied to every accepting projection in event-log order. Event registration and all corresponding projection updates occur in the same procedure transaction. If any update fails, the event registration and every projection update are rolled back.

A projection can be rebuilt by recreating its owned structures and applying the same transitions to committed events in order. Therefore, transitions must be deterministic from the current projection state and the materialized event.

A projection does not need to reproduce a complete model or follow a traditional create, read, update, and delete structure.

Different projections may exist for different read requirements even when they concern the same concept.

### Query

A `query` defines a read offered by the application.

Each query explicitly declares one or more projection descriptors under local dependency names. These descriptor references, rather than projection-name strings, determine which read models the query is authorized to access. Every declared projection must be registered with the same kernel.

Declaring a projection authorizes the query to read the structures owned by that projection. A query may combine structures from multiple declared projections, but it cannot read undeclared projections, the event log, SQLite metadata, temporary structures, or internal Hyperkernel structures.

The query definition is the only boundary that needs to understand the storage schemas of its projections. Consumers depend only on the query descriptor, its input schema, and its result schema.

Each query declares exactly one static, parameterized SQL statement. Runtime values are supplied only through bound parameters and cannot construct SQL identifiers, fragments, clauses, or additional statements.

Hyperkernel prepares and validates the statement using SQLite's execution metadata or authorization facilities. The statement may perform reads, including joins, common table expressions, subqueries, aggregates, and window functions. It cannot mutate data or schemas, control transactions, execute pragmas, attach databases, or create temporary structures. SQL text inspection alone is not considered sufficient enforcement.

Queries do not receive the SQLite connection. Hyperkernel executes them through a restricted read capability that exposes only the structures owned by their declared projection dependencies. An unauthorized read or non-read-only statement is an invalid composition or technical failure, not a business rejection.

Bindings between commands, policies, and queries use a declarative field-mapping representation rather than callbacks. A binding may select fields, rename them, and construct the destination input structure. It cannot calculate values, make decisions, call arbitrary functions, access context, or read ambient state. The resulting value is validated by the destination primitive's independent input schema.

A query may omit its input schema when no parameters are required. Omission means that the query accepts no input.

A standalone query observes the latest committed projection state. When a query belongs to a procedure, it executes synchronously through the procedure's existing connection and transaction and observes the state from before that procedure's events are appended.

Every query result is fully materialized and validated before leaving the query boundary. Statements, cursors, lazy iterators, projection capabilities, and SQLite connection references never escape.

### Procedure

A `procedure` composes the contracts required to form a feature.

Each procedure:

- Registers exactly one command.
- Has exclusive responsibility for that command.
- Prevents another procedure from registering the same command.
- Receives zero or more policies.
- Receives one or more resolvers.

The absence of policies means that the feature requires no business decision based on current state. Structural validation of the command remains mandatory.

The complete execution of a procedure forms a single atomic operation within a transaction. Policy evaluation, required queries, resolver execution, event registration, and projection updates belong to the same unit of work.

Policies and resolvers observe a single consistent state protected by SQLite's exclusive write access. No other write may be interleaved during this execution.

If any part fails, the transaction is rolled back and none of the events or state produced by the procedure is preserved.

#### Resolver

A resolver is not an independent primitive. It is a function declared as part of a procedure.

Each resolver:

- Receives the data of the command registered by the procedure.
- May declare a dependency on one or more queries.
- Receives the results of those queries.
- Declares exactly one event descriptor that it is permitted to produce.
- May perform pure calculations required to construct the payload of its declared event.
- Returns exactly one runtime proposal for that event.
- Returns only the event proposal, without changing state or producing effects.

A procedure may have more than one resolver. The system processes resolvers in the order in which they were declared and creates their events in the same order.

This order guarantees a deterministic registration sequence, but it does not represent a causal dependency between events. The application must not use a resolver's position to express that its event depends on another.

Policies authorize an attempt to execute the procedure. A later technical failure may interrupt resolver execution and causes the entire transaction to roll back.

A procedure is accepted only after every resolver has produced and validated exactly one event proposal, every event and projection update has succeeded, and the transaction has committed. A committed procedure has no partial result, optional resolver, or eventless result.

#### Command execution result

Executing a command returns synchronously with one of three expected outcomes: structurally invalid input, a declared business rejection, or a committed procedure. Unexpected technical failures are thrown rather than represented as command outcomes.

Structurally invalid command input returns an `invalid` result containing a normalized list of validation issues. Each issue identifies a stable validation code, its path within the command input, and a human-readable message. Hyperkernel does not expose the validation library's native error representation.

Command validation occurs before a transaction begins. Invalid input does not execute policies, queries, resolvers, context capabilities, events, or projection updates. Structural validation issues are not declared business errors and do not use error descriptors.

When a policy rejects the command, execution returns a `rejected` result containing the materialized and validated value produced by that policy's declared error descriptor. The error preserves its descriptor identity and payload. It is returned only after the transaction has rolled back and is not committed to the event log.

A declared business rejection is an expected result and is not thrown as an exception.

A procedure returns `committed` only after every resolver has produced its declared event, every event has been materialized and validated, every event and projection update has succeeded, and SQLite has committed the transaction.

A committed result contains no event payload or projection state. Commands represent mutations, while queries provide the application's read contracts. A caller may execute a query immediately after receiving `committed` and observe the resulting state.

An unexpected technical failure causes the current transaction to roll back and is then thrown synchronously as a Hyperkernel execution error. Technical failures include invalid internal contract values, unauthorized runtime proposals, query-result validation failures, event validation failures, projection failures, SQLite failures, and commit failures.

Technical failures preserve their original cause for infrastructure logging but are not represented as declared business errors. Transport adapters must not expose internal causes, SQLite details, or stack traces directly to clients.

Invalid kernel composition remains an initialization failure and prevents command execution entirely.

## Execution context

The application explicitly supplies a `context` to the kernel. Primitives may receive the limited parts of that context required to construct their descriptions. For example, a query may receive a clock capability while constructing its SQL description. Context does not expose the SQLite connection, the kernel instance, or general infrastructure.

A context capability returns a limited runtime description recognized by the kernel rather than performing the operation immediately. For example, `context.now()` describes the need for a time value instead of returning the concrete time at declaration.

A primitive does not need a separate duplicate list of context capabilities. The context references contained in its runtime proposals record the capabilities it used. The kernel accepts only references created by context capabilities registered with that execution.

### Materialization

Each context reference is resolved exactly once during a procedure execution and is replaced with its concrete value before that value is consumed. Materialization occurs in stages inside the procedure transaction:

1. Validate the command input.
2. Begin the transaction and establish the consistent state for the procedure.
3. Build and validate policy inputs.
4. Materialize context required by policy queries and decisions.
5. Execute policies in declaration order, stopping at the first rejection.
6. Materialize context required by resolver queries and execute those queries against the same consistent state.
7. Execute the resolvers and collect their event proposals.
8. Materialize context references contained in those event proposals.
9. Validate every concrete event payload.
10. Append the events, update the projections, and commit the transaction.

Context required only by resolvers or events is not materialized when a policy rejects the procedure.

Runtime context references never reach the event log. Projections receive only materialized, validated events and do not access context. If the transaction fails, all values generated for that execution are discarded with the rest of the operation.

### Transactional clock

Every `context.now()` reference created during the same procedure execution resolves to the same transactional time, including references used by policies, queries, and multiple event proposals. The execution resolves the clock once and reuses that value for every clock reference in the transaction.

The context provides the explicit architectural path for environmental values, but it does not prevent arbitrary JavaScript from directly using ambient APIs such as `Date.now()`. Following the context path remains an architectural rule reinforced by tooling and review.

## Future capabilities

The capabilities in this section have been identified but are not part of the first implementation. Their contracts remain open until a concrete use case requires each one.

### Derive

A `derive` is a candidate future primitive for a named, pure business calculation with explicit input and output schemas.

Business calculations have two different temporal roles:

- A value that was part of what happened must be calculated before the event is registered and persisted in the event payload.
- A value that represents a current interpretation of history may be calculated by a projection and rebuilt from the event log.

Until a separate primitive is justified, a resolver may perform pure calculations required to construct its event payload, and a projection may calculate state intended only for reading.

The `derive` primitive should be introduced only when a concrete calculation:

- Has a recognizable name in the domain.
- Is reused by more than one resolver or projection.
- Needs an explicit input and output contract.
- Deserves independent tests or inspection.
- Or needs to be used both before an event is registered and while a projection is rebuilt.

A derive would calculate and return a validated value. It would not accept or reject an action, return an error, produce an event, execute a query, or access infrastructure. A calculation that can reject an action belongs to a policy instead.

### Workflow

A `workflow` will probably coordinate multiple procedures.

It may represent a multi-step flow in which one procedure depends on the result of another or must wait for another occurrence before proceeding.

This responsibility does not belong to an individual procedure or to the current resolvers. The task application does not have this requirement.

### Effect

An `effect` will declare a system side effect.

It may:

- Declare the external work it intends to perform.
- Use policies to determine whether that work may proceed.
- Return an event when the work is performed or a declared error when it cannot be completed.

The API, execution timing, and delivery, repetition, and recovery guarantees have not yet been defined. The task application has no external effects.

### Durability of rejected commands

In the future, the system may keep a durable record of received commands, including those that were rejected or interrupted by a failure.

This capability is not part of the current event log and is not required for the first implementation.

### Technical failure reporting

In the future, unexpected exceptions may be captured and sent to an error reporter.

The reporting mechanism, its configuration, and its delivery guarantees remain out of scope. In the first implementation, the required guarantee is that a technical failure rolls back the transaction and is not represented as a business error.

## Technical constraints of the first implementation

### Runtime

The first implementation uses Deno as its JavaScript runtime.

The back end, primitives, SQLite access, checks, and executable examples must work in the environment provided by Deno.

Implementation decisions should prefer capabilities available in the runtime itself and avoid introducing tools or dependencies that are not required to validate the architecture.

### Independent schemas, runtime validation, and type inference

The first implementation uses Zod as its runtime schema system. Commands, policies, queries, events, and errors declare Zod schemas at their respective contract boundaries.

Each contract owns its schemas independently of every other contract. A command input schema, policy input schema, query input schema, query result schema, event payload schema, and error payload schema remain separate contracts even when they contain fields with the same names or types.

Descriptor factories infer their public TypeScript types from the supplied schemas whenever those types can be derived from the schema. Application code should not maintain a separate manually declared TypeScript type for a value already defined by a Zod schema.

For a schema `S`, `z.input<S>` represents the value accepted before parsing and `z.output<S>` represents the validated value produced after parsing. Consumers of a validated contract boundary receive its output type.

Runtime proposals may additionally accept registered context-reference types in positions that will be materialized before final validation. After materialization, the concrete payload must satisfy the originating schema's output contract.

Type inference provides compile-time guidance but does not replace runtime validation. The Zod schema remains authoritative whenever an unknown value crosses a contract boundary.

Values are validated whenever they cross a contract boundary:

- A command validates its input before a procedure is executed.
- The output of a command-to-policy binding is validated by the policy input schema.
- The output of a policy-to-query binding is validated by the query input schema.
- A query result is validated before it is supplied to a policy or resolver.
- A runtime proposal is checked for provenance and permitted descriptors.
- An event payload is validated against its final schema after all context references have been materialized and before the event is appended.

Zod capabilities such as `transform` and `refine` may perform structural normalization, establish canonical representations, and enforce invariants belonging to the value being validated. A binding must not use normalization as a place to hide a business decision or business calculation.

An explicit TypeScript type may supplement a contract only when the required relationship cannot be derived from its Zod schemas. It cannot replace the runtime schema.

When an input schema is omitted, the primitive accepts no input. Omission does not mean an unknown or unrestricted input.

### Back-end scope

The first phase addresses only the back end.

It includes:

- Incremental implementation of the current primitives.
- The mechanism for composing and executing procedures.
- Registration of events.
- Updating projections.
- Executing queries.
- SQLite validation, consistency, and isolation guarantees.
- Implementation of the To Do App features required to exercise these contracts.

The front end is outside the scope of this phase. After the back end is complete and the architecture's contracts have been evaluated, an example front end will be created to demonstrate the application.

### SQLite

SQLite is part of the architecture of the first implementation and is not treated merely as a replaceable storage detail.

The system must take advantage of its guarantees and respect its operational constraints.

#### Execution topology

The kernel owns exactly one long-lived SQLite connection.

Every procedure starts with `BEGIN IMMEDIATE` before executing any state-dependent query. This establishes the procedure as a write transaction before policies and resolvers inspect the current state. The procedure therefore does not begin as a reader and later attempt to acquire the writer after its decisions have already been made.

All policy and resolver queries execute synchronously through the same connection and transaction. They observe the committed state that existed before the procedure started. Procedure queries finish before events are appended and projections are updated, so they do not observe state produced by the current procedure.

Each query result is fully materialized and validated before it is supplied to a policy or resolver. Statements, cursors, lazy iterators, and references to the SQLite connection do not cross the query execution boundary or remain available after the query finishes.

A successful commit makes the resulting projection state visible to subsequent queries. A rollback preserves the state that existed before the procedure started.

#### Operational model

- There is only one write at a time.
- SQLite is used in memory, and its data exists only during the current execution.
- Write operations must be short and deterministic.
- The system does not depend on a separate database server.
- The architecture does not attempt to simulate multiple simultaneous writes using queues, workers, or additional infrastructure.

#### Intended audience and scale

The architecture is initially intended for applications used by one person, an independent developer, or a small organization of up to a few dozen people.

In this context, SQLite reduces operational complexity and provides enough capacity for the expected volume. This suitability depends mainly on the frequency and duration of writes, not only on the number of users.

#### Assumed benefits

- Execution without a separate database server.
- Simple local operation.
- Serialized and ordered writes.
- Lower installation, maintenance, and operational costs.
- Read and storage capacity appropriate for the scope.

#### Assumed constraints

- Concurrent writes wait for their turn.
- Long writes impair every other write.
- A high volume of simultaneous writes is outside the current goal.
- Features that require multiple independent writers are out of scope.

#### Decision boundary

The choice should be reconsidered only if actual measurements show that serialized writes cannot support the required load or if the product begins to require multiple distributed writers.

### Synchronous execution

The entire flow of the first implementation is synchronous.

- SQLite access is synchronous.
- Queries return their results synchronously.
- All current primitives are evaluated and composed synchronously.
- No primitive returns a `Promise`, schedules work, or keeps an operation pending for later completion.
- A procedure finishes only after all the work it orchestrates has finished.

### Composition validation

Hyperkernel validates the composition of contracts eagerly, during assembly or initialization and before any command is processed.

This validation happens at runtime and rejects, at a minimum:

- Duplicate primitive names.
- References to primitives that have not been registered.
- More than one procedure registered for the same command.
- Other structural combinations that violate the boundaries declared by the primitives.

An invalid composition prevents the kernel from initializing instead of failing only when the corresponding feature is used.

### Strong consistency

The state used for decisions and the state presented by projections follow a strong-consistency model.

- Policies are evaluated when the system attempts to register new events.
- The queries provided to policies read the latest state available at that moment.
- No other write can be interleaved between the decision and the registration of events.
- Policies, resolvers, event registration, and projection updates execute within the same transaction.
- If any part fails, the transaction is rolled back and no event or partial update is preserved.
- After the operation finishes, queries already reflect the state produced by the registered events.

The architecture does not allow an interval in which an event has been accepted but reads still present the previous state. Eventual consistency is outside the current model.

### No external effects

The first application does not consult external services, send messages, trigger notifications, or start background work.

Changes to SQLite are part of the internal state and are not classified here as external effects.

The future effects layer will be responsible for external and asynchronous work. It must not be anticipated in the first implementation through queues, workers, retries, or asynchronous abstractions.

## Incremental evaluation method

The architecture will be evaluated one concrete feature at a time.

For each feature:

1. Describe the value delivered to the person.
2. Identify the intention and required data.
3. Declare the policies and expected errors.
4. Declare the events produced when the action is accepted.
5. Identify the required projections and queries.
6. Define how the procedure composes these contracts.
7. Verify that each contract has a single responsibility.
8. Identify any requirement that the current primitives cannot clearly express.
9. Verify that the feature can be generated without accessing capabilities outside the declared contracts.
10. Verify that a person can understand and review the logic through the resulting contracts.
11. Introduce or change only the smallest required capability.
12. Implement and verify the increment before moving forward.

A new primitive must not be created merely for symmetry or in anticipation of a future need. It must address a concrete need that cannot be clearly expressed with the existing contracts.

## Use case: minimal task application

### Role of the use case

The To Do App provides small, observable, and progressive behaviors for exercising the architecture.

It is not intended to represent a complete product. Features such as authentication, collaboration, multiple lists, due dates, categories, notifications, and external integrations are not required for this evaluation.

### Application requirements

#### Desired behaviors

A person can:

- Add a task.
- View every task in the list.
- Change the text of a task.
- Mark a task as completed.
- Mark a completed task as open again.
- Delete a task.
- Reorder tasks.

#### Application guarantees

- Each task has a unique identifier.
- Each task has a single text field, which must be filled in.
- Different tasks may have the same text.
- The identifier, not the text, distinguishes a task.
- Each task may be open or completed.
- All tasks appear in a single list.
- A new task is initially added to the end of the list.
- A change affects only the selected task.
- A deleted task is no longer part of the list.
- The list preserves the selected order during the current execution.
- An action on a nonexistent task fails and does not change another task.
- Tasks do not need to remain available after the application terminates.

#### Invalid transitions

Invalid state transitions are rejected explicitly by policies:

- Completing an already completed task is rejected with `TaskAlreadyCompleted`.
- Reopening an already open task is rejected with `TaskAlreadyOpen`.
- Moving a task to an invalid position is rejected with `InvalidTaskPosition`.

Each policy evaluates the current state before any resolver is executed. A rejected command produces no event, causes no projection change, and returns its declared business error.

The UI receives the structured rejection and decides how to present or handle it according to the interaction.

#### Task identifier

The client generates a UUID before requesting that a task be added. The person provides the task text, while the client constructs the complete command input:

```text
AddTask {
  id: UUID,
  text: string
}
```

The command schema validates the UUID format. A policy verifies that the identifier is not already in use and declares `TaskAlreadyExists` as its only possible rejection. A uniqueness constraint in SQLite remains the final technical safeguard.

Submitting an existing UUID is an explicit rejection in the first implementation. Idempotency, command deduplication, and reprocessing of the same command will be decided when durable command recording is introduced.

## Use-case stages

Each stage delivers a new, concrete use and serves as a unit for evaluating the architecture.

### Stage 1 — Add tasks

**Behavior:** add a task by providing its text.

**Introduced guarantees:**

- The task uses the UUID supplied by the client as its unique identifier.
- The text must be filled in.
- The new task is added to the end of the list.

**Delivered value:** a person can record a task.

### Stage 2 — View tasks

**Behavior:** view every task that has been added.

**Introduced guarantees:**

- Tasks appear in a single list.
- The list initially presents tasks in creation order.

**Delivered value:** a person can consult the recorded tasks.

### Stage 3 — Change tasks

**Behavior:** change the text of an existing task.

**Introduced guarantees:**

- The change affects only the selected task.
- The updated text appears in the list.

**Delivered value:** a person can keep a task up to date.

### Stage 4 — Complete and reopen tasks

**Behaviors:**

- Mark an open task as completed.
- Mark a completed task as open.

**Introduced guarantees:**

- The list presents the current state of each task.
- The change affects only the selected task.

**Delivered value:** a person can track what has been done and resume a task when necessary.

### Stage 5 — Delete tasks

**Behavior:** delete an existing task.

**Introduced guarantee:** the deleted task is no longer part of the list.

**Delivered value:** a person can remove a task that should no longer remain in the list.

### Stage 6 — Reorder tasks

**Behavior:** change a task's position in the list.

**Introduced guarantee:** the list preserves the selected order during the current execution.

**Delivered value:** a person can organize tasks in whichever order makes the most sense.

## Primitive assessment result

The current primitives are sufficient to build every stage of the task application:

- `command`
- `event`
- `error`
- `policy`
- `projection`
- `query`
- `procedure`
- resolver as a function belonging to a procedure

The current use case does not require `effect` because it has no external interactions or asynchronous work. It also does not require `workflow` because no feature depends on causal coordination between multiple procedures.

No need for another primitive has been identified. The outstanding matters are domain decisions or incomplete contracts of the existing primitives.

## Open questions

These questions must be answered before the contracts of the first implementation can be considered complete.

### 1. Context public API

The context semantics and transactional materialization phases are defined, but the public API still needs to determine:

- How context capabilities are registered and provided to the kernel.
- How primitives receive the parts of context available to them.
- How materialization policies other than the transactional clock are represented.

## Next step

Continue resolving the open questions one at a time without choosing API shapes or runtime mechanisms before their requirements are discussed. Implement the use-case stages incrementally as the contracts required by each stage are completed.
