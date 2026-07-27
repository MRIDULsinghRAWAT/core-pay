# CorePay | Key Features & Architectural Documentation

CorePay is a high-performance financial ledger engine and RESTful API built in Java. It guarantees financial balance integrity through atomic double-entry accounting, prevents duplicate transactions via sliding-window idempotency deduplication, provides zero-downtime operations through smart hybrid storage, and includes an embedded **AI RAG Financial Assistant**.

---

## 1. Atomic Double-Entry Accounting Engine

In financial software, a simple account balance update (e.g. `balance = balance - amount`) is vulnerable to data corruption and missing audit logs. CorePay solves this by implementing strict **Double-Entry Accounting Principles**.

- **Matching Ledger Entries:** Every single transaction atomically generates paired entries:
  - **DEBIT Entry:** Logged against the source account (decreasing liability/increasing outgoing funds).
  - **CREDIT Entry:** Logged against the target account (increasing incoming funds).
- **Transactional Atomicity:** If any step fails (e.g. insufficient funds, invalid target account), the entire transaction rolls back cleanly.
- **Auditability:** Complete historical record of every money movement with unique reference tags (e.g., `TXN-8F9A2B1C`).

---

## 2. Idempotency Protection Engine

Network instability or duplicate button presses can lead to double transfers. CorePay enforces transaction deduplication using HTTP header tracking:

- **Header Tracking:** Accepts a client-provided `X-Idempotency-Key` (e.g., `key_9f8a7b6c`).
- **Sliding-Window Deduplication Queue:** Uses an in-memory sliding-window deduplication data structure (`IdempotencyQueue.java`) to track recently processed keys.
- **Conflict Prevention:** If a duplicate `X-Idempotency-Key` is received within the sliding window, CorePay rejects the request with HTTP `409 Conflict` / `DUPLICATE` response, preventing duplicate charges.

---

## 3. Real-Time AI RAG Financial Assistant

CorePay features an intelligent **Retrieval-Augmented Generation (RAG) Assistant** embedded directly into the glassmorphic dashboard:

- **Dynamic RAG Context Builder:** Gathers real-time context including total liquidity, active account balances, recent `DEBIT`/`CREDIT` audit logs, and accounting rules.
- **Natural Language Financial Search:**
  - *"Summarize reserve liquidity"*
  - *"Who received money recently?"*
  - *"Explain double entry accounting rules"*
- **Dual-Engine Architecture:** Connects to Google Gemini API when an API key is configured in Settings, or falls back to CorePay's built-in intelligent RAG processor.

---

## 4. Smart Hybrid Storage (Zero-Downtime Fallback)

CorePay features an intelligent dual-mode storage engine designed to ensure uninterrupted transaction processing:

- **Primary Storage (MySQL 8.0):** Relational database storage with foreign key constraints, indexes, and full SQL persistence (`db_schema.sql`).
- **Automatic Fallback (In-Memory Store):** If the MySQL service is offline or unreachable, CorePay catches connection exceptions and seamlessly routes transactions to a thread-safe `ConcurrentHashMap` / `CopyOnWriteArrayList` in-memory store.
- **Zero Downtime:** Client APIs and UI continue operating smoothly regardless of database availability.

---

## 5. Modern Payment Application Web Dashboard

CorePay includes a responsive, single-page web dashboard built with HTML5 and CSS3:

- **Aesthetics & Theme:** Pure pitch-black background (`#000000`) with frosted glassmorphism cards (`backdrop-filter: blur(35px)`), subtle inner reflections, and deep purple accents.
- **Multi-View SPA System:**
  - **Home View:** Virtual card display (`CorePay Vault`), system liquidity metrics, quick action pills, favorite transfer contacts, and recent transaction feeds.
  - **Cards & Accounts View:** Full account directory with instant search filtering and quick transfer shortcuts.
  - **History View:** Audit log displaying detailed `DEBIT` / `CREDIT` breakdowns for every transaction.
  - **Settings View:** Configurable API URLs, Gemini AI API key inputs, live polling rates (3s, 5s, 10s, manual), and system diagnostics.
- **Live Real-Time Polling:** Automatically refreshes account balances and transaction logs every 3 seconds.
- **Interactive Send Money Modal:** Features pre-filled recipient selections and quick preset amount buttons (`+$100`, `+$250`, `+$500`, `+$1000`).

---

## 6. Lightweight Native Java REST Server

CorePay runs on a standalone Java HTTP server without external web framework dependencies:

- **Built-in Java HTTP Server:** Powered by native `com.sun.net.httpserver.HttpServer` listening on port `8080`.
- **Zero Overhead:** Extremely low CPU and memory consumption.
- **CORS Supported:** Includes full Cross-Origin Resource Sharing (`Access-Control-Allow-Origin: *`) headers for seamless web dashboard integration.

---

## 7. REST API Endpoint Summary

| HTTP Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/accounts` | Fetches all registered accounts and current balances |
| `GET` | `/api/transactions` | Retrieves historical transaction audit logs |
| `POST` | `/api/transfer` | Executes an atomic double-entry transfer between two accounts |

---

## Technical Stack Summary

- **Backend:** Java 17+, JDBC, Native Java HTTP Server
- **AI RAG Engine:** Real-Time Ledger RAG Context + Google Gemini API / Built-in Fallback
- **Database:** MySQL 8.0 (with automatic In-Memory fallback)
- **Frontend:** Vanilla HTML5, CSS3 Glassmorphism, JavaScript ES6+
