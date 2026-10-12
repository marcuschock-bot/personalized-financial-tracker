const STORAGE_KEY = "harbor-finance-state";

const categoryMeta = {
  Housing: { color: "#ec846e", icon: "⌂" },
  Food: { color: "#4e82d8", icon: "◉" },
  Transport: { color: "#e6b54d", icon: "↗" },
  Shopping: { color: "#8ac99f", icon: "□" },
  Utilities: { color: "#a39bd4", icon: "⚡" },
  Salary: { color: "#4e82d8", icon: "↗" },
  Freelance: { color: "#8ac99f", icon: "✦" }
};

const demoState = {
  accounts: [
    { id: "checking", name: "Everyday checking", type: "Checking", balance: 4280.5, icon: "▤" },
    { id: "savings", name: "Rainy day savings", type: "Savings", balance: 7800, icon: "☼" },
    { id: "card", name: "Travel rewards card", type: "Credit card", balance: -842.35, icon: "▭" }
  ],
  categories: ["Housing", "Food", "Transport", "Shopping", "Utilities", "Salary", "Freelance"],
  budgets: [
    { id: "housing", category: "Housing", limit: 1600 },
    { id: "food", category: "Food", limit: 500 },
    { id: "transport", category: "Transport", limit: 280 },
    { id: "shopping", category: "Shopping", limit: 300 }
  ],
  transactions: [
    { id: "t1", description: "Monthly salary", amount: 4850, type: "income", category: "Salary", account: "checking", date: "2026-10-01" },
    { id: "t2", description: "Apartment rent", amount: 1450, type: "expense", category: "Housing", account: "checking", date: "2026-10-02" },
    { id: "t3", description: "Grocery market", amount: 86.42, type: "expense", category: "Food", account: "checking", date: "2026-10-07" },
    { id: "t4", description: "Train pass", amount: 72, type: "expense", category: "Transport", account: "checking", date: "2026-10-08" },
    { id: "t5", description: "Design freelance project", amount: 650, type: "income", category: "Freelance", account: "checking", date: "2026-10-09" },
    { id: "t6", description: "Coffee & breakfast", amount: 14.8, type: "expense", category: "Food", account: "card", date: "2026-10-10" },
    { id: "t7", description: "New running shoes", amount: 124.99, type: "expense", category: "Shopping", account: "card", date: "2026-10-11" }
  ]
};

let state = loadState();
let selectedMonth = "2026-10";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const money = (value, compact = false) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: compact ? 0 : 2
}).format(value);
const dateLabel = (date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`));

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : structuredClone(demoState);
  } catch {
    return structuredClone(demoState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function monthTransactions(month = selectedMonth) {
  return state.transactions.filter((transaction) => transaction.date.startsWith(month));
}

function totals(transactions = monthTransactions()) {
  return transactions.reduce((result, transaction) => {
    result[transaction.type] += transaction.amount;
    return result;
  }, { income: 0, expense: 0 });
}

function renderDashboard() {
  const current = totals();
  const balance = state.accounts.reduce((sum, account) => sum + account.balance, 0);
  $("#total-balance").textContent = money(balance);
  $("#monthly-income").textContent = money(current.income);
  $("#monthly-expenses").textContent = money(current.expense);
  $("#balance-change").innerHTML = `↑ ${current.income ? ((current.income - current.expense) / current.income * 100).toFixed(1) : "0.0"}% <span>vs last month</span>`;
  $("#income-change").textContent = `${current.income ? "8.4" : "0.0"}%`;
  $("#expense-change").textContent = `${current.expense ? "3.2" : "0.0"}%`;
  renderSpending(current.expense);
  renderBudgetProgress();
  renderTransactions($("#recent-transactions"), state.transactions.slice().sort(sortNewest).slice(0, 5));
}

function renderSpending(total) {
  const expenses = monthTransactions().filter((transaction) => transaction.type === "expense");
  const grouped = expenses.reduce((result, transaction) => {
    result[transaction.category] = (result[transaction.category] || 0) + transaction.amount;
    return result;
  }, {});
  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  const colors = entries.map(([category]) => categoryMeta[category]?.color || "#c8d6ce");
  let cursor = 0;
  const stops = entries.map(([, amount]) => {
    const start = cursor;
    cursor += total ? amount / total * 100 : 0;
    return `${colors[entries.findIndex((entry) => entry[1] === amount)]} ${start}% ${cursor}%`;
  });
  $("#donut-chart").style.background = stops.length ? `conic-gradient(${stops.join(", ")})` : "#e7efea";
  $("#spending-total").textContent = money(total, true);
  $("#spending-legend").innerHTML = entries.length ? entries.slice(0, 4).map(([category, amount], index) => `
    <div class="legend-item"><span><i class="legend-color" style="background:${colors[index]}"></i>${category}</span><span class="legend-value">${money(amount, true)}</span></div>`).join("") : '<p class="empty-state">No expenses recorded yet.</p>';
}

function budgetUsage(budget) {
  return monthTransactions().filter((transaction) => transaction.type === "expense" && transaction.category === budget.category)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

function budgetMarkup(budget) {
  const spent = budgetUsage(budget);
  const percent = Math.min(spent / budget.limit * 100, 100);
  const status = spent > budget.limit ? "over" : percent > 75 ? "warning" : "";
  return `<div class="budget-item"><div class="budget-meta"><span>${budget.category}</span><span>${money(spent, true)} / ${money(budget.limit, true)}</span></div><div class="progress-track"><div class="progress-fill ${status}" style="width:${percent}%"></div></div></div>`;
}

function renderBudgetProgress() {
  $("#budget-progress").innerHTML = state.budgets.slice(0, 3).map(budgetMarkup).join("") || '<p class="empty-state">Add a budget to start planning.</p>';
}

function renderTransactions(container, transactions) {
  if (!transactions.length) {
    container.innerHTML = '<div class="empty-state">No transactions yet. Add your first one to see it here.</div>';
    return;
  }
  container.innerHTML = transactions.map((transaction) => {
    const meta = categoryMeta[transaction.category] || { icon: "•" };
    const account = state.accounts.find((item) => item.id === transaction.account);
    return `<div class="transaction-row"><div class="transaction-icon ${transaction.type}">${meta.icon}</div><div class="transaction-info"><strong>${escapeHtml(transaction.description)}</strong><span>${transaction.category} · ${dateLabel(transaction.date)}${account ? ` · ${account.name}` : ""}</span></div><span class="transaction-amount ${transaction.type}">${transaction.type === "income" ? "+" : "-"}${money(transaction.amount)}</span></div>`;
  }).join("");
}

function renderAllTransactions() {
  const search = ($("#transaction-search")?.value || "").toLowerCase();
  const filter = $("#transaction-filter")?.value || "all";
  const filtered = state.transactions.slice().sort(sortNewest).filter((transaction) => {
    return (filter === "all" || transaction.type === filter) && `${transaction.description} ${transaction.category}`.toLowerCase().includes(search);
  });
  renderTransactions($("#all-transactions"), filtered);
}

function renderBudgets() {
  const totalBudget = state.budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const totalSpent = state.budgets.reduce((sum, budget) => sum + budgetUsage(budget), 0);
  $("#budget-summary").innerHTML = `
    <article class="stat-card"><div class="card-label"><span class="label-dot green"></span> Planned</div><strong class="stat-value">${money(totalBudget)}</strong></article>
    <article class="stat-card"><div class="card-label"><span class="label-dot blue"></span> Spent</div><strong class="stat-value">${money(totalSpent)}</strong></article>
    <article class="stat-card"><div class="card-label"><span class="label-dot coral"></span> Remaining</div><strong class="stat-value">${money(totalBudget - totalSpent)}</strong></article>`;
  $("#budget-cards").innerHTML = state.budgets.length ? state.budgets.map((budget) => {
    const spent = budgetUsage(budget);
    const percent = Math.min(spent / budget.limit * 100, 100);
    const status = spent > budget.limit ? "over" : percent > 75 ? "warning" : "";
    return `<article class="budget-card"><div class="budget-card-header"><strong>${budget.category}</strong><span>${money(budget.limit, true)} limit</span></div><div class="budget-meta"><span>${money(spent)} spent</span><span>${Math.max(0, budget.limit - spent) > 0 ? `${money(budget.limit - spent)} left` : "Over budget"}</span></div><div class="progress-track"><div class="progress-fill ${status}" style="width:${percent}%"></div></div></article>`;
  }).join("") : '<article class="panel empty-state">No budgets yet. Add one to give each dollar a purpose.</article>';
}

function renderAccounts() {
  $("#account-grid").innerHTML = state.accounts.length ? state.accounts.map((account) => `<article class="account-card"><div class="account-head"><div class="account-logo">${account.icon}</div><div><strong>${escapeHtml(account.name)}</strong><span>${account.type}</span></div></div><span class="account-balance">${money(account.balance)}</span></article>`).join("") : '<article class="panel empty-state">No accounts yet. Add an account to track balances.</article>';
}

function sortNewest(a, b) { return b.date.localeCompare(a.date); }
function escapeHtml(value) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]); }

function populateForm() {
  $("#form-category").innerHTML = state.categories.map((category) => `<option value="${category}">${category}</option>`).join("");
  $("#form-account").innerHTML = state.accounts.map((account) => `<option value="${account.id}">${account.name}</option>`).join("");
  $("#transaction-form").elements.date.value = new Date().toISOString().slice(0, 10);
}

function openModal() {
  populateForm();
  $("#form-error").textContent = "";
  $("#transaction-modal").hidden = false;
  $("#transaction-form").elements.description.focus();
}

function closeModal() { $("#transaction-modal").hidden = true; }

function showView(viewName) {
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
  const titles = { dashboard: "Good morning, Alex ✦", transactions: "Transactions", budgets: "Budgets", accounts: "Accounts" };
  $("#page-title").textContent = titles[viewName];
  $(".sidebar").classList.remove("open");
  if (viewName === "transactions") renderAllTransactions();
  if (viewName === "budgets") renderBudgets();
  if (viewName === "accounts") renderAccounts();
}

function refresh() {
  renderDashboard();
  renderAllTransactions();
  renderBudgets();
  renderAccounts();
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  setTimeout(() => element.classList.remove("show"), 2500);
}

$$(".nav-item").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
$$("[data-view-link]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.viewLink)));
$$("[data-open-form]").forEach((button) => button.addEventListener("click", openModal));
$("#close-modal").addEventListener("click", closeModal);
$("#transaction-modal").addEventListener("click", (event) => { if (event.target.id === "transaction-modal") closeModal(); });
$("#mobile-menu").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
$("#month-filter").addEventListener("change", (event) => { selectedMonth = event.target.value; refresh(); });
$("#transaction-search").addEventListener("input", renderAllTransactions);
$("#transaction-filter").addEventListener("change", renderAllTransactions);
$("#reset-data").addEventListener("click", () => {
  state = structuredClone(demoState);
  selectedMonth = "2026-10";
  $("#month-filter").value = selectedMonth;
  saveState();
  refresh();
  toast("Demo data restored");
});
$("#transaction-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const amount = Number(form.get("amount"));
  if (!form.get("description") || !amount || amount <= 0 || !form.get("date")) {
    $("#form-error").textContent = "Enter a description, a valid amount, and a date.";
    return;
  }
  const type = form.get("type");
  state.transactions.push({ id: `t${Date.now()}`, description: form.get("description").trim(), amount, type, category: form.get("category"), account: form.get("account"), date: form.get("date") });
  const account = state.accounts.find((item) => item.id === form.get("account"));
  if (account) account.balance += type === "income" ? amount : -amount;
  saveState();
  closeModal();
  refresh();
  toast("Transaction saved");
});
$("#add-budget").addEventListener("click", () => {
  const category = window.prompt("Category for this budget:", "Food");
  if (!category) return;
  const limit = Number(window.prompt("Monthly limit:", "400"));
  if (!limit || limit <= 0) return;
  state.budgets.push({ id: `b${Date.now()}`, category, limit });
  if (!state.categories.includes(category)) state.categories.push(category);
  saveState(); refresh(); toast("Budget added");
});
$("#add-account").addEventListener("click", () => {
  const name = window.prompt("Account name:", "New account");
  if (!name) return;
  state.accounts.push({ id: `a${Date.now()}`, name, type: "Checking", balance: 0, icon: "▤" });
  saveState(); refresh(); toast("Account added");
});

refresh();
