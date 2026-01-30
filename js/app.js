document.addEventListener("DOMContentLoaded", () => {
    const journal = JSON.parse(localStorage.getItem("journal") || "[]");

    const journalCount = document.getElementById("journalCount");
    const ledgerCount = document.getElementById("ledgerCount");
    const trialStatus = document.getElementById("trialStatus");

    journalCount.innerText = journal.length;

    const accounts = new Set(journal.flatMap(e => [e.debit_account, e.credit_account]));
    ledgerCount.innerText = accounts.size;

    let totalDebit = 0, totalCredit = 0, rev = 0, exp = 0;

    journal.forEach(e => {
        totalDebit += e.debit_amount;
        totalCredit += e.credit_amount;

        if (e.debit_account.toLowerCase().includes("expense") || e.credit_account.toLowerCase().includes("expense")) {
            exp += e.debit_amount - e.credit_amount;
        }
        if (e.debit_account.toLowerCase().includes("revenue") || e.credit_account.toLowerCase().includes("revenue")) {
            rev += e.credit_amount - e.debit_amount;
        }
    });

    trialStatus.innerText = totalDebit === totalCredit ? "Balanced" : "Not Balanced";

    const ctx = document.getElementById("revExpChart").getContext("2d");
    new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Revenue", "Expenses"],
            datasets: [{ data: [rev, exp], backgroundColor: ["#10b981", "#ef4444"] }]
        },
        options: { responsive: true }
    });
});
