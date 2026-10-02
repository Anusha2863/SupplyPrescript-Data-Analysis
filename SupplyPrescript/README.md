# SupplyPrescript – Supply Chain Performance Dashboard

Full-stack project using React + Vite, FastAPI and PostgreSQL.

## New algorithm: Supply Chain Risk Score (SCRS)

A deterministic, explainable 0–100 risk score using:
- Inventory Risk 25%
- Defect Risk 20%
- Lead-Time Risk 20%
- Shipping-Cost Risk 15%
- Availability Risk 20%

Risk levels: Low < 35, Medium 35–64.99, High >= 65. No machine learning is used.

## Run

### PostgreSQL with Docker
`docker compose up -d db`

### Backend
```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

If PostgreSQL is not available, set `USE_CSV_FALLBACK=true` in `backend/.env`.

### Frontend
Open a second terminal:
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

API docs: http://localhost:8000/docs
