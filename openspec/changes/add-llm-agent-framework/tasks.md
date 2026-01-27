## 1. Foundation

- [ ] 1.1 Create `openspec/agents/` directory structure
- [ ] 1.2 Define agent manifest schema (YAML format for agent definitions)
- [ ] 1.3 Document agent interface conventions in `openspec/agents/README.md`

## 2. Design Review Agent (Reference Implementation)

- [ ] 2.1 Write `openspec/agents/design-review/prompt.md` with full system prompt
- [ ] 2.2 Create `openspec/agents/design-review/checklist.md` with evaluation criteria
- [ ] 2.3 Create example review output for `add-solidjs-ui-framework` proposal
- [ ] 2.4 Test prompt with Claude/Cursor on 2-3 existing proposals
- [ ] 2.5 Iterate on prompt based on test results

## 3. Core Maintenance Agents

- [ ] 3.1 Write Grammar Guardian prompt (`openspec/agents/grammar-guardian/prompt.md`)
- [ ] 3.2 Write OpenSpec Lifecycle Manager prompt
- [ ] 3.3 Write Renderer Consistency Agent prompt
- [ ] 3.4 Test each agent on relevant scenarios

## 4. Integration

- [ ] 4.1 Add agent directory to `.cursor/rules` or create Claude Project
- [ ] 4.2 Document agent invocation patterns in `openspec/AGENTS.md`
- [ ] 4.3 Create agent composition guide for multi-agent workflows

## 5. Validation

- [ ] 5.1 Review all prompts for consistency with `openspec/project.md`
- [ ] 5.2 Verify agents reference correct file paths and commands
- [ ] 5.3 Test agent handoffs (e.g., Design Review → Grammar Guardian)
