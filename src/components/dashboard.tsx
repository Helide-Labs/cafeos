const navigation = [
  { label: "Overview", icon: "⌂", active: true },
  { label: "Point of sale", icon: "▣" },
  { label: "Orders", icon: "◫", badge: "12" },
  { label: "Menu", icon: "◇" },
  { label: "Inventory", icon: "▥" },
  { label: "Customers", icon: "♙" },
  { label: "Team", icon: "♧" },
  { label: "Reports", icon: "↗" },
];

const kpis = [
  { label: "Net sales", value: "LKR 184,250", change: "+14.2%", detail: "vs. yesterday", tone: "mint", icon: "↗" },
  { label: "Orders", value: "312", change: "+8.4%", detail: "28 online", tone: "cream", icon: "◫" },
  { label: "Gross profit", value: "LKR 119,762", change: "65.0%", detail: "gross margin", tone: "blue", icon: "◎" },
  { label: "Avg. order", value: "LKR 591", change: "+5.3%", detail: "vs. last week", tone: "lilac", icon: "◇" },
];

const products = [
  { name: "Iced Latte", detail: "420 sold", value: "LKR 357,000", share: 92, color: "#356859" },
  { name: "Cappuccino", detail: "280 sold", value: "LKR 224,000", share: 71, color: "#d09a50" },
  { name: "Butter Croissant", detail: "214 sold", value: "LKR 128,400", share: 56, color: "#8e7251" },
  { name: "Matcha Latte", detail: "150 sold", value: "LKR 142,500", share: 43, color: "#829d63" },
];

const alerts = [
  { title: "Milk may run out tomorrow", detail: "8.2 L left · 12.4 L daily usage", action: "Review stock", tone: "danger", icon: "!" },
  { title: "Coffee bean cost increased 8%", detail: "17 menu item margins affected", action: "View impact", tone: "warning", icon: "↗" },
  { title: "Two team members clocked in late", detail: "Colombo 07 · Morning shift", action: "View attendance", tone: "neutral", icon: "◷" },
];

function Sparkline() {
  return (
    <svg viewBox="0 0 800 220" className="sales-chart" role="img" aria-label="Sales chart trending upward">
      <defs>
        <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#356859" stopOpacity=".22" />
          <stop offset="100%" stopColor="#356859" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="grid-lines">
        <line x1="0" y1="30" x2="800" y2="30" />
        <line x1="0" y1="90" x2="800" y2="90" />
        <line x1="0" y1="150" x2="800" y2="150" />
        <line x1="0" y1="210" x2="800" y2="210" />
      </g>
      <path d="M0 184 C42 176,60 151,99 157 S159 177,199 142 S266 114,302 131 S366 143,401 110 S467 78,506 99 S568 118,611 79 S673 51,710 63 S766 29,800 20 L800 220 L0 220 Z" fill="url(#chartFill)" />
      <path d="M0 184 C42 176,60 151,99 157 S159 177,199 142 S266 114,302 131 S366 143,401 110 S467 78,506 99 S568 118,611 79 S673 51,710 63 S766 29,800 20" fill="none" stroke="#356859" strokeWidth="4" strokeLinecap="round" />
      <circle cx="611" cy="79" r="7" fill="#fff" stroke="#356859" strokeWidth="4" />
    </svg>
  );
}

export default function Dashboard() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">C</span><span>CaféOS</span></div>
        <button className="branch-switcher">
          <span className="branch-avatar">BC</span>
          <span className="branch-copy"><strong>Bloom Coffee</strong><small>Colombo 07</small></span>
          <span className="chevron">⌄</span>
        </button>

        <nav aria-label="Primary navigation">
          <p className="nav-heading">Workspace</p>
          {navigation.map((item) => (
            <a className={`nav-item ${item.active ? "active" : ""}`} href="#" key={item.label}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </a>
          ))}
          <p className="nav-heading nav-heading-spaced">Manage</p>
          <a className="nav-item" href="#"><span className="nav-icon">⚙</span><span>Settings</span></a>
          <a className="nav-item" href="#"><span className="nav-icon">?</span><span>Help centre</span></a>
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">PS</div>
          <div className="user-copy"><strong>Pasindu Silva</strong><span>Owner</span></div>
          <button aria-label="Open user menu">•••</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation">☰</button>
          <div className="search"><span>⌕</span><input aria-label="Search" placeholder="Search orders, products, customers…" /><kbd>⌘ K</kbd></div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications">♢<span className="notification-dot" /></button>
            <button className="primary-button"><span>＋</span> New order</button>
          </div>
        </header>

        <div className="page">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">Thursday, 17 September</p>
              <h1>Good morning, Pasindu <span>☕</span></h1>
              <p>Here&apos;s what&apos;s happening at Bloom Coffee today.</p>
            </div>
            <div className="live-pill"><span /> Live · Updated just now</div>
          </section>

          <section className="kpi-grid" aria-label="Key performance indicators">
            {kpis.map((kpi) => (
              <article className={`kpi-card ${kpi.tone}`} key={kpi.label}>
                <div className="kpi-top"><span>{kpi.label}</span><span className="kpi-icon">{kpi.icon}</span></div>
                <strong>{kpi.value}</strong>
                <p><span>{kpi.change}</span> {kpi.detail}</p>
              </article>
            ))}
          </section>

          <section className="dashboard-grid">
            <article className="card sales-card">
              <div className="card-header">
                <div><p className="card-kicker">Sales performance</p><h2>LKR 1.18M</h2><p className="positive"><span>↗ 12.8%</span> from last week</p></div>
                <button className="select-button">Last 7 days <span>⌄</span></button>
              </div>
              <div className="chart-wrap">
                <div className="chart-axis"><span>200k</span><span>150k</span><span>100k</span><span>50k</span></div>
                <div className="chart-main"><Sparkline /><div className="chart-labels"><span>Fri</span><span>Sat</span><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span></div></div>
              </div>
            </article>

            <article className="card goal-card">
              <div className="card-header compact"><div><p className="card-kicker">Monthly goal</p><h3>September</h3></div><button className="more-button">•••</button></div>
              <div className="goal-ring">
                <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="49" className="goal-track" /><circle cx="60" cy="60" r="49" className="goal-progress" /></svg>
                <div><strong>74%</strong><span>on track</span></div>
              </div>
              <div className="goal-numbers"><div><span>Current</span><strong>LKR 3.7M</strong></div><div><span>Target</span><strong>LKR 5.0M</strong></div></div>
              <p className="goal-note">You need <strong>LKR 43,400/day</strong> to hit your goal.</p>
            </article>
          </section>

          <section className="dashboard-grid lower-grid">
            <article className="card products-card">
              <div className="card-header compact"><div><p className="card-kicker">Top products</p><h3>What customers love</h3></div><a href="#">View menu <span>→</span></a></div>
              <div className="product-list">
                {products.map((product, index) => (
                  <div className="product-row" key={product.name}>
                    <span className="rank">{index + 1}</span>
                    <div className="product-info"><div><strong>{product.name}</strong><span>{product.detail}</span></div><div className="product-bar"><i style={{ width: `${product.share}%`, background: product.color }} /></div></div>
                    <strong className="product-value">{product.value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="card alerts-card">
              <div className="card-header compact"><div><p className="card-kicker">Needs attention</p><h3>3 active alerts</h3></div><a href="#">View all <span>→</span></a></div>
              <div className="alert-list">
                {alerts.map((alert) => (
                  <div className="alert-row" key={alert.title}>
                    <span className={`alert-icon ${alert.tone}`}>{alert.icon}</span>
                    <div><strong>{alert.title}</strong><span>{alert.detail}</span><a href="#">{alert.action} →</a></div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <footer className="page-footer"><span>All systems operational</span><p>CaféOS · Built for better coffee businesses.</p></footer>
        </div>
      </main>
    </div>
  );
}
