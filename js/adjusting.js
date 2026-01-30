document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("adjTable");
  const journal = Storage.get("journal") || [];

  function detectType(e) {
    const desc = String(e.description || "").toLowerCase();
    const dAcc = String(e.debit_account || "").toLowerCase();
    const cAcc = String(e.credit_account || "").toLowerCase();

    if (dAcc.includes("accrued") || cAcc.includes("accrued") || desc.includes("accru")) return "Accrual";

    if (dAcc.includes("prepaid") || cAcc.includes("prepaid") || desc.includes("advance") || desc.includes("recognized"))
      return "Prepaid / Deferral";

    if (dAcc.includes("depreciation") || cAcc.includes("depreciation") || desc.includes("depreci"))
      return "Depreciation";

    return "";
  }

  function isAdjusting(e) {
    return detectType(e) !== "";
  }

  function amountOf(e) {
    if (e.amount != null) return Number(e.amount);
    if (e.debit_amount != null) return Number(e.debit_amount);
    if (e.credit_amount != null) return Number(e.credit_amount);
    return 0;
  }
const adjustingEntries = journal.filter(isAdjusting);

tbody.innerHTML = adjustingEntries.map((e, i) => `
  <tr>
    <td>${e.entry_id || e.id || `JE-${String(i + 1).padStart(3, "0")}`}</td>
    <td>${e.entry_date || e.date || "-"}</td>
    <td>${e.debit_account}</td>
    <td>${e.credit_account}</td>
    <td>${amountOf(e).toLocaleString()}</td>
    <td>${e.description || ""}</td>
    <td>${detectType(e)}</td>
  </tr>
`).join("");
});