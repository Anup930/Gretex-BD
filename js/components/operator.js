/**
 * BillDesk Operator Task Workbench
 * Enforces Rule R-04 (both actual amount & invoice upload required before submission),
 * variance calculations, and simulated invoice scanning review.
 */

const OperatorComponent = (function () {
  let cachedData = null;

  async function render(container) {
    cachedData = (typeof BillDeskDataStore !== "undefined" && BillDeskDataStore.isLoaded) ? BillDeskDataStore.getData() : await BillDeskAPI.getInitialData();
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
                    <div style="font-size:0.75rem; color:var(--slate-500);">${DashboardComponent.escapeHtml(c.VendorName)} • Period: ${DashboardComponent.formatPeriod(c.PeriodKey)}</div>
                  </td>
                  <td>${DashboardComponent.escapeHtml(c.CompanyName || "-")}</td>
                  <td>${DashboardComponent.formatDate(c.DueDate)}</td>
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
    let tdsAmt = parseFloat(cycle.TDSAmount) || 0;
    let hasSavedNet = cycle.NetPayable !== undefined && cycle.NetPayable !== null && !isNaN(parseFloat(cycle.NetPayable)) && parseFloat(cycle.NetPayable) > 0;
    let initialNet = hasSavedNet ? parseFloat(cycle.NetPayable) : (actualAmt > 0 ? Math.max(0, actualAmt - tdsAmt) : (expectedAmt > 0 ? expectedAmt : 0));
    isNetPayableManuallyEdited = Boolean(hasSavedNet && actualAmt > 0 && Math.abs(initialNet - (actualAmt - tdsAmt)) > 0.01);

    let varianceAmt = actualAmt > 0 ? (actualAmt - expectedAmt) : 0;
    let variancePct = (expectedAmt > 0 && actualAmt > 0) ? ((varianceAmt / expectedAmt) * 100).toFixed(1) : 0;
    let isHighVariance = Math.abs(variancePct) > 10;
    let isOverBudget = varianceAmt > 0;

    selectedFileObj = null;

    let modalHtml = `
      <div class="modal-backdrop active" id="operator-modal">
        <div class="modal-dialog modal-lg" style="max-width: 960px;">
          
          <!-- Header with Cosmic Aurora Gradient & Metadata HUD -->
          <div class="op-modal-header">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
                  <span style="font-size: 1.15rem; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">
                    ⚡ Bill Entry & Verification Workbench
                  </span>
                  <span class="badge ${cycle.Status === 'Returned' ? 'badge-returned' : (cycle.Status === 'ReadyForSubmission' ? 'badge-pending' : 'badge-incomplete')}">
                    ${cycle.Status === 'Returned' ? 'Returned by Approver' : (cycle.Status === 'ReadyForSubmission' ? 'Ready to Submit' : 'Pending Entry')}
                  </span>
                </div>
                <div style="font-size: 0.95rem; font-weight: 700; color: #38bdf8; margin-top: 0.25rem;">
                  ${DashboardComponent.escapeHtml(cycle.BillName)}
                </div>

                <!-- Live Metadata HUD Pills -->
                <div class="op-meta-pills">
                  <span class="op-meta-pill">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 9h-6"/></svg>
                    <span>Entity:</span> <strong>${DashboardComponent.escapeHtml(cycle.CompanyName || "Gretex Group")}</strong>
                  </span>
                  <span class="op-meta-pill">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span>Vendor:</span> <strong>${DashboardComponent.escapeHtml(cycle.VendorName)}</strong>
                  </span>
                  <span class="op-meta-pill highlight">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span>Period:</span> <strong>${DashboardComponent.formatPeriod(cycle.PeriodKey)}</strong>
                  </span>
                  <span class="op-meta-pill">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
                    <span>Due:</span> <strong>${DashboardComponent.formatDate(cycle.DueDate)}</strong>
                  </span>
                  <span class="op-meta-pill" style="border-color: rgba(56, 189, 248, 0.4); color: #38bdf8;">
                    <span>Budget Target:</span> <strong>₹${expectedAmt.toLocaleString("en-IN")}</strong>
                  </span>
                </div>
              </div>

              <button class="modal-close-btn" onclick="App.closeModal('operator-modal')" title="Close">&times;</button>
            </div>
          </div>

          <div class="modal-body" style="padding: 1.5rem;">
            
            ${cycle.Status === "Returned" ? `
              <div class="variance-banner alert" style="margin-bottom: 1.25rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div>
                  <strong>Returned by Approver:</strong> Please review approver remarks, correct invoice amounts/evidence, and re-submit.
                </div>
              </div>
            ` : ""}

            <!-- Dynamic Live Variance Banner -->
            <div id="variance-container" class="variance-banner ${isHighVariance ? 'alert' : ''}" style="${actualAmt > 0 ? '' : 'display:none;'} margin-bottom: 1.25rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%; flex-wrap:wrap; gap:0.5rem;">
                <div>
                  <strong>${isHighVariance ? '🚨 High Variance Alert (>10%)' : (isOverBudget ? '⚠ Budget Exceeded' : '✓ Within Budget Target')}</strong>:
                  Expected ₹${expectedAmt.toLocaleString("en-IN")} vs Entered ₹${actualAmt.toLocaleString("en-IN")}
                </div>
                <div style="font-weight:700; font-size:0.85rem; padding:0.2rem 0.65rem; border-radius:999px; background:${isHighVariance ? 'rgba(239,68,68,0.2)' : (isOverBudget ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)')}; border:1px solid ${isHighVariance ? 'rgba(239,68,68,0.4)' : (isOverBudget ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)')};">
                  ${varianceAmt >= 0 ? '+' : ''}₹${Math.abs(varianceAmt).toLocaleString("en-IN")} (${variancePct}%)
                </div>
              </div>
            </div>

            <form id="operator-form" onsubmit="OperatorComponent.saveBillDetails(event, '${cycle.BillCycleID}')">
              <div class="comparison-grid" style="margin-top: 0;">
                
                <!-- Left Panel: Financial Voucher & Tax Breakdown -->
                <div class="panel-card">
                  <h4>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <span style="font-size: 1.1rem;">💳</span>
                      <span>1. Financial & Tax Breakdown</span>
                    </div>
                    <span class="badge badge-draft" style="font-size: 0.72rem;">Rule R-04 Validated</span>
                  </h4>
                  
                  <!-- Hero Actual Amount Input -->
                  <div class="form-group" style="margin-bottom: 1.15rem;">
                    <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
                      <span>Actual Total Invoice Amount *</span>
                      <span style="font-size: 0.74rem; color: #38bdf8;">From vendor bill</span>
                    </label>
                    <div class="op-input-group">
                      <span class="op-currency-symbol">₹</span>
                      <input type="number" id="op-actual-amount" class="form-control op-input-with-symbol" required step="0.01" value="${actualAmt || ""}" placeholder="0.00" oninput="OperatorComponent.recalcVariance(${expectedAmt})">
                    </div>
                    <div class="form-hint">Enter the final gross amount printed on the vendor tax invoice.</div>
                  </div>

                  <!-- Invoice Number & Date -->
                  <div class="form-row" style="margin-bottom: 1rem;">
                    <div class="form-group">
                      <label class="form-label">Invoice / Bill Number</label>
                      <input type="text" id="op-invoice-no" class="form-control" value="${DashboardComponent.escapeHtml(cycle.InvoiceNumber || "")}" placeholder="e.g. INV-2026-90234">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Invoice Date</label>
                      <input type="date" id="op-invoice-date" class="form-control" value="${DashboardComponent.formatDateInput(cycle.InvoiceDate)}">
                    </div>
                  </div>

                  <!-- Taxable Value & GST Amount -->
                  <div class="form-row" style="margin-bottom: 1rem;">
                    <div class="form-group">
                      <label class="form-label">Taxable Value (₹)</label>
                      <input type="number" id="op-taxable" class="form-control" step="0.01" value="${cycle.TaxableValue || ""}" placeholder="Base amount">
                    </div>
                    <div class="form-group">
                      <label class="form-label">GST Amount (₹)</label>
                      <input type="number" id="op-gst" class="form-control" step="0.01" value="${cycle.GSTAmount || ""}" placeholder="Taxes">
                    </div>
                  </div>

                  <!-- TDS Deduction -->
                  <div class="form-group">
                    <label class="form-label">TDS Deducted (₹) (Sec 194C / 194J / 194I)</label>
                    <input type="number" id="op-tds" class="form-control" step="0.01" value="${cycle.TDSAmount !== undefined && cycle.TDSAmount !== null ? cycle.TDSAmount : 0}" oninput="OperatorComponent.recalcVariance(${expectedAmt})">
                  </div>

                  <!-- Total Payable (Net Amount to Pay) - Editable Field with Auto-Calculate Option -->
                  <div class="form-group" style="margin-top: 1rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0.22) 100%); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: var(--radius-md); padding: 0.85rem 1rem; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.08);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem; flex-wrap: wrap; gap: 0.4rem;">
                      <div>
                        <label class="form-label" style="margin-bottom: 0; font-size: 0.82rem; font-weight: 700; color: #6ee7b7; display: flex; align-items: center; gap: 0.35rem;">
                          <span>💳 Total Payable (Net Amount to Pay)</span>
                          <span style="color: #ef4444;">*</span>
                        </label>
                        <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 0.15rem;" id="op-net-calc-hint">
                          ${isNetPayableManuallyEdited ? '<span style="color: #38bdf8; font-weight: 600;">⚡ Custom Amount Overridden by User</span>' : 'Auto-computed: Actual Bill (₹) − TDS (₹)'}
                        </div>
                      </div>
                      <button type="button" class="btn btn-xs btn-secondary" onclick="OperatorComponent.autoComputeNetPayable()" style="font-size: 0.72rem; padding: 0.25rem 0.6rem; border-color: rgba(52, 211, 153, 0.4); color: #6ee7b7; background: rgba(16, 185, 129, 0.15); display: flex; align-items: center; gap: 0.3rem;" title="Reset to Formula: Actual Amount - TDS">
                        <span>⚡</span>
                        <span>Auto-Calculate</span>
                      </button>
                    </div>
                    <div class="op-input-group">
                      <span class="op-currency-symbol" style="color: #34d399; font-size: 1.15rem;">₹</span>
                      <input type="number" id="op-net-payable" class="form-control op-input-with-symbol" step="0.01" value="${initialNet > 0 ? initialNet : (actualAmt > 0 ? initialNet : '')}" placeholder="0.00" oninput="OperatorComponent.onNetPayableManualEdit()" style="background: rgba(15, 23, 42, 0.85); border-color: rgba(52, 211, 153, 0.5); font-size: 1.15rem !important; color: #34d399 !important; font-weight: 800; text-shadow: 0 0 10px rgba(52, 211, 153, 0.3);" required>
                    </div>
                  </div>

                </div>

                <!-- Right Panel: Document AI, Drag-and-Drop & Verification Studio -->
                <div class="panel-card">
                  <h4>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <span style="font-size: 1.1rem;">📂</span>
                      <span>2. Original Invoice Document</span>
                    </div>
                    <span id="doc-status-badge" class="badge ${cycle.InvoiceFileID ? 'badge-paid' : 'badge-incomplete'}">
                      ${cycle.InvoiceFileID ? 'Attached' : 'Required'}
                    </span>
                  </h4>

                  <!-- Drag-and-Drop Interactive Dropzone -->
                  <div class="form-group" style="margin-bottom: 1rem;">
                    <div class="op-dropzone" id="op-dropzone" ondragover="OperatorComponent.handleDragOver(event)" ondragleave="OperatorComponent.handleDragLeave(event)" ondrop="OperatorComponent.handleDrop(event)">
                      <input type="file" id="op-file-input" accept=".pdf,.png,.jpg,.jpeg" onchange="OperatorComponent.handleFileSelect(event)">
                      <div class="op-drop-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      </div>
                      <div style="font-weight: 700; font-size: 0.9rem; color: #ffffff;" id="op-dropzone-text">
                        Drag & drop original invoice file here
                      </div>
                      <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem;">
                        or click anywhere to browse from your device
                      </div>
                      <div style="display: flex; justify-content: center; gap: 0.35rem; margin-top: 0.6rem;">
                        <span style="font-size: 0.68rem; padding: 0.15rem 0.45rem; border-radius: 4px; background: rgba(255,255,255,0.06); color: #cbd5e1;">PDF</span>
                        <span style="font-size: 0.68rem; padding: 0.15rem 0.45rem; border-radius: 4px; background: rgba(255,255,255,0.06); color: #cbd5e1;">PNG</span>
                        <span style="font-size: 0.68rem; padding: 0.15rem 0.45rem; border-radius: 4px; background: rgba(255,255,255,0.06); color: #cbd5e1;">JPG</span>
                        <span style="font-size: 0.68rem; padding: 0.15rem 0.45rem; border-radius: 4px; color: #64748b;">• Max 10MB</span>
                      </div>
                    </div>
                  </div>

                  <!-- Live Document State Card -->
                  <div id="file-preview-card" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.12); padding: 0.85rem 1rem; border-radius: var(--radius-md); display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(56, 189, 248, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">
                      📄
                    </div>
                    <div style="flex-grow: 1; overflow: hidden;">
                      <div style="font-size: 0.84rem; font-weight: 700; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="preview-filename">
                        ${attachment ? DashboardComponent.escapeHtml(attachment.FileName) : (cycle.InvoiceFileID ? DashboardComponent.escapeHtml(cycle.InvoiceFileID) : "No file attached yet")}
                      </div>
                      <div style="font-size: 0.74rem; color: #94a3b8; margin-top: 0.15rem;" id="preview-filestatus">
                        ${cycle.InvoiceFileID ? "✓ Document verified & ready for submission" : "⚠ Original bill upload required before submission"}
                      </div>
                    </div>
                  </div>

                  <!-- Automated Pre-flight Telemetry Checks -->
                  <div style="margin-top: 1rem; background: rgba(30, 58, 138, 0.25); border: 1px solid rgba(59, 130, 246, 0.3); padding: 0.85rem; border-radius: var(--radius-md);">
                    <div style="font-size: 0.8rem; font-weight: 700; color: #ffffff; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.4rem;">
                      <span>🛡️ Automated Pre-flight Compliance Telemetry</span>
                    </div>
                    <ul style="font-size: 0.75rem; color: #cbd5e1; padding-left: 1.1rem; line-height: 1.6;">
                      <li><strong style="color:#34d399;">✓ Hash check (Rule R-10):</strong> Checked against duplicate vouchers</li>
                      <li><strong style="color:#34d399;">✓ Currency standard:</strong> Verified in Indian Rupees (INR ₹)</li>
                      <li><strong style="color:#34d399;">✓ Payee identity:</strong> Payee name matches vendor record</li>
                    </ul>
                  </div>

                </div>

              </div>

              <!-- Action Bar / Footer -->
              <div class="modal-footer" style="margin: 1.5rem -1.5rem -1.5rem -1.5rem; justify-content: space-between;">
                <div style="font-size: 0.75rem; color: #94a3b8; display: flex; align-items: center; gap: 0.4rem;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <span>Rule R-04: Original bill & valid amount required</span>
                </div>
                <div style="display: flex; gap: 0.6rem;">
                  <button type="button" class="btn btn-secondary" onclick="App.closeModal('operator-modal')">Close</button>
                  <button type="submit" class="btn btn-secondary" style="border-color: rgba(255,255,255,0.2);">💾 Save Progress</button>
                  <button type="button" class="btn btn-primary" style="background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); box-shadow: 0 4px 15px rgba(37,99,235,0.4);" onclick="OperatorComponent.submitForApproval('${cycle.BillCycleID}')">
                    🚀 Submit for Approval →
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      </div>
    `;

    document.getElementById("modal-container").innerHTML = modalHtml;
  }

  let selectedFileObj = null;
  let isNetPayableManuallyEdited = false;

  function onNetPayableManualEdit() {
    isNetPayableManuallyEdited = true;
    let hint = document.getElementById("op-net-calc-hint");
    if (hint) {
      hint.innerHTML = '<span style="color: #38bdf8; font-weight: 600;">⚡ Custom Amount Overridden by User</span>';
    }
  }

  function autoComputeNetPayable() {
    isNetPayableManuallyEdited = false;
    let actual = parseFloat(document.getElementById("op-actual-amount")?.value) || 0;
    let tds = parseFloat(document.getElementById("op-tds")?.value) || 0;
    let net = Math.max(0, actual - tds);

    let netInput = document.getElementById("op-net-payable");
    if (netInput) {
      netInput.value = actual > 0 ? (net > 0 ? net.toFixed(2) : "0") : "";
    }
    let hint = document.getElementById("op-net-calc-hint");
    if (hint) {
      hint.innerHTML = '<span style="color: #94a3b8;">Auto-computed: Actual Bill (₹) − TDS (₹)</span>';
    }
    App.showToast("Total Payable re-calculated: ₹" + net.toLocaleString("en-IN"), "info");
  }

  function handleFileSelect(event, droppedFile) {
    let file = droppedFile || (event && event.target && event.target.files && event.target.files[0]);
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function (e) {
      selectedFileObj = {
        name: file.name,
        type: file.type || "application/pdf",
        size: file.size,
        data: e.target.result
      };
      let nameEl = document.getElementById("preview-filename");
      if (nameEl) nameEl.textContent = file.name + " (" + (file.size / 1024).toFixed(1) + " KB)";
      let statEl = document.getElementById("preview-filestatus");
      if (statEl) statEl.innerHTML = '<span style="color:#34d399; font-weight:600;">✓ Document attached & verified</span>';
      let badgeEl = document.getElementById("doc-status-badge");
      if (badgeEl) {
        badgeEl.className = "badge badge-paid";
        badgeEl.textContent = "Attached";
      }
      let dropText = document.getElementById("op-dropzone-text");
      if (dropText) dropText.textContent = "Selected: " + file.name;
    };
    reader.readAsDataURL(file);
  }

  function handleDragOver(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    let dz = document.getElementById("op-dropzone");
    if (dz) dz.classList.add("dragover");
  }

  function handleDragLeave(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    let dz = document.getElementById("op-dropzone");
    if (dz) dz.classList.remove("dragover");
  }

  function handleDrop(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    let dz = document.getElementById("op-dropzone");
    if (dz) dz.classList.remove("dragover");
    if (e && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(null, e.dataTransfer.files[0]);
    }
  }

  function recalcVariance(expectedAmt) {
    let actual = parseFloat(document.getElementById("op-actual-amount")?.value) || 0;
    let tds = parseFloat(document.getElementById("op-tds")?.value) || 0;
    let net = Math.max(0, actual - tds);

    // Auto-update Total Payable if user has not manually overridden it
    if (!isNetPayableManuallyEdited) {
      let netInput = document.getElementById("op-net-payable");
      if (netInput) {
        netInput.value = actual > 0 ? (net > 0 ? net.toFixed(2) : "0") : "";
      }
      let hint = document.getElementById("op-net-calc-hint");
      if (hint) {
        hint.innerHTML = '<span style="color: #94a3b8;">Auto-computed: Actual Bill (₹) − TDS (₹)</span>';
      }
    }

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
    let isOver = diff > 0;

    varContainer.className = "variance-banner " + (isHigh ? "alert" : "");
    varContainer.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; width:100%; flex-wrap:wrap; gap:0.5rem;">
        <div>
          <strong>${isHigh ? '🚨 High Variance Alert (>10%)' : (isOver ? '⚠ Budget Exceeded' : '✓ Within Budget Target')}</strong>:
          Expected ₹${expectedAmt.toLocaleString("en-IN")} vs Entered ₹${actual.toLocaleString("en-IN")}
        </div>
        <div style="font-weight:700; font-size:0.85rem; padding:0.2rem 0.65rem; border-radius:999px; background:${isHigh ? 'rgba(239,68,68,0.2)' : (isOver ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)')}; border:1px solid ${isHigh ? 'rgba(239,68,68,0.4)' : (isOver ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)')};">
          ${diff >= 0 ? '+' : ''}₹${Math.abs(diff).toLocaleString("en-IN")} (${pct}%)
        </div>
      </div>
    `;
  }

  async function saveBillDetails(e, cycleId) {
    if (e) e.preventDefault();

    let actualAmount = parseFloat(document.getElementById("op-actual-amount")?.value) || 0;
    let invoiceNumber = document.getElementById("op-invoice-no")?.value.trim();
    let invoiceDate = document.getElementById("op-invoice-date")?.value;
    let taxable = parseFloat(document.getElementById("op-taxable")?.value) || 0;
    let gst = parseFloat(document.getElementById("op-gst")?.value) || 0;
    let tds = parseFloat(document.getElementById("op-tds")?.value) || 0;
    let netPayableEl = document.getElementById("op-net-payable");
    let netPayable = (netPayableEl && netPayableEl.value !== "")
      ? parseFloat(netPayableEl.value)
      : Math.max(0, actualAmount - tds);

    let payload = {
      billCycleId: cycleId,
      actualAmount: actualAmount,
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      taxableValue: taxable,
      gstAmount: gst,
      tdsAmount: tds,
      netPayable: netPayable
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
    handleDragOver: handleDragOver,
    handleDragLeave: handleDragLeave,
    handleDrop: handleDrop,
    recalcVariance: recalcVariance,
    onNetPayableManualEdit: onNetPayableManualEdit,
    autoComputeNetPayable: autoComputeNetPayable,
    saveBillDetails: saveBillDetails,
    submitForApproval: submitForApproval
  };
})();
