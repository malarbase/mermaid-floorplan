## Context

The mermaid-floorplan project spans multiple technical domains:
- **Grammar/Parsing**: Langium DSL with 69 requirements
- **Rendering**: SVG, PNG, and 3D output with 18 requirements
- **3D Visualization**: Three.js with CSG operations (50 requirements)
- **MCP Integration**: AI tool exposure (14 requirements)
- **Interactive Editor**: Monaco-based editing (24 requirements)
- **OpenSpec Workflow**: Spec-driven development with 10 active proposals

A general-purpose LLM attempting to assist with this project faces cognitive overload. By defining specialized agents with focused responsibilities, we can:
1. Reduce context window usage by loading only relevant knowledge
2. Improve accuracy by constraining agent scope
3. Enable composition of agents for complex workflows
4. Provide clear handoff points between specialists

## Goals / Non-Goals

**Goals:**
- Define a taxonomy of agents covering project maintenance needs
- Specify the Design Review Agent as the reference implementation
- Establish agent interface conventions (triggers, outputs, handoffs)
- Enable both human-orchestrated and automated agent composition

**Non-Goals:**
- Building a custom agent runtime (use existing: Claude Projects, Cursor rules, LangGraph)
- Replacing human judgment for architectural decisions
- Automating code commits without human review
- Creating agents for non-project-specific tasks (e.g., general coding)

## Agent Architecture

### Agent Definition Structure

Each agent is defined by:

```yaml
agent:
  id: design-review-agent
  name: Design Review Agent
  purpose: Evaluate change proposals for completeness and quality
  
  triggers:
    - "review proposal"
    - "is this design complete"
    - "check design"
    
  inputs:
    - change_id: string  # OpenSpec change identifier
    - scope: "proposal" | "design" | "full"
    
  outputs:
    - verdict: "approve" | "request-changes" | "needs-discussion"
    - findings: Finding[]
    - suggestions: string[]
    
  tools_used:
    - openspec show
    - openspec validate
    - read_file
    - grep
    
  handoffs:
    - to: grammar-guardian  # When grammar changes detected
    - to: architecture-domain-expert  # When building code questions arise
```

### Agent Categories

| Category | Agents | Primary Responsibility |
|----------|--------|------------------------|
| **Core Maintenance** | Grammar Guardian, OpenSpec Lifecycle, Renderer Consistency | Day-to-day development |
| **Specialized Skills** | MCP Tool Designer, Test Synthesizer, Cross-Module Refactor | Technical deep-dives |
| **Process** | Release Coordinator, Documentation Curator, Design Review | Workflow management |
| **Domain** | Architecture Expert, 3D/WebGL Specialist | Domain knowledge |

### Composition Patterns

**Sequential Pipeline:**
```
User Request → Design Review Agent → Grammar Guardian → Test Synthesizer → Done
```

**Parallel Fan-Out:**
```
                      ┌→ Grammar Guardian ──────┐
User Request → Router ├→ Renderer Consistency ──┼→ Aggregator → Response
                      └→ Test Synthesizer ──────┘
```

**Hierarchical Delegation:**
```
Design Review Agent
  └→ delegates: "Check grammar changes" → Grammar Guardian
  └→ delegates: "Validate 3D impact" → 3D Specialist
  └→ synthesizes findings
```

## Design Review Agent (Reference Implementation)

### Purpose

Evaluate OpenSpec change proposals before implementation begins, ensuring:
- Proposals are complete and well-reasoned
- Design decisions are documented when needed
- Tasks are actionable and verifiable
- Spec deltas follow conventions

### Evaluation Criteria

The agent evaluates proposals against these dimensions:

| Dimension | Weight | Criteria |
|-----------|--------|----------|
| **Completeness** | 25% | All required files present (proposal.md, tasks.md, spec deltas) |
| **Clarity** | 20% | Problem statement is unambiguous, changes are well-defined |
| **Scope** | 15% | Changes are tightly scoped, no scope creep |
| **Simplicity** | 15% | Follows "simplicity first" principle from AGENTS.md |
| **Design Justification** | 15% | design.md present when criteria met (cross-cutting, new deps) |
| **Testability** | 10% | Tasks include verification steps, scenarios are testable |

### Decision Matrix

```
Score 85-100%: APPROVE
  → "Proposal is ready for implementation"
  
Score 70-84%: APPROVE WITH NOTES
  → "Proposal is acceptable with minor suggestions"
  → List non-blocking suggestions
  
Score 50-69%: REQUEST CHANGES
  → "Proposal needs revisions before implementation"
  → List required changes with specific guidance
  
Score <50%: NEEDS DISCUSSION
  → "Proposal requires clarification or rethinking"
  → List open questions
  → Suggest scheduling discussion
```

### Checklist (Detailed)

**1. Proposal.md Validation**
- [ ] Has "Why" section explaining problem/opportunity
- [ ] Has "What Changes" section with bullet list
- [ ] Breaking changes marked with **BREAKING**
- [ ] Has "Impact" section listing affected specs and code
- [ ] Problem statement is specific, not vague

**2. Design.md Evaluation**
- [ ] Present if change is cross-cutting (multiple packages)
- [ ] Present if introducing new external dependency
- [ ] Present if significant data model changes
- [ ] Contains "Alternatives considered" section
- [ ] Risks and mitigations identified
- [ ] Migration plan included (if applicable)

**3. Tasks.md Quality**
- [ ] Tasks are ordered logically
- [ ] Each task is small and verifiable
- [ ] Dependencies between tasks are noted
- [ ] Includes validation/testing tasks
- [ ] No tasks > 4 hours estimated work

**4. Spec Deltas Conformance**
- [ ] Uses correct operation headers (ADDED/MODIFIED/REMOVED)
- [ ] Every requirement has at least one scenario
- [ ] Scenarios use #### header format
- [ ] Requirements use SHALL/MUST language
- [ ] No duplicate requirements across capabilities

**5. Simplicity Assessment**
- [ ] Solution is minimal for the stated problem
- [ ] No unnecessary abstractions introduced
- [ ] No "future-proofing" without concrete requirements
- [ ] Reuses existing patterns where possible

### Example Output

```markdown
## Design Review: add-solidjs-ui-framework

**Verdict:** REQUEST CHANGES (Score: 68%)

### Findings

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completeness | 90% | All files present ✓ |
| Clarity | 75% | Why is clear, some What items vague |
| Scope | 50% | Scope creep: includes theming changes |
| Simplicity | 60% | Introduces 3 new abstractions |
| Design Justification | 80% | Good alternatives analysis |
| Testability | 70% | Missing visual regression tests |

### Required Changes

1. **Narrow scope**: Remove theming changes to separate proposal
2. **Justify StateManager abstraction**: Why not use Solid's built-in stores?
3. **Add visual regression testing task**: Currently no UI testing strategy

### Suggestions (Non-Blocking)

- Consider incremental migration path starting with viewer-core
- Link to Solid.js migration guide in design.md
```

## Implementation Options

### Option A: System Prompts Only (Recommended for v1)

Implement agents as documented system prompts that humans invoke:
- Store in `openspec/agents/<agent-id>/prompt.md`
- Include in Claude Projects or Cursor rules
- No code changes required

**Pros:** Zero implementation cost, immediately usable
**Cons:** No automation, relies on human orchestration

### Option B: MCP Tool Extension

Add agent orchestration as MCP tools:
- `invoke_agent(agent_id, inputs)` tool
- Server-side prompt management
- Tool chaining for composition

**Pros:** Integrates with existing MCP server, automatable
**Cons:** Requires implementation, prompt versioning complexity

### Option C: External Orchestration (LangGraph/CrewAI)

Use dedicated agent frameworks:
- Define agents as nodes in a graph
- External runtime handles composition
- Separate deployment from mermaid-floorplan

**Pros:** Production-grade orchestration, observability
**Cons:** New dependency, operational complexity, overkill for project size

## Risks / Trade-offs

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Prompt drift (prompts get stale) | High | Medium | Version prompts in git, review in PRs |
| Over-reliance on agents | Medium | Medium | Keep human approval gates |
| Agent conflicts (contradictory advice) | Low | High | Clear handoff protocols, single owner per domain |
| Maintenance burden | Medium | Low | Start with 3-4 agents, add only when needed |

## Open Questions & Research

### Claude Code Documentation Findings

Research into [Claude Code's subagent documentation](https://code.claude.com/docs/en/sub-agents#project-level-hooks-for-subagent-events) reveals the following guidance:

**1. Prompt Storage Location**

**Recommendation: `.claude/agents/` (project-level)**

Claude Code defines three scope levels:
- **Project-level** (`.claude/agents/`): "Check them into version control so your team can use and improve them collaboratively"
- **User-level** (`~/.claude/agents/`): Available across all projects
- **CLI-defined**: Session-only for quick testing

For OpenSpec alignment, this suggests:
- Primary location: `.claude/agents/` (follows Claude conventions)
- Alternative: `openspec/agents/` (follows OpenSpec conventions)
- **Decision needed**: Choose between Claude-native path vs OpenSpec consistency

**2. Versioning Strategy**

**Recommendation: Git-based versioning, not semver**

The documentation emphasizes storing agents in version control alongside code but provides no explicit versioning scheme. This implies:
- Version through git history (commit-based tracking)
- Use OpenSpec proposals to track agent changes
- Rely on git tags/releases when coordination is needed
- **No semver needed** - agents are infrastructure-as-code, not published artifacts

**3. Validation Tooling**

**Recommendation: Hook-based validation, not compile-time checks**

Claude Code uses `PreToolUse` hooks for runtime validation rather than static analysis:
- Validate what agents *do* (runtime behavior)
- Not what prompts *say* (static content)
- Focus on constraining capabilities, not checking syntax

For OpenSpec integration:
- `openspec validate` should **not** check agent prompts
- Use hooks to validate agent operations (e.g., prevent destructive changes)
- Keep agents as prose documents, not structured data

**4. Metrics for Agent Effectiveness**

**No recommendations provided** - documentation focuses on configuration and capability control, not observability.

This is an **open design space**. Potential approaches:
- Track invocation counts in git commit messages
- Manual effectiveness reviews during retrospectives
- User feedback collection (thumbs up/down after agent runs)
- Time-to-completion metrics for agent-assisted tasks

### Remaining Open Questions

1. **Path choice**: Use `.claude/agents/` (Claude-native) or `openspec/agents/` (project-native)?
2. **Agent discovery**: How should humans/tools discover available agents?
3. **Prompt format**: Markdown with YAML frontmatter, or plain Markdown?
4. **Testing strategy**: How do we regression-test agent behavior as prompts evolve?
