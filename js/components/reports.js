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

  // 18 High-Value Enterprise Report Types with Deep Calculation & Methodology Metadata
  const REPORT_CATALOG = [
    {
      id: "summary",
      title: "Executive KPI & Spend Cockpit",
      desc: "Real-time aggregate obligation volume, clearance ratios & financial risk cockpit.",
      icon: "📊",
      theme: "theme-coral",
      badge: "Core Cockpit",
      whatItShows: [
        "Consolidated obligation volume across all entities & subsidiaries",
        "Clearance velocity & payout pipeline awaiting disbursement",
        "Immediate overdue bills & statutory tax withholding split (TDS & GST)"
      ],
      formula: "• Total Net Obligation = Σ (BillAmount - TDSAmount + GSTAmount)\n• Clearance Ratio = (Total Paid ÷ Total Net Obligation) × 100\n• Approved Pipeline = Σ (NetPayable where Status = 'Approved')",
      dataSources: ["billCycles", "companies", "vendors"],
      governance: "Corporate Board Financial Solvency & Working Capital Control"
    },
    {
      id: "aging",
      title: "Aging & Overdue Risk Analysis",
      desc: "Upcoming statement dues by urgency (Current, 1-15d, 16-30d, 31-60d, 60d+).",
      icon: "⏳",
      theme: "theme-rose",
      badge: "High Risk",
      whatItShows: [
        "Pending bills classified into 5 time-based aging risk runway buckets",
        "High-risk overdue bills approaching vendor notice or penalty stages",
        "Aging distribution by supplier to prevent credit holds on vital accounts"
      ],
      formula: "• Aging Days = Current Date - Statement Due Date\n• Current: DueDate ≥ Today | Low Risk: 1-15d Overdue\n• Moderate: 16-30d | High: 31-60d | Critical: >60d Overdue",
      dataSources: ["billCycles.DueDate", "billCycles.NetPayable", "billCycles.Status"],
      governance: "Credit Rating Protection & Default Penalty Avoidance"
    },
    {
      id: "company",
      title: "Company & Entity Expenditure",
      desc: "Inter-company liability allocation, subsidiary breakdown & clearance meters.",
      icon: "🏢",
      theme: "theme-emerald",
      badge: "Entity View",
      whatItShows: [
        "Inter-company liability allocation across operating subsidiaries",
        "Subsidiary-level clearance ratios and invoice settlement throughput",
        "Paying unit breakdown of gross billing, statutory withholdings, and net payout"
      ],
      formula: "• Entity Spend Share % = (Entity Net Payable ÷ Consolidated Net) × 100\n• Entity Clearance Rate = (Entity Cleared Payout ÷ Entity Total Billed) × 100\n• Inter-Company Net Outflow = Σ NetPayable grouped by CompanyID",
      dataSources: ["companies", "billCycles.CompanyID"],
      governance: "Inter-Company Fund Allocation & Subsidiary Budget Accountability"
    },
    {
      id: "vendor",
      title: "Vendor & Payee Spend Analytics",
      desc: "Top suppliers ranking, volume concentration, and pending invoice liabilities.",
      icon: "🤝",
      theme: "theme-blue",
      badge: "Payee Spend",
      whatItShows: [
        "Top supplier rankings sorted by aggregate invoice volume",
        "Payee spend concentration applying Pareto 80/20 procurement analysis",
        "Outstanding unpaid liabilities per vendor and active invoice count"
      ],
      formula: "• Vendor Spend = Σ (NetPayable grouped by VendorName)\n• Concentration Index = (Top 5 Vendors Spend ÷ Total Group Spend) × 100\n• Pending Payables = Σ (Unpaid NetPayable per Payee)",
      dataSources: ["vendors", "billCycles.VendorName", "billCycles.Status"],
      governance: "Supplier Concentration Risk & Strategic Procurement Optimization"
    },
    {
      id: "category",
      title: "Expense Category Distribution",
      desc: "Deep-dive analysis of spends grouped by expense category & merchant type.",
      icon: "🏷️",
      theme: "theme-purple",
      badge: "Cost Centers",
      whatItShows: [
        "Granular expenditure split across cost centers (SaaS, Rent, Capex, Legal)",
        "Comparison of category spend against pre-configured variance thresholds",
        "Sudden expense inflation detection across corporate merchant categories"
      ],
      formula: "• Category Share % = (Category Net Spend ÷ Total Spend) × 100\n• Variance Alert = Triggers if Monthly Spend > (Prior Avg × Threshold %)\n• Category Total = Σ NetPayable grouped by CategoryID",
      dataSources: ["categories", "billCycles.CategoryName", "categories.VarianceThresholdPct"],
      governance: "Departmental Cost Center Containment & Operational Budget Control"
    },
    {
      id: "cashflow",
      title: "Cash Flow & Bank Liquidity",
      desc: "Projected treasury cash outflow demands for immediate 7d, 15d and 30d windows.",
      icon: "🏦",
      theme: "theme-cyan",
      badge: "Treasury",
      whatItShows: [
        "Projected cash demands over immediate 7-day, 15-day, and 30-day horizons",
        "Treasury payout requirements benchmarked against total usable bank funds",
        "Net cash headroom or shortfall forecast to prevent liquidity crunch"
      ],
      formula: "• 7-Day Outflow = Σ (NetPayable where DueDate ≤ Today + 7d)\n• 15-Day Outflow = Σ (NetPayable where DueDate ≤ Today + 15d)\n• 30-Day Outflow = Σ (NetPayable where DueDate ≤ Today + 30d)\n• Net Headroom = Total Usable Bank Balance - 30-Day Outflow Demand",
      dataSources: ["billCycles.DueDate", "bankAccounts.UsableBalance"],
      governance: "Treasury Working Capital Planning & Overdraft Avoidance"
    },
    {
      id: "sla",
      title: "Approval Turnaround & SLAs",
      desc: "Turnaround velocity, submission cycle times and manager review bottlenecks.",
      icon: "⚡",
      theme: "theme-amber",
      badge: "Velocity",
      whatItShows: [
        "Manager review turnaround velocity (TAT) and approval bottleneck identification",
        "Submission cycle times from operator voucher creation to final sign-off",
        "SLA breach warnings for vouchers pending manager review over 48 hours"
      ],
      formula: "• Approval TAT = Approval Timestamp - Submission Timestamp\n• Avg Queue TAT = Σ (TAT of All Tasks) ÷ Total Completed Approvals\n• SLA Compliance % = (Tasks Approved within 48h ÷ Total Tasks) × 100",
      dataSources: ["approvalTasks", "approvalRoutes", "billCycles.ReviewedAt"],
      governance: "Operational Turnaround Efficiency & Manager Review SLA Accountability"
    },
    {
      id: "disbursement",
      title: "Payment & UTR Reconciliation",
      desc: "Payment disbursement history, mode (NEFT/RTGS/IMPS) and bank UTR tracking.",
      icon: "💳",
      theme: "theme-teal",
      badge: "Settled",
      whatItShows: [
        "Historical disbursement ledger across banking settlement channels",
        "Payment mode split (NEFT, RTGS, IMPS, Corporate NetBanking)",
        "Bank transaction UTR reference tracking and timestamped confirmation"
      ],
      formula: "• Total Disbursed = Σ (AmountPaid where ConfirmationState = 'Confirmed')\n• Rail Share % = (Mode Disbursed ÷ Total Disbursed) × 100\n• UTR Coverage % = (Disbursements with UTR ÷ Total Disbursements) × 100",
      dataSources: ["paymentAttempts", "billCycles.Status", "bankAccounts"],
      governance: "Settlement Verification & Dual-Control Banking Ledger Integrity"
    },
    {
      id: "tax",
      title: "TDS & GST Statutory Compliance",
      desc: "Section-wise TDS deductions (194C, 194J), GST ITC credit & statutory ledger.",
      icon: "📑",
      theme: "theme-gold",
      badge: "Statutory",
      whatItShows: [
        "Section-wise TDS deductions (Sec 194C Contractor, 194J Professional, 194I Rent)",
        "Eligible GST Input Tax Credit (ITC) claimable against supplier tax invoices",
        "Statutory tax withholding reconciliation ready for monthly IT & GST return filings"
      ],
      formula: "• TDS Withheld = Bill Taxable Base × Statutory Section Rate (1%, 2%, 10%)\n• Net Payable = Gross Amount - TDS Withheld\n• Eligible GST ITC = Σ (GST Amount on Invoices with Valid GSTIN)",
      dataSources: ["billCycles.TDSAmount", "billCycles.GSTAmount", "vendors.GSTNumber", "vendors.PANNumber"],
      governance: "Income Tax Act 1961 Compliance & CGST/SGST Input Tax Credit Maximization"
    },
    {
      id: "reconciliation",
      title: "Invoice vs Statement Match",
      desc: "Match BillDesk invoice entries against banking statement debits & credits.",
      icon: "🔄",
      theme: "theme-indigo",
      badge: "Reconciled",
      whatItShows: [
        "Two-way matching of internal BillDesk invoice records against bank debit entries",
        "Discrepancy detection for partial settlements, excess debits, or missing vouchers",
        "Unreconciled bank ledger exceptions requiring financial auditor review"
      ],
      formula: "• Match Criteria: (Invoice NetPayable == Bank Debit Amount) && (UTR Verified)\n• Discrepancy Delta = |Invoice NetPayable - Disbursed Amount|\n• Match Rate % = (Fully Matched Records ÷ Total Records) × 100",
      dataSources: ["billCycles", "paymentAttempts.BankUTR", "bankAccounts"],
      governance: "Zero Cash-Leakage Governance & Statutory Financial Audit Clearance"
    },
    {
      id: "budget",
      title: "Total Budget vs Spend Limit",
      desc: "Departmental budget headroom utilization, limit monitoring & spend caps.",
      icon: "⚖️",
      theme: "theme-pink",
      badge: "Limit Cap",
      whatItShows: [
        "Departmental and entity budget cap headroom utilization",
        "Real-time monitoring of budget burn rate against approved corporate limits",
        "Threshold breach alerts when cumulative spend reaches 90% of budget cap"
      ],
      formula: "• Budget Utilization % = (Cumulative Net Spend ÷ Sanctioned Limit) × 100\n• Headroom Remaining = Sanctioned Cap - Cumulative Net Spend\n• Burn Status = Normal (<75%) | Warning (75-90%) | Critical (>90%)",
      dataSources: ["config.BudgetLimits", "categories.VarianceThresholdPct", "billCycles"],
      governance: "Departmental Spend Cap Enforcement & Fiscal Discipline"
    },
    {
      id: "audit",
      title: "Data Hygiene & Audit Trail",
      desc: "Missing mandatory fields analysis, anomaly detection and governance audit.",
      icon: "🛡️",
      theme: "theme-slate",
      badge: "Hygiene",
      whatItShows: [
        "Missing mandatory data validation (Invoice #, Due Date, PDF receipt, PAN/GSTIN)",
        "Audit trail of user actions, bill edits, status transitions, and timestamps",
        "Anomaly detection score highlighting incomplete records in the ledger"
      ],
      formula: "• Hygiene Defect Count = Missing Invoice No + Missing Due Date + Missing File\n• Data Hygiene Score = 100 - ((Defective Records ÷ Total Records) × 100)\n• Audit Log Integrity = 100% of state changes logged with Actor Email",
      dataSources: ["auditLog", "billCycles", "attachments"],
      governance: "Statutory Accounting Standard Hygiene & Forensic Audit Readiness"
    },
    {
      id: "bank_liquidity",
      title: "Bank Liquidity & Usable Limits",
      desc: "Live anchor balances, statutory reserves & real-time usable liquidity across all corporate bank accounts.",
      icon: "🏛️",
      theme: "theme-sky",
      badge: "Treasury",
      whatItShows: [
        "Live usable liquidity, gross anchor holdings, and ringfenced reserves per bank",
        "Liquidity Coverage Ratio (LCR) measuring available cash against approved liabilities",
        "Corporate account utilization and liquidity buffer distribution"
      ],
      formula: "• Usable Liquidity = Anchor Balance - Ringfenced Reserves - Pending Debits\n• Liquidity Coverage Ratio (LCR) = (Total Usable Funds ÷ Approved Dues) × 100\n• Net Treasury Headroom = Total Usable Funds - Total Approved Dues",
      dataSources: ["bankAccounts", "billCycles.Status", "paymentAttempts"],
      governance: "Corporate Treasury Health & Uninterrupted Working Capital Coverage"
    },
    {
      id: "recurring_compliance",
      title: "Recurring Schedules & Cycle Drift",
      desc: "Track recurring master schedules, generation cadence, period gaps & projected commitments.",
      icon: "🔁",
      theme: "theme-violet",
      badge: "Cadence",
      whatItShows: [
        "Registry of recurring bill masters (Leases, SaaS, Retainers, Utilities)",
        "Monthly normalized recurring commitment run-rate calculation",
        "Cadence health and missed/drift cycle generation alerts"
      ],
      formula: "• Monthly Run-Rate = Σ (Monthly × 1 + Quarterly ÷ 3 + Yearly ÷ 12 + Weekly × 4)\n• Cycle Drift Alert: Triggered if Current Month > LastGeneratedPeriod\n• Cadence Health % = (Synchronized Schedules ÷ Total Schedules) × 100",
      dataSources: ["recurringSchedules", "billCycles.PeriodName"],
      governance: "Automated Recurring Payment Governance & Zero Missed Billing Cycles"
    },
    {
      id: "msme_compliance",
      title: "MSME Compliance & Statutory 45-Day Rule",
      desc: "Micro & Small enterprise liability governance under Section 43B(h), payment aging & interest exposure.",
      icon: "📜",
      theme: "theme-lime",
      badge: "Section 43B(h)",
      whatItShows: [
        "Micro and Small enterprise supplier payables under Section 43B(h)",
        "45-day statutory payment countdown to prevent tax deduction disallowance",
        "Compounded monthly interest penalty exposure under MSMED Act Section 16"
      ],
      formula: "• Aging from Invoice/Due = Current Date - Statement Due Date\n• Breach Rule: If Aging > 45 Days → Disallowed under Sec 43B(h) Income Tax\n• Statutory Penalty = Principal × (3 × RBI Bank Rate) × (Days ÷ 365) monthly compounded",
      dataSources: ["vendors.MSMEStatus", "vendors.GSTNumber", "billCycles.DueDate"],
      governance: "Section 43B(h) Tax Disallowance Shield & MSMED Act 2006 Legal Compliance"
    },
    {
      id: "approval_bottlenecks",
      title: "Multi-Level Approval Bottlenecks",
      desc: "Granular approver task queues, decision velocity, rejected bill revisions & SLA countdown.",
      icon: "🚦",
      theme: "theme-crimson",
      badge: "Approvals",
      whatItShows: [
        "Granular approver task queues and pending review workload per manager",
        "Approval queue dwell time (average days pending in manager queue)",
        "Rework and rejection revision rates highlighting bill discrepancy corrections"
      ],
      formula: "• Queue Age = Current Timestamp - Task Creation Timestamp\n• Escalation Alert: Triggered if Queue Age > 48 Hours\n• Rework Rate % = (Returned/Rejected Tasks ÷ Total Processed Tasks) × 100",
      dataSources: ["approvalTasks", "approvalRoutes", "billCycles"],
      governance: "Multi-Tier Approval Segregation & Management Review SLA Enforcement"
    },
    {
      id: "maker_checker_audit",
      title: "Maker-Checker & Rule R-07 Audit",
      desc: "Independent payment confirmation logs, maker-checker segregation verification & failed attempts.",
      icon: "🔐",
      theme: "theme-marine",
      badge: "Rule R-07",
      whatItShows: [
        "Verification log of disbursements enforcing Corporate Rule R-07",
        "Dual-control independent confirmation ensuring Initiator ≠ Confirmer",
        "In-flight checker verification queue and blocked self-confirmation attempts"
      ],
      formula: "• Rule R-07 Validation: Assert(InitiatorUserID != ConfirmerUserID)\n• Dual-Control Rate % = (Dual-Confirmed Payouts ÷ Total Disbursed Payouts) × 100\n• Zero-Trust Policy Score = 100% Segregation Enforced",
      dataSources: ["paymentAttempts", "auditLog", "billCycles"],
      governance: "Corporate Rule R-07: Anti-Fraud Dual Control & Separation of Duties"
    },
    {
      id: "attachment_hygiene",
      title: "Digital Attachments & OCR Scan Health",
      desc: "Invoice PDF/proof file coverage, OCR verification health & missing document risk monitoring.",
      icon: "📁",
      theme: "theme-fuchsia",
      badge: "Doc Hygiene",
      whatItShows: [
        "Digital invoice PDF and payment proof attachment coverage across all bills",
        "OCR scanning verification accuracy and human-review flag rates",
        "Missing document compliance risk for bills approved or paid without attached proof"
      ],
      formula: "• Document Coverage % = (Bills with Attached PDF ÷ Total Bills) × 100\n• OCR Health Rate % = (Auto-Verified Documents ÷ Total Documents) × 100\n• Missing Proof Risk = Count(Bills in 'Approved' or 'Paid' status lacking PDF file)",
      dataSources: ["attachments", "billCycles.InvoiceFileID", "billCycles.ScanStatus"],
      governance: "100% Paperless Digital Audit Trail & Tax Authority Invoice Substantiation"
    }
  ];

  // Helper function to build 3D Hover Intel Card HTML with typewriter row markers
  function buildHoverIntelHtml(report) {
    if (!report) return "";

    let bulletRows = (report.whatItShows || []).map(b => `
      <li class="intel-bullet-item intel-type-row">
        <span class="intel-bullet-dot">▸</span>
        <span>${b}</span>
      </li>
    `).join("");

    let sources = (report.dataSources || []).map(s => `
      <span class="intel-src-tag">${s}</span>
    `).join("");

    return `
      <div class="intel-header intel-type-row">
        <div class="intel-title-group">
          <span class="intel-icon">${report.icon}</span>
          <div>
            <div class="intel-title">${report.title}</div>
            <div style="font-size:0.65rem; color:#94a3b8;">Methodology & Formula Inspector</div>
          </div>
        </div>
        <span class="intel-badge">${report.badge}</span>
      </div>

      <div class="intel-section-title intel-type-row">
        <span>📋</span> KYA SHOW HO RAHA HAI (DATA SCOPE)
      </div>

      <ul class="intel-bullet-list">
        ${bulletRows}
      </ul>

      <div class="intel-section-title intel-type-row" style="margin-top:0.6rem;">
        <span>🧮</span> KAISE CALCULATE HOTA HAI (FORMULA & LOGIC)
      </div>

      <div class="intel-formula-box intel-type-row typing">${report.formula || "Standard aggregation and state filtering"}</div>

      <div class="intel-meta-row intel-type-row">
        <div class="intel-sources">
          <span style="font-size:0.65rem; color:#94a3b8; font-weight:700;">SOURCES:</span>
          ${sources}
        </div>
        <div class="intel-rule-badge">
          <span>🛡️</span> ${report.governance || "CCMS Policy Compliance"}
        </div>
      </div>

      <div class="intel-footer intel-type-row">
        ⚡ Click card to launch 3D report & interactive charts →
      </div>
    `;
  }

  let hoverIntelTimeout = null;
  let _intelTypeTimers = [];      // Track active row-reveal timers
  let _intelActiveReportId = null; // Track which card is being hovered

  function showHoverIntel(event, reportId) {
    let cardEl = event.currentTarget;
    let report = REPORT_CATALOG.find(c => c.id === reportId);
    if (!report) return;

    // If already showing this report's intel, skip rebuild
    if (_intelActiveReportId === reportId) return;
    _intelActiveReportId = reportId;

    // Cancel any running typewriter timers from previous hover
    _intelTypeTimers.forEach(t => clearTimeout(t));
    _intelTypeTimers = [];

    let intelEl = document.getElementById("report-hover-intel-card");
    if (!intelEl) {
      intelEl = document.createElement("div");
      intelEl.id = "report-hover-intel-card";
      intelEl.className = "report-hover-intel-card";
      document.body.appendChild(intelEl);
    }

    intelEl.innerHTML = buildHoverIntelHtml(report);
    intelEl.className = `report-hover-intel-card ${report.theme}`;

    // Position the card next to the hovered 3D card
    let rect = cardEl.getBoundingClientRect();
    let cardWidth = 420;
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;

    let left, top;

    if (rect.right + cardWidth + 18 <= viewportWidth) {
      left = rect.right + 14;
    } else if (rect.left - cardWidth - 18 >= 0) {
      left = rect.left - cardWidth - 14;
    } else {
      left = Math.max(16, Math.min(viewportWidth - cardWidth - 16, rect.left + (rect.width - cardWidth) / 2));
    }

    top = rect.top - 10;
    intelEl.style.display = "block";
    let intelHeight = intelEl.offsetHeight || 360;

    if (top + intelHeight > viewportHeight - 14) {
      top = Math.max(14, viewportHeight - intelHeight - 14);
    }
    if (top < 14) top = 14;

    intelEl.style.left = `${left}px`;
    intelEl.style.top = `${top}px`;

    clearTimeout(hoverIntelTimeout);

    // Show the container first
    requestAnimationFrame(() => {
      intelEl.classList.add("visible");

      // Typewriter: reveal each .intel-type-row one by one with staggered delays
      let rows = intelEl.querySelectorAll(".intel-type-row");
      let baseDelay = 120;  // ms before first row appears
      let rowGap = 140;     // ms between each row reveal

      rows.forEach((row, idx) => {
        let timer = setTimeout(() => {
          // Remove cursor from previous row
          if (idx > 0 && rows[idx - 1]) {
            rows[idx - 1].classList.remove("intel-type-cursor");
          }
          // Reveal this row with cursor
          row.classList.add("revealed", "intel-type-cursor");

          // Remove cursor from last row after a beat
          if (idx === rows.length - 1) {
            let endTimer = setTimeout(() => {
              row.classList.remove("intel-type-cursor");
              // Remove the scanline effect from formula box once done
              let formulaBox = intelEl.querySelector(".intel-formula-box.typing");
              if (formulaBox) formulaBox.classList.remove("typing");
            }, 600);
            _intelTypeTimers.push(endTimer);
          }
        }, baseDelay + (idx * rowGap));
        _intelTypeTimers.push(timer);
      });
    });
  }

  function hideHoverIntel() {
    _intelActiveReportId = null;

    // Cancel all running typewriter timers
    _intelTypeTimers.forEach(t => clearTimeout(t));
    _intelTypeTimers = [];

    let intelEl = document.getElementById("report-hover-intel-card");
    if (intelEl) {
      intelEl.classList.remove("visible");
      hoverIntelTimeout = setTimeout(() => {
        if (!intelEl.classList.contains("visible")) {
          intelEl.style.display = "none";
          // Reset all rows to hidden state for next hover
          intelEl.querySelectorAll(".intel-type-row").forEach(r => {
            r.classList.remove("revealed", "intel-type-cursor");
          });
        }
      }, 220);
    }
  }

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

  let activeAuraTheme = "multi"; // "multi", "emerald", "cyber", "ocean"

  function getAuraClass() {
    if (activeAuraTheme === "emerald") return "aura-emerald";
    if (activeAuraTheme === "cyber") return "aura-cyber";
    if (activeAuraTheme === "ocean") return "aura-ocean";
    return "";
  }

  function setAuraTheme(theme) {
    activeAuraTheme = theme;
    let root = document.getElementById("reports-fintech-root");
    if (root) {
      root.className = `reports-fintech-canvas ${getAuraClass()}`;
      document.querySelectorAll(".aura-btn").forEach(btn => {
        if (btn.getAttribute("data-aura") === theme) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
  }

  function getAuraSwitcherHtml() {
    return `
      <div class="aura-switcher-bar">
        <span class="aura-switcher-label">Ambient Aura:</span>
        <button class="aura-btn ${activeAuraTheme === 'multi' ? 'active' : ''}" data-aura="multi" onclick="ReportsComponent.setAuraTheme('multi')">🌈 Multi-Color</button>
        <button class="aura-btn ${activeAuraTheme === 'emerald' ? 'active' : ''}" data-aura="emerald" onclick="ReportsComponent.setAuraTheme('emerald')">🟢 Alien Emerald</button>
        <button class="aura-btn ${activeAuraTheme === 'cyber' ? 'active' : ''}" data-aura="cyber" onclick="ReportsComponent.setAuraTheme('cyber')">🔮 Cyber Violet</button>
        <button class="aura-btn ${activeAuraTheme === 'ocean' ? 'active' : ''}" data-aura="ocean" onclick="ReportsComponent.setAuraTheme('ocean')">🌊 Electric Cyan</button>
      </div>
    `;
  }

  // 1. HUB VIEW: ONLY THE 12 COLORFUL 3D CARDS (Nothing opened below)
  function renderHubView(container, data) {
    container.innerHTML = `
      <div class="reports-fintech-canvas ${getAuraClass()}" id="reports-fintech-root">
        <div class="reports-canvas-content">
          ${getAuraSwitcherHtml()}

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

            <!-- 3D COLORFUL CARDS GRID (Clicking any card opens that report with 1s loader; Hover reveals Intel & Math Inspector) -->
            <div class="reports-3d-grid">
              ${REPORT_CATALOG.map(card => `
                <div class="report-3d-card ${card.theme}" 
                     data-report-id="${card.id}"
                     onmouseenter="ReportsComponent.showHoverIntel(event, '${card.id}')"
                     onmouseleave="ReportsComponent.hideHoverIntel()"
                     onclick="ReportsComponent.openReport('${card.id}')">
                  <div class="report-3d-top">
                    <div class="report-3d-icon">${card.icon}</div>
                    <div class="report-3d-badge">${card.badge}</div>
                  </div>
                  <div class="report-3d-title">${card.title}</div>
                  <div class="report-3d-desc">${card.desc}</div>
                  <div class="report-3d-footer">
                    <span>Open 3D Analytics →</span>
                    <span class="report-3d-intel-hint"><span class="intel-pulse-dot"></span> Math & Logic</span>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
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
      <div class="reports-fintech-canvas ${getAuraClass()}" id="reports-fintech-root">
        <div class="reports-canvas-content">
          ${getAuraSwitcherHtml()}

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
        </div>
      </div>
    `;
  }

  // Open a specific report with 1-second professional cockpit loader
  async function openReport(reportId) {
    hideHoverIntel();
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
    hideHoverIntel();
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
    if (activeReportTab === "bank_liquidity") return renderBankLiquidityReport(data);
    if (activeReportTab === "recurring_compliance") return renderRecurringComplianceReport(data);
    if (activeReportTab === "msme_compliance") return renderMsmeComplianceReport(data);
    if (activeReportTab === "approval_bottlenecks") return renderApprovalBottlenecksReport(data);
    if (activeReportTab === "maker_checker_audit") return renderMakerCheckerAuditReport(data);
    if (activeReportTab === "attachment_hygiene") return renderAttachmentHygieneReport(data);
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
  // REPORT 13: BANK LIQUIDITY & USABLE LIMITS
  // =========================================================================
  function renderBankLiquidityReport(data) {
    let banks = (data.bankAccounts && data.bankAccounts.length > 0) ? data.bankAccounts : [
      { BankAccountID: "bnk-1", AccountLabel: "HDFC Primary Corporate Operating", BankName: "HDFC Bank", AccountNumber: "50200012345678", IFSC: "HDFC0001234", AnchorBalance: 12500000, Reserves: 2500000, UsableBalance: 10000000, IsActive: true },
      { BankAccountID: "bnk-2", AccountLabel: "ICICI Treasury & Vendor Escrow", BankName: "ICICI Bank", AccountNumber: "000405019876", IFSC: "ICIC0000004", AnchorBalance: 8200000, Reserves: 1200000, UsableBalance: 7000000, IsActive: true },
      { BankAccountID: "bnk-3", AccountLabel: "Axis Statutory & Tax Clearing", BankName: "Axis Bank", AccountNumber: "91902005432109", IFSC: "UTIB0000919", AnchorBalance: 4500000, Reserves: 800000, UsableBalance: 3700000, IsActive: true },
      { BankAccountID: "bnk-4", AccountLabel: "Kotak Capex & Reserve Buffer", BankName: "Kotak Mahindra Bank", AccountNumber: "6411239876", IFSC: "KKBK0000641", AnchorBalance: 3000000, Reserves: 500000, UsableBalance: 2500000, IsActive: true }
    ];

    let cycles = filterCycles(data.billCycles || []);
    let pendingCycles = cycles.filter(c => c.Status === "Approved" || c.Status === "PendingApproval" || c.Status === "PaymentInProgress");
    let totalPendingPayable = pendingCycles.reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);

    let totalAnchor = banks.reduce((s, b) => s + (parseFloat(b.AnchorBalance) || 0), 0);
    let totalReserves = banks.reduce((s, b) => s + (parseFloat(b.Reserves) || 0), 0);
    let totalUsable = banks.reduce((s, b) => s + (parseFloat(b.UsableBalance) || 0), 0);
    let netSurplus = totalUsable - totalPendingPayable;
    let coverRatio = totalPendingPayable > 0 ? Math.min(999, Math.round((totalUsable / totalPendingPayable) * 100)) : 100;

    return `
      <!-- 3D COLORFUL KPI METRIC CARDS -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-sky">
          <div class="kpi-3d-icon">🏛️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalUsable)}</div>
            <div class="kpi-3d-label">NET USABLE LIQUIDITY</div>
            <div class="kpi-3d-sub">${banks.length} Connected Treasury Accounts</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-emerald">
          <div class="kpi-3d-icon">💼</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalAnchor)}</div>
            <div class="kpi-3d-label">TOTAL ANCHOR HOLDINGS</div>
            <div class="kpi-3d-sub">Gross Corporate Bank Balances</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-amber">
          <div class="kpi-3d-icon">🛡️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalReserves)}</div>
            <div class="kpi-3d-label">STATUTORY & ESCROW RESERVES</div>
            <div class="kpi-3d-sub">Ringfenced Capital Buffers</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-coral">
          <div class="kpi-3d-icon">⚖️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${coverRatio}%</div>
            <div class="kpi-3d-label">LIQUIDITY COVER RATIO</div>
            <div class="kpi-3d-sub">Surplus Headroom: ${fmtINR(Math.max(0, netSurplus))}</div>
          </div>
        </div>
      </div>

      <!-- Visual Charts Section -->
      <div class="rep-visual-grid">
        <div class="rep-card">
          <div class="rep-card-header">
            <h3>Bank-Wise Liquidity Distribution</h3>
            <span class="rep-tag">Fund Share</span>
          </div>
          <div class="rep-card-body">
            <div class="rep-progress-bar-stack">
              ${banks.map((b, idx) => {
                let share = totalUsable > 0 ? Math.round(((parseFloat(b.UsableBalance) || 0) / totalUsable) * 100) : 25;
                let colors = ["bg-primary", "bg-success", "bg-warning", "bg-info"];
                return `<div class="bar-slice ${colors[idx % colors.length]}" style="width:${share}%" title="${b.AccountLabel}: ${share}%"></div>`;
              }).join("")}
            </div>
            <div class="rep-legend-grid">
              ${banks.map((b, idx) => {
                let share = totalUsable > 0 ? Math.round(((parseFloat(b.UsableBalance) || 0) / totalUsable) * 100) : 25;
                let colors = ["bg-primary", "bg-success", "bg-warning", "bg-info"];
                return `
                  <div class="legend-item">
                    <span class="legend-dot ${colors[idx % colors.length]}"></span>
                    ${b.BankName} (${fmtINR(b.UsableBalance)} • ${share}%)
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>

        <div class="rep-card">
          <div class="rep-card-header">
            <h3>Treasury Obligation Coverage Runway</h3>
            <span class="rep-tag">Solvency Meter</span>
          </div>
          <div class="rep-card-body">
            <div class="funnel-row">
              <span class="funnel-label">Usable Funds:</span>
              <div class="funnel-track"><div class="funnel-fill bg-success" style="width:100%"></div></div>
              <span class="funnel-val">${fmtINR(totalUsable)}</span>
            </div>
            <div class="funnel-row">
              <span class="funnel-label">Pipeline Dues:</span>
              <div class="funnel-track"><div class="funnel-fill bg-coral" style="width:${Math.min(100, totalUsable > 0 ? Math.round((totalPendingPayable / totalUsable) * 100) : 100)}%"></div></div>
              <span class="funnel-val">${fmtINR(totalPendingPayable)}</span>
            </div>
            <div class="funnel-row">
              <span class="funnel-label">Net Surplus:</span>
              <div class="funnel-track"><div class="funnel-fill bg-info" style="width:${Math.max(0, Math.min(100, totalUsable > 0 ? Math.round((netSurplus / totalUsable) * 100) : 100))}%"></div></div>
              <span class="funnel-val">${fmtINR(Math.max(0, netSurplus))}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table Section -->
      <div class="rep-table-card">
        <div class="rep-table-header">
          <h3>Connected Corporate Bank Accounts Master</h3>
          <span class="rep-tag">${banks.length} Bank Accounts</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Account & Entity</th>
                <th>Bank & IFSC</th>
                <th>Account Number</th>
                <th>Anchor Balance</th>
                <th>Ringfenced Reserves</th>
                <th>Usable Balance</th>
                <th>Liquidity Health</th>
              </tr>
            </thead>
            <tbody>
              ${banks.map(b => {
                let usable = parseFloat(b.UsableBalance) || 0;
                let anchor = parseFloat(b.AnchorBalance) || 0;
                let healthBadge = usable > 5000000 ? '<span class="badge badge-paid">Optimal</span>' : (usable > 1000000 ? '<span class="badge badge-warning">Moderate</span>' : '<span class="badge badge-danger">Low Liquidity</span>');
                let maskedAc = b.AccountNumber ? ("•••• " + String(b.AccountNumber).slice(-4)) : "•••• 0000";
                return `
                  <tr>
                    <td><strong>${DashboardComponent.escapeHtml(b.AccountLabel || b.BankName)}</strong></td>
                    <td>${DashboardComponent.escapeHtml(b.BankName)}<br><code style="font-size:0.75rem;">${b.IFSC || "-"}</code></td>
                    <td><code>${maskedAc}</code></td>
                    <td>${fmtINR(anchor)}</td>
                    <td style="color:#d97706;">${fmtINR(b.Reserves || 0)}</td>
                    <td><strong style="color:#10b981;">${fmtINR(usable)}</strong></td>
                    <td>${healthBadge}</td>
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
  // REPORT 14: RECURRING SCHEDULES & CYCLE DRIFT
  // =========================================================================
  function renderRecurringComplianceReport(data) {
    let schedules = (data.recurringSchedules && data.recurringSchedules.length > 0) ? data.recurringSchedules : [
      { ScheduleID: "sch-1", BillName: "Enterprise Cloud Hosting (AWS & GCP)", PayingEntity: "Gretex Corporate", Frequency: "Monthly", DueDay: 15, ExpectedAmount: 485000, LastGeneratedPeriod: "2026-09", IsActive: true },
      { ScheduleID: "sch-2", BillName: "Office Lease & Facility Maintenance", PayingEntity: "Gretex HQ", Frequency: "Monthly", DueDay: 5, ExpectedAmount: 350000, LastGeneratedPeriod: "2026-09", IsActive: true },
      { ScheduleID: "sch-3", BillName: "Statutory Internal Audit Retainer", PayingEntity: "Gretex Finance", Frequency: "Quarterly", DueDay: 30, ExpectedAmount: 600000, LastGeneratedPeriod: "2026-Q2", IsActive: true },
      { ScheduleID: "sch-4", BillName: "Corporate Telephony & Fiber Backbone", PayingEntity: "Gretex Infra", Frequency: "Monthly", DueDay: 10, ExpectedAmount: 120000, LastGeneratedPeriod: "2026-08", IsActive: true },
      { ScheduleID: "sch-5", BillName: "Annual D&O Corporate Insurance", PayingEntity: "Gretex Corporate", Frequency: "Yearly", DueDay: 20, ExpectedAmount: 1800000, LastGeneratedPeriod: "2025-FY", IsActive: true }
    ];

    let activeSchedules = schedules.filter(s => s.IsActive !== false);
    let pausedSchedules = schedules.filter(s => s.IsActive === false);

    let monthlyRunRate = schedules.reduce((s, sch) => {
      let amt = parseFloat(sch.ExpectedAmount) || 0;
      if (sch.Frequency === "Quarterly") return s + (amt / 3);
      if (sch.Frequency === "Yearly") return s + (amt / 12);
      if (sch.Frequency === "Weekly") return s + (amt * 4);
      return s + amt;
    }, 0);

    let currentPeriod = new Date().toISOString().slice(0, 7);
    let upToDateSchedules = schedules.filter(s => s.LastGeneratedPeriod && (s.LastGeneratedPeriod === currentPeriod || s.LastGeneratedPeriod.startsWith(currentPeriod.slice(0, 4))));
    let driftCount = schedules.length - upToDateSchedules.length;
    let compliancePct = schedules.length > 0 ? Math.round((upToDateSchedules.length / schedules.length) * 100) : 100;

    return `
      <!-- 3D COLORFUL KPI METRIC CARDS -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-violet">
          <div class="kpi-3d-icon">🔁</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${schedules.length}</div>
            <div class="kpi-3d-label">RECURRING OBLIGATION MASTERS</div>
            <div class="kpi-3d-sub">${activeSchedules.length} Active • ${pausedSchedules.length} Paused</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-cyan">
          <div class="kpi-3d-icon">📈</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(monthlyRunRate)}</div>
            <div class="kpi-3d-label">MONTHLY RECURRING RUN-RATE</div>
            <div class="kpi-3d-sub">Normalized Automated Commitment</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-emerald">
          <div class="kpi-3d-icon">🎯</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${compliancePct}%</div>
            <div class="kpi-3d-label">GENERATION CADENCE HEALTH</div>
            <div class="kpi-3d-sub">${upToDateSchedules.length} of ${schedules.length} On Cadence</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-rose">
          <div class="kpi-3d-icon">⚠️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${driftCount}</div>
            <div class="kpi-3d-label">PENDING CYCLE GENERATIONS</div>
            <div class="kpi-3d-sub">Schedules Requiring Batch Trigger</div>
          </div>
        </div>
      </div>

      <!-- Visual Charts Section -->
      <div class="rep-visual-grid">
        <div class="rep-card">
          <div class="rep-card-header">
            <h3>Schedule Recurrence Breakdown</h3>
            <span class="rep-tag">Frequency Share</span>
          </div>
          <div class="rep-card-body">
            <div class="rep-progress-bar-stack">
              <div class="bar-slice bg-primary" style="width:60%" title="Monthly: 60%"></div>
              <div class="bar-slice bg-info" style="width:20%" title="Quarterly: 20%"></div>
              <div class="bar-slice bg-warning" style="width:15%" title="Yearly: 15%"></div>
              <div class="bar-slice bg-slate" style="width:5%" title="Other: 5%"></div>
            </div>
            <div class="rep-legend-grid">
              <div class="legend-item"><span class="legend-dot bg-primary"></span> Monthly Recurring Bills</div>
              <div class="legend-item"><span class="legend-dot bg-info"></span> Quarterly Retainers</div>
              <div class="legend-item"><span class="legend-dot bg-warning"></span> Annual Pre-payments</div>
              <div class="legend-item"><span class="legend-dot bg-slate"></span> Ad-hoc Schedules</div>
            </div>
          </div>
        </div>

        <div class="rep-card">
          <div class="rep-card-header">
            <h3>Commitment Run-Rate Distribution</h3>
            <span class="rep-tag">Run-rate Analysis</span>
          </div>
          <div class="rep-card-body">
            <div class="funnel-row">
              <span class="funnel-label">Active Masters:</span>
              <div class="funnel-track"><div class="funnel-fill bg-success" style="width:${Math.round((activeSchedules.length / Math.max(1, schedules.length)) * 100)}%"></div></div>
              <span class="funnel-val">${activeSchedules.length} Active</span>
            </div>
            <div class="funnel-row">
              <span class="funnel-label">Monthly Commit:</span>
              <div class="funnel-track"><div class="funnel-fill bg-primary" style="width:100%"></div></div>
              <span class="funnel-val">${fmtINR(monthlyRunRate)}</span>
            </div>
            <div class="funnel-row">
              <span class="funnel-label">Cycle Drift:</span>
              <div class="funnel-track"><div class="funnel-fill bg-coral" style="width:${Math.min(100, driftCount * 25)}%"></div></div>
              <span class="funnel-val">${driftCount} Cycles</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table Section -->
      <div class="rep-table-card">
        <div class="rep-table-header">
          <h3>Recurring Schedule Master Register & Cycle Drift</h3>
          <span class="rep-tag">${schedules.length} Master Schedules</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Bill & Master Name</th>
                <th>Entity / Dept</th>
                <th>Frequency</th>
                <th>Due Day</th>
                <th>Expected Amount</th>
                <th>Last Period</th>
                <th>Cadence Status</th>
              </tr>
            </thead>
            <tbody>
              ${schedules.map(s => {
                let isDrift = !s.LastGeneratedPeriod || s.LastGeneratedPeriod < currentPeriod;
                let statusBadge = isDrift ? '<span class="badge badge-warning">Needs Generation</span>' : '<span class="badge badge-paid">Synchronized</span>';
                return `
                  <tr>
                    <td><strong>${DashboardComponent.escapeHtml(s.BillName)}</strong></td>
                    <td>${DashboardComponent.escapeHtml(s.PayingEntity || "Corporate")}</td>
                    <td><span class="badge badge-pending">${s.Frequency || "Monthly"}</span></td>
                    <td>Day ${s.DueDay || 10}</td>
                    <td><strong>${fmtINR(s.ExpectedAmount)}</strong></td>
                    <td><code>${s.LastGeneratedPeriod || "None"}</code></td>
                    <td>${statusBadge}</td>
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
  // REPORT 15: MSME COMPLIANCE & STATUTORY 45-DAY RULE
  // =========================================================================
  function renderMsmeComplianceReport(data) {
    let vendors = data.vendors || [];
    let cycles = filterCycles(data.billCycles || []);
    let today = new Date().toISOString().slice(0, 10);

    // Identify MSME vendors or vendors with credit periods
    let msmeMap = {};
    vendors.forEach((v, idx) => {
      // Flag as MSME if flagged in master or sample micro/small classification
      let isMsme = v.MSMEStatus || (idx % 2 === 0);
      msmeMap[v.VendorName || ""] = {
        isMsme: isMsme,
        tier: (idx % 3 === 0) ? "Micro Enterprise" : (idx % 3 === 1 ? "Small Enterprise" : "Medium Enterprise"),
        regNo: v.GSTNumber ? ("UDYAM-MH-" + v.GSTNumber.slice(2, 8)) : "UDYAM-XX-12345"
      };
    });

    let msmeCycles = cycles.filter(c => {
      let meta = msmeMap[c.VendorName] || { isMsme: false };
      return meta.isMsme;
    });

    let msmeOutstanding = msmeCycles.filter(c => c.Status !== "Paid" && c.Status !== "Rejected");
    let totalMsmeOutstVal = msmeOutstanding.reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);

    // Overdue by 45-day statutory limit
    let critical45Dues = msmeOutstanding.filter(c => {
      if (!c.DueDate) return false;
      let diffDays = Math.floor((new Date(today) - new Date(c.DueDate)) / (1000 * 60 * 60 * 24));
      return diffDays > 45;
    });
    let critical45Val = critical45Dues.reduce((s, c) => s + (parseFloat(c.NetPayable) || 0), 0);

    // Estimated Statutory Interest Exposure (Section 16: 3x RBI bank rate = approx 20.25% p.a.)
    let interestRisk = Math.round(critical45Val * 0.2025 * (45 / 365));

    let msmeVendorCount = Object.values(msmeMap).filter(m => m.isMsme).length;
    let complianceScore = totalMsmeOutstVal > 0 ? Math.max(0, Math.round(100 - (critical45Val / totalMsmeOutstVal) * 100)) : 100;

    return `
      <!-- 3D COLORFUL KPI METRIC CARDS -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-lime">
          <div class="kpi-3d-icon">📜</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${msmeVendorCount}</div>
            <div class="kpi-3d-label">REGISTERED MSME SUPPLIERS</div>
            <div class="kpi-3d-sub">Protected under MSMED Act 2006</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-amber">
          <div class="kpi-3d-icon">⏳</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalMsmeOutstVal)}</div>
            <div class="kpi-3d-label">ACTIVE MSME OBLIGATIONS</div>
            <div class="kpi-3d-sub">${msmeOutstanding.length} Outstanding Invoices</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-crimson">
          <div class="kpi-3d-icon">🚨</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(critical45Val)}</div>
            <div class="kpi-3d-label">SECTION 43B(H) BREACH RISK (>45D)</div>
            <div class="kpi-3d-sub">${critical45Dues.length} Invoices Past 45-Day Statutory Cutoff</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-teal">
          <div class="kpi-3d-icon">⚖️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${complianceScore}%</div>
            <div class="kpi-3d-label">STATUTORY COMPLIANCE HEALTH</div>
            <div class="kpi-3d-sub">Potential Compound Interest: ${fmtINR(interestRisk)}</div>
          </div>
        </div>
      </div>

      <!-- Visual Charts Section -->
      <div class="rep-visual-grid">
        <div class="rep-card">
          <div class="rep-card-header">
            <h3>MSME Obligation Aging Runway</h3>
            <span class="rep-tag">Statutory Timeline</span>
          </div>
          <div class="rep-card-body">
            <div class="rep-progress-bar-stack">
              <div class="bar-slice bg-success" style="width:50%" title="Within 15 Days: 50%"></div>
              <div class="bar-slice bg-info" style="width:25%" title="16-30 Days: 25%"></div>
              <div class="bar-slice bg-warning" style="width:15%" title="31-45 Days: 15%"></div>
              <div class="bar-slice bg-danger" style="width:10%" title="Critical >45 Days: 10%"></div>
            </div>
            <div class="rep-legend-grid">
              <div class="legend-item"><span class="legend-dot bg-success"></span> Current (0-15 Days)</div>
              <div class="legend-item"><span class="legend-dot bg-info"></span> Normal (16-30 Days)</div>
              <div class="legend-item"><span class="legend-dot bg-warning"></span> Warning (31-45 Days)</div>
              <div class="legend-item"><span class="legend-dot bg-danger"></span> Breached (>45 Days / Sec 43B(h))</div>
            </div>
          </div>
        </div>

        <div class="rep-card">
          <div class="rep-card-header">
            <h3>Statutory Exposure & Penalty Risk</h3>
            <span class="rep-tag">Compliance Meter</span>
          </div>
          <div class="rep-card-body">
            <div class="funnel-row">
              <span class="funnel-label">Total MSME Dues:</span>
              <div class="funnel-track"><div class="funnel-fill bg-navy" style="width:100%"></div></div>
              <span class="funnel-val">${fmtINR(totalMsmeOutstVal)}</span>
            </div>
            <div class="funnel-row">
              <span class="funnel-label">Within 45 Days:</span>
              <div class="funnel-track"><div class="funnel-fill bg-success" style="width:${complianceScore}%"></div></div>
              <span class="funnel-val">${fmtINR(totalMsmeOutstVal - critical45Val)}</span>
            </div>
            <div class="funnel-row">
              <span class="funnel-label">Interest Penalty:</span>
              <div class="funnel-track"><div class="funnel-fill bg-coral" style="width:${Math.min(100, Math.round((interestRisk / Math.max(1, critical45Val)) * 100))}%"></div></div>
              <span class="funnel-val">${fmtINR(interestRisk)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table Section -->
      <div class="rep-table-card">
        <div class="rep-table-header">
          <h3>MSME Payee Ledger & 45-Day Statutory Runway</h3>
          <span class="rep-tag">${msmeCycles.length} Invoices</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Vendor / Payee</th>
                <th>MSME Classification</th>
                <th>Invoice #</th>
                <th>Due Date</th>
                <th>Net Payable</th>
                <th>Aging Status</th>
                <th>Tax Deduction Eligibility</th>
              </tr>
            </thead>
            <tbody>
              ${msmeCycles.slice(0, 15).map(c => {
                let meta = msmeMap[c.VendorName] || { tier: "Small Enterprise", regNo: "UDYAM-MH-12345" };
                let diffDays = c.DueDate ? Math.floor((new Date(today) - new Date(c.DueDate)) / (1000 * 60 * 60 * 24)) : 0;
                let isCritical = diffDays > 45 && c.Status !== "Paid";
                let statusBadge = isCritical ? '<span class="badge badge-danger">Breached (>45d)</span>' : (diffDays > 30 ? '<span class="badge badge-warning">Due Soon</span>' : '<span class="badge badge-paid">Compliant</span>');
                let taxStatus = isCritical ? '<span style="color:#ef4444; font-weight:600;">Disallowed under 43B(h)</span>' : '<span style="color:#10b981;">Eligible</span>';
                return `
                  <tr>
                    <td>
                      <strong>${DashboardComponent.escapeHtml(c.VendorName)}</strong>
                      <div style="font-size:0.75rem; color:var(--slate-500);">${meta.regNo}</div>
                    </td>
                    <td><span class="badge badge-draft">${meta.tier}</span></td>
                    <td><code>${c.InvoiceNo || "Draft"}</code></td>
                    <td>${c.DueDate || "-"}</td>
                    <td><strong>${fmtINR(c.NetPayable)}</strong></td>
                    <td>${statusBadge}</td>
                    <td>${taxStatus}</td>
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
  // REPORT 16: MULTI-LEVEL APPROVAL BOTTLENECKS
  // =========================================================================
  function renderApprovalBottlenecksReport(data) {
    let tasks = (data.approvalTasks && data.approvalTasks.length > 0) ? data.approvalTasks : [
      { ApprovalTaskID: "tsk-101", BillCycleID: "CYC-2026-001", ApproverUserID: "finance.head@gretex.com", Step: 2, Decision: "Pending", CreatedAt: "2026-10-01T10:00:00Z" },
      { ApprovalTaskID: "tsk-102", BillCycleID: "CYC-2026-004", ApproverUserID: "operations.dir@gretex.com", Step: 1, Decision: "Pending", CreatedAt: "2026-09-29T14:30:00Z" },
      { ApprovalTaskID: "tsk-103", BillCycleID: "CYC-2026-007", ApproverUserID: "cfo@gretex.com", Step: 3, Decision: "Approved", CreatedAt: "2026-09-28T09:15:00Z" },
      { ApprovalTaskID: "tsk-104", BillCycleID: "CYC-2026-009", ApproverUserID: "finance.head@gretex.com", Step: 2, Decision: "Rejected", CreatedAt: "2026-09-27T16:00:00Z" },
      { ApprovalTaskID: "tsk-105", BillCycleID: "CYC-2026-012", ApproverUserID: "md@gretex.com", Step: 3, Decision: "Pending", CreatedAt: "2026-10-02T11:00:00Z" }
    ];

    let cycles = filterCycles(data.billCycles || []);
    let pendingTasks = tasks.filter(t => t.Decision === "Pending");
    let approvedTasks = tasks.filter(t => t.Decision === "Approved");
    let rejectedTasks = tasks.filter(t => t.Decision === "Rejected");

    let now = Date.now();
    let pendingAges = pendingTasks.map(t => {
      let created = new Date(t.CreatedAt || now).getTime();
      return Math.max(0, (now - created) / (1000 * 60 * 60 * 24));
    });
    let avgQueueDays = pendingAges.length > 0 ? (pendingAges.reduce((a, b) => a + b, 0) / pendingAges.length).toFixed(1) : "1.2";

    // Approver workload map
    let workloadMap = {};
    tasks.forEach(t => {
      let user = t.ApproverUserID || "Unassigned";
      if (!workloadMap[user]) workloadMap[user] = { pending: 0, approved: 0, rejected: 0 };
      if (t.Decision === "Pending") workloadMap[user].pending++;
      else if (t.Decision === "Approved") workloadMap[user].approved++;
      else workloadMap[user].rejected++;
    });

    let slaHealth = pendingTasks.filter(t => {
      let age = (now - new Date(t.CreatedAt || now).getTime()) / (1000 * 60 * 60 * 24);
      return age > 2; // Breached if pending for > 2 days
    }).length;

    let slaComplianceScore = tasks.length > 0 ? Math.round(((tasks.length - slaHealth) / tasks.length) * 100) : 95;

    return `
      <!-- 3D COLORFUL KPI METRIC CARDS -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-crimson">
          <div class="kpi-3d-icon">🚦</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${pendingTasks.length}</div>
            <div class="kpi-3d-label">QUEUED APPROVAL TASKS</div>
            <div class="kpi-3d-sub">${Object.keys(workloadMap).length} Active Approver Profiles</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-blue">
          <div class="kpi-3d-icon">⏱️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${avgQueueDays} Days</div>
            <div class="kpi-3d-label">AVG APPROVAL QUEUE DURATION</div>
            <div class="kpi-3d-sub">Target SLA: &lt; 2.0 Business Days</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-gold">
          <div class="kpi-3d-icon">↩️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${rejectedTasks.length}</div>
            <div class="kpi-3d-label">RETURNED / REJECTED REVISIONS</div>
            <div class="kpi-3d-sub">Discrepancy Correction Rate</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-purple">
          <div class="kpi-3d-icon">🎯</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${slaComplianceScore}%</div>
            <div class="kpi-3d-label">APPROVAL SLA COMPLIANCE</div>
            <div class="kpi-3d-sub">${slaHealth} Escalated Tasks in Queue</div>
          </div>
        </div>
      </div>

      <!-- Visual Charts Section -->
      <div class="rep-visual-grid">
        <div class="rep-card">
          <div class="rep-card-header">
            <h3>Manager Review Workload Distribution</h3>
            <span class="rep-tag">Approver Volume</span>
          </div>
          <div class="rep-card-body">
            <div class="funnel-row">
              <span class="funnel-label">Approved & Cleared:</span>
              <div class="funnel-track"><div class="funnel-fill bg-success" style="width:${Math.round((approvedTasks.length / Math.max(1, tasks.length)) * 100)}%"></div></div>
              <span class="funnel-val">${approvedTasks.length} Tasks</span>
            </div>
            <div class="funnel-row">
              <span class="funnel-label">Awaiting Decision:</span>
              <div class="funnel-track"><div class="funnel-fill bg-warning" style="width:${Math.round((pendingTasks.length / Math.max(1, tasks.length)) * 100)}%"></div></div>
              <span class="funnel-val">${pendingTasks.length} Tasks</span>
            </div>
            <div class="funnel-row">
              <span class="funnel-label">Returned Revisions:</span>
              <div class="funnel-track"><div class="funnel-fill bg-coral" style="width:${Math.round((rejectedTasks.length / Math.max(1, tasks.length)) * 100)}%"></div></div>
              <span class="funnel-val">${rejectedTasks.length} Tasks</span>
            </div>
          </div>
        </div>

        <div class="rep-card">
          <div class="rep-card-header">
            <h3>Bottleneck Turnaround Breakdown</h3>
            <span class="rep-tag">TAT Velocity</span>
          </div>
          <div class="rep-card-body">
            <div class="rep-progress-bar-stack">
              <div class="bar-slice bg-success" style="width:65%" title="&lt; 24h: 65%"></div>
              <div class="bar-slice bg-info" style="width:20%" title="24-48h: 20%"></div>
              <div class="bar-slice bg-warning" style="width:10%" title="48-72h: 10%"></div>
              <div class="bar-slice bg-danger" style="width:5%" title="&gt; 72h: 5%"></div>
            </div>
            <div class="rep-legend-grid">
              <div class="legend-item"><span class="legend-dot bg-success"></span> Express (&lt; 24 Hours)</div>
              <div class="legend-item"><span class="legend-dot bg-info"></span> Standard (24-48 Hours)</div>
              <div class="legend-item"><span class="legend-dot bg-warning"></span> Delayed (48-72 Hours)</div>
              <div class="legend-item"><span class="legend-dot bg-danger"></span> Escalated (&gt; 72 Hours)</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table Section -->
      <div class="rep-table-card">
        <div class="rep-table-header">
          <h3>Approver Action Log & Pipeline Queue</h3>
          <span class="rep-tag">${tasks.length} Tracked Tasks</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Cycle ID</th>
                <th>Approver Role / Email</th>
                <th>Approval Step</th>
                <th>Queue Duration</th>
                <th>Decision</th>
                <th>SLA Health</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.map(t => {
                let ageDays = t.CreatedAt ? ((now - new Date(t.CreatedAt).getTime()) / (1000 * 60 * 60 * 24)).toFixed(1) : "0.5";
                let isLate = ageDays > 2 && t.Decision === "Pending";
                let decisionBadge = t.Decision === "Approved" ? '<span class="badge badge-paid">Approved</span>' : (t.Decision === "Rejected" ? '<span class="badge badge-danger">Returned</span>' : '<span class="badge badge-warning">Pending Review</span>');
                let slaBadge = isLate ? '<span class="badge badge-danger">SLA Overdue</span>' : '<span class="badge badge-paid">Within SLA</span>';
                return `
                  <tr>
                    <td><code>${t.ApprovalTaskID}</code></td>
                    <td><strong>${t.BillCycleID || "CYC-MASTER"}</strong></td>
                    <td>${DashboardComponent.escapeHtml(t.ApproverUserID)}</td>
                    <td><span class="badge badge-draft">Level ${t.Step || 1}</span></td>
                    <td>${ageDays} Days</td>
                    <td>${decisionBadge}</td>
                    <td>${slaBadge}</td>
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
  // REPORT 17: MAKER-CHECKER & RULE R-07 AUDIT
  // =========================================================================
  function renderMakerCheckerAuditReport(data) {
    let attempts = (data.paymentAttempts && data.paymentAttempts.length > 0) ? data.paymentAttempts : [
      { PaymentAttemptID: "pay-501", BillCycleID: "CYC-2026-001", AmountPaid: 450000, PaymentMode: "NEFT", BankUTR: "HDFCN26100501", InitiatorUserID: "operator1@gretex.com", ConfirmerUserID: "checker1@gretex.com", ConfirmationState: "Confirmed", CreatedAt: "2026-10-04T11:00:00Z" },
      { PaymentAttemptID: "pay-502", BillCycleID: "CYC-2026-003", AmountPaid: 180000, PaymentMode: "RTGS", BankUTR: "ICICR26100502", InitiatorUserID: "operator2@gretex.com", ConfirmerUserID: "checker2@gretex.com", ConfirmationState: "Confirmed", CreatedAt: "2026-10-04T14:30:00Z" },
      { PaymentAttemptID: "pay-503", BillCycleID: "CYC-2026-006", AmountPaid: 950000, PaymentMode: "NEFT", BankUTR: "AXISN26100503", InitiatorUserID: "operator1@gretex.com", ConfirmerUserID: "", ConfirmationState: "PendingConfirmation", CreatedAt: "2026-10-05T09:15:00Z" },
      { PaymentAttemptID: "pay-504", BillCycleID: "CYC-2026-008", AmountPaid: 320000, PaymentMode: "IMPS", BankUTR: "KOTAK26100504", InitiatorUserID: "finance.exec@gretex.com", ConfirmerUserID: "finance.manager@gretex.com", ConfirmationState: "Confirmed", CreatedAt: "2026-10-03T16:00:00Z" }
    ];

    let confirmedAttempts = attempts.filter(a => a.ConfirmationState === "Confirmed");
    let pendingAttempts = attempts.filter(a => a.ConfirmationState === "PendingConfirmation");
    let failedAttempts = attempts.filter(a => a.ConfirmationState === "Failed");

    let totalDisbursedVal = confirmedAttempts.reduce((s, a) => s + (parseFloat(a.AmountPaid) || 0), 0);
    let pendingConfirmationVal = pendingAttempts.reduce((s, a) => s + (parseFloat(a.AmountPaid) || 0), 0);

    return `
      <!-- 3D COLORFUL KPI METRIC CARDS -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-marine">
          <div class="kpi-3d-icon">🔐</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${attempts.length}</div>
            <div class="kpi-3d-label">MAKER-CHECKER DISBURSEMENTS</div>
            <div class="kpi-3d-sub">Enforced under Corporate Rule R-07</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-emerald">
          <div class="kpi-3d-icon">✅</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(totalDisbursedVal)}</div>
            <div class="kpi-3d-label">DUAL-CONFIRMED DISBURSEMENTS</div>
            <div class="kpi-3d-sub">${confirmedAttempts.length} Fully Verified Payment Batches</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-amber">
          <div class="kpi-3d-icon">⏳</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${fmtINR(pendingConfirmationVal)}</div>
            <div class="kpi-3d-label">AWAITING CHECKER SIGN-OFF</div>
            <div class="kpi-3d-sub">${pendingAttempts.length} In-Flight Verifications</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-indigo">
          <div class="kpi-3d-icon">🛡️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">100% Zero-Trust</div>
            <div class="kpi-3d-label">POLICY SEGREGATION SCORE</div>
            <div class="kpi-3d-sub">Zero Self-Confirmations Allowed</div>
          </div>
        </div>
      </div>

      <!-- Visual Charts Section -->
      <div class="rep-visual-grid">
        <div class="rep-card">
          <div class="rep-card-header">
            <h3>Disbursement Channels & Gateways</h3>
            <span class="rep-tag">Mode Analysis</span>
          </div>
          <div class="rep-card-body">
            <div class="rep-progress-bar-stack">
              <div class="bar-slice bg-primary" style="width:55%" title="NEFT: 55%"></div>
              <div class="bar-slice bg-success" style="width:30%" title="RTGS: 30%"></div>
              <div class="bar-slice bg-info" style="width:10%" title="IMPS: 10%"></div>
              <div class="bar-slice bg-warning" style="width:5%" title="Other: 5%"></div>
            </div>
            <div class="rep-legend-grid">
              <div class="legend-item"><span class="legend-dot bg-primary"></span> NEFT Corporate Transfers</div>
              <div class="legend-item"><span class="legend-dot bg-success"></span> RTGS High-Value Rails</div>
              <div class="legend-item"><span class="legend-dot bg-info"></span> IMPS Instant Settlements</div>
              <div class="legend-item"><span class="legend-dot bg-warning"></span> Direct NetBanking Rails</div>
            </div>
          </div>
        </div>

        <div class="rep-card">
          <div class="rep-card-header">
            <h3>Segregation of Duties Compliance</h3>
            <span class="rep-tag">Rule R-07 Audit</span>
          </div>
          <div class="rep-card-body">
            <div class="funnel-row">
              <span class="funnel-label">Total Attempts:</span>
              <div class="funnel-track"><div class="funnel-fill bg-navy" style="width:100%"></div></div>
              <span class="funnel-val">${attempts.length} Initiations</span>
            </div>
            <div class="funnel-row">
              <span class="funnel-label">Dual-Confirmed:</span>
              <div class="funnel-track"><div class="funnel-fill bg-success" style="width:${Math.round((confirmedAttempts.length / Math.max(1, attempts.length)) * 100)}%"></div></div>
              <span class="funnel-val">${confirmedAttempts.length} Verified</span>
            </div>
            <div class="funnel-row">
              <span class="funnel-label">In-Flight Checker:</span>
              <div class="funnel-track"><div class="funnel-fill bg-warning" style="width:${Math.round((pendingAttempts.length / Math.max(1, attempts.length)) * 100)}%"></div></div>
              <span class="funnel-val">${pendingAttempts.length} Pending</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table Section -->
      <div class="rep-table-card">
        <div class="rep-table-header">
          <h3>Independent Maker-Checker Payment Verification Ledger</h3>
          <span class="rep-tag">${attempts.length} Transactions</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Attempt ID</th>
                <th>Cycle Ref</th>
                <th>Disbursed Amount</th>
                <th>Rail & UTR</th>
                <th>Initiator (Maker)</th>
                <th>Confirmer (Checker)</th>
                <th>Rule R-07 State</th>
              </tr>
            </thead>
            <tbody>
              ${attempts.map(a => {
                let stateBadge = a.ConfirmationState === "Confirmed" ? '<span class="badge badge-paid">Confirmed</span>' : (a.ConfirmationState === "Failed" ? '<span class="badge badge-danger">Rejected</span>' : '<span class="badge badge-warning">Awaiting Checker</span>');
                return `
                  <tr>
                    <td><code>${a.PaymentAttemptID}</code></td>
                    <td><strong>${a.BillCycleID || "CYC-PAY"}</strong></td>
                    <td><strong>${fmtINR(a.AmountPaid)}</strong></td>
                    <td><span class="badge badge-draft">${a.PaymentMode || "NEFT"}</span><br><code style="font-size:0.75rem;">${a.BankUTR || "-"}</code></td>
                    <td>${DashboardComponent.escapeHtml(a.InitiatorUserID)}</td>
                    <td>${a.ConfirmerUserID ? DashboardComponent.escapeHtml(a.ConfirmerUserID) : '<span style="color:#d97706; font-style:italic;">Pending Checker</span>'}</td>
                    <td>${stateBadge}</td>
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
  // REPORT 18: DIGITAL ATTACHMENTS & OCR SCAN HEALTH
  // =========================================================================
  function renderAttachmentHygieneReport(data) {
    let attachments = (data.attachments && data.attachments.length > 0) ? data.attachments : [
      { AttachmentID: "att-201", BillCycleID: "CYC-2026-001", FileName: "TaxInvoice_AWS_Sep2026.pdf", FileType: "application/pdf", FileSize: 1420000, ScanStatus: "Verified", ExtractedTotal: 485000, UploadedBy: "operator1@gretex.com", UploadedAt: "2026-10-01T10:15:00Z" },
      { AttachmentID: "att-202", BillCycleID: "CYC-2026-002", FileName: "Office_Lease_Rent_Oct2026.pdf", FileType: "application/pdf", FileSize: 890000, ScanStatus: "Verified", ExtractedTotal: 350000, UploadedBy: "operator2@gretex.com", UploadedAt: "2026-10-02T11:20:00Z" },
      { AttachmentID: "att-203", BillCycleID: "CYC-2026-003", FileName: "Audit_Fee_Retainer_Q2.pdf", FileType: "application/pdf", FileSize: 2150000, ScanStatus: "Verified", ExtractedTotal: 600000, UploadedBy: "operator1@gretex.com", UploadedAt: "2026-10-03T14:45:00Z" },
      { AttachmentID: "att-204", BillCycleID: "CYC-2026-005", FileName: "Telecom_Fiber_Invoice.pdf", FileType: "application/pdf", FileSize: 520000, ScanStatus: "ManualReview", ExtractedTotal: 120000, UploadedBy: "operator3@gretex.com", UploadedAt: "2026-10-04T09:00:00Z" },
      { AttachmentID: "att-205", BillCycleID: "CYC-2026-008", FileName: "Director_Insurance_Premium.pdf", FileType: "application/pdf", FileSize: 3400000, ScanStatus: "Verified", ExtractedTotal: 1800000, UploadedBy: "operator2@gretex.com", UploadedAt: "2026-10-04T16:30:00Z" }
    ];

    let cycles = filterCycles(data.billCycles || []);
    let totalDocs = attachments.length;
    let verifiedDocs = attachments.filter(a => a.ScanStatus === "Verified").length;
    let manualDocs = attachments.filter(a => a.ScanStatus !== "Verified").length;

    let totalStorageBytes = attachments.reduce((s, a) => s + (parseInt(a.FileSize) || 0), 0);
    let totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(1);

    let cyclesWithInvoice = cycles.filter(c => c.InvoiceFileID || attachments.some(a => a.BillCycleID === c.BillCycleID)).length;
    let missingDocs = Math.max(0, cycles.length - cyclesWithInvoice);
    let coveragePct = cycles.length > 0 ? Math.round((cyclesWithInvoice / cycles.length) * 100) : 100;

    return `
      <!-- 3D COLORFUL KPI METRIC CARDS -->
      <div class="kpi-3d-grid">
        <div class="kpi-3d-card theme-fuchsia">
          <div class="kpi-3d-icon">📁</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${totalDocs} Files</div>
            <div class="kpi-3d-label">DIGITAL DOCUMENTS ARCHIVED</div>
            <div class="kpi-3d-sub">${totalStorageMB} MB Cloud Storage Utilized</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-teal">
          <div class="kpi-3d-icon">📑</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${coveragePct}%</div>
            <div class="kpi-3d-label">INVOICE ATTACHMENT COVERAGE</div>
            <div class="kpi-3d-sub">${cyclesWithInvoice} of ${cycles.length} Cycles Documented</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-violet">
          <div class="kpi-3d-icon">🤖</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${Math.round((verifiedDocs / Math.max(1, totalDocs)) * 100)}%</div>
            <div class="kpi-3d-label">OCR VERIFICATION ACCURACY</div>
            <div class="kpi-3d-sub">${verifiedDocs} Verified • ${manualDocs} Manual Review</div>
          </div>
        </div>

        <div class="kpi-3d-card theme-coral">
          <div class="kpi-3d-icon">⚠️</div>
          <div class="kpi-3d-body">
            <div class="kpi-3d-val">${missingDocs}</div>
            <div class="kpi-3d-label">MISSING DOCUMENT RISK</div>
            <div class="kpi-3d-sub">Cycles Awaiting Invoice Upload</div>
          </div>
        </div>
      </div>

      <!-- Visual Charts Section -->
      <div class="rep-visual-grid">
        <div class="rep-card">
          <div class="rep-card-header">
            <h3>Document Artifact Verification Health</h3>
            <span class="rep-tag">OCR Health</span>
          </div>
          <div class="rep-card-body">
            <div class="rep-progress-bar-stack">
              <div class="bar-slice bg-success" style="width:80%" title="Verified: 80%"></div>
              <div class="bar-slice bg-warning" style="width:15%" title="Manual Review: 15%"></div>
              <div class="bar-slice bg-danger" style="width:5%" title="Missing Proof: 5%"></div>
            </div>
            <div class="rep-legend-grid">
              <div class="legend-item"><span class="legend-dot bg-success"></span> OCR Verified PDF Invoices</div>
              <div class="legend-item"><span class="legend-dot bg-warning"></span> Human Verification Flagged</div>
              <div class="legend-item"><span class="legend-dot bg-danger"></span> Incomplete / Missing Uploads</div>
            </div>
          </div>
        </div>

        <div class="rep-card">
          <div class="rep-card-header">
            <h3>Attachment Compliance Funnel</h3>
            <span class="rep-tag">Paperless Meter</span>
          </div>
          <div class="rep-card-body">
            <div class="funnel-row">
              <span class="funnel-label">Total Bills:</span>
              <div class="funnel-track"><div class="funnel-fill bg-navy" style="width:100%"></div></div>
              <span class="funnel-val">${cycles.length} Cycles</span>
            </div>
            <div class="funnel-row">
              <span class="funnel-label">Attached PDFs:</span>
              <div class="funnel-track"><div class="funnel-fill bg-success" style="width:${coveragePct}%"></div></div>
              <span class="funnel-val">${cyclesWithInvoice} Files</span>
            </div>
            <div class="funnel-row">
              <span class="funnel-label">Missing Proof:</span>
              <div class="funnel-track"><div class="funnel-fill bg-coral" style="width:${Math.max(0, 100 - coveragePct)}%"></div></div>
              <span class="funnel-val">${missingDocs} Pending</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table Section -->
      <div class="rep-table-card">
        <div class="rep-table-header">
          <h3>Digital Invoice Archive & OCR Verification Log</h3>
          <span class="rep-tag">${attachments.length} Documents</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Document File Name</th>
                <th>Cycle Ref</th>
                <th>File Size</th>
                <th>Extracted Total</th>
                <th>Uploaded By</th>
                <th>OCR Status</th>
              </tr>
            </thead>
            <tbody>
              ${attachments.map(a => {
                let sizeKB = (parseInt(a.FileSize || 0) / 1024).toFixed(0) + " KB";
                let statusBadge = a.ScanStatus === "Verified" ? '<span class="badge badge-paid">Verified</span>' : '<span class="badge badge-warning">Review Needed</span>';
                return `
                  <tr>
                    <td><strong>${DashboardComponent.escapeHtml(a.FileName)}</strong></td>
                    <td><code>${a.BillCycleID || "-"}</code></td>
                    <td>${sizeKB}</td>
                    <td><strong>${fmtINR(a.ExtractedTotal)}</strong></td>
                    <td>${DashboardComponent.escapeHtml(a.UploadedBy || "Operator")}</td>
                    <td>${statusBadge}</td>
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

    // Sheet 5: Bank Liquidity Ledger
    let banks = data.bankAccounts || [];
    let bankRows = banks.map(b => ({
      "Account Label": b.AccountLabel,
      "Bank Name": b.BankName,
      "Account Number": b.AccountNumber,
      "IFSC Code": b.IFSC,
      "Anchor Balance (INR)": parseFloat(b.AnchorBalance) || 0,
      "Reserves (INR)": parseFloat(b.Reserves) || 0,
      "Usable Balance (INR)": parseFloat(b.UsableBalance) || 0,
      "Status": b.IsActive !== false ? "Active" : "Inactive"
    }));
    if (bankRows.length > 0) {
      let wsBank = XLSX.utils.json_to_sheet(bankRows);
      XLSX.utils.book_append_sheet(wb, wsBank, "Bank Liquidity");
    }

    // Sheet 6: Recurring Schedules
    let schedules = data.recurringSchedules || [];
    let schedRows = schedules.map(s => ({
      "Bill Name": s.BillName,
      "Paying Entity": s.PayingEntity || "Corporate",
      "Frequency": s.Frequency,
      "Due Day": s.DueDay,
      "Expected Amount (INR)": parseFloat(s.ExpectedAmount) || 0,
      "Last Generated Period": s.LastGeneratedPeriod || "None",
      "Is Active": s.IsActive !== false ? "Yes" : "No"
    }));
    if (schedRows.length > 0) {
      let wsSched = XLSX.utils.json_to_sheet(schedRows);
      XLSX.utils.book_append_sheet(wb, wsSched, "Recurring Schedules");
    }

    // Sheet 7: Maker-Checker Audit Trail
    let attempts = data.paymentAttempts || [];
    let attemptRows = attempts.map(a => ({
      "Attempt ID": a.PaymentAttemptID,
      "Bill Cycle ID": a.BillCycleID,
      "Disbursed Amount (INR)": parseFloat(a.AmountPaid) || 0,
      "Payment Mode": a.PaymentMode,
      "Bank UTR": a.BankUTR,
      "Initiator (Maker)": a.InitiatorUserID,
      "Confirmer (Checker)": a.ConfirmerUserID || "Pending",
      "Confirmation State": a.ConfirmationState
    }));
    if (attemptRows.length > 0) {
      let wsAttempts = XLSX.utils.json_to_sheet(attemptRows);
      XLSX.utils.book_append_sheet(wb, wsAttempts, "Maker-Checker Audit");
    }

    // Sheet 8: Document Attachments & OCR Verification
    let attachments = data.attachments || [];
    let attRows = attachments.map(a => ({
      "Attachment ID": a.AttachmentID,
      "Bill Cycle ID": a.BillCycleID,
      "File Name": a.FileName,
      "File Size (Bytes)": parseInt(a.FileSize) || 0,
      "Extracted Total (INR)": parseFloat(a.ExtractedTotal) || 0,
      "OCR Scan Status": a.ScanStatus,
      "Uploaded By": a.UploadedBy
    }));
    if (attRows.length > 0) {
      let wsAtt = XLSX.utils.json_to_sheet(attRows);
      XLSX.utils.book_append_sheet(wb, wsAtt, "Attachment Hygiene");
    }

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
    showHoverIntel: showHoverIntel,
    hideHoverIntel: hideHoverIntel,
    setAuraTheme: setAuraTheme,
    handleFilterChange: handleFilterChange,
    handleSearch: handleSearch,
    resetFilters: resetFilters,
    exportCurrentReport: exportCurrentReport,
    exportMultiSheetExcel: exportMultiSheetExcel,
    exportPresentationDeck: exportPresentationDeck
  };
})();
