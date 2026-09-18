/**
 * BillDesk Payment Queue & Independent Confirmation (Maker-Checker)
 * Enforces Rule R-07 (Initiator cannot confirm their own attempt),
 * Rule R-08 (No overpayment), and partial payment tracking.
 */

const PaymentComponent = (function () {
  let cachedData = null;

  async function render(container) {
    cachedData = await BillDeskAPI.getInitialData();
    let cycles = cachedData.billCycles || [];
    let attempts = cachedData.paymentAttempts || [];
    let currentUser = BillDeskAuth.getCurrentUser();

    // 1. Approved Bills Ready for Payment Initiation
    let payableBills = cycles.filter(c => c.Status === "Approved" || c.Status === "PartiallyPaid");

    // 2. Pending Independent Confirmation Queue
    let pendingConfirmations = attempts.filter(a => a.ConfirmationState === "PendingConfirmation");

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Payment Queue & Independent Confirmation</h1>
          <p>Maker-Checker workflow: Initiate approved payments and verify with independent confirmation.</p>
        </div>
        <div class="view-actions">
          <span class="badge badge-pending">${payableBills.length} Approved Payables</span>
          <span class="badge badge-approved">${pendingConfirmations.length} Pending Confirmations</span>
        </div>
      </div>

      <!-- Section 1: Independent Confirmation Queue (Maker-Checker R-07) -->
      <div class="table-card" style="border-left: 4px solid var(--navy-600);">
        <div class="table-toolbar" style="background:var(--navy-50);">
          <div style="font-weight: 700; color: var(--navy-900); display:flex; align-items:center; gap:0.5rem;">
            <span>1. Independent Confirmation Queue (Maker-Checker Verification)</span>
            <span class="badge badge-pending">Rule R-07 Enforced</span>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Bill / Payee</th>
                <th>Initiator (Maker)</th>
                <th>Amount Paid</th>
                <th>Bank UTR / Ref</th>
                <th>Payment Date</th>
                <th>Proof Attached</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${pendingConfirmations.length === 0 ? `<tr><td colspan="7" style="text-align:center; padding: 1.5rem; color: var(--slate-400);">No payment attempts awaiting independent confirmation.</td></tr>` : ""}
              ${pendingConfirmations.map(a => {
                let cycle = cycles.find(c => c.BillCycleID === a.BillCycleID);
                let isSameUser = (currentUser && a.InitiatorUserID && currentUser.email.toLowerCase() === a.InitiatorUserID.toLowerCase());
                return `
                  <tr>
                    <td>
                      <strong>${DashboardComponent.escapeHtml(cycle ? cycle.BillName : "Bill")}</strong>
                      <div style="font-size:0.75rem; color:var(--slate-500);">${DashboardComponent.escapeHtml(a.PayeeName)}</div>
                    </td>
                    <td>
                      <span class="badge badge-draft">${DashboardComponent.escapeHtml(a.InitiatorUserID)}</span>
                    </td>
                    <td><strong>₹${(parseFloat(a.AmountPaid) || 0).toLocaleString("en-IN")}</strong></td>
                    <td><code>${DashboardComponent.escapeHtml(a.BankReference)}</code></td>
                    <td>${a.PaymentDate}</td>
                    <td>
                      <span class="badge badge-paid">Screenshot / UTR</span>
                    </td>
                    <td>
                      ${isSameUser ? `
                        <span class="badge badge-incomplete" title="Rule R-07: Maker cannot confirm own payment">
                          Awaiting Different Confirmer
                        </span>
                      ` : `
                        <button class="btn btn-sm btn-success" onclick="PaymentComponent.openConfirmModal('${a.PaymentAttemptID}')">
                          Verify & Confirm
                        </button>
                      `}
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 2: Approved Payables Queue -->
      <div class="table-card">
        <div class="table-toolbar">
          <div style="font-weight: 700; color: var(--navy-900);">
            2. Approved Bills Queue (Ready for Payment Initiation)
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
                <th>Net Outstanding</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${payableBills.length === 0 ? `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--slate-400);">No approved bills awaiting payment.</td></tr>` : ""}
              ${payableBills.map(c => `
                <tr>
                  <td>
                    <strong>${DashboardComponent.escapeHtml(c.BillName)}</strong>
                    <div style="font-size:0.75rem; color:var(--slate-500);">${DashboardComponent.escapeHtml(c.VendorName)}</div>
                  </td>
                  <td>${DashboardComponent.escapeHtml(c.CompanyName || "-")}</td>
                  <td><span class="badge badge-draft">${c.PeriodKey}</span></td>
                  <td>${c.DueDate || "-"}</td>
                  <td><strong>₹${(parseFloat(c.NetPayable) || 0).toLocaleString("en-IN")}</strong></td>
                  <td>${DashboardComponent.renderStatusBadge(c.Status)}</td>
                  <td>
                    <button class="btn btn-sm btn-primary" onclick="PaymentComponent.openPayModal('${c.BillCycleID}')">
                      Record Payment
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

  function openPayModal(cycleId) {
    let cycle = (cachedData?.billCycles || []).find(c => c.BillCycleID === cycleId);
    if (!cycle) return;

    let bankAccounts = (cachedData?.bankAccounts || []).filter(b => b.IsActive);
    let netOutstanding = parseFloat(cycle.NetPayable) || 0;

    let modalHtml = `
      <div class="modal-backdrop active" id="payment-modal">
        <div class="modal-dialog">
          <div class="modal-header">
            <div>
              <div class="modal-title">Initiate Payment: ${DashboardComponent.escapeHtml(cycle.BillName)}</div>
              <div style="font-size:0.8rem; color:var(--slate-500);">Net Payable Outstanding: ₹${netOutstanding.toLocaleString("en-IN")}</div>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('payment-modal')">&times;</button>
          </div>
          <div class="modal-body">
            <form id="pay-form" onsubmit="PaymentComponent.submitPaymentInitiation(event, '${cycle.BillCycleID}', ${netOutstanding})">
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Payment Amount (₹) *</label>
                  <input type="number" id="pay-amount" class="form-control" required step="0.01" max="${netOutstanding}" value="${netOutstanding}">
                  <div class="form-hint">Rule R-08: Partial payment permitted; cannot exceed net outstanding.</div>
                </div>
                <div class="form-group">
                  <label class="form-label">Payment Date *</label>
                  <input type="date" id="pay-date" class="form-control" required value="${new Date().toISOString().slice(0, 10)}">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Bank UTR / Transaction Reference # *</label>
                  <input type="text" id="pay-ref" class="form-control" required placeholder="e.g. CMS2948019481">
                </div>
                <div class="form-group">
                  <label class="form-label">Deduct from Bank Account *</label>
                  <select id="pay-bank" class="form-select" required>
                    <option value="">Select Account</option>
                    ${bankAccounts.map(b => `<option value="${b.BankAccountID}">${DashboardComponent.escapeHtml(b.AccountLabel)} (Usable: ₹${(parseFloat(b.UsableBalance) || 0).toLocaleString("en-IN")})</option>`).join("")}
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Beneficiary / Payee Name</label>
                <input type="text" id="pay-payee" class="form-control" value="${DashboardComponent.escapeHtml(cycle.VendorName)}">
              </div>

              <div class="form-group">
                <label class="form-label">Payment Screenshot / UTR Receipt Proof *</label>
                <input type="file" id="pay-proof-file" class="form-control" accept=".png,.jpg,.jpeg,.pdf">
                <div class="form-hint">Required for independent confirmer verification.</div>
              </div>

              <div class="modal-footer" style="margin: 1.5rem -1.5rem -1.5rem -1.5rem;">
                <button type="button" class="btn btn-secondary" onclick="App.closeModal('payment-modal')">Cancel</button>
                <button type="submit" class="btn btn-success">Submit for Independent Confirmation →</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    document.getElementById("modal-container").innerHTML = modalHtml;
  }

  async function submitPaymentInitiation(e, cycleId, netOutstanding) {
    e.preventDefault();

    let amountPaid = parseFloat(document.getElementById("pay-amount").value) || 0;
    let paymentDate = document.getElementById("pay-date").value;
    let bankRef = document.getElementById("pay-ref").value.trim();
    let bankAccountId = document.getElementById("pay-bank").value;
    let payeeName = document.getElementById("pay-payee").value.trim();
    let fileInput = document.getElementById("pay-proof-file");

    if (amountPaid <= 0 || amountPaid > netOutstanding) {
      alert(`Invalid Amount: Payment must be between ₹1 and ₹${netOutstanding.toLocaleString("en-IN")}`);
      return;
    }

    let payload = {
      billCycleId: cycleId,
      amountPaid: amountPaid,
      paymentDate: paymentDate,
      bankReference: bankRef,
      bankAccountId: bankAccountId,
      payeeName: payeeName,
      proofFileName: fileInput?.files[0]?.name || "payment_proof.pdf"
    };

    let file = fileInput?.files[0];
    if (file) {
      let reader = new FileReader();
      reader.onload = async function (ev) {
        payload.proofFileName = file.name;
        payload.proofFileType = file.type || "application/pdf";
        payload.proofFileData = ev.target.result;

        App.showToast("Submitting payment initiation & uploading proof...", "info");
        let res = await BillDeskAPI.initiatePayment(payload, BillDeskAuth.getCurrentUser()?.email);

        if (res && res.success) {
          App.showToast("Payment initiated! Sent to independent confirmation queue.", "success");
          App.closeModal("payment-modal");
          App.refreshCurrentView();
        } else {
          App.showToast((res && res.error) || "Failed to initiate payment", "error");
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    App.showToast("Submitting payment initiation...", "info");
    let res = await BillDeskAPI.initiatePayment(payload, BillDeskAuth.getCurrentUser()?.email);

    if (res && res.success) {
      App.showToast("Payment initiated! Sent to independent confirmation queue.", "success");
      App.closeModal("payment-modal");
      App.refreshCurrentView();
    } else {
      App.showToast((res && res.error) || "Failed to initiate payment", "error");
    }
  }


  function openConfirmModal(attemptId) {
    let attempt = (cachedData?.paymentAttempts || []).find(a => a.PaymentAttemptID === attemptId);
    if (!attempt) return;

    let cycle = (cachedData?.billCycles || []).find(c => c.BillCycleID === attempt.BillCycleID);
    let bank = (cachedData?.bankAccounts || []).find(b => b.BankAccountID === attempt.BankAccountID);

    let modalHtml = `
      <div class="modal-backdrop active" id="confirm-modal">
        <div class="modal-dialog">
          <div class="modal-header">
            <div>
              <div class="modal-title">Independent Payment Confirmation</div>
              <div style="font-size:0.8rem; color:var(--slate-500);">Maker-Checker Verification (Rule R-07)</div>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('confirm-modal')">&times;</button>
          </div>
          <div class="modal-body">
            
            <table style="width:100%; font-size:0.85rem; border-collapse:collapse; margin-bottom:1rem;">
              <tr style="border-bottom:1px solid var(--slate-200); height:32px;">
                <td style="color:var(--slate-500);">Bill Name:</td>
                <td style="font-weight:600; text-align:right;">${DashboardComponent.escapeHtml(cycle ? cycle.BillName : "-")}</td>
              </tr>
              <tr style="border-bottom:1px solid var(--slate-200); height:32px;">
                <td style="color:var(--slate-500);">Beneficiary Payee:</td>
                <td style="font-weight:600; text-align:right;">${DashboardComponent.escapeHtml(attempt.PayeeName)}</td>
              </tr>
              <tr style="border-bottom:1px solid var(--slate-200); height:32px;">
                <td style="color:var(--slate-500);">Initiator (Maker):</td>
                <td style="font-weight:600; text-align:right;">${DashboardComponent.escapeHtml(attempt.InitiatorUserID)}</td>
              </tr>
              <tr style="border-bottom:1px solid var(--slate-200); height:32px;">
                <td style="color:var(--slate-500);">Bank UTR Reference:</td>
                <td style="font-weight:600; text-align:right;"><code>${DashboardComponent.escapeHtml(attempt.BankReference)}</code></td>
              </tr>
              <tr style="border-bottom:1px solid var(--slate-200); height:32px;">
                <td style="color:var(--slate-500);">Debit Account:</td>
                <td style="font-weight:600; text-align:right;">${DashboardComponent.escapeHtml(bank ? bank.AccountLabel : "Primary Account")}</td>
              </tr>
              <tr style="border-bottom:1px solid var(--slate-200); height:32px;">
                <td style="color:var(--slate-500);">Payment Proof File:</td>
                <td style="font-weight:600; text-align:right;"><span class="badge badge-paid">${DashboardComponent.escapeHtml(attempt.ProofFileID || "UTR_Receipt.pdf")}</span></td>
              </tr>
              <tr style="height:40px; background:var(--navy-50);">
                <td style="font-weight:700; color:var(--navy-900); padding-left:0.5rem;">Amount to Confirm:</td>
                <td style="font-weight:700; color:var(--navy-900); text-align:right; padding-right:0.5rem; font-size:1.15rem;">₹${(parseFloat(attempt.AmountPaid) || 0).toLocaleString("en-IN")}</td>
              </tr>
            </table>

            <div class="form-group">
              <label class="form-label">Remarks / Rejection Reason (Required if failing attempt)</label>
              <textarea id="confirm-reason" class="form-control" rows="2" placeholder="e.g. UTR verified in bank statement debit entries."></textarea>
            </div>

            <div class="modal-footer" style="margin: 1.5rem -1.5rem -1.5rem -1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal('confirm-modal')">Close</button>
              <button type="button" class="btn btn-danger" onclick="PaymentComponent.executeConfirmation('${attempt.PaymentAttemptID}', 'Failed')">
                Fail / Reject Attempt
              </button>
              <button type="button" class="btn btn-success" onclick="PaymentComponent.executeConfirmation('${attempt.PaymentAttemptID}', 'Confirmed')">
                ✓ Confirm & Settle Payment
              </button>
            </div>

          </div>
        </div>
      </div>
    `;

    document.getElementById("modal-container").innerHTML = modalHtml;
  }

  async function executeConfirmation(attemptId, decision) {
    let reason = document.getElementById("confirm-reason")?.value.trim() || "";
    if (decision === "Failed" && !reason) {
      alert("Please provide a reason when failing a payment attempt.");
      return;
    }

    App.showToast(`Recording confirmation as ${decision}...`, "info");
    let res = await BillDeskAPI.confirmPayment(
      attemptId,
      decision,
      reason,
      BillDeskAuth.getCurrentUser()?.email
    );

    if (res && res.success) {
      App.showToast(`Payment attempt successfully ${decision}!`, "success");
      App.closeModal("confirm-modal");
      App.refreshCurrentView();
    } else {
      App.showToast((res && res.error) || "Confirmation failed", "error");
    }
  }

  return {
    render: render,
    openPayModal: openPayModal,
    submitPaymentInitiation: submitPaymentInitiation,
    openConfirmModal: openConfirmModal,
    executeConfirmation: executeConfirmation
  };
})();
