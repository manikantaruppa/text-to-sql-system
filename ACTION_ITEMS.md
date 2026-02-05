# Action Items — Case Study vs. Current Product

## Case Study Coverage (What It Includes)
- **Business goal**: GenAI insights for HCP market research + sales intelligence.
- **Architecture**: Multi‑layered stack (UX → API Gateway/LLM Orchestration → Core Intelligence → Processing/Storage → Infra/Ops).
- **Core intelligence services**:
  - Structured Query Service (SQL + semantic layer)
  - Unstructured Retrieval Service (RAG + vector search)
  - LLM Synthesis Engine (evidence aggregation + final answer)
  - Guardrails & Safety
- **Data flow**: request → intent routing → parallel retrieval → re‑ranking → synthesis → guardrails → response.
- **Security & compliance**: RBAC, audit, PII/PHI redaction, encryption (at rest & in transit), HIPAA/GDPR alignment.
- **Scalability & performance**: P95 latency, 99.9% uptime, horizontal scaling, caching.
- **Operations**: Observability stack (metrics/logs/tracing), monitoring, alerts.
- **Model strategy**: no fine‑tuning for v1; consider if latency/cost becomes an issue.
- **Roadmap**: phased implementation (foundation → core intelligence → UX → advanced → hardening).
- **KPIs**: adoption, accuracy, citation quality, latency, uptime, time‑to‑insight.

## Current Product Coverage (What We Already Have)
- **Structured Query Service**: NL → SQL generation, safety validation, execution, analysis.
- **Schema intelligence**: schema analysis + annotations (aliases/metrics), injected into prompts.
- **Guardrails**: SELECT‑only, identifier validation, LIMIT enforcement, SQL sanitization.
- **Self‑heal**: SQL fix, regenerate, explain, run‑edited SQL.
- **UI**: chat + artifact workspace, SQL editor, drilldown, dashboard pins.
- **Health**: LLM health checks + test endpoint.

## Gaps vs. Case Study (What’s Missing)
- **Unstructured Retrieval (RAG)**: no ingestion or vector search pipeline.
- **Evidence & citations**: no citation anchors in responses.
- **Orchestration router**: no intent routing (SQL vs RAG vs Hybrid).
- **PII/PHI redaction**: no redaction pipeline before LLM or response.
- **Observability & KPIs**: no query quality scoring or latency SLAs tracking.
- **Governance**: no data lineage, retention, or access‑policy framework.

---

# Action Items (Complete Plan)

## Phase 0 — Immediate Hygiene (1–2 weeks)
1. **Define data privacy policy**
   - Decide if LLM is local or external.
   - Document what data can be sent to LLM.
2. **Add evaluation harness (baseline)**
   - Gold‑query set (20–50 questions) + expected SQL.
   - Log accuracy % and SQL execution success.
3. **LLM failure taxonomy**
   - Standardize error types (bad SQL, missing schema, timeout, empty response).

## Phase 1 — RAG Foundation (2–4 weeks)
1. **Document ingestion pipeline**
   - Parse PDFs, transcripts, PPTs.
   - Chunk + embed + store in vector DB.
2. **Vector DB selection**
   - pgvector (local), Pinecone, or Weaviate.
3. **RAG query service**
   - Retrieve top‑k passages; return to LLM with citations.

## Phase 2 — Orchestration + Hybrid Retrieval (4–6 weeks)
1. **Intent router**
   - Decide: SQL only, RAG only, or Hybrid.
2. **Evidence re‑ranking**
   - Use cross‑encoder or LLM reranker for citations.
3. **Hybrid response synthesis**
   - Combine SQL results + document evidence.

## Phase 3 — Trust & Compliance (3–5 weeks)
1. **PII/PHI detection + redaction**
   - Pre‑LLM and post‑LLM response sanitization.
2. **RBAC & audit logs**
   - Restrict by user role + log query access.
3. **Response citations**
   - Always include evidence references.

## Phase 4 — Observability & KPIs (2–4 weeks)
1. **Metrics instrumentation**
   - P50/P95 latency, error rate, LLM cost, token usage.
2. **Quality KPIs**
   - Query accuracy, citation coverage, user satisfaction.
3. **Dashboards**
   - Engineering dashboard + product KPI dashboard.

## Phase 5 — Enterprise Hardening (4–6 weeks)
1. **Security hardening**
   - TLS, encryption, secrets rotation.
2. **Disaster recovery**
   - Backups, restore drills.
3. **Cost controls**
   - Rate limits, prompt caching, routing thresholds.

---

# Recommendations (My Take)

## Must‑Do for Enterprise Readiness
- **Add unstructured RAG** (core case‑study requirement).
- **Add citations** (trust + compliance).
- **Implement PII/PHI redaction** (regulatory).
- **Add intent router** (hybrid intelligence).
- **Add evaluation harness** (prove quality).

## Optional but High‑Impact
- **SQL‑RAG library** of approved query patterns.
- **Schema‑RAG** retrieval for large schema environments.
- **User feedback loop** (thumbs up/down + error reasons).

---

# Suggested Deliverables
- Architecture diagram (updated for hybrid RAG)
- Evaluation report (accuracy + latency)
- Security & compliance checklist
- MVP milestone plan with owners and timelines
