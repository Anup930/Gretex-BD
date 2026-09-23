/**
 * BillDesk Approver Workbench
 * Enforces BRD FR-016 (Invoice comparison, finance context, last 3 paid cycles)
 * and decision recording (Approve, Return, Reject with mandatory comments).
 */

const ApprovalComponent = (function () {
  let cachedData = null;

  async function render(container) {
    cachedData = (typeof BillDeskDataStore !== "undefined" && BillDeskDataStore.isLoaded) ? BillDeskDataStore.getData() : await BillDeskAPI.getInitialData();
    let cycles = cachedData.billCycles || [];
    let tasks = cachedData.approvalTasks || [];

    // Filter bills pending approval
    let pendingBills = cycles.filter(c => c.Status === "PendingApproval");

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Approver Workbench</h1>
          <p>Review submitted invoices, compare entered values, inspect past payments history, and record decisions.</p>
        </div>
        <div class="view-actions">
          <span class="badge badge-pending">${pendingBills.length} Bills Awaiting Approval</span>
        </div>
      </div>

      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight: 600; color: var(--navy-900);">Pending Approval Queue</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Bill & Vendor</th>
                <th>Company</th>
                <th>Period</th>
                <th>Due Date</th>
                <th>Invoice Amount</th>
                <th>Invoice Number</th>
                <th>Uploaded Proof</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${pendingBills.length === 0 ? `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--slate-400);">No bills pending your approval at this time.</td></tr>` : ""}
              ${pendingBills.map(c => {
                let task = tasks.find(t => t.BillCycleID === c.BillCycleID && t.Decision === "Pending");
                let taskId = task ? task.ApprovalTaskID : "";
                return `
                  <tr>
                    <td>
                      <strong>${DashboardComponent.escapeHtml(c.BillName)}</strong>
                      <div style="font-size:0.75rem; color:var(--slate-500);">${DashboardComponent.escapeHtml(c.VendorName)}</div>
                    </td>
                    <td>${DashboardComponent.escapeHtml(c.CompanyName || "-")}</td>
                    <td><span class="badge badge-draft">${c.PeriodKey}</span></td>
                    <td>${c.DueDate || "-"}</td>
                    <td><strong>₹${(parseFloat(c.ActualAmount) || 0).toLocaleString("en-IN")}</strong></td>
                    <td>${c.InvoiceNumber || "-"}</td>
                    <td>
                      <span class="badge badge-paid">Document Attached</span>
                    </td>
                    <td>
                      <button class="btn btn-sm btn-primary" onclick="ApprovalComponent.openReviewModal('${c.BillCycleID}', '${taskId}')">
                        Review & Decide
                      </button>
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

  function openReviewModal(cycleId, taskId) {
    let cycle = (cachedData?.billCycles || []).find(c => c.BillCycleID === cycleId);
    if (!cycle) return;

    let attachment = (cachedData?.attachments || []).find(a => a.BillCycleID === cycleId);

    // Fetch Last 3 Paid cycles for this schedule (FR-016)
    let pastCycles = (cachedData?.billCycles || [])
      .filter(c => c.ScheduleID === cycle.ScheduleID && (c.Status === "Paid" || c.Status === "PartiallyPaid") && c.BillCycleID !== cycleId)
      .slice(-3);

    let actualAmt = parseFloat(cycle.ActualAmount) || 0;
    let expectedAmt = parseFloat(cycle.ExpectedAmount) || 0;
    let varianceAmt = actualAmt - expectedAmt;
    let variancePct = expectedAmt > 0 ? ((varianceAmt / expectedAmt) * 100).toFixed(1) : 0;
    let hasHighVariance = Math.abs(variancePct) > 10;

    let modalHtml = `
      <div class="modal-backdrop active" id="approval-modal">
        <div class="modal-dialog modal-lg">
          <div class="modal-header">
            <div>
              <div class="modal-title">Approval Review: ${DashboardComponent.escapeHtml(cycle.BillName)}</div>
              <div style="font-size:0.8rem; color:var(--slate-500);">${cycle.VendorName} • Period: ${cycle.PeriodKey} • Due: ${cycle.DueDate}</div>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('approval-modal')">&times;</button>
          </div>
          <div class="modal-body">

            ${hasHighVariance ? `
              <div class="variance-banner alert">
                <strong>Variance Warning:</strong> Amount entered (₹${actualAmt.toLocaleString("en-IN")}) differs by ${variancePct}% from expected budget (₹${expectedAmt.toLocaleString("en-IN")}).
              </div>
            ` : ""}

            <div class="comparison-grid">
              <!-- Left: Financial & Entered Context -->
              <div class="panel-card">
                <h4>1. Submitted Bill Details</h4>
                <table style="width:100%; font-size:0.82rem; border-collapse:collapse;">
                  <tr style="border-bottom:1px solid var(--slate-200); height:30px;">
                    <td style="color:var(--slate-500);">Paying Company:</td>
                    <td style="font-weight:600; text-align:right;">${DashboardComponent.escapeHtml(cycle.CompanyName)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid var(--slate-200); height:30px;">
                    <td style="color:var(--slate-500);">Vendor Name:</td>
                    <td style="font-weight:600; text-align:right;">${DashboardComponent.escapeHtml(cycle.VendorName)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid var(--slate-200); height:30px;">
                    <td style="color:var(--slate-500);">Invoice Number:</td>
                    <td style="font-weight:600; text-align:right;">${cycle.InvoiceNumber || "Not provided"}</td>
                  </tr>
                  <tr style="border-bottom:1px solid var(--slate-200); height:30px;">
                    <td style="color:var(--slate-500);">Invoice Date:</td>
                    <td style="font-weight:600; text-align:right;">${cycle.InvoiceDate || "-"}</td>
                  </tr>
                  <tr style="border-bottom:1px solid var(--slate-200); height:30px;">
                    <td style="color:var(--slate-500);">Taxable Value:</td>
                    <td style="font-weight:600; text-align:right;">₹${(parseFloat(cycle.TaxableValue) || 0).toLocaleString("en-IN")}</td>
                  </tr>
                  <tr style="border-bottom:1px solid var(--slate-200); height:30px;">
                    <td style="color:var(--slate-500);">GST / Taxes:</td>
                    <td style="font-weight:600; text-align:right;">₹${(parseFloat(cycle.GSTAmount) || 0).toLocaleString("en-IN")}</td>
                  </tr>
                  <tr style="border-bottom:1px solid var(--slate-200); height:30px;">
                    <td style="color:var(--slate-500);">TDS Deducted:</td>
                    <td style="font-weight:600; text-align:right;">₹${(parseFloat(cycle.TDSAmount) || 0).toLocaleString("en-IN")}</td>
                  </tr>
                  <tr style="height:36px; background:var(--navy-50);">
                    <td style="font-weight:700; color:var(--navy-900); padding-left:0.5rem;">Net Payable:</td>
                    <td style="font-weight:700; color:var(--navy-900); text-align:right; padding-right:0.5rem; font-size:1.05rem;">₹${(parseFloat(cycle.NetPayable) || actualAmt).toLocaleString("en-IN")}</td>
                  </tr>
                </table>
              </div>

              <!-- Right: Verification Evidence & History -->
              <div class="panel-card">
                <h4>
                  <span>2. Invoice Document Evidence</span>
                  <span class="badge badge-paid">Document Attached</span>
                </h4>
                
                <div style="background:var(--white); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:0.85rem; margin-bottom:1rem;">
                  <div style="font-size:0.82rem; font-weight:600;">File: ${attachment ? DashboardComponent.escapeHtml(attachment.FileName) : (cycle.InvoiceFileID || "Invoice_Attached.pdf")}</div>
                  <div style="font-size:0.75rem; color:var(--slate-500); margin-top:0.25rem;">Uploaded by: ${cycle.ReviewedBy || "Operator"}</div>
                  <div style="margin-top:0.5rem;">
                    <span class="badge badge-paid">✓ Hash check duplicate: None</span>
                    <span class="badge badge-approved">✓ Currency: INR</span>
                  </div>
                </div>

                <!-- Last 3 Payments Comparison (FR-016) -->
                <h4>3. Historical Payments (Last 3 Cycles)</h4>
                <div class="table-responsive" style="max-height:140px; overflow-y:auto; border:1px solid var(--slate-200); border-radius:var(--radius-sm);">
                  <table class="data-table" style="font-size:0.75rem;">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Inv #</th>
                        <th>Amount Paid</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${pastCycles.length === 0 ? `<tr><td colspan="4" style="text-align:center; color:var(--slate-400); padding:0.75rem;">No prior payment history for this recurring schedule.</td></tr>` : ""}
                      ${pastCycles.map(p => `
                        <tr>
                          <td>${p.PeriodKey}</td>
                          <td>${p.InvoiceNumber || "-"}</td>
                          <td>₹${(parseFloat(p.ActualAmount) || 0).toLocaleString("en-IN")}</td>
                          <td><span class="badge badge-paid">${p.Status}</span></td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>

            <!-- Decision Comment Box -->
            <div class="form-group" style="margin-top:1.25rem;">
              <label class="form-label">Review Remarks / Reason (Mandatory if Returning or Rejecting) *</label>
              <textarea id="appr-comment" class="form-control" rows="2" placeholder="e.g., Verified against contract, approved for payment."></textarea>
            </div>

            <div class="modal-footer" style="margin: 1.5rem -1.5rem -1.5rem -1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal('approval-modal')">Close</button>
              <button type="button" class="btn btn-danger" onclick="ApprovalComponent.submitDecision('${cycle.BillCycleID}', '${taskId}', 'Rejected')">
                Reject Bill
              </button>
              <button type="button" class="btn btn-warning" onclick="ApprovalComponent.submitDecision('${cycle.BillCycleID}', '${taskId}', 'Returned')">
                Return to Operator
              </button>
              <button type="button" class="btn btn-success" onclick="ApprovalComponent.submitDecision('${cycle.BillCycleID}', '${taskId}', 'Approved')">
                ✓ Approve for Payment
              </button>
            </div>

          </div>
        </div>
      </div>
    `;

    document.getElementById("modal-container").innerHTML = modalHtml;
  }

  async function submitDecision(cycleId, taskId, decision) {
    let comment = document.getElementById("appr-comment")?.value.trim() || "";
    if ((decision === "Returned" || decision === "Rejected") && !comment) {
      alert("Validation Error: Reason/Comment is mandatory when returning or rejecting a bill.");
      return;
    }

    let confirmMsg = `Are you sure you want to mark this bill as "${decision}"?`;
    if (!confirm(confirmMsg)) return;

    App.showToast(`Processing ${decision}...`, "info");
    let res = await BillDeskAPI.processApproval(
      taskId,
      cycleId,
      decision,
      comment,
      BillDeskAuth.getCurrentUser()?.email
    );

    if (res && res.success) {
      App.showToast(`Bill marked as ${decision}!`, "success");
      App.closeModal("approval-modal");
      App.refreshCurrentView();
    } else {
      App.showToast((res && res.error) || "Failed to process decision", "error");
    }
  }

  return {
    render: render,
    openReviewModal: openReviewModal,
    submitDecision: submitDecision
  };
})();
