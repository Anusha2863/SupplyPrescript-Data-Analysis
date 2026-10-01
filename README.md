# Supply Chain Intelligence — React + Vite

A dark, responsive supply-chain analytics website built with React, Vite, Recharts and PapaParse.

## 1. Requirements
- Node.js 18+ (Node 20+ recommended)
- VS Code or another editor

## 2. Install
Open a terminal inside this folder:

```bash
npm install
```

## 3. Run
```bash
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## 4. Build
```bash
npm run build
```

## Dataset
The supplied CSV is already placed at `public/supply_chain_data.csv`. The app reads it automatically in the browser.

## Pages
- Dashboard
- Products
- Inventory
- Suppliers
- Logistics
- Manufacturing
- Quality
- Insights

## Notes
- Filters are global for the current page.
- Search scans all visible CSV fields.
- Insights use transparent rule-based thresholds, not AI/ML.
- To use another CSV, replace `public/supply_chain_data.csv` while keeping the same column names.
