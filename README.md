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

Business rules, expected failures, facts, read structures, and composition relationships cannot remain hidden inside handlers, callbacks, or internal execution details.

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

They do not receive broad capabilities for changing the system and cannot hide:

- Side effects.
- Business decisions.
- Expected failures.
- Calculations that belong to another responsibility.

A calculation remains allowed when it constitutes the explicit responsibility of a contract. For example, a resolver may purely calculate event data from a command and its declared queries. It cannot use that calculation to hide a policy, produce an effect, or change state directly.

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

### Policy

A `policy` declares a business decision based on the current state.

It receives the result of one or more queries and returns `true` when the condition is satisfied or a declared error when the action must be rejected.

A policy does not validate the structure of data, change state, or execute the action.

Policies are evaluated when the system attempts to register new events. At that point, their queries observe the current state protected by SQLite's single-writer model.

### Projection

A `projection` defines an atomic data structure designed for reading.

It processes registered events to determine the state required for a specific purpose. A projection does not need to reproduce a complete model or follow a traditional create, read, update, and delete structure.

Different projections may exist for different read requirements even when they concern the same concept.

### Query

A `query` defines a read offered by the application.

It may use one or more projections and declares its own schema and result type. There is no required one-to-one correspondence between a query and a projection.

Its definition may contain details such as SQL, but those details are not part of using the query. Its consumers depend only on its declared inputs and result.

### Procedure

A `procedure` composes the contracts required to form a feature.

Each procedure:

- Registers exactly one command.
- Has exclusive responsibility for that command.
- Prevents another procedure from registering the same command.
- Receives one or more policies.
- Receives one or more resolvers.

#### Resolver

A resolver is not an independent primitive. It is a function declared as part of a procedure.

Each resolver:

- Receives the data of the command registered by the procedure.
- May declare a dependency on one or more queries.
- Receives the results of those queries.
- Returns exactly one event.
- Returns only the event description, without changing state or producing effects.

A procedure may have more than one resolver. The system processes resolvers in the order in which they were declared and creates their events in the same order.

This order guarantees a deterministic registration sequence, but it does not represent a causal dependency between events. The application must not use a resolver's position to express that its event depends on another.

## Future capabilities

The capabilities in this section have been identified but are not part of the first implementation. Their contracts remain open until a concrete use case requires each one.

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

## Technical constraints of the first implementation

### Runtime

The first implementation uses Deno as its JavaScript runtime.

The back end, primitives, SQLite access, checks, and executable examples must work in the environment provided by Deno.

Implementation decisions should prefer capabilities available in the runtime itself and avoid introducing tools or dependencies that are not required to validate the architecture.

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

### Strong consistency

The state used for decisions and the state presented by projections follow a strong-consistency model.

- Policies are evaluated when the system attempts to register new events.
- The queries provided to policies read the latest state available at that moment.
- No other write can be interleaved between the decision and the registration of events.
- Events and projection updates are completed within the same synchronous flow.
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

## Use-case stages

Each stage delivers a new, concrete use and serves as a unit for evaluating the architecture.

### Stage 1 — Add tasks

**Behavior:** add a task by providing its text.

**Introduced guarantees:**

- The task receives a unique identifier.
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

### 1. Origin of the task identifier

The person provides only the text, but the creation event needs to contain a complete and stable identifier.

It is necessary to decide:

- Whether the layer that creates the command generates the identifier and includes it in the input.
- Or whether Hyperkernel will provide an explicit capability for generating that identifier.

It must also be defined how the uniqueness guarantee will be expressed and verified.

### 2. Projection update contract

A projection processes events to determine its state, but its contract still needs to declare:

- Which events it accepts.
- How each event transforms its state.
- Which structures it may change.
- The resulting format.

This outstanding matter should complete the `projection` primitive without creating a new primitive.

### 3. Query input contract

A query already declares its result, but it still needs to clearly declare:

- The structure of its input.
- The projections on which it depends.
- The reads it is authorized to perform.

This contract will be required to retrieve a task by identifier, verify its existence, and obtain its current position.

### 4. Behavior of invalid transitions

It is necessary to decide what happens when a person attempts to:

- Complete a task that is already completed.
- Reopen a task that is already open.
- Move a task to an invalid position.

Each situation may be accepted without a change, rejected by a policy with a declared error, or receive another explicit rule. The chosen behavior belongs to the application domain and does not require a new primitive.

## Next step

Answer the open questions one at a time, beginning with the origin of the task identifier. After that, analyze the first stage using the incremental evaluation method and begin implementing the contracts required to add a task.
