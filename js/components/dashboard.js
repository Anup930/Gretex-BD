/**
 * BillDesk Dashboard Component
 * Displays actionable KPI cards, pending tasks, overdue alerts, and financial overview.
 */

const DashboardComponent = (function () {
  async function render(container) {
    let data = (typeof BillDeskDataStore !== "undefined" && BillDeskDataStore.isLoaded) ? BillDeskDataStore.getData() : await BillDeskAPI.getInitialData();
    let cycles = data.billCycles || [];
    let user = BillDeskAuth.getCurrentUser();

    // Compute Metrics
    let myTasksCount = cycles.filter(c => c.Status === "Incomplete" || c.Status === "ReadyForSubmission").length;
    let pendingApprovalCount = cycles.filter(c => c.Status === "PendingApproval").length;
    let approvedPaymentCount = cycles.filter(c => c.Status === "Approved" || c.Status === "PartiallyPaid").length;
    let paymentPendingConfirmCount = (data.paymentAttempts || []).filter(a => a.ConfirmationState === "PendingConfirmation").length;

    let todayStr = new Date().toISOString().slice(0, 10);
    let overdueCount = cycles.filter(c => c.DueDate && c.DueDate < todayStr && c.Status !== "Paid" && c.Status !== "Rejected").length;

    let totalApprovedOutstanding = cycles
      .filter(c => c.Status === "Approved" || c.Status === "PartiallyPaid")
      .reduce((sum, c) => sum + (parseFloat(c.NetPayable) || 0), 0);

    let totalBankUsable = (data.bankAccounts || [])
      .filter(b => b.IsActive)
      .reduce((sum, b) => sum + (parseFloat(b.UsableBalance) || 0), 0);

    let shortfall = Math.max(0, totalApprovedOutstanding - totalBankUsable);

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Welcome, ${user ? user.displayName : "User"}</h1>
          <p>Operational control center for recurring obligations and cash planning.</p>
        </div>
        <div class="view-actions">
          <button class="btn btn-secondary" onclick="App.refreshCurrentView()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
          ${BillDeskAuth.hasCapability("CanEnterBills") ? `
            <button class="btn btn-primary" onclick="App.navigateTo('recurring')">
              + Manage Recurring Schedules
            </button>
          ` : ""}
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-grid">
        <div class="kpi-card highlight" onclick="App.navigateTo('operator')" style="cursor:pointer;">
          <div class="kpi-title">
            <span>Operator Incomplete Tasks</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <div class="kpi-value">${myTasksCount}</div>
          <div class="kpi-subtext">Awaiting amount / invoice upload</div>
        </div>

        <div class="kpi-card warning" onclick="App.navigateTo('approval')" style="cursor:pointer;">
          <div class="kpi-title">
            <span>Pending Approvals</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
          </div>
          <div class="kpi-value">${pendingApprovalCount}</div>
          <div class="kpi-subtext">Bills awaiting reviewer sign-off</div>
        </div>

        <div class="kpi-card success" onclick="App.navigateTo('payment')" style="cursor:pointer;">
          <div class="kpi-title">
            <span>Approved for Payment</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <div class="kpi-value">${approvedPaymentCount}</div>
          <div class="kpi-subtext">₹${totalApprovedOutstanding.toLocaleString("en-IN")} net payable</div>
        </div>

        <div class="kpi-card ${shortfall > 0 ? 'danger' : 'success'}" onclick="App.navigateTo('fund_report')" style="cursor:pointer;">
          <div class="kpi-title">
            <span>${shortfall > 0 ? "Cash Shortfall Alert" : "Funding Status"}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div class="kpi-value">₹${shortfall > 0 ? shortfall.toLocaleString("en-IN") : "0"}</div>
          <div class="kpi-subtext">${shortfall > 0 ? "Bank usable funds below approved due" : "Sufficient usable bank funds"}</div>
        </div>
      </div>

      <!-- Actionable Urgent Work Queue -->
      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight: 700; color: var(--navy-900); display: flex; align-items: center; gap: 0.5rem;">
            <span>Current Active Bills & Action Queue</span>
            <span class="badge badge-pending">${cycles.length} Total Records</span>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Bill / Vendor</th>
                <th>Company</th>
                <th>Period</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${cycles.length === 0 ? `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--slate-400);">No active bill cycles found. Click "Manage Recurring Schedules" to generate cycles.</td></tr>` : ""}
              ${cycles.map(c => `
                <tr>
                  <td>
                    <strong>${escapeHtml(c.BillName || "Unnamed")}</strong>
                    <div style="font-size:0.75rem; color:var(--slate-500);">${escapeHtml(c.VendorName || "")}</div>
                  </td>
                  <td>${escapeHtml(c.CompanyName || "-")}</td>
                  <td><span class="badge badge-draft">${escapeHtml(c.PeriodKey || "")}</span></td>
                  <td>${c.DueDate || "-"}</td>
                  <td><strong>₹${(parseFloat(c.NetPayable) || parseFloat(c.ActualAmount) || parseFloat(c.ExpectedAmount) || 0).toLocaleString("en-IN")}</strong></td>
                  <td>${renderStatusBadge(c.Status)}</td>
                  <td>
                    ${getActionBtnForStatus(c)}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function getActionBtnForStatus(cycle) {
    if (cycle.Status === "Incomplete" || cycle.Status === "ReadyForSubmission" || cycle.Status === "Returned") {
      return `<button class="btn btn-sm btn-primary" onclick="OperatorComponent.openBillModal('${cycle.BillCycleID}')">Edit & Upload</button>`;
    }
    if (cycle.Status === "PendingApproval") {
      return `<button class="btn btn-sm btn-warning" onclick="App.navigateTo('approval')">Review</button>`;
    }
    if (cycle.Status === "Approved" || cycle.Status === "PartiallyPaid") {
      return `<button class="btn btn-sm btn-success" onclick="PaymentComponent.openPayModal('${cycle.BillCycleID}')">Initiate Pay</button>`;
    }
    if (cycle.Status === "PaymentInProgress") {
      return `<button class="btn btn-sm btn-secondary" onclick="App.navigateTo('payment')">Awaiting Confirmation</button>`;
    }
    return `<span style="font-size:0.8rem; color:var(--slate-400);">Completed</span>`;
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  function renderStatusBadge(status) {
    let s = (status || "Draft").toLowerCase();
    if (s === "incomplete") return `<span class="badge badge-incomplete">Incomplete</span>`;
    if (s === "readyforsubmission") return `<span class="badge badge-pending">Ready</span>`;
    if (s === "pendingapproval") return `<span class="badge badge-pending">Pending Approval</span>`;
    if (s === "returned") return `<span class="badge badge-returned">Returned</span>`;
    if (s === "approved") return `<span class="badge badge-approved">Approved</span>`;
    if (s === "paymentinprogress") return `<span class="badge badge-pending">Pay In-Progress</span>`;
    if (s === "partiallypaid") return `<span class="badge badge-partial">Partially Paid</span>`;
    if (s === "paid") return `<span class="badge badge-paid">Paid</span>`;
    if (s === "rejected") return `<span class="badge badge-rejected">Rejected</span>`;
    return `<span class="badge badge-draft">${escapeHtml(status)}</span>`;
  }

  return {
    render: render,
    renderStatusBadge: renderStatusBadge,
    escapeHtml: escapeHtml
  };
})();
