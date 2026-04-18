// =======================================
// Shadow Admin CTF
// Frontend API Layer
// =======================================

const API_BASE = "";

/* -------------------------------
   Helper
-------------------------------- */

async function apiRequest(path, options = {}) {
    const response = await fetch(API_BASE + path, {
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        ...options,
    });

    const text = await response.text();

    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }

    if (!response.ok) {
        throw {
            status: response.status,
            body: data,
        };
    }

    return data;
}

/* -------------------------------
   Identity (fake auth)
-------------------------------- */

export async function getIdentity() {
    return {
        username: "player",
        role: "dev",
    };
}

/* -------------------------------
   Servers
-------------------------------- */

export async function listServers() {
    return apiRequest("/servers");
}

export async function createServer(name) {
    return apiRequest(`/servers?name=${encodeURIComponent(name)}`, {
        method: "POST",
    });
}

export async function orphanServer(serverId) {
    return apiRequest(`/servers/${serverId}/orphan`, {
        method: "POST",
    });
}

export async function restoreServer(serverId) {
    return apiRequest(`/servers/${serverId}/restore`, {
        method: "POST",
    });
}

/* -------------------------------
   Metadata
-------------------------------- */

export async function getServerMetadata(serverId) {
    return apiRequest(`/servers/${serverId}/metadata`);
}

export async function updateMetadata(serverId, key, value) {
    return apiRequest(`/servers/${serverId}/metadata`, {
        method: "POST",
        body: JSON.stringify({ key, value }),
    });
}

/* -------------------------------
   Quarantine
-------------------------------- */

export async function getOrphanedServers() {
    return apiRequest("/servers/orphaned");
}

export async function getQuarantinedServers() {
    return apiRequest("/servers/quarantined");
}

export async function getQuarantineLog(serverId) {
    return apiRequest(`/servers/${serverId}/quarantine-log`);
}

/* -------------------------------
   Internal / Prod
-------------------------------- */

export async function getProdBackup(serverId) {
    return apiRequest(`/prod/internal/backup?server_id=${serverId}`);
}
