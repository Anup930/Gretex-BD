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
    reports: ReportsComponent,
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
      startSyncCountdown();
    }

    // Subscribe to DataStore sync events for UI indicators
    if (typeof BillDeskDataStore !== "undefined") {
      BillDeskDataStore.subscribe(function (event, payload) {
        let dot = document.getElementById("env-status-dot");
        let label = document.getElementById("env-status-label");
        if (event === "sync_start") {
          updateSyncCountdownDisplay("Syncing...");
          if (dot) dot.style.backgroundColor = "#f59e0b";
          if (label) label.textContent = "Syncing...";
        } else if (event === "sync_success") {
          resetSyncCountdown();
          if (dot) dot.style.backgroundColor = "#10b981";
          if (label) label.textContent = "Live Backend";
          if (payload && !payload.silent) {
            showToast("✓ Data synced from Google Sheets (" + (payload.count || 0) + " records)", "success");
          } else if (payload && payload.silent && VIEWS[currentView]) {
            // Silently refresh current view with freshly synced data
            let container = document.getElementById("view-container");
            if (container) VIEWS[currentView].render(container);
          }
        } else if (event === "sync_error") {
          resetSyncCountdown();
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
        stopSyncCountdown();
        showLoginScreen();
      } else {
        startSyncCountdown();
        hideLoginScreen();
        updateSidebarVisibility();
        refreshCurrentView();
      }
    });
  }

  // =========================================================================
  // BACKEND AUTO-SYNC COUNTDOWN ENGINE (3 MINUTES)
  // =========================================================================
  const SYNC_INTERVAL_SEC = 180; // 3 minutes
  let syncRemainingSec = SYNC_INTERVAL_SEC;
  let syncCountdownInterval = null;

  function startSyncCountdown() {
    if (syncCountdownInterval) clearInterval(syncCountdownInterval);
    syncRemainingSec = SYNC_INTERVAL_SEC;
    updateSyncCountdownDisplay();

    syncCountdownInterval = setInterval(async () => {
      if (!BillDeskAuth.isAuthenticated()) {
        return;
      }

      // If data store is already syncing, pause countdown tick
      if (typeof BillDeskDataStore !== "undefined" && BillDeskDataStore.isSyncing) {
        return;
      }

      syncRemainingSec--;

      if (syncRemainingSec <= 0) {
        syncRemainingSec = SYNC_INTERVAL_SEC;
        updateSyncCountdownDisplay("Syncing...");
        if (typeof BillDeskDataStore !== "undefined") {
          await BillDeskDataStore.syncFromCloud(true);
        }
      } else {
        updateSyncCountdownDisplay();
      }
    }, 1000);
  }

  function stopSyncCountdown() {
    if (syncCountdownInterval) {
      clearInterval(syncCountdownInterval);
      syncCountdownInterval = null;
    }
  }

  function resetSyncCountdown() {
    syncRemainingSec = SYNC_INTERVAL_SEC;
    updateSyncCountdownDisplay();
  }

  function updateSyncCountdownDisplay(overrideText) {
    let text = overrideText;
    if (!text) {
      let m = Math.floor(syncRemainingSec / 60);
      let s = syncRemainingSec % 60;
      text = String(m).padStart(2, '0') + ":" + String(s).padStart(2, '0');
    }

    document.querySelectorAll(".sync-countdown-val").forEach(el => {
      el.textContent = text;
    });

    let dots = document.querySelectorAll(".sync-live-dot");
    dots.forEach(dot => {
      if (overrideText === "Syncing...") {
        dot.classList.add("syncing");
      } else {
        dot.classList.remove("syncing");
      }
    });
  }

  function showLoginScreen() {
    let screen = document.getElementById("login-screen");
    let appContainer = document.getElementById("app-container");
    let headerControls = document.querySelector(".header-controls");
    let card = document.getElementById("login-card-element");
    let verifyModal = document.getElementById("cyber-verify-modal");
    if (verifyModal) verifyModal.style.display = "none";
    if (card) {
      card.classList.remove("login-card-exit", "shake-error");
    }
    resetLoginBtnState();
    if (screen) screen.style.display = "flex";
    if (appContainer) appContainer.style.display = "none";
    if (headerControls) headerControls.style.display = "none";
  }

  function hideLoginScreen() {
    let screen = document.getElementById("login-screen");
    let appContainer = document.getElementById("app-container");
    let headerControls = document.querySelector(".header-controls");
    let verifyModal = document.getElementById("cyber-verify-modal");
    if (verifyModal) verifyModal.style.display = "none";
    if (screen) screen.style.display = "none";
    if (appContainer) appContainer.style.display = "flex";
    if (headerControls) headerControls.style.display = "flex";
  }

  // Toggle password visibility with icon feedback
  function togglePasswordVisibility() {
    let pwdInput = document.getElementById("login-password");
    let iconShow = document.getElementById("pwd-icon-show");
    let iconHide = document.getElementById("pwd-icon-hide");
    if (!pwdInput) return;

    if (pwdInput.type === "password") {
      pwdInput.type = "text";
      if (iconShow) iconShow.style.display = "none";
      if (iconHide) iconHide.style.display = "block";
    } else {
      pwdInput.type = "password";
      if (iconShow) iconShow.style.display = "block";
      if (iconHide) iconHide.style.display = "none";
    }
    pwdInput.focus();
  }

  // Quick fill demo credentials with micro-pulse feedback
  function fillLogin(email, password) {
    let emailInput = document.getElementById("login-email");
    let pwdInput = document.getElementById("login-password");
    let errAlert = document.getElementById("login-error-alert");
    let card = document.getElementById("login-card-element");

    if (emailInput) {
      emailInput.value = email;
      emailInput.classList.add("input-pulse");
      setTimeout(() => emailInput.classList.remove("input-pulse"), 450);
    }
    if (pwdInput) {
      pwdInput.value = password;
      pwdInput.classList.add("input-pulse");
      setTimeout(() => pwdInput.classList.remove("input-pulse"), 450);
    }
    if (errAlert) errAlert.style.display = "none";
    if (card) card.classList.remove("shake-error");
  }

  // Reset login button to initial state
  function resetLoginBtnState() {
    let submitBtn = document.getElementById("login-submit-btn");
    let spinner = document.getElementById("login-btn-spinner");
    let icon = document.getElementById("login-btn-icon");
    let text = document.getElementById("login-btn-text");

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove("btn-loading", "btn-success");
    }
    if (spinner) spinner.style.display = "none";
    if (icon) {
      icon.style.display = "inline-flex";
      icon.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
          <polyline points="10 17 15 12 10 7"></polyline>
          <line x1="15" y1="12" x2="3" y2="12"></line>
        </svg>
      `;
    }
    if (text) text.textContent = "Login";
  }

  // Handle login submit with Biometric Fingerprint Scan & Verification HUD
  async function handleLoginSubmit(event) {
    if (event) event.preventDefault();
    let emailInput = document.getElementById("login-email");
    let pwdInput = document.getElementById("login-password");
    let submitBtn = document.getElementById("login-submit-btn");
    let spinner = document.getElementById("login-btn-spinner");
    let text = document.getElementById("login-btn-text");
    let errAlert = document.getElementById("login-error-alert");
    let card = document.getElementById("login-card-element");

    // Verification modal elements
    let verifyModal = document.getElementById("cyber-verify-modal");
    let scannerBox = document.getElementById("encryption-loader-box") || document.getElementById("fingerprint-scanner-box");
    let threeBodyLoader = document.getElementById("verify-three-body");
    let resultBadge = document.getElementById("scanner-result-badge");
    let badgeSuccess = document.getElementById("badge-icon-success");
    let badgeError = document.getElementById("badge-icon-error");
    let statusTitle = document.getElementById("verify-status-title");
    let statusDesc = document.getElementById("verify-status-desc");
    let progressFill = document.getElementById("verify-progress-fill");

    let email = emailInput ? emailInput.value.trim() : "";
    let password = pwdInput ? pwdInput.value : "";

    // Trigger haptic shake if fields are missing
    if (!email || !password) {
      if (card) {
        card.classList.remove("shake-error");
        void card.offsetWidth; // Force CSS reflow
        card.classList.add("shake-error");
      }
      if (errAlert) {
        errAlert.textContent = "Please enter both work email and password.";
        errAlert.style.display = "block";
      }
      if (!email && emailInput) emailInput.focus();
      else if (!password && pwdInput) pwdInput.focus();
      return;
    }

    // Set button state
    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.style.display = "inline-flex";
    if (text) text.textContent = "Verifying...";
    if (errAlert) errAlert.style.display = "none";
    if (card) card.classList.remove("shake-error");

    // Launch Encryption Verification HUD
    if (verifyModal) {
      verifyModal.style.display = "flex";
    }
    if (scannerBox) {
      scannerBox.classList.remove("scanner-approved", "scanner-denied");
    }
    if (threeBodyLoader) {
      threeBodyLoader.classList.remove("loader-approved", "loader-denied");
    }
    if (resultBadge) resultBadge.style.display = "none";
    if (badgeSuccess) badgeSuccess.style.display = "none";
    if (badgeError) badgeError.style.display = "none";

    if (statusTitle) {
      statusTitle.className = "verify-status-title";
      statusTitle.textContent = "Verifying Your Credentials...";
    }
    if (statusDesc) {
      statusDesc.textContent = "Validating with 256-bit encryption & security keys";
    }
    if (progressFill) {
      progressFill.className = "verify-progress-fill";
      progressFill.style.width = "0%";
      setTimeout(() => {
        if (progressFill) progressFill.style.width = "65%";
      }, 50);
    }

    // Minimum verification scan time (1100ms) for high-tech visual feedback
    const startTime = Date.now();
    const minScanDuration = 1100;

    try {
      let res = await BillDeskAuth.login(email, password);
      
      // Ensure smooth scan visual duration
      const elapsed = Date.now() - startTime;
      if (elapsed < minScanDuration) {
        await new Promise(r => setTimeout(r, minScanDuration - elapsed));
      }

      if (res && res.success) {
        // SUCCESS STATE (Green Orbital Particles + Approved Checkmark)
        if (threeBodyLoader) threeBodyLoader.classList.add("loader-approved");
        if (scannerBox) scannerBox.classList.add("scanner-approved");
        if (resultBadge) resultBadge.style.display = "flex";
        if (resultBadge) resultBadge.className = "scanner-result-badge badge-success";
        if (badgeSuccess) badgeSuccess.style.display = "block";
        if (badgeError) badgeError.style.display = "none";

        if (statusTitle) {
          statusTitle.className = "verify-status-title text-approved";
          statusTitle.textContent = "Verified with Encryption • Access Granted";
        }
        if (statusDesc) {
          statusDesc.textContent = `Welcome back, ${res.user.displayName || "User"}! Launching Dashboard...`;
        }
        if (progressFill) {
          progressFill.className = "verify-progress-fill fill-approved";
          progressFill.style.width = "100%";
        }

        // Wait 850ms so user sees the approved animation before navigating
        setTimeout(() => {
          if (verifyModal) verifyModal.style.display = "none";
          if (threeBodyLoader) threeBodyLoader.classList.remove("loader-approved", "loader-denied");
          hideLoginScreen();
          updateUserInfo();
          updateSidebarVisibility();
          showToast(`Welcome back, ${res.user.displayName || "User"}!`, "success");
          navigateToDefaultView();
          resetLoginBtnState();
        }, 850);

      } else {
        // ERROR / ACCESS DENIED STATE (Red Orbital Particles + Denied 'X')
        if (threeBodyLoader) threeBodyLoader.classList.add("loader-denied");
        if (scannerBox) scannerBox.classList.add("scanner-denied");
        if (resultBadge) resultBadge.style.display = "flex";
        if (resultBadge) resultBadge.className = "scanner-result-badge badge-error";
        if (badgeSuccess) badgeSuccess.style.display = "none";
        if (badgeError) badgeError.style.display = "block";

        if (statusTitle) {
          statusTitle.className = "verify-status-title text-denied";
          statusTitle.textContent = "Verification Failed";
        }
        if (statusDesc) {
          statusDesc.textContent = (res && res.error) || "Invalid credentials. Identity could not be verified.";
        }
        if (progressFill) {
          progressFill.className = "verify-progress-fill fill-denied";
          progressFill.style.width = "100%";
        }

        // Wait 1300ms so user sees the denied feedback, then return to login card
        setTimeout(() => {
          if (verifyModal) verifyModal.style.display = "none";
          if (threeBodyLoader) threeBodyLoader.classList.remove("loader-approved", "loader-denied");
          resetLoginBtnState();
          if (card) {
            card.classList.remove("shake-error");
            void card.offsetWidth; // Force CSS reflow
            card.classList.add("shake-error");
          }
          if (errAlert) {
            errAlert.textContent = (res && res.error) || "Access denied. Invalid credentials or user not registered.";
            errAlert.style.display = "block";
          }
          if (pwdInput) pwdInput.focus();
        }, 1300);
      }

    } catch (err) {
      // CONNECTION / NETWORK ERROR STATE
      if (scannerBox) scannerBox.classList.add("scanner-denied");
      if (resultBadge) resultBadge.style.display = "flex";
      if (resultBadge) resultBadge.className = "scanner-result-badge badge-error";
      if (badgeSuccess) badgeSuccess.style.display = "none";
      if (badgeError) badgeError.style.display = "block";

      if (statusTitle) {
        statusTitle.className = "verify-status-title text-denied";
        statusTitle.textContent = "Connection Error";
      }
      if (statusDesc) {
        statusDesc.textContent = err.message || "Failed to reach authentication service.";
      }
      if (progressFill) {
        progressFill.className = "verify-progress-fill fill-denied";
        progressFill.style.width = "100%";
      }

      setTimeout(() => {
        if (verifyModal) verifyModal.style.display = "none";
        resetLoginBtnState();
        if (card) {
          card.classList.remove("shake-error");
          void card.offsetWidth;
          card.classList.add("shake-error");
        }
        if (errAlert) {
          errAlert.textContent = "Connection error: " + err.message;
          errAlert.style.display = "block";
        }
      }, 1300);
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

  async function navigateTo(viewName) {
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
      if (viewName === "reports" && !BillDeskAuth.hasCapability("CanViewReports") && !BillDeskAuth.hasCapability("CanViewFinance")) {
        showToast("Access Denied: Reports Hub requires Finance/Reports capability.", "warning");
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

    // Render component with guaranteed 1-second loader animation
    let container = document.getElementById("view-container");
    if (container) {
      container.innerHTML = getSmartLoadingHtml();
      
      // Enforce 1-second loading delay even when data is loaded from localStorage
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Ensure user hasn't switched views during the 1-second delay
      if (currentView === viewName) {
        await VIEWS[viewName].render(container);
      }
    }
  }

  function getSmartLoadingHtml() {
    return `
      <div class="smart-loading-container">
        <div class="loader"></div>
      </div>
    `;
  }

  async function refreshCurrentView() {
    let container = document.getElementById("view-container");
    if (container && VIEWS[currentView]) {
      container.innerHTML = getSmartLoadingHtml();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await VIEWS[currentView].render(container);
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
    stopSyncCountdown();
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
    togglePasswordVisibility: togglePasswordVisibility,
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
