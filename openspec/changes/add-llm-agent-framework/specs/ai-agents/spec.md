## ADDED Requirements

### Requirement: Agent Definition Format

The project SHALL define LLM agents using a standardized format that specifies purpose, triggers, inputs, outputs, tools used, and handoff conditions.

#### Scenario: Agent manifest contains required fields

- **GIVEN** an agent definition file at `openspec/agents/<agent-id>/prompt.md`
- **WHEN** the file is parsed
- **THEN** it SHALL contain:
  - A "Purpose" section describing the agent's responsibility
  - A "Triggers" section listing phrases that invoke the agent
  - An "Inputs" section specifying required parameters
  - An "Outputs" section describing what the agent produces
  - A "Tools Used" section listing MCP tools or CLI commands
- **AND** optionally a "Handoffs" section for delegation to other agents

#### Scenario: Agent prompt references correct project paths

- **GIVEN** an agent prompt that references files or commands
- **WHEN** the agent is invoked
- **THEN** all file paths SHALL be relative to the project root
- **AND** all commands SHALL use documented CLI tools (`openspec`, `npm`, `rg`)

---

### Requirement: Design Review Agent Evaluation

The Design Review Agent SHALL evaluate OpenSpec change proposals against defined quality criteria and produce a structured verdict.

#### Scenario: Reviewing a complete proposal

- **GIVEN** a change proposal at `openspec/changes/<change-id>/`
- **WHEN** the Design Review Agent is invoked with that change-id
- **THEN** it SHALL evaluate:
  - Completeness (required files present)
  - Clarity (problem statement and changes well-defined)
  - Scope (changes are tightly bounded)
  - Simplicity (minimal solution for stated problem)
  - Design Justification (design.md present when needed)
  - Testability (tasks include verification)
- **AND** produce a verdict of APPROVE, APPROVE WITH NOTES, REQUEST CHANGES, or NEEDS DISCUSSION
- **AND** list specific findings with scores per dimension

#### Scenario: Detecting missing design.md

- **GIVEN** a proposal that modifies multiple packages
- **WHEN** no `design.md` file exists in the change directory
- **THEN** the agent SHALL flag this as a required change
- **AND** suggest creating design.md with alternatives considered

#### Scenario: Detecting scope creep

- **GIVEN** a proposal with tasks that extend beyond the stated "What Changes"
- **WHEN** the agent reviews tasks.md
- **THEN** it SHALL identify tasks that are out of scope
- **AND** suggest moving them to a separate proposal

---

### Requirement: Agent Composition

The agent framework SHALL support composing multiple agents for complex workflows through sequential, parallel, or hierarchical patterns.

#### Scenario: Sequential handoff between agents

- **GIVEN** a workflow requiring Grammar Guardian after Design Review
- **WHEN** Design Review Agent detects grammar changes in a proposal
- **THEN** it SHALL indicate a handoff to Grammar Guardian
- **AND** pass relevant context (affected grammar files, change type)

#### Scenario: Parallel evaluation by multiple agents

- **GIVEN** a proposal affecting both rendering and 3D viewer
- **WHEN** invoked with scope "full"
- **THEN** multiple specialized agents MAY be invoked in parallel
- **AND** their findings SHALL be aggregated into a single response

---

### Requirement: Agent Prompt Storage

Agent prompts SHALL be stored in version-controlled files within the `openspec/agents/` directory, enabling review and iteration.

#### Scenario: Adding a new agent

- **GIVEN** a developer wants to add a new agent
- **WHEN** they create files in `openspec/agents/<agent-id>/`
- **THEN** the directory SHALL contain at minimum `prompt.md`
- **AND** MAY contain `checklist.md`, `examples/`, or other supporting files

#### Scenario: Updating an agent prompt

- **GIVEN** an existing agent prompt needs modification
- **WHEN** the developer edits `prompt.md`
- **THEN** the change SHALL be reviewable via git diff
- **AND** changes SHALL be documented in commit messages

---

### Requirement: Agent Trigger Recognition

Agents SHALL define trigger phrases that indicate when they should be invoked, enabling natural language activation.

#### Scenario: Matching a trigger phrase

- **GIVEN** a user message containing "review this proposal"
- **WHEN** matching against Design Review Agent triggers
- **THEN** the phrase SHALL match the trigger pattern "review proposal"
- **AND** the Design Review Agent SHALL be suggested for invocation

#### Scenario: Ambiguous trigger resolution

- **GIVEN** a user message that matches multiple agent triggers
- **WHEN** determining which agent to invoke
- **THEN** the system SHALL present options to the user
- **OR** use the most specific match based on context
