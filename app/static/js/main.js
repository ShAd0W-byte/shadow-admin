// =======================================
// Shadow Admin CTF
// Main Dashboard Logic (Enhanced)
// =======================================

import {
    getIdentity,
    listServers,
    createServer,
    orphanServer,
    restoreServer,
} from "./api.js";

const identityDiv = document.getElementById("identity");
const tableBody = document.querySelector("#servers-table tbody");
const createBtn = document.getElementById("create-server");
const createError = document.getElementById("create-error");
const serverNameInput = document.getElementById("server-name");

/* -------------------------------
   Identity
-------------------------------- */

async function loadIdentity() {
    try {
        const identity = await getIdentity();
        identityDiv.textContent = `Logged in as: ${identity.username} (${identity.role})`;
    } catch (e) {
        identityDiv.textContent = "Not logged in";
    }
}

/* -------------------------------
   Servers
-------------------------------- */

async function loadServers() {
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; color: #9ca3af;">
                Loading servers...
            </td>
        </tr>
    `;

    try {
        const servers = await listServers();

        if (servers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #9ca3af;">
                        No servers yet. Create one above!
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = "";

        for (const server of servers) {
            const tr = document.createElement("tr");

            // Create status badge
            const statusBadge = `<span class="badge ${server.status}">${server.status}</span>`;
            const envBadge = `<span class="badge ${server.environment}">${server.environment}</span>`;

            tr.innerHTML = `
                <td><code style="color: #60a5fa;">${server.id.substring(0, 8)}...</code></td>
                <td><strong>${server.name}</strong></td>
                <td>${envBadge}</td>
                <td>${statusBadge}</td>
                <td>${server.owner_id ? `<code>${server.owner_id}</code>` : '<span style="color: #9ca3af;">—</span>'}</td>
                <td></td>
            `;

            const actionsTd = tr.querySelector("td:last-child");

            // View button
            const viewBtn = document.createElement("button");
            viewBtn.textContent = "View";
            viewBtn.onclick = () => {
                window.location.href = `/server?id=${server.id}`;
            };
            actionsTd.appendChild(viewBtn);

            // Orphan button (only for active servers)
            if (server.status === "active") {
                const orphanBtn = document.createElement("button");
                orphanBtn.className = "secondary";
                orphanBtn.textContent = "Orphan";
                orphanBtn.onclick = async () => {
                    if (!confirm(`Orphan server "${server.name}"? It will be processed by the automated system.`)) {
                        return;
                    }

                    orphanBtn.disabled = true;
                    orphanBtn.textContent = "Processing...";

                    try {
                        await orphanServer(server.id);
                        await loadServers();
                    } catch (e) {
                        alert(`Error: ${e.status} - ${JSON.stringify(e.body)}`);
                        orphanBtn.disabled = false;
                        orphanBtn.textContent = "Orphan";
                    }
                };
                actionsTd.appendChild(orphanBtn);
            }

            // Restore button (only for quarantined servers)
            if (server.status === "quarantined") {
                const restoreBtn = document.createElement("button");
                restoreBtn.textContent = "Restore";
                restoreBtn.onclick = async () => {
                    if (!confirm(`Restore server "${server.name}" to active status?`)) {
                        return;
                    }

                    restoreBtn.disabled = true;
                    restoreBtn.textContent = "Restoring...";

                    try {
                        await restoreServer(server.id);
                        await loadServers();
                    } catch (e) {
                        alert(`Error: ${e.status} - ${JSON.stringify(e.body)}`);
                        restoreBtn.disabled = false;
                        restoreBtn.textContent = "Restore";
                    }
                };
                actionsTd.appendChild(restoreBtn);
            }

            tableBody.appendChild(tr);
        }
    } catch (e) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #f87171;">
                    Error loading servers: ${e.status}
                </td>
            </tr>
        `;
    }
}

/* -------------------------------
   Create Server
-------------------------------- */

createBtn.onclick = async () => {
    createError.textContent = "";

    const name = serverNameInput.value.trim();
    if (!name) {
        createError.textContent = "⚠️ Server name is required";
        return;
    }

    createBtn.disabled = true;
    createBtn.textContent = "Creating...";

    try {
        await createServer(name);
        serverNameInput.value = "";
        createError.classList.remove("error");
        createError.classList.add("success");
        createError.textContent = `✓ Server "${name}" created successfully!`;
        await loadServers();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
            createError.textContent = "";
            createError.classList.remove("success");
        }, 3000);
    } catch (e) {
        createError.textContent = ` Error: ${e.status} - ${JSON.stringify(e.body)}`;
    } finally {
        createBtn.disabled = false;
        createBtn.textContent = "Create Server";
    }
};

// Allow Enter key to create server
serverNameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        createBtn.click();
    }
});

/* -------------------------------
   Init
-------------------------------- */

async function init() {
    await loadIdentity();
    await loadServers();
    
    // Auto-refresh servers every 30 seconds
    setInterval(loadServers, 30000);
}

init();
