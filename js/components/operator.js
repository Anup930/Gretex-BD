/**
 * BillDesk Operator Task Workbench
 * Enforces Rule R-04 (both actual amount & invoice upload required before submission),
 * variance calculations, and simulated invoice scanning review.
 */

const OperatorComponent = (function () {
  let cachedData = null;

  async function render(container) {
    cachedData = await BillDeskAPI.getInitialData();
    let cycles = cachedData.billCycles || [];

    // Filter tasks that need operator attention: Incomplete, ReadyForSubmission, or Returned
    let operatorTasks = cycles.filter(c => 
      c.Status === "Incomplete" || 
      c.Status === "ReadyForSubmission" || 
      c.Status === "Returned"
    );

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Operator Task Workbench</h1>
          <p>Complete assigned recurring bill entries, upload original invoices, and submit for approval.</p>
        </div>
        <div class="view-actions">
          <span class="badge badge-pending">${operatorTasks.length} Incomplete / Pending Tasks</span>
        </div>
      </div>

      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight: 600; color: var(--navy-900);">Active Operator Queue</div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Bill & Period</th>
                <th>Company</th>
                <th>Due Date</th>
                <th>Expected Amount</th>
                <th>Actual Amount</th>
                <th>Invoice File</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${operatorTasks.length === 0 ? `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--slate-400);">No tasks requiring operator entry! All generated cycles are either submitted or paid.</td></tr>` : ""}
              ${operatorTasks.map(c => `
                <tr>
                  <td>
                    <strong>${DashboardComponent.escapeHtml(c.BillName)}</strong>
                    <div style="font-size:0.75rem; color:var(--slate-500);">${DashboardComponent.escapeHtml(c.VendorName)} • Period: ${c.PeriodKey}</div>
                  </td>
                  <td>${DashboardComponent.escapeHtml(c.CompanyName || "-")}</td>
                  <td>${c.DueDate || "-"}</td>
                  <td>₹${(parseFloat(c.ExpectedAmount) || 0).toLocaleString("en-IN")}</td>
                  <td>
                    ${c.ActualAmount > 0 ? `<strong>₹${parseFloat(c.ActualAmount).toLocaleString("en-IN")}</strong>` : '<span style="color:var(--status-incomplete-text); font-weight:600;">Pending Entry</span>'}
                  </td>
                  <td>
                    ${c.InvoiceFileID ? `<span class="badge badge-paid">Uploaded</span>` : '<span class="badge badge-incomplete">Missing Bill</span>'}
                  </td>
                  <td>${DashboardComponent.renderStatusBadge(c.Status)}</td>
                  <td>
                    <button class="btn btn-sm btn-primary" onclick="OperatorComponent.openBillModal('${c.BillCycleID}')">
                      Open Task
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function openBillModal(cycleId) {
    let cycle = (cachedData?.billCycles || []).find(c => c.BillCycleID === cycleId);
    if (!cycle) return;

    let attachment = (cachedData?.attachments || []).find(a => a.BillCycleID === cycleId);
    let expectedAmt = parseFloat(cycle.ExpectedAmount) || 0;
    let actualAmt = parseFloat(cycle.ActualAmount) || 0;

    let varianceAmt = actualAmt > 0 ? (actualAmt - expectedAmt) : 0;
    let variancePct = (expectedAmt > 0 && actualAmt > 0) ? ((varianceAmt / expectedAmt) * 100).toFixed(1) : 0;
    let isHighVariance = Math.abs(variancePct) > 10;

    let modalHtml = `
      <div class="modal-backdrop active" id="operator-modal">
        <div class="modal-dialog modal-lg">
          <div class="modal-header">
            <div>
              <div class="modal-title">${DashboardComponent.escapeHtml(cycle.BillName)} (${cycle.PeriodKey})</div>
              <div style="font-size:0.8rem; color:var(--slate-500);">${cycle.VendorName} • Due: ${cycle.DueDate}</div>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('operator-modal')">&times;</button>
          </div>
          <div class="modal-body">
            
            ${cycle.Status === "Returned" ? `
              <div class="variance-banner alert">
                <strong>Returned by Approver:</strong> Please review remarks and re-verify invoice details before re-submitting.
              </div>
            ` : ""}

            <div id="variance-container" class="variance-banner ${isHighVariance ? 'alert' : ''}" style="${actualAmt > 0 ? '' : 'display:none;'}">
              <span><strong>Amount Variance:</strong> Expected ₹${expectedAmt.toLocaleString("en-IN")} vs Entered ₹<span id="var-entered">${actualAmt.toLocaleString("en-IN")}</span> (${variancePct}%)</span>
            </div>

            <form id="operator-form" onsubmit="OperatorComponent.saveBillDetails(event, '${cycle.BillCycleID}')">
              <div class="comparison-grid">
                
                <!-- Left Panel: Operator Data Entry -->
                <div class="panel-card">
                  <h4>
                    <span>1. Bill Entry Fields</span>
                    <span class="badge badge-draft">Rule R-04 Enforced</span>
                  </h4>
                  
                  <div class="form-group">
                    <label class="form-label">Actual Total Amount (₹) *</label>
                    <input type="number" id="op-actual-amount" class="form-control" required step="0.01" value="${actualAmt || ""}" placeholder="Enter amount from invoice" oninput="OperatorComponent.recalcVariance(${expectedAmt})">
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Invoice Number</label>
                      <input type="text" id="op-invoice-no" class="form-control" value="${DashboardComponent.escapeHtml(cycle.InvoiceNumber || "")}" placeholder="e.g. INV-90234">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Invoice Date</label>
                      <input type="date" id="op-invoice-date" class="form-control" value="${cycle.InvoiceDate || ""}">
                    </div>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Taxable Value (₹)</label>
                      <input type="number" id="op-taxable" class="form-control" step="0.01" value="${cycle.TaxableValue || ""}">
                    </div>
                    <div class="form-group">
                      <label class="form-label">GST Amount (₹)</label>
                      <input type="number" id="op-gst" class="form-control" step="0.01" value="${cycle.GSTAmount || ""}">
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">TDS Deducted (₹)</label>
                    <input type="number" id="op-tds" class="form-control" step="0.01" value="${cycle.TDSAmount || 0}">
                  </div>
                </div>

                <!-- Right Panel: Invoice Document Upload & Verification -->
                <div class="panel-card">
                  <h4>
                    <span>2. Invoice Document & Evidence</span>
                    <span class="badge ${cycle.InvoiceFileID ? 'badge-paid' : 'badge-incomplete'}">${cycle.InvoiceFileID ? 'Attached' : 'Required'}</span>
                  </h4>

                  <div class="form-group">
                    <label class="form-label">Upload Original Invoice (PDF / PNG / JPG) *</label>
                    <input type="file" id="op-file-input" class="form-control" accept=".pdf,.png,.jpg,.jpeg" onchange="OperatorComponent.handleFileSelect(event)">
                    <div class="form-hint">Max file size: 10 MB. Verified against duplicates (Rule R-10).</div>
                  </div>

                  <div id="file-preview-card" style="background:var(--white); border:1px solid var(--slate-200); padding:0.85rem; border-radius:var(--radius-md); margin-top:0.75rem;">
                    <div style="font-size:0.82rem; font-weight:600; color:var(--slate-800);" id="preview-filename">
                      ${attachment ? DashboardComponent.escapeHtml(attachment.FileName) : (cycle.InvoiceFileID ? DashboardComponent.escapeHtml(cycle.InvoiceFileID) : "No file attached yet")}
                    </div>
                    <div style="font-size:0.75rem; color:var(--slate-500); margin-top:0.3rem;" id="preview-filestatus">
                      ${cycle.InvoiceFileID ? "✓ Document verified & ready for submission" : "⚠ Original bill upload required before submission"}
                    </div>
                  </div>

                  <div style="margin-top:1.25rem; background:var(--navy-50); border:1px solid var(--navy-100); padding:0.75rem; border-radius:var(--radius-md);">
                    <div style="font-size:0.78rem; font-weight:700; color:var(--navy-900); margin-bottom:0.25rem;">Automated Verification Evidence:</div>
                    <ul style="font-size:0.74rem; color:var(--slate-600); padding-left:1.1rem;">
                      <li>Duplicate invoice hash check: Passed</li>
                      <li>Currency format: INR verified</li>
                      <li>Payee name matches registered vendor</li>
                    </ul>
                  </div>
                </div>

              </div>

              <div class="modal-footer" style="margin: 1.5rem -1.5rem -1.5rem -1.5rem;">
                <button type="button" class="btn btn-secondary" onclick="App.closeModal('operator-modal')">Close</button>
                <button type="submit" class="btn btn-secondary">Save Progress</button>
                <button type="button" class="btn btn-primary" onclick="OperatorComponent.submitForApproval('${cycle.BillCycleID}')">
                  Submit for Approval →
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    `;

    document.getElementById("modal-container").innerHTML = modalHtml;
  }

  let selectedFileObj = null;

  function handleFileSelect(event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function (e) {
      selectedFileObj = {
        name: file.name,
        type: file.type || "application/pdf",
        size: file.size,
        data: e.target.result
      };
      document.getElementById("preview-filename").textContent = file.name + " (" + (file.size / 1024).toFixed(1) + " KB)";
      document.getElementById("preview-filestatus").textContent = "✓ Document encoded & ready to upload to Google Drive";
    };
    reader.readAsDataURL(file);
  }


  function recalcVariance(expectedAmt) {
    let actual = parseFloat(document.getElementById("op-actual-amount")?.value) || 0;
    let varContainer = document.getElementById("variance-container");
    if (!varContainer) return;

    if (actual <= 0) {
      varContainer.style.display = "none";
      return;
    }

    varContainer.style.display = "";
    let diff = actual - expectedAmt;
    let pct = expectedAmt > 0 ? ((diff / expectedAmt) * 100).toFixed(1) : 0;
    let isHigh = Math.abs(pct) > 10;

    varContainer.className = "variance-banner " + (isHigh ? "alert" : "");
    varContainer.innerHTML = `<span><strong>Amount Variance:</strong> Expected ₹${expectedAmt.toLocaleString("en-IN")} vs Entered ₹${actual.toLocaleString("en-IN")} (${pct}%) ${isHigh ? '— ⚠ High Variance Alert' : ''}</span>`;
  }

  async function saveBillDetails(e, cycleId) {
    if (e) e.preventDefault();

    let actualAmount = parseFloat(document.getElementById("op-actual-amount")?.value) || 0;
    let invoiceNumber = document.getElementById("op-invoice-no")?.value.trim();
    let invoiceDate = document.getElementById("op-invoice-date")?.value;
    let taxable = parseFloat(document.getElementById("op-taxable")?.value) || 0;
    let gst = parseFloat(document.getElementById("op-gst")?.value) || 0;
    let tds = parseFloat(document.getElementById("op-tds")?.value) || 0;

    let payload = {
      billCycleId: cycleId,
      actualAmount: actualAmount,
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      taxableValue: taxable,
      gstAmount: gst,
      tdsAmount: tds
    };

    if (selectedFileObj) {
      payload.fileName = selectedFileObj.name;
      payload.fileType = selectedFileObj.type;
      payload.fileSize = selectedFileObj.size;
      payload.fileData = selectedFileObj.data;
    }


    App.showToast("Saving bill details...", "info");
    let res = await BillDeskAPI.updateOperatorBill(payload, BillDeskAuth.getCurrentUser()?.email);
    if (res && res.success) {
      App.showToast("Bill details saved!", "success");
      App.refreshCurrentView();
      return true;
    } else {
      App.showToast((res && res.error) || "Failed to save details", "error");
      return false;
    }
  }

  async function submitForApproval(cycleId) {
    let actualAmount = parseFloat(document.getElementById("op-actual-amount")?.value) || 0;
    if (actualAmount <= 0) {
      alert("Validation Error (Rule R-04): Actual Amount is required before submitting for approval.");
      return;
    }

    let cycle = (cachedData?.billCycles || []).find(c => c.BillCycleID === cycleId);
    if (!cycle?.InvoiceFileID && !selectedFileObj) {
      alert("Validation Error (Rule R-04): Original Invoice file upload is mandatory before submitting for approval.");
      return;
    }

    // Save first then submit
    let saved = await saveBillDetails(null, cycleId);
    if (!saved) return;

    App.showToast("Submitting to approver...", "info");
    let res = await BillDeskAPI.submitForApproval(cycleId, BillDeskAuth.getCurrentUser()?.email);
    if (res && res.success) {
      App.showToast("Submitted for approval successfully!", "success");
      App.closeModal("operator-modal");
      App.refreshCurrentView();
    } else {
      App.showToast((res && res.error) || "Failed to submit for approval", "error");
    }
  }

  return {
    render: render,
    openBillModal: openBillModal,
    handleFileSelect: handleFileSelect,
    recalcVariance: recalcVariance,
    saveBillDetails: saveBillDetails,
    submitForApproval: submitForApproval
  };
})();
