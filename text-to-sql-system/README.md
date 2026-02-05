# Text-to-SQL System (Service README)

This README focuses on local setup for the service code in `text-to-sql-system/`.
For a high-level overview, see the repository root `README.md`.

---

## Structure
```
text-to-sql-system/
├── backend/                 # FastAPI backend
│   ├── main.py
│   ├── prompting_service.py
│   ├── schema_analyzer.py
│   ├── requirements.txt
│   └── static/
├── frontend/                # Legacy React UI (kept for reference)
├── frontend-next/           # New Next.js UI (active)
└── .env                     # Runtime configuration (copy from .env.example)
```

---

## Prerequisites
- Python 3.10+
- PostgreSQL running locally
- Node.js 18+
- (Optional) Gemini API key for LLM

---

## Python Environment
```
cd text-to-sql-system
python3 -m venv .venv
source .venv/bin/activate
```

---

## Environment
Create `.env` in `text-to-sql-system/`:
```
cp .env.example .env
```

---

## Run the LLM (Gemini Wrapper)
The backend expects an OpenAI-style `/v1/completions` endpoint.
We provide `gemini_api_wrapper.py` which exposes this format.

**Start the wrapper:**
```
cd text-to-sql-system
source .venv/bin/activate
set -a && source .env && set +a
uvicorn gemini_api_wrapper:app --host 127.0.0.1 --port 8501
```

---

## Backend Setup
```
cd text-to-sql-system/backend
source ../.venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Frontend Setup (Next.js)
```
cd text-to-sql-system/frontend-next
npm install
npm run dev -- --hostname 127.0.0.1 --port 3005
```

Frontend is available at: `http://localhost:3005`

---

## Key Backend Endpoints
- `POST /api/upload` → Upload CSV, create table, store schema
- `POST /api/query` → Natural language → SQL → results
- `POST /api/query/run-sql` → Run edited SQL (safe)
- `GET /api/schema?table=...` → Full schema
- `GET/POST /api/schema/annotations` → Data dictionary metadata
- `GET /api/history` → Query history
- `GET/POST /api/dashboards` → Pinned dashboard items
- `POST /api/query/drilldown` → Drilldown rows
- `POST /api/query/fix` → LLM-assisted SQL fix
- `POST /api/query/regenerate` → LLM SQL regeneration
- `POST /api/sql/explain` → LLM SQL explanation
- `POST /api/table/rename` → Rename dataset/table
- `GET /api/tables` → List datasets
- `GET /api/llm/health` → LLM health (lightweight)
- `GET /api/llm/test` → LLM test call

---

## Troubleshooting
**LLM not generating SQL**
- Ensure the Gemini wrapper is running on the same port as `LOCAL_LLM_ENDPOINT`.
- Confirm `GOOGLE_API_KEY` is set in `.env`.

**Upload or query fails**
- Check backend logs for the exact error message.
- Ensure PostgreSQL is running and credentials match `.env`.

**Frontend cannot reach backend**
- Backend must run on `http://localhost:8000`.
- Next.js uses proxy routes (no CORS issues expected).

---

## Notes
- `frontend/` is legacy. Active UI is `frontend-next/`.
- Schema annotations are saved per table and reused across queries.
- LLM prompts include schema and may include small result samples; use a local LLM if you want data to stay on-device.

---

## Demo Flow (Suggested)
Use a wine dataset (e.g., `winemagdata_first150k`) and walk through:

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
