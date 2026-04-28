// code-review-graph: post-tool hook for oh-my-pi (omp).
//
// Mirrors the Claude Code PostToolUse + SessionStart hooks:
//   - after edit/write/bash → `code-review-graph update --skip-flows`
//   - on session_start      → `code-review-graph status`
//
// Installed by: code-review-graph install --platform omp

// Pi/omp's HookAPI is provided at runtime; we use ``any`` to avoid pulling in
// the @oh-my-pi/pi-coding-agent typings at install time.
export default function (omp: any) {
  omp.on?.('tool_call', async (event: any, ctx: any) => {
    try {
      const tool = String(event?.toolName ?? event?.name ?? '').toLowerCase();
      if (['edit', 'write', 'bash'].includes(tool)) {
        await runQuiet(ctx, 'code-review-graph update --skip-flows');
      }
    } catch {
      // Swallow — graph may not be built for this project yet.
    }
    return undefined;
  });

  omp.on?.('session_start', async (_event: any, ctx: any) => {
    try {
      const out = await runQuiet(ctx, 'code-review-graph status');
      if (out) {
        ctx?.ui?.message?.('[code-review-graph] ' + out);
      }
    } catch {
      // Swallow.
    }
    return undefined;
  });
}

async function runQuiet(ctx: any, cmd: string): Promise<string> {
  try {
    const exec = ctx?.bash ?? ctx?.shell ?? ctx?.exec ?? (async () => '');
    const result = await exec(cmd);
    if (typeof result === 'string') return result.trim();
    return String(result?.stdout ?? result ?? '').trim();
  } catch {
    return '';
  }
}
