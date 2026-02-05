"use client";

import React, { useEffect, useState } from "react";
import { CalendarDays, Pin } from "lucide-react";
import { SmartChartCard } from "@/components/smart-chart-card";
import { drilldownQuery } from "@/lib/api";
import { useDataContext } from "@/components/data-provider";

export function DashboardBoard() {
  const { pins, refreshPins } = useDataContext();
  const [dataMap, setDataMap] = useState<Record<number, Array<Record<string, string | number | null>>>>({});

  useEffect(() => {
    refreshPins();
  }, []);

  useEffect(() => {
    const load = async () => {
      const entries = await Promise.all(
        pins.map(async (pin) => {
          try {
            const response = await drilldownQuery({ table_name: pin.table_name, sql_query: pin.sql_query });
            return [pin.id, response.data] as const;
          } catch {
            return [pin.id, []] as const;
          }
        })
      );
      const next: Record<number, Array<Record<string, string | number | null>>> = {};
      entries.forEach(([id, data]) => {
        next[id] = data;
      });
      setDataMap(next);
    };

    if (pins.length) {
      load();
    }
  }, [pins]);

  return (
    <div className="panel-surface">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="panel-title">Live Dashboard</span>
          <span className="chip">
            <Pin className="h-3 w-3" />
            {pins.length} pinned
          </span>
        </div>
        <button className="button-secondary">
          <CalendarDays className="h-3 w-3" />
          Last 90 days
        </button>
      </div>
      <div className="panel-body grid gap-3 md:grid-cols-2">
        {pins.map((pin) => (
          <SmartChartCard
            key={pin.id}
            data={dataMap[pin.id] || [{ status: "Loading", value: 0 }]}
            query={pin.natural_query}
            sql={pin.sql_query}
            title={pin.natural_query}
          />
        ))}
        {!pins.length && (
          <div className="text-sm text-zinc-500">No pinned charts yet.</div>
        )}
      </div>
    </div>
  );
}
