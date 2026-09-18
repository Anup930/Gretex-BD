/**
 * BillDesk Authentication & Authorization Manager
 * Enforces Rule R-01 (Default Deny), Rule R-02 (SuperAdmin Protection),
 * and fine-grained capability checks.
 */

const BillDeskAuth = (function () {
  const SESSION_USER_KEY = "billdesk_auth_user";
  const SESSION_TOKEN_KEY = "billdesk_auth_token";

  let currentUser = null;
  let currentToken = null;

  // Initialize from sessionStorage
  // Initialize from storage (localStorage or sessionStorage)
  try {
    let savedUser = localStorage.getItem(SESSION_USER_KEY) || sessionStorage.getItem(SESSION_USER_KEY);
    let savedToken = localStorage.getItem(SESSION_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (savedUser && savedToken) {
      currentUser = JSON.parse(savedUser);
      currentToken = savedToken;
    }
  } catch (e) {
    console.warn("Could not read session state:", e);
  }

  return {
    getCurrentUser: function () {
      return currentUser;
    },
    getToken: function () {
      return currentToken;
    },
    isAuthenticated: function () {
      return Boolean(currentUser && currentToken);
    },

    // Capability check (R-01 Default Deny, R-02 SuperAdmin Protection)
    hasCapability: function (capName) {
      if (!currentUser) return false;
      if (currentUser.isSuperAdmin === true || String(currentUser.isSuperAdmin).toLowerCase() === "true" || currentUser.roleName === "SuperAdmin" || currentUser.roleId === "role-superadmin") {
        return true;
      }
      if (!currentUser.capabilities) return false;

      let caps = currentUser.capabilities;
      if (typeof caps === "string") {
        try { caps = JSON.parse(caps); } catch (e) { caps = {}; }
      }

      if (Array.isArray(caps)) {
        return caps.includes(capName) || caps.some(c => c.toLowerCase() === capName.toLowerCase());
      }

      // Exact match or case-insensitive match
      if (caps[capName] === true || caps[capName] === "true" || caps[capName] === "TRUE") return true;

      for (let k in caps) {
        if (k.toLowerCase() === capName.toLowerCase() && (caps[k] === true || caps[k] === "true" || caps[k] === "TRUE")) {
          return true;
        }
      }
      return false;
    },

    // Login
    login: async function (email, password) {
      let res = await BillDeskAPI.login(email, password);
      if (res && res.success && res.user) {
        currentUser = res.user;
        currentToken = res.token || "token-" + Date.now();
        try {
          localStorage.setItem(SESSION_USER_KEY, JSON.stringify(currentUser));
          localStorage.setItem(SESSION_TOKEN_KEY, currentToken);
          sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(currentUser));
          sessionStorage.setItem(SESSION_TOKEN_KEY, currentToken);
        } catch (e) {}
        window.dispatchEvent(new CustomEvent("billdesk-auth-changed", { detail: currentUser }));
        return { success: true, user: currentUser };
      }
      return { success: false, error: (res && res.error) || "Invalid email or password. Please check your credentials." };
    },

    // Switch user helper for testing
    switchUser: function (targetUser) {
      currentUser = targetUser;
      currentToken = "token-switched-" + Date.now();
      try {
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(currentUser));
        localStorage.setItem(SESSION_TOKEN_KEY, currentToken);
      } catch (e) {}
      window.dispatchEvent(new CustomEvent("billdesk-auth-changed", { detail: currentUser }));
    },

    // Logout
    logout: async function () {
      try {
        if (currentUser) {
          await BillDeskAPI.callAppsScript?.("logout", { email: currentUser.email, token: currentToken });
        }
      } catch (e) {}
      currentUser = null;
      currentToken = null;
      try {
        localStorage.removeItem(SESSION_USER_KEY);
        localStorage.removeItem(SESSION_TOKEN_KEY);
        sessionStorage.removeItem(SESSION_USER_KEY);
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
      } catch (e) {}
      window.dispatchEvent(new CustomEvent("billdesk-auth-changed", { detail: null }));
    }
  };
})();

