# CorePay | High-Performance Financial Ledger & RESTful API

[![Java](https://img.shields.io/badge/Java-17%2B-orange.svg)](https://www.oracle.com/java/)
[![Architecture](https://img.shields.io/badge/Architecture-Double--Entry%20Ledger-blue.svg)]()
[![Idempotency](https://img.shields.io/badge/Engine-Idempotent%20Safe-green.svg)]()
[![AI RAG Assistant](https://img.shields.io/badge/AI-RAG%20Financial%20Assistant-purple.svg)]()
[![UI](https://img.shields.io/badge/Frontend-Dark%20Frosted%20Glassmorphism-violet.svg)]()
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)]()

**CorePay** is an enterprise-grade financial ledger engine and RESTful API built in Java. It handles atomic payment transfers, double-entry accounting logs, and sliding-window idempotency guarantees with zero-downtime hybrid storage fallback. It comes equipped with a modern dark frosted glass web dashboard and a real-time **AI RAG Financial Assistant** for transaction monitoring and account management.

---

## Web Dashboard Showcase

### 1. Payment Application Dashboard (Home View)
![CorePay Dashboard](docs/images/dashboard.png)

### 2. Transaction History & Audit Log (Double-Entry Log)
![CorePay Transaction History](docs/images/history.png)

### 3. Send Money Transfer Modal (Preset Amounts & Idempotency)
![CorePay Transfer Modal](docs/images/transfer_modal.png)

### 4. Real-Time AI RAG Assistant Drawer (Live Ledger Intelligence)
![CorePay AI Assistant](docs/images/ai_assistant.png)

---

## Key Features & Architecture

For in-depth architectural details, refer to [KEY_FEATURES.md](KEY_FEATURES.md).

- **Atomic Double-Entry Accounting:** Every transfer atomically logs matching `DEBIT` (source account) and `CREDIT` (target account) records, preserving system-wide balance integrity.
- **Idempotency Protection Engine:** Prevents duplicate charges or double transfers during network retries using custom `X-Idempotency-Key` deduplication.
- **Smart Hybrid Storage (Zero Downtime):** Connects to MySQL 8.0 for production storage and automatically falls back to a high-performance **In-Memory Store** if MySQL is offline.
- **Real-Time AI RAG Financial Assistant:** Floating glassmorphic widget querying live ledger data (liquidity metrics, accounts, recent transfers, double-entry rules) with dual-mode support for Google Gemini API or intelligent offline RAG engine fallback.
- **Dark Frosted Glass Web Dashboard:**
  - **Home View:** Virtual card display (`CorePay Vault`), system liquidity metrics, quick action pills, favorite transfer contacts, and recent transaction feeds.
  - **Cards & Accounts View:** Full account directory with instant search filtering and quick transfer shortcuts.
  - **History View:** Complete audit trail showing `DEBIT` / `CREDIT` breakdowns for every transaction.
  - **Settings View:** Configurable API URLs, Gemini AI API key inputs, live polling rates (3s, 5s, 10s, manual), and system diagnostics.

---

## Repository Structure

```
core-pay/
├── README.md                  # Main Documentation
├── KEY_FEATURES.md            # Detailed Architectural & Key Features Guide
├── docs/
│   └── images/                # Dashboard Screenshots & UI Assets
│       ├── dashboard.png
│       ├── history.png
│       ├── transfer_modal.png
│       └── ai_assistant.png
├── frontend/
│   ├── index.html             # Multi-view Admin Dashboard HTML
│   ├── style.css              # Dark Frosted Glassmorphism UI styles
│   └── script.js              # SPA navigation, RAG AI Assistant, live polling, & API client
└── java-backend/
    ├── pom.xml                # Maven build configuration
    └── src/
        └── main/
            ├── java/com/corepay/
            │   ├── server/
            │   │   └── TransactionServer.java   # Native Java HTTP Server (Port 8080)
            │   ├── service/
            │   │   └── LedgerEngine.java        # Double-Entry Transfer Engine
            │   ├── dsa/
            │   │   └── IdempotencyQueue.java    # Sliding-window Deduplication Queue
            │   └── dao/
            │       ├── AccountDao.java           # Account Data Access (MySQL + In-Memory)
            │       ├── TransactionDao.java       # Audit Log Data Access
            │       └── DatabaseConnection.java   # Connection Pool Manager
            └── resources/
                └── db_schema.sql                # MySQL relational schema & seed data
```

---

## Quick Start Guide

### Prerequisites
- **Java JDK 17** or higher (`java -version`, `javac -version`)
- **Web Browser** (Chrome, Firefox, Edge, etc.)
- *(Optional)* **MySQL Server 8.0**

---

### 1. Compile & Run Java Backend

Navigate to `java-backend` and run the server using Java directly (No Maven installation required):

#### Option A: Direct Java Command (Recommended)
```powershell
# Navigate to backend directory
cd java-backend

# Compile source files
javac -cp "C:\Users\Mridul\.m2\repository\com\mysql\mysql-connector-j\8.3.0\mysql-connector-j-8.3.0.jar" -d target/classes (Get-ChildItem -Path src/main/java -Recurse -Filter *.java | Select-Object -ExpandProperty FullName)

# Start Transaction Server
java -cp "target/classes;C:\Users\Mridul\.m2\repository\com\mysql\mysql-connector-j\8.3.0\mysql-connector-j-8.3.0.jar" com.corepay.server.TransactionServer
```

#### Option B: Using Maven (If `mvn` is installed)
```powershell
cd java-backend
mvn compile exec:java -Dexec.mainClass="com.corepay.server.TransactionServer"
```

*Terminal Output:*
```text
Core-Pay HTTP Server running on port 8080
```

---

### 2. Launch Web Dashboard

Navigate to `frontend` and start a simple static web server:

```powershell
cd frontend
python -m http.server 8000
```

Now open your browser at: **`http://localhost:8000`**

---

## API Reference

Base URL: `http://localhost:8080/api`

### 1. Get Accounts
- **Endpoint:** `GET /api/accounts`
- **Response `200 OK`:**
```json
[
  {
    "id": 1,
    "accountNumber": "ACC-1001",
    "holderName": "Alice Smith",
    "balance": 4900.00,
    "currency": "USD"
  },
  {
    "id": 2,
    "accountNumber": "ACC-1002",
    "holderName": "Bob Jones",
    "balance": 2600.00,
    "currency": "USD"
  }
]
```

### 2. Get Transaction Audit Logs
- **Endpoint:** `GET /api/transactions`
- **Response `200 OK`:**
```json
[
  {
    "id": 101,
    "ref": "TXN-8F9A2B1C",
    "sourceId": 1,
    "targetId": 2,
    "amount": 100.00,
    "status": "COMPLETED",
    "createdAt": "2026-07-28 01:25:00"
  }
]
```

### 3. Execute Transfer
- **Endpoint:** `POST /api/transfer`
- **Headers:** `Content-Type: application/json`, `X-Idempotency-Key: key_123456`
- **Request Body:**
```json
{
  "sourceAccountId": 1,
  "targetAccountId": 2,
  "amount": 100.00
}
```
- **Response `200 OK`:**
```json
{
  "status": "SUCCESS",
  "message": "Transfer processed successfully"
}
```
- **Duplicate Request Response `409 Conflict`:**
```json
{
  "status": "DUPLICATE",
  "message": "Duplicate request ignored"
}
```

---

## MySQL Database Setup (Optional)

If you prefer using a persistent MySQL database instead of In-Memory mode:

1. Open MySQL terminal/workbench and execute [db_schema.sql](java-backend/src/main/resources/db_schema.sql):
   ```sql
   SOURCE java-backend/src/main/resources/db_schema.sql;
   ```
2. Ensure MySQL service `MYSQL80` is running on port `3306`.
3. The Java server will automatically detect MySQL and switch to SQL persistence mode!

---

## License
This project is open-source under the MIT License.
