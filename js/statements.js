document.addEventListener("DOMContentLoaded", () => {
  const norm = (s) => String(s || "").trim().replace(/\s+/g, " ");
  const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

  const ACCOUNT_TYPES = {
    "Cash": "Asset",
    "Accounts Receivable": "Asset",
    "Equipment": "Asset",
    "Prepaid Rent": "Asset",
    "Insurance Claim Receivable": "Asset",

    "Accounts Payable": "Liability",
    "Accrued Expenses": "Liability",
    "Bank Loan": "Liability",

    "Owner Capital": "Equity",

    "Service Revenue": "Revenue",
    "Maintenance Revenue": "Revenue",
    "Sales Return": "ContraRevenue",

    "Salaries Expense": "Expense",
    "Rent Expense": "Expense",
    "Depreciation Expense": "Expense",
    "Software Expense": "Expense",
    "Utilities Expense": "Expense",
    "Marketing Expense": "Expense",
    "Interest Expense": "Expense",
    "Loss by Fire": "Expense"
  };

  function mapAcc(a) {
    const x = norm(a).toLowerCase();
    if (x === "bank") return "Cash";
    if (x.includes("sales return")) return "Sales Return";
    return norm(a);
  }

  function getType(accountName) {
    const a = norm(accountName);
    if (ACCOUNT_TYPES[a]) return ACCOUNT_TYPES[a];

    const x = a.toLowerCase();
    if (x.includes("revenue")) return "Revenue";
    if (x.includes("expense")) return "Expense";
    if (x.includes("payable") || x.includes("accrued") || x.includes("liability") || x.includes("loan")) return "Liability";
    if (x.includes("capital") || x.includes("equity")) return "Equity";
    if (x.includes("receivable") || x.includes("prepaid") || x.includes("bank") || x.includes("cash") || x.includes("equipment")) return "Asset";
    return "Other";
  }

  function isAdjustingEntry(entry) {
    const d = (entry.description || "").toLowerCase();
    const debit = (entry.debit_account || "").toLowerCase();
    const credit = (entry.credit_account || "").toLowerCase();

    if (d.includes("accru") || d.includes("depreci") || d.includes("recognized") || d.includes("advance")) return true;
    if (debit.includes("accrued") || credit.includes("accrued")) return true;
    if (debit.includes("prepaid") || credit.includes("prepaid")) return true;
    if (debit.includes("depreciation") || credit.includes("depreciation")) return true;

    return false;
  }

  const journalRaw = JSON.parse(localStorage.getItem("journal") || "[]");

  const journal = journalRaw
    .map((e) => {
      const amount =
        e.amount != null ? Number(e.amount) :
        e.debit_amount != null ? Number(e.debit_amount) :
        e.credit_amount != null ? Number(e.credit_amount) :
        0;

      return {
        ...e,
        entry_date: e.entry_date || e.date || "",
        debit_account: mapAcc(e.debit_account),
        credit_account: mapAcc(e.credit_account),
        debit_amount: e.debit_amount != null ? Number(e.debit_amount) : amount,
        credit_amount: e.credit_amount != null ? Number(e.credit_amount) : amount,
        amount
      };
    })
    .filter((e) => e.debit_account && e.credit_account && isFinite(e.amount) && e.amount > 0);

  const ledger = {};
  function ensureAccount(acc) {
    if (!ledger[acc]) ledger[acc] = { type: getType(acc), debits: 0, credits: 0 };
  }

  journal.forEach((entry) => {
    const debitAcc = entry.debit_account;
    const creditAcc = entry.credit_account;
    const amt = Number(entry.amount);

    ensureAccount(debitAcc);
    ensureAccount(creditAcc);

    ledger[debitAcc].debits += amt;
    ledger[creditAcc].credits += amt;
  });

  function accountBalance(acc) {
    const row = ledger[acc];
    if (!row) return 0;
    const { type, debits, credits } = row;

    if (type === "Asset" || type === "Expense") return debits - credits;
    if (type === "Liability" || type === "Equity" || type === "Revenue") return credits - debits;
    if (type === "ContraRevenue") return debits - credits;
    return debits - credits;
  }

  const revenues = [];
  const contraRevenues = [];
  const expenses = [];

  Object.keys(ledger).forEach((acc) => {
    const type = ledger[acc].type;
    const bal = accountBalance(acc);

    if (type === "Revenue" && bal !== 0) revenues.push({ acc, amount: bal });
    if (type === "ContraRevenue" && bal !== 0) contraRevenues.push({ acc, amount: bal });
    if (type === "Expense" && bal !== 0) expenses.push({ acc, amount: bal });
  });

  const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
  const totalContra = contraRevenues.reduce((s, r) => s + r.amount, 0);
  const netRevenue = totalRevenue - totalContra;

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netIncome = netRevenue - totalExpenses;

  const assets = [];
  const liabilities = [];
  const equityLines = [];

  Object.keys(ledger).forEach((acc) => {
    const type = ledger[acc].type;
    const bal = accountBalance(acc);

    if (type === "Asset" && bal !== 0) assets.push({ acc, amount: bal });
    if (type === "Liability" && bal !== 0) liabilities.push({ acc, amount: bal });
    if (type === "Equity" && bal !== 0) equityLines.push({ acc, amount: bal });
  });

  const ownerCap = equityLines.reduce((s, x) => s + x.amount, 0);
  const equityTotal = ownerCap + netIncome;

  const totalAssets = assets.reduce((s, x) => s + x.amount, 0);
  const totalLiabilities = liabilities.reduce((s, x) => s + x.amount, 0);
  const totalLiabilitiesEquity = totalLiabilities + equityTotal;

  const elRevenue = document.getElementById("totalRevenueCard");
  const elExpenses = document.getElementById("totalExpensesCard");
  const elNet = document.getElementById("netProfitCard");
  const elAssets = document.getElementById("totalAssetsBS");
  const elLE = document.getElementById("totalLiabilitiesEquityBS");

  if (elRevenue) elRevenue.innerText = fmt(netRevenue);
  if (elExpenses) elExpenses.innerText = fmt(totalExpenses);
  if (elNet) elNet.innerText = fmt(netIncome);
  if (elAssets) elAssets.innerText = fmt(totalAssets);
  if (elLE) elLE.innerText = fmt(totalLiabilitiesEquity);

  function renderIncomeStatement() {
    const incomeTbody = document.querySelector("#incomeStatementTable tbody");
    if (!incomeTbody) return;
    incomeTbody.innerHTML = "";

    incomeTbody.innerHTML += `<tr><td><strong>Revenues</strong></td><td></td></tr>`;
    revenues.slice().sort((a, b) => b.amount - a.amount).forEach((r) => {
      incomeTbody.innerHTML += `<tr><td>${r.acc}</td><td>${fmt(r.amount)}</td></tr>`;
    });
    incomeTbody.innerHTML += `<tr><td><strong>Total Revenue</strong></td><td><strong>${fmt(totalRevenue)}</strong></td></tr>`;

    if (contraRevenues.length) {
      incomeTbody.innerHTML += `<tr><td style="padding-top:10px;"><strong>Less: Returns</strong></td><td></td></tr>`;
      contraRevenues.slice().sort((a, b) => b.amount - a.amount).forEach((r) => {
        incomeTbody.innerHTML += `<tr><td>${r.acc}</td><td>(${fmt(r.amount)})</td></tr>`;
      });
      incomeTbody.innerHTML += `<tr><td><strong>Net Revenue</strong></td><td><strong>${fmt(netRevenue)}</strong></td></tr>`;
    }

    incomeTbody.innerHTML += `<tr><td style="padding-top:10px;"><strong>Expenses</strong></td><td></td></tr>`;
    expenses.slice().sort((a, b) => b.amount - a.amount).forEach((e) => {
      incomeTbody.innerHTML += `<tr><td>${e.acc}</td><td>${fmt(e.amount)}</td></tr>`;
    });
    incomeTbody.innerHTML += `<tr><td><strong>Total Expenses</strong></td><td><strong>${fmt(totalExpenses)}</strong></td></tr>`;

    const np = document.getElementById("netProfitIS");
    if (np) np.innerText = fmt(netIncome);
  }

  function renderBalanceSheet() {
    const bsTbody = document.querySelector("#balanceSheetTable tbody");
    if (!bsTbody) return;
    bsTbody.innerHTML = "";

    bsTbody.innerHTML += `<tr><td><strong>Assets</strong></td><td></td></tr>`;
    assets.slice().sort((a, b) => b.amount - a.amount).forEach((a) => {
      bsTbody.innerHTML += `<tr><td>${a.acc}</td><td>${fmt(a.amount)}</td></tr>`;
    });
    bsTbody.innerHTML += `<tr><td><strong>Total Assets</strong></td><td><strong>${fmt(totalAssets)}</strong></td></tr>`;

    bsTbody.innerHTML += `<tr><td style="padding-top:10px;"><strong>Liabilities</strong></td><td></td></tr>`;
    liabilities.slice().sort((a, b) => b.amount - a.amount).forEach((l) => {
      bsTbody.innerHTML += `<tr><td>${l.acc}</td><td>${fmt(l.amount)}</td></tr>`;
    });
    bsTbody.innerHTML += `<tr><td><strong>Total Liabilities</strong></td><td><strong>${fmt(totalLiabilities)}</strong></td></tr>`;

    bsTbody.innerHTML += `<tr><td style="padding-top:10px;"><strong>Equity</strong></td><td></td></tr>`;
    equityLines.slice().sort((a, b) => b.amount - a.amount).forEach((e) => {
      bsTbody.innerHTML += `<tr><td>${e.acc}</td><td>${fmt(e.amount)}</td></tr>`;
    });
    bsTbody.innerHTML += `<tr><td><strong>Net Income / (Loss)</strong></td><td><strong>${fmt(netIncome)}</strong></td></tr>`;
    bsTbody.innerHTML += `<tr><td><strong>Total Equity</strong></td><td><strong>${fmt(equityTotal)}</strong></td></tr>`;

    const ta = document.getElementById("totalAssetsFooter");
    const tle = document.getElementById("totalLiabilitiesEquityFooter");
    if (ta) ta.innerText = fmt(totalAssets);
    if (tle) tle.innerText = fmt(totalLiabilitiesEquity);
  }

  function showView(view) {
    const isWrap = document.getElementById("incomeWrap");
    const bsWrap = document.getElementById("bsWrap");
    if (!isWrap || !bsWrap) return;

    if (view === "balance" || view === "bs") {
      isWrap.style.display = "none";
      bsWrap.style.display = "";
      renderBalanceSheet();
    } else {
      isWrap.style.display = "";
      bsWrap.style.display = "none";
      renderIncomeStatement();
    }
  }

  const params = new URLSearchParams(location.search);
  const viewParam = (params.get("view") || "").toLowerCase();
  const hash = (location.hash || "").replace("#", "").toLowerCase();

  const view = viewParam || hash || "income";
  showView(view);

  const adjusting = journal.filter(isAdjustingEntry);
});
