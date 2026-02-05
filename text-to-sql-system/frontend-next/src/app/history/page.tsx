"use client";

import { ShellLayout } from "@/components/shell-layout";
import { useDataContext } from "@/components/data-provider";

export default function HistoryPage() {
  const { history } = useDataContext();

  return (
    <ShellLayout
      headerLeft={<div className="text-sm text-zinc-300">Chat History</div>}
      headerRight={<div className="chip">Last 30 days</div>}
    >
      <div className="panel-surface">
        <div className="panel-header">
          <span className="panel-title">Recent Threads</span>
        </div>
        <div className="panel-body">
          <div className="data-grid overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="text-zinc-400">
                <tr className="border-b border-border">
                  <th className="px-2 py-2 text-left">Time</th>
                  <th className="px-2 py-2 text-left">Table</th>
                  <th className="px-2 py-2 text-left">Query</th>
                  <th className="px-2 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-b border-border">
                    <td className="px-2 py-2 text-zinc-300">{new Date(entry.created_at).toLocaleString()}</td>
                    <td className="px-2 py-2 text-zinc-200">{entry.table_name}</td>
                    <td className="px-2 py-2 text-zinc-200">{entry.natural_query}</td>
                    <td className="px-2 py-2 text-zinc-200">{entry.status}</td>
                  </tr>
                ))}
                {!history.length && (
                  <tr>
                    <td className="px-2 py-3 text-zinc-500" colSpan={4}>
                      No history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ShellLayout>
  );
}
