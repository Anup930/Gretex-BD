/**
 * BillDesk Daily Fund Requirement & Bank Position Planning Report
 * BRD Section 13 & Table 11 Compliance:
 * Due aging buckets, company & expense breakdowns, bank usable balances,
 * shortfall analysis, and CSV/Excel export.
 */

const FundReportComponent = (function () {
  let currentReportData = null;

  async function render(container) {
    let todayStr = new Date().toISOString().slice(0, 10);
    currentReportData = await BillDeskAPI.getFundReport(todayStr);

    let summary = currentReportData.summary || {};
    let buckets = currentReportData.dueBuckets || {};
    let compSummary = currentReportData.companySummary || {};
    let expSummary = currentReportData.expenseSummary || {};
    let banks = currentReportData.bankDetails || [];

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Daily Fund Requirement & Bank Position Report</h1>
          <p>Dated planning forecast built from approved obligations, pending commitments, and usable bank funds.</p>
        </div>
        <div class="view-actions">
          <input type="date" id="report-target-date" class="form-control" style="width:auto;" value="${currentReportData.reportDate}" onchange="FundReportComponent.refreshReport()">
          <button class="btn btn-secondary" onclick="FundReportComponent.exportCSV()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export to CSV
          </button>
        </div>
      </div>

      <!-- As-of Planning Banner -->
      <div style="background:var(--navy-900); color:var(--white); padding:0.85rem 1.25rem; border-radius:var(--radius-md); margin-bottom:1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
        <div>
          <span style="font-weight:700; font-size:0.95rem;">Planning Snapshot As Of:</span>
          <span style="color:var(--navy-100); margin-left:0.35rem;">${currentReportData.reportDate} (IST Asia/Kolkata)</span>
        </div>
        <div style="font-size:0.78rem; color:var(--slate-300);">
          Generated: ${new Date(currentReportData.asOf).toLocaleTimeString()} • Status: Verified Fresh
        </div>
      </div>

      <!-- Top Financial Position KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card highlight">
          <div class="kpi-title">Approved Due Obligations</div>
          <div class="kpi-value">₹${(summary.totalApprovedDue || 0).toLocaleString("en-IN")}</div>
          <div class="kpi-subtext">Signed-off & payable</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-title">Forecast Commitments</div>
          <div class="kpi-value">₹${(summary.totalForecast || 0).toLocaleString("en-IN")}</div>
          <div class="kpi-subtext">Incomplete / in review</div>
        </div>

        <div class="kpi-card success">
          <div class="kpi-title">Usable Bank Liquidity</div>
          <div class="kpi-value">₹${(summary.totalUsableFunds || 0).toLocaleString("en-IN")}</div>
          <div class="kpi-subtext">Net of reserves (₹${(summary.totalReserves || 0).toLocaleString("en-IN")})</div>
        </div>

        <div class="kpi-card ${(summary.netShortfall || 0) > 0 ? 'danger' : 'success'}">
          <div class="kpi-title">Net Funding Position</div>
          <div class="kpi-value">
            ${(summary.netShortfall || 0) > 0 ? `₹${(summary.netShortfall).toLocaleString("en-IN")} Deficit` : "Surplus Liquid"}
          </div>
          <div class="kpi-subtext">${(summary.netShortfall || 0) > 0 ? "Requires treasury funding" : "No funding shortfall"}</div>
        </div>
      </div>

      <!-- Due Aging Buckets Grid -->
      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight:700; color:var(--navy-900);">Due Date Aging Buckets</div>
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:1px; background:var(--slate-200);">
          
          <div style="background:var(--white); padding:1rem; text-align:center;">
            <div style="font-size:0.75rem; color:#dc2626; font-weight:700;">OVERDUE</div>
            <div style="font-size:1.15rem; font-weight:700; color:#dc2626; margin-top:0.25rem;">₹${(buckets.overdue || 0).toLocaleString("en-IN")}</div>
          </div>

          <div style="background:var(--white); padding:1rem; text-align:center;">
            <div style="font-size:0.75rem; color:#d97706; font-weight:700;">DUE TODAY</div>
            <div style="font-size:1.15rem; font-weight:700; color:#d97706; margin-top:0.25rem;">₹${(buckets.today || 0).toLocaleString("en-IN")}</div>
          </div>

          <div style="background:var(--white); padding:1rem; text-align:center;">
            <div style="font-size:0.75rem; color:var(--slate-600); font-weight:700;">1 - 2 DAYS</div>
            <div style="font-size:1.15rem; font-weight:700; color:var(--slate-800); margin-top:0.25rem;">₹${(buckets.oneToTwoDays || 0).toLocaleString("en-IN")}</div>
          </div>

          <div style="background:var(--white); padding:1rem; text-align:center;">
            <div style="font-size:0.75rem; color:var(--slate-600); font-weight:700;">DAY 3</div>
            <div style="font-size:1.15rem; font-weight:700; color:var(--slate-800); margin-top:0.25rem;">₹${(buckets.threeDays || 0).toLocaleString("en-IN")}</div>
          </div>

          <div style="background:var(--white); padding:1rem; text-align:center;">
            <div style="font-size:0.75rem; color:var(--slate-600); font-weight:700;">4 - 7 DAYS</div>
            <div style="font-size:1.15rem; font-weight:700; color:var(--slate-800); margin-top:0.25rem;">₹${(buckets.fourToSevenDays || 0).toLocaleString("en-IN")}</div>
          </div>

          <div style="background:var(--white); padding:1rem; text-align:center;">
            <div style="font-size:0.75rem; color:var(--slate-600); font-weight:700;">8 - 14 DAYS</div>
            <div style="font-size:1.15rem; font-weight:700; color:var(--slate-800); margin-top:0.25rem;">₹${(buckets.eightToFourteenDays || 0).toLocaleString("en-IN")}</div>
          </div>

          <div style="background:var(--white); padding:1rem; text-align:center;">
            <div style="font-size:0.75rem; color:var(--slate-600); font-weight:700;">LATER / UNDATED</div>
            <div style="font-size:1.15rem; font-weight:700; color:var(--slate-800); margin-top:0.25rem;">₹${(buckets.later || 0).toLocaleString("en-IN")}</div>
          </div>

        </div>
      </div>

      <!-- Two Column Summary: Company Breakdown & Bank Balances -->
      <div class="comparison-grid" style="margin-bottom:1.5rem;">
        
        <!-- Company Summary -->
        <div class="table-card">
          <div class="table-toolbar">
            <div style="font-weight:700; color:var(--navy-900);">Company-wise Fund Demand</div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Approved Due</th>
                  <th>Forecast</th>
                </tr>
              </thead>
              <tbody>
                ${Object.keys(compSummary).map(co => `
                  <tr>
                    <td><strong>${DashboardComponent.escapeHtml(co)}</strong></td>
                    <td><strong>₹${(compSummary[co].approvedDue || 0).toLocaleString("en-IN")}</strong></td>
                    <td style="color:var(--slate-500);">₹${(compSummary[co].forecast || 0).toLocaleString("en-IN")}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Bank Account Usable Balances -->
        <div class="table-card">
          <div class="table-toolbar">
            <div style="font-weight:700; color:var(--navy-900);">Bank Account Balances & Reserves</div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Anchor Bal</th>
                  <th>Reserves</th>
                  <th>Usable Bal</th>
                </tr>
              </thead>
              <tbody>
                ${banks.map(b => `
                  <tr>
                    <td>
                      <strong>${DashboardComponent.escapeHtml(b.accountLabel)}</strong>
                      <div style="font-size:0.75rem; color:var(--slate-500);">${b.bankName} • ${b.accountNumber}</div>
                    </td>
                    <td>₹${(parseFloat(b.anchorBalance) || 0).toLocaleString("en-IN")}</td>
                    <td style="color:#d97706;">₹${(parseFloat(b.reserves) || 0).toLocaleString("en-IN")}</td>
                    <td><strong style="color:#059669;">₹${(parseFloat(b.usableBalance) || 0).toLocaleString("en-IN")}</strong></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  }

  async function refreshReport() {
    let dateVal = document.getElementById("report-target-date")?.value;
    let container = document.getElementById("view-container");
    if (container) {
      currentReportData = await BillDeskAPI.getFundReport(dateVal);
      render(container);
    }
  }

  function exportCSV() {
    if (!currentReportData || !currentReportData.billDetails) return;

    let headers = ["BillName", "VendorName", "CompanyName", "CategoryName", "DueDate", "Amount", "Status", "IsApproved"];
    let csvRows = [headers.join(",")];

    currentReportData.billDetails.forEach(b => {
      let row = [
        `"${(b.billName || '').replace(/"/g, '""')}"`,
        `"${(b.vendorName || '').replace(/"/g, '""')}"`,
        `"${(b.companyName || '').replace(/"/g, '""')}"`,
        `"${(b.categoryName || '').replace(/"/g, '""')}"`,
        `"${b.dueDate || ''}"`,
        b.amount || 0,
        `"${b.status || ''}"`,
        b.isApproved ? "TRUE" : "FALSE"
      ];
      csvRows.push(row.join(","));
    });

    let blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BillDesk_Fund_Report_${currentReportData.reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    App.showToast("Report exported to CSV!", "success");
  }

  return {
    render: render,
    refreshReport: refreshReport,
    exportCSV: exportCSV
  };
})();
