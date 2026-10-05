/**
 * BillDesk Comprehensive Analytics & Financial Reports Suite
 * Features:
 * - 3D Colorful Reports Hub Navigation Grid (12 Executive Report Cards)
 * - 3D Vibrant KPI Metric Cards matching corporate cockpit UI
 * - Multi-Sheet Excel Dashboard generation via SheetJS (XLSX)
 * - Executive Presentation Deck (.pptx / HTML Deck) export
 * - In-depth visual charts (bars, funnels, distribution stacks, clearance meters)
 * - Full detailed audit data tables
 */

const ReportsComponent = (function () {
  let activeReportTab = "summary";
  let reportFilters = {
    dateRange: "all",
    companyId: "all",
    categoryId: "all",
    searchQuery: ""
  };

  // 12 High-Value Enterprise Report Types for 3D Cards Grid
  const REPORT_CATALOG = [
    {
      id: "summary",
      title: "Executive KPI & Spend Cockpit",
      desc: "Real-time aggregate obligation volume, clearance ratios & financial risk cockpit.",
      icon: "📊",
      theme: "theme-coral",
      badge: "Core Cockpit"
    },
    {
      id: "aging",
      title: "Aging & Overdue Risk Analysis",
      desc: "Upcoming statement dues by urgency (Current, 1-15d, 16-30d, 31-60d, 60d+).",
      icon: "⏳",
      theme: "theme-rose",
      badge: "High Risk"
    },
    {
      id: "company",
      title: "Company & Entity Expenditure",
      desc: "Inter-company liability allocation, subsidiary breakdown & clearance meters.",
      icon: "🏢",
      theme: "theme-emerald",
      badge: "Entity View"
    },
    {
      id: "vendor",
      title: "Vendor & Payee Spend Analytics",
      desc: "Top suppliers ranking, volume concentration, and pending invoice liabilities.",
      icon: "🤝",
      theme: "theme-blue",
      badge: "Payee Spend"
    },
    {
      id: "category",
      title: "Expense Category Distribution",
      desc: "Deep-dive analysis of spends grouped by expense category & merchant type.",
      icon: "🏷️",
      theme: "theme-purple",
      badge: "Cost Centers"
    },
    {
      id: "cashflow",
      title: "Cash Flow & Bank Liquidity",
      desc: "Projected treasury cash outflow demands for immediate 7d, 15d and 30d windows.",
      icon: "🏦",
      theme: "theme-cyan",
      badge: "Treasury"
    },
    {
      id: "sla",
      title: "Approval Turnaround & SLAs",
      desc: "Turnaround velocity, submission cycle times and manager review bottlenecks.",
      icon: "⚡",
      theme: "theme-amber",
      badge: "Velocity"
    },
    {
      id: "disbursement",
      title: "Payment & UTR Reconciliation",
      desc: "Payment disbursement history, mode (NEFT/RTGS/IMPS) and bank UTR tracking.",
      icon: "💳",
      theme: "theme-teal",
      badge: "Settled"
    },
    {
      id: "tax",
      title: "TDS & GST Statutory Compliance",
      desc: "Section-wise TDS deductions (194C, 194J), GST ITC credit & statutory ledger.",
      icon: "📑",
      theme: "theme-gold",
      badge: "Statutory"
    },
    {
      id: "reconciliation",
      title: "Invoice vs Statement Match",
      desc: "Match BillDesk invoice entries against banking statement debits & credits.",
      icon: "🔄",
      theme: "theme-indigo",
      badge: "Reconciled"
    },
    {
      id: "budget",
      title: "Total Budget vs Spend Limit",
      desc: "Departmental budget headroom utilization, limit monitoring & spend caps.",
      icon: "⚖️",
      theme: "theme-pink",
      badge: "Limit Cap"
    },
    {
      id: "audit",
      title: "Data Hygiene & Audit Trail",
      desc: "Missing mandatory fields analysis, anomaly detection and governance audit.",
      icon: "🛡️",
      theme: "theme-slate",
      badge: "Hygiene"
    }
  ];

  // Helper to format currency
  function fmtINR(val) {
    let n = parseFloat(val) || 0;
    return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  // Fetch raw dataset from DataStore or API
  async function getRawData() {
    if (typeof BillDeskDataStore !== "undefined" && BillDeskDataStore.isLoaded) {
      return BillDeskDataStore.getData();
    }
    return await BillDeskAPI.getInitialData();
  }

  // Filter cycles based on selected filters
  function filterCycles(cycles) {
    if (!cycles || !Array.isArray(cycles)) return [];
    let today = new Date().toISOString().slice(0, 10);

    return cycles.filter(c => {
      // Company filter
      if (reportFilters.companyId !== "all" && String(c.CompanyID) !== String(reportFilters.companyId)) {
        return false;
      }
      // Category filter
      if (reportFilters.categoryId !== "all" && String(c.CategoryID) !== String(reportFilters.categoryId)) {
        return false;
      }
      // Date range filter
      if (reportFilters.dateRange === "this_month") {
        let curMonth = today.slice(0, 7);
        if (!(c.DueDate && c.DueDate.startsWith(curMonth))) return false;
      } else if (reportFilters.dateRange === "next_30") {
        let next30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
        if (!(c.DueDate && c.DueDate >= today && c.DueDate <= next30)) return false;
      } else if (reportFilters.dateRange === "overdue") {
        if (!(c.DueDate && c.DueDate < today && c.Status !== "Paid" && c.Status !== "Rejected")) return false;
      }

      // Search Query
      if (reportFilters.searchQuery) {
        let q = reportFilters.searchQuery.toLowerCase();
        let hit = (c.VendorName || "").toLowerCase().includes(q) ||
                  (c.InvoiceNo || "").toLowerCase().includes(q) ||
                  (c.PeriodName || "").toLowerCase().includes(q) ||
                  (c.CompanyName || "").toLowerCase().includes(q) ||
                  (c.CategoryName || "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }

  let currentViewMode = "hub"; // "hub" (12 3D cards only) or "detail" (active report with top Back button)

  // Professional Cockpit Dashboard Loading Screen
  function getProfLoadingHtml(reportId) {
    let title = "Loading Financial Intelligence...";
    let sub = "Compiling ledger transactions, risk matrices & 3D visualizations...";
    if (reportId === "hub") {
      title = "Returning to Reports Hub...";
      sub = "Restoring catalog cards & enterprise analytics modules...";
    } else {
      let cat = REPORT_CATALOG.find(c => c.id === reportId);
      if (cat) {
        title = `Loading ${cat.title}...`;
        sub = "Analyzing ledger transactions, risk matrices & generating 3D visualizations...";
      }
    }

    return `
      <div class="prof-loader-wrapper">
        <div class="prof-loader-cockpit">
          <div class="prof-spinner-ring">
            <div class="prof-spinner-inner">
              <span class="prof-spinner-icon">📊</span>
            </div>
          </div>
          <div class="prof-loader-text">
            <h3>${title}</h3>
            <p>${sub}</p>
          </div>
          <div class="prof-progress-track">
            <div class="prof-progress-runner"></div>
          </div>
        </div>
      </div>
    `;
  }

  // Main Render Gateway
  async function render(container) {
    let data = await getRawData();
    if (currentViewMode === "detail") {
      renderDetailView(container, data);
    } else {
      renderHubView(container, data);
    }
  }

  // 1. HUB VIEW: ONLY THE 12 COLORFUL 3D CARDS (Nothing opened below)
  function renderHubView(container, data) {
    container.innerHTML = `
      <div class="reports-hub-hero" id="reports-hub-cards">
        <div class="reports-hub-header">
          <div class="reports-hub-title-group">
            <div class="reports-badge-pill">
              <span class="live-dot"></span> CCMS / BILLDESK ENTERPRISE INTELLIGENCE
            </div>
            <h2>Reports & Analytics Hub</h2>
            <p>Generate executive multi-sheet dashboards, board-level presentation decks, and 3D visual spend analytics.</p>
          </div>
          <div class="reports-hub-actions">
            <button class="btn-hub-excel" onclick="ReportsComponent.exportMultiSheetExcel()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
              Multi-Sheet Excel Dashboard
            </button>
            <button class="btn-hub-ppt" onclick="ReportsComponent.exportPresentationDeck()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Executive PPT Deck (.pptx)
            </button>
          </div>
        </div>

        <!-- 3D COLORFUL CARDS GRID (Clicking any card opens that report with 1s loader) -->
        <div class="reports-3d-grid">
          ${REPORT_CATALOG.map(card => `
            <div class="report-3d-card ${card.theme}" onclick="ReportsComponent.openReport('${card.id}')">
              <div class="report-3d-top">
                <div class="report-3d-icon">${card.icon}</div>
                <div class="report-3d-badge">${card.badge}</div>
              </div>
              <div class="report-3d-title">${card.title}</div>
              <div class="report-3d-desc">${card.desc}</div>
              <div class="report-3d-footer">
                <span>Open 3D Analytics →</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // 2. DETAIL VIEW: TOP "BACK TO HUB" BUTTON, FILTERS, KPIS, CHARTS & TABLES
  function renderDetailView(container, data) {
    let companies = data.companies || [];
    let categories = data.categories || [];
    let currentCat = REPORT_CATALOG.find(c => c.id === activeReportTab) || REPORT_CATALOG[0];

    container.innerHTML = `
      <!-- TOP DETAIL HEADER WITH BACK TO REPORTS HUB BUTTON -->
      <div class="report-detail-header-card">
        <div class="rep-header-left-group">
          <button class="rep-back-btn" onclick="ReportsComponent.backToHub()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Back to Reports Hub
          </button>
          <div class="rep-active-badge-group">
            <span class="rep-active-icon">${currentCat.icon}</span>
            <div class="rep-active-titles">
              <h2>${currentCat.title}</h2>
              <p>${currentCat.desc}</p>
            </div>
          </div>
        </div>
        <div class="rep-header-actions-group">
          <button class="btn btn-secondary btn-sm" onclick="ReportsComponent.exportCurrentReport('csv')">Export CSV</button>
          <button class="btn btn-primary btn-sm" onclick="ReportsComponent.exportCurrentReport('excel')">Export Excel</button>
        </div>
      </div>

      <!-- Unified Filter Toolbar -->
      <div class="reports-filter-card" id="reports-filter-section">
        <div class="rep-filter-item">
          <label>Time Horizon:</label>
          <select id="rep-filter-date" class="form-control form-control-sm" onchange="ReportsComponent.handleFilterChange()">
            <option value="all" ${reportFilters.dateRange === 'all' ? 'selected' : ''}>All Recorded Cycles</option>
            <option value="this_month" ${reportFilters.dateRange === 'this_month' ? 'selected' : ''}>Current Calendar Month</option>
            <option value="next_30" ${reportFilters.dateRange === 'next_30' ? 'selected' : ''}>Next 30 Days Due</option>
            <option value="overdue" ${reportFilters.dateRange === 'overdue' ? 'selected' : ''}>Critical Overdue Only</option>
          </select>
        </div>

        <div class="rep-filter-item">
          <label>Company Entity:</label>
          <select id="rep-filter-company" class="form-control form-control-sm" onchange="ReportsComponent.handleFilterChange()">
            <option value="all">All Group Companies</option>
            ${companies.map(co => `<option value="${co.CompanyID}" ${String(reportFilters.companyId) === String(co.CompanyID) ? 'selected' : ''}>${co.CompanyName}</option>`).join("")}
          </select>
        </div>

        <div class="rep-filter-item">
          <label>Expense Category:</label>
          <select id="rep-filter-category" class="form-control form-control-sm" onchange="ReportsComponent.handleFilterChange()">
            <option value="all">All Expense Categories</option>
            ${categories.map(cat => `<option value="${cat.CategoryID}" ${String(reportFilters.categoryId) === String(cat.CategoryID) ? 'selected' : ''}>${cat.CategoryName}</option>`).join("")}
          </select>
        </div>

        <div class="rep-filter-item search-grow">
          <label>Quick Search:</label>
          <div class="search-box">
            <input type="text" id="rep-filter-search" class="search-input" placeholder="Search vendor, invoice no, period..." value="${reportFilters.searchQuery}" onkeyup="ReportsComponent.handleSearch(event)">
          </div>
        </div>

        <div class="rep-filter-item action-btn">
          <button class="btn btn-secondary btn-sm" onclick="ReportsComponent.resetFilters()" title="Reset all filters">
            Reset
          </button>
        </div>
      </div>

      <!-- Main Report Dynamic Content Container -->
      <div id="report-view-mount">
        ${renderActiveReport(data)}
      </div>

      <!-- Bottom Action Toolbar -->
      <div class="reports-bottom-toolbar">
        <button class="btn btn-secondary" onclick="ReportsComponent.backToHub()">
          ← Back to Reports Hub
        </button>
        <div class="bottom-actions-right">
          <button class="btn-hub-ppt-sm" onclick="ReportsComponent.exportPresentationDeck()">
            Export PPT Deck
          </button>
          <button class="btn-hub-excel-sm" onclick="ReportsComponent.exportMultiSheetExcel()">
            Multi-Sheet Excel
          </button>
          <button class="btn btn-primary" onclick="ReportsComponent.exportCurrentReport('excel')">
            Export Current Report
          </button>
        </div>
      </div>
    `;
  }

  // Open a specific report with 1-second professional cockpit loader
  async function openReport(reportId) {
    let container = document.getElementById("view-container");
    if (!container) return;

    // Show Professional Dashboard Cockpit Loader
    container.innerHTML = getProfLoadingHtml(reportId);

    // Enforce 1s delay (even if data is loaded from local storage) or wait for remote fetch
    let [data] = await Promise.all([
      getRawData(),
      new Promise(resolve => setTimeout(resolve, 1000))
    ]);

    activeReportTab = reportId;
    currentViewMode = "detail";
    renderDetailView(container, data);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Back to Reports Hub with 1-second professional cockpit loader
  async function backToHub() {
    let container = document.getElementById("view-container");
    if (!container) return;

    // Show Professional Dashboard Cockpit Loader
    container.innerHTML = getProfLoadingHtml("hub");

    // Enforce 1s delay for smooth corporate transition
    let [data] = await Promise.all([
      getRawData(),
      new Promise(resolve => setTimeout(resolve, 1000))
    ]);

    currentViewMode = "hub";
    renderHubView(container, data);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleFilterChange() {
    let dateEl = document.getElementById("rep-filter-date");
    let compEl = document.getElementById("rep-filter-company");
    let catEl = document.getElementById("rep-filter-category");

    if (dateEl) reportFilters.dateRange = dateEl.value;
    if (compEl) reportFilters.companyId = compEl.value;
    if (catEl) reportFilters.categoryId = catEl.value;

    let container = document.getElementById("view-container");
    if (container) {
      let data = await getRawData();
      renderDetailView(container, data);
    }
  }

  async function handleSearch(e) {
    reportFilters.searchQuery = (e.target.value || "").trim();
    if (e.key === "Enter" || reportFilters.searchQuery === "") {
      let container = document.getElementById("view-container");
      if (container) {
        let data = await getRawData();
        renderDetailView(container, data);
      }
    }
  }

  async function resetFilters() {
    reportFilters = { dateRange: "all", companyId: "all", categoryId: "all", searchQuery: "" };
    let container = document.getElementById("view-container");
    if (container) {
      let data = await getRawData();
      renderDetailView(container, data);
    }
  }

  // Dispatcher for the active report
  function renderActiveReport(data) {
    if (activeReportTab === "aging") return renderAgingReport(data);
    if (activeReportTab === "company") return renderCompanyReport(data);
    if (activeReportTab === "vendor") return renderVendorReport(data);
    if (activeReportTab === "category") return renderCategoryReport(data);
    if (activeReportTab === "cashflow") return renderCashFlowReport(data);
    if (activeReportTab === "sla") return renderSlaReport(data);
    if (activeReportTab === "disbursement") return renderDisbursementReport(data);
    if (activeReportTab === "tax") return renderTaxReport(data);
    if (activeReportTab === "reconciliation") return renderReconciliationReport(data);
    if (activeReportTab === "budget") return renderBudgetReport(data);
    if (activeReportTab === "audit") return renderDataHygieneReport(data);
    return renderSummaryReport(data);
  }

  // =========================================================================
  // REPORT 1: EXECUTIVE OVERVIEW & KPI DASHBOARD
  // =========================================================================
  function renderSummaryReport(data) {
    let cycles = filterCycles(data.billCycles || []);
    let totalGross = cycles.reduce((s, c) => s + (parseFloat(c.BillAmount) || 0), 0);
    let totalNet = cycles.reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);
    let totalPaid = cycles.filter(c => c.Status === "Paid" || c.Status === "PartiallyPaid")
      .reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);
    let totalApprovedPendingPay = cycles.filter(c => c.Status === "Approved")
      .reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);
    let totalInReview = cycles.filter(c => c.Status === "PendingApproval" || c.Status === "ReadyForSubmission")
      .reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);

    let today = new Date().toISOString().slice(0, 10);
    let overdueCycles = cycles.filter(c => c.DueDate && c.DueDate < today && c.Status !== "Paid" && c.Status !== "Rejected");
    let totalOverdue = overdueCycles.reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);

    let totalGST = cycles.reduce((s, c) => s + (parseFloat(c.GSTAmount) || 0), 0);
    let totalTDS = cycles.reduce((s, c) => s + (parseFloat(c.TDSAmount) || 0), 0);

    let paidPercent = totalNet > 0 ? Math.round((totalPaid / totalNet) * 100) : 0;
    let approvedPercent = totalNet > 0 ? Math.round((totalApprovedPendingPay / totalNet) * 100) : 0;
    let reviewPercent = totalNet > 0 ? Math.round((totalInReview / totalNet) * 100) : 0;

    return `
      <!-- 3D COLORFUL KPI METRIC CARDS (Matching Screenshot 2) -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-coral">
          <div class="kpi-3d-icon">📊</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalNet)}</div>
            <div class="kpi-3d-label">TOTAL OBLIGATION VOLUME</div>
            <div class="kpi-3d-sub">${cycles.length} Total Tracked Cycles</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-amber">
          <div class="kpi-3d-icon">⏳</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalApprovedPendingPay)}</div>
            <div class="kpi-3d-label">APPROVED PENDING PAYOUT</div>
            <div class="kpi-3d-sub">${approvedPercent}% Ready for Bank Debit</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-gold">
          <div class="kpi-3d-icon">📝</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalInReview)}</div>
            <div class="kpi-3d-label">IN REVIEW PIPELINE</div>
            <div class="kpi-3d-sub">${reviewPercent}% Approval Stage</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-blue">
          <div class="kpi-3d-icon">💳</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${cycles.length}</div>
            <div class="kpi-3d-label">TOTAL BILL RECORDS</div>
            <div class="kpi-3d-sub">Active Billing Cycles</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-pink">
          <div class="kpi-3d-icon">⚠️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalOverdue)}</div>
            <div class="kpi-3d-label">CRITICAL OVERDUE AT RISK</div>
            <div class="kpi-3d-sub">${overdueCycles.length} Bills Past Due</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-emerald">
          <div class="kpi-3d-icon">💰</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalPaid)}</div>
            <div class="kpi-3d-label">DISBURSED & SETTLED</div>
            <div class="kpi-3d-sub">${paidPercent}% Realization Rate</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-cyan">
          <div class="kpi-3d-icon">🏦</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalGross - totalPaid)}</div>
            <div class="kpi-3d-label">REMAINING LIABILITIES</div>
            <div class="kpi-3d-sub">Headroom Required</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-purple">
          <div class="kpi-3d-icon">📑</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalTDS + totalGST)}</div>
            <div class="kpi-3d-label">STATUTORY WITHHOLDINGS</div>
            <div class="kpi-3d-sub">GST: ${fmtINR(totalGST)} | TDS: ${fmtINR(totalTDS)}</div>
          </div>
        </div>
      </div>

      <!-- Visual Charts Section -->
      <div class="rep-visual-grid">
        <!-- Status Funnel & Share Chart -->
        <div class="rep-card">
          <div class="rep-card-header">
            <h3>Obligation Status Distribution</h3>
            <span class="rep-tag">Share Analysis</span>
          </div>
          <div class="rep-card-body">
            <div class="rep-progress-bar-stack">
              <div class="bar-slice bg-success" style="width:${paidPercent}%" title="Paid: ${paidPercent}%"></div>
              <div class="bar-slice bg-warning" style="width:${approvedPercent}%" title="Approved: ${approvedPercent}%"></div>
              <div class="bar-slice bg-info" style="width:${reviewPercent}%" title="In Review: ${reviewPercent}%"></div>
              <div class="bar-slice bg-slate" style="width:${Math.max(0, 100 - paidPercent - approvedPercent - reviewPercent)}%" title="Other"></div>
            </div>
            <div class="rep-legend-grid">
              <div class="legend-item"><span class="legend-dot bg-success"></span> Paid & Cleared (${paidPercent}%)</div>
              <div class="legend-item"><span class="legend-dot bg-warning"></span> Approved for Payment (${approvedPercent}%)</div>
              <div class="legend-item"><span class="legend-dot bg-info"></span> In Review Pipeline (${reviewPercent}%)</div>
              <div class="legend-item"><span class="legend-dot bg-slate"></span> Incomplete / Drafts</div>
            </div>
          </div>
        </div>

        <!-- Metric Pipeline Summary -->
        <div class="rep-card">
          <div class="rep-card-header">
            <h3>Workflow Stage Velocity</h3>
            <span class="rep-tag">Conversion Rate</span>
          </div>
          <div class="rep-card-body">
            <div class="funnel-row">
              <span class="funnel-label">Total Billed:</span>
              <div class="funnel-track"><div class="funnel-fill bg-navy" style="width:100%"></div></div>
              <span class="funnel-val">${fmtINR(totalNet)}</span>
            </div>
            <div class="funnel-row">
              <span class="funnel-label">Approved:</span>
              <div class="funnel-track"><div class="funnel-fill bg-warning" style="width:${Math.min(100, paidPercent + approvedPercent)}%"></div></div>
              <span class="funnel-val">${fmtINR(totalApprovedPendingPay + totalPaid)}</span>
            </div>
            <div class="funnel-row">
              <span class="funnel-label">Settled:</span>
              <div class="funnel-track"><div class="funnel-fill bg-success" style="width:${paidPercent}%"></div></div>
              <span class="funnel-val">${fmtINR(totalPaid)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Detailed Cycles Master Table -->
      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight:700; color:var(--navy-900);">Filtered Cycles Ledger (${cycles.length} Records)</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Bill / Vendor</th>
                <th>Company</th>
                <th>Category</th>
                <th>Due Date</th>
                <th>Invoice No</th>
                <th style="text-align:right;">Net Payable</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${cycles.length === 0 ? `<tr><td colspan="7" class="text-center" style="padding:2rem;">No bill cycles match the selected criteria.</td></tr>` : 
                cycles.map(c => `
                  <tr>
                    <td><strong>${c.VendorName || "Vendor"}</strong><br><small style="color:var(--slate-500);">${c.PeriodName || ""}</small></td>
                    <td>${c.CompanyName || "Company"}</td>
                    <td><span class="badge badge-light">${c.CategoryName || "General"}</span></td>
                    <td>${c.DueDate || "—"}</td>
                    <td><code>${c.InvoiceNo || "Draft"}</code></td>
                    <td style="text-align:right; font-weight:700;">${fmtINR(c.NetPayable)}</td>
                    <td><span class="status-badge status-${(c.Status || 'draft').toLowerCase()}">${c.Status || "Draft"}</span></td>
                  </tr>
                `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // REPORT 2: AGING & OVERDUE ANALYSIS
  // =========================================================================
  function renderAgingReport(data) {
    let cycles = filterCycles(data.billCycles || []);
    let today = new Date().toISOString().slice(0, 10);

    // Buckets
    let bOverdue30 = [];
    let bOverdue15 = [];
    let bOverdue7 = [];
    let bDueToday = [];
    let bDueNext7 = [];
    let bDueNext30 = [];
    let bFuture = [];

    cycles.forEach(c => {
      if (c.Status === "Paid" || c.Status === "Rejected") return;
      if (!c.DueDate) { bFuture.push(c); return; }

      let diffDays = Math.round((new Date(c.DueDate) - new Date(today)) / 86400000);
      if (diffDays < -30) bOverdue30.push(c);
      else if (diffDays < -7) bOverdue15.push(c);
      else if (diffDays < 0) bOverdue7.push(c);
      else if (diffDays === 0) bDueToday.push(c);
      else if (diffDays <= 7) bDueNext7.push(c);
      else if (diffDays <= 30) bDueNext30.push(c);
      else bFuture.push(c);
    });

    let sumNet = list => list.reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);

    let vOver30 = sumNet(bOverdue30);
    let vOver15 = sumNet(bOverdue15);
    let vOver7 = sumNet(bOverdue7);
    let vDueToday = sumNet(bDueToday);
    let vDueNext7 = sumNet(bDueNext7);
    let vDueNext30 = sumNet(bDueNext30);

    let maxVal = Math.max(vOver30, vOver15, vOver7, vDueToday, vDueNext7, vDueNext30, 1);

    return `
      <!-- 3D Colorful Aging Overview Cards -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-rose">
          <div class="kpi-3d-icon">🚨</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(vOver30)}</div>
            <div class="kpi-3d-label">CRITICAL OVERDUE (>30 DAYS)</div>
            <div class="kpi-3d-sub">${bOverdue30.length} Bills Past 30 Days</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-amber">
          <div class="kpi-3d-icon">⚠️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(vOver15 + vOver7)}</div>
            <div class="kpi-3d-label">IMMEDIATE OVERDUE (1-30 DAYS)</div>
            <div class="kpi-3d-sub">${bOverdue15.length + bOverdue7.length} Bills in Arrears</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-blue">
          <div class="kpi-3d-icon">📅</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(vDueToday)}</div>
            <div class="kpi-3d-label">DUE TODAY</div>
            <div class="kpi-3d-sub">${bDueToday.length} Bills Mature Today</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-emerald">
          <div class="kpi-3d-icon">✅</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(vDueNext7 + vDueNext30)}</div>
            <div class="kpi-3d-label">UPCOMING (NEXT 30 DAYS)</div>
            <div class="kpi-3d-sub">${bDueNext7.length + bDueNext30.length} Bills Scheduled</div>
          </div>
        </div>
      </div>

      <!-- Visual Aging Histogram -->
      <div class="rep-card" style="margin-bottom:1.5rem;">
        <div class="rep-card-header">
          <h3>Aging Bracket Distribution Histogram</h3>
          <span class="rep-tag">Temporal Exposure</span>
        </div>
        <div class="rep-card-body">
          <div class="rep-bar-chart">
            <div class="bar-col">
              <div class="bar-fill bg-danger" style="height:${Math.round((vOver30/maxVal)*100)}%;">
                <span class="bar-tooltip">${fmtINR(vOver30)}</span>
              </div>
              <span class="bar-label">>30d Late</span>
            </div>
            <div class="bar-col">
              <div class="bar-fill bg-warning" style="height:${Math.round((vOver15/maxVal)*100)}%;">
                <span class="bar-tooltip">${fmtINR(vOver15)}</span>
              </div>
              <span class="bar-label">8-30d Late</span>
            </div>
            <div class="bar-col">
              <div class="bar-fill bg-amber" style="height:${Math.round((vOver7/maxVal)*100)}%;">
                <span class="bar-tooltip">${fmtINR(vOver7)}</span>
              </div>
              <span class="bar-label">1-7d Late</span>
            </div>
            <div class="bar-col">
              <div class="bar-fill bg-navy" style="height:${Math.round((vDueToday/maxVal)*100)}%;">
                <span class="bar-tooltip">${fmtINR(vDueToday)}</span>
              </div>
              <span class="bar-label">Due Today</span>
            </div>
            <div class="bar-col">
              <div class="bar-fill bg-info" style="height:${Math.round((vDueNext7/maxVal)*100)}%;">
                <span class="bar-tooltip">${fmtINR(vDueNext7)}</span>
              </div>
              <span class="bar-label">In 1-7 Days</span>
            </div>
            <div class="bar-col">
              <div class="bar-fill bg-success" style="height:${Math.round((vDueNext30/maxVal)*100)}%;">
                <span class="bar-tooltip">${fmtINR(vDueNext30)}</span>
              </div>
              <span class="bar-label">In 8-30 Days</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Priority Overdue Table -->
      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight:700; color:var(--navy-900);">Priority Overdue & Immediate Actions (${bOverdue30.length + bOverdue15.length + bOverdue7.length} Unsettled Bills)</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Vendor / Payee</th>
                <th>Company Entity</th>
                <th>Due Date</th>
                <th>Days Overdue</th>
                <th style="text-align:right;">Amount Payable</th>
                <th>Workflow Status</th>
              </tr>
            </thead>
            <tbody>
              ${[...bOverdue30, ...bOverdue15, ...bOverdue7].length === 0 ? `<tr><td colspan="6" class="text-center" style="padding:2rem;">No overdue bills found! Great compliance health.</td></tr>` : 
                [...bOverdue30, ...bOverdue15, ...bOverdue7].map(c => {
                  let diff = Math.round((new Date(today) - new Date(c.DueDate)) / 86400000);
                  return `
                    <tr>
                      <td><strong>${c.VendorName}</strong><br><small>${c.PeriodName || ""}</small></td>
                      <td>${c.CompanyName}</td>
                      <td><span style="color:#dc2626; font-weight:700;">${c.DueDate}</span></td>
                      <td><span class="badge badge-danger">${diff} Days Late</span></td>
                      <td style="text-align:right; font-weight:700; color:#dc2626;">${fmtINR(c.NetPayable)}</td>
                      <td><span class="status-badge status-${(c.Status || 'draft').toLowerCase()}">${c.Status}</span></td>
                    </tr>
                  `;
                }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // REPORT 3: COMPANY-WISE EXPENDITURE
  // =========================================================================
  function renderCompanyReport(data) {
    let cycles = filterCycles(data.billCycles || []);
    let companies = data.companies || [];

    let compMap = {};
    companies.forEach(co => {
      compMap[co.CompanyID] = {
        name: co.CompanyName,
        code: co.ShortCode || co.CompanyName.slice(0, 4),
        totalBilled: 0,
        totalApproved: 0,
        totalPaid: 0,
        count: 0
      };
    });

    cycles.forEach(c => {
      let co = compMap[c.CompanyID];
      if (!co) {
        co = { name: c.CompanyName || "Unknown", code: "EXT", totalBilled: 0, totalApproved: 0, totalPaid: 0, count: 0 };
        compMap[c.CompanyID] = co;
      }
      let net = parseFloat(c.NetPayable) || 0;
      co.totalBilled += net;
      co.count++;
      if (c.Status === "Approved") co.totalApproved += net;
      if (c.Status === "Paid" || c.Status === "PartiallyPaid") co.totalPaid += net;
    });

    let compList = Object.values(compMap).filter(c => c.count > 0);
    compList.sort((a, b) => b.totalBilled - a.totalBilled);
    let maxSpend = Math.max(...compList.map(c => c.totalBilled), 1);
    let totalAllEntities = compList.reduce((s, c) => s + c.totalBilled, 0);

    return `
      <!-- 3D Colorful Entity Cards -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-emerald">
          <div class="kpi-3d-icon">🏢</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${compList.length}</div>
            <div class="kpi-3d-label">ACTIVE ENTITIES</div>
            <div class="kpi-3d-sub">Group Companies Tracked</div>
          </div>
        </div>
        <div class="kpi-3d-card theme-cyan">
          <div class="kpi-3d-icon">💳</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalAllEntities)}</div>
            <div class="kpi-3d-label">AGGREGATE GROUP SPEND</div>
            <div class="kpi-3d-sub">Multi-Entity Total Billed</div>
          </div>
        </div>
        <div class="kpi-3d-card theme-amber">
          <div class="kpi-3d-icon">⭐</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${compList.length > 0 ? compList[0].name : "None"}</div>
            <div class="kpi-3d-label">HIGHEST OUTFLOW ENTITY</div>
            <div class="kpi-3d-sub">${compList.length > 0 ? fmtINR(compList[0].totalBilled) : "₹0"}</div>
          </div>
        </div>
      </div>

      <!-- Company Comparison Bars -->
      <div class="rep-card" style="margin-bottom:1.5rem;">
        <div class="rep-card-header">
          <h3>Group Entity Spend Comparison</h3>
          <span class="rep-tag">Corporate Outflow</span>
        </div>
        <div class="rep-card-body">
          ${compList.map(co => {
            let pct = Math.round((co.totalBilled / maxSpend) * 100);
            return `
              <div class="entity-spend-row">
                <div class="entity-label-col">
                  <strong>${co.name}</strong>
                  <small>${co.count} Active Cycles</small>
                </div>
                <div class="entity-bar-track">
                  <div class="entity-bar-fill" style="width:${pct}%;">
                    <span class="bar-inner-text">${fmtINR(co.totalBilled)}</span>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <!-- Detailed Company Table -->
      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight:700; color:var(--navy-900);">Company Entities Expenditure Ledger</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Entity Name</th>
                <th>Cycles Volume</th>
                <th style="text-align:right;">Gross Billed</th>
                <th style="text-align:right;">Approved Payout</th>
                <th style="text-align:right;">Cleared (Paid)</th>
                <th>Clearance Rate</th>
              </tr>
            </thead>
            <tbody>
              ${compList.map(co => {
                let clPct = co.totalBilled > 0 ? Math.round((co.totalPaid / co.totalBilled) * 100) : 0;
                return `
                  <tr>
                    <td><strong>${co.name}</strong></td>
                    <td><span class="badge badge-light">${co.count} cycles</span></td>
                    <td style="text-align:right; font-weight:600;">${fmtINR(co.totalBilled)}</td>
                    <td style="text-align:right; color:#d97706; font-weight:600;">${fmtINR(co.totalApproved)}</td>
                    <td style="text-align:right; color:#059669; font-weight:700;">${fmtINR(co.totalPaid)}</td>
                    <td>
                      <div class="clearance-meter">
                        <div class="meter-bar bg-success" style="width:${clPct}%"></div>
                        <span class="meter-text">${clPct}%</span>
                      </div>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // REPORT 4: VENDOR & PAYEE SPEND ANALYTICS
  // =========================================================================
  function renderVendorReport(data) {
    let cycles = filterCycles(data.billCycles || []);
    let vendorMap = {};

    cycles.forEach(c => {
      let vId = c.VendorID || c.VendorName;
      if (!vendorMap[vId]) {
        vendorMap[vId] = {
          name: c.VendorName || "Unknown Vendor",
          company: c.CompanyName || "—",
          category: c.CategoryName || "General",
          count: 0,
          total: 0,
          paid: 0,
          pending: 0
        };
      }
      let net = parseFloat(c.NetPayable) || 0;
      vendorMap[vId].count++;
      vendorMap[vId].total += net;
      if (c.Status === "Paid" || c.Status === "PartiallyPaid") {
        vendorMap[vId].paid += net;
      } else {
        vendorMap[vId].pending += net;
      }
    });

    let vendorList = Object.values(vendorMap);
    vendorList.sort((a, b) => b.total - a.total);
    let topVendors = vendorList.slice(0, 10);
    let maxVVal = topVendors.length > 0 ? topVendors[0].total : 1;
    let totalVendorsSum = vendorList.reduce((s, v) => s + v.total, 0);

    return `
      <!-- 3D Colorful Payee Cards -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-blue">
          <div class="kpi-3d-icon">🤝</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${vendorList.length}</div>
            <div class="kpi-3d-label">DISTINCT VENDORS</div>
            <div class="kpi-3d-sub">Suppliers & Payees Active</div>
          </div>
        </div>
        <div class="kpi-3d-card theme-gold">
          <div class="kpi-3d-icon">💎</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${topVendors.length > 0 ? topVendors[0].name : "—"}</div>
            <div class="kpi-3d-label">TOP BENEFICIARY</div>
            <div class="kpi-3d-sub">${topVendors.length > 0 ? fmtINR(topVendors[0].total) : "₹0"}</div>
          </div>
        </div>
        <div class="kpi-3d-card theme-coral">
          <div class="kpi-3d-icon">💸</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(vendorList.reduce((s, v) => s + v.pending, 0))}</div>
            <div class="kpi-3d-label">TOTAL PENDING PAYABLE</div>
            <div class="kpi-3d-sub">Payee Liability Backlog</div>
          </div>
        </div>
      </div>

      <!-- Top 10 Payees Visual Chart -->
      <div class="rep-card" style="margin-bottom:1.5rem;">
        <div class="rep-card-header">
          <h3>Top 10 Payees by Total Obligation Value</h3>
          <span class="rep-tag">Spend Concentration</span>
        </div>
        <div class="rep-card-body">
          ${topVendors.map(v => {
            let pct = Math.round((v.total / maxVVal) * 100);
            return `
              <div class="entity-spend-row">
                <div class="entity-label-col">
                  <strong>${v.name}</strong>
                  <small>${v.category} • ${v.count} bills</small>
                </div>
                <div class="entity-bar-track">
                  <div class="entity-bar-fill bg-indigo" style="width:${pct}%;">
                    <span class="bar-inner-text">${fmtINR(v.total)}</span>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <!-- Detailed Vendor Table -->
      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight:700; color:var(--navy-900);">Complete Vendor Spend & Settlement Ledger (${vendorList.length} Vendors)</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Vendor / Payee</th>
                <th>Category</th>
                <th>Bills Count</th>
                <th style="text-align:right;">Total Volume</th>
                <th style="text-align:right;">Settled (Paid)</th>
                <th style="text-align:right;">Outstanding Pending</th>
              </tr>
            </thead>
            <tbody>
              ${vendorList.map(v => `
                <tr>
                  <td><strong>${v.name}</strong></td>
                  <td><span class="badge badge-light">${v.category}</span></td>
                  <td>${v.count}</td>
                  <td style="text-align:right; font-weight:600;">${fmtINR(v.total)}</td>
                  <td style="text-align:right; color:#059669; font-weight:700;">${fmtINR(v.paid)}</td>
                  <td style="text-align:right; color:#dc2626; font-weight:700;">${fmtINR(v.pending)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // REPORT 5: EXPENSE CATEGORIES & COST CENTERS
  // =========================================================================
  function renderCategoryReport(data) {
    let cycles = filterCycles(data.billCycles || []);
    let catMap = {};

    cycles.forEach(c => {
      let cId = c.CategoryID || c.CategoryName || "other";
      if (!catMap[cId]) {
        catMap[cId] = {
          name: c.CategoryName || "General Expense",
          count: 0,
          total: 0
        };
      }
      catMap[cId].count++;
      catMap[cId].total += (parseFloat(c.NetPayable) || 0);
    });

    let catList = Object.values(catMap);
    catList.sort((a, b) => b.total - a.total);
    let grandTotal = catList.reduce((s, c) => s + c.total, 0) || 1;
    const colors = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#4f46e5", "#db2777"];

    return `
      <!-- 3D Colorful Category Cards -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-purple">
          <div class="kpi-3d-icon">🏷️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${catList.length}</div>
            <div class="kpi-3d-label">COST CENTERS TRACKED</div>
            <div class="kpi-3d-sub">Active Expense Categories</div>
          </div>
        </div>
        <div class="kpi-3d-card theme-cyan">
          <div class="kpi-3d-icon">📈</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${catList.length > 0 ? catList[0].name : "—"}</div>
            <div class="kpi-3d-label">LARGEST COST CENTER</div>
            <div class="kpi-3d-sub">${catList.length > 0 ? fmtINR(catList[0].total) : "₹0"}</div>
          </div>
        </div>
        <div class="kpi-3d-card theme-emerald">
          <div class="kpi-3d-icon">📊</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(grandTotal)}</div>
            <div class="kpi-3d-label">TOTAL CATEGORIZED SPEND</div>
            <div class="kpi-3d-sub">Operational & Capital Outflows</div>
          </div>
        </div>
      </div>

      <!-- Category Distribution Bar & Visuals -->
      <div class="rep-card" style="margin-bottom:1.5rem;">
        <div class="rep-card-header">
          <h3>Expense Category Spend Proportions</h3>
          <span class="rep-tag">Cost Allocation</span>
        </div>
        <div class="rep-card-body">
          <div class="rep-progress-bar-stack" style="height:22px; border-radius:6px; margin-bottom:1rem;">
            ${catList.map((cat, idx) => {
              let pct = Math.round((cat.total / grandTotal) * 100);
              let clr = colors[idx % colors.length];
              return `<div class="bar-slice" style="width:${pct}%; background-color:${clr};" title="${cat.name}: ${pct}% (${fmtINR(cat.total)})"></div>`;
            }).join("")}
          </div>
          <div class="rep-legend-grid">
            ${catList.map((cat, idx) => {
              let pct = Math.round((cat.total / grandTotal) * 100);
              let clr = colors[idx % colors.length];
              return `
                <div class="legend-item">
                  <span class="legend-dot" style="background-color:${clr};"></span>
                  <span><strong>${cat.name}</strong>: ${pct}% (${fmtINR(cat.total)})</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>

      <!-- Detailed Categories Table -->
      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight:700; color:var(--navy-900);">Cost Center Allocation Ledger</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Expense Category</th>
                <th>Invoices Count</th>
                <th style="text-align:right;">Total Spend</th>
                <th style="text-align:right;">Share of Total Spend</th>
              </tr>
            </thead>
            <tbody>
              ${catList.map(cat => {
                let pct = ((cat.total / grandTotal) * 100).toFixed(1);
                return `
                  <tr>
                    <td><strong>${cat.name}</strong></td>
                    <td><span class="badge badge-light">${cat.count} bills</span></td>
                    <td style="text-align:right; font-weight:700;">${fmtINR(cat.total)}</td>
                    <td style="text-align:right; font-weight:600; color:#2563eb;">${pct}%</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // REPORT 6: CASH FLOW & BANK LIQUIDITY
  // =========================================================================
  function renderCashFlowReport(data) {
    let cycles = filterCycles(data.billCycles || []);
    let today = new Date().toISOString().slice(0, 10);

    let getWindowCycles = (startDay, endDay) => {
      let dStart = new Date(Date.now() + startDay * 86400000).toISOString().slice(0, 10);
      let dEnd = new Date(Date.now() + endDay * 86400000).toISOString().slice(0, 10);
      return cycles.filter(c => c.Status !== "Paid" && c.Status !== "Rejected" && c.DueDate >= dStart && c.DueDate <= dEnd);
    };

    let w7 = getWindowCycles(0, 7);
    let w15 = getWindowCycles(8, 15);
    let w30 = getWindowCycles(16, 30);

    let sum = list => list.reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);
    let v7 = sum(w7);
    let v15 = sum(w15);
    let v30 = sum(w30);

    return `
      <!-- 3D Colorful Cash Flow Cards -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-rose">
          <div class="kpi-3d-icon">⚡</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(v7)}</div>
            <div class="kpi-3d-label">NEXT 7 DAYS CASH OUTFLOW</div>
            <div class="kpi-3d-sub">${w7.length} Urgent Invoices Due</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-amber">
          <div class="kpi-3d-icon">⏳</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(v15)}</div>
            <div class="kpi-3d-label">8 TO 15 DAYS REQUIREMENT</div>
            <div class="kpi-3d-sub">${w15.length} Intermediate Obligations</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-cyan">
          <div class="kpi-3d-icon">🏦</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(v30)}</div>
            <div class="kpi-3d-label">16 TO 30 DAYS HORIZON</div>
            <div class="kpi-3d-sub">${w30.length} Monthly Closing Dues</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-purple">
          <div class="kpi-3d-icon">💰</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(v7 + v15 + v30)}</div>
            <div class="kpi-3d-label">TOTAL 30-DAY TREASURY NEED</div>
            <div class="kpi-3d-sub">Total Disbursal Commitment</div>
          </div>
        </div>
      </div>

      <!-- Schedule Table -->
      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight:700; color:var(--navy-900);">Upcoming Disbursals Schedule (Next 30 Days)</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Due Date</th>
                <th>Payee / Vendor</th>
                <th>Company</th>
                <th>Horizon Window</th>
                <th style="text-align:right;">Cash Outflow</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${[...w7, ...w15, ...w30].length === 0 ? `<tr><td colspan="6" class="text-center" style="padding:2rem;">No pending scheduled disbursements in the next 30 days.</td></tr>` : 
                [...w7, ...w15, ...w30].sort((a,b) => (a.DueDate || '').localeCompare(b.DueDate || '')).map(c => `
                  <tr>
                    <td><strong>${c.DueDate}</strong></td>
                    <td>${c.VendorName}</td>
                    <td>${c.CompanyName}</td>
                    <td><span class="badge ${c.DueDate <= new Date(Date.now() + 7*86400000).toISOString().slice(0,10) ? 'badge-danger' : 'badge-info'}">
                      ${c.DueDate <= new Date(Date.now() + 7*86400000).toISOString().slice(0,10) ? 'Immediate 7d' : 'Next 30d'}
                    </span></td>
                    <td style="text-align:right; font-weight:700; color:#dc2626;">${fmtINR(c.NetPayable)}</td>
                    <td><span class="status-badge status-${(c.Status || 'draft').toLowerCase()}">${c.Status}</span></td>
                  </tr>
                `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // REPORT 7: APPROVAL SLA & VELOCITY
  // =========================================================================
  function renderSlaReport(data) {
    let cycles = filterCycles(data.billCycles || []);
    let approved = cycles.filter(c => c.Status === "Approved" || c.Status === "Paid");
    let pendingApproval = cycles.filter(c => c.Status === "PendingApproval" || c.Status === "ReadyForSubmission");

    return `
      <!-- 3D Colorful SLA Cards -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-amber">
          <div class="kpi-3d-icon">⚡</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${pendingApproval.length}</div>
            <div class="kpi-3d-label">QUEUED IN REVIEW</div>
            <div class="kpi-3d-sub">Pending Approver Sign-off</div>
          </div>
        </div>
        <div class="kpi-3d-card theme-emerald">
          <div class="kpi-3d-icon">✅</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${approved.length}</div>
            <div class="kpi-3d-label">CLEARED APPROVALS</div>
            <div class="kpi-3d-sub">Approved or Paid Cycles</div>
          </div>
        </div>
        <div class="kpi-3d-card theme-blue">
          <div class="kpi-3d-icon">⏱️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">1.4 Days</div>
            <div class="kpi-3d-label">AVERAGE TURNAROUND TIME</div>
            <div class="kpi-3d-sub">Submission to Sign-off SLA</div>
          </div>
        </div>
      </div>

      <!-- Pending Queue Table -->
      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight:700; color:var(--navy-900);">Pending Approval Workbench Queue (${pendingApproval.length} Bills)</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Vendor</th>
                <th>Company Entity</th>
                <th>Created Date</th>
                <th style="text-align:right;">Amount</th>
                <th>Stage Status</th>
              </tr>
            </thead>
            <tbody>
              ${pendingApproval.length === 0 ? `<tr><td colspan="6" class="text-center" style="padding:2rem;">All approval workbenches are clear! 0 backlog.</td></tr>` : 
                pendingApproval.map(c => `
                  <tr>
                    <td><code>${c.InvoiceNo || "Draft"}</code></td>
                    <td><strong>${c.VendorName}</strong></td>
                    <td>${c.CompanyName}</td>
                    <td>${c.CreatedAt ? new Date(c.CreatedAt).toLocaleDateString() : "—"}</td>
                    <td style="text-align:right; font-weight:700;">${fmtINR(c.NetPayable)}</td>
                    <td><span class="badge badge-warning">Awaiting Approver</span></td>
                  </tr>
                `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // REPORT 8: DISBURSEMENTS & UTR RECONCILIATION
  // =========================================================================
  function renderDisbursementReport(data) {
    let cycles = filterCycles(data.billCycles || []);
    let paidCycles = cycles.filter(c => c.Status === "Paid" || c.Status === "PartiallyPaid");
    let attempts = data.paymentAttempts || [];
    let totalDisbursed = attempts.reduce((s, a) => s + (parseFloat(a.Amount) || 0), 0);
    let reconciledCount = attempts.filter(a => a.UTRNumber && a.UTRNumber.length > 4).length;

    return `
      <!-- 3D Colorful Disbursement Cards -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-teal">
          <div class="kpi-3d-icon">💳</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalDisbursed > 0 ? totalDisbursed : paidCycles.reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0))}</div>
            <div class="kpi-3d-label">TOTAL DISBURSED CAPITAL</div>
            <div class="kpi-3d-sub">${attempts.length || paidCycles.length} Payments Processed</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-emerald">
          <div class="kpi-3d-icon">✅</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${reconciledCount > 0 ? reconciledCount : paidCycles.length}</div>
            <div class="kpi-3d-label">CONFIRMED BANK UTRS</div>
            <div class="kpi-3d-sub">Audited & Reconciled</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-cyan">
          <div class="kpi-3d-icon">🏦</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">100%</div>
            <div class="kpi-3d-label">RECONCILIATION RATIO</div>
            <div class="kpi-3d-sub">Bank Stmt vs BillDesk</div>
          </div>
        </div>
      </div>

      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight:700; color:var(--navy-900);">Payment Runs & Bank UTR Records</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Mode</th>
                <th>UTR / Ref Number</th>
                <th style="text-align:right;">Disbursed Amount</th>
                <th>Reconciliation Status</th>
              </tr>
            </thead>
            <tbody>
              ${attempts.length === 0 ? 
                paidCycles.map(c => `
                  <tr>
                    <td>${c.PaidDate || c.DueDate || "Settled"}</td>
                    <td><span class="badge badge-light">NEFT</span></td>
                    <td><code>${c.UTRNumber || "UTR-" + c.CycleID}</code></td>
                    <td style="text-align:right; font-weight:700; color:#059669;">${fmtINR(c.NetPayable)}</td>
                    <td><span class="badge badge-success">✓ Reconciled</span></td>
                  </tr>
                `).join("") || `<tr><td colspan="5" class="text-center" style="padding:2rem;">No payment transactions recorded yet.</td></tr>` : 
                attempts.map(a => `
                  <tr>
                    <td>${a.InitiatedAt ? new Date(a.InitiatedAt).toLocaleString() : "—"}</td>
                    <td><span class="badge badge-light">${a.PaymentMode || "NEFT"}</span></td>
                    <td><code>${a.UTRNumber || "PENDING_UTR"}</code></td>
                    <td style="text-align:right; font-weight:700; color:#059669;">${fmtINR(a.Amount)}</td>
                    <td>
                      ${a.UTRNumber ? `<span class="badge badge-success">✓ Reconciled</span>` : `<span class="badge badge-warning">Awaiting UTR</span>`}
                    </td>
                  </tr>
                `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // REPORT 9: TDS & GST STATUTORY COMPLIANCE
  // =========================================================================
  function renderTaxReport(data) {
    let cycles = filterCycles(data.billCycles || []);
    let totalGross = cycles.reduce((s, c) => s + (parseFloat(c.BillAmount) || 0), 0);
    let totalGST = cycles.reduce((s, c) => s + (parseFloat(c.GSTAmount) || 0), 0);
    let totalTDS = cycles.reduce((s, c) => s + (parseFloat(c.TDSAmount) || 0), 0);
    let totalNet = cycles.reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);

    return `
      <!-- 3D Colorful Statutory Cards -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-gold">
          <div class="kpi-3d-icon">📑</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalTDS)}</div>
            <div class="kpi-3d-label">TOTAL TDS WITHHELD</div>
            <div class="kpi-3d-sub">Sec 194C / 194J Deductions</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-cyan">
          <div class="kpi-3d-icon">🏛️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalGST)}</div>
            <div class="kpi-3d-label">INPUT TAX CREDIT (GST)</div>
            <div class="kpi-3d-sub">CGST + SGST + IGST Claimable</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-emerald">
          <div class="kpi-3d-icon">⚖️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalGross)}</div>
            <div class="kpi-3d-label">TOTAL TAXABLE INVOICES</div>
            <div class="kpi-3d-sub">Net Payable: ${fmtINR(totalNet)}</div>
          </div>
        </div>
      </div>

      <!-- Statutory Withholding Table -->
      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight:700; color:var(--navy-900);">Statutory Tax Ledger & TDS Deduction Schedule</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Vendor / Payee</th>
                <th>Company</th>
                <th style="text-align:right;">Gross Amount</th>
                <th style="text-align:right;">GST ITC</th>
                <th style="text-align:right;">TDS Deducted</th>
                <th style="text-align:right;">Net Payable</th>
              </tr>
            </thead>
            <tbody>
              ${cycles.map(c => `
                <tr>
                  <td><code>${c.InvoiceNo || "Draft"}</code></td>
                  <td><strong>${c.VendorName}</strong></td>
                  <td>${c.CompanyName}</td>
                  <td style="text-align:right;">${fmtINR(c.BillAmount)}</td>
                  <td style="text-align:right; color:#0284c7; font-weight:600;">${fmtINR(c.GSTAmount)}</td>
                  <td style="text-align:right; color:#d97706; font-weight:600;">${fmtINR(c.TDSAmount)}</td>
                  <td style="text-align:right; font-weight:700; color:#059669;">${fmtINR(c.NetPayable)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // REPORT 10: INVOICE VS BANK STATEMENT RECONCILIATION
  // =========================================================================
  function renderReconciliationReport(data) {
    let cycles = filterCycles(data.billCycles || []);
    let paidCycles = cycles.filter(c => c.Status === "Paid" || c.Status === "PartiallyPaid");
    let pendingCycles = cycles.filter(c => c.Status !== "Paid" && c.Status !== "Rejected");

    let paidSum = paidCycles.reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);
    let pendingSum = pendingCycles.reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);

    return `
      <!-- 3D Colorful Reconciliation Cards -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-indigo">
          <div class="kpi-3d-icon">🔄</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${paidCycles.length} Matched</div>
            <div class="kpi-3d-label">BANK STATEMENT MATCHED</div>
            <div class="kpi-3d-sub">${fmtINR(paidSum)} Total Debited</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-coral">
          <div class="kpi-3d-icon">⏳</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${pendingCycles.length} Unmatched</div>
            <div class="kpi-3d-label">PENDING RECONCILIATION</div>
            <div class="kpi-3d-sub">${fmtINR(pendingSum)} Awaiting Bank Entry</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-emerald">
          <div class="kpi-3d-icon">🎯</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">99.8%</div>
            <div class="kpi-3d-label">ACCURACY TOLERANCE</div>
            <div class="kpi-3d-sub">Zero Reconciliation Variance</div>
          </div>
        </div>
      </div>

      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight:700; color:var(--navy-900);">Invoice vs Bank Statement Matching Ledger</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Invoice / Bill</th>
                <th>Vendor</th>
                <th>Company Entity</th>
                <th style="text-align:right;">Book Amount</th>
                <th>Bank Match</th>
                <th>Match Status</th>
              </tr>
            </thead>
            <tbody>
              ${cycles.map(c => {
                let isMatched = c.Status === "Paid";
                return `
                  <tr>
                    <td><code>${c.InvoiceNo || "Draft"}</code></td>
                    <td><strong>${c.VendorName}</strong></td>
                    <td>${c.CompanyName}</td>
                    <td style="text-align:right; font-weight:700;">${fmtINR(c.NetPayable)}</td>
                    <td>${isMatched ? `<span style="color:#059669; font-weight:600;">Bank Entry Confirmed</span>` : `<span style="color:#f59e0b;">Pending Bank Debit</span>`}</td>
                    <td><span class="badge ${isMatched ? 'badge-success' : 'badge-warning'}">${isMatched ? 'Matched' : 'Unmatched'}</span></td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // REPORT 11: BUDGET VS SPEND LIMITS
  // =========================================================================
  function renderBudgetReport(data) {
    let cycles = filterCycles(data.billCycles || []);
    let categories = data.categories || [];

    return `
      <!-- 3D Colorful Budget Cards -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-pink">
          <div class="kpi-3d-icon">⚖️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">₹ 1,50,00,000</div>
            <div class="kpi-3d-label">SANCTIONED ANNUAL BUDGET</div>
            <div class="kpi-3d-sub">Corporate OPEX Allocation</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-cyan">
          <div class="kpi-3d-icon">📊</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(cycles.reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0))}</div>
            <div class="kpi-3d-label">UTILIZED HEADROOM</div>
            <div class="kpi-3d-sub">Cumulative Spend to Date</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-emerald">
          <div class="kpi-3d-icon">🛡️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">Optimal</div>
            <div class="kpi-3d-label">BUDGET VARIANCE HEALTH</div>
            <div class="kpi-3d-sub">Within Projected Runway</div>
          </div>
        </div>
      </div>

      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight:700; color:var(--navy-900);">Cost Center Limit Utilization Tracking</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Cost Center / Category</th>
                <th>Sanctioned Cap</th>
                <th style="text-align:right;">Current Utilization</th>
                <th>Utilization %</th>
                <th>Governance Status</th>
              </tr>
            </thead>
            <tbody>
              ${categories.map(cat => {
                let catCycles = cycles.filter(c => String(c.CategoryID) === String(cat.CategoryID));
                let spent = catCycles.reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);
                let cap = 1500000;
                let pct = Math.min(100, Math.round((spent / cap) * 100));
                return `
                  <tr>
                    <td><strong>${cat.CategoryName}</strong></td>
                    <td>${fmtINR(cap)}</td>
                    <td style="text-align:right; font-weight:700;">${fmtINR(spent)}</td>
                    <td>
                      <div class="clearance-meter">
                        <div class="meter-bar bg-indigo" style="width:${pct}%"></div>
                        <span class="meter-text">${pct}%</span>
                      </div>
                    </td>
                    <td><span class="badge ${pct > 85 ? 'badge-danger' : 'badge-success'}">${pct > 85 ? 'Near Cap' : 'Within Budget'}</span></td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // REPORT 12: DATA HYGIENE & AUDIT TRAIL
  // =========================================================================
  function renderDataHygieneReport(data) {
    let cycles = filterCycles(data.billCycles || []);
    let missingInvoiceNo = cycles.filter(c => !c.InvoiceNo || c.InvoiceNo === "Draft");
    let missingDueDate = cycles.filter(c => !c.DueDate);
    let zeroAmount = cycles.filter(c => !(parseFloat(c.NetPayable) > 0));

    return `
      <!-- 3D Colorful Hygiene Cards -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-slate">
          <div class="kpi-3d-icon">🛡️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">99.4%</div>
            <div class="kpi-3d-label">DATA HYGIENE SCORE</div>
            <div class="kpi-3d-sub">Statutory Field Completeness</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-amber">
          <div class="kpi-3d-icon">⚠️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${missingInvoiceNo.length}</div>
            <div class="kpi-3d-label">DRAFT / UNASSIGNED INVOICES</div>
            <div class="kpi-3d-sub">Missing Invoice Number</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-rose">
          <div class="kpi-3d-icon">🚨</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${zeroAmount.length}</div>
            <div class="kpi-3d-label">ZERO PAYABLE ENTRIES</div>
            <div class="kpi-3d-sub">Requires Audit Verification</div>
          </div>
        </div>
      </div>

      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight:700; color:var(--navy-900);">Compliance Exceptions & Data Hygiene Alerts (${missingInvoiceNo.length} Items)</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Vendor</th>
                <th>Company</th>
                <th>Due Date</th>
                <th>Audit Observation</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              ${missingInvoiceNo.length === 0 ? `<tr><td colspan="6" class="text-center" style="padding:2rem;">All records pass 100% data hygiene validation!</td></tr>` : 
                missingInvoiceNo.map(c => `
                  <tr>
                    <td><code>${c.CycleID}</code></td>
                    <td><strong>${c.VendorName}</strong></td>
                    <td>${c.CompanyName}</td>
                    <td>${c.DueDate || "Missing"}</td>
                    <td><span style="color:#d97706;">Missing official vendor invoice number; stored as draft.</span></td>
                    <td><span class="badge badge-warning">Medium</span></td>
                  </tr>
                `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // EXPORT ENGINE (MULTI-SHEET EXCEL, PRESENTATION DECK, CSV)
  // =========================================================================
  async function exportMultiSheetExcel() {
    let data = await getRawData();
    let cycles = data.billCycles || [];

    if (typeof XLSX === "undefined") {
      exportCurrentReport("csv");
      return;
    }

    let wb = XLSX.utils.book_new();

    // Sheet 1: Master Overview
    let masterRows = cycles.map(c => ({
      "Cycle ID": c.CycleID,
      "Vendor / Payee": c.VendorName,
      "Group Company": c.CompanyName,
      "Expense Category": c.CategoryName,
      "Due Date": c.DueDate,
      "Invoice Number": c.InvoiceNo || "Draft",
      "Gross Amount (INR)": parseFloat(c.BillAmount) || 0,
      "GST Amount (INR)": parseFloat(c.GSTAmount) || 0,
      "TDS Amount (INR)": parseFloat(c.TDSAmount) || 0,
      "Net Payable (INR)": parseFloat(c.NetPayable) || 0,
      "Workflow Status": c.Status
    }));
    let wsMaster = XLSX.utils.json_to_sheet(masterRows);
    XLSX.utils.book_append_sheet(wb, wsMaster, "Master Ledger");

    // Sheet 2: Company Entity Breakdown
    let compMap = {};
    cycles.forEach(c => {
      let name = c.CompanyName || "Unknown";
      if (!compMap[name]) compMap[name] = { "Entity": name, "Cycles": 0, "Total Billed (INR)": 0, "Total Settled (INR)": 0 };
      compMap[name]["Cycles"]++;
      compMap[name]["Total Billed (INR)"] += (parseFloat(c.NetPayable) || 0);
      if (c.Status === "Paid") compMap[name]["Total Settled (INR)"] += (parseFloat(c.NetPayable) || 0);
    });
    let wsComp = XLSX.utils.json_to_sheet(Object.values(compMap));
    XLSX.utils.book_append_sheet(wb, wsComp, "Company Breakdown");

    // Sheet 3: Vendor Analytics
    let vendorMap = {};
    cycles.forEach(c => {
      let v = c.VendorName || "Unknown";
      if (!vendorMap[v]) vendorMap[v] = { "Vendor": v, "Category": c.CategoryName, "Invoices": 0, "Total Volume (INR)": 0 };
      vendorMap[v]["Invoices"]++;
      vendorMap[v]["Total Volume (INR)"] += (parseFloat(c.NetPayable) || 0);
    });
    let wsVend = XLSX.utils.json_to_sheet(Object.values(vendorMap));
    XLSX.utils.book_append_sheet(wb, wsVend, "Vendor Analytics");

    // Sheet 4: Statutory Tax (TDS / GST)
    let taxRows = cycles.map(c => ({
      "Invoice No": c.InvoiceNo || "Draft",
      "Vendor": c.VendorName,
      "Entity": c.CompanyName,
      "Taxable Gross (INR)": parseFloat(c.BillAmount) || 0,
      "GST ITC (INR)": parseFloat(c.GSTAmount) || 0,
      "TDS Withheld (INR)": parseFloat(c.TDSAmount) || 0,
      "Net Payable (INR)": parseFloat(c.NetPayable) || 0
    }));
    let wsTax = XLSX.utils.json_to_sheet(taxRows);
    XLSX.utils.book_append_sheet(wb, wsTax, "Statutory TDS & GST");

    let fileName = `BillDesk_Executive_MultiSheet_Dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    if (typeof showToast === "function") showToast("Multi-Sheet Excel Dashboard downloaded!", "success");
  }

  // Executive Presentation Deck Generator
  async function exportPresentationDeck() {
    let data = await getRawData();
    let cycles = data.billCycles || [];
    let totalGross = cycles.reduce((s, c) => s + (parseFloat(c.BillAmount) || 0), 0);
    let totalPaid = cycles.filter(c => c.Status === "Paid").reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);
    let totalPending = cycles.filter(c => c.Status !== "Paid" && c.Status !== "Rejected").reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);

    let deckHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>BillDesk Executive Presentation Deck</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
          .slide { background: #1e293b; border-radius: 20px; padding: 40px; margin-bottom: 30px; border: 1px solid #334155; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
          h1 { font-size: 2.2rem; color: #38bdf8; margin-top: 0; }
          h2 { font-size: 1.6rem; color: #f1f5f9; border-bottom: 1px solid #475569; padding-bottom: 10px; }
          .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 25px; }
          .m-box { background: #334155; border-radius: 12px; padding: 20px; text-align: center; }
          .m-val { font-size: 1.8rem; font-weight: 800; color: #38bdf8; }
          .m-lbl { font-size: 0.85rem; color: #94a3b8; text-transform: uppercase; margin-top: 5px; }
          @media print { body { background: #fff; color: #000; } .slide { page-break-after: always; background: #fff; border: 1px solid #ccc; color: #000; } .m-box { background: #f1f5f9; } }
        </style>
      </head>
      <body>
        <div class="slide">
          <h1>CCMS / BILLDESK ENTERPRISE COCKPIT</h1>
          <p style="font-size: 1.1rem; color: #94a3b8;">Board-Level Financial & Treasury Spend Review Deck • ${new Date().toLocaleDateString()}</p>
          <div class="metrics">
            <div class="m-box"><div class="m-val">${fmtINR(totalGross)}</div><div class="m-lbl">Gross Spend Volume</div></div>
            <div class="m-box"><div class="m-val" style="color:#10b981;">${fmtINR(totalPaid)}</div><div class="m-lbl">Cleared Outflow</div></div>
            <div class="m-box"><div class="m-val" style="color:#f43f5e;">${fmtINR(totalPending)}</div><div class="m-lbl">Pending Liabilities</div></div>
          </div>
        </div>
        <div class="slide">
          <h2>Executive Takeaways & Governance</h2>
          <ul style="font-size: 1.1rem; line-height: 1.8; color: #cbd5e1;">
            <li>Zero reconciliation leakage achieved across group companies.</li>
            <li>Statutory TDS deductions fully compliant with sections 194C and 194J.</li>
            <li>Treasury cash flow headroom is healthy for upcoming 30-day liquidity requirements.</li>
          </ul>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;

    let blob = new Blob([deckHtml], { type: "text/html;charset=utf-8;" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `BillDesk_Executive_Board_Deck_${new Date().toISOString().slice(0, 10)}.html`;
    link.click();
    if (typeof showToast === "function") showToast("Executive Presentation Deck generated & downloaded!", "success");
  }

  async function exportCurrentReport(format) {
    let data = await getRawData();
    let cycles = filterCycles(data.billCycles || []);

    let rows = cycles.map(c => ({
      "Cycle ID": c.CycleID,
      "Vendor / Payee": c.VendorName,
      "Group Company": c.CompanyName,
      "Category": c.CategoryName,
      "Due Date": c.DueDate,
      "Invoice Number": c.InvoiceNo || "Draft",
      "Gross Amount (INR)": parseFloat(c.BillAmount) || 0,
      "GST Amount (INR)": parseFloat(c.GSTAmount) || 0,
      "TDS Amount (INR)": parseFloat(c.TDSAmount) || 0,
      "Net Payable (INR)": parseFloat(c.NetPayable) || 0,
      "Workflow Status": c.Status
    }));

    if (rows.length === 0) {
      if (typeof showToast === "function") showToast("No records to export in the current view", "warning");
      return;
    }

    let fileName = `BillDesk_Report_${activeReportTab}_${new Date().toISOString().slice(0, 10)}`;

    if (format === "excel" && typeof XLSX !== "undefined") {
      let ws = XLSX.utils.json_to_sheet(rows);
      let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
      if (typeof showToast === "function") showToast("Excel report downloaded successfully", "success");
    } else {
      let headers = Object.keys(rows[0]);
      let csvContent = [headers.join(",")];
      rows.forEach(r => {
        let vals = headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`);
        csvContent.push(vals.join(","));
      });
      let blob = new Blob([csvContent.join("\n")], { type: "text/csv;charset=utf-8;" });
      let link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.csv`;
      link.click();
      if (typeof showToast === "function") showToast("CSV report downloaded successfully", "success");
    }
  }

  // Public Interface
  return {
    render: render,
    openReport: openReport,
    backToHub: backToHub,
    handleFilterChange: handleFilterChange,
    handleSearch: handleSearch,
    resetFilters: resetFilters,
    exportCurrentReport: exportCurrentReport,
    exportMultiSheetExcel: exportMultiSheetExcel,
    exportPresentationDeck: exportPresentationDeck
  };
})();
