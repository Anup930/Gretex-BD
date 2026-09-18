/**
 * BillDesk Recurring Schedules Component
 * Manages recurring master register and single/batch cycle generation.
 */

const RecurringComponent = (function () {
  let cachedData = null;

  async function render(container) {
    cachedData = await BillDeskAPI.getInitialData();
    let schedules = cachedData.recurringSchedules || [];

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Recurring Schedule Register</h1>
          <p>Master registry of recurring obligations, cycle generation rules, and payment owners.</p>
        </div>
        <div class="view-actions">
          ${BillDeskAuth.hasCapability("CanManageMasters") ? `
            <button class="btn btn-secondary" onclick="RecurringComponent.openImportModal()">
              📥 Import Schedules
            </button>
            <button class="btn btn-primary" onclick="RecurringComponent.openScheduleModal()">
              + Create Recurring Schedule
            </button>
          ` : ""}
        </div>
      </div>

      <div class="table-card">
        <div class="table-toolbar">
          <div class="search-box">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="schedule-search" class="search-input" placeholder="Search bill name, vendor, category..." oninput="RecurringComponent.filterTable()">
          </div>
          <div class="filter-group">
            <select id="schedule-filter-freq" class="form-select" style="width: auto;" onchange="RecurringComponent.filterTable()">
              <option value="">All Frequencies</option>
              <option value="Monthly">Monthly</option>
              <option value="Weekly">Weekly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table" id="schedules-table">
            <thead>
              <tr>
                <th>Bill Name</th>
                <th>Company</th>
                <th>Category</th>
                <th>Frequency & Due Day</th>
                <th>Expected Amount</th>
                <th>Last Period</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${schedules.length === 0 ? `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--slate-400);">No recurring schedules defined. Click "+ Create Recurring Schedule" to add one.</td></tr>` : ""}
              ${schedules.map(s => {
                let comp = (cachedData.companies || []).find(c => c.CompanyID === s.CompanyID);
                let cat = (cachedData.categories || []).find(c => c.CategoryID === s.CategoryID);
                return `
                  <tr data-id="${s.ScheduleID}" data-search="${(s.BillName + ' ' + (comp?.CompanyName || '') + ' ' + (cat?.CategoryName || '')).toLowerCase()}" data-freq="${s.Frequency}">
                    <td>
                      <strong>${DashboardComponent.escapeHtml(s.BillName)}</strong>
                      <div style="font-size:0.75rem; color:var(--slate-500);">${DashboardComponent.escapeHtml(s.PayingEntity || "")}</div>
                    </td>
                    <td>${comp ? DashboardComponent.escapeHtml(comp.CompanyName) : "-"}</td>
                    <td><span class="badge badge-draft">${cat ? DashboardComponent.escapeHtml(cat.CategoryName) : "-"}</span></td>
                    <td>${s.Frequency} (Day ${s.DueDay || 10})</td>
                    <td><strong>₹${(parseFloat(s.ExpectedAmount) || 0).toLocaleString("en-IN")}</strong></td>
                    <td><span class="badge badge-draft">${s.LastGeneratedPeriod || "None"}</span></td>
                    <td>
                      ${s.IsActive !== false ? '<span class="badge badge-paid">Active</span>' : '<span class="badge badge-draft">Paused</span>'}
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.35rem;">
                        <button class="btn btn-sm btn-primary" title="Generate New Bill Cycle" onclick="RecurringComponent.generateCycle('${s.ScheduleID}')">
                          Generate Cycle
                        </button>
                        ${BillDeskAuth.hasCapability("CanManageMasters") ? `
                          <button class="btn btn-sm btn-secondary" title="Edit Schedule" onclick="RecurringComponent.openScheduleModal('${s.ScheduleID}')">
                            Edit
                          </button>
                        ` : ""}
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

  function filterTable() {
    let search = (document.getElementById("schedule-search")?.value || "").toLowerCase();
    let freq = document.getElementById("schedule-filter-freq")?.value || "";
    let rows = document.querySelectorAll("#schedules-table tbody tr[data-id]");

    rows.forEach(r => {
      let matchSearch = !search || r.getAttribute("data-search").includes(search);
      let matchFreq = !freq || r.getAttribute("data-freq") === freq;
      r.style.display = (matchSearch && matchFreq) ? "" : "none";
    });
  }

  function openScheduleModal(scheduleId = null) {
    let schedule = scheduleId ? (cachedData.recurringSchedules || []).find(s => s.ScheduleID === scheduleId) : null;
    let companies = cachedData.companies || [];
    let vendors = cachedData.vendors || [];
    let categories = cachedData.categories || [];

    let modalHtml = `
      <div class="modal-backdrop active" id="schedule-modal">
        <div class="modal-dialog">
          <div class="modal-header">
            <div class="modal-title">${schedule ? "Edit Recurring Schedule" : "Create Recurring Schedule"}</div>
            <button class="modal-close-btn" onclick="App.closeModal('schedule-modal')">&times;</button>
          </div>
          <div class="modal-body">
            <form id="schedule-form" onsubmit="RecurringComponent.saveSchedule(event, '${scheduleId || ""}')">
              <div class="form-group">
                <label class="form-label">Bill / Obligation Name *</label>
                <input type="text" id="sch-billname" class="form-control" required value="${schedule ? DashboardComponent.escapeHtml(schedule.BillName) : ""}" placeholder="e.g., Airtel Broadband Bandra">
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Company (Paying Entity) *</label>
                  <select id="sch-company" class="form-select" required>
                    <option value="">Select Company</option>
                    ${companies.map(c => `<option value="${c.CompanyID}" ${schedule && schedule.CompanyID === c.CompanyID ? "selected" : ""}>${DashboardComponent.escapeHtml(c.CompanyName)}</option>`).join("")}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Vendor *</label>
                  <select id="sch-vendor" class="form-select" required>
                    <option value="">Select Vendor</option>
                    ${vendors.map(v => `<option value="${v.VendorID}" ${schedule && schedule.VendorID === v.VendorID ? "selected" : ""}>${DashboardComponent.escapeHtml(v.VendorName)}</option>`).join("")}
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Category / Expense Head *</label>
                  <select id="sch-category" class="form-select" required>
                    <option value="">Select Category</option>
                    ${categories.map(cat => `<option value="${cat.CategoryID}" ${schedule && schedule.CategoryID === cat.CategoryID ? "selected" : ""}>${DashboardComponent.escapeHtml(cat.CategoryName)}</option>`).join("")}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Expected Amount (₹) *</label>
                  <input type="number" id="sch-amount" class="form-control" required step="0.01" value="${schedule ? schedule.ExpectedAmount : ""}" placeholder="25000">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Frequency *</label>
                  <select id="sch-frequency" class="form-select" required>
                    <option value="Monthly" ${!schedule || schedule.Frequency === "Monthly" ? "selected" : ""}>Monthly</option>
                    <option value="Weekly" ${schedule && schedule.Frequency === "Weekly" ? "selected" : ""}>Weekly</option>
                    <option value="Quarterly" ${schedule && schedule.Frequency === "Quarterly" ? "selected" : ""}>Quarterly</option>
                    <option value="Yearly" ${schedule && schedule.Frequency === "Yearly" ? "selected" : ""}>Yearly</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Due Day of Month (1 - 31)</label>
                  <input type="number" id="sch-dueday" class="form-control" min="1" max="31" value="${schedule ? (schedule.DueDay || 10) : 10}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Notes & GL Reference</label>
                <input type="text" id="sch-notes" class="form-control" value="${schedule ? DashboardComponent.escapeHtml(schedule.Notes || "") : ""}" placeholder="e.g. Contract No. 49204, Cost Centre 102">
              </div>

              <div class="modal-footer" style="margin: 1.5rem -1.5rem -1.5rem -1.5rem;">
                <button type="button" class="btn btn-secondary" onclick="App.closeModal('schedule-modal')">Cancel</button>
                <button type="submit" class="btn btn-primary" id="m-sch-submit-btn">${schedule ? 'Update Schedule' : 'Save Schedule'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    document.getElementById("modal-container").innerHTML = modalHtml;
  }

  async function saveSchedule(e, scheduleId) {
    e.preventDefault();
    let billName = document.getElementById("sch-billname").value.trim();
    let companyId = document.getElementById("sch-company").value;
    let vendorId = document.getElementById("sch-vendor").value;
    let categoryId = document.getElementById("sch-category").value;
    let expectedAmount = parseFloat(document.getElementById("sch-amount").value) || 0;
    let frequency = document.getElementById("sch-frequency").value;
    let dueDay = parseInt(document.getElementById("sch-dueday").value, 10) || 10;
    let notes = document.getElementById("sch-notes").value.trim();

    let comp = (cachedData.companies || []).find(c => c.CompanyID === companyId);
    let vend = (cachedData.vendors || []).find(v => v.VendorID === vendorId);
    let cat = (cachedData.categories || []).find(c => c.CategoryID === categoryId);

    let scheduleData = {
      ScheduleID: scheduleId || undefined,
      BillName: billName,
      CompanyID: companyId,
      CompanyName: comp ? comp.CompanyName : "",
      VendorID: vendorId,
      VendorName: vend ? vend.VendorName : "",
      CategoryID: categoryId,
      CategoryName: cat ? cat.CategoryName : "",
      ExpectedAmount: expectedAmount,
      Frequency: frequency,
      DueRule: "FixedDay",
      DueDay: dueDay,
      Currency: "INR",
      InvoiceDeadlineDays: 5,
      OwnerUserID: BillDeskAuth.getCurrentUser()?.userId || "",
      Notes: notes,
      IsActive: true
    };

    let btn = document.getElementById("m-sch-submit-btn");
    let origText = btn ? btn.innerHTML : "Save Schedule";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-block; animation:spin 1s infinite linear; margin-right:6px;">⌛</span> Saving to Google Sheet...`;
    }

    try {
      let res = await BillDeskAPI.saveSchedule(scheduleData, BillDeskAuth.getCurrentUser()?.email);
      if (btn) btn.innerHTML = `✓ Saved to Google Sheet!`;
      App.showToast("✓ Recurring schedule saved successfully to Google Sheet!", "success");
      setTimeout(() => {
        App.closeModal("schedule-modal");
        App.refreshCurrentView();
      }, 500);
    } catch (err) {
      App.showToast("Failed to save schedule: " + err.message, "error");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }
  }

  async function generateCycle(scheduleId) {
    let periodKey = prompt("Enter Period Key for this cycle (e.g. 2026-10 or 2026-Q4):", new Date().toISOString().slice(0, 7));
    if (!periodKey) return;

    App.showToast("Generating cycle for " + periodKey + "...", "info");
    let res = await BillDeskAPI.generateCycle(scheduleId, periodKey, BillDeskAuth.getCurrentUser()?.email);
    if (res && res.success) {
      App.showToast("Cycle created successfully for " + periodKey + "!", "success");
      App.refreshCurrentView();
    } else {
      App.showToast((res && res.error) || "Failed to generate cycle", "error");
    }
  }

  // ==========================================
  // BULK CSV / EXCEL IMPORT FOR RECURRING SCHEDULES
  // ==========================================
  const IMPORT_CONFIG = {
    title: "Recurring Schedules",
    filename: "Recurring_Schedules_Template.csv",
    headers: [
      "Bill Name",
      "Company Name",
      "Vendor Name",
      "Category Name",
      "Expected Amount",
      "Frequency",
      "Due Day",
      "Notes"
    ],
    sample: [
      [
        "Airtel Office LeaseLine Bandra",
        "Gretex Corporate Services Ltd",
        "Tata Tele Business Services",
        "Cloud & Telecom Subscriptions",
        "15000",
        "Monthly",
        "10",
        "Contract #98234"
      ],
      [
        "BKC Office Rent",
        "Gretex Corporate Services Ltd",
        "Amazon Web Services India",
        "Office Rent & Maintenance",
        "125000",
        "Monthly",
        "5",
        "Floor 4 Lease"
      ]
    ],
    previewCols: [
      { label: "Bill Name", key: "BillName" },
      { label: "Company", key: "CompanyName" },
      { label: "Vendor", key: "VendorName" },
      { label: "Category", key: "CategoryName" },
      { label: "Amount", key: "ExpectedAmountFormatted" },
      { label: "Freq", key: "Frequency" },
      { label: "Due Day", key: "DueDay" }
    ]
  };

  let activeImportRows = [];

  function openImportModal() {
    activeImportRows = [];

    let modalHtml = `
      <div class="modal-backdrop active" id="recurring-import-modal">
        <div class="modal-dialog" style="max-width: 720px;">
          <div class="modal-header">
            <div class="modal-title">Bulk Import Recurring Schedules</div>
            <button class="modal-close-btn" onclick="App.closeModal('recurring-import-modal')">&times;</button>
          </div>
          <div class="modal-body">
            <!-- Step 1: Download Template -->
            <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:0.85rem 1rem; margin-bottom:1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
              <div>
                <div style="font-weight:700; font-size:0.88rem; color:var(--navy-900);">Step 1: Download Standard Template</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">Use our sample template to format your Excel or CSV recurring schedules.</div>
              </div>
              <button type="button" class="btn btn-sm btn-secondary" onclick="RecurringComponent.downloadSampleTemplate()">
                📥 Download Template (.csv)
              </button>
            </div>

            <!-- Step 2: Upload File -->
            <div class="form-group" style="margin-bottom:1rem;">
              <label class="form-label" style="font-weight:700;">Step 2: Upload CSV or Excel (.xlsx, .xls, .csv)</label>
              <input type="file" id="rec-import-file" class="form-control" accept=".csv, .xlsx, .xls" onchange="RecurringComponent.handleImportFileSelect(event)">
            </div>

            <!-- Paste CSV Alternative -->
            <div class="form-group" style="margin-bottom:1.25rem;">
              <details>
                <summary style="font-size:0.8rem; color:var(--slate-600); cursor:pointer; font-weight:600; margin-bottom:0.5rem;">
                  Or paste CSV text manually
                </summary>
                <textarea id="rec-import-csv-text" class="form-control" rows="3" placeholder="Paste CSV text here including header row..." oninput="RecurringComponent.handleImportTextPaste(event)" style="font-family:monospace; font-size:0.75rem;"></textarea>
              </details>
            </div>

            <!-- Step 3: Live Preview -->
            <div id="rec-import-preview-area">
              <div style="padding:1.5rem; text-align:center; color:var(--slate-400); background:var(--slate-50); border:1px dashed var(--slate-300); border-radius:var(--radius-md);">
                Upload a file or paste CSV text above to preview schedules before saving.
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeModal('recurring-import-modal')">Cancel</button>
            <button type="button" class="btn btn-primary" id="rec-import-confirm-btn" onclick="RecurringComponent.submitImport()" disabled>
              Confirm & Import (0 Schedules)
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById("modal-container").innerHTML = modalHtml;
  }

  function downloadSampleTemplate() {
    let csvContent = IMPORT_CONFIG.headers.map(escapeCsvVal).join(",") + "\n";
    IMPORT_CONFIG.sample.forEach(row => {
      csvContent += row.map(escapeCsvVal).join(",") + "\n";
    });

    let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    let link = document.createElement("a");
    let url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", IMPORT_CONFIG.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    App.showToast(`Template downloaded: ${IMPORT_CONFIG.filename}`, "info");
  }

  function escapeCsvVal(val) {
    let s = String(val === undefined || val === null ? "" : val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function handleImportFileSelect(event) {
    let file = event.target.files && event.target.files[0];
    if (!file) return;

    let isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (isExcel && window.XLSX) {
      let reader = new FileReader();
      reader.onload = function (e) {
        try {
          let data = new Uint8Array(e.target.result);
          let workbook = XLSX.read(data, { type: "array" });
          let sheetName = workbook.SheetNames[0];
          let rawJson = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
          let normalized = rawJson.map(row => {
            let n = {};
            for (let k in row) n[String(k).trim().toLowerCase()] = String(row[k]);
            return n;
          });
          processParsedRows(normalized);
        } catch (err) {
          App.showToast("Failed to parse Excel file: " + err.message, "error");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      let reader = new FileReader();
      reader.onload = function (e) {
        try {
          let rows = parseCsvText(e.target.result);
          processParsedRows(rows);
        } catch (err) {
          App.showToast("Failed to parse CSV file: " + err.message, "error");
        }
      };
      reader.readAsText(file);
    }
  }

  function handleImportTextPaste(event) {
    let text = event.target.value.trim();
    if (!text) {
      renderImportPreview([]);
      return;
    }
    let rows = parseCsvText(text);
    processParsedRows(rows);
  }

  function parseCsvText(text) {
    let lines = text.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    let headers = parseCsvRow(lines[0]).map(h => h.trim().toLowerCase());
    let rows = [];

    for (let i = 1; i < lines.length; i++) {
      let values = parseCsvRow(lines[i]);
      if (!values || values.length === 0 || values.every(v => !v.trim())) continue;
      let obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] !== undefined ? values[idx].trim() : "";
      });
      rows.push(obj);
    }
    return rows;
  }

  function parseCsvRow(rowStr) {
    let result = [];
    let insideQuotes = false;
    let entry = "";
    for (let i = 0; i < rowStr.length; i++) {
      let c = rowStr[i];
      if (c === '"') {
        if (insideQuotes && rowStr[i + 1] === '"') {
          entry += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (c === ',' && !insideQuotes) {
        result.push(entry);
        entry = "";
      } else {
        entry += c;
      }
    }
    result.push(entry);
    return result;
  }

  function processParsedRows(rawRows) {
    let companies = (cachedData && cachedData.companies) || [];
    let vendors = (cachedData && cachedData.vendors) || [];
    let categories = (cachedData && cachedData.categories) || [];

    let validRows = [];

    for (let r of rawRows) {
      let billName = r["bill name"] || r["bill"] || r["obligation"] || r["name"] || "";
      if (!billName) continue;

      let compInput = r["company name"] || r["company"] || r["paying entity"] || "";
      let vendInput = r["vendor name"] || r["vendor"] || r["payee"] || "";
      let catInput = r["category name"] || r["category"] || r["expense head"] || "";
      let amountVal = parseFloat(r["expected amount"] || r["amount"] || r["expected"] || 0) || 0;
      let freqVal = r["frequency"] || "Monthly";
      let dueDayVal = parseInt(r["due day"] || r["due"] || r["day"] || 10, 10) || 10;
      let notesVal = r["notes"] || r["note"] || r["gl reference"] || "";

      // Match Company
      let compMatch = companies.find(c =>
        String(c.CompanyName || "").trim().toLowerCase() === compInput.trim().toLowerCase() ||
        String(c.Aliases || "").trim().toLowerCase().includes(compInput.trim().toLowerCase())
      );
      let companyId = compMatch ? compMatch.CompanyID : (companies[0] ? companies[0].CompanyID : "");
      let companyName = compMatch ? compMatch.CompanyName : (compInput || (companies[0] ? companies[0].CompanyName : ""));

      // Match Vendor
      let vendMatch = vendors.find(v =>
        String(v.VendorName || "").trim().toLowerCase() === vendInput.trim().toLowerCase() ||
        String(v.PayeeName || "").trim().toLowerCase() === vendInput.trim().toLowerCase() ||
        String(v.Aliases || "").trim().toLowerCase().includes(vendInput.trim().toLowerCase())
      );
      let vendorId = vendMatch ? vendMatch.VendorID : (vendors[0] ? vendors[0].VendorID : "");
      let vendorName = vendMatch ? vendMatch.VendorName : (vendInput || (vendors[0] ? vendors[0].VendorName : ""));

      // Match Category
      let catMatch = categories.find(c =>
        String(c.CategoryName || "").trim().toLowerCase() === catInput.trim().toLowerCase()
      );
      let categoryId = catMatch ? catMatch.CategoryID : (categories[0] ? categories[0].CategoryID : "");
      let categoryName = catMatch ? catMatch.CategoryName : (catInput || (categories[0] ? categories[0].CategoryName : ""));

      let scheduleObj = {
        BillName: billName,
        CompanyID: companyId,
        CompanyName: companyName,
        VendorID: vendorId,
        VendorName: vendorName,
        CategoryID: categoryId,
        CategoryName: categoryName,
        ExpectedAmount: amountVal,
        ExpectedAmountFormatted: "₹" + amountVal.toLocaleString("en-IN"),
        Frequency: ["Monthly", "Weekly", "Quarterly", "Yearly"].includes(freqVal) ? freqVal : "Monthly",
        DueRule: "FixedDay",
        DueDay: (dueDayVal >= 1 && dueDayVal <= 31) ? dueDayVal : 10,
        Currency: "INR",
        InvoiceDeadlineDays: 5,
        OwnerUserID: BillDeskAuth.getCurrentUser()?.userId || "",
        Notes: notesVal,
        IsActive: true
      };

      validRows.push(scheduleObj);
    }

    activeImportRows = validRows;
    renderImportPreview(validRows);
  }

  function renderImportPreview(rows) {
    let container = document.getElementById("rec-import-preview-area");
    let btn = document.getElementById("rec-import-confirm-btn");

    if (!container) return;

    if (!rows || rows.length === 0) {
      container.innerHTML = `
        <div style="padding:1.5rem; text-align:center; color:var(--slate-400); background:var(--slate-50); border:1px dashed var(--slate-300); border-radius:var(--radius-md);">
          No valid schedules detected yet. Please upload a CSV/Excel file or paste CSV text above.
        </div>
      `;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `Confirm & Import (0 Schedules)`;
      }
      return;
    }

    let cols = IMPORT_CONFIG.previewCols || [];
    let previewHtml = `
      <div style="margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:700; color:#059669; font-size:0.9rem;">
          ✓ Found ${rows.length} valid recurring schedules ready to import:
        </span>
        <span style="font-size:0.75rem; color:var(--slate-500);">Showing up to 5 preview rows</span>
      </div>
      <div class="table-responsive" style="max-height:220px; overflow-y:auto; border:1px solid var(--slate-200); border-radius:var(--radius-md);">
        <table class="data-table" style="font-size:0.8rem;">
          <thead>
            <tr>
              ${cols.map(c => `<th>${c.label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.slice(0, 5).map(r => `
              <tr>
                ${cols.map(c => `<td><strong>${DashboardComponent.escapeHtml(String(r[c.key] || '-'))}</strong></td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = previewHtml;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `Confirm & Import ${rows.length} Schedules to Google Sheet`;
    }
  }

  async function submitImport() {
    let btn = document.getElementById("rec-import-confirm-btn");
    let origText = btn ? btn.innerHTML : "Confirm & Import";

    if (!activeImportRows || activeImportRows.length === 0) {
      App.showToast("No valid recurring schedules to import.", "warning");
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-block; animation:spin 1s infinite linear; margin-right:6px;">⌛</span> Importing ${activeImportRows.length} schedules to Google Sheet...`;
    }

    try {
      let res = await BillDeskAPI.importMasters("RecurringSchedules", activeImportRows, BillDeskAuth.getCurrentUser()?.email);
      let count = (res && res.count) || activeImportRows.length;

      if (btn) btn.innerHTML = `✓ Imported ${count} schedules!`;
      App.showToast(`✓ Successfully imported ${count} recurring schedules to Google Sheet!`, "success");

      cachedData = await BillDeskAPI.getInitialData();
      setTimeout(() => {
        App.closeModal("recurring-import-modal");
        App.refreshCurrentView();
      }, 500);
    } catch (e) {
      App.showToast("Import failed: " + e.message, "error");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }
  }

  return {
    render: render,
    filterTable: filterTable,
    openScheduleModal: openScheduleModal,
    saveSchedule: saveSchedule,
    generateCycle: generateCycle,
    openImportModal: openImportModal,
    downloadSampleTemplate: downloadSampleTemplate,
    handleImportFileSelect: handleImportFileSelect,
    handleImportTextPaste: handleImportTextPaste,
    submitImport: submitImport
  };
})();
