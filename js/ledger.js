document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("ledgerContainer");
  const search = document.getElementById("ledgerSearch");
  const sortName = document.getElementById("sortName");
  const sortBal = document.getElementById("sortBal");

  const norm = (s) => String(s || "").trim().replace(/\s+/g, " ");
  const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);
  const fmt = (n) => Number(n || 0).toLocaleString();

  function getJournal() {
    return JSON.parse(localStorage.getItem("journal") || "[]");
  }

  function normalizeEntry(e) {
    const amount = e.amount != null ? num(e.amount) : 0;
    const debit_amount = e.debit_amount != null ? num(e.debit_amount) : amount;
    const credit_amount = e.credit_amount != null ? num(e.credit_amount) : amount;

    return {
      date: e.entry_date || e.date || "",
      debit_account: norm(e.debit_account),
      credit_account: norm(e.credit_account),
      debit_amount,
      credit_amount
    };
  }

  let mode = "name";

  function buildLedger(journal) {
    const led = {};
    journal.forEach(raw => {
      const e = normalizeEntry(raw);
      if (!e.debit_account || !e.credit_account) return;

      led[e.debit_account] ||= [];
      led[e.credit_account] ||= [];

      led[e.debit_account].push({ date: e.date, particulars: e.credit_account, dr: e.debit_amount, cr: 0 });
      led[e.credit_account].push({ date: e.date, particulars: e.debit_account, dr: 0, cr: e.credit_amount });
    });

    Object.keys(led).forEach(acc => {
      led[acc].sort((a,b) => String(a.date).localeCompare(String(b.date)));
    });

    return led;
  }

  function cardHTML(acc, rows) {
    let drTotal = 0, crTotal = 0;
    rows.forEach(r => { drTotal += num(r.dr); crTotal += num(r.cr); });

    const bal = drTotal - crTotal;
    const side = bal >= 0 ? "dr" : "cr";
    const balText = `${fmt(Math.abs(bal))} ${side.toUpperCase()}`;

    const tr = rows.map(r => `
      <tr>
        <td class="ledger-muted">${r.date || ""}</td>
        <td>${r.particulars || ""}</td>
        <td class="ledger-right">${r.dr ? fmt(r.dr) : ""}</td>
        <td class="ledger-right">${r.cr ? fmt(r.cr) : ""}</td>
      </tr>
    `).join("");

    return `
      <div class="ledger-card" data-acc="${acc.toLowerCase()}" data-bal="${Math.abs(bal)}">
        <div class="ledger-card-head">
          <h3 class="ledger-card-title">${acc}</h3>
          <span class="ledger-badge ${side}">Balance: ${balText}</span>
        </div>

        <table class="ledger-table">
          <thead>
            <tr>
              <th style="width:22%">Date</th>
              <th>Particulars</th>
              <th class="ledger-right" style="width:18%">Debit</th>
              <th class="ledger-right" style="width:18%">Credit</th>
            </tr>
          </thead>
          <tbody>${tr}</tbody>
        </table>

        <div class="ledger-foot">
          <div>Total Debit: ${fmt(drTotal)}</div>
          <div>Total Credit: ${fmt(crTotal)}</div>
        </div>
      </div>
    `;
  }

  function render() {
    const journal = getJournal();
    const led = buildLedger(journal);

    const q = norm(search.value).toLowerCase();

    let accounts = Object.keys(led);

    if (q) accounts = accounts.filter(a => a.toLowerCase().includes(q));

    let html = accounts.map(acc => cardHTML(acc, led[acc])).join("");
    container.innerHTML = html;

    const cards = Array.from(container.querySelectorAll(".ledger-card"));

    if (mode === "name") {
      cards.sort((a,b) => a.getAttribute("data-acc").localeCompare(b.getAttribute("data-acc")));
    } else {
      cards.sort((a,b) => Number(b.getAttribute("data-bal")) - Number(a.getAttribute("data-bal")));
    }

    cards.forEach(c => container.appendChild(c));
  }

  search.addEventListener("input", render);

  sortName.addEventListener("click", () => {
    mode = "name";
    sortName.classList.add("active");
    sortBal.classList.remove("active");
    render();
  });

  sortBal.addEventListener("click", () => {
    mode = "bal";
    sortBal.classList.add("active");
    sortName.classList.remove("active");
    render();
  });

  render();
  setInterval(render, 900);
});
