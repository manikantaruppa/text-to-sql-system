# Contributing

Thanks for your interest in contributing.

## Getting Started
1. Fork the repo and create a feature branch.
2. Install dependencies for backend and frontend.
3. Keep changes focused and easy to review.

## Development Workflow
1. Backend
```
cd text-to-sql-system
python3 -m venv .venv
source .venv/bin/activate
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
2. Frontend
```
cd text-to-sql-system/frontend-next
npm install
npm run dev -- --hostname 127.0.0.1 --port 3005
```

## Guidelines
- Prefer small, well-scoped pull requests.
- Add clear descriptions and context in PRs.
- Avoid committing secrets or `.env` files.

## Reporting Issues
Please include:
- What you expected vs. what happened
- Steps to reproduce
- Relevant logs or screenshots
