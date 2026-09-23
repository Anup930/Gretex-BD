/**
 * BillDesk Administration & Masters Component
 * FR-025 (Unlimited Users), FR-026 (Custom Roles & Capabilities),
 * FR-027 (SuperAdmin Protection Rule R-02), and Masters Management.
 */

const AdminComponent = (function () {
  let cachedData = null;
  let activeTab = "users";

  async function render(container) {
    cachedData = (typeof BillDeskDataStore !== "undefined" && BillDeskDataStore.isLoaded) ? BillDeskDataStore.getData() : await BillDeskAPI.getInitialData();

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>System Administration & Master Data</h1>
          <p>Configure user capabilities, custom roles, entity masters, bank accounts, and Apps Script connections.</p>
        </div>
      </div>

      <!-- Sub-Tabs -->
      <div style="display:flex; gap:0.5rem; border-bottom:1px solid var(--slate-200); margin-bottom:1.5rem; overflow-x:auto;">
        <button class="btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}" onclick="AdminComponent.switchTab('users')">Users & Access</button>
        <button class="btn ${activeTab === 'companies' ? 'btn-primary' : 'btn-secondary'}" onclick="AdminComponent.switchTab('companies')">Companies</button>
        <button class="btn ${activeTab === 'vendors' ? 'btn-primary' : 'btn-secondary'}" onclick="AdminComponent.switchTab('vendors')">Vendors & Payees</button>
        <button class="btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}" onclick="AdminComponent.switchTab('categories')">Expense Categories</button>
        <button class="btn ${activeTab === 'banks' ? 'btn-primary' : 'btn-secondary'}" onclick="AdminComponent.switchTab('banks')">Bank Accounts</button>
        <button class="btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}" onclick="AdminComponent.switchTab('settings')">API & System Settings</button>
      </div>

      <div id="admin-tab-content">
        ${renderTabContent()}
      </div>
    `;
  }

  function switchTab(tab) {
    activeTab = tab;
    let container = document.getElementById("admin-tab-content");
    if (container) container.innerHTML = renderTabContent();
    let buttons = document.querySelectorAll(".app-container .btn");
    // refresh parent view
    let mainContainer = document.getElementById("view-container");
    if (mainContainer) render(mainContainer);
  }

  function renderTabContent() {
    if (activeTab === "users") return renderUsersTab();
    if (activeTab === "companies") return renderCompaniesTab();
    if (activeTab === "vendors") return renderVendorsTab();
    if (activeTab === "categories") return renderCategoriesTab();
    if (activeTab === "banks") return renderBanksTab();
    if (activeTab === "settings") return renderSettingsTab();
    return "";
  }

  // Users & Roles
  function renderUsersTab() {
    let users = cachedData.users || [];
    return `
      <div class="table-card">
        <div class="table-toolbar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div>
            <div style="font-weight:700; color:var(--navy-900);">Active User Directory & Roles</div>
            <div style="font-size:0.75rem; color:var(--slate-500);">${users.length} registered accounts in database</div>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-sm btn-secondary" onclick="AdminComponent.setupSheetUsers()" title="Populates or updates the 10 team users into the Google Sheet Users table">
              ⚡ Setup 10 Team Users in Sheet
            </button>
            <button class="btn btn-sm btn-primary" onclick="AdminComponent.openUserModal()">+ Add User</button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Display Name</th>
                <th>Work Email</th>
                <th>Assigned Role</th>
                <th>SuperAdmin</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td><strong>${DashboardComponent.escapeHtml(u.DisplayName)}</strong></td>
                  <td>${DashboardComponent.escapeHtml(u.Email)}</td>
                  <td><span class="badge badge-pending">${u.RoleName || (u.IsSuperAdmin ? "SuperAdmin" : "User")}</span></td>
                  <td>
                    ${u.IsSuperAdmin ? '<span class="badge badge-paid">Protected SuperAdmin</span>' : '<span style="color:var(--slate-400); font-size:0.75rem;">Standard</span>'}
                  </td>
                  <td>
                    ${u.IsActive !== false ? '<span class="badge badge-paid">Active</span>' : '<span class="badge badge-rejected">Deactivated</span>'}
                  </td>
                  <td style="font-size:0.75rem; color:var(--slate-500);">${u.LastLogin ? new Date(u.LastLogin).toLocaleDateString() : "Never"}</td>
                  <td>
                    <button class="btn btn-xs btn-secondary" onclick="AdminComponent.editUser('${u.UserID}')">Edit</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Companies
  function renderCompaniesTab() {
    let comps = cachedData.companies || [];
    return `
      <div class="table-card">
        <div class="table-toolbar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div style="font-weight:700; color:var(--navy-900);">Company Entities (Paying Units)</div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-sm btn-secondary" onclick="AdminComponent.openImportModal('Companies')">📥 Import Companies</button>
            <button class="btn btn-sm btn-primary" onclick="AdminComponent.openCompanyModal()">+ Add Company</button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Alias</th>
                <th>GST Number</th>
                <th>PAN Number</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${comps.map(c => `
                <tr>
                  <td><strong>${DashboardComponent.escapeHtml(c.CompanyName)}</strong></td>
                  <td>${DashboardComponent.escapeHtml(c.Aliases || "-")}</td>
                  <td><code>${c.GSTNumber || "-"}</code></td>
                  <td><code>${c.PANNumber || "-"}</code></td>
                  <td><span class="badge badge-paid">Active</span></td>
                  <td>
                    <button class="btn btn-xs btn-secondary" onclick="AdminComponent.editCompany('${c.CompanyID}')">Edit</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Vendors
  function renderVendorsTab() {
    let vendors = cachedData.vendors || [];
    return `
      <div class="table-card">
        <div class="table-toolbar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div style="font-weight:700; color:var(--navy-900);">Approved Vendors & Registered Payees</div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-sm btn-secondary" onclick="AdminComponent.openImportModal('Vendors')">📥 Import Vendors</button>
            <button class="btn btn-sm btn-primary" onclick="AdminComponent.openVendorModal()">+ Add Vendor</button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Vendor Name</th>
                <th>Beneficiary Payee</th>
                <th>Bank & Account</th>
                <th>IFSC</th>
                <th>GSTIN</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${vendors.map(v => `
                <tr>
                  <td><strong>${DashboardComponent.escapeHtml(v.VendorName)}</strong></td>
                  <td>${DashboardComponent.escapeHtml(v.PayeeName || v.VendorName)}</td>
                  <td>${v.BankName || "-"} (${v.BankAccount || "-"})</td>
                  <td><code>${v.IFSC || "-"}</code></td>
                  <td><code>${v.GSTNumber || "-"}</code></td>
                  <td>
                    <button class="btn btn-xs btn-secondary" onclick="AdminComponent.editVendor('${v.VendorID}')">Edit</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Categories
  function renderCategoriesTab() {
    let cats = cachedData.categories || [];
    return `
      <div class="table-card">
        <div class="table-toolbar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div style="font-weight:700; color:var(--navy-900);">Expense Categories & Variance Thresholds</div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-sm btn-secondary" onclick="AdminComponent.openImportModal('Categories')">📥 Import Categories</button>
            <button class="btn btn-sm btn-primary" onclick="AdminComponent.openCategoryModal()">+ Add Category</button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Variance Threshold %</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${cats.map(c => `
                <tr>
                  <td><strong>${DashboardComponent.escapeHtml(c.CategoryName)}</strong></td>
                  <td><span class="badge badge-incomplete">${c.VarianceThresholdPct || 10}%</span></td>
                  <td><span class="badge badge-paid">Active</span></td>
                  <td>
                    <button class="btn btn-xs btn-secondary" onclick="AdminComponent.editCategory('${c.CategoryID}')">Edit</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Banks
  function renderBanksTab() {
    let banks = cachedData.bankAccounts || [];
    return `
      <div class="table-card">
        <div class="table-toolbar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div style="font-weight:700; color:var(--navy-900);">Bank Accounts & Usable Balances</div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-sm btn-secondary" onclick="AdminComponent.openImportModal('BankAccounts')">📥 Import Bank Accounts</button>
            <button class="btn btn-sm btn-primary" onclick="AdminComponent.openBankModal()">+ Add Bank Account</button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Account Label</th>
                <th>Bank & A/C #</th>
                <th>IFSC</th>
                <th>Anchor Balance</th>
                <th>Reserves</th>
                <th>Usable Balance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${banks.map(b => `
                <tr>
                  <td><strong>${DashboardComponent.escapeHtml(b.AccountLabel)}</strong></td>
                  <td>${b.BankName} • ${b.AccountNumber}</td>
                  <td><code>${b.IFSC}</code></td>
                  <td>₹${(parseFloat(b.AnchorBalance) || 0).toLocaleString("en-IN")}</td>
                  <td style="color:#d97706;">₹${(parseFloat(b.Reserves) || 0).toLocaleString("en-IN")}</td>
                  <td><strong style="color:#059669;">₹${(parseFloat(b.UsableBalance) || 0).toLocaleString("en-IN")}</strong></td>
                  <td>
                    <button class="btn btn-xs btn-secondary" onclick="AdminComponent.editBank('${b.BankAccountID}')">Edit</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Settings & Apps Script URL
  function renderSettingsTab() {
    let currentUrl = BillDeskAPI.getEndpointUrl();
    let currentSheetId = BillDeskAPI.getSpreadsheetId ? BillDeskAPI.getSpreadsheetId() : "";
    let currentMode = BillDeskAPI.getMode();

    return `
      <div class="panel-card" style="max-width:800px; background:var(--white);">
        <h4>Google Apps Script & Database Settings</h4>
        
        <div class="form-group">
          <label class="form-label">Google Apps Script Web App URL</label>
          <input type="text" id="cfg-appscript-url" class="form-control" value="${DashboardComponent.escapeHtml(currentUrl)}">
          <div class="form-hint">Deployed Web App endpoint ending in <code>/exec</code>.</div>
        </div>

        <div class="form-group">
          <label class="form-label">Google Sheet ID (DB Spreadsheet)</label>
          <input type="text" id="cfg-sheet-id" class="form-control" value="${DashboardComponent.escapeHtml(currentSheetId)}" placeholder="e.g. 18_K7jtZ91al4yDWabsqkbYVm1nKOzmg or from Sheet URL">
          <div class="form-hint">Open your Google Sheet "DB" in Google Drive. Copy the ID from the URL (between <code>/d/</code> and <code>/edit</code>).</div>
        </div>

        <div class="form-group" style="background:var(--navy-50); border:1px solid var(--navy-100); padding:0.85rem; border-radius:var(--radius-md);">
          <label class="form-label" style="color:var(--navy-900); font-weight:700;">Google Drive Files & Attachments Folder</label>
          <div style="font-size:0.82rem; color:var(--slate-700); margin-bottom:0.4rem;">
            Uploaded invoices and payment proofs are stored in this Drive folder:
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <code>1EAO0KDAOpldv1hGCkrTMLeLXBIJPGhoI</code>
            <a href="https://drive.google.com/drive/folders/1EAO0KDAOpldv1hGCkrTMLeLXBIJPGhoI?usp=sharing" target="_blank" class="btn btn-sm btn-primary">
              Open Drive Folder ↗
            </a>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Connection Mode</label>
          <select id="cfg-appscript-mode" class="form-select">
            <option value="live" ${currentMode === 'live' ? 'selected' : ''}>Live Google Apps Script (Directly connected to Google Sheets DB)</option>
            <option value="local" ${currentMode === 'local' ? 'selected' : ''}>Local Browser Pilot Storage (Offline)</option>
          </select>
        </div>

        <div style="display:flex; gap:0.75rem; margin-top:1.25rem; flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="AdminComponent.saveSettings()">Save Configuration</button>
          <button class="btn btn-secondary" onclick="AdminComponent.testConnection()">Test Connection</button>
          <button class="btn btn-secondary" onclick="AdminComponent.seedSheetData()">Populate Initial Masters to Sheet</button>
        </div>

        <div id="test-conn-result" style="margin-top:1rem;"></div>
      </div>
    `;
  }

  function saveSettings() {
    let url = document.getElementById("cfg-appscript-url")?.value.trim();
    let sheetId = document.getElementById("cfg-sheet-id")?.value.trim();
    let mode = document.getElementById("cfg-appscript-mode")?.value;
    if (url) BillDeskAPI.setEndpointUrl(url);
    if (sheetId !== undefined && BillDeskAPI.setSpreadsheetId) BillDeskAPI.setSpreadsheetId(sheetId);
    if (mode) BillDeskAPI.setMode(mode);
    App.showToast("Configuration saved successfully!", "success");
    App.updateEnvIndicator();
  }

  async function testConnection() {
    let resultDiv = document.getElementById("test-conn-result");
    resultDiv.innerHTML = `<span style="color:var(--slate-500);">Connecting to Google Apps Script & Google Sheet...</span>`;
    let res = await BillDeskAPI.ping();
    if (res && res.success) {
      resultDiv.innerHTML = `
        <div class="variance-banner" style="background:#ecfdf5; border-color:#a7f3d0; color:#047857;">
          ✓ Connected Successfully! Spreadsheet: <strong>${res.spreadsheet || "DB"}</strong> (Folder: ${res.attachmentsFolderId || "Configured"})
        </div>`;
    } else {
      resultDiv.innerHTML = `
        <div class="variance-banner alert">
          ✗ Connection Error: ${res.error || "Unable to reach Apps Script"}.<br>
          Please update your Apps Script with the code in <code>backend/Code.gs</code> and ensure SPREADSHEET_ID is set.
        </div>`;
    }
  }

  async function seedSheetData() {
    if (!confirm("This will write initial Company, Vendor, Category, and Bank Account records into your Google Sheet if they are empty. Proceed?")) return;
    App.showToast("Seeding initial masters to Google Sheet...", "info");
    let res = await BillDeskAPI.seedSheetData(BillDeskAuth.getCurrentUser()?.email);
    if (res && res.success) {
      App.showToast("Masters populated in Google Sheet!", "success");
      App.refreshCurrentView();
    } else {
      App.showToast((res && res.error) || "Seeding failed", "error");
    }
  }


  // ==========================================
  // SHEET USERS & ROLES SEEDING
  // ==========================================
  async function setupSheetUsers() {
    if (!confirm("This will configure/update the 10 team users and standard roles in your Google Sheet Users and Roles tables with default password 'Admin@123'. Proceed?")) return;
    App.showToast("Configuring Users and Roles in Google Sheet...", "info");
    try {
      let res = await BillDeskAPI.setupUsersAndRoles();
      if (res && res.success) {
        App.showToast(res.message || "Users setup successfully in Google Sheet!", "success");
        cachedData = await BillDeskAPI.getInitialData();
        let mainContainer = document.getElementById("view-container");
        if (mainContainer) render(mainContainer);
      } else {
        App.showToast((res && res.error) || "Setup failed. Check backend connection.", "error");
      }
    } catch (err) {
      App.showToast("Setup failed: " + err.message, "error");
    }
  }

  // ==========================================
  // COMPANY MODAL & HANDLERS
  // ==========================================
  function editCompany(id) {
    let comp = (cachedData.companies || []).find(c => String(c.CompanyID) === String(id));
    openCompanyModal(comp);
  }

  function openCompanyModal(existingComp = null) {
    let isEdit = Boolean(existingComp && existingComp.CompanyID);
    let comp = existingComp || {};

    let modalHtml = `
      <div class="modal-backdrop active" id="company-modal">
        <div class="modal-dialog">
          <div class="modal-header">
            <div class="modal-title">${isEdit ? 'Edit Company Entity' : 'Register New Company Entity'}</div>
            <button class="modal-close-btn" onclick="App.closeModal('company-modal')">&times;</button>
          </div>
          <form onsubmit="AdminComponent.submitCompany(event, '${isEdit ? comp.CompanyID : ''}')">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Company Name *</label>
                <input type="text" id="m-comp-name" class="form-control" value="${DashboardComponent.escapeHtml(comp.CompanyName || '')}" placeholder="e.g. Gretex Corporate Services Ltd" required>
              </div>
              <div class="form-group">
                <label class="form-label">Short Name / Aliases</label>
                <input type="text" id="m-comp-alias" class="form-control" value="${DashboardComponent.escapeHtml(comp.Aliases || '')}" placeholder="e.g. GCSL, Gretex Corp">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">GSTIN Number</label>
                  <input type="text" id="m-comp-gst" class="form-control" value="${DashboardComponent.escapeHtml(comp.GSTNumber || '')}" placeholder="15-character GSTIN">
                </div>
                <div class="form-group">
                  <label class="form-label">PAN Number</label>
                  <input type="text" id="m-comp-pan" class="form-control" value="${DashboardComponent.escapeHtml(comp.PANNumber || '')}" placeholder="10-digit PAN">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Registered Office Address</label>
                <textarea id="m-comp-addr" class="form-control" rows="2" placeholder="Full address">${DashboardComponent.escapeHtml(comp.Address || '')}</textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal('company-modal')">Cancel</button>
              <button type="submit" class="btn btn-primary" id="m-comp-submit-btn">${isEdit ? 'Update Company' : 'Save Company'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById("modal-container").innerHTML = modalHtml;
  }

  async function submitCompany(event, editId) {
    if (event) event.preventDefault();
    let name = document.getElementById("m-comp-name")?.value.trim();
    let alias = document.getElementById("m-comp-alias")?.value.trim();
    let gst = document.getElementById("m-comp-gst")?.value.trim();
    let pan = document.getElementById("m-comp-pan")?.value.trim();
    let addr = document.getElementById("m-comp-addr")?.value.trim();

    if (!name) return;

    let payload = {
      CompanyName: name,
      Aliases: alias,
      GSTNumber: gst,
      PANNumber: pan,
      Address: addr,
      IsActive: true
    };
    if (editId) payload.CompanyID = editId;

    let btn = document.getElementById("m-comp-submit-btn");
    let origText = btn ? btn.innerHTML : "Save Company";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-block; animation:spin 1s infinite linear; margin-right:6px;">⌛</span> Saving to Google Sheet...`;
    }

    try {
      await BillDeskAPI.saveMaster("Companies", payload, BillDeskAuth.getCurrentUser()?.email);
      if (btn) btn.innerHTML = `✓ Saved to Google Sheet!`;
      App.showToast(`✓ Company '${name}' saved successfully to Google Sheet!`, "success");
      cachedData = await BillDeskAPI.getInitialData();
      setTimeout(() => {
        App.closeModal("company-modal");
        App.refreshCurrentView();
      }, 500);
    } catch (e) {
      App.showToast("Failed to save company: " + e.message, "error");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }
  }

  // ==========================================
  // VENDOR MODAL & HANDLERS
  // ==========================================
  function editVendor(id) {
    let vend = (cachedData.vendors || []).find(v => String(v.VendorID) === String(id));
    openVendorModal(vend);
  }

  function openVendorModal(existingVend = null) {
    let isEdit = Boolean(existingVend && existingVend.VendorID);
    let vend = existingVend || {};

    let modalHtml = `
      <div class="modal-backdrop active" id="vendor-modal">
        <div class="modal-dialog" style="max-width:620px;">
          <div class="modal-header">
            <div class="modal-title">${isEdit ? 'Edit Vendor & Payee' : 'Register Vendor & Payee'}</div>
            <button class="modal-close-btn" onclick="App.closeModal('vendor-modal')">&times;</button>
          </div>
          <form onsubmit="AdminComponent.submitVendor(event, '${isEdit ? vend.VendorID : ''}')">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Vendor / Supplier Name *</label>
                  <input type="text" id="m-vend-name" class="form-control" value="${DashboardComponent.escapeHtml(vend.VendorName || '')}" placeholder="e.g. Tata Power Limited" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Beneficiary Payee Name (Bank) *</label>
                  <input type="text" id="m-vend-payee" class="form-control" value="${DashboardComponent.escapeHtml(vend.PayeeName || vend.VendorName || '')}" placeholder="Official Bank Payee Name" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Short Name / Aliases</label>
                <input type="text" id="m-vend-alias" class="form-control" value="${DashboardComponent.escapeHtml(vend.Aliases || '')}" placeholder="e.g. TATA, TPCL">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Bank Name</label>
                  <input type="text" id="m-vend-bank" class="form-control" value="${DashboardComponent.escapeHtml(vend.BankName || '')}" placeholder="e.g. HDFC Bank, ICICI Bank">
                </div>
                <div class="form-group">
                  <label class="form-label">Bank Account Number</label>
                  <input type="text" id="m-vend-acct" class="form-control" value="${DashboardComponent.escapeHtml(vend.BankAccount || '')}" placeholder="Account number">
                </div>
                <div class="form-group">
                  <label class="form-label">IFSC Code</label>
                  <input type="text" id="m-vend-ifsc" class="form-control" value="${DashboardComponent.escapeHtml(vend.IFSC || '')}" placeholder="e.g. HDFC0000001">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">GSTIN Number</label>
                  <input type="text" id="m-vend-gst" class="form-control" value="${DashboardComponent.escapeHtml(vend.GSTNumber || '')}" placeholder="15-character GSTIN">
                </div>
                <div class="form-group">
                  <label class="form-label">PAN Number</label>
                  <input type="text" id="m-vend-pan" class="form-control" value="${DashboardComponent.escapeHtml(vend.PANNumber || '')}" placeholder="10-digit PAN">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Office Address</label>
                <textarea id="m-vend-addr" class="form-control" rows="2" placeholder="Address, City, State, PIN">${DashboardComponent.escapeHtml(vend.Address || '')}</textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal('vendor-modal')">Cancel</button>
              <button type="submit" class="btn btn-primary" id="m-vend-submit-btn">${isEdit ? 'Update Vendor' : 'Save Vendor'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById("modal-container").innerHTML = modalHtml;
  }

  async function submitVendor(event, editId) {
    if (event) event.preventDefault();
    let name = document.getElementById("m-vend-name")?.value.trim();
    let payee = document.getElementById("m-vend-payee")?.value.trim();
    let alias = document.getElementById("m-vend-alias")?.value.trim();
    let bank = document.getElementById("m-vend-bank")?.value.trim();
    let acct = document.getElementById("m-vend-acct")?.value.trim();
    let ifsc = document.getElementById("m-vend-ifsc")?.value.trim();
    let gst = document.getElementById("m-vend-gst")?.value.trim();
    let pan = document.getElementById("m-vend-pan")?.value.trim();
    let addr = document.getElementById("m-vend-addr")?.value.trim();

    if (!name) return;

    let payload = {
      VendorName: name,
      PayeeName: payee || name,
      Aliases: alias,
      BankName: bank,
      BankAccount: acct,
      IFSC: ifsc,
      GSTNumber: gst,
      PANNumber: pan,
      Address: addr,
      IsActive: true
    };
    if (editId) payload.VendorID = editId;

    let btn = document.getElementById("m-vend-submit-btn");
    let origText = btn ? btn.innerHTML : "Save Vendor";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-block; animation:spin 1s infinite linear; margin-right:6px;">⌛</span> Saving to Google Sheet...`;
    }

    try {
      await BillDeskAPI.saveMaster("Vendors", payload, BillDeskAuth.getCurrentUser()?.email);
      if (btn) btn.innerHTML = `✓ Saved to Google Sheet!`;
      App.showToast(`✓ Vendor '${name}' saved successfully to Google Sheet!`, "success");
      cachedData = await BillDeskAPI.getInitialData();
      setTimeout(() => {
        App.closeModal("vendor-modal");
        App.refreshCurrentView();
      }, 500);
    } catch (e) {
      App.showToast("Failed to save vendor: " + e.message, "error");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }
  }

  // ==========================================
  // CATEGORY MODAL & HANDLERS
  // ==========================================
  function editCategory(id) {
    let cat = (cachedData.categories || []).find(c => String(c.CategoryID) === String(id));
    openCategoryModal(cat);
  }

  function openCategoryModal(existingCat = null) {
    let isEdit = Boolean(existingCat && existingCat.CategoryID);
    let cat = existingCat || {};

    let modalHtml = `
      <div class="modal-backdrop active" id="category-modal">
        <div class="modal-dialog">
          <div class="modal-header">
            <div class="modal-title">${isEdit ? 'Edit Expense Category' : 'Create Expense Category'}</div>
            <button class="modal-close-btn" onclick="App.closeModal('category-modal')">&times;</button>
          </div>
          <form onsubmit="AdminComponent.submitCategory(event, '${isEdit ? cat.CategoryID : ''}')">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Category Name *</label>
                <input type="text" id="m-cat-name" class="form-control" value="${DashboardComponent.escapeHtml(cat.CategoryName || '')}" placeholder="e.g. Office Rent, Cloud Subscriptions, Utilities" required>
              </div>
              <div class="form-group">
                <label class="form-label">Variance Threshold (%)</label>
                <input type="number" id="m-cat-var" class="form-control" value="${cat.VarianceThresholdPct !== undefined ? cat.VarianceThresholdPct : 10}" min="0" max="100" step="0.5" required>
                <div class="form-hint">Bills varying by more than this % from expected amount trigger an operator variance alert.</div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal('category-modal')">Cancel</button>
              <button type="submit" class="btn btn-primary" id="m-cat-submit-btn">${isEdit ? 'Update Category' : 'Save Category'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById("modal-container").innerHTML = modalHtml;
  }

  async function submitCategory(event, editId) {
    if (event) event.preventDefault();
    let name = document.getElementById("m-cat-name")?.value.trim();
    let threshold = parseFloat(document.getElementById("m-cat-var")?.value) || 10;

    if (!name) return;

    let payload = {
      CategoryName: name,
      VarianceThresholdPct: threshold,
      IsActive: true
    };
    if (editId) payload.CategoryID = editId;

    let btn = document.getElementById("m-cat-submit-btn");
    let origText = btn ? btn.innerHTML : "Save Category";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-block; animation:spin 1s infinite linear; margin-right:6px;">⌛</span> Saving to Google Sheet...`;
    }

    try {
      await BillDeskAPI.saveMaster("Categories", payload, BillDeskAuth.getCurrentUser()?.email);
      if (btn) btn.innerHTML = `✓ Saved to Google Sheet!`;
      App.showToast(`✓ Category '${name}' saved successfully to Google Sheet!`, "success");
      cachedData = await BillDeskAPI.getInitialData();
      setTimeout(() => {
        App.closeModal("category-modal");
        App.refreshCurrentView();
      }, 500);
    } catch (e) {
      App.showToast("Failed to save category: " + e.message, "error");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }
  }

  // ==========================================
  // BANK ACCOUNT MODAL & HANDLERS
  // ==========================================
  function editBank(id) {
    let bank = (cachedData.bankAccounts || []).find(b => String(b.BankAccountID) === String(id));
    openBankModal(bank);
  }

  function openBankModal(existingBank = null) {
    let isEdit = Boolean(existingBank && existingBank.BankAccountID);
    let bank = existingBank || {};
    let comps = cachedData.companies || [];

    let modalHtml = `
      <div class="modal-backdrop active" id="bank-modal">
        <div class="modal-dialog" style="max-width:580px;">
          <div class="modal-header">
            <div class="modal-title">${isEdit ? 'Edit Bank Account' : 'Add Company Bank Account'}</div>
            <button class="modal-close-btn" onclick="App.closeModal('bank-modal')">&times;</button>
          </div>
          <form onsubmit="AdminComponent.submitBank(event, '${isEdit ? bank.BankAccountID : ''}')">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Company Entity *</label>
                  <select id="m-bank-comp" class="form-select" required>
                    ${comps.map(c => `
                      <option value="${c.CompanyID}" ${String(c.CompanyID) === String(bank.CompanyID) ? 'selected' : ''}>
                        ${DashboardComponent.escapeHtml(c.CompanyName)}
                      </option>
                    `).join("")}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Account Label / Nickname *</label>
                  <input type="text" id="m-bank-label" class="form-control" value="${DashboardComponent.escapeHtml(bank.AccountLabel || '')}" placeholder="e.g. HDFC Operating Current A/C" required>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Bank Name *</label>
                  <input type="text" id="m-bank-name" class="form-control" value="${DashboardComponent.escapeHtml(bank.BankName || '')}" placeholder="e.g. HDFC Bank" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Account Number *</label>
                  <input type="text" id="m-bank-acct" class="form-control" value="${DashboardComponent.escapeHtml(bank.AccountNumber || '')}" placeholder="Account number" required>
                </div>
                <div class="form-group">
                  <label class="form-label">IFSC Code *</label>
                  <input type="text" id="m-bank-ifsc" class="form-control" value="${DashboardComponent.escapeHtml(bank.IFSC || '')}" placeholder="IFSC Code" required>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Anchor Balance (₹) *</label>
                  <input type="number" id="m-bank-anchor" class="form-control" value="${bank.AnchorBalance !== undefined ? bank.AnchorBalance : 500000}" min="0" step="1" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Reserves (₹)</label>
                  <input type="number" id="m-bank-reserves" class="form-control" value="${bank.Reserves !== undefined ? bank.Reserves : 0}" min="0" step="1">
                </div>
                <div class="form-group">
                  <label class="form-label">Holds / Lien (₹)</label>
                  <input type="number" id="m-bank-holds" class="form-control" value="${bank.Holds !== undefined ? bank.Holds : 0}" min="0" step="1">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal('bank-modal')">Cancel</button>
              <button type="submit" class="btn btn-primary" id="m-bank-submit-btn">${isEdit ? 'Update Bank Account' : 'Save Bank Account'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById("modal-container").innerHTML = modalHtml;
  }

  async function submitBank(event, editId) {
    if (event) event.preventDefault();
    let compId = document.getElementById("m-bank-comp")?.value;
    let label = document.getElementById("m-bank-label")?.value.trim();
    let bankName = document.getElementById("m-bank-name")?.value.trim();
    let acct = document.getElementById("m-bank-acct")?.value.trim();
    let ifsc = document.getElementById("m-bank-ifsc")?.value.trim();
    let anchor = parseFloat(document.getElementById("m-bank-anchor")?.value) || 0;
    let reserves = parseFloat(document.getElementById("m-bank-reserves")?.value) || 0;
    let holds = parseFloat(document.getElementById("m-bank-holds")?.value) || 0;

    if (!label || !bankName || !acct) return;

    let usable = Math.max(0, anchor - reserves - holds);

    let payload = {
      CompanyID: compId,
      AccountLabel: label,
      BankName: bankName,
      AccountNumber: acct,
      IFSC: ifsc,
      AnchorBalance: anchor,
      AnchorDate: new Date().toISOString().slice(0, 10),
      Reserves: reserves,
      Holds: holds,
      UsableBalance: usable,
      IsActive: true
    };
    if (editId) payload.BankAccountID = editId;

    let btn = document.getElementById("m-bank-submit-btn");
    let origText = btn ? btn.innerHTML : "Save Bank Account";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-block; animation:spin 1s infinite linear; margin-right:6px;">⌛</span> Saving to Google Sheet...`;
    }

    try {
      await BillDeskAPI.saveMaster("BankAccounts", payload, BillDeskAuth.getCurrentUser()?.email);
      if (btn) btn.innerHTML = `✓ Saved to Google Sheet!`;
      App.showToast(`✓ Bank account '${label}' saved successfully to Google Sheet!`, "success");
      cachedData = await BillDeskAPI.getInitialData();
      setTimeout(() => {
        App.closeModal("bank-modal");
        App.refreshCurrentView();
      }, 500);
    } catch (e) {
      App.showToast("Failed to save bank account: " + e.message, "error");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }
  }

  // ==========================================
  // USER MODAL & CAPABILITIES HANDLERS
  // ==========================================
  function editUser(id) {
    let user = (cachedData.users || []).find(u => String(u.UserID) === String(id));
    openUserModal(user);
  }

  function onRolePresetChange(role) {
    let enter = document.getElementById("cap-enter");
    let approve = document.getElementById("cap-approve");
    let payInit = document.getElementById("cap-pay-init");
    let payConf = document.getElementById("cap-pay-conf");
    let fin = document.getElementById("cap-finance");
    let masters = document.getElementById("cap-masters");
    let users = document.getElementById("cap-users");
    let rep = document.getElementById("cap-reports");
    let cfg = document.getElementById("cap-config");

    let allCaps = [enter, approve, payInit, payConf, fin, masters, users, rep, cfg];
    allCaps.forEach(cb => { if (cb) cb.checked = false; });

    if (role === "SuperAdmin") {
      allCaps.forEach(cb => { if (cb) cb.checked = true; });
    } else if (role === "Approver") {
      if (approve) approve.checked = true;
      if (rep) rep.checked = true;
    } else if (role === "FinanceUser") {
      if (fin) fin.checked = true;
      if (masters) masters.checked = true;
      if (rep) rep.checked = true;
    } else if (role === "EntryOperator") {
      if (enter) enter.checked = true;
    } else if (role === "PaymentInitiator") {
      if (payInit) payInit.checked = true;
    } else if (role === "PaymentConfirmer") {
      if (payConf) payConf.checked = true;
    }
  }

  function openUserModal(existingUser = null) {
    let isEdit = Boolean(existingUser && existingUser.UserID);
    let u = existingUser || {};

    let userCaps = {};
    if (u.Capabilities) {
      try {
        userCaps = typeof u.Capabilities === "string" ? JSON.parse(u.Capabilities) : u.Capabilities;
      } catch (e) { userCaps = {}; }
    }

    let isSuper = u.IsSuperAdmin === true || String(u.IsSuperAdmin).toLowerCase() === "true";
    let role = u.RoleName || (isSuper ? "SuperAdmin" : "EntryOperator");

    let modalHtml = `
      <div class="modal-backdrop active" id="user-admin-modal">
        <div class="modal-dialog" style="max-width:600px;">
          <div class="modal-header">
            <div class="modal-title">${isEdit ? 'Edit User Account & Permissions' : 'Create New User Account'}</div>
            <button class="modal-close-btn" onclick="App.closeModal('user-admin-modal')">&times;</button>
          </div>
          <form onsubmit="AdminComponent.submitUser(event, '${isEdit ? u.UserID : ''}')">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Display Name *</label>
                  <input type="text" id="m-user-name" class="form-control" value="${DashboardComponent.escapeHtml(u.DisplayName || '')}" placeholder="e.g. Ramesh Sharma" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Work Email *</label>
                  <input type="email" id="m-user-email" class="form-control" value="${DashboardComponent.escapeHtml(u.Email || '')}" placeholder="name@gretexgroup.com" required ${isEdit ? 'readonly' : ''}>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Password *</label>
                  <input type="text" id="m-user-pwd" class="form-control" value="${DashboardComponent.escapeHtml(u.Password || 'Admin@123')}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Role Preset</label>
                  <select id="m-user-role" class="form-select" onchange="AdminComponent.onRolePresetChange(this.value)">
                    <option value="EntryOperator" ${role === 'EntryOperator' ? 'selected' : ''}>Entry Operator</option>
                    <option value="Approver" ${role === 'Approver' ? 'selected' : ''}>Approver</option>
                    <option value="PaymentInitiator" ${role === 'PaymentInitiator' ? 'selected' : ''}>Payment Initiator (Maker)</option>
                    <option value="PaymentConfirmer" ${role === 'PaymentConfirmer' ? 'selected' : ''}>Payment Confirmer (Checker)</option>
                    <option value="FinanceUser" ${role === 'FinanceUser' ? 'selected' : ''}>Finance User</option>
                    <option value="SuperAdmin" ${role === 'SuperAdmin' ? 'selected' : ''}>SuperAdmin (Full Control)</option>
                  </select>
                </div>
              </div>
              <div class="form-group" style="margin-top:0.75rem;">
                <label class="form-label">Granted Capabilities (Fine-grained Permissions)</label>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.4rem; font-size:0.82rem; background:var(--slate-50); padding:0.75rem; border-radius:var(--radius-sm); border:1px solid var(--slate-200);">
                  <label style="display:flex; align-items:center; gap:0.4rem;">
                    <input type="checkbox" id="cap-enter" ${userCaps.CanEnterBills || role === 'EntryOperator' || isSuper ? 'checked' : ''}> Can Enter Bills (Operator)
                  </label>
                  <label style="display:flex; align-items:center; gap:0.4rem;">
                    <input type="checkbox" id="cap-approve" ${userCaps.CanApproveBills || role === 'Approver' || isSuper ? 'checked' : ''}> Can Approve Bills (Approver)
                  </label>
                  <label style="display:flex; align-items:center; gap:0.4rem;">
                    <input type="checkbox" id="cap-pay-init" ${userCaps.CanInitiatePayments || role === 'PaymentInitiator' || isSuper ? 'checked' : ''}> Can Initiate Payments (Maker)
                  </label>
                  <label style="display:flex; align-items:center; gap:0.4rem;">
                    <input type="checkbox" id="cap-pay-conf" ${userCaps.CanConfirmPayments || role === 'PaymentConfirmer' || isSuper ? 'checked' : ''}> Can Confirm Payments (Checker)
                  </label>
                  <label style="display:flex; align-items:center; gap:0.4rem;">
                    <input type="checkbox" id="cap-finance" ${userCaps.CanViewFinance || role === 'FinanceUser' || isSuper ? 'checked' : ''}> Can View Finance (Shortfall)
                  </label>
                  <label style="display:flex; align-items:center; gap:0.4rem;">
                    <input type="checkbox" id="cap-masters" ${userCaps.CanManageMasters || role === 'FinanceUser' || isSuper ? 'checked' : ''}> Can Manage Masters
                  </label>
                  <label style="display:flex; align-items:center; gap:0.4rem;">
                    <input type="checkbox" id="cap-users" ${userCaps.CanManageUsers || isSuper ? 'checked' : ''}> Can Manage Users
                  </label>
                  <label style="display:flex; align-items:center; gap:0.4rem;">
                    <input type="checkbox" id="cap-reports" ${userCaps.CanViewReports || role === 'Approver' || role === 'FinanceUser' || isSuper ? 'checked' : ''}> Can View Reports & Audit
                  </label>
                  <label style="display:flex; align-items:center; gap:0.4rem;">
                    <input type="checkbox" id="cap-config" ${userCaps.CanManageConfig || isSuper ? 'checked' : ''}> Can Manage Config
                  </label>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="App.closeModal('user-admin-modal')">Cancel</button>
              <button type="submit" class="btn btn-primary" id="m-user-submit-btn">${isEdit ? 'Update User' : 'Save User'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById("modal-container").innerHTML = modalHtml;
  }

  async function submitUser(event, editId) {
    if (event) event.preventDefault();
    let name = document.getElementById("m-user-name")?.value.trim();
    let email = document.getElementById("m-user-email")?.value.trim();
    let pwd = document.getElementById("m-user-pwd")?.value;
    let role = document.getElementById("m-user-role")?.value;

    if (!name || !email || !pwd) return;

    let isSuper = (role === "SuperAdmin");

    let capabilities = {
      CanEnterBills: isSuper || Boolean(document.getElementById("cap-enter")?.checked),
      CanApproveBills: isSuper || Boolean(document.getElementById("cap-approve")?.checked),
      CanInitiatePayments: isSuper || Boolean(document.getElementById("cap-pay-init")?.checked),
      CanConfirmPayments: isSuper || Boolean(document.getElementById("cap-pay-conf")?.checked),
      CanViewFinance: isSuper || Boolean(document.getElementById("cap-finance")?.checked),
      CanManageMasters: isSuper || Boolean(document.getElementById("cap-masters")?.checked),
      CanManageUsers: isSuper || Boolean(document.getElementById("cap-users")?.checked),
      CanViewReports: isSuper || Boolean(document.getElementById("cap-reports")?.checked),
      CanManageConfig: isSuper || Boolean(document.getElementById("cap-config")?.checked)
    };

    let payload = {
      DisplayName: name,
      Email: email.toLowerCase(),
      RoleName: role,
      RoleID: "role-" + role.toLowerCase(),
      Password: pwd,
      Capabilities: capabilities,
      IsSuperAdmin: isSuper,
      IsActive: true
    };
    if (editId) payload.UserID = editId;

    let btn = document.getElementById("m-user-submit-btn");
    let origText = btn ? btn.innerHTML : "Save User";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-block; animation:spin 1s infinite linear; margin-right:6px;">⌛</span> Saving to Google Sheet...`;
    }

    try {
      await BillDeskAPI.saveMaster("Users", payload, BillDeskAuth.getCurrentUser()?.email);
      if (btn) btn.innerHTML = `✓ Saved to Google Sheet!`;
      App.showToast(`✓ User '${name}' saved successfully to Google Sheet!`, "success");
      cachedData = await BillDeskAPI.getInitialData();
      setTimeout(() => {
        App.closeModal("user-admin-modal");
        App.refreshCurrentView();
      }, 500);
    } catch (e) {
      App.showToast("Failed to save user: " + e.message, "error");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }
  }

  // ==========================================
  // BULK CSV / EXCEL IMPORT SYSTEM
  // ==========================================
  const IMPORT_CONFIGS = {
    Companies: {
      title: "Companies",
      entity: "Company",
      filename: "Companies_Import_Template.csv",
      headers: ["Company Name", "Short Name / Aliases", "GSTIN", "PAN", "Registered Address"],
      sample: [
        ["Gretex Corporate Services Ltd", "GCSL", "19AAACG1234F1Z5", "AAACG1234F", "Office 401, Corporate Hub, Kolkata"],
        ["Gretex Industries Ltd", "GIL", "19AAACG9999F1Z2", "AAACG9999F", "12 Park Street, Kolkata"]
      ],
      previewCols: [
        { label: "Company Name", key: "CompanyName" },
        { label: "Alias", key: "Aliases" },
        { label: "GSTIN", key: "GSTNumber" },
        { label: "PAN", key: "PANNumber" }
      ],
      mapRow: function (r) {
        let name = r["company name"] || r["companyname"] || r["company"] || r["name"] || "";
        if (!name) return null;
        return {
          CompanyName: name,
          Aliases: r["short name / aliases"] || r["aliases"] || r["alias"] || r["short name"] || "",
          GSTNumber: r["gstin"] || r["gst number"] || r["gst"] || "",
          PANNumber: r["pan"] || r["pan number"] || "",
          Address: r["registered address"] || r["address"] || "",
          IsActive: true
        };
      }
    },
    Vendors: {
      title: "Vendors & Payees",
      entity: "Vendor",
      filename: "Vendors_Import_Template.csv",
      headers: ["Vendor Name", "Beneficiary Payee Name", "Short Name / Aliases", "Bank Name", "Bank Account Number", "IFSC Code", "GSTIN", "PAN", "Address"],
      sample: [
        ["Tata Tele Business Services", "Tata Teleservices Ltd", "Tata Tele", "HDFC Bank", "50200098765432", "HDFC0000001", "27AAACT1234E1Z1", "AAACT1234E", "Mumbai, Maharashtra"],
        ["Amazon Web Services India", "AWS India Cloud Pvt Ltd", "AWS", "ICICI Bank", "002105009876", "ICIC0000021", "27AABCA1234F1Z9", "AABCA1234F", "Bengaluru, Karnataka"]
      ],
      previewCols: [
        { label: "Vendor Name", key: "VendorName" },
        { label: "Payee Name", key: "PayeeName" },
        { label: "Bank Name", key: "BankName" },
        { label: "Account #", key: "BankAccount" },
        { label: "IFSC", key: "IFSC" }
      ],
      mapRow: function (r) {
        let name = r["vendor name"] || r["vendorname"] || r["vendor"] || r["name"] || "";
        if (!name) return null;
        return {
          VendorName: name,
          PayeeName: r["beneficiary payee name"] || r["payee name"] || r["payee"] || name,
          Aliases: r["short name / aliases"] || r["aliases"] || r["alias"] || "",
          BankName: r["bank name"] || r["bank"] || "",
          BankAccount: r["bank account number"] || r["bank account"] || r["account number"] || r["account"] || "",
          IFSC: r["ifsc code"] || r["ifsc"] || "",
          GSTNumber: r["gstin"] || r["gst number"] || r["gst"] || "",
          PANNumber: r["pan"] || r["pan number"] || "",
          Address: r["address"] || "",
          IsActive: true
        };
      }
    },
    Categories: {
      title: "Expense Categories",
      entity: "Category",
      filename: "Expense_Categories_Template.csv",
      headers: ["Category Name", "Variance Threshold %"],
      sample: [
        ["Office Rent & Maintenance", "10"],
        ["Cloud & Telecom Subscriptions", "15"],
        ["Statutory Audit & Legal Fees", "5"]
      ],
      previewCols: [
        { label: "Category Name", key: "CategoryName" },
        { label: "Variance Threshold %", key: "VarianceThresholdPct" }
      ],
      mapRow: function (r) {
        let name = r["category name"] || r["categoryname"] || r["category"] || r["name"] || "";
        if (!name) return null;
        let thresh = parseFloat(r["variance threshold %"] || r["variance threshold"] || r["threshold"] || 10);
        return {
          CategoryName: name,
          VarianceThresholdPct: isNaN(thresh) ? 10 : thresh,
          IsActive: true
        };
      }
    },
    BankAccounts: {
      title: "Bank Accounts",
      entity: "Bank Account",
      filename: "Bank_Accounts_Template.csv",
      headers: ["Company Name", "Account Label", "Bank Name", "Account Number", "IFSC Code", "Opening Anchor Balance", "Minimum Reserves", "Holds"],
      sample: [
        ["Gretex Corporate Services Ltd", "HDFC Main Operating", "HDFC Bank", "50200012345678", "HDFC0000001", "2500000", "200000", "0"],
        ["Gretex Industries Ltd", "ICICI Current Account", "ICICI Bank", "002105001234", "ICIC0000021", "1500000", "100000", "0"]
      ],
      previewCols: [
        { label: "Account Label", key: "AccountLabel" },
        { label: "Bank Name", key: "BankName" },
        { label: "Account #", key: "AccountNumber" },
        { label: "Anchor Bal", key: "AnchorBalance" },
        { label: "Reserves", key: "Reserves" }
      ],
      mapRow: function (r) {
        let label = r["account label"] || r["label"] || r["account name"] || "";
        let acct = r["account number"] || r["account"] || r["acct"] || "";
        if (!label && !acct) return null;

        let compName = r["company name"] || r["company"] || "";
        let comps = cachedData.companies || [];
        let matchedComp = comps.find(c => String(c.CompanyName).trim().toLowerCase() === compName.trim().toLowerCase());
        let compId = matchedComp ? matchedComp.CompanyID : (comps[0] ? comps[0].CompanyID : "");

        let anchor = parseFloat(r["opening anchor balance"] || r["anchor balance"] || r["balance"] || 0) || 0;
        let reserves = parseFloat(r["minimum reserves"] || r["reserves"] || 0) || 0;
        let holds = parseFloat(r["holds"] || r["lien"] || 0) || 0;
        let usable = Math.max(0, anchor - reserves - holds);

        return {
          CompanyID: compId,
          AccountLabel: label || (r["bank name"] ? r["bank name"] + " " + acct : "Account " + acct),
          BankName: r["bank name"] || r["bank"] || "",
          AccountNumber: acct,
          IFSC: r["ifsc code"] || r["ifsc"] || "",
          AnchorBalance: anchor,
          AnchorDate: new Date().toISOString().slice(0, 10),
          Reserves: reserves,
          Holds: holds,
          UsableBalance: usable,
          IsActive: true
        };
      }
    }
  };

  let activeImportRows = [];
  let activeImportType = "";

  function openImportModal(type) {
    let cfg = IMPORT_CONFIGS[type];
    if (!cfg) return;

    activeImportRows = [];
    activeImportType = type;

    let modalHtml = `
      <div class="modal-backdrop active" id="import-modal">
        <div class="modal-dialog" style="max-width:680px;">
          <div class="modal-header">
            <div class="modal-title">Bulk Import ${DashboardComponent.escapeHtml(cfg.title)}</div>
            <button class="modal-close-btn" onclick="App.closeModal('import-modal')">&times;</button>
          </div>
          <div class="modal-body">
            <!-- Step 1: Download Template -->
            <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:0.85rem 1rem; margin-bottom:1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
              <div>
                <div style="font-weight:700; font-size:0.88rem; color:var(--navy-900);">Step 1: Download Standard Template</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">Use our sample template to format your Excel or CSV data.</div>
              </div>
              <button type="button" class="btn btn-sm btn-secondary" onclick="AdminComponent.downloadSampleTemplate('${type}')">
                📥 Download Template (.csv)
              </button>
            </div>

            <!-- Step 2: Upload File -->
            <div class="form-group" style="margin-bottom:1rem;">
              <label class="form-label" style="font-weight:700;">Step 2: Upload CSV or Excel (.xlsx, .xls, .csv)</label>
              <input type="file" id="import-file-input" class="form-control" accept=".csv, .xlsx, .xls" onchange="AdminComponent.handleImportFileSelect(event, '${type}')">
            </div>

            <!-- Paste CSV Alternative -->
            <div class="form-group" style="margin-bottom:1.25rem;">
              <details>
                <summary style="font-size:0.8rem; color:var(--slate-600); cursor:pointer; font-weight:600; margin-bottom:0.5rem;">
                  Or paste CSV text manually
                </summary>
                <textarea id="import-csv-text" class="form-control" rows="3" placeholder="Paste CSV text here including header row..." oninput="AdminComponent.handleImportTextPaste(event, '${type}')" style="font-family:monospace; font-size:0.75rem;"></textarea>
              </details>
            </div>

            <!-- Step 3: Live Preview -->
            <div id="import-preview-area">
              <div style="padding:1.5rem; text-align:center; color:var(--slate-400); background:var(--slate-50); border:1px dashed var(--slate-300); border-radius:var(--radius-md);">
                Upload a file or paste data above to preview records before saving.
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeModal('import-modal')">Cancel</button>
            <button type="button" class="btn btn-primary" id="import-confirm-btn" onclick="AdminComponent.submitImport('${type}')" disabled>
              Confirm & Import (0 Records)
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById("modal-container").innerHTML = modalHtml;
  }

  function downloadSampleTemplate(type) {
    let cfg = IMPORT_CONFIGS[type];
    if (!cfg) return;

    let csvContent = cfg.headers.map(escapeCsvVal).join(",") + "\n";
    cfg.sample.forEach(row => {
      csvContent += row.map(escapeCsvVal).join(",") + "\n";
    });

    let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    let link = document.createElement("a");
    let url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", cfg.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    App.showToast(`Template downloaded: ${cfg.filename}`, "info");
  }

  function escapeCsvVal(val) {
    let s = String(val === undefined || val === null ? "" : val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function handleImportFileSelect(event, type) {
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
          processParsedRows(normalized, type);
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
          processParsedRows(rows, type);
        } catch (err) {
          App.showToast("Failed to parse CSV file: " + err.message, "error");
        }
      };
      reader.readAsText(file);
    }
  }

  function handleImportTextPaste(event, type) {
    let text = event.target.value.trim();
    if (!text) {
      renderImportPreview([], type);
      return;
    }
    let rows = parseCsvText(text);
    processParsedRows(rows, type);
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

  function processParsedRows(rawRows, type) {
    let cfg = IMPORT_CONFIGS[type];
    if (!cfg) return;

    let validRows = [];
    for (let r of rawRows) {
      let mapped = cfg.mapRow(r);
      if (mapped) validRows.push(mapped);
    }

    activeImportRows = validRows;
    activeImportType = type;
    renderImportPreview(validRows, type);
  }

  function renderImportPreview(rows, type) {
    let container = document.getElementById("import-preview-area");
    let btn = document.getElementById("import-confirm-btn");
    let cfg = IMPORT_CONFIGS[type];

    if (!container) return;

    if (!rows || rows.length === 0) {
      container.innerHTML = `
        <div style="padding:1.5rem; text-align:center; color:var(--slate-400); background:var(--slate-50); border:1px dashed var(--slate-300); border-radius:var(--radius-md);">
          No valid records detected yet. Please upload a CSV/Excel file or paste CSV text above.
        </div>
      `;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `Confirm & Import (0 Records)`;
      }
      return;
    }

    let cols = cfg.previewCols || [];
    let previewHtml = `
      <div style="margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:700; color:#059669; font-size:0.9rem;">
          ✓ Found ${rows.length} valid ${cfg.title} ready to import:
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
      btn.innerHTML = `Confirm & Import ${rows.length} ${cfg.title} to Google Sheet`;
    }
  }

  async function submitImport(type) {
    let cfg = IMPORT_CONFIGS[type];
    let btn = document.getElementById("import-confirm-btn");
    let origText = btn ? btn.innerHTML : "Confirm & Import";

    if (!activeImportRows || activeImportRows.length === 0) {
      App.showToast("No valid records to import.", "warning");
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-block; animation:spin 1s infinite linear; margin-right:6px;">⌛</span> Importing ${activeImportRows.length} records to Google Sheet...`;
    }

    try {
      let res = await BillDeskAPI.importMasters(type, activeImportRows, BillDeskAuth.getCurrentUser()?.email);
      let count = (res && res.count) || activeImportRows.length;

      if (btn) btn.innerHTML = `✓ Imported ${count} records!`;
      App.showToast(`✓ Successfully imported ${count} ${cfg.title} to Google Sheet!`, "success");

      cachedData = await BillDeskAPI.getInitialData();
      setTimeout(() => {
        App.closeModal("import-modal");
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
    switchTab: switchTab,
    saveSettings: saveSettings,
    testConnection: testConnection,
    setupSheetUsers: setupSheetUsers,
    openCompanyModal: openCompanyModal,
    editCompany: editCompany,
    submitCompany: submitCompany,
    openVendorModal: openVendorModal,
    editVendor: editVendor,
    submitVendor: submitVendor,
    openCategoryModal: openCategoryModal,
    editCategory: editCategory,
    submitCategory: submitCategory,
    openBankModal: openBankModal,
    editBank: editBank,
    submitBank: submitBank,
    openUserModal: openUserModal,
    editUser: editUser,
    onRolePresetChange: onRolePresetChange,
    submitUser: submitUser,
    openImportModal: openImportModal,
    downloadSampleTemplate: downloadSampleTemplate,
    handleImportFileSelect: handleImportFileSelect,
    handleImportTextPaste: handleImportTextPaste,
    submitImport: submitImport
  };
})();

