// code-review-graph: pre-tool hook for oh-my-pi (omp).
//
// Mirrors the Cursor `beforeShellExecution` + OpenCode `tool.execute.before`
// pre-commit behaviors. When the bash tool is invoked with `git commit ...`
// we run `code-review-graph detect-changes --brief` and surface the result.
// The hook NEVER blocks the commit — it returns ``undefined`` even on errors.
//
// Installed by: code-review-graph install --platform omp

export default function (omp: any) {
  omp.on?.('tool_call', async (event: any, ctx: any) => {
    try {
      const tool = String(event?.toolName ?? event?.name ?? '').toLowerCase();
      if (tool !== 'bash') return undefined;

      const input = event?.input ?? event?.params ?? {};
      const cmd = String(input?.command ?? input?.cmd ?? input?.content ?? '');
      if (!/^git\s+commit/i.test(cmd)) return undefined;

      const out = await runQuiet(ctx, 'code-review-graph detect-changes --brief');
      if (out) {
        ctx?.ui?.message?.('[code-review-graph] ' + out);
      }
    } catch {
      // Swallow — never block the commit.
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
