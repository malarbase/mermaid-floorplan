import { createSignal, createMemo, For, Show } from "solid-js";
import { useQuery } from "convex-solidjs";
import { api } from "../../../convex/_generated/api";

export default function AuditLog() {
  const [dateFrom, setDateFrom] = createSignal("");
  const [dateTo, setDateTo] = createSignal("");
  const [actionFilter, setActionFilter] = createSignal("all");
  
  // Cast api.admin to any because getAuditLog might not be in the generated types yet
  const auditLog = useQuery((api.admin as any).getAuditLog, { limit: 100 });
  
  const filteredLog = createMemo(() => {
    const log = auditLog.data();
    if (!log) return [];
    
    return log.filter((entry: any) => {
      // Date filter
      if (dateFrom()) {
        const fromTime = new Date(dateFrom()).getTime();
        if (entry.ts < fromTime) return false;
      }
      
      if (dateTo()) {
        const toTime = new Date(dateTo()).getTime() + 86400000; // End of day
        if (entry.ts > toTime) return false;
      }
      
      // Action filter
      if (actionFilter() !== "all") {
        if (actionFilter() === "featured") {
           // Heuristic for featured: project table + "Featured" in details
           if (entry.table !== "projects" || !entry.details.includes("Featured")) return false;
        } else if (actionFilter() === "promoted") {
           if (entry.table !== "users" || !entry.details.includes("Admin")) return false;
        } else if (actionFilter() === "deleted") {
           if (entry.action !== "deleted") return false;
        } else if (actionFilter() === "updated") {
           if (entry.action !== "updated") return false;
        }
      }
      
      return true;
    });
  });

  return (
    <div class="p-6">
      <div class="mb-8">
        <h1 class="text-3xl font-bold tracking-tight">📝 Audit Log</h1>
        <p class="text-base-content/60 mt-1">Track administrative actions and system changes</p>
      </div>
      
      <div class="flex flex-col md:flex-row gap-4 mb-6 bg-base-100 p-4 rounded-lg border border-base-200 shadow-sm">
        <div class="form-control w-full md:w-auto">
          <label class="label">
            <span class="label-text">From Date</span>
          </label>
          <input
            type="date"
            class="input input-bordered"
            value={dateFrom()}
            onInput={(e) => setDateFrom(e.currentTarget.value)}
          />
        </div>
        
        <div class="form-control w-full md:w-auto">
          <label class="label">
            <span class="label-text">To Date</span>
          </label>
          <input
            type="date"
            class="input input-bordered"
            value={dateTo()}
            onInput={(e) => setDateTo(e.currentTarget.value)}
          />
        </div>
        
        <div class="form-control w-full md:w-auto">
          <label class="label">
            <span class="label-text">Action Type</span>
          </label>
          <select 
            class="select select-bordered"
            value={actionFilter()}
            onChange={(e) => setActionFilter(e.currentTarget.value)}
          >
            <option value="all">All Actions</option>
            <option value="featured">Featured Projects</option>
            <option value="promoted">Admin Promotions</option>
            <option value="deleted">Deletions</option>
            <option value="updated">Updates</option>
          </select>
        </div>
      </div>
      
      <div class="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead>
              <tr class="bg-base-200/50">
                <th>Time</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <Show when={auditLog.isLoading()}>
                <For each={Array(5)}>
                  {() => (
                    <tr class="animate-pulse">
                      <td><div class="h-4 w-24 bg-base-300 rounded"></div></td>
                      <td><div class="h-4 w-16 bg-base-300 rounded"></div></td>
                      <td><div class="h-4 w-32 bg-base-300 rounded"></div></td>
                      <td><div class="h-4 w-32 bg-base-300 rounded"></div></td>
                      <td><div class="h-4 w-40 bg-base-300 rounded"></div></td>
                    </tr>
                  )}
                </For>
              </Show>

              <Show when={!auditLog.isLoading() && filteredLog().length === 0}>
                <tr>
                  <td colspan="5" class="text-center py-12 text-base-content/50">
                    No audit records found matching your filters
                  </td>
                </tr>
              </Show>

              <For each={filteredLog()}>
                {(entry: any) => (
                  <tr class="hover:bg-base-200/30 transition-colors">
                    <td class="whitespace-nowrap font-mono text-xs text-base-content/70">
                      {new Date(entry.ts).toLocaleString()}
                    </td>
                    <td>
                      <span class={`badge ${getActionBadgeClass(entry.action, entry.details)} badge-sm`}>
                        {getActionLabel(entry.action, entry.details)}
                      </span>
                    </td>
                    <td>
                      <div class="font-medium text-sm">{entry.actor}</div>
                    </td>
                    <td>
                      <div class="text-sm">{entry.target}</div>
                    </td>
                    <td class="text-sm text-base-content/70">
                      {entry.details}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
        <div class="p-2 text-center text-xs text-base-content/50 border-t border-base-200">
          Showing recent {filteredLog().length} of {auditLog.data()?.length ?? 0} records
        </div>
      </div>
    </div>
  );
}

function getActionBadgeClass(action: string, details: string): string {
  if (action === "deleted") return "badge-error";
  if (details.includes("Featured")) return "badge-warning";
  if (details.includes("Admin")) return "badge-primary";
  return "badge-ghost";
}

function getActionLabel(action: string, details: string): string {
  if (action === "deleted") return "Deleted";
  if (details.includes("Featured")) return "Featured";
  if (details.includes("Admin")) return "Promoted";
  return action.charAt(0).toUpperCase() + action.slice(1);
}
