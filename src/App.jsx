import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Papa from 'papaparse';
import {
  Activity, AlertTriangle, BarChart3, Bell, Boxes, Brain, CheckCircle2,
  ChevronDown, Clock3, DollarSign, Factory, Gauge, LayoutDashboard,
  Lightbulb, Menu, Package, RefreshCw, Search, ShieldAlert, ShieldCheck,
  Truck, Users, X, TrendingUp, Zap, Target, CircleDot
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis
} from 'recharts';

const MAIN_API = 'http://127.0.0.1:8000';
const ML_API = 'http://127.0.0.1:8001';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, subtitle: 'Executive overview' },
  { to: '/products', label: 'Products', icon: Package, subtitle: 'Demand & revenue' },
  { to: '/inventory', label: 'Inventory', icon: Boxes, subtitle: 'Stock health' },
  { to: '/suppliers', label: 'Suppliers', icon: Users, subtitle: 'Performance & reliability' },
  { to: '/logistics', label: 'Logistics', icon: Truck, subtitle: 'Shipping efficiency' },
  { to: '/manufacturing', label: 'Manufacturing', icon: Factory, subtitle: 'Production & cost' },
  { to: '/quality', label: 'Quality', icon: ShieldCheck, subtitle: 'Defect management' },
  { to: '/insights', label: 'Insights', icon: Lightbulb, subtitle: 'Risk & recommendations' },
];

const CHART_COLORS = ['#38bdf8', '#8b5cf6', '#2dd4bf', '#f59e0b', '#f43f5e', '#facc15'];
const RISK_COLORS = ['#f43f5e', '#f59e0b', '#2dd4bf'];
const numberFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const decimalFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
const moneyFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money2Fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const num = (v) => numberFmt.format(Number(v) || 0);
const dec = (v) => decimalFmt.format(Number(v) || 0);
const money = (v) => moneyFmt.format(Number(v) || 0);
const money2 = (v) => money2Fmt.format(Number(v) || 0);
const pct = (v, digits = 1) => `${(Number(v) || 0).toFixed(digits)}%`;
const toNum = (v) => Number(v) || 0;
const sum = (rows, key) => rows.reduce((s, r) => s + toNum(r[key]), 0);
const avg = (rows, key) => rows.length ? sum(rows, key) / rows.length : 0;
const unique = (rows, key) => new Set(rows.map(r => r[key]).filter(Boolean)).size;

function group(rows, key, valueKey, mode = 'sum') {
  const map = new Map();
  rows.forEach((r) => {
    const name = r[key] ?? 'Unknown';
    if (!map.has(name)) map.set(name, { sum: 0, count: 0 });
    const item = map.get(name);
    item.sum += toNum(r[valueKey]);
    item.count += 1;
  });
  return [...map.entries()]
    .map(([name, item]) => ({ name, value: mode === 'avg' ? item.sum / item.count : item.sum }))
    .sort((a, b) => b.value - a.value);
}

function countBy(rows, key) {
  const map = {};
  rows.forEach(r => { const value = r[key] || 'Unknown'; map[value] = (map[value] || 0) + 1; });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function anomalyRows(rows, key, threshold = 1.75) {
  const values = rows.map(r => toNum(r[key])).filter(Number.isFinite);
  if (values.length < 5) return [];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const sd = Math.sqrt(variance) || 1;
  return rows
    .map(r => ({ ...r, anomalyScore: Math.abs((toNum(r[key]) - mean) / sd), anomalyDirection: toNum(r[key]) >= mean ? 'Above normal' : 'Below normal' }))
    .filter(r => r.anomalyScore >= threshold)
    .sort((a, b) => b.anomalyScore - a.anomalyScore);
}

function riskScore(r) { return toNum(r['Supply Chain Risk Score'] ?? r['Risk Score'] ?? r.risk_score); }
function mlScore(r) { return toNum(r['ML Risk Score'] ?? r.ml_risk_score ?? r['Risk Score'] ?? r.risk_score); }
function categoryFromScore(score) { return score >= 70 ? 'High Risk' : score >= 40 ? 'Medium Risk' : 'Low Risk'; }
function mlCategory(r) { return r['ML Risk Category'] ?? r.ml_risk_category ?? r['Risk Category'] ?? categoryFromScore(mlScore(r)); }
function riskClass(category) { return category === 'High Risk' ? 'high' : category === 'Medium Risk' ? 'medium' : 'low'; }
function riskDistribution(rows, ml = false) {
  return ['High Risk', 'Medium Risk', 'Low Risk'].map(name => ({
    name,
    value: rows.filter(r => (ml ? mlCategory(r) : (r['Risk Category'] || categoryFromScore(riskScore(r)))) === name).length
  }));
}

function inventoryRisk(r) {
  const stock = toNum(r['Stock levels']);
  const sales = toNum(r['Number of products sold']);
  const orders = toNum(r['Order quantities']);
  const defect = toNum(r['Defect rates']);
  return Math.min(100, Math.max(0, (10 - stock) * 6) + Math.min(35, sales / 30) + Math.min(25, orders / 5) + Math.min(20, defect * 3));
}

function buildSupplierMetrics(rows, perfRows) {
  return [...new Set(rows.map(r => r['Supplier name']).filter(Boolean))].map(name => {
    const rr = rows.filter(r => r['Supplier name'] === name);
    const pp = perfRows.filter(r => r['Supplier name'] === name);
    return {
      name,
      performance: avg(pp, 'Supplier Performance Score'),
      lead: avg(rr, 'Lead time'),
      defect: avg(rr, 'Defect rates'),
      cost: avg(rr, 'Manufacturing costs'),
    };
  });
}

function kMeans(metrics, k = 3) {
  if (!metrics.length) return [];
  const raw = metrics.map(r => [r.performance, r.lead, r.defect, r.cost]);
  const mins = raw[0].map((_, i) => Math.min(...raw.map(x => x[i])));
  const maxs = raw[0].map((_, i) => Math.max(...raw.map(x => x[i])));
  const norm = raw.map(x => x.map((v, i) => (v - mins[i]) / ((maxs[i] - mins[i]) || 1)));
  let centers = norm.slice(0, Math.min(k, norm.length)).map(x => [...x]);
  while (centers.length < k) centers.push([...centers[centers.length - 1]]);
  let labels = new Array(norm.length).fill(0);
  for (let iteration = 0; iteration < 18; iteration += 1) {
    labels = norm.map(point => {
      let best = 0;
      let bestDistance = Infinity;
      centers.forEach((center, i) => {
        const distance = Math.sqrt(center.reduce((s, v, j) => s + (v - point[j]) ** 2, 0));
        if (distance < bestDistance) { bestDistance = distance; best = i; }
      });
      return best;
    });
    centers = centers.map((center, i) => {
      const cluster = norm.filter((_, j) => labels[j] === i);
      if (!cluster.length) return center;
      return center.map((_, j) => cluster.reduce((s, row) => s + row[j], 0) / cluster.length);
    });
  }
  return labels;
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const tooltipStyle = {
  contentStyle: { background: '#0b1727', border: '1px solid #243852', borderRadius: 10, color: '#e8f2ff' },
  labelStyle: { color: '#9fb0c4' },
};

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ product: 'All', supplier: 'All', location: 'All' });
  const [riskData, setRiskData] = useState([]);
  const [riskError, setRiskError] = useState('');
  const [supplierPerformance, setSupplierPerformance] = useState([]);
  const [supplierError, setSupplierError] = useState('');
  const [mlRiskData, setMlRiskData] = useState([]);
  const [mlSummary, setMlSummary] = useState(null);
  const [mlError, setMlError] = useState('');
  const [apiBusy, setApiBusy] = useState(false);

  const loadAPIs = async () => {
    setApiBusy(true);
    const [risk, perf, mlScores, mlSummaryResult] = await Promise.allSettled([
      getJson(`${MAIN_API}/api/risk-scores`),
      getJson(`${MAIN_API}/api/supplier-performance`),
      getJson(`${ML_API}/api/ml-risk-scores`),
      getJson(`${ML_API}/api/ml-summary`),
    ]);
    if (risk.status === 'fulfilled' && risk.value?.status === 'success') { setRiskData(risk.value.data || []); setRiskError(''); }
    else setRiskError('Rule-based risk API unavailable.');
    if (perf.status === 'fulfilled' && perf.value?.status === 'success') { setSupplierPerformance(perf.value.data || []); setSupplierError(''); }
    else setSupplierError('Supplier performance API unavailable.');
    if (mlScores.status === 'fulfilled') { setMlRiskData(mlScores.value?.data || []); setMlError(''); }
    else setMlError('ML API unavailable on port 8001.');
    if (mlSummaryResult.status === 'fulfilled') setMlSummary(mlSummaryResult.value?.summary || mlSummaryResult.value || null);
    setApiBusy(false);
  };

  useEffect(() => {
    Papa.parse('/supply_chain_data.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: result => { setData(result.data || []); setLoading(false); },
      error: () => setLoading(false),
    });
    loadAPIs();
  }, []);

  const products = useMemo(() => ['All', ...new Set(data.map(r => r['Product type']).filter(Boolean))], [data]);
  const suppliers = useMemo(() => ['All', ...new Set(data.map(r => r['Supplier name']).filter(Boolean))], [data]);
  const locations = useMemo(() => ['All', ...new Set(data.map(r => r.Location).filter(Boolean))], [data]);

  const filtered = useMemo(() => data.filter(r =>
    (filters.product === 'All' || r['Product type'] === filters.product) &&
    (filters.supplier === 'All' || r['Supplier name'] === filters.supplier) &&
    (filters.location === 'All' || r.Location === filters.location)
  ), [data, filters]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return filtered;
    return filtered.filter(r => Object.values(r).some(value => String(value ?? '').toLowerCase().includes(query)));
  }, [filtered, search]);

  const allowedSKUs = useMemo(() => new Set(filtered.map(r => r.SKU)), [filtered]);
  const visibleRisk = useMemo(() => riskData.filter(r => allowedSKUs.has(r.SKU)), [riskData, allowedSKUs]);
  const visibleML = useMemo(() => mlRiskData.filter(r => allowedSKUs.has(r.SKU)), [mlRiskData, allowedSKUs]);
  const visiblePerformance = useMemo(() => supplierPerformance.filter(r =>
    (filters.supplier === 'All' || r['Supplier name'] === filters.supplier) &&
    (filters.location === 'All' || r.Location === filters.location)
  ), [supplierPerformance, filters]);

  if (loading) return <LoadingScreen />;

  const ctx = {
    rows, allRows: data, filters, setFilters, products, suppliers, locations,
    riskData: visibleRisk, riskError, supplierPerformance: visiblePerformance, supplierError,
    mlRiskData: visibleML, mlSummary, mlError, apiBusy, refresh: loadAPIs,
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Activity size={20}/></div>
          <div><strong>SUPPLYPRESCRIPT</strong><span>Supply Chain Intelligence</span></div>
          <button className="mobile-close icon-btn" onClick={() => setMobileOpen(false)}><X size={17}/></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-chip"><Gauge size={16}/><div><b>Supply Operations</b><span>Decision support</span></div><ChevronDown size={13}/></div>
        <div className="workspace-label nav-label">MONITORING</div>
        <nav>{NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={17}/><div><b>{label}</b><span>{label === 'Dashboard' ? 'Executive overview' : label === 'Products' ? 'Demand & revenue' : label === 'Inventory' ? 'Stock health' : label === 'Suppliers' ? 'Performance & reliability' : label === 'Logistics' ? 'Shipping efficiency' : label === 'Manufacturing' ? 'Production & cost' : label === 'Quality' ? 'Defect management' : 'Risk & recommendations'}</span></div>
          </NavLink>
        ))}</nav>
        <div className="sidebar-foot"><span className="status-dot"/>Data pipeline active</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setMobileOpen(true)}><Menu size={19}/></button>
          <div className="crumb"><b>SupplyPrescript</b><span>›</span><span><CurrentTitle/></span></div>
          <div className="top-actions">
            <div className="global-search"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records…"/></div>
            <div className="date-chip"><span>{num(data.length)} records · Live dataset</span></div>
            <button className="icon-btn" title="Refresh APIs" onClick={loadAPIs}><RefreshCw size={16} className={apiBusy ? 'spin' : ''}/></button>
            <button className="icon-btn"><Bell size={16}/><i/></button>
            <div className="avatar">AN</div>
          </div>
        </header>
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard {...ctx}/>}/>
            <Route path="/products" element={<Products {...ctx}/>}/>
            <Route path="/inventory" element={<Inventory {...ctx}/>}/>
            <Route path="/suppliers" element={<Suppliers {...ctx}/>}/>
            <Route path="/logistics" element={<Logistics {...ctx}/>}/>
            <Route path="/manufacturing" element={<Manufacturing {...ctx}/>}/>
            <Route path="/quality" element={<Quality {...ctx}/>}/>
            <Route path="/insights" element={<Insights {...ctx}/>}/>
          </Routes>
        </div>
      </main>
    </div>
  );
}

function LoadingScreen() {
  return <div className="loader"><div className="spinner"/><b>Loading SupplyPrescript</b><span>Preparing the analytics workspace…</span></div>;
}

function CurrentTitle() {
  const path = useLocation().pathname;
  return NAV.find(n => n.to === path)?.label || 'Dashboard';
}

function PageHeader({ eyebrow, title, sub, ctx }) {
  return <div className="page-header">
    <div className="title-block"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{sub}</p></div>
    <Filters ctx={ctx}/>
  </div>;
}

function Filters({ ctx }) {
  return <div className="filter-bar">
    <Filter label="Product" value={ctx.filters.product} options={ctx.products} onChange={v => ctx.setFilters({ ...ctx.filters, product: v })}/>
    <Filter label="Supplier" value={ctx.filters.supplier} options={ctx.suppliers} onChange={v => ctx.setFilters({ ...ctx.filters, supplier: v })}/>
    <Filter label="Location" value={ctx.filters.location} options={ctx.locations} onChange={v => ctx.setFilters({ ...ctx.filters, location: v })}/>
  </div>;
}

function Filter({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  return <div className="filter-wrap" onClick={e => e.stopPropagation()}>
    <span>{label}</span>
    <button className={`filter-button ${open ? 'open' : ''}`} onClick={() => setOpen(v => !v)}><b>{value}</b><ChevronDown size={14}/></button>
    {open && <div className="filter-menu">{options.map(option => <button key={option} className={option === value ? 'selected' : ''} onClick={() => { onChange(option); setOpen(false); }}>{option}</button>)}</div>}
  </div>;
}

function KPI({ icon: Icon, label, value, meta, tone = 'cyan' }) {
  return <div className="kpi-card">
    <div className={`kpi-icon ${tone}`}><Icon size={17}/></div>
    <div className="kpi-copy"><span>{label}</span><strong title={String(value)}>{value}</strong><small>{meta}</small></div>
  </div>;
}

function KPIGrid({ children, columns = 4 }) { return <div className={`kpi-grid kpi-${columns}`}>{children}</div>; }

function Card({ title, subtitle, children, className = '', action }) {
  return <section className={`card ${className}`}>
    <div className="card-head"><div><h3>{title}</h3>{subtitle && <span>{subtitle}</span>}</div>{action}</div>
    {children}
  </section>;
}

function ChartBox({ children, height = 250 }) {
  return <div className="chart" style={{ height }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}

function Dashboard({ rows, riskData, ...ctx }) {
  const revenue = sum(rows, 'Revenue generated');
  const sold = sum(rows, 'Number of products sold');
  const stock = sum(rows, 'Stock levels');
  const riskDist = riskDistribution(riskData);
  const productRevenue = group(rows, 'Product type', 'Revenue generated');
  const salesStock = rows.map((r, i) => ({ name: String(i + 1).padStart(2, '0'), Sales: toNum(r['Number of products sold']), Stock: toNum(r['Stock levels']) })).slice(0, 35);
  const logistics = group(rows, 'Location', 'Shipping times', 'avg').map(x => ({ name: x.name, Shipping: x.value, Lead: avg(rows.filter(r => r.Location === x.name), 'Lead time') }));
  const topRisk = [...riskData].sort((a, b) => riskScore(b) - riskScore(a)).slice(0, 6);
  const lowStock = rows.filter(r => toNum(r['Stock levels']) < 10).length;
  return <>
    <PageHeader eyebrow="EXECUTIVE CONTROL TOWER" title="Supply Chain Performance" sub="A single operating view of revenue, demand, inventory, delivery, quality and risk." ctx={ctx}/>
    <KPIGrid columns={6}>
      <KPI icon={Package} label="Total Products" value={num(rows.length)} meta="Selected records"/>
      <KPI icon={DollarSign} label="Total Revenue" value={money(revenue)} meta="Revenue generated" tone="blue"/>
      <KPI icon={BarChart3} label="Units Sold" value={num(sold)} meta="Demand volume" tone="purple"/>
      <KPI icon={Boxes} label="Inventory" value={num(stock)} meta="Stock units" tone="green"/>
      <KPI icon={ShieldCheck} label="Avg Defect Rate" value={pct(avg(rows, 'Defect rates'), 2)} meta="Quality indicator" tone="orange"/>
      <KPI icon={Clock3} label="Avg Lead Time" value={`${dec(avg(rows, 'Lead time'))} days`} meta="Supplier lead time" tone="cyan"/>
    </KPIGrid>
    <div className="signal-bar"><div><b>Decision cockpit active</b><span>All cards and charts respond to Product, Supplier and Location filters.</span></div><div className="signal-pills"><span>FastAPI</span><span>Risk Engine</span><span>Random Forest</span></div></div>

    <div className="dashboard-grid two-wide">
      <Card title="Revenue by Product Type" subtitle="Selected revenue contribution"><ChartBox><BarChart data={productRevenue} margin={{ left: 8, right: 10, top: 8, bottom: 5 }}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198" tick={{ fontSize: 10 }}/><YAxis stroke="#6f8198" tickFormatter={v => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 9 }}/><Tooltip {...tooltipStyle} formatter={v => money(v)}/><Bar dataKey="value" fill="#38bdf8" radius={[5, 5, 0, 0]}/></BarChart></ChartBox></Card>
      <Card title="Sales vs Inventory" subtitle="Demand pressure against available stock"><ChartBox><AreaChart data={salesStock}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198" tick={{ fontSize: 9 }}/><YAxis stroke="#6f8198" tick={{ fontSize: 9 }}/><Tooltip {...tooltipStyle}/><Area type="monotone" dataKey="Sales" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.12} strokeWidth={2}/><Area type="monotone" dataKey="Stock" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.08} strokeWidth={2}/></AreaChart></ChartBox></Card>
    </div>
    <div className="dashboard-grid dashboard-risk-row">
      <Card title="Shipping Cost vs Lead Time" subtitle="Location-level delivery pressure">
        <ChartBox height={340}>
          <ComposedChart data={logistics} margin={{ top: 14, right: 18, bottom: 26, left: 4 }}>
            <CartesianGrid stroke="#18283b" vertical={false}/>
            <XAxis dataKey="name" stroke="#8ba0b6" tick={{ fontSize: 12 }} tickMargin={10}/>
            <YAxis yAxisId="left" stroke="#8ba0b6" tick={{ fontSize: 12 }} tickMargin={8} width={42}/>
            <YAxis yAxisId="right" orientation="right" stroke="#8ba0b6" tick={{ fontSize: 12 }} tickMargin={8} width={42}/>
            <Tooltip {...tooltipStyle}/>
            <Bar yAxisId="left" dataKey="Shipping" fill="#8b5cf6" radius={[6,6,0,0]} barSize={34}/>
            <Line yAxisId="right" type="monotone" dataKey="Lead" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}/>
          </ComposedChart>
        </ChartBox>
      </Card>
      <Card title="Risk Distribution" subtitle="Rule-based risk engine">
        <ChartBox height={340}>
          <PieChart margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
            <Pie data={riskDist} dataKey="value" nameKey="name" cx="50%" cy="43%" innerRadius={78} outerRadius={118} paddingAngle={4}>
              {riskDist.map((item, i) => <Cell key={item.name} fill={RISK_COLORS[i]}/>)}
            </Pie>
            <Tooltip {...tooltipStyle}/>
            <Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 12, color: '#a8bacd' }}/>
          </PieChart>
        </ChartBox>
      </Card>
      <Card title="Top Risk Products" subtitle={`${num(riskData.length)} risk-scored records`} className="risk-products-card">
        <CompactRiskList rows={topRisk}/>
        <div className="mini-stat"><span>Low-stock records</span><b>{num(lowStock)}</b></div>
      </Card>
    </div>
    <Card title="Operational Snapshot" subtitle="Key signals for the selected scope"><div className="summary-grid"><SummaryMetric icon={TrendingUp} label="Revenue per unit sold" value={money2(sold ? revenue / sold : 0)}/><SummaryMetric icon={Target} label="Stock coverage proxy" value={pct(stock ? sold / stock * 100 : 0, 1)}/><SummaryMetric icon={AlertTriangle} label="Quality exposure" value={num(rows.filter(r => toNum(r['Defect rates']) >= 4).length)}/><SummaryMetric icon={Truck} label="Shipping delay" value={num(rows.filter(r => toNum(r['Shipping times']) >= 7).length)}/></div></Card>
  </>;
}

function Products({ rows, ...ctx }) {
  const revenue = group(rows, 'Product type', 'Revenue generated');
  const sales = group(rows, 'Product type', 'Number of products sold');
  const availability = group(rows, 'Product type', 'Availability', 'avg');
  const scatter = rows.map(r => ({ sku: r.SKU, price: toNum(r.Price), sales: toNum(r['Number of products sold']) }));
  return <>
    <PageHeader eyebrow="PRODUCT ANALYTICS" title="Products" sub="Track product demand, revenue contribution, availability and pricing behaviour." ctx={ctx}/>
    <KPIGrid columns={4}>
      <KPI icon={Package} label="Total Products" value={num(unique(rows, 'SKU'))} meta="Selected SKUs"/>
      <KPI icon={DollarSign} label="Revenue" value={money(sum(rows, 'Revenue generated'))} meta="Generated revenue" tone="blue"/>
      <KPI icon={BarChart3} label="Units Sold" value={num(sum(rows, 'Number of products sold'))} meta="Demand volume" tone="purple"/>
      <KPI icon={CheckCircle2} label="Avg Availability" value={pct(avg(rows, 'Availability'), 1)} meta="Availability rate" tone="green"/>
    </KPIGrid>
    <div className="dashboard-grid three-equal">
      <Card title="Revenue by Product Type" subtitle="Revenue contribution"><ChartBox><BarChart data={revenue}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198"/><YAxis stroke="#6f8198" tickFormatter={v => `$${Math.round(v / 1000)}k`}/><Tooltip {...tooltipStyle} formatter={v => money(v)}/><Bar dataKey="value" fill="#38bdf8" radius={[5,5,0,0]}/></BarChart></ChartBox></Card>
      <Card title="Units Sold Comparison" subtitle="Demand by category"><ChartBox><BarChart data={sales}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198"/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle}/><Bar dataKey="value" fill="#8b5cf6" radius={[5,5,0,0]}/></BarChart></ChartBox></Card>
      <Card title="Availability Analysis" subtitle="Average available stock rate"><ChartBox><PieChart><Pie data={availability} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>{availability.map((item, i) => <Cell key={item.name} fill={CHART_COLORS[i % CHART_COLORS.length]}/>)}</Pie><Tooltip {...tooltipStyle} formatter={v => pct(v, 1)}/><Legend wrapperStyle={{ fontSize: 9 }}/></PieChart></ChartBox></Card>
    </div>
    <Card title="Price vs Sales" subtitle="SKU-level demand relationship"><ChartBox height={310}><ScatterChart margin={{ left: 5, right: 10, bottom: 5 }}><CartesianGrid stroke="#18283b"/><XAxis type="number" dataKey="price" name="Price" stroke="#6f8198"/><YAxis type="number" dataKey="sales" name="Units sold" stroke="#6f8198"/><ZAxis range={[35, 90]}/><Tooltip {...tooltipStyle}/><Scatter data={scatter} fill="#38bdf8"/></ScatterChart></ChartBox></Card>
    <Card title="Product Records" subtitle={`${num(rows.length)} records in the selected scope`}><DataTable rows={rows} columns={['SKU','Product type','Price','Availability','Number of products sold','Revenue generated']}/></Card>
  </>;
}

function Inventory({ rows, ...ctx }) {
  const low = rows.filter(r => toNum(r['Stock levels']) < 10).sort((a, b) => toNum(a['Stock levels']) - toNum(b['Stock levels']));
  const anomalies = anomalyRows(rows, 'Stock levels');
  const risk = rows.map(r => ({ name: r.SKU, risk: inventoryRisk(r) })).sort((a, b) => b.risk - a.risk).slice(0, 18);
  const trend = rows.map((r, i) => ({ name: String(i + 1).padStart(2, '0'), Stock: toNum(r['Stock levels']), Sales: toNum(r['Number of products sold']) })).slice(0, 35);
  const total = sum(rows, 'Stock levels');
  const recommendations = low.slice(0, 6);
  return <>
    <PageHeader eyebrow="INVENTORY CONTROL" title="Inventory" sub="Monitor stock health, identify statistical anomalies and convert low-stock signals into replenishment actions." ctx={ctx}/>
    <KPIGrid columns={4}>
      <KPI icon={Boxes} label="Total Inventory" value={num(total)} meta="Stock units" tone="green"/>
      <KPI icon={AlertTriangle} label="Low Stock Count" value={num(low.length)} meta="Below 10 units" tone="red"/>
      <KPI icon={BarChart3} label="Average Stock" value={num(avg(rows, 'Stock levels'))} meta="Units per SKU" tone="blue"/>
      <KPI icon={Activity} label="Stock Utilization" value={pct(total ? sum(rows, 'Number of products sold') / total * 100 : 0, 1)} meta="Sales ÷ stock proxy" tone="purple"/>
    </KPIGrid>
    <div className="dashboard-grid two-wide">
      <Card title="Stock-Risk Visualization" subtitle="Composite pressure from stock, sales, orders and defects"><ChartBox><BarChart data={risk}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198" tick={{ fontSize: 9 }}/><YAxis domain={[0,100]} stroke="#6f8198"/><Tooltip {...tooltipStyle} formatter={v => `${dec(v)} / 100`}/><ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="4 4"/><Bar dataKey="risk" fill="#f43f5e" radius={[4,4,0,0]}/></BarChart></ChartBox></Card>
      <Card title="Stock vs Sales" subtitle="Selected inventory and demand trend"><ChartBox><AreaChart data={trend}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198" tick={{ fontSize: 9 }}/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle}/><Area type="monotone" dataKey="Stock" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.08} strokeWidth={2}/><Area type="monotone" dataKey="Sales" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.07} strokeWidth={2}/></AreaChart></ChartBox></Card>
    </div>
    <div className="dashboard-grid two-wide">
      <Card title="Inventory Anomaly Detection" subtitle="Z-score based statistical screening"><AnomalySummary rows={anomalies} metric="stock"/></Card>
      <Card title="Replenishment Recommendations" subtitle="Automatic action queue from low-stock records"><RecommendationList rows={recommendations}/></Card>
    </div>
    <Card title="Low Stock Watchlist" subtitle="Review against order quantity and recent demand"><DataTable rows={low} columns={['SKU','Product type','Stock levels','Order quantities','Number of products sold','Availability']}/></Card>
  </>;
}

function Suppliers({ rows, supplierPerformance, supplierError, ...ctx }) {
  const metrics = buildSupplierMetrics(rows, supplierPerformance);
  const labels = kMeans(metrics, 3);
  const segmented = metrics.map((r, i) => ({ ...r, segment: labels[i] ?? 0 }));
  const comparison = segmented.map(r => ({ name: r.name.replace('Supplier ', 'S'), Performance: r.performance, Lead: r.lead }));
  const defect = segmented.map(r => ({ name: r.name.replace('Supplier ', 'S'), Defect: r.defect }));
  const cost = segmented.map(r => ({ name: r.name.replace('Supplier ', 'S'), Cost: r.cost }));
  const segments = [0, 1, 2].map(i => ({ name: `Segment ${i + 1}`, value: segmented.filter(r => r.segment === i).length }));
  const performance = avg(metrics, 'performance');
  return <>
    <PageHeader eyebrow="SUPPLIER MANAGEMENT" title="Suppliers" sub="Compare supplier performance, reliability, quality exposure and cost while grouping suppliers into operational segments." ctx={ctx}/>
    <KPIGrid columns={4}>
      <KPI icon={Gauge} label="Supplier Performance" value={dec(performance)} meta="Average score" tone="cyan"/>
      <KPI icon={Users} label="Total Suppliers" value={num(metrics.length)} meta="Selected suppliers" tone="blue"/>
      <KPI icon={Clock3} label="Avg Lead Time" value={`${dec(avg(rows, 'Lead time'))} days`} meta="Supplier lead time" tone="purple"/>
      <KPI icon={ShieldAlert} label="Avg Defect Rate" value={pct(avg(rows, 'Defect rates'), 2)} meta="Supplier quality" tone="orange"/>
    </KPIGrid>
    {supplierError && <Notice text={supplierError}/>} 
    <div className="dashboard-grid two-wide">
      <Card title="Supplier Comparison" subtitle="Performance score and lead-time comparison"><ChartBox><BarChart data={comparison}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198"/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle}/><Bar dataKey="Performance" fill="#38bdf8" radius={[4,4,0,0]}/><Bar dataKey="Lead" fill="#2dd4bf" radius={[4,4,0,0]}/></BarChart></ChartBox></Card>
      <Card title="K-Means Supplier Segmentation" subtitle="Unsupervised grouping across performance, lead time, defects and cost"><ChartBox><ScatterChart><CartesianGrid stroke="#18283b"/><XAxis type="number" dataKey="x" name="Performance" stroke="#6f8198"/><YAxis type="number" dataKey="y" name="Lead time" stroke="#6f8198"/><ZAxis range={[50, 110]}/><Tooltip {...tooltipStyle}/><Scatter data={segmented.map(r => ({ x: r.performance, y: r.lead, name: r.name, segment: r.segment }))} fill="#8b5cf6"/></ScatterChart></ChartBox><div className="segment-legend">{segments.map((s, i) => <span key={s.name}><i className={`seg-dot s${i}`}/>{s.name}: {s.value}</span>)}</div></Card>
    </div>
    <div className="dashboard-grid three-equal">
      <Card title="Defect-Rate Comparison"><ChartBox height={230}><BarChart data={defect}><XAxis dataKey="name" stroke="#6f8198"/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle} formatter={v => pct(v, 2)}/><Bar dataKey="Defect" fill="#f43f5e" radius={[4,4,0,0]}/></BarChart></ChartBox></Card>
      <Card title="Manufacturing-Cost Comparison"><ChartBox height={230}><BarChart data={cost}><XAxis dataKey="name" stroke="#6f8198"/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle} formatter={v => money2(v)}/><Bar dataKey="Cost" fill="#f59e0b" radius={[4,4,0,0]}/></BarChart></ChartBox></Card>
      <Card title="Supplier Segments"><ChartBox height={230}><PieChart><Pie data={segments} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3}>{segments.map((s, i) => <Cell key={s.name} fill={CHART_COLORS[i + 1]}/>)}</Pie><Tooltip {...tooltipStyle}/><Legend wrapperStyle={{ fontSize: 9 }}/></PieChart></ChartBox></Card>
    </div>
    <Card title="Supplier Performance Table" subtitle="Current supplier metrics"><SupplierTable rows={segmented}/></Card>
  </>;
}

function Logistics({ rows, ...ctx }) {
  const carrier = group(rows, 'Shipping carriers', 'Shipping times', 'avg');
  const route = group(rows, 'Routes', 'Shipping times', 'avg');
  const modes = countBy(rows, 'Transportation modes');
  const anomalies = anomalyRows(rows, 'Shipping times');
  const trend = rows.map((r, i) => ({ name: String(i + 1).padStart(2, '0'), Time: toNum(r['Shipping times']), Cost: toNum(r['Shipping costs']) })).slice(0, 35);
  return <>
    <PageHeader eyebrow="LOGISTICS CONTROL" title="Logistics" sub="Measure shipping efficiency, carrier performance, route pressure and unusual delivery times." ctx={ctx}/>
    <KPIGrid columns={4}>
      <KPI icon={Clock3} label="Avg Shipping Time" value={`${dec(avg(rows, 'Shipping times'))} days`} meta="Delivery time" tone="cyan"/>
      <KPI icon={DollarSign} label="Avg Shipping Cost" value={money2(avg(rows, 'Shipping costs'))} meta="Per shipment" tone="green"/>
      <KPI icon={Truck} label="Carrier Performance" value={pct(rows.length ? rows.filter(r => toNum(r['Shipping times']) < 7).length / rows.length * 100 : 0, 1)} meta="Under 7-day target" tone="purple"/>
      <KPI icon={AlertTriangle} label="Shipping Anomalies" value={num(anomalies.length)} meta="Statistical alerts" tone="orange"/>
    </KPIGrid>
    <div className="dashboard-grid two-wide">
      <Card title="Carrier Performance Comparison" subtitle="Average shipping time by carrier"><ChartBox><BarChart data={carrier}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198"/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle} formatter={v => `${dec(v)} days`}/><Bar dataKey="value" fill="#38bdf8" radius={[4,4,0,0]}/></BarChart></ChartBox></Card>
      <Card title="Route Comparison" subtitle="Average shipping time by route"><ChartBox><BarChart data={route}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198"/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle} formatter={v => `${dec(v)} days`}/><Bar dataKey="value" fill="#8b5cf6" radius={[4,4,0,0]}/></BarChart></ChartBox></Card>
    </div>
    <div className="dashboard-grid three-equal">
      <Card title="Transportation Mode Distribution"><ChartBox height={230}><PieChart><Pie data={modes} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>{modes.map((m, i) => <Cell key={m.name} fill={CHART_COLORS[i % CHART_COLORS.length]}/>)}</Pie><Tooltip {...tooltipStyle}/><Legend wrapperStyle={{ fontSize: 9 }}/></PieChart></ChartBox></Card>
      <Card title="Shipping-Time Trend"><ChartBox height={230}><LineChart data={trend}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198" tick={{ fontSize: 9 }}/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle}/><Line type="monotone" dataKey="Time" stroke="#2dd4bf" strokeWidth={2.5}/></LineChart></ChartBox></Card>
      <Card title="Shipping Cost Trend"><ChartBox height={230}><AreaChart data={trend}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198" tick={{ fontSize: 9 }}/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle} formatter={v => money2(v)}/><Area type="monotone" dataKey="Cost" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.09} strokeWidth={2.5}/></AreaChart></ChartBox></Card>
    </div>
    <Card title="Shipping-Time Anomaly Detection" subtitle="Records with statistically unusual shipping times"><AnomalySummary rows={anomalies} metric="shipping"/></Card>
    <Card title="Logistics Records"><DataTable rows={rows} columns={['SKU','Shipping carriers','Transportation modes','Routes','Shipping times','Shipping costs','Location']}/></Card>
  </>;
}

function Manufacturing({ rows, ...ctx }) {
  const costSupplier = group(rows, 'Supplier name', 'Manufacturing costs', 'avg');
  const volume = group(rows, 'Product type', 'Production volumes');
  const costType = group(rows, 'Product type', 'Manufacturing costs', 'avg');
  const lead = group(rows, 'Product type', 'Manufacturing lead time', 'avg');
  const anomalies = anomalyRows(rows, 'Manufacturing costs');
  const scatter = rows.map(r => ({ name: r.SKU, production: toNum(r['Production volumes']), cost: toNum(r['Manufacturing costs']) }));
  const trend = rows.map((r, i) => ({ name: String(i + 1).padStart(2, '0'), Cost: toNum(r['Manufacturing costs']), Production: toNum(r['Production volumes']) })).slice(0, 35);
  return <>
    <PageHeader eyebrow="PRODUCTION OPERATIONS" title="Manufacturing" sub="Analyze production volume, manufacturing cost, lead time and cost anomalies." ctx={ctx}/>
    <KPIGrid columns={4}>
      <KPI icon={DollarSign} label="Manufacturing Cost" value={money2(sum(rows, 'Manufacturing costs'))} meta="Total recorded cost" tone="orange"/>
      <KPI icon={Factory} label="Production Volume" value={num(sum(rows, 'Production volumes'))} meta="Total units" tone="blue"/>
      <KPI icon={Clock3} label="Manufacturing Lead" value={`${dec(avg(rows, 'Manufacturing lead time'))} days`} meta="Average" tone="purple"/>
      <KPI icon={AlertTriangle} label="Cost Anomalies" value={num(anomalies.length)} meta="Statistical alerts" tone="red"/>
    </KPIGrid>
    <div className="dashboard-grid two-wide">
      <Card title="Cost by Supplier" subtitle="Average manufacturing cost"><ChartBox><BarChart data={costSupplier}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198"/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle} formatter={v => money2(v)}/><Bar dataKey="value" fill="#f59e0b" radius={[4,4,0,0]}/></BarChart></ChartBox></Card>
      <Card title="Production vs Cost" subtitle="Relationship between output and cost"><ChartBox><ScatterChart><CartesianGrid stroke="#18283b"/><XAxis type="number" dataKey="production" name="Production volume" stroke="#6f8198"/><YAxis type="number" dataKey="cost" name="Manufacturing cost" stroke="#6f8198"/><ZAxis range={[35, 90]}/><Tooltip {...tooltipStyle}/><Scatter data={scatter} fill="#38bdf8"/></ScatterChart></ChartBox></Card>
    </div>
    <div className="dashboard-grid three-equal">
      <Card title="Production Volume"><ChartBox height={230}><BarChart data={volume}><XAxis dataKey="name" stroke="#6f8198"/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle}/><Bar dataKey="value" fill="#38bdf8" radius={[4,4,0,0]}/></BarChart></ChartBox></Card>
      <Card title="Manufacturing Cost by Type"><ChartBox height={230}><BarChart data={costType}><XAxis dataKey="name" stroke="#6f8198"/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle} formatter={v => money2(v)}/><Bar dataKey="value" fill="#f59e0b" radius={[4,4,0,0]}/></BarChart></ChartBox></Card>
      <Card title="Manufacturing Lead Time"><ChartBox height={230}><LineChart data={lead}><XAxis dataKey="name" stroke="#6f8198"/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle} formatter={v => `${dec(v)} days`}/><Line dataKey="value" stroke="#8b5cf6" strokeWidth={2.5}/></LineChart></ChartBox></Card>
    </div>
    <Card title="Cost Anomaly Detection" subtitle="Records requiring manufacturing-cost review"><AnomalySummary rows={anomalies} metric="cost"/></Card>
    <Card title="Manufacturing Records"><DataTable rows={rows} columns={['SKU','Product type','Production volumes','Manufacturing lead time','Manufacturing costs','Supplier name']}/></Card>
  </>;
}

function Quality({ rows, ...ctx }) {
  const inspection = countBy(rows, 'Inspection results');
  const defectProduct = group(rows, 'Product type', 'Defect rates', 'avg');
  const defectSupplier = group(rows, 'Supplier name', 'Defect rates', 'avg');
  const trend = rows.map((r, i) => ({ name: String(i + 1).padStart(2, '0'), defect: toNum(r['Defect rates']) })).slice(0, 35);
  const pass = rows.filter(r => r['Inspection results'] === 'Pass').length;
  const fail = rows.filter(r => r['Inspection results'] === 'Fail').length;
  const pending = rows.filter(r => r['Inspection results'] === 'Pending').length;
  return <>
    <PageHeader eyebrow="QUALITY MANAGEMENT" title="Quality" sub="Monitor inspection outcomes, defect exposure, supplier quality and defect trends." ctx={ctx}/>
    <KPIGrid columns={5}>
      <KPI icon={ShieldCheck} label="Avg Defect Rate" value={pct(avg(rows, 'Defect rates'), 2)} meta="Selected records" tone="red"/>
      <KPI icon={CheckCircle2} label="Passed" value={num(pass)} meta="Inspection records" tone="green"/>
      <KPI icon={AlertTriangle} label="Failed" value={num(fail)} meta="Inspection records" tone="orange"/>
      <KPI icon={Clock3} label="Pending" value={num(pending)} meta="Inspection records" tone="yellow"/>
      <KPI icon={Target} label="Pass Rate" value={pct(rows.length ? pass / rows.length * 100 : 0, 1)} meta="Inspection outcome" tone="blue"/>
    </KPIGrid>
    <div className="dashboard-grid two-wide">
      <Card title="Inspection Distribution" subtitle="Pass, fail and pending outcomes"><ChartBox><PieChart><Pie data={inspection} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={3}>{inspection.map((x, i) => <Cell key={x.name} fill={x.name === 'Fail' ? '#f43f5e' : x.name === 'Pending' ? '#facc15' : '#2dd4bf'}/>)}</Pie><Tooltip {...tooltipStyle}/><Legend wrapperStyle={{ fontSize: 9 }}/></PieChart></ChartBox></Card>
      <Card title="Defect Rate by Product Type" subtitle="Average defect exposure"><ChartBox><BarChart data={defectProduct}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198"/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle} formatter={v => pct(v, 2)}/><Bar dataKey="value" fill="#f43f5e" radius={[4,4,0,0]}/></BarChart></ChartBox></Card>
    </div>
    <div className="dashboard-grid two-wide">
      <Card title="Supplier Quality Comparison"><ChartBox><BarChart data={defectSupplier}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198"/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle} formatter={v => pct(v, 2)}/><Bar dataKey="value" fill="#8b5cf6" radius={[4,4,0,0]}/></BarChart></ChartBox></Card>
      <Card title="Quality Trend"><ChartBox><AreaChart data={trend}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198" tick={{ fontSize: 9 }}/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle} formatter={v => pct(v, 2)}/><Area type="monotone" dataKey="defect" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.08} strokeWidth={2.5}/></AreaChart></ChartBox></Card>
    </div>
    <Card title="Quality Records" subtitle="Highest defect records first"><DataTable rows={[...rows].sort((a, b) => toNum(b['Defect rates']) - toNum(a['Defect rates']))} columns={['SKU','Product type','Supplier name','Inspection results','Defect rates','Manufacturing costs']}/></Card>
  </>;
}

function Insights({ rows, riskData, riskError, mlRiskData, mlSummary, mlError, ...ctx }) {
  const lowStock = rows.filter(r => toNum(r['Stock levels']) < 10);
  const highDefect = rows.filter(r => toNum(r['Defect rates']) >= 4);
  const longShip = rows.filter(r => toNum(r['Shipping times']) >= 7);
  const failed = rows.filter(r => r['Inspection results'] === 'Fail');
  const ruleDist = riskDistribution(riskData);
  const mlDist = riskDistribution(mlRiskData, true);
  const mlSorted = [...mlRiskData].sort((a, b) => mlScore(b) - mlScore(a));
  const ruleAvg = riskData.length ? riskData.reduce((s, r) => s + riskScore(r), 0) / riskData.length : 0;
  const mlAvg = mlRiskData.length ? mlRiskData.reduce((s, r) => s + mlScore(r), 0) / mlRiskData.length : toNum(mlSummary?.average_risk_score);
  const anomalies = [
    ...anomalyRows(rows, 'Stock levels').map(r => ({ ...r, anomalyType: 'Inventory' })),
    ...anomalyRows(rows, 'Shipping times').map(r => ({ ...r, anomalyType: 'Shipping' })),
    ...anomalyRows(rows, 'Manufacturing costs').map(r => ({ ...r, anomalyType: 'Manufacturing cost' })),
  ].sort((a, b) => b.anomalyScore - a.anomalyScore).slice(0, 10);
  const factors = mlSorted.slice(0, 8).map(r => {
    const base = rows.find(x => x.SKU === r.SKU) || {};
    const raw = [
      ['Stock', toNum(base['Stock levels'])],
      ['Defect', toNum(base['Defect rates'])],
      ['Lead Time', toNum(base['Lead time'])],
      ['Shipping', toNum(base['Shipping times'])],
    ];
    return { ...r, factors: raw.sort((a, b) => b[1] - a[1]).slice(0, 3) };
  });
  const priority = [...rows].filter(r => toNum(r['Stock levels']) < 10 || toNum(r['Defect rates']) >= 4 || toNum(r['Shipping times']) >= 7 || r['Inspection results'] === 'Fail').sort((a, b) => inventoryRisk(b) - inventoryRisk(a));
  return <>
    <PageHeader eyebrow="DECISION SUPPORT" title="Operational Insights" sub="Keep transparent operational rules, ML predictions, anomaly alerts and recommendations in one decision layer." ctx={ctx}/>
    <div className="insight-banner"><div className="banner-icon"><Lightbulb size={20}/></div><div><b>Decision-support engine active</b><p>Rule-based and ML outputs are displayed separately so every signal has a clear source.</p></div><div className="banner-status"><span className="live-dot"/>Live</div></div>
    <div className="insight-grid">
      <InsightCard icon={Boxes} title="Inventory Risk" count={lowStock.length} text="Records below 10 stock units." tone="red"/>
      <InsightCard icon={ShieldAlert} title="Quality Exposure" count={highDefect.length} text="Records at or above 4% defect rate." tone="orange"/>
      <InsightCard icon={Truck} title="Shipping Delay" count={longShip.length} text="Records with shipping time of 7+ days." tone="yellow"/>
      <InsightCard icon={AlertTriangle} title="Inspection Failures" count={failed.length} text="Records failed inspection." tone="purple"/>
    </div>

    <div className="dashboard-grid three-equal">
      <Card title="Rule-Based Risk Score" subtitle="FastAPI algorithm output"><RiskMini score={ruleAvg} label="Average risk"/><RiskCounts distribution={ruleDist}/></Card>
      <Card title="ML Risk Prediction" subtitle="Random Forest output"><RiskMini score={mlAvg} label="Average ML risk" purple/><RiskCounts distribution={mlDist}/></Card>
      <Card title="Prediction Confidence" subtitle="Confidence estimate, not model probability"><ConfidenceMini rows={mlSorted.slice(0, 6)}/></Card>
    </div>

    <div className="dashboard-grid two-wide">
      <Card title="Risk Category Distribution" subtitle="Rule-based vs ML category mix"><ChartBox><BarChart data={['High Risk', 'Medium Risk', 'Low Risk'].map(name => ({ name, Rule: ruleDist.find(x => x.name === name)?.value || 0, ML: mlDist.find(x => x.name === name)?.value || 0 }))}><CartesianGrid stroke="#18283b" vertical={false}/><XAxis dataKey="name" stroke="#6f8198"/><YAxis stroke="#6f8198"/><Tooltip {...tooltipStyle}/><Bar dataKey="Rule" fill="#38bdf8" radius={[4,4,0,0]}/><Bar dataKey="ML" fill="#8b5cf6" radius={[4,4,0,0]}/></BarChart></ChartBox></Card>
      <Card title="Highest-Risk Records" subtitle="Top predicted risk scores"><CompactRiskList rows={mlSorted.slice(0, 7)} ml/></Card>
    </div>

    <div className="dashboard-grid two-wide">
      <Card title="Anomaly Alerts" subtitle="Statistical outliers across inventory, logistics and manufacturing"><AnomalyList rows={anomalies}/></Card>
      <Card title="ML Risk Factors" subtitle="Largest observed operational signals for high-risk records"><FactorList rows={factors}/></Card>
    </div>

    <Card title="Recommendations" subtitle="Action-oriented operational guidance"><RecommendationList rows={priority.slice(0, 8)} insight/></Card>

    {(riskError || mlError) && <Notice text={`${riskError ? riskError : ''}${riskError && mlError ? ' ' : ''}${mlError ? mlError : ''}`}/>} 
    <div className="dashboard-grid two-wide">
      <Card title="Rule-Based Risk Analysis" subtitle="Top records returned by the FastAPI risk engine"><RiskTable rows={riskData.slice().sort((a, b) => riskScore(b) - riskScore(a)).slice(0, 20)}/></Card>
      <Card title="ML Risk Analysis" subtitle="Top predictions returned by the ML FastAPI service"><RiskTable rows={mlSorted.slice(0, 20)} ml/></Card>
    </div>
    <Card title="Priority Records" subtitle="Combined operational warning signals"><DataTable rows={priority} columns={['SKU','Product type','Revenue generated','Number of products sold','Stock levels','Supplier name','Inspection results','Defect rates']}/></Card>
  </>;
}

function RiskMini({ score, label, purple = false }) {
  return <div className={`risk-mini ${purple ? 'purple' : ''}`}><div><span>{label}</span><strong>{dec(score)}</strong></div><div className="score-ring"><CircleDot size={19}/></div></div>;
}

function RiskCounts({ distribution }) {
  return <div className="risk-counts">{distribution.map(item => <div key={item.name}><span className={`risk-dot ${riskClass(item.name)}`}/><b>{num(item.value)}</b><small>{item.name.replace(' Risk', '')}</small></div>)}</div>;
}

function InsightCard({ icon: Icon, title, count, text, tone }) {
  return <div className={`insight-card ${tone}`}><div className="insight-icon"><Icon size={16}/></div><div className="insight-row"><div><b>{title}</b><span>{num(count)} records</span></div><strong>{count ? 'Attention' : 'Clear'}</strong></div><p>{text}</p></div>;
}

function SummaryMetric({ icon: Icon, label, value }) {
  return <div className="summary-metric"><div className="summary-icon"><Icon size={15}/></div><div><span>{label}</span><b>{value}</b></div></div>;
}

function Notice({ text }) { return <div className="notice"><AlertTriangle size={16}/><span>{text}</span></div>; }

function CompactRiskList({ rows, ml = false }) {
  if (!rows.length) return <div className="empty">No risk data available.</div>;
  return <div className="compact-risk-list">{rows.map(r => { const score = ml ? mlScore(r) : riskScore(r); const category = ml ? mlCategory(r) : (r['Risk Category'] || categoryFromScore(score)); return <div className="compact-risk-row" key={`${ml ? 'ml' : 'rule'}-${r.SKU}`}><div><b>{r.SKU}</b><span>{r['Product type'] || 'Product'}</span></div><div className="risk-value"><strong>{dec(score)}</strong><em className={`risk-badge ${riskClass(category)}`}>{category}</em></div></div>; })}</div>;
}

function RecommendationList({ rows, insight = false }) {
  if (!rows.length) return <div className="empty"><CheckCircle2 size={18}/><span>No immediate replenishment recommendation for the selected scope.</span></div>;
  return <div className="recommendation-grid">{rows.map((r, i) => {
    const stock = toNum(r['Stock levels']);
    const orders = toNum(r['Order quantities']);
    const sales = toNum(r['Number of products sold']);
    let action = 'Review';
    if (stock < 5) action = 'Replenish now'; else if (orders > stock) action = 'Increase order'; else if (sales > stock * 20) action = 'Monitor demand';
    if (insight && r['Inspection results'] === 'Fail') action = 'Quality review';
    return <div className="recommendation-row" key={`${r.SKU}-${i}`}><div className="rec-icon"><Zap size={14}/></div><div className="rec-main"><b>{r.SKU} · {r['Product type']}</b><span>Stock {num(stock)} · Orders {num(orders)} · Sold {num(sales)}</span></div><strong>{action}</strong></div>;
  })}</div>;
}

function AnomalySummary({ rows, metric }) {
  if (!rows.length) return <div className="empty success"><CheckCircle2 size={19}/><span>No statistical anomalies detected in the selected scope.</span></div>;
  return <div className="anomaly-summary"><div className="anomaly-stat"><span>Detected</span><strong>{num(rows.length)}</strong><small>records</small></div><div className="anomaly-list">{rows.slice(0, 6).map((r, i) => <div className="anomaly-row" key={`${r.SKU}-${i}`}><div><b>{r.SKU}</b><span>{r['Product type']} · {r.anomalyDirection}</span></div><div><strong>{dec(r.anomalyScore)}σ</strong><small>{metric === 'cost' ? money2(r['Manufacturing costs']) : metric === 'shipping' ? `${dec(r['Shipping times'])} days` : num(r['Stock levels'])}</small></div></div>)}</div></div>;
}

function AnomalyList({ rows }) {
  if (!rows.length) return <div className="empty success"><CheckCircle2 size={18}/><span>No anomalies detected.</span></div>;
  return <div className="anomaly-list">{rows.map((r, i) => <div className="anomaly-row" key={`${r.SKU}-${i}`}><div><b>{r.SKU}</b><span>{r.anomalyType} · {r.anomalyDirection}</span></div><div><strong>{dec(r.anomalyScore)}σ</strong><small>{r.anomalyType === 'Manufacturing cost' ? money2(r['Manufacturing costs']) : r.anomalyType === 'Shipping' ? `${dec(r['Shipping times'])} days` : num(r['Stock levels'])}</small></div></div>)}</div>;
}

function ConfidenceMini({ rows }) {
  if (!rows.length) return <div className="empty"><Brain size={18}/><span>ML predictions unavailable.</span></div>;
  return <div className="confidence-list">{rows.map(r => { const score = mlScore(r); const confidence = Math.min(99, Math.max(55, 55 + Math.abs(score - 50) * 1.1)); return <div key={r.SKU}><div><b>{r.SKU}</b><span>{mlCategory(r)}</span></div><div className="confidence-track"><i style={{ width: `${confidence}%` }}/></div><strong>{confidence.toFixed(1)}%</strong></div>; })}</div>;
}

function FactorList({ rows }) {
  if (!rows.length) return <div className="empty"><Brain size={18}/><span>ML risk factors appear when predictions are available.</span></div>;
  return <div className="factor-list">{rows.map(r => <div className="factor-card" key={r.SKU}><div className="factor-head"><b>{r.SKU}</b><span>{dec(mlScore(r))}</span></div>{r.factors.map(([name, value]) => <div className="factor-row" key={name}><span>{name}</span><b>{name === 'Defect' ? pct(value, 2) : dec(value)}</b></div>)}</div>)}</div>;
}

function RiskTable({ rows, ml = false }) {
  if (!rows.length) return <div className="empty"><span>{ml ? 'ML predictions are unavailable.' : 'Risk records are unavailable.'}</span></div>;
  return <div className="table-wrap compact-table"><table><thead><tr><th>SKU</th><th>Product</th><th>Supplier</th><th>Location</th><th>{ml ? 'ML Risk' : 'Risk'} Score</th><th>Category</th></tr></thead><tbody>{rows.map(r => { const score = ml ? mlScore(r) : riskScore(r); const category = ml ? mlCategory(r) : (r['Risk Category'] || categoryFromScore(score)); return <tr key={`${ml ? 'ml' : 'rule'}-${r.SKU}`}><td><b>{r.SKU}</b></td><td>{r['Product type']}</td><td>{r['Supplier name'] || '—'}</td><td>{r.Location || '—'}</td><td><b>{dec(score)}</b></td><td><span className={`risk-badge ${riskClass(category)}`}>{category}</span></td></tr>; })}</tbody></table></div>;
}

function SupplierTable({ rows }) {
  if (!rows.length) return <div className="empty">No supplier records available.</div>;
  return <div className="table-wrap"><table><thead><tr><th>Supplier</th><th>Segment</th><th>Performance</th><th>Lead Time</th><th>Defect Rate</th><th>Manufacturing Cost</th></tr></thead><tbody>{rows.map(r => <tr key={r.name}><td><b>{r.name}</b></td><td><span className="segment-badge">Segment {r.segment + 1}</span></td><td>{dec(r.performance)}</td><td>{dec(r.lead)} d</td><td>{pct(r.defect, 2)}</td><td>{money2(r.cost)}</td></tr>)}</tbody></table></div>;
}

function DataTable({ rows, columns }) {
  if (!rows.length) return <div className="empty"><span>No records match the current filters.</span></div>;
  return <div className="table-wrap"><table><thead><tr>{columns.map(c => <th key={c}>{displayColumn(c)}</th>)}</tr></thead><tbody>{rows.slice(0, 100).map((r, i) => <tr key={`${r.SKU || i}-${i}`}>{columns.map(c => <td key={c}>{formatCell(r[c], c)}</td>)}</tr>)}</tbody></table>{rows.length > 100 && <div className="table-note">Showing first 100 of {num(rows.length)} records.</div>}</div>;
}

function displayColumn(c) {
  return c.replace('Number of products sold', 'Units Sold').replace('Revenue generated', 'Revenue').replace('Stock levels', 'Stock').replace('Order quantities', 'Orders').replace('Manufacturing lead time', 'Mfg Lead Time').replace('Manufacturing costs', 'Mfg Cost').replace('Shipping times', 'Shipping Time').replace('Shipping costs', 'Shipping Cost').replace('Shipping carriers', 'Carrier').replace('Transportation modes', 'Mode').replace('Inspection results', 'Inspection').replace('Defect rates', 'Defect Rate').replace('Product type', 'Product').replace('Supplier name', 'Supplier');
}

function formatCell(value, key) {
  if (value === null || value === undefined || value === '') return '—';
  if (['Revenue generated', 'Costs', 'Manufacturing costs', 'Shipping costs'].includes(key)) return money2(value);
  if (key === 'Defect rates') return pct(value, 2);
  if (key === 'Availability') return pct(value, 1);
  if (key === 'Price') return money2(value);
  if (key === 'Inspection results') return <span className={`inspection ${String(value).toLowerCase()}`}>{value}</span>;
  if (typeof value === 'number') return num(value);
  return String(value);
}

export default App;
