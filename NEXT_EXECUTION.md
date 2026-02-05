# Next Execution — Data Privacy + Schema‑RAG Plan

## Goal
Reduce data exposure when sending prompts to frontier LLMs (e.g., Gemini) while preserving query quality using **Schema‑RAG** and strict data minimization.

## Why Schema‑RAG Helps Privacy
- It retrieves **only the relevant schema context** (table/column names, types, glossary/aliases) instead of sending raw data rows.
- It enables accurate SQL generation without shipping sensitive row‑level values to external models.

---

## Scope (Phase 1)
1) **Data Privacy Controls** (prompt minimization + redaction)
2) **Schema‑RAG** (schema index + retrieval + prompt injection)
3) **Configurable LLM Routing** (local vs frontier)
4) **Audit + Monitoring** (what was sent, to whom, and when)

---

## Execution Plan

### 1) Privacy Policy & Data Classification
- Define data classes: Public, Internal, Sensitive, PHI/PII.
- Decide what can be sent to external LLMs.
- Default policy: **No row‑level data** to frontier models.

**Deliverables**
- `DATA_PRIVACY_POLICY.md`
- Config flags in `.env`:
  - `ALLOW_FRONTIER_LLM=true|false`
  - `ALLOW_ROW_SAMPLES=false` (default)
  - `ALLOW_SCHEMA_ONLY=true`

### 2) Prompt Minimization Layer
- Build a prompt sanitizer that:
  - Removes values, sample rows, and identifiers marked sensitive.
  - Allows only **Schema‑RAG output** for frontier calls.
- Introduce a **prompt budget** (max tokens for schema context).

**Acceptance**
- No row values are present in LLM payloads when `ALLOW_ROW_SAMPLES=false`.

### 3) Schema‑RAG Implementation
- Create a schema index from:
  - table name
  - columns + types
  - annotations (aliases, metrics)
  - relationships
- Build retrieval by:
  - keyword match + embedding similarity
  - top‑k relevant schema fragments
- Inject only retrieved schema into SQL prompt.

**Acceptance**
- LLM prompts include only relevant schema fragments.
- Query accuracy improves vs sending full schema.

### 4) LLM Routing Policy
- Route based on sensitivity:
  - **Sensitive data** → local LLM only
  - **Non‑sensitive** → frontier allowed
- Add a **UI indicator** showing which model was used.

### 5) Audit + Monitoring
- Log:
  - model used (local vs frontier)
  - prompt size (tokens)
  - whether row data was included
- Add dashboards for compliance.

---

## Suggested Implementation Notes
- **Backend**: add a `prompt_policy.py` module to sanitize and control payloads.
- **Schema‑RAG**: store schema embeddings in a lightweight vector store (pgvector).
- **Frontend**: show a “Data Privacy” badge in the artifact panel (Local vs Frontier).

---

## Milestones & Timeline (Draft)
- Week 1: Privacy policy + configuration switches
- Week 2: Prompt minimizer + logging
- Week 3–4: Schema‑RAG index + retrieval
- Week 5: Routing logic + UI indicator

---

## Open Questions
1) Do we allow **any** row samples for frontier models? (default: no)
2) Which vector store do we standardize on? (pgvector / Pinecone / Weaviate)
3) Do we need **field‑level masking** for partial exposure?

---

## Decision
Yes — **Schema‑RAG is the right approach** to reduce data exposure while keeping LLM quality. We should implement it before expanding frontier usage.
