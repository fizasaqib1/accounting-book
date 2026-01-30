document.addEventListener("DOMContentLoaded", () => {
    const journal = Storage.get("journal");
    journalCount.innerText = journal.length;

    const accs = new Set(journal.flatMap(e => [e.debit_account, e.credit_account]));
    ledgerCount.innerText = accs.size;

    let d = 0, c = 0, rev = 0, exp = 0;

    journal.forEach(e => {
        d += e.debit_amount;
        c += e.credit_amount;

        if (e.credit_account.toLowerCase().includes("revenue")) rev += e.credit_amount;
        if (e.debit_account.toLowerCase().includes("expense")) exp += e.debit_amount;
    });

    trialStatus.innerText = d === c ? "Balanced" : "Not Balanced";

    new Chart(revExpChart, {
        type: "bar",
        data: {
            labels: ["Revenue", "Expenses"],
            datasets: [{ data: [rev, exp] }]
        }
    });
});
