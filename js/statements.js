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
    if (x.includes("sales return")) return "Sales Return";
    return norm(a);
  }

  function getType(acc) {
    const a = norm(acc);
    if (ACCOUNT_TYPES[a]) return ACCOUNT_TYPES[a];

    const x = a.toLowerCase();
    if (x.includes("revenue")) return "Revenue";
    if (x.includes("expense") || x.includes("loss")) return "Expense";
    if (x.includes("payable") || x.includes("accrued") || x.includes("liability") || x.includes("loan")) return "Liability";
    if (x.includes("capital") || x.includes("equity")) return "Equity";
    if (x.includes("receivable") || x.includes("prepaid") || x.includes("cash") || x.includes("equipment")) return "Asset";
    return "Other";
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
    const a = norm(acc);
    if (!a) return;
    if (!ledger[a]) ledger[a] = { type: getType(a), dr: 0, cr: 0 };
  }

  journal.forEach((entry) => {
    const debitAcc = norm(entry.debit_account);
    const creditAcc = norm(entry.credit_account);
    const amt = Number(entry.amount);

    if (!debitAcc || !creditAcc || !isFinite(amt) || amt <= 0) return;

    ensureAccount(debitAcc);
    ensureAccount(creditAcc);

    ledger[debitAcc].dr += amt;
    ledger[creditAcc].cr += amt;
  });

  function balance(acc) {
    const row = ledger[acc];
    if (!row) return 0;
    const { type, dr, cr } = row;
    if (type === "Asset" || type === "Expense") return dr - cr;
    if (type === "ContraRevenue") return dr - cr;
    return cr - dr;
  }

  const revenues = [];
  const contra = [];
  const expenses = [];
  const assets = [];
  const liabilities = [];
  const equities = [];

  Object.keys(ledger).forEach((acc) => {
    const type = ledger[acc].type;
    const bal = balance(acc);
    if (!bal) return;

    if (type === "Revenue") revenues.push({ acc, bal });
    else if (type === "ContraRevenue") contra.push({ acc, bal });
    else if (type === "Expense") expenses.push({ acc, bal });
    else if (type === "Asset") assets.push({ acc, bal });
    else if (type === "Liability") liabilities.push({ acc, bal });
    else if (type === "Equity") equities.push({ acc, bal });
  });

  const totalRevenue = revenues.reduce((s, x) => s + x.bal, 0);
  const totalContra = contra.reduce((s, x) => s + x.bal, 0);
  const netRevenue = totalRevenue - totalContra;

  const totalExpenses = expenses.reduce((s, x) => s + x.bal, 0);
  const netIncome = netRevenue - totalExpenses;

  const totalAssets = assets.reduce((s, x) => s + x.bal, 0);
  const totalLiabilities = liabilities.reduce((s, x) => s + x.bal, 0);
  const ownerCapital = equities.reduce((s, x) => s + x.bal, 0);

  const totalEquity = ownerCapital + netIncome;
  const totalLE = totalLiabilities + totalEquity;

  const elRevenue = document.getElementById("totalRevenueCard");
  const elExpenses = document.getElementById("totalExpensesCard");
  const elNet = document.getElementById("netProfitCard");
  const elAssets = document.getElementById("totalAssetsBS");
  const elLE = document.getElementById("totalLiabilitiesEquityBS");

  if (elRevenue) elRevenue.innerText = fmt(netRevenue);
  if (elExpenses) elExpenses.innerText = fmt(totalExpenses);
  if (elNet) elNet.innerText = fmt(netIncome);
  if (elAssets) elAssets.innerText = fmt(totalAssets);
  if (elLE) elLE.innerText = fmt(totalLE);

  function renderIncomeStatement() {
    const incomeTbody = document.querySelector("#incomeStatementTable tbody");
    if (!incomeTbody) return;
    incomeTbody.innerHTML = "";

    incomeTbody.innerHTML += `<tr><td><strong>Revenues</strong></td><td></td></tr>`;
    revenues.slice().sort((a, b) => b.bal - a.bal).forEach((r) => {
      incomeTbody.innerHTML += `<tr><td>${r.acc}</td><td>${fmt(r.bal)}</td></tr>`;
    });
    incomeTbody.innerHTML += `<tr><td><strong>Total Revenue</strong></td><td><strong>${fmt(totalRevenue)}</strong></td></tr>`;

    if (contra.length) {
      incomeTbody.innerHTML += `<tr><td style="padding-top:10px;"><strong>Less: Returns</strong></td><td></td></tr>`;
      contra.slice().sort((a, b) => b.bal - a.bal).forEach((r) => {
        incomeTbody.innerHTML += `<tr><td>${r.acc}</td><td>(${fmt(r.bal)})</td></tr>`;
      });
      incomeTbody.innerHTML += `<tr><td><strong>Net Revenue</strong></td><td><strong>${fmt(netRevenue)}</strong></td></tr>`;
    }

    incomeTbody.innerHTML += `<tr><td style="padding-top:10px;"><strong>Expenses</strong></td><td></td></tr>`;
    expenses.slice().sort((a, b) => b.bal - a.bal).forEach((e) => {
      incomeTbody.innerHTML += `<tr><td>${e.acc}</td><td>${fmt(e.bal)}</td></tr>`;
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
    assets.slice().sort((a, b) => b.bal - a.bal).forEach((a) => {
      bsTbody.innerHTML += `<tr><td>${a.acc}</td><td>${fmt(a.bal)}</td></tr>`;
    });
    bsTbody.innerHTML += `<tr><td><strong>Total Assets</strong></td><td><strong>${fmt(totalAssets)}</strong></td></tr>`;

    bsTbody.innerHTML += `<tr><td style="padding-top:10px;"><strong>Liabilities</strong></td><td></td></tr>`;
    liabilities.slice().sort((a, b) => b.bal - a.bal).forEach((l) => {
      bsTbody.innerHTML += `<tr><td>${l.acc}</td><td>${fmt(l.bal)}</td></tr>`;
    });
    bsTbody.innerHTML += `<tr><td><strong>Total Liabilities</strong></td><td><strong>${fmt(totalLiabilities)}</strong></td></tr>`;

    bsTbody.innerHTML += `<tr><td style="padding-top:10px;"><strong>Equity</strong></td><td></td></tr>`;
    bsTbody.innerHTML += `<tr><td>Owner Capital</td><td>${fmt(ownerCapital)}</td></tr>`;
    bsTbody.innerHTML += `<tr><td>Net Income</td><td>${fmt(netIncome)}</td></tr>`;
    bsTbody.innerHTML += `<tr><td><strong>Total Equity</strong></td><td><strong>${fmt(totalEquity)}</strong></td></tr>`;

    const ta = document.getElementById("totalAssetsFooter");
    const tle = document.getElementById("totalLiabilitiesEquityFooter");
    if (ta) ta.innerText = fmt(totalAssets);
    if (tle) tle.innerText = fmt(totalLE);
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
});
