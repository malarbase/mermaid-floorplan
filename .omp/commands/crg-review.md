---
description: Review code changes using the code-review-graph
---

Run a structured review of the current diff using code-review-graph MCP tools.

1. Call `detect_changes` for the risk-scored change summary.
2. Call `get_affected_flows` to find impacted execution paths.
3. For each high-risk function call `query_graph` with `pattern="tests_for"` to verify coverage.
4. Call `get_impact_radius` to understand the blast radius.
5. Group findings by risk level (high/medium/low) and finish with an explicit merge recommendation.
