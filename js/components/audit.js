/**
 * BillDesk Audit Trail & Global Search Component
 * FR-028 (Audit events), FR-029 (Search across bills/vendors), Rule R-14 (Retention).
 */

const AuditComponent = (function () {
  let cachedLogs = [];

  async function render(container) {
    cachedLogs = await BillDeskAPI.getAuditLogs();

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Audit Trail & Search</h1>
          <p>Immutable record of system events, logins, approvals, payment attempts, and user actions.</p>
        </div>
        <div class="view-actions">
          <button class="btn btn-secondary" onclick="App.refreshCurrentView()">
            Refresh Logs
          </button>
        </div>
      </div>

      <div class="table-card">
        <div class="table-toolbar">
          <div class="search-box">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="audit-search" class="search-input" placeholder="Search actor, action, record ID, reason..." oninput="AuditComponent.filterLogs()">
          </div>
          <span class="badge badge-pending">${cachedLogs.length} Logged Events</span>
        </div>
        <div class="table-responsive">
          <table class="data-table" id="audit-table">
            <thead>
              <tr>
                <th>Timestamp (IST)</th>
                <th>Actor Email</th>
                <th>Action</th>
                <th>Record Type</th>
                <th>Record ID</th>
                <th>Reason / Evidence</th>
              </tr>
            </thead>
            <tbody>
              ${cachedLogs.length === 0 ? `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--slate-400);">No audit log events recorded yet.</td></tr>` : ""}
              ${cachedLogs.map(l => {
                let recId = String(l && l.RecordID !== undefined && l.RecordID !== null ? l.RecordID : "");
                let shortId = recId ? (recId.length > 16 ? recId.slice(0, 16) + "..." : recId) : "-";
                let email = String((l && l.ActorEmail) || "System");
                let action = String((l && l.Action) || "");
                let recType = String((l && l.RecordType) || "-");
                let reason = String((l && l.Reason) || (typeof (l && l.NewValue) === 'object' ? JSON.stringify(l.NewValue) : ((l && l.NewValue) || "-")));
                let searchTxt = (email + ' ' + action + ' ' + recType + ' ' + reason + ' ' + recId).toLowerCase();
                let timeStr = "-";
                if (l && l.Timestamp) {
                  try {
                    let d = new Date(l.Timestamp);
                    timeStr = isNaN(d.getTime()) ? String(l.Timestamp) : d.toLocaleString("en-IN");
                  } catch(e) {
                    timeStr = String(l.Timestamp);
                  }
                }
                return `
                <tr data-search="${DashboardComponent.escapeHtml(searchTxt)}">
                  <td style="font-size:0.75rem; white-space:nowrap; color:var(--slate-500);">
                    ${DashboardComponent.escapeHtml(timeStr)}
                  </td>
                  <td><strong>${DashboardComponent.escapeHtml(email)}</strong></td>
                  <td><span class="badge badge-draft">${DashboardComponent.escapeHtml(action)}</span></td>
                  <td>${DashboardComponent.escapeHtml(recType)}</td>
                  <td style="font-size:0.75rem; color:var(--slate-500);"><code>${DashboardComponent.escapeHtml(shortId)}</code></td>
                  <td>${DashboardComponent.escapeHtml(reason)}</td>
                </tr>
              `;}).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function filterLogs() {
    let query = (document.getElementById("audit-search")?.value || "").toLowerCase();
    let rows = document.querySelectorAll("#audit-table tbody tr[data-search]");
    rows.forEach(r => {
      let text = r.getAttribute("data-search");
      r.style.display = (!query || text.includes(query)) ? "" : "none";
    });
  }

  return {
    render: render,
    filterLogs: filterLogs
  };
})();
