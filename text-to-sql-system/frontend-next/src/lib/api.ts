export type QueryResponse = {
  natural_language_response: string;
  sql_query: string;
  data: Array<Record<string, string | number | null>>;
  explanation: string;
  visualization_type: string;
  status?: string;
  clarification_questions?: string[];
};

export type SchemaColumn = {
  name: string;
  type: string;
  nullable?: boolean;
};

export type SchemaAnnotation = {
  name: string;
  type: string;
  description: string;
};

export type SchemaAlias = {
  alias: string;
  column: string;
};

export type SchemaMetric = {
  name: string;
  sql: string;
  description?: string;
};

export type SchemaAnnotationsPayload = {
  columns: SchemaAnnotation[];
  aliases: SchemaAlias[];
  metrics: SchemaMetric[];
};

export type HistoryEntry = {
  id: number;
  table_name: string;
  natural_query: string;
  sql_query: string;
  status: string;
  error?: string | null;
  created_at: string;
};

export type DashboardPin = {
  id: number;
  table_name: string;
  natural_query: string;
  sql_query: string;
  visualization_type: string;
  created_at: string;
};

export type UploadResponse = {
  message: string;
  table_name: string;
  schema?: {
    columns?: SchemaColumn[];
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchTables(): Promise<string[]> {
  const result = await request<{ tables: string[] }>("/api/tables");
  return result.tables || [];
}

export async function processQuery(query: string, tableName: string): Promise<QueryResponse> {
  return request<QueryResponse>("/api/query", {
    method: "POST",
    body: JSON.stringify({ query, table_name: tableName }),
  });
}

export async function runSqlQuery(tableName: string, sqlQuery: string): Promise<QueryResponse> {
  return request<QueryResponse>("/api/query-run-sql", {
    method: "POST",
    body: JSON.stringify({ table_name: tableName, sql_query: sqlQuery }),
  });
}

export async function uploadFile(file: File, tableName: string): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("table_name", tableName);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Upload failed: ${res.status}`);
  }

  return res.json() as Promise<UploadResponse>;
}

export async function fetchSchema(tableName: string): Promise<SchemaColumn[]> {
  const result = await request<{ schema: { columns?: SchemaColumn[] } }>(`/api/schema?table=${encodeURIComponent(tableName)}`);
  return result.schema?.columns || [];
}

export async function fetchAnnotations(tableName: string): Promise<SchemaAnnotationsPayload> {
  const result = await request<{ annotations: SchemaAnnotationsPayload | SchemaAnnotation[] }>(
    `/api/schema-annotations?table=${encodeURIComponent(tableName)}`
  );
  const annotations = result.annotations;
  if (Array.isArray(annotations)) {
    return { columns: annotations, aliases: [], metrics: [] };
  }
  return {
    columns: annotations?.columns || [],
    aliases: annotations?.aliases || [],
    metrics: annotations?.metrics || [],
  };
}

export async function saveAnnotations(tableName: string, annotations: SchemaAnnotationsPayload): Promise<void> {
  await request<{ status: string }>("/api/schema-annotations", {
    method: "POST",
    body: JSON.stringify({ table_name: tableName, annotations }),
  });
}

export async function fetchHistory(limit = 20): Promise<HistoryEntry[]> {
  const result = await request<{ history: HistoryEntry[] }>(`/api/history?limit=${limit}`);
  return result.history || [];
}

export async function pinDashboard(payload: Omit<DashboardPin, "id" | "created_at">): Promise<void> {
  await request<{ status: string }>("/api/dashboards", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchDashboardPins(): Promise<DashboardPin[]> {
  const result = await request<{ pins: DashboardPin[] }>("/api/dashboards");
  return result.pins || [];
}

export async function fixQuery(payload: { table_name: string; natural_query: string; error: string }) {
  return request<{ fixed_query: string; analysis: string }>("/api/query-fix", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function regenerateSql(payload: {
  table_name: string;
  natural_query: string;
  current_sql?: string;
  error?: string | null;
  result_sample?: Array<Record<string, string | number | null>>;
}) {
  return request<{ sql_query: string }>("/api/query-regenerate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function explainSql(payload: {
  table_name: string;
  sql_query: string;
  natural_query?: string;
  result_sample?: Array<Record<string, string | number | null>>;
}) {
  return request<{ explanation: string }>("/api/sql-explain", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function drilldownQuery(payload: { table_name: string; sql_query: string }) {
  return request<{ data: Array<Record<string, string | number | null>> }>("/api/query-drilldown", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function renameTable(payload: { old_name: string; new_name: string }) {
  return request<{ status: string; table_name: string }>("/api/table-rename", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
