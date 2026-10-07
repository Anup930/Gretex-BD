/**
 * BillDesk Era AI Component
 * Intelligent Corporate Financial Analyst & Real-Time 3D Report Generator
 * Powered by Google Gemini via Secure Vercel Serverless Gateway
 */

const EraAiComponent = (function () {
  const VERCEL_AI_ENDPOINT = "https://gretex-bd.vercel.app/api/ask-gemini";

  let chatHistory = [
    {
      role: "assistant",
      text: "Namaste! I am **Era AI**, your Gretex Enterprise Financial Analyst & Treasury Copilot.\n\nI have real-time access to your company ledgers, vendor liabilities, payment pipelines, and MSME statutory compliance records. Ask me anything, or request custom 3D analytical reports!",
      kpiCards: [],
      chart: null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ];

  let isAnalyzing = false;

  async function render(container) {
    container.innerHTML = `
      <div class="era-ai-container">
        <!-- Era AI Header -->
        <div class="era-ai-header">
          <div class="era-ai-brand">
            <div class="era-ai-avatar">
              <span class="era-sparkle">✨</span>
              <div class="era-pulse-ring"></div>
            </div>
            <div>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <h1 style="margin:0; font-size:1.35rem; font-weight:800; letter-spacing:-0.02em; color:var(--white);">Era AI</h1>
                <span class="era-status-pill"><span class="era-status-dot"></span> Live Gemini Copilot</span>
              </div>
              <p style="margin:0.2rem 0 0 0; font-size:0.75rem; color:var(--slate-400);">
                Real-time financial synthesis, statutory 45-day MSME audits, and dynamic 3D report builder.
              </p>
            </div>
          </div>

          <div class="era-header-actions">
            <button class="btn btn-sm btn-secondary" onclick="EraAiComponent.clearChat()" title="Reset session">
              🔄 Clear Session
            </button>
          </div>
        </div>

        <!-- Preset Strategic Financial Prompt Chips -->
        <div class="era-prompt-chips-wrap">
          <span style="font-size:0.68rem; font-weight:700; color:var(--slate-400); text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; gap:0.3rem;">
            ⚡ Quick Insights:
          </span>
          <button class="era-chip" onclick="EraAiComponent.sendPreset('What is our current cash liquidity and what bills are pending for disbursement?')">
            💧 Cash Liquidity & Runway
          </button>
          <button class="era-chip" onclick="EraAiComponent.sendPreset('Audit all upcoming invoices against Section 43B(h) MSME 45-day rule. Are there tax risks?')">
            ⚠️ MSME 45-Day Audit
          </button>
          <button class="era-chip" onclick="EraAiComponent.sendPreset('Give me an entity-wise expenditure breakdown with top spend companies and a visual chart.')">
            🏢 Entity Spend Breakdown
          </button>
          <button class="era-chip" onclick="EraAiComponent.sendPreset('Generate a custom 3D report showing top bottleneck categories and approval cycle delays.')">
            📈 Dynamic 3D Spend Chart
          </button>
        </div>

        <!-- Chat & Dynamic Visual Workspace -->
        <div class="era-workspace">
          <div class="era-chat-feed" id="era-chat-feed">
            ${renderMessagesHtml()}
          </div>

          <!-- Bottom Prompt Input Dock -->
          <div class="era-input-dock">
            <form id="era-input-form" onsubmit="EraAiComponent.handleSubmit(event)">
              <div class="era-input-wrapper">
                <input 
                  type="text" 
                  id="era-user-input" 
                  class="era-input-field" 
                  placeholder="Ask Era AI... (e.g. 'Gretex Corporate ka is month ka total spend kitna hai aur chart bana ke do')" 
                  autocomplete="off"
                  ${isAnalyzing ? "disabled" : ""}
                />
                <button type="submit" class="era-send-btn" id="era-send-btn" ${isAnalyzing ? "disabled" : ""}>
                  ${isAnalyzing ? `<span class="era-spinner"></span>` : `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`}
                </button>
              </div>
            </form>
            <div class="era-dock-footnote">
              🔒 Powered by Google Gemini on Vercel Edge. Encrypted corporate telemetry. Never shared with third parties.
            </div>
          </div>
        </div>
      </div>
    `;

    scrollToBottom();
  }

  function renderMessagesHtml() {
    return chatHistory.map((msg, idx) => {
      let isUser = msg.role === "user";
      return `
        <div class="era-msg-row ${isUser ? 'user-row' : 'assistant-row'}">
          <div class="era-msg-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}">
            <div class="era-msg-meta">
              <span class="era-msg-sender">${isUser ? 'You' : '✨ Era AI Financial Analyst'}</span>
              <span class="era-msg-time">${msg.timestamp}</span>
            </div>
            
            <div class="era-msg-content">
              ${formatMarkdown(msg.text)}
            </div>

            <!-- Dynamic 3D KPI Cards generated on-the-fly -->
            ${msg.kpiCards && msg.kpiCards.length > 0 ? `
              <div class="era-dynamic-kpi-grid">
                ${msg.kpiCards.map(c => `
                  <div class="era-kpi-card ${c.status || 'success'}">
                    <div class="era-kpi-title">${DashboardComponent.escapeHtml(c.title)}</div>
                    <div class="era-kpi-value">${DashboardComponent.escapeHtml(c.value)}</div>
                    ${c.sub ? `<div class="era-kpi-sub">${DashboardComponent.escapeHtml(c.sub)}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Dynamic Chart rendered on-the-fly -->
            ${msg.chart && msg.chart.values && msg.chart.values.length > 0 ? `
              <div class="era-dynamic-chart-box">
                <div class="era-chart-title">📊 ${DashboardComponent.escapeHtml(msg.chart.title || 'Dynamic Financial Chart')}</div>
                <div class="era-chart-bars">
                  ${renderDynamicBars(msg.chart)}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderDynamicBars(chart) {
    let max = Math.max(...chart.values, 1);
    return chart.labels.map((lbl, i) => {
      let val = chart.values[i] || 0;
      let pct = Math.min(100, Math.round((val / max) * 100));
      return `
        <div class="era-bar-row">
          <div class="era-bar-lbl" title="${DashboardComponent.escapeHtml(lbl)}">${DashboardComponent.escapeHtml(lbl)}</div>
          <div class="era-bar-track">
            <div class="era-bar-fill" style="width: ${pct}%;"></div>
          </div>
          <div class="era-bar-val">₹${typeof val === 'number' ? val.toLocaleString('en-IN') : val}</div>
        </div>
      `;
    }).join('');
  }

  function formatMarkdown(text) {
    if (!text) return "";
    let escaped = DashboardComponent.escapeHtml(text);
    // Bold
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Bullet points
    let lines = escaped.split('\n');
    let out = [];
    let inList = false;

    lines.forEach(line => {
      let trimmed = line.trim();
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        if (!inList) { out.push('<ul class="era-msg-list">'); inList = true; }
        out.push(`<li>${trimmed.substring(2)}</li>`);
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        if (trimmed) out.push(`<p>${trimmed}</p>`);
      }
    });
    if (inList) out.push('</ul>');

    return out.join('');
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    let inputEl = document.getElementById("era-user-input");
    if (!inputEl) return;
    let query = inputEl.value.trim();
    if (!query || isAnalyzing) return;
    await processQuestion(query);
  }

  async function sendPreset(promptText) {
    if (isAnalyzing) return;
    await processQuestion(promptText);
  }

  async function processQuestion(question) {
    isAnalyzing = true;

    // Push User message
    chatHistory.push({
      role: "user",
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // Add thinking placeholder
    chatHistory.push({
      role: "assistant",
      text: "⚡ Analyzing Gretex corporate ledgers, liquidity meters & statutory pipelines...",
      isThinking: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    let container = document.getElementById("view-container");
    if (container) render(container);

    try {
      // Gather live telemetry context from BillDesk DataStore
      let data = (typeof BillDeskDataStore !== "undefined" && BillDeskDataStore.isLoaded)
        ? BillDeskDataStore.getData()
        : await BillDeskAPI.getInitialData();

      let cycles = data.billCycles || [];
      let accounts = data.bankAccounts || [];
      let vendors = data.vendors || [];
      let companies = data.companies || [];

      let totalPayable = 0;
      let totalApproved = 0;
      let totalPaid = 0;
      let today = new Date().toISOString().slice(0, 10);
      let overdueCount = 0;

      cycles.forEach(c => {
        let net = parseFloat(c.NetPayable || c.BillAmount) || 0;
        totalPayable += net;
        if (c.Status === "Approved") totalApproved += net;
        if (c.Status === "Paid") totalPaid += net;
        if (c.DueDate && c.DueDate < today && c.Status !== "Paid") overdueCount++;
      });

      let totalLiquidity = 0;
      accounts.forEach(a => {
        totalLiquidity += parseFloat(a.UsableBalance) || 0;
      });

      let financialContext = {
        summary: {
          totalTrackedObligations: totalPayable,
          approvedDisbursementPipeline: totalApproved,
          totalPaidToDate: totalPaid,
          overdueBillCount: overdueCount,
          usableCashLiquidity: totalLiquidity,
          activeVendorsCount: vendors.length,
          corporateEntitiesCount: companies.length
        },
        sampleRecentBills: cycles.slice(0, 15).map(c => ({
          billName: c.BillName,
          company: c.CompanyName,
          vendor: c.VendorName,
          amount: c.NetPayable || c.BillAmount,
          dueDate: DashboardComponent.formatDate(c.DueDate),
          status: c.Status
        })),
        bankAccounts: accounts.map(a => ({
          bank: a.BankName,
          label: a.AccountLabel,
          usable: a.UsableBalance
        }))
      };

      // Filter and send recent chat messages for conversational memory
      let recentHistory = chatHistory
        .filter(m => !m.isThinking && m.text)
        .slice(-6)
        .map(m => ({ role: m.role, text: m.text }));

      // Call Vercel Serverless Function
      let response = await fetch(VERCEL_AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question,
          chatHistory: recentHistory,
          financialContext: financialContext
        })
      });

      let result = await response.json();

      // Remove thinking placeholder
      chatHistory.pop();

      if (result.success && result.data) {
        chatHistory.push({
          role: "assistant",
          text: result.data.reply || "Financial analysis complete.",
          kpiCards: result.data.kpiCards || [],
          chart: result.data.chart || null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      } else {
        chatHistory.push({
          role: "assistant",
          text: "⚠️ **Analysis Notice:** " + (result.error || "Could not complete query analysis. Please try again."),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }

    } catch (err) {
      chatHistory.pop();
      chatHistory.push({
        role: "assistant",
        text: "⚠️ **Network Warning:** " + err.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } finally {
      isAnalyzing = false;
      if (container) render(container);
    }
  }

  function clearChat() {
    chatHistory = [
      {
        role: "assistant",
        text: "Session refreshed! I am ready to analyze your next corporate finance query or generate visual 3D spend dashboards.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    let container = document.getElementById("view-container");
    if (container) render(container);
  }

  function scrollToBottom() {
    setTimeout(() => {
      let feed = document.getElementById("era-chat-feed");
      if (feed) feed.scrollTop = feed.scrollHeight;
    }, 50);
  }

  return {
    render: render,
    handleSubmit: handleSubmit,
    sendPreset: sendPreset,
    clearChat: clearChat
  };
})();
