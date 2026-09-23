/**
 * BillDesk Core Application Controller
 * Handles SPA navigation, views, modal state, toast alerts,
 * user switcher, and capability-based navigation gating.
 */

const App = (function () {
  let currentView = "dashboard";

  const VIEWS = {
    dashboard: DashboardComponent,
    recurring: RecurringComponent,
    operator: OperatorComponent,
    approval: ApprovalComponent,
    payment: PaymentComponent,
    fund_report: FundReportComponent,
    admin: AdminComponent,
    audit: AuditComponent
  };

  async function init() {
    updateUserInfo();
    updateEnvIndicator();
    bindNavEvents();

    // Check authentication
    if (!BillDeskAuth.isAuthenticated()) {
      showLoginScreen();
    } else {
      hideLoginScreen();
      updateSidebarVisibility();

      // Initialize encrypted data engine for existing session (page refresh / F5)
      let user = BillDeskAuth.getCurrentUser();
      if (user && typeof CryptoStore !== "undefined") {
        await CryptoStore.init({ email: user.email, userId: user.userId });
      }
      if (typeof BillDeskDataStore !== "undefined") {
        await BillDeskDataStore.init();
      }
      
      // Restore active view on browser refresh (F5) or direct hash link
      let hashView = (location.hash || "").replace(/^#\/?/, "").trim();
      let savedView = "";
      try {
        savedView = localStorage.getItem("billdesk_active_view") || "";
      } catch (e) {}

      let targetView = (hashView && VIEWS[hashView]) ? hashView : ((savedView && VIEWS[savedView]) ? savedView : "");
      if (targetView && VIEWS[targetView]) {
        navigateTo(targetView);
      } else {
        navigateToDefaultView();
      }
    }

    // Subscribe to DataStore sync events for UI indicators
    if (typeof BillDeskDataStore !== "undefined") {
      BillDeskDataStore.subscribe(function (event, payload) {
        let dot = document.getElementById("env-status-dot");
        let label = document.getElementById("env-status-label");
        if (event === "sync_start") {
          if (dot) dot.style.backgroundColor = "#f59e0b";
          if (label) label.textContent = "Syncing...";
        } else if (event === "sync_success") {
          if (dot) dot.style.backgroundColor = "#10b981";
          if (label) label.textContent = "Live Backend";
          if (payload && !payload.silent) {
            showToast("✓ Data synced from Google Sheets (" + (payload.count || 0) + " records)", "success");
          }
        } else if (event === "sync_error") {
          if (dot) dot.style.backgroundColor = "#ef4444";
          if (label) label.textContent = "Sync Error";
          if (payload && !payload.silent) {
            showToast("⚠ Sync failed: " + (payload.error || "Unknown error"), "error");
          }
          // Reset indicator after 3 seconds
          setTimeout(function () {
            if (dot) dot.style.backgroundColor = "#10b981";
            if (label) label.textContent = "Live Backend";
          }, 3000);
        }
      });
    }

    // Listen for hashchange (e.g. browser back/forward or direct hash navigation)
    window.addEventListener("hashchange", () => {
      if (BillDeskAuth.isAuthenticated()) {
        let hashView = (location.hash || "").replace(/^#\/?/, "").trim();
        if (hashView && VIEWS[hashView] && hashView !== currentView) {
          navigateTo(hashView);
        }
      }
    });

    // Listen for auth state changes
    window.addEventListener("billdesk-auth-changed", () => {
      updateUserInfo();
      if (!BillDeskAuth.isAuthenticated()) {
        showLoginScreen();
      } else {
        hideLoginScreen();
        updateSidebarVisibility();
        refreshCurrentView();
      }
    });
  }

  function showLoginScreen() {
    let screen = document.getElementById("login-screen");
    let appContainer = document.getElementById("app-container");
    let headerControls = document.querySelector(".header-controls");
    if (screen) screen.style.display = "flex";
    if (appContainer) appContainer.style.display = "none";
    if (headerControls) headerControls.style.display = "none";
  }

  function hideLoginScreen() {
    let screen = document.getElementById("login-screen");
    let appContainer = document.getElementById("app-container");
    let headerControls = document.querySelector(".header-controls");
    if (screen) screen.style.display = "none";
    if (appContainer) appContainer.style.display = "flex";
    if (headerControls) headerControls.style.display = "flex";
  }

  function fillLogin(email, password) {
    let emailInput = document.getElementById("login-email");
    let pwdInput = document.getElementById("login-password");
    if (emailInput) emailInput.value = email;
    if (pwdInput) pwdInput.value = password;
    let errAlert = document.getElementById("login-error-alert");
    if (errAlert) errAlert.style.display = "none";
  }

  async function handleLoginSubmit(event) {
    if (event) event.preventDefault();
    let emailInput = document.getElementById("login-email");
    let pwdInput = document.getElementById("login-password");
    let submitBtn = document.getElementById("login-submit-btn");
    let errAlert = document.getElementById("login-error-alert");

    let email = emailInput ? emailInput.value.trim() : "";
    let password = pwdInput ? pwdInput.value : "";

    if (!email || !password) {
      if (errAlert) {
        errAlert.textContent = "Please enter both work email and password.";
        errAlert.style.display = "block";
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Verifying credentials...</span>`;
    }
    if (errAlert) errAlert.style.display = "none";

    try {
      let res = await BillDeskAuth.login(email, password);
      if (res && res.success) {
        hideLoginScreen();
        updateUserInfo();
        updateSidebarVisibility();
        showToast(`Welcome back, ${res.user.displayName || "User"}!`, "success");
        navigateToDefaultView();
      } else {
        if (errAlert) {
          errAlert.textContent = (res && res.error) || "Access denied. Invalid credentials or user not registered.";
          errAlert.style.display = "block";
        }
      }
    } catch (err) {
      if (errAlert) {
        errAlert.textContent = "Connection error: " + err.message;
        errAlert.style.display = "block";
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Sign In to BillDesk</span>`;
      }
    }
  }

  function navigateToDefaultView() {
    let user = BillDeskAuth.getCurrentUser();
    if (!user) {
      showLoginScreen();
      return;
    }

    // Direct user to most relevant workspace view based on role
    if (user.isSuperAdmin) {
      navigateTo("dashboard");
    } else if (BillDeskAuth.hasCapability("CanEnterBills")) {
      navigateTo("operator");
    } else if (BillDeskAuth.hasCapability("CanApproveBills")) {
      navigateTo("approval");
    } else if (BillDeskAuth.hasCapability("CanInitiatePayments") || BillDeskAuth.hasCapability("CanConfirmPayments")) {
      navigateTo("payment");
    } else if (BillDeskAuth.hasCapability("CanViewFinance")) {
      navigateTo("fund_report");
    } else {
      navigateTo("dashboard");
    }
  }

  function updateSidebarVisibility() {
    let user = BillDeskAuth.getCurrentUser();
    if (!user) return;

    let items = document.querySelectorAll(".nav-item[data-capability]");
    items.forEach(item => {
      let caps = item.getAttribute("data-capability").split(",");
      let allowed = user.isSuperAdmin;
      if (!allowed) {
        for (let cap of caps) {
          if (BillDeskAuth.hasCapability(cap.trim())) {
            allowed = true;
            break;
          }
        }
      }
      item.style.display = allowed ? "" : "none";
    });

    // Check section header visibility
    let opsItems = document.querySelectorAll("#nav-group-ops + .nav-menu .nav-item");
    let hasVisibleOps = false;
    opsItems.forEach(el => { if (el.style.display !== "none") hasVisibleOps = true; });
    let opsTitle = document.getElementById("nav-group-ops");
    if (opsTitle) opsTitle.style.display = hasVisibleOps ? "" : "none";

    let adminItems = document.querySelectorAll("#nav-group-admin + .nav-menu .nav-item");
    let hasVisibleAdmin = false;
    adminItems.forEach(el => { if (el.style.display !== "none") hasVisibleAdmin = true; });
    let adminTitle = document.getElementById("nav-group-admin");
    if (adminTitle) adminTitle.style.display = hasVisibleAdmin ? "" : "none";
  }

  function bindNavEvents() {
    document.querySelectorAll(".nav-link[data-view]").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        let targetView = link.getAttribute("data-view");
        navigateTo(targetView);
      });
    });
  }

  function navigateTo(viewName) {
    if (!BillDeskAuth.isAuthenticated()) {
      showLoginScreen();
      return;
    }

    if (!VIEWS[viewName]) viewName = "dashboard";

    // Capability check for gated views (Rule R-01 Default Deny)
    let user = BillDeskAuth.getCurrentUser();
    let isSuper = user && (user.isSuperAdmin === true || String(user.isSuperAdmin).toLowerCase() === "true");

    if (!isSuper) {
      if (viewName === "admin" && !BillDeskAuth.hasCapability("CanManageUsers") && !BillDeskAuth.hasCapability("CanManageMasters")) {
        showToast("Access Denied: Administration requires management capabilities.", "warning");
        navigateToDefaultView();
        return;
      }
      if (viewName === "operator" && !BillDeskAuth.hasCapability("CanEnterBills")) {
        showToast("Access Denied: Operator workbench requires Bill Entry capability.", "warning");
        navigateToDefaultView();
        return;
      }
      if (viewName === "approval" && !BillDeskAuth.hasCapability("CanApproveBills")) {
        showToast("Access Denied: Approval workbench requires Bill Approval capability.", "warning");
        navigateToDefaultView();
        return;
      }
      if (viewName === "payment" && !BillDeskAuth.hasCapability("CanInitiatePayments") && !BillDeskAuth.hasCapability("CanConfirmPayments")) {
        showToast("Access Denied: Payment workbench requires payment permissions.", "warning");
        navigateToDefaultView();
        return;
      }
      if (viewName === "recurring" && !BillDeskAuth.hasCapability("CanManageMasters")) {
        showToast("Access Denied: Recurring Schedules require Master management capability.", "warning");
        navigateToDefaultView();
        return;
      }
      if (viewName === "fund_report" && !BillDeskAuth.hasCapability("CanViewReports") && !BillDeskAuth.hasCapability("CanViewFinance")) {
        showToast("Access Denied: Fund Requirement Report requires Finance/Reports capability.", "warning");
        navigateToDefaultView();
        return;
      }
      if (viewName === "audit" && !BillDeskAuth.hasCapability("CanViewReports")) {
        showToast("Access Denied: Audit log requires report viewing capability.", "warning");
        navigateToDefaultView();
        return;
      }
    }

    currentView = viewName;
    try {
      localStorage.setItem("billdesk_active_view", viewName);
      if ((location.hash || "").replace(/^#\/?/, "") !== viewName) {
        history.replaceState(null, "", "#" + viewName);
      }
    } catch (e) {}

    // Update active class in sidebar
    document.querySelectorAll(".nav-link").forEach(link => {
      if (link.getAttribute("data-view") === viewName) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // Render component
    let container = document.getElementById("view-container");
    if (container) {
      if (typeof BillDeskDataStore === "undefined" || !BillDeskDataStore.isLoaded) {
        container.innerHTML = getSmartLoadingHtml();
      }
      VIEWS[viewName].render(container);
    }
  }

  function getSmartLoadingHtml() {
    return `
      <div class="smart-loading-container">
        <div class="smart-loading-card">
          <div class="smart-loading-icon-wrap">
            <div class="smart-loading-spin-ring"></div>
            <div class="smart-loading-logo">BD</div>
          </div>
          <div class="smart-loading-title">We are loading your data...</div>
          <div class="smart-loading-subtitle">Syncing live database with Google Sheets</div>
          <div class="smart-loading-bar-track">
            <div class="smart-loading-bar-fill"></div>
          </div>
          <div class="smart-loading-footer">
            <span class="smart-loading-dot"></span>
            <span>Connecting securely to BillDesk Live Backend</span>
          </div>
        </div>
      </div>
    `;
  }


  function refreshCurrentView() {
    let container = document.getElementById("view-container");
    if (container && VIEWS[currentView]) {
      VIEWS[currentView].render(container);
    }
  }

  function updateUserInfo() {
    let user = BillDeskAuth.getCurrentUser();
    let nameElems = [document.getElementById("sidebar-user-name"), document.getElementById("header-user-name")];
    let roleElems = [document.getElementById("sidebar-user-role"), document.getElementById("header-user-role")];
    let avatarElems = [document.getElementById("sidebar-user-avatar"), document.getElementById("header-user-avatar")];

    let dispName = user ? (user.displayName || "User") : "Sign In";
    let dispRole = user ? (user.roleName || (user.isSuperAdmin ? "SuperAdmin" : "User")) : "Default Deny";
    let dispInitial = (dispName || "U").charAt(0).toUpperCase();

    nameElems.forEach(el => { if (el) el.textContent = dispName; });
    roleElems.forEach(el => { if (el) el.textContent = dispRole; });
    avatarElems.forEach(el => { if (el) el.textContent = dispInitial; });
  }

  function updateEnvIndicator() {
    let mode = BillDeskAPI.getMode();
    let dot = document.getElementById("env-status-dot");
    let label = document.getElementById("env-status-label");

    if (dot && label) {
      if (mode === "live") {
        dot.className = "status-dot";
        label.textContent = "Live Backend";
      } else {
        dot.className = "status-dot offline";
        label.textContent = "Local Pilot Storage";
      }
    }
  }

  function toggleEnvMode() {
    let current = BillDeskAPI.getMode();
    let next = (current === "live") ? "local" : "live";
    BillDeskAPI.setMode(next);
    updateEnvIndicator();
    showToast(`Switched backend to: ${next === "live" ? "Live Google Apps Script" : "Local Pilot Storage"}`, "info");
    refreshCurrentView();
  }

  function openUserSwitcherModal() {
    let currentUser = BillDeskAuth.getCurrentUser();
    let modalHtml = `
      <div class="modal-backdrop active" id="user-modal">
        <div class="modal-dialog">
          <div class="modal-header">
            <div class="modal-title">Switch Active Role / User</div>
            <button class="modal-close-btn" onclick="App.closeModal('user-modal')">&times;</button>
          </div>
          <div class="modal-body">
            <p style="font-size:0.85rem; color:var(--slate-600); margin-bottom:1rem;">
              Test different roles and verify capability restrictions, rule R-01 (default deny), and rule R-07 (independent confirmation maker-checker):
            </p>

            <div style="display:flex; flex-direction:column; gap:0.5rem;">
              <button class="btn btn-secondary" style="justify-content:flex-start; text-align:left;" onclick="App.switchTestUser('admin')">
                <div>
                  <strong>Super Admin (admin@gretex.com)</strong>
                  <div style="font-size:0.75rem; color:var(--slate-500);">Full configuration, users, masters, overrides (Protected)</div>
                </div>
              </button>

              <button class="btn btn-secondary" style="justify-content:flex-start; text-align:left;" onclick="App.switchTestUser('operator')">
                <div>
                  <strong>Entry Operator (operator1@gretex.com)</strong>
                  <div style="font-size:0.75rem; color:var(--slate-500);">Bill entry, invoice upload, variance check, submit for approval</div>
                </div>
              </button>

              <button class="btn btn-secondary" style="justify-content:flex-start; text-align:left;" onclick="App.switchTestUser('approver')">
                <div>
                  <strong>Approver (approver1@gretex.com)</strong>
                  <div style="font-size:0.75rem; color:var(--slate-500);">Document review, last 3 payments comparison, Approve/Return/Reject</div>
                </div>
              </button>

              <button class="btn btn-secondary" style="justify-content:flex-start; text-align:left;" onclick="App.switchTestUser('maker')">
                <div>
                  <strong>Payment Initiator / Maker (maker1@gretex.com)</strong>
                  <div style="font-size:0.75rem; color:var(--slate-500);">Initiate payment with UTR reference and receipt proof</div>
                </div>
              </button>

              <button class="btn btn-secondary" style="justify-content:flex-start; text-align:left;" onclick="App.switchTestUser('checker')">
                <div>
                  <strong>Payment Confirmer / Checker (checker2@gretex.com)</strong>
                  <div style="font-size:0.75rem; color:var(--slate-500);">Independent confirmation of payments initiated by other users (R-07)</div>
                </div>
              </button>

              <button class="btn btn-secondary" style="justify-content:flex-start; text-align:left;" onclick="App.switchTestUser('finance')">
                <div>
                  <strong>Finance Lead (finance@gretex.com)</strong>
                  <div style="font-size:0.75rem; color:var(--slate-500);">Daily fund requirement reporting, bank anchors, shortfall planning</div>
                </div>
              </button>
            </div>

            <div class="modal-footer" style="margin: 1.5rem -1.5rem -1.5rem -1.5rem;">
              <button class="btn btn-secondary" onclick="App.closeModal('user-modal')">Cancel</button>
              <button class="btn btn-danger" onclick="App.logoutUser()">Sign Out</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById("modal-container").innerHTML = modalHtml;
  }

  function switchTestUser(roleType) {
    let testUsers = {
      admin: {
        userId: "c4b71fd0-0dfd-4d8e-848b-daa616496dd8",
        email: "admin@gretex.com",
        displayName: "Super Admin",
        isSuperAdmin: true,
        roleName: "SuperAdmin",
        capabilities: {
          CanManageUsers: true,
          CanManageMasters: true,
          CanEnterBills: true,
          CanApproveBills: true,
          CanInitiatePayments: true,
          CanConfirmPayments: true,
          CanViewFinance: true,
          CanViewReports: true,
          CanManageConfig: true
        }
      },
      operator: {
        userId: "user-op-1",
        email: "operator1@gretex.com",
        displayName: "Ramesh Sharma (Operator)",
        isSuperAdmin: false,
        roleName: "EntryOperator",
        capabilities: {
          CanEnterBills: true
        }
      },
      approver: {
        userId: "user-appr-1",
        email: "approver1@gretex.com",
        displayName: "Sunil Verma (Approver)",
        isSuperAdmin: false,
        roleName: "Approver",
        capabilities: {
          CanApproveBills: true,
          CanViewReports: true
        }
      },
      maker: {
        userId: "user-pay-1",
        email: "maker1@gretex.com",
        displayName: "Priya Nair (Payment Initiator)",
        isSuperAdmin: false,
        roleName: "PaymentInitiator",
        capabilities: {
          CanInitiatePayments: true
        }
      },
      checker: {
        userId: "user-pay-2",
        email: "checker2@gretex.com",
        displayName: "Anil Kapoor (Payment Confirmer)",
        isSuperAdmin: false,
        roleName: "PaymentConfirmer",
        capabilities: {
          CanConfirmPayments: true
        }
      },
      finance: {
        userId: "user-fin-1",
        email: "finance@gretex.com",
        displayName: "Alok Gupta (Finance Lead)",
        isSuperAdmin: false,
        roleName: "FinanceUser",
        capabilities: {
          CanViewFinance: true,
          CanViewReports: true
        }
      }
    };

    let target = testUsers[roleType];
    if (target) {
      BillDeskAuth.switchUser(target);
      closeModal("user-modal");
      showToast(`Switched active user to: ${target.displayName}`, "success");
      navigateTo("dashboard");
    }
  }

  function logoutUser() {
    try {
      localStorage.removeItem("billdesk_active_view");
      history.replaceState(null, "", window.location.pathname);
    } catch (e) {}
    BillDeskAuth.logout();
    closeModal("user-modal");
    showToast("Signed out", "info");
    navigateTo("dashboard");
  }

  function closeModal(modalId) {
    let modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("active");
      setTimeout(() => {
        if (modal.parentElement) modal.parentElement.innerHTML = "";
      }, 200);
    }
  }

  function showToast(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) return;

    let toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div>${DashboardComponent.escapeHtml(message)}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  return {
    init: init,
    navigateTo: navigateTo,
    refreshCurrentView: refreshCurrentView,
    updateUserInfo: updateUserInfo,
    updateEnvIndicator: updateEnvIndicator,
    toggleEnvMode: toggleEnvMode,
    openUserSwitcherModal: openUserSwitcherModal,
    switchTestUser: switchTestUser,
    handleLoginSubmit: handleLoginSubmit,
    fillLogin: fillLogin,
    logoutUser: logoutUser,
    closeModal: closeModal,
    showToast: showToast
  };
})();

// Launch application on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
