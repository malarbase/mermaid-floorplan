---
description: Plan and execute a refactor with code-review-graph
---

Use code-review-graph to refactor safely.

1. Use `refactor_tool` (mode=`suggest`) or mode=`dead_code` to find candidates.
2. For renames use `refactor_tool` (mode=`rename`) to preview, then `apply_refactor_tool` to commit.
3. After the refactor run `detect_changes` to confirm impact.
4. Use `get_impact_radius` and `get_affected_flows` to make sure no critical path is broken.
