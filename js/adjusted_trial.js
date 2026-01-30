document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("adjTrialTable");
  const journal = Storage.get("journal") || [];

  function getAmount(e) {
    const a =
      e.amount != null ? Number(e.amount) :
      e.debit_amount != null ? Number(e.debit_amount) :
      e.credit_amount != null ? Number(e.credit_amount) :
      0;
    return isFinite(a) ? a : 0;
  }

  const totals = {}; 
  function ensure(acc) {
    const a = String(acc || "").trim();
    if (!a) return null;
    if (!totals[a]) totals[a] = { debits: 0, credits: 0 };
    return a;
  }

  journal.forEach(e => {
    const d = ensure(e.debit_account);
    const c = ensure(e.credit_account);
    const amt = getAmount(e);
    if (amt <= 0) return;
    totals[d].debits += amt;
    totals[c].credits += amt;
  });

  let td = 0, tc = 0;
  tbody.innerHTML = "";

  Object.keys(totals).sort((a,b)=>a.localeCompare(b)).forEach(acc => {
    const d = totals[acc].debits;
    const c = totals[acc].credits;
    const bal = d - c;

    let dr = 0, cr = 0;
    if (bal > 0) dr = bal;
    else if (bal < 0) cr = Math.abs(bal);
    else return;

    td += dr; tc += cr;

    tbody.innerHTML += `
      <tr>
        <td>${acc}</td>
        <td>${dr ? dr.toLocaleString() : ""}</td>
        <td>${cr ? cr.toLocaleString() : ""}</td>
      </tr>
    `;
  });

  document.getElementById("adjTotalDebit").innerText = td.toLocaleString();
  document.getElementById("adjTotalCredit").innerText = tc.toLocaleString();
});
