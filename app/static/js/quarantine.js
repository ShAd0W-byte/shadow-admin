// =======================================
// Shadow Admin CTF
// Quarantine Overview + Restore
// =======================================

import {
    getQuarantinedServers,
    restoreServer
} from "./api.js";

const tableBody = document.querySelector("#quarantine-table tbody");

/* -------------------------------
   Load Quarantined Servers
-------------------------------- */

async function loadQuarantine() {
    tableBody.innerHTML = "";

    const servers = await getQuarantinedServers();

    if (servers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6">No quarantined servers</td>
            </tr>
        `;
        return;
    }

    for (const server of servers) {
        const tr = document.createElement("tr");

        const restoreBtn = document.createElement("button");
        restoreBtn.textContent = "Restore";
        restoreBtn.className = "btn";
        restoreBtn.onclick = async () => {
            restoreBtn.disabled = true;
            restoreBtn.textContent = "Restoring...";

            try {
                await restoreServer(server.id);
                await loadQuarantine(); // refresh list
            } catch (err) {
                alert("Restore failed");
                restoreBtn.disabled = false;
                restoreBtn.textContent = "Restore";
            }
        };

        tr.innerHTML = `
            <td><code>${server.id}</code></td>
            <td>${server.name}</td>
            <td>${server.environment}</td>
            <td>${server.status}</td>
            <td>
                <a href="/server?id=${server.id}">View</a>
            </td>
        `;

        const restoreCell = document.createElement("td");
        restoreCell.appendChild(restoreBtn);
        tr.appendChild(restoreCell);

        tableBody.appendChild(tr);
    }
}

/* -------------------------------
   Init
-------------------------------- */

loadQuarantine();
