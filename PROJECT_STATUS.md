# Project Status — Feb 4, 2026

## Backend (FastAPI + Postgres)
- CSV upload pipeline works; tables created and schema stored.
- Query pipeline: NL → SQL (LLM) → SQL validation → execution → analysis.
- Safety guardrails: SELECT-only, identifier validation, LIMIT enforced, read-only execution + timeouts.
- LLM SQL sanitation: strips leading labels/code fences and trailing semicolons before validation.
- Error recovery: LLM fix prompt wired (one retry) and self-heal can re-run fixed SQL.
- New storage tables:
  - `schema_annotations` (data dictionary)
  - `query_history`
  - `dashboard_pins`
- New endpoints:
  - `GET /api/schema?table=...`
  - `GET/POST /api/schema/annotations`
  - `GET /api/history`
  - `GET/POST /api/dashboards` and `/api/dashboards/pin`
  - `POST /api/query/fix`
  - `POST /api/query/drilldown`
  - `POST /api/table/rename`
- LLM errors now return meaningful messages (no empty `detail`).
 - Added LLM health caching + lightweight ping (no model call).
 - Added SQL regeneration endpoint with DB error/output context: `POST /api/query/regenerate`.
 - Added SQL explanation endpoint: `POST /api/sql/explain`.
 - Added clarification flow for ambiguous queries (returns `status: "clarify"` + questions).
 - Schema annotations now support semantic mappings (aliases + metrics) and are injected into prompts.
 - Analysis response parsing hardened with JSON extraction + fallback summary/visual type inference.

## Frontend (Next.js in `text-to-sql-system/frontend-next/`)
- Full dark-mode SaaS shell with sidebar + split panes.
- Live upload → schema detection → table selection.
- Real-time chat history + query results.
- SQL tab shows real generated SQL in Monaco editor.
- Schema editor loads/saves annotations.
- Drilldown drawer uses live data.
- Dashboard pins persist and render live data.
- API routes proxy to backend to avoid CORS.
 - SQL tab supports Run (no LLM), Regenerate (LLM with context), Explain (Markdown rendered).
 - Clarification UI: chat shows clarifying questions and stitches user answer to original query.
 - Schema editor supports Column Aliases + Metrics.
 - LLM status badge now uses cached health check (no model calls).
 - Artifact UI refinements: Question card, Result Summary card, and cleaner explanation panel.
 - Explanation UI: structured steps + summary, copy summary action, and detail toggle.
 - Removed redundant one-line summary; explanation only shown on demand.

## Known Issues / Next Checks
- LLM connection can fail if Gemini wrapper or API key is not configured; check `/api/llm/health` and `/api/llm/test`.
- Ensure backend restarted after latest changes.

## How to Run
### Backend
```
cd text-to-sql-system
python3 -m venv .venv
source .venv/bin/activate
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (Next.js)
```
cd text-to-sql-system/frontend-next
npm install
npm run dev -- --hostname 127.0.0.1 --port 3005
```

## Suggested Next Steps
1) Add SQL guardrails with role-based access + column allowlists.
2) Build internal benchmark (execution + test-suite accuracy).
3) Address lint warnings and add lightweight tests.

---

## Demo Flow (Suggested)
1) Upload CSV → confirm schema detection + table selection  
2) Query 1 (Country Performance)  
   - NL: Show the average points, average price, and wine count for the top 10 countries by number of wines  
   - Expect: Bar chart + Pin + Explain + View SQL  
3) Query 2 (Premium Wines Discovery)  
   - NL: Find the top 15 highest rated wines with price over 100 dollars, show winery, variety, points, price and country  
   - Expect: Table + Drill‑down + Edit SQL in Monaco + Run  
4) Query 3 (Best Value Analysis)  
   - NL: What are the top 10 grape varieties with the best average rating for wines priced under 30 dollars with at least 100 wines  
   - Expect: Aggregation + Schema tab + Export CSV + Regenerate SQL  
5) Open Dashboard → verify pinned charts render live data
