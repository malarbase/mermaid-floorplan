---
description: Debug an issue with the code-review-graph
---

Trace and reason about a bug using code-review-graph MCP tools.

1. Use `semantic_search_nodes` to locate code related to the issue.
2. Use `query_graph` with `callers_of` / `callees_of` to walk the call chain.
3. Use `detect_changes` to check whether a recent change is the trigger.
4. Use `get_impact_radius` on suspected files to scope the blast radius.
