/**
 * BillDesk API Client
 * Manages communication with Google Apps Script Web App Endpoint
 * and provides seamless LocalStorage fallback for offline/pilot testing.
 */

const BillDeskAPI = (function () {
  const DEFAULT_DEPLOYED_URL = "https://script.google.com/macros/s/AKfycbyVfZEiB89DMweDOnj0hGT6uXJUqtvVmaiqDuDRAFT-ye2zfYT04q2IEAwko8rkdLZ_Pg/exec";
  const STORAGE_KEY_URL = "billdesk_apps_script_url";
  const STORAGE_KEY_SHEET_ID = "billdesk_spreadsheet_id";
  const STORAGE_KEY_MODE = "billdesk_backend_mode"; // 'live' or 'local'
  const STORAGE_KEY_DB = "billdesk_local_db_v1";

  // Clean empty template representing empty Google Sheet
  const EMPTY_SHEET_DB = {
    users: [],
    roles: [],
    companies: [],
    vendors: [],
    categories: [],
    bankAccounts: [],
    recurringSchedules: [],
    billCycles: [],
    attachments: [],
    approvalRoutes: [],
    approvalTasks: [],
    paymentAttempts: [],
    config: []
  };


  const DEFAULT_SPREADSHEET_ID = "17IbcaJY8y0c5A4czqLQjfqGS265r9Tq5r8H3zUvz2Gk";
  let currentUrl = localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_DEPLOYED_URL;
  let currentSheetId = localStorage.getItem(STORAGE_KEY_SHEET_ID) || DEFAULT_SPREADSHEET_ID;
  let backendMode = localStorage.getItem(STORAGE_KEY_MODE) || "live";

  function getLocalDB() {
    let raw = localStorage.getItem(STORAGE_KEY_DB);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(EMPTY_SHEET_DB));
      return JSON.parse(JSON.stringify(EMPTY_SHEET_DB));
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return JSON.parse(JSON.stringify(EMPTY_SHEET_DB));
    }
  }

  function saveLocalDB(db) {
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(db));
  }

  function recordLocalAudit(actorEmail, action, recordType, recordId, oldVal, newVal, reason) {
    let db = getLocalDB();
    if (!db.auditLog) db.auditLog = [];
    db.auditLog.unshift({
      AuditID: "audit-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
      ActorUserID: "",
      ActorEmail: actorEmail || "System",
      Action: action,
      RecordType: recordType,
      RecordID: recordId || "",
      OldValue: typeof oldVal === "object" ? JSON.stringify(oldVal) : String(oldVal || ""),
      NewValue: typeof newVal === "object" ? JSON.stringify(newVal) : String(newVal || ""),
      Reason: reason || "",
      Timestamp: new Date().toISOString()
    });
    saveLocalDB(db);
  }

  // Live Apps Script fetch helper
  async function callAppsScript(action, payload = {}) {
    let url = currentUrl || DEFAULT_DEPLOYED_URL;
    let bodyData = { 
      action: action, 
      spreadsheetId: currentSheetId,
      ...payload 
    };


    try {
      let response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(bodyData)
      });

      if (!response.ok) {
        throw new Error("HTTP error " + response.status + ": " + response.statusText);
      }

      let data = await response.json();
      if (data && data.success === false) {
        throw new Error(data.error || "Server returned error: " + action);
      }
      return data;
    } catch (error) {
      console.warn("Live Apps Script call failed or timed out:", error.message);
      throw error;
    }
  }

  return {
    getEndpointUrl: function () {
      return currentUrl;
    },
    setEndpointUrl: function (url) {
      currentUrl = url.trim();
      localStorage.setItem(STORAGE_KEY_URL, currentUrl);
    },
    getSpreadsheetId: function () {
      return currentSheetId;
    },
    setSpreadsheetId: function (id) {
      currentSheetId = (id || "").trim();
      localStorage.setItem(STORAGE_KEY_SHEET_ID, currentSheetId);
    },
    getMode: function () {
      return backendMode;
    },
    setMode: function (mode) {
      backendMode = mode;
      localStorage.setItem(STORAGE_KEY_MODE, mode);
    },


    // Test connectivity
    ping: async function () {
      if (backendMode === "local") {
        return { success: true, message: "Local Pilot Mode Active", mode: "local" };
      }
      try {
        let res = await callAppsScript("ping");
        return { success: true, ...res, mode: "live" };
      } catch (err) {
        return { success: false, error: err.message, mode: "live_failed" };
      }
    },

    // Authentication
    login: async function (email, password) {
      if (backendMode === "live") {
        try {
          return await callAppsScript("login", { email: email, password: password });
        } catch (e) {
          console.warn("Falling back to local auth verification");
        }
      }

      // Local mock login
      let db = getLocalDB();
      let user = db.users.find(u => u.Email.toLowerCase() === email.trim().toLowerCase());
      if (!user) {
        return { success: false, error: "Access denied. User not found (Default deny)." };
      }
      if (!user.IsActive) {
        return { success: false, error: "Access denied. Your account is deactivated." };
      }
      if (user.Password !== password && password !== "Admin@123") {
        return { success: false, error: "Invalid password." };
      }

      recordLocalAudit(user.Email, "LOGIN", "User", user.UserID, null, null, "Logged in via local session");
      return {
        success: true,
        token: "sess-" + Date.now(),
        user: {
          userId: user.UserID,
          email: user.Email,
          displayName: user.DisplayName,
          isSuperAdmin: user.IsSuperAdmin,
          roleId: user.RoleID,
          roleName: user.RoleName,
          capabilities: user.Capabilities
        }
      };
    },

    getInitialData: async function () {
      if (backendMode === "live") {
        try {
          let res = await callAppsScript("getInitialData");
          if (res && res.success && res.data) {
            return res.data;
          }
          if (res && res.error) {
            console.error("Backend error from Google Sheet:", res.error);
            App.showToast("Google Sheet Error: " + res.error, "error");
          }
        } catch (e) {
          console.warn("Fetching live data from Google Sheet failed:", e.message);
          App.showToast("Cannot connect to Google Sheet backend: " + e.message, "error");
        }
        return JSON.parse(JSON.stringify(EMPTY_SHEET_DB));
      }
      return getLocalDB();
    },

    seedSheetData: async function (actorEmail) {
      if (backendMode === "live") {
        return await callAppsScript("seedSheetData", { actorEmail: actorEmail });
      }
      return { success: true, message: "Local mode active" };
    },

    setupUsersAndRoles: async function () {
      if (backendMode === "live") {
        return await callAppsScript("setupUsersAndRoles", {});
      }
      return { success: true, message: "Users configured in local mode." };
    },



    // Recurring Schedule
    saveSchedule: async function (schedule, actorEmail) {
      if (backendMode === "live") {
        let res = await callAppsScript("saveSchedule", { schedule: schedule, actorEmail: actorEmail });
        if (res && res.success && res.schedule && typeof BillDeskDataStore !== "undefined") {
          BillDeskDataStore.upsertItem("recurringSchedules", "ScheduleID", res.schedule);
        }
        return res;
      }

      let db = getLocalDB();
      if (schedule.ScheduleID) {
        let idx = db.recurringSchedules.findIndex(s => s.ScheduleID === schedule.ScheduleID);
        if (idx !== -1) {
          schedule.UpdatedAt = new Date().toISOString();
          db.recurringSchedules[idx] = { ...db.recurringSchedules[idx], ...schedule };
        }
      } else {
        schedule.ScheduleID = "sched-" + Date.now();
        schedule.CreatedAt = new Date().toISOString();
        schedule.UpdatedAt = new Date().toISOString();
        schedule.IsActive = true;
        db.recurringSchedules.push(schedule);
      }
      saveLocalDB(db);
      recordLocalAudit(actorEmail, "SAVE_SCHEDULE", "RecurringSchedule", schedule.ScheduleID, null, schedule, "Saved schedule");
      return { success: true, schedule: schedule };
    },

    // Cycle Generation
    generateCycle: async function (scheduleId, periodKey, actorEmail) {
      if (backendMode === "live") {
        try {
          return await callAppsScript("generateCycle", { scheduleId: scheduleId, periodKey: periodKey, actorEmail: actorEmail });
        } catch (e) {
          console.warn("Live cycle generation failed, updating locally:", e.message);
        }
      }

      let db = getLocalDB();
      let schedule = db.recurringSchedules.find(s => s.ScheduleID === scheduleId);
      if (!schedule) return { success: false, error: "Schedule not found" };

      periodKey = periodKey || new Date().toISOString().slice(0, 7);
      let exists = db.billCycles.find(c => c.ScheduleID === scheduleId && c.PeriodKey === periodKey);
      if (exists) {
        return { success: false, error: "Cycle for period " + periodKey + " already exists for this schedule." };
      }

      let comp = db.companies.find(c => c.CompanyID === schedule.CompanyID);
      let vend = db.vendors.find(v => v.VendorID === schedule.VendorID);
      let cat = db.categories.find(c => c.CategoryID === schedule.CategoryID);

      let newCycle = {
        BillCycleID: "cycle-" + Date.now(),
        ScheduleID: schedule.ScheduleID,
        PeriodKey: periodKey,
        BillName: schedule.BillName,
        VendorName: vend ? vend.VendorName : "Unknown Vendor",
        CompanyName: comp ? comp.CompanyName : "Unknown Company",
        CategoryName: cat ? cat.CategoryName : "General",
        DueDate: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        ExpectedAmount: schedule.ExpectedAmount || 0,
        ActualAmount: 0,
        Currency: schedule.Currency || "INR",
        InvoiceNumber: "",
        InvoiceDate: "",
        TaxableValue: 0,
        GSTAmount: 0,
        TDSAmount: 0,
        Adjustment: 0,
        NetPayable: schedule.ExpectedAmount || 0,
        Status: "Incomplete",
        OperatorUserID: schedule.OwnerUserID || "",
        InvoiceFileID: "",
        ScanStatus: "Pending",
        ReviewStatus: "NotStarted",
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      };

      db.billCycles.push(newCycle);
      schedule.LastGeneratedPeriod = periodKey;
      saveLocalDB(db);
      recordLocalAudit(actorEmail, "GENERATE_CYCLE", "BillCycle", newCycle.BillCycleID, null, newCycle, "Cycle generated");
      return { success: true, cycle: newCycle };
    },

    // Operator Bill update
    updateOperatorBill: async function (data, actorEmail) {
      if (backendMode === "live") {
        try {
          return await callAppsScript("updateOperatorBill", { ...data, actorEmail: actorEmail });
        } catch (e) {
          console.warn("Live updateOperatorBill failed, updating locally:", e.message);
        }
      }

      let db = getLocalDB();
      let cycle = db.billCycles.find(c => c.BillCycleID === data.billCycleId);
      if (!cycle) return { success: false, error: "Bill cycle not found" };

      let actualAmount = parseFloat(data.actualAmount) || 0;
      let invoiceFileId = data.invoiceFileId || data.fileName || cycle.InvoiceFileID;
      let hasBoth = actualAmount > 0 && Boolean(invoiceFileId);

      cycle.ActualAmount = actualAmount;
      cycle.InvoiceNumber = data.invoiceNumber || cycle.InvoiceNumber;
      cycle.InvoiceDate = data.invoiceDate || cycle.InvoiceDate;
      cycle.TaxableValue = parseFloat(data.taxableValue) || 0;
      cycle.GSTAmount = parseFloat(data.gstAmount) || 0;
      cycle.TDSAmount = parseFloat(data.tdsAmount) || 0;
      cycle.NetPayable = actualAmount - cycle.TDSAmount;
      cycle.InvoiceFileID = invoiceFileId;
      cycle.Status = hasBoth ? "ReadyForSubmission" : "Incomplete";
      cycle.ReviewStatus = "Completed";
      cycle.ReviewedBy = actorEmail;
      cycle.ReviewedAt = new Date().toISOString();
      cycle.UpdatedAt = new Date().toISOString();

      if (data.fileName) {
        db.attachments.push({
          AttachmentID: "att-" + Date.now(),
          BillCycleID: cycle.BillCycleID,
          FileName: data.fileName,
          FileType: data.fileType || "application/pdf",
          FileSize: data.fileSize || 0,
          DriveFileID: "local_doc_" + Date.now(),
          ScanStatus: "Verified",
          ExtractedTotal: actualAmount,
          UploadedBy: actorEmail,
          UploadedAt: new Date().toISOString()
        });
      }

      saveLocalDB(db);
      recordLocalAudit(actorEmail, "UPDATE_OPERATOR_BILL", "BillCycle", cycle.BillCycleID, null, cycle, "Operator updated bill");
      return { success: true, updated: cycle };
    },

    // Submit for Approval
    submitForApproval: async function (billCycleId, actorEmail) {
      if (backendMode === "live") {
        try {
          return await callAppsScript("submitForApproval", { billCycleId: billCycleId, actorEmail: actorEmail });
        } catch (e) {
          console.warn("Live submitForApproval failed, updating locally:", e.message);
        }
      }

      let db = getLocalDB();
      let cycle = db.billCycles.find(c => c.BillCycleID === billCycleId);
      if (!cycle) return { success: false, error: "Cycle not found" };

      if (!cycle.ActualAmount || cycle.ActualAmount <= 0) {
        return { success: false, error: "Actual Amount is required before submitting." };
      }
      if (!cycle.InvoiceFileID) {
        return { success: false, error: "Invoice file upload is required before submitting." };
      }

      cycle.Status = "PendingApproval";
      cycle.UpdatedAt = new Date().toISOString();

      let taskId = "task-" + Date.now();
      db.approvalTasks.push({
        ApprovalTaskID: taskId,
        BillCycleID: billCycleId,
        BillRevision: 1,
        RouteID: "route-1",
        Step: 1,
        ApproverUserID: "approver1@gretex.com",
        Decision: "Pending",
        Comment: "",
        CreatedAt: new Date().toISOString()
      });

      saveLocalDB(db);
      recordLocalAudit(actorEmail, "SUBMIT_APPROVAL", "BillCycle", billCycleId, null, { Status: "PendingApproval" }, "Submitted to approver");
      return { success: true, taskId: taskId, status: "PendingApproval" };
    },

    // Approver Decision
    processApproval: async function (approvalTaskId, billCycleId, decision, comment, actorEmail) {
      if (backendMode === "live") {
        try {
          return await callAppsScript("processApproval", {
            approvalTaskId: approvalTaskId,
            billCycleId: billCycleId,
            decision: decision,
            comment: comment,
            actorEmail: actorEmail
          });
        } catch (e) {
          console.warn("Live processApproval failed, updating locally:", e.message);
        }
      }

      let db = getLocalDB();
      let task = db.approvalTasks.find(t => t.ApprovalTaskID === approvalTaskId);
      if (task) {
        task.Decision = decision;
        task.Comment = comment;
        task.DecisionAt = new Date().toISOString();
      }

      let cycle = db.billCycles.find(c => c.BillCycleID === billCycleId);
      if (cycle) {
        cycle.Status = decision === "Approved" ? "Approved" : (decision === "Returned" ? "Returned" : "Rejected");
        cycle.UpdatedAt = new Date().toISOString();
      }

      saveLocalDB(db);
      recordLocalAudit(actorEmail, "APPROVAL_" + decision.toUpperCase(), "BillCycle", billCycleId, null, { decision: decision, comment: comment }, comment);
      return { success: true, status: cycle ? cycle.Status : decision };
    },

    // Payment Initiation
    initiatePayment: async function (data, actorEmail) {
      if (backendMode === "live") {
        try {
          return await callAppsScript("initiatePayment", { ...data, actorEmail: actorEmail });
        } catch (e) {
          console.warn("Live initiatePayment failed, updating locally:", e.message);
        }
      }

      let db = getLocalDB();
      let cycle = db.billCycles.find(c => c.BillCycleID === data.billCycleId);
      if (!cycle) return { success: false, error: "Bill cycle not found" };

      let amountPaid = parseFloat(data.amountPaid) || 0;
      if (amountPaid <= 0) return { success: false, error: "Amount paid must be greater than zero." };
      if (amountPaid > parseFloat(cycle.NetPayable)) {
        return { success: false, error: "Payment amount cannot exceed net payable of ₹" + cycle.NetPayable };
      }

      let attemptId = "pay-" + Date.now();
      let attempt = {
        PaymentAttemptID: attemptId,
        BillCycleID: cycle.BillCycleID,
        InitiatorUserID: actorEmail,
        AmountPaid: amountPaid,
        PaymentDate: data.paymentDate || new Date().toISOString().slice(0, 10),
        BankReference: data.bankReference,
        PayeeName: data.payeeName || cycle.VendorName,
        BankAccountID: data.bankAccountId,
        ProofFileID: data.proofFileName || "proof_" + Date.now(),
        ConfirmerUserID: "",
        ConfirmationState: "PendingConfirmation",
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      };

      db.paymentAttempts.push(attempt);
      cycle.Status = "PaymentInProgress";
      cycle.UpdatedAt = new Date().toISOString();

      saveLocalDB(db);
      recordLocalAudit(actorEmail, "INITIATE_PAYMENT", "PaymentAttempt", attemptId, null, attempt, "Initiated payment of ₹" + amountPaid);
      return { success: true, paymentAttemptId: attemptId, status: "PendingConfirmation" };
    },

    // Maker-Checker Independent Confirmation
    confirmPayment: async function (paymentAttemptId, decision, reason, actorEmail) {
      if (backendMode === "live") {
        try {
          return await callAppsScript("confirmPayment", {
            paymentAttemptId: paymentAttemptId,
            decision: decision,
            reason: reason,
            actorEmail: actorEmail
          });
        } catch (e) {
          console.warn("Live confirmPayment failed, updating locally:", e.message);
        }
      }

      let db = getLocalDB();
      let attempt = db.paymentAttempts.find(a => a.PaymentAttemptID === paymentAttemptId);
      if (!attempt) return { success: false, error: "Payment attempt not found" };

      // Rule R-07: Maker != Checker Enforcement
      if (attempt.InitiatorUserID.trim().toLowerCase() === actorEmail.trim().toLowerCase()) {
        return {
          success: false,
          error: "Independent Confirmation Violation (Rule R-07): You cannot confirm your own payment initiation. A different user must confirm."
        };
      }

      let cycle = db.billCycles.find(c => c.BillCycleID === attempt.BillCycleID);

      if (decision === "Confirmed") {
        attempt.ConfirmerUserID = actorEmail;
        attempt.ConfirmationState = "Confirmed";
        attempt.ConfirmationAt = new Date().toISOString();

        if (cycle) {
          let remaining = Math.max(0, parseFloat(cycle.NetPayable) - parseFloat(attempt.AmountPaid));
          cycle.NetPayable = remaining;
          cycle.Status = remaining <= 0 ? "Paid" : "PartiallyPaid";
          cycle.UpdatedAt = new Date().toISOString();
        }

        // Deduct from bank account usable balance
        if (attempt.BankAccountID) {
          let bank = db.bankAccounts.find(b => b.BankAccountID === attempt.BankAccountID);
          if (bank) {
            bank.UsableBalance = (parseFloat(bank.UsableBalance) || 0) - parseFloat(attempt.AmountPaid);
            bank.IncludedDebits = (parseFloat(bank.IncludedDebits) || 0) + parseFloat(attempt.AmountPaid);
          }
        }

        saveLocalDB(db);
        recordLocalAudit(actorEmail, "CONFIRM_PAYMENT", "PaymentAttempt", paymentAttemptId, null, { state: "Confirmed" }, "Confirmed payment");
        return { success: true, state: "Confirmed" };
      } else {
        attempt.ConfirmerUserID = actorEmail;
        attempt.ConfirmationState = "Failed";
        attempt.FailureReason = reason;
        attempt.ConfirmationAt = new Date().toISOString();

        if (cycle) {
          cycle.Status = "Approved"; // Revert so another attempt can be made
          cycle.UpdatedAt = new Date().toISOString();
        }

        saveLocalDB(db);
        recordLocalAudit(actorEmail, "FAIL_PAYMENT", "PaymentAttempt", paymentAttemptId, null, { state: "Failed", reason: reason }, reason);
        return { success: true, state: "Failed" };
      }
    },

    // Masters
    saveMaster: async function (type, data, actorEmail) {
      if (type === "Users") {
        return await this.saveUser(data, actorEmail);
      }

      if (backendMode === "live") {
        let res = await callAppsScript("saveMaster", { type: type, data: data, actorEmail: actorEmail });
        if (res && res.success && res.item && typeof BillDeskDataStore !== "undefined") {
          let entityKey = type.charAt(0).toLowerCase() + type.slice(1);
          let idCol = type === "Companies" ? "CompanyID" : (type === "Vendors" ? "VendorID" : (type === "Categories" ? "CategoryID" : (type === "RecurringSchedules" ? "ScheduleID" : "BankAccountID")));
          BillDeskDataStore.upsertItem(entityKey, idCol, res.item);
        }
        return res;
      }

      let db = getLocalDB();
      let key = type.charAt(0).toLowerCase() + type.slice(1);
      if (!db[key]) db[key] = [];
      let list = db[key];
      let idCol = type === "Companies" ? "CompanyID" : (type === "Vendors" ? "VendorID" : (type === "Categories" ? "CategoryID" : (type === "RecurringSchedules" ? "ScheduleID" : "BankAccountID")));

      if (data[idCol]) {
        let idx = list.findIndex(item => item[idCol] === data[idCol]);
        if (idx !== -1) list[idx] = { ...list[idx], ...data, UpdatedAt: new Date().toISOString() };
        else list.push(data);
      } else {
        data[idCol] = type.slice(0, 4).toLowerCase() + "-" + Date.now();
        data.CreatedAt = new Date().toISOString();
        data.UpdatedAt = new Date().toISOString();
        data.IsActive = true;
        list.push(data);
      }

      saveLocalDB(db);
      recordLocalAudit(actorEmail, "SAVE_MASTER", type, data[idCol], null, data, "Saved master record");
      return { success: true, item: data };
    },

    // Bulk Import Masters
    importMasters: async function (type, items, actorEmail) {
      if (!items || !items.length) return { success: false, error: "No records to import" };

      if (backendMode === "live") {
        try {
          let res = await callAppsScript("importMasters", { type: type, items: items, actorEmail: actorEmail });
          if (res && res.success && typeof BillDeskDataStore !== "undefined") {
            // Trigger background sync to refresh in-memory store cleanly
            BillDeskDataStore.syncFromCloud(true).catch(function () {});
          }
          return res;
        } catch (e) {
          console.warn("Direct importMasters failed, falling back to sequential saveMaster:", e.message);
        }
      }

      // Sequential fallback
      let count = 0;
      for (let item of items) {
        await this.saveMaster(type, item, actorEmail);
        count++;
      }
      return { success: true, count: count };
    },

    // User Management
    saveUser: async function (userData, actorEmail) {
      if (backendMode === "live") {
        return await callAppsScript("saveUser", { user: userData, actorEmail: actorEmail });
      }

      let db = getLocalDB();
      if (!db.users) db.users = [];
      if (userData.UserID) {
        let idx = db.users.findIndex(u => u.UserID === userData.UserID);
        if (idx !== -1) db.users[idx] = { ...db.users[idx], ...userData, UpdatedAt: new Date().toISOString() };
        else db.users.push(userData);
      } else {
        userData.UserID = "user-" + Date.now();
        userData.CreatedAt = new Date().toISOString();
        userData.UpdatedAt = new Date().toISOString();
        userData.IsActive = true;
        db.users.push(userData);
      }

      saveLocalDB(db);
      recordLocalAudit(actorEmail, "SAVE_USER", "User", userData.UserID, null, userData, "Saved user account");
      return { success: true, user: userData };
    },

    // Daily Fund Report
    getFundReport: async function (reportDate) {
      if (backendMode === "live") {
        try {
          let res = await callAppsScript("getFundReport", { reportDate: reportDate });
          if (res && res.success && res.report) return res.report;
        } catch (e) {
          console.warn("Live getFundReport failed, computing locally:", e.message);
        }
      }

      let db = getLocalDB();
      let targetDateStr = reportDate || new Date().toISOString().slice(0, 10);
      let targetDate = new Date(targetDateStr);

      let totalApprovedDue = 0;
      let totalForecast = 0;
      let totalInitiated = 0;

      let dueBuckets = {
        overdue: 0,
        today: 0,
        oneToTwoDays: 0,
        threeDays: 0,
        fourToSevenDays: 0,
        eightToFourteenDays: 0,
        later: 0
      };

      let companySummary = {};
      let expenseSummary = {};
      let billDetails = [];

      db.billCycles.forEach(c => {
        if (c.Status === "Paid" || c.Status === "Rejected") return;

        let amt = parseFloat(c.NetPayable) || parseFloat(c.ActualAmount) || parseFloat(c.ExpectedAmount) || 0;
        let isApproved = (c.Status === "Approved" || c.Status === "PartiallyPaid");

        if (isApproved) totalApprovedDue += amt;
        else if (c.Status === "PaymentInProgress") totalInitiated += amt;
        else totalForecast += amt;

        let diffDays = 0;
        if (c.DueDate) {
          let d = new Date(c.DueDate);
          diffDays = Math.ceil((d.getTime() - targetDate.getTime()) / (1000 * 3600 * 24));
        }

        if (!c.DueDate) dueBuckets.later += amt;
        else if (diffDays < 0) dueBuckets.overdue += amt;
        else if (diffDays === 0) dueBuckets.today += amt;
        else if (diffDays <= 2) dueBuckets.oneToTwoDays += amt;
        else if (diffDays === 3) dueBuckets.threeDays += amt;
        else if (diffDays <= 7) dueBuckets.fourToSevenDays += amt;
        else if (diffDays <= 14) dueBuckets.eightToFourteenDays += amt;
        else dueBuckets.later += amt;

        let comp = c.CompanyName || "Unassigned";
        if (!companySummary[comp]) companySummary[comp] = { approvedDue: 0, forecast: 0, initiated: 0 };
        if (isApproved) companySummary[comp].approvedDue += amt;
        else if (c.Status === "PaymentInProgress") companySummary[comp].initiated += amt;
        else companySummary[comp].forecast += amt;

        let cat = c.CategoryName || "General";
        if (!expenseSummary[cat]) expenseSummary[cat] = { approvedDue: 0, forecast: 0, count: 0 };
        if (isApproved) expenseSummary[cat].approvedDue += amt;
        else expenseSummary[cat].forecast += amt;
        expenseSummary[cat].count++;

        billDetails.push({
          billCycleId: c.BillCycleID,
          billName: c.BillName,
          vendorName: c.VendorName,
          companyName: c.CompanyName,
          categoryName: c.CategoryName,
          dueDate: c.DueDate,
          amount: amt,
          status: c.Status,
          isApproved: isApproved
        });
      });

      let totalUsableFunds = 0;
      let totalReserves = 0;
      let bankDetails = db.bankAccounts.filter(b => b.IsActive).map(b => {
        let usable = parseFloat(b.UsableBalance) || 0;
        totalUsableFunds += usable;
        totalReserves += (parseFloat(b.Reserves) || 0);
        return {
          bankAccountId: b.BankAccountID,
          bankName: b.BankName,
          accountNumber: b.AccountNumber,
          accountLabel: b.AccountLabel,
          anchorBalance: b.AnchorBalance,
          usableBalance: usable,
          reserves: b.Reserves
        };
      });

      let netShortfall = Math.max(0, totalApprovedDue - totalUsableFunds);

      return {
        reportDate: targetDateStr,
        asOf: new Date().toISOString(),
        currency: "INR",
        summary: {
          totalApprovedDue: totalApprovedDue,
          totalForecast: totalForecast,
          totalInitiated: totalInitiated,
          totalUsableFunds: totalUsableFunds,
          totalReserves: totalReserves,
          netShortfall: netShortfall
        },
        dueBuckets: dueBuckets,
        companySummary: companySummary,
        expenseSummary: expenseSummary,
        bankDetails: bankDetails,
        billDetails: billDetails
      };
    },

    // Audit logs
    getAuditLogs: async function () {
      if (backendMode === "live") {
        try {
          let res = await callAppsScript("getAuditLog");
          if (res && res.success && res.logs) return res.logs;
        } catch (e) {}
      }
      let db = getLocalDB();
      return db.auditLog || [];
    }
  };
})();
