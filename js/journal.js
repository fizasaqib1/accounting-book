const cleanAcc = (s) =>
  String(s || "")
    .replace(/\r/g, "")
    .replace(/\u00A0/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());


const cleanTxt = (s) => String(s || "").replace(/\r/g, "").trim();

async function loadCSVJournal() {
  const res = await fetch("data/journal.csv");
  const text = await res.text();
  const rows = text.trim().split("\n").slice(1);

  const csvEntries = rows
    .map((line) => {
      const parts = line.split(",");
      const date = parts[1];
      const debit_account = parts[2];
      const credit_account = parts[3];
      const amount = parts[4];
      const description = parts.slice(5).join(",");
      return {
        date: cleanTxt(date),
        debit_account: cleanAcc(debit_account),
        debit_amount: Number(amount),
        credit_account: cleanAcc(credit_account),
        credit_amount: Number(amount),
        description: cleanTxt(description)
      };
    })
    .filter((e) => e.date && e.debit_account && e.credit_account && isFinite(e.debit_amount) && e.debit_amount > 0);

  const stored = JSON.parse(localStorage.getItem("journal") || "[]");
  const journal = Array.isArray(stored) ? stored : [];

  csvEntries.forEach((e) => {
    const exists = journal.some((x) =>
      cleanTxt(x.date) === e.date &&
      cleanAcc(x.debit_account) === e.debit_account &&
      cleanAcc(x.credit_account) === e.credit_account &&
      Number(x.debit_amount) === e.debit_amount &&
      Number(x.credit_amount) === e.credit_amount &&
      cleanTxt(x.description) === e.description
    );
    if (!exists) journal.push(e);
  });

  localStorage.setItem("journal", JSON.stringify(journal));
  return journal;
}

function getJournal() {
  const j = JSON.parse(localStorage.getItem("journal") || "[]");
  return Array.isArray(j) ? j : [];
}

function setJournal(j) {
  localStorage.setItem("journal", JSON.stringify(Array.isArray(j) ? j : []));
}

function renderJournalTable(journal) {
  const tbody = document.querySelector("#journalBody tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  journal.forEach((e) => {
    const date = cleanTxt(e.date || e.entry_date || "");
    const da = cleanAcc(e.debit_account);
    const ca = cleanAcc(e.credit_account);
    const dAmt = Number(e.debit_amount ?? e.amount ?? 0);
    const cAmt = Number(e.credit_amount ?? e.amount ?? 0);
    const desc = cleanTxt(e.description);

    const dr = document.createElement("tr");
    dr.innerHTML = `
      <td>${date}</td>
      <td class="debit-text">${da}</td>
      <td class="amount">${Number(dAmt).toLocaleString()}</td>
      <td></td>
      <td rowspan="2" class="description">${desc}</td>
    `;

    const cr = document.createElement("tr");
    cr.innerHTML = `
      <td></td>
      <td class="credit-text" style="padding-left:26px">${ca}</td>
      <td></td>
      <td class="amount">${Number(cAmt).toLocaleString()}</td>
    `;

    tbody.appendChild(dr);
    tbody.appendChild(cr);
  });
}

function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg || "Entry added successfully";
  t.style.display = "block";
  setTimeout(() => (t.style.display = "none"), 2000);
}

function scrollToLastEntry() {
  const tbody = document.querySelector("#journalBody tbody");
  if (!tbody) return;
  const rows = tbody.querySelectorAll("tr");
  if (!rows.length) return;
  rows[rows.length - 1].scrollIntoView({ behavior: "smooth", block: "end" });
}

document.addEventListener("DOMContentLoaded", async () => {
  const t = document.getElementById("stmtToggle");
  const m = document.getElementById("stmtMenu");
  if (t && m) {
    t.addEventListener("click", (e) => {
      e.preventDefault();
      m.style.display = m.style.display === "block" ? "none" : "block";
    });
  }

  const matchBtn = document.getElementById("matchAmtBtn");
  if (matchBtn) {
    matchBtn.addEventListener("click", () => {
      const debitAmount = document.getElementById("debitAmount");
      const creditAmount = document.getElementById("creditAmount");
      if (!debitAmount || !creditAmount) return;
      creditAmount.value = debitAmount.value;
      creditAmount.focus();
    });
  }

  let journal = await loadCSVJournal();
  renderJournalTable(journal);

  const form = document.getElementById("journalForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const date = document.getElementById("date")?.value || "";
    const debit_account = cleanAcc(document.getElementById("debitAccount")?.value || "");
    const credit_account = cleanAcc(document.getElementById("creditAccount")?.value || "");
    const debit_amount = Number(document.getElementById("debitAmount")?.value || 0);
    const credit_amount = Number(document.getElementById("creditAmount")?.value || 0);
    const description = cleanTxt(document.getElementById("description")?.value || "");

    const entry = {
      date: cleanTxt(date),
      debit_account,
      debit_amount,
      credit_account,
      credit_amount,
      description
    };

    journal = getJournal();
    journal.push(entry);
    setJournal(journal);

    renderJournalTable(journal);
    form.reset();
    toast("Entry added successfully");
    setTimeout(scrollToLastEntry, 100);
  });
});
const debit_account = cleanAcc(document.getElementById("debitAccount")?.value || "");
const credit_account = cleanAcc(document.getElementById("creditAccount")?.value || "");
