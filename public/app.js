// Global Simulation State
let state = {
  isLocked: false,
  session: null,
  activeLoan: {
    device: "Galaxy S24 Ultra (512GB)",
    emiAmount: 2499,
    totalEmis: 12,
    paidEmis: 7,
    outstanding: 12495,
    dueDate: "05 Jun 2026",
    nextEmiNum: 8
  },
  transactions: [
    { date: "05 May 2026", amount: "₹2,499.00", status: "Success", method: "Google Pay" },
    { date: "05 Apr 2026", amount: "₹2,499.00", status: "Success", method: "PhonePe" },
    { date: "05 Mar 2026", amount: "₹2,499.00", status: "Success", method: "BHIM UPI" },
    { date: "05 Feb 2026", amount: "₹2,499.00", status: "Success", method: "Google Pay" },
    { date: "05 Jan 2026", amount: "₹2,499.00", status: "Success", method: "PhonePe" },
    { date: "05 Dec 2025", amount: "₹2,499.00", status: "Success", method: "Google Pay" },
    { date: "05 Nov 2025", amount: "₹2,499.00", status: "Success", method: "BHIM UPI" }
  ],
  merchantLoans: [
    { name: "Rohan Sharma", phone: "9876543210", device: "Galaxy S24 Ultra (512GB)", amount: "₹1,29,999", status: "approved" },
    { name: "Anita Desai", phone: "9988776655", device: "Galaxy A55 5G", amount: "₹39,999", status: "approved" },
    { name: "Vikram Singh", phone: "9812345678", device: "Galaxy M34", amount: "₹18,999", status: "pending" }
  ],
  currentWizardStep: 1,
  calculator: {
    device: "a55",
    price: 39999,
    tenure: 12,
    downPayment: 11999,
    loanAmount: 28000,
    monthlyEmi: 2333
  }
};

// Auto-run on load
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  // Check localStorage for active session
  const storedSession = localStorage.getItem("sf_session");
  if (storedSession) {
    try {
      state.session = JSON.parse(storedSession);
      showDashboard();
    } catch (e) {
      localStorage.removeItem("sf_session");
    }
  }

  // Set up event listeners
  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  document.getElementById("pay-emi-btn").addEventListener("click", openPayEmiModal);
  document.getElementById("start-loan-btn").addEventListener("click", startNewLoanWizard);
  document.getElementById("cancel-wizard-btn").addEventListener("click", cancelLoanWizard);
  document.getElementById("disburse-loan-btn").addEventListener("click", disburseMockLoan);

  // Initialize UI Views
  renderCustomerHome();
  renderMerchantDashboard();
  updateEmiCalculator();
  updateTimeDisplay();
  setInterval(updateTimeDisplay, 10000); // Update clock every 10 seconds
}

function updateTimeDisplay() {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  minutes = minutes < 10 ? '0' + minutes : minutes;
  const timeStr = `${hours}:${minutes}`;
  document.querySelectorAll(".status-bar .time").forEach(el => {
    el.textContent = timeStr;
  });
}

// Autofill helper for login screen
window.fillCredentials = function(username) {
  document.getElementById("username").value = username;
  document.getElementById("password").value = "samsung123";
};

// ==========================================================================
// SESSION MANAGEMENT & API CALL
// ==========================================================================
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const errorBox = document.getElementById("auth-error");

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (data.success) {
      state.session = { username, role: data.role, token: data.token };
      localStorage.setItem("sf_session", JSON.stringify(state.session));
      showDashboard();
    } else {
      showAuthError(data.message);
    }
  } catch (err) {
    showAuthError("Connection error. Is the server running?");
  }
}

function showAuthError(msg) {
  const errorBox = document.getElementById("auth-error");
  const errorMsg = document.getElementById("error-message");
  errorMsg.textContent = msg;
  errorBox.classList.remove("hidden");
}

function handleLogout() {
  state.session = null;
  localStorage.removeItem("sf_session");
  document.getElementById("auth-gate").classList.remove("hidden");
  document.getElementById("simulator-env").classList.add("hidden");
}

function showDashboard() {
  document.getElementById("auth-gate").classList.add("hidden");
  document.getElementById("simulator-env").classList.remove("hidden");
  document.getElementById("session-user").textContent = `${state.session.username} (${state.session.role.toUpperCase()})`;
}

// ==========================================================================
// CUSTOMER APPLICATION INTERACTION
// ==========================================================================
function renderCustomerHome() {
  const loan = state.activeLoan;
  document.getElementById("due-date-display").textContent = loan.dueDate;

  // Render main screen loan info
  const paidEmiEl = document.querySelector(".progress-text span:first-child");
  const outstandingEl = document.querySelector(".progress-text span:last-child");
  const progressFill = document.querySelector(".progress-fill");

  if (paidEmiEl && outstandingEl && progressFill) {
    paidEmiEl.textContent = `${loan.paidEmis} of ${loan.totalEmis} EMIs Paid`;
    outstandingEl.textContent = `₹${loan.outstanding.toLocaleString('en-IN')} Outstanding`;
    const pct = (loan.paidEmis / loan.totalEmis) * 100;
    progressFill.style.width = `${pct}%`;
  }

  // Update Knox badge
  const badge = document.getElementById("knox-status-badge");
  const shield = document.querySelector(".samsung-s24 .secure-indicator");
  if (state.isLocked) {
    badge.className = "knox-guard-status locked";
    badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>Knox Locked</span>`;
    shield.style.color = "#d32f2f";
    triggerKnoxLockOverlay(true);
  } else {
    badge.className = "knox-guard-status safe";
    badge.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Device Unlocked</span>`;
    shield.style.color = "#388e3c";
    triggerKnoxLockOverlay(false);
  }
}

// Knox Guard Lock Simulator Overlay
function triggerKnoxLockOverlay(show) {
  let overlay = document.getElementById("knox-lock-screen");
  if (show) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "knox-lock-screen";
      overlay.className = "knox-lock-overlay";
      overlay.innerHTML = `
        <div class="lock-panel-content">
          <i class="fa-solid fa-shield-halved lock-icon"></i>
          <h2>DEVICE LOCKED</h2>
          <div class="brand-sub">SAMSUNG <span>Knox Guard</span></div>
          <div class="lock-desc">
            This device has been locked due to a missed payment on your active Samsung Finance+ loan.
          </div>
          <div class="payment-box">
            <div class="lbl">Outstanding EMI Amount</div>
            <div class="amt">₹${state.activeLoan.emiAmount.toLocaleString('en-IN')}.00</div>
          </div>
          <button class="btn-unlock-pay" onclick="openPayEmiModal()">
            <i class="fa-solid fa-credit-card"></i> Pay EMI to Unlock
          </button>
          <div class="help-footer">Support ID: SFC-77391 | DMI Finance</div>
        </div>
      `;
      
      // Style the lock screen dynamically
      const style = document.createElement("style");
      style.id = "knox-lock-styles";
      style.innerHTML = `
        .knox-lock-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: #000000;
          color: #ffffff;
          z-index: 500;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 24px;
          text-align: center;
          font-family: inherit;
        }
        .lock-panel-content {
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .lock-icon {
          font-size: 3.5rem;
          color: #d32f2f;
          margin-bottom: 15px;
          filter: drop-shadow(0 0 10px rgba(211, 47, 47, 0.4));
        }
        .knox-lock-overlay h2 {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #ffffff;
        }
        .brand-sub {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 4px;
          font-weight: 600;
        }
        .brand-sub span { color: #00f2fe; }
        .lock-desc {
          margin-top: 20px;
          font-size: 0.85rem;
          color: #cbd5e1;
          line-height: 1.5;
        }
        .payment-box {
          background: #11111a;
          border: 1px solid #222;
          padding: 16px;
          border-radius: 14px;
          margin: 25px 0;
        }
        .payment-box .lbl {
          font-size: 0.75rem;
          color: #94a3b8;
          text-transform: uppercase;
        }
        .payment-box .amt {
          font-size: 1.6rem;
          font-weight: 800;
          color: #ef5350;
          margin-top: 4px;
        }
        .btn-unlock-pay {
          width: 100%;
          padding: 14px;
          background: #d32f2f;
          border: none;
          color: #ffffff;
          border-radius: 12px;
          font-family: inherit;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 15px rgba(211, 47, 47, 0.4);
          transition: transform 0.2s ease;
        }
        .btn-unlock-pay:hover {
          transform: translateY(-2px);
        }
        .help-footer {
          margin-top: 30px;
          font-size: 0.65rem;
          color: #64748b;
        }
      `;
      document.head.appendChild(style);
      document.getElementById("customer-screen").appendChild(overlay);
    }
  } else {
    if (overlay) overlay.remove();
    const style = document.getElementById("knox-lock-styles");
    if (style) style.remove();
  }
}

// Handle locking device manually
window.toggleKnoxLock = function() {
  state.isLocked = !state.isLocked;
  const btn = document.getElementById("simulate-lock-btn");
  if (state.isLocked) {
    btn.innerHTML = `<i class="fa-solid fa-lock-open"></i> Unlock Device`;
    btn.style.background = "rgba(76, 175, 80, 0.15)";
    btn.style.borderColor = "rgba(76, 175, 80, 0.3)";
    btn.style.color = "#4caf50";
  } else {
    btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Trigger Knox Lock`;
    btn.style.background = "rgba(239, 83, 80, 0.15)";
    btn.style.borderColor = "rgba(239, 83, 80, 0.3)";
    btn.style.color = "#ef5350";
  }
  renderCustomerHome();
};

// Customer Tab switcher
window.showCustomerSection = function(section) {
  const overlay = document.getElementById("customer-overlay-section");
  const title = document.getElementById("customer-overlay-title");
  const body = document.getElementById("customer-overlay-body");

  // Remove active bottom nav highlighting
  document.querySelectorAll(".app-bottom-nav .nav-btn").forEach((btn, idx) => {
    btn.classList.remove("active");
    if (section === 'home' && idx === 0) btn.classList.add("active");
    if (section === 'history' && idx === 1) btn.classList.add("active");
    if (section === 'details' && idx === 2) btn.classList.add("active");
  });

  if (section === 'home') {
    overlay.classList.add("hidden");
    return;
  }

  overlay.classList.remove("hidden");

  if (section === 'history') {
    title.textContent = "Payment History";
    let listHtml = `<div class="history-list">`;
    state.transactions.forEach(t => {
      listHtml += `
        <div class="history-item ${t.status === 'Success' ? '' : 'failed'}">
          <div class="history-item-info">
            <h6>EMI Payment - Autodebit</h6>
            <p>${t.date} via ${t.method}</p>
          </div>
          <div class="history-item-meta">
            <span class="amt">${t.amount}</span>
            <p class="status" style="color: ${t.status === 'Success' ? '#2e7d32' : '#c62828'}">${t.status}</p>
          </div>
        </div>
      `;
    });
    listHtml += `</div>`;
    body.innerHTML = listHtml;
  } else if (section === 'details') {
    title.textContent = "Loan Parameters";
    body.innerHTML = `
      <div class="calc-panel" style="background: #ffffff; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); border-radius: var(--oneui-radius);">
        <div class="calc-row" style="margin-bottom: 12px;">
          <span>Financed Device:</span>
          <strong>${state.activeLoan.device}</strong>
        </div>
        <div class="calc-row" style="margin-bottom: 12px;">
          <span>Customer Identity:</span>
          <span>Rohan Sharma (SFC-77391)</span>
        </div>
        <div class="calc-row" style="margin-bottom: 12px;">
          <span>Financing Partner:</span>
          <span>DMI Finance</span>
        </div>
        <div class="calc-row" style="margin-bottom: 12px;">
          <span>Interest Terms:</span>
          <span>0% Interest EMI</span>
        </div>
        <div class="calc-row" style="margin-bottom: 12px;">
          <span>Total EMI Installments:</span>
          <span>${state.activeLoan.totalEmis} Months</span>
        </div>
        <div class="calc-row" style="margin-bottom: 12px;">
          <span>Paid EMI Installments:</span>
          <span>${state.activeLoan.paidEmis} Months</span>
        </div>
        <div class="calc-row highlighted" style="font-size: 0.95rem; border-top: 1px solid var(--oneui-border); padding-top: 12px;">
          <span>Total Amount Outstanding:</span>
          <span>₹${state.activeLoan.outstanding.toLocaleString('en-IN')}.00</span>
        </div>
      </div>
    `;
  }
}

// Payment Dialog popup triggers
function openPayEmiModal() {
  document.getElementById("payment-amount-val").textContent = `₹${state.activeLoan.emiAmount.toLocaleString('en-IN')}.00`;
  document.getElementById("payment-gateway-modal").classList.remove("hidden");
}

window.openPayEmiModal = openPayEmiModal;

window.closePaymentModal = function() {
  document.getElementById("payment-gateway-modal").classList.add("hidden");
};

window.executeMockPayment = function(app) {
  // Update state (pay one EMI)
  const loan = state.activeLoan;
  if (loan.outstanding <= 0) {
    alert("Loan is already fully repaid!");
    window.closePaymentModal();
    return;
  }

  // Calculate new balances
  loan.paidEmis += 1;
  loan.outstanding = Math.max(0, loan.outstanding - loan.emiAmount);
  
  // Format current date
  const now = new Date();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dateStr = `${now.getDate() < 10 ? '0' + now.getDate() : now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  // Log transaction
  const methodMap = { gpay: "Google Pay", phonepe: "PhonePe", bhim: "BHIM UPI" };
  state.transactions.unshift({
    date: dateStr,
    amount: `₹${loan.emiAmount.toLocaleString('en-IN')}.00`,
    status: "Success",
    method: methodMap[app] || "UPI Payment"
  });

  // Calculate next due date
  const nextDue = new Date(now.getFullYear(), now.getMonth() + 1, 5);
  loan.dueDate = `${nextDue.getDate() < 10 ? '0' + nextDue.getDate() : nextDue.getDate()} ${months[nextDue.getMonth()]} ${nextDue.getFullYear()}`;

  // Unlock if locked
  if (state.isLocked) {
    state.isLocked = false;
    // reset debugger button
    const btn = document.getElementById("simulate-lock-btn");
    btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Trigger Knox Lock`;
    btn.style.background = "rgba(239, 83, 80, 0.15)";
    btn.style.borderColor = "rgba(239, 83, 80, 0.3)";
    btn.style.color = "#ef5350";
  }

  // Close modals, refresh components
  window.closePaymentModal();
  renderCustomerHome();
  showCustomerSection('history'); // Switch to transaction history to verify
  
  // Trigger nice system notification inside browser
  showNotification(`EMI Payment of ₹${loan.emiAmount} Successful!`);
};

// Custom animated alert
function showNotification(msg) {
  const notif = document.createElement("div");
  notif.style.position = "fixed";
  notif.style.bottom = "30px";
  notif.style.left = "50%";
  notif.style.transform = "translateX(-50%) translateY(20px)";
  notif.style.background = "rgba(46, 125, 50, 0.95)";
  notif.style.color = "#ffffff";
  notif.style.padding = "16px 30px";
  notif.style.borderRadius = "30px";
  notif.style.fontSize = "0.95rem";
  notif.style.fontWeight = "600";
  notif.style.zIndex = "2000";
  notif.style.opacity = "0";
  notif.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
  notif.style.boxShadow = "0 10px 25px rgba(0,0,0,0.3)";
  notif.textContent = msg;

  document.body.appendChild(notif);
  
  // Animate in
  setTimeout(() => {
    notif.style.opacity = "1";
    notif.style.transform = "translateX(-50%) translateY(0)";
  }, 50);

  // Clear out
  setTimeout(() => {
    notif.style.opacity = "0";
    notif.style.transform = "translateX(-50%) translateY(20px)";
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

// Modals for Customer details (Store Locator / Support)
window.openCustomerModal = function(type) {
  const title = document.getElementById("info-modal-title");
  const body = document.getElementById("info-modal-body");
  
  if (type === 'locator') {
    title.innerHTML = `<i class="fa-solid fa-map-location-dot"></i> Samsung Finance+ Payment Locator`;
    body.innerHTML = `
      <p style="font-size: 0.85rem; margin-bottom: 12px; color: var(--oneui-text-muted);">
        Find nearby payment centers where you can pay EMI cash over-the-counter.
      </p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid var(--oneui-border);">
          <strong>Samsung Exclusive Plaza - Indiranagar</strong>
          <p style="font-size: 0.75rem; color: var(--oneui-text-muted);">50m away | Open till 9:00 PM</p>
        </div>
        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid var(--oneui-border);">
          <strong>DMI Partner Center - HAL Road</strong>
          <p style="font-size: 0.75rem; color: var(--oneui-text-muted);">1.2 km away | Open till 6:00 PM</p>
        </div>
      </div>
    `;
  } else if (type === 'support') {
    title.innerHTML = `<i class="fa-solid fa-headset"></i> Customer Service Contact`;
    body.innerHTML = `
      <p style="font-size: 0.85rem; margin-bottom: 16px; color: var(--oneui-text-muted);">
        Get in touch with the Samsung Finance+ support channels.
      </p>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <a href="tel:18002021111" style="display: flex; align-items: center; gap: 10px; padding: 12px; background: #e3f2fd; color: #1e88e5; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 0.85rem;">
          <i class="fa-solid fa-phone"></i> Call Support (1800-202-1111)
        </a>
        <a href="mailto:support@samsungfinanceplus.com" style="display: flex; align-items: center; gap: 10px; padding: 12px; background: #f1f5f9; color: var(--oneui-text); text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 0.85rem;">
          <i class="fa-solid fa-envelope"></i> Email Support
        </a>
      </div>
    `;
  }

  document.getElementById("info-modal").classList.remove("hidden");
};

window.closeInfoModal = function() {
  document.getElementById("info-modal").classList.add("hidden");
};

// ==========================================================================
// MERCHANT APPLICATION INTERACTION
// ==========================================================================
function renderMerchantDashboard() {
  const countEl = document.getElementById("stat-loans-count");
  if (countEl) countEl.textContent = state.merchantLoans.filter(l => l.status === 'approved').length;

  const appList = document.getElementById("merchant-app-list");
  if (!appList) return;

  let listHtml = '';
  state.merchantLoans.forEach(loan => {
    listHtml += `
      <div class="app-item">
        <div class="app-item-info">
          <h6>${loan.name}</h6>
          <p>${loan.phone} | ${loan.device}</p>
        </div>
        <div class="app-item-meta">
          <span class="price">${loan.amount}</span>
          <span class="status-indicator ${loan.status}">${loan.status}</span>
        </div>
      </div>
    `;
  });
  appList.innerHTML = listHtml;
}

function startNewLoanWizard() {
  document.getElementById("merchant-dashboard-content").classList.add("hidden");
  document.getElementById("merchant-wizard-content").classList.remove("hidden");
  goToWizardStep(1);
}

function cancelLoanWizard() {
  document.getElementById("merchant-wizard-content").classList.add("hidden");
  document.getElementById("merchant-dashboard-content").classList.remove("hidden");
}

window.goToWizardStep = function(step) {
  state.currentWizardStep = step;
  document.getElementById("current-step").textContent = step;

  document.querySelectorAll(".wizard-step").forEach((el, idx) => {
    el.classList.add("hidden");
    if (idx + 1 === step) el.classList.remove("hidden");
  });

  if (step === 2) {
    updateEmiCalculator();
  }
};

window.setTenure = function(months) {
  state.calculator.tenure = months;
  document.querySelectorAll(".tenure-selector .btn-tenure").forEach(btn => {
    btn.classList.remove("active");
    if (parseInt(btn.textContent) === months) btn.classList.add("active");
  });
  updateEmiCalculator();
};

window.updateEmiCalculator = function() {
  const deviceSelect = document.getElementById("device-select");
  const selectedOpt = deviceSelect.options[deviceSelect.selectedIndex];
  const price = parseInt(selectedOpt.getAttribute("data-price"));
  
  const downPayment = Math.round(price * 0.3);
  const loanAmount = price - downPayment;
  const monthlyEmi = Math.round(loanAmount / state.calculator.tenure);

  state.calculator.price = price;
  state.calculator.downPayment = downPayment;
  state.calculator.loanAmount = loanAmount;
  state.calculator.monthlyEmi = monthlyEmi;

  document.getElementById("calc-device-price").textContent = `₹${price.toLocaleString('en-IN')}`;
  document.getElementById("calc-down-payment").textContent = `₹${downPayment.toLocaleString('en-IN')}`;
  document.getElementById("calc-loan-amount").textContent = `₹${loanAmount.toLocaleString('en-IN')}`;
  document.getElementById("calc-emi-monthly").textContent = `₹${monthlyEmi.toLocaleString('en-IN')}/mo`;
};

function disburseMockLoan() {
  const name = document.getElementById("cust-signature").value || "New Customer";
  const phone = document.getElementById("cust-phone").value || "9876543210";
  
  const deviceSelect = document.getElementById("device-select");
  const deviceName = deviceSelect.options[deviceSelect.selectedIndex].text.split(" - ")[0];
  const priceFormatted = deviceSelect.options[deviceSelect.selectedIndex].text.split(" - ")[1];

  // 1. Add to Merchant Log
  state.merchantLoans.unshift({
    name,
    phone,
    device: deviceName,
    amount: priceFormatted,
    status: "approved"
  });

  // 2. Link to Customer View! (Dynamic Simulator Link)
  state.activeLoan = {
    device: deviceName,
    emiAmount: state.calculator.monthlyEmi,
    totalEmis: state.calculator.tenure,
    paidEmis: 0,
    outstanding: state.calculator.loanAmount,
    dueDate: "05 Jun 2026",
    nextEmiNum: 1
  };

  // Reset transactions log for new loan simulation
  state.transactions = [
    { date: "Setup Date", amount: `₹${state.calculator.downPayment.toLocaleString('en-IN')}.00 Down`, status: "Success", method: "Cash/Card Setup" }
  ];

  // Make sure customer screen is unlocked
  state.isLocked = false;
  const btn = document.getElementById("simulate-lock-btn");
  if (btn) {
    btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Trigger Knox Lock`;
    btn.style.background = "rgba(239, 83, 80, 0.15)";
    btn.style.borderColor = "rgba(239, 83, 80, 0.3)";
    btn.style.color = "#ef5350";
  }

  // 3. Reset UI views
  cancelLoanWizard();
  renderMerchantDashboard();
  renderCustomerHome();
  showCustomerSection('home');

  // Trigger System Alert
  showNotification("New Loan Created! Linked to Customer App on the left.");
}
