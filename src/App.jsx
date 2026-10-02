
import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Papa from 'papaparse';

import {
  LayoutDashboard,
  Package,
  Boxes,
  Truck,
  Factory,
  ShieldCheck,
  Lightbulb,
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  DollarSign,
  BarChart3,
  Users,
  MapPin,
  Activity,
  ShieldAlert,
} from 'lucide-react';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';


/* =========================================================
   NAVIGATION
========================================================= */

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/suppliers', label: 'Suppliers', icon: Users },
  { to: '/logistics', label: 'Logistics', icon: Truck },
  { to: '/manufacturing', label: 'Manufacturing', icon: Factory },
  { to: '/quality', label: 'Quality', icon: ShieldCheck },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
];


/* =========================================================
   API CONFIGURATION
========================================================= */

const API_URL = 'http://127.0.0.1:8000';


/* =========================================================
   HELPER FUNCTIONS
========================================================= */

const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const num = (n) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const avg = (rows, key) =>
  rows.length
    ? rows.reduce(
        (s, r) => s + (Number(r[key]) || 0),
        0
      ) / rows.length
    : 0;

const groupSum = (rows, key, val) => {
  const m = {};

  rows.forEach((r) => {
    const k = r[key] ?? 'Unknown';
    m[k] = (m[k] || 0) + (Number(r[val]) || 0);
  });

  return Object.entries(m)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

const groupAvg = (rows, key, val) => {
  const m = {};

  rows.forEach((r) => {
    const k = r[key] ?? 'Unknown';

    if (!m[k]) {
      m[k] = {
        sum: 0,
        n: 0,
      };
    }

    m[k].sum += Number(r[val]) || 0;
    m[k].n++;
  });

  return Object.entries(m)
    .map(([name, v]) => ({
      name,
      value: v.n ? v.sum / v.n : 0,
    }))
    .sort((a, b) => b.value - a.value);
};


/* =========================================================
   APP
========================================================= */

function App() {
  const [data, setData] = useState([]);

  const [riskData, setRiskData] = useState([]);
  const [supplierPerformance, setSupplierPerformance] = useState([]);

  const [riskLoading, setRiskLoading] = useState(true);
  const [supplierPerformanceLoading, setSupplierPerformanceLoading] =
    useState(true);

  const [riskError, setRiskError] = useState('');
  const [supplierPerformanceError, setSupplierPerformanceError] =
    useState('');

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [mobile, setMobile] = useState(false);

  const [filters, setFilters] = useState({
    product: 'All',
    supplier: 'All',
    location: 'All',
  });

  const location = useLocation();


  /* =========================================================
     LOAD CSV DATA
  ========================================================= */

  useEffect(() => {
    Papa.parse('/supply_chain_data.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,

      complete: (r) => {
        setData(r.data);
        setLoading(false);
      },

      error: () => {
        setLoading(false);
      },
    });
  }, []);


  /* =========================================================
     LOAD FASTAPI RISK DATA
  ========================================================= */

  useEffect(() => {
    const loadRiskData = async () => {
      try {
        setRiskLoading(true);
        setRiskError('');

        const response = await fetch(
          `${API_URL}/api/risk-scores`
        );

        if (!response.ok) {
          throw new Error(
            `API returned ${response.status}`
          );
        }

        const result = await response.json();

        if (result.status !== 'success') {
          throw new Error(
            result.message ||
              'Unable to load risk scores'
          );
        }

        setRiskData(result.data || []);
      } catch (error) {
        console.error(
          'Risk API Error:',
          error
        );

        setRiskError(
          'Risk score API is unavailable. Please make sure FastAPI is running.'
        );
      } finally {
        setRiskLoading(false);
      }
    };

    loadRiskData();
  }, []);


  /* =========================================================
     LOAD SUPPLIER PERFORMANCE API
  ========================================================= */

  useEffect(() => {
    const loadSupplierPerformance = async () => {
      try {
        setSupplierPerformanceLoading(true);
        setSupplierPerformanceError('');

        const response = await fetch(
          `${API_URL}/api/supplier-performance`
        );

        if (!response.ok) {
          throw new Error(
            `API returned ${response.status}`
          );
        }

        const result = await response.json();

        if (result.status !== 'success') {
          throw new Error(
            result.message ||
              'Unable to load supplier performance'
          );
        }

        setSupplierPerformance(
          result.data || []
        );
      } catch (error) {
        console.error(
          'Supplier Performance API Error:',
          error
        );

        setSupplierPerformanceError(
          'Supplier performance API is unavailable.'
        );
      } finally {
        setSupplierPerformanceLoading(false);
      }
    };

    loadSupplierPerformance();
  }, []);


  /* =========================================================
     FILTER OPTIONS
  ========================================================= */

  const products = useMemo(
    () => [
      'All',
      ...new Set(
        data
          .map((r) => r['Product type'])
          .filter(Boolean)
      ),
    ],
    [data]
  );

  const suppliers = useMemo(
    () => [
      'All',
      ...new Set(
        data
          .map((r) => r['Supplier name'])
          .filter(Boolean)
      ),
    ],
    [data]
  );

  const locations = useMemo(
    () => [
      'All',
      ...new Set(
        data
          .map((r) => r.Location)
          .filter(Boolean)
      ),
    ],
    [data]
  );


  /* =========================================================
     FILTER DATA
  ========================================================= */

  const filtered = useMemo(
    () =>
      data.filter(
        (r) =>
          (filters.product === 'All' ||
            r['Product type'] ===
              filters.product) &&
          (filters.supplier === 'All' ||
            r['Supplier name'] ===
              filters.supplier) &&
          (filters.location === 'All' ||
            r.Location === filters.location)
      ),
    [data, filters]
  );


  const searchFiltered = useMemo(
    () =>
      query
        ? filtered.filter((r) =>
            Object.values(r).some((v) =>
              String(v ?? '')
                .toLowerCase()
                .includes(
                  query.toLowerCase()
                )
            )
          )
        : filtered,
    [filtered, query]
  );


  /* =========================================================
     FILTER RISK DATA
  ========================================================= */

  const filteredRiskData = useMemo(() => {
    const allowedSKUs = new Set(
      filtered.map((r) => r.SKU)
    );

    return riskData.filter((r) =>
      allowedSKUs.has(r.SKU)
    );
  }, [filtered, riskData]);


  /* =========================================================
     FILTER SUPPLIER PERFORMANCE
  ========================================================= */

  const filteredSupplierPerformance =
    useMemo(() => {
      return supplierPerformance.filter(
        (r) =>
          (filters.product === 'All' ||
            data.find(
              (d) =>
                d.SKU === r.SKU
            )?.['Product type'] ===
              filters.product) &&
          (filters.supplier === 'All' ||
            r['Supplier name'] ===
              filters.supplier) &&
          (filters.location === 'All' ||
            r.Location ===
              filters.location)
      );
    }, [
      supplierPerformance,
      filters,
      data,
    ]);


  /* =========================================================
     CONTEXT
  ========================================================= */

  const ctx = {
    data,
    rows: searchFiltered,
    filters,
    setFilters,
    products,
    suppliers,
    locations,
    riskData: filteredRiskData,
    riskLoading,
    riskError,
    supplierPerformance:
      filteredSupplierPerformance,
    supplierPerformanceLoading,
    supplierPerformanceError,
  };


  /* =========================================================
     LOADING SCREEN
  ========================================================= */

  if (loading) {
    return (
      <div className="loader">
        <div className="spinner" />
        <span>
          Loading supply chain data…
        </span>
      </div>
    );
  }


  /* =========================================================
     MAIN APP
  ========================================================= */

  return (
    <div className="app-shell">

      <aside
        className={
          mobile
            ? 'sidebar open'
            : 'sidebar'
        }
      >

        <div className="brand">

          <div className="brand-mark">
            SC
          </div>

          <div>
            <b>SUPPLYPRESCRIPT</b>
            <span>
              Supply Chain Intelligence
            </span>
          </div>

          <button
            className="icon-btn mobile-close"
            onClick={() =>
              setMobile(false)
            }
          >
            <X size={18} />
          </button>

        </div>


        <nav>

          {NAV.map((n) => {
            const I = n.icon;

            return (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() =>
                  setMobile(false)
                }
                className={({ isActive }) =>
                  isActive
                    ? 'nav-item active'
                    : 'nav-item'
                }
              >
                <I size={18} />
                <span>{n.label}</span>
              </NavLink>
            );
          })}

        </nav>


        <div className="sidebar-foot">
          <div className="status-dot" />
          <span>
            Data pipeline active
          </span>
        </div>

      </aside>


      <main className="main">

        <header className="topbar">

          <button
            className="icon-btn menu-btn"
            onClick={() =>
              setMobile(true)
            }
          >
            <Menu size={21} />
          </button>


          <div className="crumb">
            <strong>
              Supply Chain Intelligence
            </strong>
            <span> / </span>
            <span>
              {titleFor(
                location.pathname
              )}
            </span>
          </div>


          <div className="top-actions">

            <div className="search">

              <Search size={17} />

              <input
                value={query}
                onChange={(e) =>
                  setQuery(
                    e.target.value
                  )
                }
                placeholder="Search records…"
              />

            </div>


            <button className="icon-btn">
              <Bell size={18} />
              <i />
            </button>


            <div className="avatar">
              AN
            </div>

          </div>

        </header>


        <div className="content">

          <Routes>

            <Route
              path="/"
              element={
                <Dashboard {...ctx} />
              }
            />

            <Route
              path="/products"
              element={
                <Products {...ctx} />
              }
            />

            <Route
              path="/inventory"
              element={
                <Inventory {...ctx} />
              }
            />

            <Route
              path="/suppliers"
              element={
                <Suppliers {...ctx} />
              }
            />

            <Route
              path="/logistics"
              element={
                <Logistics {...ctx} />
              }
            />

            <Route
              path="/manufacturing"
              element={
                <Manufacturing {...ctx} />
              }
            />

            <Route
              path="/quality"
              element={
                <Quality {...ctx} />
              }
            />

            <Route
              path="/insights"
              element={
                <Insights {...ctx} />
              }
            />

          </Routes>

        </div>

      </main>

    </div>
  );
}


/* =========================================================
   TITLE
========================================================= */

function titleFor(path) {
  return (
    NAV.find(
      (n) => n.to === path
    )?.label ||
    'Dashboard'
  );
}


/* =========================================================
   PAGE HEADER
========================================================= */

function PageHead({
  eyebrow,
  title,
  sub,
  children,
}) {
  return (
    <div className="page-head">

      <div>

        <div className="eyebrow">
          {eyebrow}
        </div>

        <h1>{title}</h1>

        <p>{sub}</p>

      </div>

      {children}

    </div>
  );
}


/* =========================================================
   FILTERS
========================================================= */

function Filters({ ctx }) {
  return (
    <div className="filters">

      <Filter
        label="Product"
        value={ctx.filters.product}
        options={ctx.products}
        onChange={(v) =>
          ctx.setFilters({
            ...ctx.filters,
            product: v,
          })
        }
      />

      <Filter
        label="Supplier"
        value={ctx.filters.supplier}
        options={ctx.suppliers}
        onChange={(v) =>
          ctx.setFilters({
            ...ctx.filters,
            supplier: v,
          })
        }
      />

      <Filter
        label="Location"
        value={ctx.filters.location}
        options={ctx.locations}
        onChange={(v) =>
          ctx.setFilters({
            ...ctx.filters,
            location: v,
          })
        }
      />

    </div>
  );
}


function Filter({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <label className="filter">

      <span>{label}</span>

      <select
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
      >
        {options.map((x) => (
          <option key={x}>
            {x}
          </option>
        ))}
      </select>

      <ChevronDown size={14} />

    </label>
  );
}


/* =========================================================
   KPI
========================================================= */

function KPI({
  icon: Icon,
  label,
  value,
  meta,
  tone = 'cyan',
}) {
  return (
    <div className="kpi">

      <div
        className={`kpi-icon ${tone}`}
      >
        <Icon size={18} />
      </div>

      <div className="kpi-copy">

        <span>{label}</span>

        <strong>{value}</strong>

        <small>{meta}</small>

      </div>

      <ArrowUpRight
        size={15}
        className="kpi-arrow"
      />

    </div>
  );
}


/* =========================================================
   CARD
========================================================= */

function Card({
  title,
  subtitle,
  children,
  wide = false,
  action,
}) {
  return (
    <section
      className={
        wide
          ? 'card wide'
          : 'card'
      }
    >

      <div className="card-head">

        <div>

          <h3>{title}</h3>

          {subtitle && (
            <span>{subtitle}</span>
          )}

        </div>

        {action}

      </div>

      {children}

    </section>
  );
}


/* =========================================================
   CHART TOOLTIP
========================================================= */

const TT = {
  contentStyle: {
    background: '#0d1726',
    border: '1px solid #223149',
    borderRadius: 10,
    color: '#e8eef7',
  },

  itemStyle: {
    color: '#e8eef7',
  },
};


/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  rows,
  ...ctx
}) {
  const revenue = rows.reduce(
    (s, r) =>
      s +
      (+r['Revenue generated'] || 0),
    0
  );

  const sold = rows.reduce(
    (s, r) =>
      s +
      (+r['Number of products sold'] ||
        0),
    0
  );

  const stock = rows.reduce(
    (s, r) =>
      s +
      (+r['Stock levels'] || 0),
    0
  );

  const cost = rows.reduce(
    (s, r) =>
      s +
      (+r['Costs'] || 0),
    0
  );

  const product = groupSum(
    rows,
    'Product type',
    'Revenue generated'
  );

  const supplier = groupAvg(
    rows,
    'Supplier name',
    'Defect rates'
  ).slice(0, 6);

  const carrier = groupAvg(
    rows,
    'Shipping carriers',
    'Shipping times'
  );

  /* NEW DASHBOARD CHARTS */

  const revenueSalesAnalysis =
    groupSum(
      rows,
      'Product type',
      'Revenue generated'
    ).map((x) => ({
      name: x.name,
      revenue: x.value,
      units:
        rows
          .filter(
            (r) =>
              r['Product type'] ===
              x.name
          )
          .reduce(
            (s, r) =>
              s +
              (+r[
                'Number of products sold'
              ] || 0),
            0
          ),
    }));

  const inventorySales =
    groupSum(
      rows,
      'Product type',
      'Stock levels'
    ).map((x) => ({
      name: x.name,
      stock: x.value,
      sold:
        rows
          .filter(
            (r) =>
              r['Product type'] ===
              x.name
          )
          .reduce(
            (s, r) =>
              s +
              (+r[
                'Number of products sold'
              ] || 0),
            0
          ),
    }));

  return (
    <>

      <PageHead
        eyebrow="OPERATIONS OVERVIEW"
        title="Supply Chain Performance Dashboard"
        sub="A unified view of product, inventory, supplier, manufacturing and logistics performance."
      >
        <Filters ctx={ctx} />
      </PageHead>


      <div className="kpi-grid">

        <KPI
          icon={DollarSign}
          label="Total Revenue"
          value={money(revenue)}
          meta="Filtered revenue"
        />

        <KPI
          icon={Package}
          label="Products Sold"
          value={num(sold)}
          meta="Units across records"
          tone="blue"
        />

        <KPI
          icon={Boxes}
          label="Inventory Units"
          value={num(stock)}
          meta="Current stock levels"
          tone="purple"
        />

        <KPI
          icon={Truck}
          label="Supply Chain Cost"
          value={money(cost)}
          meta="Route & operating costs"
          tone="orange"
        />

        <KPI
          icon={Clock3}
          label="Avg Lead Time"
          value={
            avg(
              rows,
              'Lead time'
            ).toFixed(1) + ' d'
          }
          meta="Supplier lead time"
          tone="green"
        />

        <KPI
          icon={ShieldCheck}
          label="Avg Defect Rate"
          value={
            avg(
              rows,
              'Defect rates'
            ).toFixed(2) + '%'
          }
          meta="Quality indicator"
          tone="red"
        />

      </div>


      {/* EXISTING CHARTS */}

      <div className="grid-2">

        <Card
          title="Revenue by Product Type"
          subtitle="Contribution to filtered revenue"
        >

          <div className="chart">

            <ResponsiveContainer>

              <BarChart data={product}>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1c2a3e"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip
                  {...TT}
                  formatter={(v) =>
                    money(v)
                  }
                />

                <Bar
                  dataKey="value"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                  fill="#35c6ff"
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </Card>


        <Card
          title="Supplier Quality"
          subtitle="Average defect rate by supplier"
        >

          <div className="chart">

            <ResponsiveContainer>

              <BarChart
                data={supplier}
                layout="vertical"
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1c2a3e"
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  stroke="#708096"
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#708096"
                  width={80}
                />

                <Tooltip
                  {...TT}
                  formatter={(v) =>
                    Number(v).toFixed(
                      2
                    ) + '%'
                  }
                />

                <Bar
                  dataKey="value"
                  radius={[
                    0,
                    6,
                    6,
                    0,
                  ]}
                  fill="#a78bfa"
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </Card>

      </div>


      {/* NEW DASHBOARD AREA CHART */}

      <div className="grid-2">

        <Card
          title="Revenue & Units Sold Analysis"
          subtitle="Comparison across product categories"
        >

          <div className="chart">

            <ResponsiveContainer>

              <AreaChart
                data={
                  revenueSalesAnalysis
                }
              >

                <defs>
                  <linearGradient
                    id="revenueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#35c6ff"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor="#35c6ff"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#1c2a3e"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip {...TT} />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#35c6ff"
                  fill="url(#revenueGradient)"
                  strokeWidth={3}
                  name="Revenue"
                />

              </AreaChart>

            </ResponsiveContainer>

          </div>

        </Card>


        <Card
          title="Inventory vs Sales"
          subtitle="Stock position compared with units sold"
        >

          <div className="chart">

            <ResponsiveContainer>

              <LineChart
                data={inventorySales}
              >

                <CartesianGrid
                  stroke="#1c2a3e"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip {...TT} />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="stock"
                  stroke="#a78bfa"
                  strokeWidth={3}
                  name="Inventory"
                />

                <Line
                  type="monotone"
                  dataKey="sold"
                  stroke="#5eead4"
                  strokeWidth={3}
                  name="Units Sold"
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </Card>

      </div>


      <div className="grid-3">

        <Card
          title="Logistics Lead Time"
          subtitle="Average shipping time by carrier"
        >

          <div className="mini-chart">

            <ResponsiveContainer>

              <BarChart data={carrier}>

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip
                  {...TT}
                  formatter={(v) =>
                    Number(v).toFixed(
                      1
                    ) + ' days'
                  }
                />

                <Bar
                  dataKey="value"
                  fill="#5eead4"
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </Card>


        <Card title="Inventory Health">
          <HealthRows rows={rows} />
        </Card>


        <Card title="Operational Alerts">
          <Alerts rows={rows} />
        </Card>

      </div>

    </>
  );
}


/* =========================================================
   INVENTORY HEALTH
========================================================= */

function HealthRows({ rows }) {
  const low = rows.filter(
    (r) =>
      (+r['Stock levels'] || 0) <
      10
  ).length;

  const fail = rows.filter(
    (r) =>
      r['Inspection results'] ===
      'Fail'
  ).length;

  const late = rows.filter(
    (r) =>
      (+r['Shipping times'] || 0) >
      6
  ).length;

  return (
    <div className="health">

      <Health
        label="Low stock records"
        value={low}
        tone="red"
      />

      <Health
        label="Failed inspections"
        value={fail}
        tone="orange"
      />

      <Health
        label="Long shipping records"
        value={late}
        tone="yellow"
      />

      <Health
        label="Healthy records"
        value={Math.max(
          0,
          rows.length -
            low -
            fail
        )}
        tone="green"
      />

    </div>
  );
}


function Health({
  label,
  value,
  tone,
}) {
  return (
    <div className="health-row">

      <span>
        <i
          className={`dot ${tone}`}
        />
        {label}
      </span>

      <b>{num(value)}</b>

    </div>
  );
}


/* =========================================================
   ALERTS
========================================================= */

function Alerts({ rows }) {
  const a = [];

  const low = rows.filter(
    (r) =>
      (+r['Stock levels'] || 0) <
      10
  );

  if (low.length) {
    a.push([
      'Low inventory',
      `${low.length} records have stock below 10 units`,
      'red',
    ]);
  }

  const fail = rows.filter(
    (r) =>
      r['Inspection results'] ===
      'Fail'
  );

  if (fail.length) {
    a.push([
      'Quality attention',
      `${fail.length} records failed inspection`,
      'orange',
    ]);
  }

  const defect = rows.filter(
    (r) =>
      (+r['Defect rates'] || 0) >
      4
  );

  if (defect.length) {
    a.push([
      'Defect exposure',
      `${defect.length} records exceed 4% defect rate`,
      'yellow',
    ]);
  }

  return (
    <div className="alerts">

      {a
        .slice(0, 3)
        .map((x, i) => (

          <div
            className="alert"
            key={i}
          >

            <span
              className={`alert-icon ${x[2]}`}
            >
              <AlertTriangle
                size={15}
              />
            </span>

            <div>

              <b>{x[0]}</b>

              <p>{x[1]}</p>

            </div>

          </div>

        ))}

    </div>
  );
}


/* =========================================================
   DATA TABLE
========================================================= */

function DataTable({ rows }) {
  return (
    <div className="table-wrap">

      <table>

        <thead>

          <tr>
            <th>SKU</th>
            <th>Product</th>
            <th>Revenue</th>
            <th>Sold</th>
            <th>Stock</th>
            <th>Supplier</th>
            <th>Inspection</th>
            <th>Defect</th>
          </tr>

        </thead>


        <tbody>

          {rows.map((r, i) => (

            <tr key={i}>

              <td>
                <b>{r.SKU}</b>
              </td>

              <td>
                {r['Product type']}
              </td>

              <td>
                {money(
                  r[
                    'Revenue generated'
                  ]
                )}
              </td>

              <td>
                {num(
                  r[
                    'Number of products sold'
                  ]
                )}
              </td>

              <td>

                <span
                  className={
                    (+r[
                      'Stock levels'
                    ] || 0) < 10
                      ? 'badge danger'
                      : 'badge'
                  }
                >
                  {num(
                    r[
                      'Stock levels'
                    ]
                  )}
                </span>

              </td>

              <td>
                {r[
                  'Supplier name'
                ]}
              </td>

              <td>

                <span
                  className={
                    'status ' +
                    String(
                      r[
                        'Inspection results'
                      ]
                    ).toLowerCase()
                  }
                >
                  {
                    r[
                      'Inspection results'
                    ]
                  }
                </span>

              </td>

              <td>
                {(
                  +r[
                    'Defect rates'
                  ] || 0
                ).toFixed(2)}
                %
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}


/* =========================================================
   PRODUCTS
========================================================= */

function Products({
  rows,
  ...ctx
}) {
  const revenue = groupSum(
    rows,
    'Product type',
    'Revenue generated'
  );

  const sales = groupSum(
    rows,
    'Product type',
    'Number of products sold'
  );

  return (
    <>

      <PageHead
        eyebrow="PRODUCT ANALYTICS"
        title="Products"
        sub="Explore product-level sales, revenue, pricing and inventory signals."
      >
        <Filters ctx={ctx} />
      </PageHead>


      <div className="grid-2">

        <Card title="Revenue by Product Type">

          <div className="chart">

            <ResponsiveContainer>

              <BarChart data={revenue}>

                <CartesianGrid
                  stroke="#1c2a3e"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip
                  {...TT}
                  formatter={(v) =>
                    money(v)
                  }
                />

                <Bar
                  dataKey="value"
                  fill="#35c6ff"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </Card>


        <Card title="Units Sold by Product Type">

          <div className="chart">

            <ResponsiveContainer>

              <AreaChart data={sales}>

                <CartesianGrid
                  stroke="#1c2a3e"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip {...TT} />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#a78bfa"
                  fill="#a78bfa"
                  fillOpacity=".15"
                />

              </AreaChart>

            </ResponsiveContainer>

          </div>

        </Card>

      </div>


      <Card
        title="Product Records"
        subtitle={`${rows.length} filtered records`}
      >
        <DataTable
          rows={rows.slice(0, 100)}
        />
      </Card>

    </>
  );
}


/* =========================================================
   INVENTORY
========================================================= */

function Inventory({
  rows,
  ...ctx
}) {
  const stock = groupSum(
    rows,
    'Product type',
    'Stock levels'
  );

  const availability = groupAvg(
    rows,
    'Product type',
    'Availability'
  );

  const low = rows
    .filter(
      (r) =>
        (+r['Stock levels'] || 0) <
        10
    )
    .sort(
      (a, b) =>
        (+a['Stock levels'] || 0) -
        (+b['Stock levels'] || 0)
    );

  return (
    <>

      <PageHead
        eyebrow="INVENTORY CONTROL"
        title="Inventory & Demand"
        sub="Monitor stock exposure and availability against sales and order activity."
      >
        <Filters ctx={ctx} />
      </PageHead>


      <div className="kpi-grid four">

        <KPI
          icon={Boxes}
          label="Total Stock"
          value={num(
            rows.reduce(
              (s, r) =>
                s +
                (+r[
                  'Stock levels'
                ] || 0),
              0
            )
          )}
          meta="Units"
          tone="purple"
        />

        <KPI
          icon={Package}
          label="Low Stock"
          value={num(low.length)}
          meta="Below 10 units"
          tone="red"
        />

        <KPI
          icon={CheckCircle2}
          label="Avg Availability"
          value={
            avg(
              rows,
              'Availability'
            ).toFixed(1) + '%'
          }
          meta="Availability score"
          tone="green"
        />

        <KPI
          icon={BarChart3}
          label="Avg Order Qty"
          value={avg(
            rows,
            'Order quantities'
          ).toFixed(1)}
          meta="Units per record"
          tone="blue"
        />

      </div>


      <div className="grid-2">

        <Card title="Stock by Product Type">

          <div className="chart">

            <ResponsiveContainer>

              <BarChart data={stock}>

                <CartesianGrid
                  stroke="#1c2a3e"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip {...TT} />

                <Bar
                  dataKey="value"
                  fill="#a78bfa"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </Card>


        <Card title="Availability by Product Type">

          <div className="chart">

            <ResponsiveContainer>

              <LineChart
                data={availability}
              >

                <CartesianGrid
                  stroke="#1c2a3e"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip {...TT} />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#5eead4"
                  strokeWidth={3}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </Card>

      </div>


      <Card
        title="Low Stock Watchlist"
        subtitle="Records with stock below 10 units"
      >
        <DataTable rows={low} />
      </Card>

    </>
  );
}


/* =========================================================
   SUPPLIERS
========================================================= */

function Suppliers({
  rows,
  supplierPerformance,
  supplierPerformanceLoading,
  supplierPerformanceError,
  ...ctx
}) {
  const lead = groupAvg(
    rows,
    'Supplier name',
    'Lead time'
  );

  const prod = groupSum(
    rows,
    'Supplier name',
    'Production volumes'
  );

  const defect = groupAvg(
    rows,
    'Supplier name',
    'Defect rates'
  );

  const performanceBySupplier =
    supplierPerformance.reduce(
      (acc, row) => {
        const name =
          row['Supplier name'];

        if (!acc[name]) {
          acc[name] = {
            sum: 0,
            count: 0,
          };
        }

        acc[name].sum +=
          Number(
            row[
              'Supplier Performance Score'
            ]
          ) || 0;

        acc[name].count++;

        return acc;
      },
      {}
    );

  const performanceChart =
    Object.entries(
      performanceBySupplier
    )
      .map(([name, v]) => ({
        name,
        value:
          v.count
            ? v.sum / v.count
            : 0,
      }))
      .sort(
        (a, b) =>
          b.value - a.value
      );


  return (
    <>

      <PageHead
        eyebrow="SUPPLIER PERFORMANCE"
        title="Suppliers"
        sub="Compare supplier lead times, production volume, quality and algorithm-generated performance."
      >
        <Filters ctx={ctx} />
      </PageHead>


      <div className="grid-3">

        <Card title="Avg Supplier Lead Time">

          <div className="chart">

            <ResponsiveContainer>

              <BarChart data={lead}>

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip
                  {...TT}
                  formatter={(v) =>
                    Number(v).toFixed(
                      1
                    ) + ' days'
                  }
                />

                <Bar
                  dataKey="value"
                  fill="#35c6ff"
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </Card>


        <Card title="Production Volume">

          <div className="chart">

            <ResponsiveContainer>

              <BarChart data={prod}>

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip {...TT} />

                <Bar
                  dataKey="value"
                  fill="#5eead4"
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </Card>


        <Card title="Defect Rate">

          <div className="chart">

            <ResponsiveContainer>

              <BarChart data={defect}>

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip
                  {...TT}
                  formatter={(v) =>
                    Number(v).toFixed(
                      2
                    ) + '%'
                  }
                />

                <Bar
                  dataKey="value"
                  fill="#fb7185"
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </Card>

      </div>


      <Card
        title="Supplier Performance Analysis"
        subtitle="Average supplier performance score generated by the FastAPI algorithm"
      >

        {supplierPerformanceLoading ? (
          <div
            style={{
              padding: 30,
              textAlign: 'center',
            }}
          >
            Loading supplier performance...
          </div>
        ) : supplierPerformanceError ? (
          <div
            style={{
              padding: 20,
            }}
          >
            {supplierPerformanceError}
          </div>
        ) : (
          <div className="chart">

            <ResponsiveContainer>

              <BarChart
                data={
                  performanceChart
                }
              >

                <CartesianGrid
                  stroke="#1c2a3e"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                  domain={[0, 100]}
                />

                <Tooltip
                  {...TT}
                  formatter={(v) =>
                    Number(v).toFixed(
                      2
                    )
                  }
                />

                <Bar
                  dataKey="value"
                  fill="#a78bfa"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>
        )}

      </Card>


      <Card title="Supplier Summary">

        <div className="supplier-grid">

          {lead.map((x) => (

            <div
              className="supplier-card"
              key={x.name}
            >

              <div className="supplier-avatar">
                {x.name.replace(
                  'Supplier ',
                  'S'
                )}
              </div>

              <div>

                <b>{x.name}</b>

                <span>
                  Lead time{' '}
                  {x.value.toFixed(
                    1
                  )}{' '}
                  days
                </span>

                <span>
                  Defect{' '}
                  {(
                    defect.find(
                      (d) =>
                        d.name ===
                        x.name
                    )?.value || 0
                  ).toFixed(2)}
                  %
                </span>

              </div>

            </div>

          ))}

        </div>

      </Card>

    </>
  );
}


/* =========================================================
   LOGISTICS
========================================================= */

function Logistics({
  rows,
  ...ctx
}) {
  const carrier = groupAvg(
    rows,
    'Shipping carriers',
    'Shipping costs'
  );

  const carrierTime = groupAvg(
    rows,
    'Shipping carriers',
    'Shipping times'
  );

  const mode = groupSum(
    rows,
    'Transportation modes',
    'Costs'
  );

  const route = groupAvg(
    rows,
    'Routes',
    'Shipping times'
  );

  const shippingRelationship =
    rows
      .map((r) => ({
        time:
          Number(
            r['Shipping times']
          ) || 0,

        cost:
          Number(
            r['Shipping costs']
          ) || 0,

        sku: r.SKU,
      }))
      .filter(
        (r) =>
          Number.isFinite(
            r.time
          ) &&
          Number.isFinite(
            r.cost
          )
      );

  return (
    <>

      <PageHead
        eyebrow="LOGISTICS CONTROL"
        title="Logistics"
        sub="Track carriers, transportation modes, routes, shipping time and cost."
      >
        <Filters ctx={ctx} />
      </PageHead>


      <div className="kpi-grid four">

        <KPI
          icon={Truck}
          label="Avg Shipping Time"
          value={
            avg(
              rows,
              'Shipping times'
            ).toFixed(1) + ' d'
          }
          meta="Per record"
          tone="blue"
        />

        <KPI
          icon={DollarSign}
          label="Avg Shipping Cost"
          value={money(
            avg(
              rows,
              'Shipping costs'
            )
          )}
          meta="Carrier cost"
          tone="orange"
        />

        <KPI
          icon={MapPin}
          label="Routes"
          value={
            new Set(
              rows.map(
                (r) => r.Routes
              )
            ).size
          }
          meta="Distinct routes"
          tone="purple"
        />

        <KPI
          icon={Truck}
          label="Carriers"
          value={
            new Set(
              rows.map(
                (r) =>
                  r[
                    'Shipping carriers'
                  ]
              )
            ).size
          }
          meta="Active carriers"
          tone="green"
        />

      </div>


      <div className="grid-3">

        <Card title="Shipping Cost by Carrier">

          <div className="chart">

            <ResponsiveContainer>

              <BarChart data={carrier}>

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip
                  {...TT}
                  formatter={(v) =>
                    money(v)
                  }
                />

                <Bar
                  dataKey="value"
                  fill="#35c6ff"
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </Card>


        <Card title="Cost by Transport Mode">

          <div className="chart">

            <ResponsiveContainer>

              <PieChart>

                <Pie
                  data={mode}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                >

                  {mode.map(
                    (_, i) => (
                      <Cell
                        key={i}
                        fill={
                          [
                            '#35c6ff',
                            '#a78bfa',
                            '#5eead4',
                            '#fb923c',
                            '#fb7185',
                          ][
                            i % 5
                          ]
                        }
                      />
                    )
                  )}

                </Pie>

                <Tooltip
                  {...TT}
                  formatter={(v) =>
                    money(v)
                  }
                />

                <Legend />

              </PieChart>

            </ResponsiveContainer>

          </div>

        </Card>


        <Card title="Avg Route Shipping Time">

          <div className="chart">

            <ResponsiveContainer>

              <BarChart data={route}>

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip
                  {...TT}
                  formatter={(v) =>
                    Number(v).toFixed(
                      1
                    ) + ' d'
                  }
                />

                <Bar
                  dataKey="value"
                  fill="#5eead4"
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </Card>

      </div>


      {/* NEW LOGISTICS LINE CHART */}

      <div className="grid-2">

        <Card
          title="Shipping Time by Carrier"
          subtitle="Average delivery time comparison"
        >

          <div className="chart">

            <ResponsiveContainer>

              <LineChart
                data={carrierTime}
              >

                <CartesianGrid
                  stroke="#1c2a3e"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip
                  {...TT}
                  formatter={(v) =>
                    Number(v).toFixed(
                      1
                    ) + ' days'
                  }
                />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#35c6ff"
                  strokeWidth={3}
                  dot={{
                    r: 5,
                  }}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </Card>


        {/* NEW LOGISTICS SCATTER */}

        <Card
          title="Shipping Cost vs Shipping Time"
          subtitle="Relationship between delivery time and shipping cost"
        >

          <div className="chart">

            <ResponsiveContainer>

              <ScatterChart>

                <CartesianGrid
                  stroke="#1c2a3e"
                />

                <XAxis
                  type="number"
                  dataKey="time"
                  name="Shipping Time"
                  stroke="#708096"
                  label={{
                    value:
                      'Shipping Time (days)',
                    position:
                      'insideBottom',
                    offset: -5,
                    fill: '#708096',
                  }}
                />

                <YAxis
                  type="number"
                  dataKey="cost"
                  name="Shipping Cost"
                  stroke="#708096"
                  label={{
                    value:
                      'Shipping Cost',
                    angle: -90,
                    position:
                      'insideLeft',
                    fill: '#708096',
                  }}
                />

                <ZAxis
                  range={[40, 40]}
                />

                <Tooltip
                  {...TT}
                  cursor={{
                    strokeDasharray:
                      '3 3',
                  }}
                  formatter={(value) =>
                    Number(
                      value
                    ).toFixed(2)
                  }
                />

                <Scatter
                  name="Shipping Records"
                  data={
                    shippingRelationship
                  }
                  fill="#5eead4"
                />

              </ScatterChart>

            </ResponsiveContainer>

          </div>

        </Card>

      </div>

    </>
  );
}


/* =========================================================
   MANUFACTURING
========================================================= */

function Manufacturing({
  rows,
  ...ctx
}) {
  const volume = groupSum(
    rows,
    'Product type',
    'Production volumes'
  );

  const mcost = groupAvg(
    rows,
    'Product type',
    'Manufacturing costs'
  );

  const lead = groupAvg(
    rows,
    'Product type',
    'Manufacturing lead time'
  );

  const productionCost =
    rows
      .map((r) => ({
        volume:
          Number(
            r['Production volumes']
          ) || 0,

        cost:
          Number(
            r[
              'Manufacturing costs'
            ]
          ) || 0,

        sku: r.SKU,
      }))
      .filter(
        (r) =>
          Number.isFinite(
            r.volume
          ) &&
          Number.isFinite(
            r.cost
          )
      );

  return (
    <>

      <PageHead
        eyebrow="PRODUCTION OPERATIONS"
        title="Manufacturing"
        sub="Understand production volume, manufacturing lead time and unit cost patterns."
      >
        <Filters ctx={ctx} />
      </PageHead>


      <div className="kpi-grid four">

        <KPI
          icon={Factory}
          label="Production Volume"
          value={num(
            rows.reduce(
              (s, r) =>
                s +
                (+r[
                  'Production volumes'
                ] || 0),
              0
            )
          )}
          meta="Total units"
          tone="blue"
        />

        <KPI
          icon={Clock3}
          label="Manufacturing Lead"
          value={
            avg(
              rows,
              'Manufacturing lead time'
            ).toFixed(1) + ' d'
          }
          meta="Average"
          tone="purple"
        />

        <KPI
          icon={DollarSign}
          label="Manufacturing Cost"
          value={money(
            avg(
              rows,
              'Manufacturing costs'
            )
          )}
          meta="Average record cost"
          tone="orange"
        />

        <KPI
          icon={Factory}
          label="Locations"
          value={
            new Set(
              rows.map(
                (r) => r.Location
              )
            ).size
          }
          meta="Production locations"
          tone="green"
        />

      </div>


      <div className="grid-3">

        <Card title="Production Volume">

          <div className="chart">

            <ResponsiveContainer>

              <BarChart data={volume}>

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip {...TT} />

                <Bar
                  dataKey="value"
                  fill="#35c6ff"
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </Card>


        <Card title="Manufacturing Cost">

          <div className="chart">

            <ResponsiveContainer>

              <AreaChart data={mcost}>

                <CartesianGrid
                  stroke="#1c2a3e"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip
                  {...TT}
                  formatter={(v) =>
                    money(v)
                  }
                />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#fb923c"
                  fill="#fb923c"
                  fillOpacity=".15"
                  strokeWidth={3}
                />

              </AreaChart>

            </ResponsiveContainer>

          </div>

        </Card>


        <Card title="Manufacturing Lead Time">

          <div className="chart">

            <ResponsiveContainer>

              <LineChart data={lead}>

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip
                  {...TT}
                  formatter={(v) =>
                    Number(v).toFixed(
                      1
                    ) + ' days'
                  }
                />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#a78bfa"
                  strokeWidth={3}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </Card>

      </div>


      {/* NEW MANUFACTURING SCATTER */}

      <Card
        title="Production Volume vs Manufacturing Cost"
        subtitle="Relationship between production output and manufacturing cost"
      >

        <div className="chart">

          <ResponsiveContainer>

            <ScatterChart>

              <CartesianGrid
                stroke="#1c2a3e"
              />

              <XAxis
                type="number"
                dataKey="volume"
                name="Production Volume"
                stroke="#708096"
                label={{
                  value:
                    'Production Volume',
                  position:
                    'insideBottom',
                  offset: -5,
                  fill: '#708096',
                }}
              />

              <YAxis
                type="number"
                dataKey="cost"
                name="Manufacturing Cost"
                stroke="#708096"
                label={{
                  value:
                    'Manufacturing Cost',
                  angle: -90,
                  position:
                    'insideLeft',
                  fill: '#708096',
                }}
              />

              <ZAxis
                range={[40, 40]}
              />

              <Tooltip
                {...TT}
                cursor={{
                  strokeDasharray:
                    '3 3',
                }}
                formatter={(value) =>
                  Number(
                    value
                  ).toFixed(2)
                }
              />

              <Scatter
                name="Production Records"
                data={
                  productionCost
                }
                fill="#a78bfa"
              />

            </ScatterChart>

          </ResponsiveContainer>

        </div>

      </Card>

    </>
  );
}


/* =========================================================
   QUALITY
========================================================= */

function Quality({
  rows,
  ...ctx
}) {
  const inspections = groupSum(
    rows,
    'Inspection results',
    'Number of products sold'
  );

  const defects = groupAvg(
    rows,
    'Product type',
    'Defect rates'
  );

  return (
    <>

      <PageHead
        eyebrow="QUALITY MANAGEMENT"
        title="Quality"
        sub="Monitor inspections, defect exposure and product quality signals."
      >
        <Filters ctx={ctx} />
      </PageHead>


      <div className="kpi-grid four">

        <KPI
          icon={ShieldCheck}
          label="Avg Defect Rate"
          value={
            avg(
              rows,
              'Defect rates'
            ).toFixed(2) + '%'
          }
          meta="Across filtered records"
          tone="red"
        />

        <KPI
          icon={CheckCircle2}
          label="Passed"
          value={
            rows.filter(
              (r) =>
                r[
                  'Inspection results'
                ] === 'Pass'
            ).length
          }
          meta="Inspection records"
          tone="green"
        />

        <KPI
          icon={AlertTriangle}
          label="Failed"
          value={
            rows.filter(
              (r) =>
                r[
                  'Inspection results'
                ] === 'Fail'
            ).length
          }
          meta="Inspection records"
          tone="orange"
        />

        <KPI
          icon={Clock3}
          label="Pending"
          value={
            rows.filter(
              (r) =>
                r[
                  'Inspection results'
                ] === 'Pending'
            ).length
          }
          meta="Inspection records"
          tone="yellow"
        />

      </div>


      <div className="grid-2">

        <Card title="Inspection Distribution">

          <div className="chart">

            <ResponsiveContainer>

              <PieChart>

                <Pie
                  data={inspections}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                >

                  {inspections.map(
                    (_, i) => (
                      <Cell
                        key={i}
                        fill={
                          [
                            '#5eead4',
                            '#fb7185',
                            '#fbbf24',
                          ][
                            i % 3
                          ]
                        }
                      />
                    )
                  )}

                </Pie>

                <Tooltip {...TT} />

                <Legend />

              </PieChart>

            </ResponsiveContainer>

          </div>

        </Card>


        <Card title="Defect Rate by Product Type">

          <div className="chart">

            <ResponsiveContainer>

              <BarChart data={defects}>

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip
                  {...TT}
                  formatter={(v) =>
                    Number(v).toFixed(
                      2
                    ) + '%'
                  }
                />

                <Bar
                  dataKey="value"
                  fill="#fb7185"
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </Card>

      </div>


      <Card title="Quality Records">

        <DataTable
          rows={rows
            .filter(
              (r) =>
                r[
                  'Inspection results'
                ] === 'Fail'
            )
            .sort(
              (a, b) =>
                (+b[
                  'Defect rates'
                ] || 0) -
                (+a[
                  'Defect rates'
                ] || 0)
            )}
        />

      </Card>

    </>
  );
}


/* =========================================================
   RISK SCORE SUMMARY
========================================================= */

function RiskSummary({
  riskData,
  riskLoading,
  riskError,
}) {
  if (riskLoading) {
    return (
      <Card
        title="Supply Chain Risk Engine"
        subtitle="Loading algorithm results from FastAPI..."
      >
        <div
          style={{
            padding: '30px 10px',
            textAlign: 'center',
          }}
        >
          <Activity
            size={28}
            style={{
              marginBottom: 10,
            }}
          />

          <p>
            Connecting to
            SupplyPrescript Risk
            Score API...
          </p>
        </div>
      </Card>
    );
  }


  if (riskError) {
    return (
      <Card
        title="Supply Chain Risk Engine"
        subtitle="FastAPI connection"
      >
        <div
          style={{
            padding: 20,
          }}
        >

          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
            }}
          >

            <ShieldAlert
              size={24}
            />

            <div>

              <b>
                Risk API unavailable
              </b>

              <p
                style={{
                  marginTop: 5,
                }}
              >
                {riskError}
              </p>

            </div>

          </div>

        </div>
      </Card>
    );
  }


  const high =
    riskData.filter(
      (r) =>
        r['Risk Category'] ===
        'High Risk'
    ).length;

  const medium =
    riskData.filter(
      (r) =>
        r['Risk Category'] ===
        'Medium Risk'
    ).length;

  const low =
    riskData.filter(
      (r) =>
        r['Risk Category'] ===
        'Low Risk'
    ).length;

  const averageRisk =
    riskData.length
      ? riskData.reduce(
          (sum, r) =>
            sum +
            (Number(
              r[
                'Supply Chain Risk Score'
              ]
            ) || 0),
          0
        ) / riskData.length
      : 0;


  const distribution = [
    {
      name: 'High Risk',
      value: high,
    },
    {
      name: 'Medium Risk',
      value: medium,
    },
    {
      name: 'Low Risk',
      value: low,
    },
  ];


  return (
    <>

      <div className="kpi-grid four">

        <KPI
          icon={Activity}
          label="Avg Risk Score"
          value={averageRisk.toFixed(
            2
          )}
          meta="Algorithm output"
          tone="purple"
        />

        <KPI
          icon={ShieldAlert}
          label="High Risk"
          value={num(high)}
          meta="Records requiring attention"
          tone="red"
        />

        <KPI
          icon={AlertTriangle}
          label="Medium Risk"
          value={num(medium)}
          meta="Records to monitor"
          tone="orange"
        />

        <KPI
          icon={CheckCircle2}
          label="Low Risk"
          value={num(low)}
          meta="Lower risk records"
          tone="green"
        />

      </div>


      <div className="grid-2">

        <Card
          title="Risk Category Distribution"
          subtitle="Output generated by the Supply Chain Risk Score algorithm"
        >

          <div className="chart">

            <ResponsiveContainer>

              <PieChart>

                <Pie
                  data={distribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                >

                  <Cell fill="#fb7185" />

                  <Cell fill="#fb923c" />

                  <Cell fill="#5eead4" />

                </Pie>

                <Tooltip {...TT} />

                <Legend />

              </PieChart>

            </ResponsiveContainer>

          </div>

        </Card>


        <Card
          title="Highest Risk Records"
          subtitle="Top records returned by the algorithm"
        >

          <div
            style={{
              display: 'flex',
              flexDirection:
                'column',
              gap: 10,
              padding:
                '5px 0',
            }}
          >

            {riskData
              .slice()
              .sort(
                (a, b) =>
                  (Number(
                    b[
                      'Supply Chain Risk Score'
                    ]
                  ) || 0) -
                  (Number(
                    a[
                      'Supply Chain Risk Score'
                    ]
                  ) || 0)
              )
              .slice(0, 5)
              .map((r) => (

                <div
                  key={r.SKU}
                  style={{
                    display:
                      'flex',
                    justifyContent:
                      'space-between',
                    alignItems:
                      'center',
                    gap: 15,
                    padding:
                      '10px 12px',
                    border:
                      '1px solid #223149',
                    borderRadius: 10,
                  }}
                >

                  <div>

                    <b>{r.SKU}</b>

                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.7,
                        marginTop: 3,
                      }}
                    >
                      {r[
                        'Product type'
                      ] ||
                        'Product'}
                    </div>

                  </div>


                  <div
                    style={{
                      textAlign:
                        'right',
                    }}
                  >

                    <strong>
                      {Number(
                        r[
                          'Supply Chain Risk Score'
                        ]
                      ).toFixed(
                        2
                      )}
                    </strong>

                    <div
                      style={{
                        fontSize: 12,
                        marginTop: 3,
                      }}
                    >
                      {r[
                        'Risk Category'
                      ]}
                    </div>

                  </div>

                </div>

              ))}

          </div>

        </Card>

      </div>

    </>
  );
}


/* =========================================================
   RISK TABLE
========================================================= */

function RiskTable({
  riskData,
}) {
  const sorted = riskData
    .slice()
    .sort(
      (a, b) =>
        (Number(
          b[
            'Supply Chain Risk Score'
          ]
        ) || 0) -
        (Number(
          a[
            'Supply Chain Risk Score'
          ]
        ) || 0)
    );


  const getRiskClass = (
    category
  ) => {
    if (
      category ===
      'High Risk'
    ) {
      return 'status fail';
    }

    if (
      category ===
      'Medium Risk'
    ) {
      return 'status pending';
    }

    return 'status pass';
  };


  return (
    <div className="table-wrap">

      <table>

        <thead>

          <tr>
            <th>SKU</th>
            <th>Product</th>
            <th>Supplier</th>
            <th>Location</th>
            <th>Risk Score</th>
            <th>Risk Category</th>
          </tr>

        </thead>


        <tbody>

          {sorted
            .slice(0, 50)
            .map((r) => (

              <tr key={r.SKU}>

                <td>
                  <b>{r.SKU}</b>
                </td>

                <td>
                  {r[
                    'Product type'
                  ]}
                </td>

                <td>
                  {r[
                    'Supplier name'
                  ]}
                </td>

                <td>
                  {r.Location}
                </td>

                <td>
                  <b>
                    {Number(
                      r[
                        'Supply Chain Risk Score'
                      ]
                    ).toFixed(
                      2
                    )}
                  </b>
                </td>

                <td>

                  <span
                    className={getRiskClass(
                      r[
                        'Risk Category'
                      ]
                    )}
                  >
                    {
                      r[
                        'Risk Category'
                      ]
                    }
                  </span>

                </td>

              </tr>

            ))}

        </tbody>

      </table>

    </div>
  );
}


/* =========================================================
   INSIGHTS
========================================================= */

function Insights({
  rows,
  riskData,
  riskLoading,
  riskError,
  supplierPerformance,
  supplierPerformanceLoading,
  supplierPerformanceError,
  ...ctx
}) {
  const low = rows.filter(
    (r) =>
      (+r['Stock levels'] || 0) <
      10
  );

  const highDef = rows.filter(
    (r) =>
      (+r['Defect rates'] || 0) >=
      4
  );

  const longShip = rows.filter(
    (r) =>
      (+r['Shipping times'] || 0) >=
      7
  );

  const failed = rows.filter(
    (r) =>
      r[
        'Inspection results'
      ] === 'Fail'
  );


  /* =========================================================
     OPERATIONAL RISK CHART
  ========================================================= */

  const operationalRisk = [
    {
      name: 'Low Stock',
      value: low.length,
    },
    {
      name: 'High Defects',
      value: highDef.length,
    },
    {
      name: 'Long Shipping',
      value: longShip.length,
    },
    {
      name: 'Inspection Failures',
      value: failed.length,
    },
  ];


  /* =========================================================
     SUPPLIER PERFORMANCE CHART
  ========================================================= */

  const performanceBySupplier =
    supplierPerformance.reduce(
      (acc, row) => {
        const supplier =
          row[
            'Supplier name'
          ];

        if (!acc[supplier]) {
          acc[supplier] = {
            sum: 0,
            count: 0,
          };
        }

        acc[supplier].sum +=
          Number(
            row[
              'Supplier Performance Score'
            ]
          ) || 0;

        acc[supplier].count++;

        return acc;
      },
      {}
    );

  const supplierPerformanceChart =
    Object.entries(
      performanceBySupplier
    )
      .map(([name, value]) => ({
        name,
        value:
          value.count
            ? value.sum /
              value.count
            : 0,
      }))
      .sort(
        (a, b) =>
          b.value - a.value
      );


  return (
    <>

      <PageHead
        eyebrow="DECISION SUPPORT"
        title="Operational Insights"
        sub="Rule-based observations and algorithm-generated supply chain risk indicators."
      >
        <Filters
          ctx={{
            ...ctx,
            riskData,
          }}
        />
      </PageHead>


      <div className="insight-hero">

        <div className="insight-icon">
          <Lightbulb />
        </div>

        <div>

          <b>
            Insight engine active
          </b>

          <p>
            These alerts use transparent
            operational thresholds from
            the supply chain dataset.
          </p>

        </div>

      </div>


      <div className="insight-grid">

        <Insight
          icon={Boxes}
          title="Inventory Risk"
          tone="red"
          count={low.length}
          text={
            low.length
              ? `${low.length} records have stock below 10 units. Review replenishment needs against order quantities.`
              : 'No records currently fall below the low-stock threshold.'
          }
        />


        <Insight
          icon={ShieldCheck}
          title="Quality Exposure"
          tone="orange"
          count={highDef.length}
          text={
            highDef.length
              ? `${highDef.length} records have defect rates at or above 4%. Prioritize supplier and product-level review.`
              : 'No records currently exceed the defect-rate threshold.'
          }
        />


        <Insight
          icon={Truck}
          title="Shipping Delay"
          tone="yellow"
          count={longShip.length}
          text={
            longShip.length
              ? `${longShip.length} records have shipping times of 7 days or more. Compare carrier and route performance.`
              : 'No records currently exceed the long-shipping threshold.'
          }
        />


        <Insight
          icon={AlertTriangle}
          title="Inspection Failures"
          tone="purple"
          count={failed.length}
          text={
            failed.length
              ? `${failed.length} records failed inspection. Investigate associated suppliers, products and manufacturing costs.`
              : 'No failed inspection records in the current filter.'
          }
        />

      </div>


      {/* NEW INSIGHTS CHART */}

      <div
        className="grid-2"
        style={{
          marginTop: 24,
        }}
      >

        <Card
          title="Operational Risk Signals"
          subtitle="Comparison of rule-based supply chain alerts"
        >

          <div className="chart">

            <ResponsiveContainer>

              <BarChart
                data={
                  operationalRisk
                }
              >

                <CartesianGrid
                  stroke="#1c2a3e"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  stroke="#708096"
                />

                <YAxis
                  stroke="#708096"
                />

                <Tooltip
                  {...TT}
                />

                <Bar
                  dataKey="value"
                  fill="#fb923c"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </Card>


        <Card
          title="Supplier Performance"
          subtitle="Average algorithm-generated supplier performance score"
        >

          {supplierPerformanceLoading ? (
            <div
              style={{
                padding: 30,
                textAlign:
                  'center',
              }}
            >
              Loading supplier
              performance...
            </div>
          ) : supplierPerformanceError ? (
            <div
              style={{
                padding: 20,
              }}
            >
              {
                supplierPerformanceError
              }
            </div>
          ) : (
            <div className="chart">

              <ResponsiveContainer>

                <BarChart
                  data={
                    supplierPerformanceChart
                  }
                >

                  <CartesianGrid
                    stroke="#1c2a3e"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    stroke="#708096"
                  />

                  <YAxis
                    stroke="#708096"
                    domain={[
                      0,
                      100,
                    ]}
                  />

                  <Tooltip
                    {...TT}
                    formatter={(v) =>
                      Number(
                        v
                      ).toFixed(
                        2
                      )
                    }
                  />

                  <Bar
                    dataKey="value"
                    fill="#a78bfa"
                    radius={[
                      6,
                      6,
                      0,
                      0,
                    ]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>
          )}

        </Card>

      </div>


      {/* FASTAPI ALGORITHM SECTION */}

      <div
        style={{
          marginTop: 24,
          marginBottom: 24,
        }}
      >

        <RiskSummary
          riskData={riskData}
          riskLoading={
            riskLoading
          }
          riskError={riskError}
        />

      </div>


      {/* RISK TABLE */}

      {!riskLoading &&
        !riskError &&
        riskData.length > 0 && (

          <Card
            title="Supply Chain Risk Analysis"
            subtitle="Risk scores generated by the FastAPI algorithm"
          >

            <RiskTable
              riskData={
                riskData
              }
            />

          </Card>

        )}


      {/* PRIORITY TABLE */}

      <Card
        title="Priority Records"
        subtitle="Combined rule-based risk signals"
      >

        <DataTable
          rows={[
            ...new Map(
              [
                ...low,
                ...highDef,
                ...failed,
              ].map((r) => [
                r.SKU,
                r,
              ])
            ).values(),
          ].slice(0, 20)}
        />

      </Card>

    </>
  );
}


/* =========================================================
   INSIGHT CARD
========================================================= */

function Insight({
  icon: Icon,
  title,
  tone,
  count,
  text,
}) {
  return (
    <div className="insight-card">

      <div
        className={`insight-icon ${tone}`}
      >
        <Icon size={21} />
      </div>


      <div className="insight-top">

        <div>

          <b>{title}</b>

          <span>
            {count} records
          </span>

        </div>

        <ArrowUpRight
          size={16}
        />

      </div>


      <p>{text}</p>

    </div>
  );
}


/* =========================================================
   EXPORT
========================================================= */

export default App;
