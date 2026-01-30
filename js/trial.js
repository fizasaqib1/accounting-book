document.addEventListener("DOMContentLoaded", () => {
  const body = document.getElementById("trialTable");

  const norm = (s) => String(s || "").trim().replace(/\s+/g, " ");
  const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);

  function getJournal() {
    return JSON.parse(localStorage.getItem("journal") || "[]");
  }

  function isAdjustingEntry(e) {
    const desc = String(e.description || "").toLowerCase();
    const dAcc = String(e.debit_account || "").toLowerCase();
    const cAcc = String(e.credit_account || "").toLowerCase();
    if (desc.includes("accru") || dAcc.includes("accrued") || cAcc.includes("accrued")) return true;
    if (desc.includes("advance") || desc.includes("recognized") || dAcc.includes("prepaid") || cAcc.includes("prepaid")) return true;
    if (desc.includes("depreci") || dAcc.includes("depreciation") || cAcc.includes("depreciation")) return true;
    return false;
  }

  function renderTrialBalance() {
    const raw = getJournal();

    const journal = raw.map(e => {
      const amount = num(e.amount);
      return {
        ...e,
        debit_account: norm(e.debit_account),
        credit_account: norm(e.credit_account),
        debit_amount: e.debit_amount != null ? num(e.debit_amount) : amount,
        credit_amount: e.credit_amount != null ? num(e.credit_amount) : amount
      };
    });

    const unadjusted = journal.filter(e => !isAdjustingEntry(e));
    const totals = {};

    const ensure = (acc) => {
      const a = norm(acc);
      if (!a) return null;
      if (!totals[a]) totals[a] = { debits: 0, credits: 0 };
      return a;
    };

    unadjusted.forEach(e => {
      const dAcc = ensure(e.debit_account);
      const cAcc = ensure(e.credit_account);
      if (!dAcc || !cAcc) return;
      totals[dAcc].debits += num(e.debit_amount);
      totals[cAcc].credits += num(e.credit_amount);
    });

    let td = 0, tc = 0;
    body.innerHTML = "";

    Object.keys(totals).sort((a,b)=>a.localeCompare(b)).forEach(acc => {
      const d = totals[acc].debits;
      const c = totals[acc].credits;
      const bal = d - c;

      let dr = 0, cr = 0;
      if (bal > 0) dr = bal;
      else if (bal < 0) cr = Math.abs(bal);
      else return;

      td += dr;
      tc += cr;

      body.innerHTML += `
        <tr>
          <td>${acc}</td>
          <td>${dr ? dr.toLocaleString() : ""}</td>
          <td>${cr ? cr.toLocaleString() : ""}</td>
        </tr>
      `;
    });

    document.getElementById("totalDebit").innerText = td.toLocaleString();
    document.getElementById("totalCredit").innerText = tc.toLocaleString();

    const diff = td - tc;
    const st = document.getElementById("trialStatus");
    const df = document.getElementById("trialDiff");
    if (st) st.innerText = diff === 0 ? "Balanced" : "Not Balanced";
    if (df) df.innerText = diff.toLocaleString();
  }

  renderTrialBalance();
  setInterval(renderTrialBalance, 800);
});
