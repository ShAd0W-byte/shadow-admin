// =======================================
// Shadow Admin CTF
// Server Detail Logic (Enhanced)
// =======================================

import {
    listServers,
    getServerMetadata,
    updateMetadata,
    getQuarantineLog,
    getProdBackup,
    orphanServer,
} from "./api.js";

const params = new URLSearchParams(window.location.search);
const serverId = params.get("id");

const serverInfoPre = document.getElementById("server-info");
const metadataBody = document.querySelector("#metadata-table tbody");
const metaKeyInput = document.getElementById("meta-key");
const metaValueInput = document.getElementById("meta-value");
const metaError = document.getElementById("meta-error");

const quarantinePre = document.getElementById("quarantine-log");

const backupBtn = document.getElementById("backup-btn");
const backupError = document.getElementById("backup-error");

const orphanBtn = document.getElementById("orphan-btn");
const orphanError = document.getElementById("orphan-error");

let currentServer = null;

/* -------------------------------
   Load Server Info
-------------------------------- */

async function loadServer() {
    try {
        const servers = await listServers();
        const server = servers.find(s => s.id === serverId);

        if (!server) {
            serverInfoPre.textContent = "❌ Server not found";
            return;
        }

        currentServer = server;
        serverInfoPre.textContent = JSON.stringify(server, null, 2);

        // Update orphan button state
        if (server.status !== "active") {
            orphanBtn.disabled = true;
            orphanBtn.textContent = `Server is ${server.status}`;
        }
    } catch (e) {
        serverInfoPre.textContent = `Error loading server: ${e.status}`;
    }
}

/* -------------------------------
   Metadata
-------------------------------- */

async function loadMetadata() {
    metadataBody.innerHTML = `
        <tr>
            <td colspan="2" style="text-align: center; color: #9ca3af;">
                Loading metadata...
            </td>
        </tr>
    `;

    try {
        const metadata = await getServerMetadata(serverId);

        if (metadata.length === 0) {
            metadataBody.innerHTML = `
                <tr>
                    <td colspan="2" style="text-align: center; color: #9ca3af;">
                        No metadata yet. Add some below!
                    </td>
                </tr>
            `;
            return;
        }

        metadataBody.innerHTML = "";

        for (const item of metadata) {
            const tr = document.createElement("tr");
            
            // Truncate long values for display
            let displayValue = item.meta_value;
            if (displayValue.length > 100) {
                displayValue = displayValue.substring(0, 100) + "...";
            }
            
            tr.innerHTML = `
                <td><strong style="color: #60a5fa;">${escapeHtml(item.meta_key)}</strong></td>
                <td><code style="color: #cbd5e1;">${escapeHtml(displayValue)}</code></td>
            `;
            metadataBody.appendChild(tr);
        }
    } catch (e) {
        metadataBody.innerHTML = `
            <tr>
                <td colspan="2" style="text-align: center; color: #f87171;">
                    ❌ Access denied or error: ${e.status}
                </td>
            </tr>
        `;
    }
}

document.getElementById("save-meta").onclick = async () => {
    metaError.textContent = "";

    const key = metaKeyInput.value.trim();
    const value = metaValueInput.value.trim();

    if (!key || !value) {
        metaError.textContent = "⚠️ Both key and value are required";
        return;
    }

    const saveBtn = document.getElementById("save-meta");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        await updateMetadata(serverId, key, value);

        metaKeyInput.value = "";
        metaValueInput.value = "";
        
        metaError.classList.remove("error");
        metaError.classList.add("success");
        metaError.textContent = `✓ Metadata "${key}" saved successfully!`;
        
        await loadMetadata();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
            metaError.textContent = "";
            metaError.classList.remove("success");
        }, 3000);
    } catch (e) {
        metaError.textContent = ` Error: ${e.status} - ${JSON.stringify(e.body)}`;
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Metadata";
    }
};

/* -------------------------------
   Orphan Server
-------------------------------- */

orphanBtn.onclick = async () => {
    orphanError.textContent = "";

    if (!currentServer) {
        orphanError.textContent = "Server information not loaded";
        return;
    }

    if (!confirm(`⚠️ Are you sure you want to orphan "${currentServer.name}"?\n\nThis server will be:\n1. Marked as orphaned\n2. Processed by the automated janitor\n3. Moved to quarantine\n\nThis action cannot be easily undone.`)) {
        return;
    }

    orphanBtn.disabled = true;
    orphanBtn.textContent = "Processing...";

    try {
        await orphanServer(serverId);
        alert(`✓ Server "${currentServer.name}" has been orphaned.\n\nThe automated system will process it shortly. Redirecting to dashboard...`);
        window.location.href = "/";
    } catch (e) {
        orphanError.textContent = `❌ Error: ${e.status} - ${JSON.stringify(e.body)}`;
        orphanBtn.disabled = false;
        orphanBtn.textContent = "Orphan This Server";
    }
};

/* -------------------------------
   Quarantine Log
-------------------------------- */

async function loadQuarantineLog() {
    quarantinePre.textContent = "Loading quarantine log...";
    
    try {
        const log = await getQuarantineLog(serverId);
        
        if (log.log && log.log.trim()) {
            quarantinePre.textContent = log.log;
        } else {
            quarantinePre.textContent = "No quarantine log available yet.\n\nTo generate a quarantine log:\n1. Add metadata to this server\n2. Click 'Orphan This Server'\n3. Wait for the automated janitor to process it\n4. The log will appear here";
        }
    } catch (e) {
        if (e.status === 404) {
            quarantinePre.textContent = "No quarantine log available yet.\n\nThis server has not been quarantined.\nOrphan the server to generate a quarantine log.";
        } else {
            quarantinePre.textContent = `Error loading log: ${e.status}`;
        }
    }
}

/* -------------------------------
   Prod Backup Attempt
-------------------------------- */

backupBtn.onclick = async () => {
    backupError.textContent = "";

    if (!currentServer) {
        backupError.textContent = "Server information not loaded";
        return;
    }

    backupBtn.disabled = true;
    backupBtn.textContent = "Accessing...";

    try {
        const result = await getProdBackup(serverId);
        alert(`✓ Backup Access Result:\n\n${JSON.stringify(result, null, 2)}`);
        backupError.classList.remove("error");
        backupError.classList.add("success");
        backupError.textContent = "✓ Backup accessed successfully!";
    } catch (e) {
        if (e.status === 403) {
            backupError.textContent = "🔒 Access Denied: Only production servers can access backups";
        } else {
            backupError.textContent = `❌ Error: ${e.status} - ${JSON.stringify(e.body)}`;
        }
    } finally {
        backupBtn.disabled = false;
        backupBtn.textContent = "Access Production Backup";
    }
};

/* -------------------------------
   Utility Functions
-------------------------------- */

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* -------------------------------
   Init
-------------------------------- */

async function init() {
    if (!serverId) {
        serverInfoPre.textContent = "❌ Missing server ID in URL";
        return;
    }

    await loadServer();
    await loadMetadata();
    await loadQuarantineLog();
    
    // Auto-refresh quarantine log every 10 seconds
    setInterval(loadQuarantineLog, 10000);
}

init();
