# CorePay | High-Performance Financial Ledger & RESTful API

[![Java](https://img.shields.io/badge/Java-17%2B-orange.svg)](https://www.oracle.com/java/)
[![Database](https://img.shields.io/badge/Database-MySQL%208.0-blue.svg)](https://www.mysql.com/)
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

## System Architecture & Data Flow

For detailed layer breakdowns and interviewer walkthrough guides, see [ARCHITECTURE.md](other_docs/ARCHITECTURE.md).

### 1. High-Level Architecture Diagram

```mermaid
graph TD
    classDef client fill:#1e1b4b,stroke:#9333ea,stroke-width:2px,color:#ffffff;
    classDef server fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#ffffff;
    classDef engine fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#ffffff;
    classDef db fill:#451a03,stroke:#f97316,stroke-width:2px,color:#ffffff;
    classDef ai fill:#581c87,stroke:#c084fc,stroke-width:2px,color:#ffffff;

    subgraph Layer1["1. Client & Presentation Layer"]
        UI["Dark Frosted Glass Web Dashboard<br/>(HTML5 / CSS3 / Vanilla JS)"]:::client
        AIChat["CP AI Assistant Chat Drawer<br/>(Floating Glass Drawer)"]:::client
    end

    subgraph Layer2["2. API Gateway & Controller Layer"]
        Server["TransactionServer.java<br/>(Native Java HttpServer on Port 8080)"]:::server
        CORS["CORS & Route Handlers<br/>(/api/accounts, /api/transactions, /api/transfer)"]:::server
    end

    subgraph Layer3["3. Core Transaction Processing Engine"]
        IdemQueue["Idempotency Protection Queue<br/>(IdempotencyQueue.java - Sliding Window)"]:::engine
        Ledger["Double-Entry Ledger Engine<br/>(LedgerEngine.java - Atomic Transfer)"]:::engine
    end

    subgraph Layer4["4. Smart Hybrid Persistence Layer"]
        MySQL["Primary Database: MySQL 8.0<br/>(relational ACID SQL Tables)"]:::db
        InMemory["Fallback Storage: ConcurrentHashMap<br/>(In-Memory Thread-Safe Store)"]:::db
    end

    subgraph Layer5["5. Intelligence & RAG Engine Layer"]
        RAGContext["RAG Context Builder<br/>(buildRAGContext in script.js)"]:::ai
        LLM["Google Gemini API / Fallback LLM Engine"]:::ai
    end

    %% Flow Connections
    UI -->|"HTTP REST Requests"| Server
    AIChat -->|"Prompt + RAG Context"| LLM
    Server --> CORS
    CORS --> IdemQueue
    IdemQueue -->|"Key Validated"| Ledger
    Ledger -->|"Primary SQL Attempt"| MySQL
    Ledger -->|"Fallback if SQL Fails"| InMemory
    UI -->|"Polls Accounts & Transactions"| RAGContext
    RAGContext -->|"Injects Live Ledger Data"| AIChat
```

### 2. End-to-End Payment Transfer Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Client UI
    participant Server as TransactionServer (8080)
    participant Idem as IdempotencyQueue
    participant Engine as LedgerEngine
    participant DB as MySQL DB / In-Memory Store

    User->>Server: POST /api/transfer {source: 1, target: 2, amount: 100} [Header: X-Idempotency-Key]
    Server->>Idem: checkAndAddKey(X-Idempotency-Key)
    
    alt Key already exists in sliding window
        Idem-->>Server: Duplicate Key Detected (true)
        Server-->>User: HTTP 409 Conflict {status: "DUPLICATE", message: "Request ignored"}
    else Key is valid & fresh
        Idem-->>Server: Key Accepted (false)
        Server->>Engine: transfer(sourceId: 1, targetId: 2, amount: 100)
        
        Engine->>DB: Fetch Source Acc #1 & Target Acc #2
        DB-->>Engine: Source Balance: $5000, Target Balance: $2500
        
        alt Source Balance < Amount
            Engine-->>Server: Insufficient Funds Exception
            Server-->>User: HTTP 400 Bad Request {error: "Insufficient funds"}
        else Source Balance >= Amount
            Engine->>DB: Atomic DEBIT Acc #1 (-$100) & CREDIT Acc #2 (+$100)
            Engine->>DB: Log Transaction Record (TXN-Ref, DEBIT/CREDIT status)
            DB-->>Engine: Transaction Committed Successfully
            Engine-->>Server: Transfer Success
            Server-->>User: HTTP 200 OK {status: "SUCCESS"}
        end
    end
```

### 3. Double-Entry Accounting Data Flow

```
                       TRANSFER REQUEST: $100.00
                       Mridul (Acc #1) ──► Don (Acc #2)
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │    Atomic Transaction Log     │
                   └───────────────┬───────────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
    ┌───────────────────────────┐       ┌───────────────────────────┐
    │     DEBIT ENTRY           │       │     CREDIT ENTRY          │
    │ Source: Acc #1 (Mridul)   │       │ Target: Acc #2 (Don)      │
    │ Amount: -$100.00          │       │ Amount: +$100.00          │
    │ Balance: $4900.00         │       │ Balance: $2600.00         │
    └───────────────────────────┘       └───────────────────────────┘
                 │                                   │
                 └─────────────────┬─────────────────┘
                                   ▼
                ┌─────────────────────────────────────┐
                │ Accounting Verification Equation    │
                │     Sum(DEBIT) == Sum(CREDIT)       │
                │        -$100.00 + $100.00 = $0      │
                └─────────────────────────────────────┘
```

---

## Key Features & Architecture

- **Atomic Double-Entry Accounting:** Every transfer atomically logs matching `DEBIT` (source account) and `CREDIT` (target account) records, preserving system-wide balance integrity.
- **Dynamic Account Creation:** Supports creating new financial accounts on the fly via `POST /api/accounts` with auto-generated account numbers (`ACC-100X`) and dual-mode persistence (MySQL DB + In-Memory Store).
- **Idempotency Protection Engine:** Prevents duplicate charges or double transfers during network retries using custom `X-Idempotency-Key` deduplication.
- **Smart Hybrid Storage (Zero Downtime):** Connects to MySQL 8.0 for production storage and automatically falls back to a high-performance **In-Memory Store** if MySQL is offline.
- **Real-Time AI RAG Financial Assistant:** Floating glassmorphic widget querying live ledger data (liquidity metrics, accounts, recent transfers, double-entry rules) with dual-mode support for Google Gemini API or intelligent offline RAG engine fallback.
- **Dark Frosted Glass Web Dashboard:**
  - **Home View:** Virtual card display (`CorePay Vault`), system liquidity metrics, quick action pills, favorite transfer contacts, and recent transaction feeds.
  - **Cards & Accounts View:** Full account directory with instant search filtering, new account modal (`+ Add Account`), and quick transfer shortcuts.
  - **History View:** Complete audit trail showing `DEBIT` / `CREDIT` breakdowns for every transaction.
  - **Settings View:** Configurable API URLs, Gemini AI API key inputs, live polling rates (3s, 5s, 10s, manual), and system diagnostics.

---

## Repository Structure

```
core-pay/
├── README.md                  # Main Documentation
├── docs/
│   └── images/                # Dashboard Screenshots & UI Assets
│       ├── dashboard.png
│       ├── history.png
│       ├── transfer_modal.png
│       └── ai_assistant.png
├── other_docs/
│   ├── ARCHITECTURE.md        # Comprehensive Architecture & Flow Diagrams Guide
│   ├── KEY_FEATURES.md        # Feature Specifications & Technical Details
│   └── INTERVIEW_GUIDE.md    # Interview Preparation Cheat Sheet & Cross-Questions
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
- **Web Browser** (Chrome, Firefox, Edge, Safari)
- *(Optional)* **MySQL Server 8.0** *(Ties into core relational tables; In-Memory fallback operates automatically if MySQL is not active)*

---

### Step 1: Run Backend (Terminal 1)
```bash
cd java-backend
javac -d target/classes src/main/java/com/corepay/*/*.java src/main/java/com/corepay/*/*/*.java
java -cp target/classes com.corepay.server.TransactionServer
```

### Step 2: Run Frontend (Terminal 2)
```bash
cd frontend
python -m http.server 8000
```
*(Or simply double-click [frontend/index.html](file:///c:/Users/Mridul/Desktop/core-pay/frontend/index.html) to open directly in your browser)*

### Step 3: Access Application
Open your browser and visit: **`http://localhost:8000`**

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
    "holderName": "Mridul",
    "balance": 4900.00,
    "currency": "USD"
  },
  {
    "id": 2,
    "accountNumber": "ACC-1002",
    "holderName": "Don",
    "balance": 2600.00,
    "currency": "USD"
  }
]
```

### 2. Create New Account
- **Endpoint:** `POST /api/accounts`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "holderName": "Charlie Brown",
  "balance": 1500.00,
  "currency": "USD"
}
```
- **Response `201 Created`:**
```json
{
  "id": 4,
  "accountNumber": "ACC-1004",
  "holderName": "Charlie Brown",
  "balance": 1500.00,
  "currency": "USD"
}
```

### 3. Get Transaction Audit Logs
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

### 4. Execute Transfer
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

## MySQL Database Architecture & Setup

CorePay uses **MySQL 8.0** as its primary relational database for persistent double-entry financial storage, backed by 4 normalized tables:
- **`accounts`**: Stores account details, holder names, and balances (`DECIMAL(15,2)` precision).
- **`transactions`**: Logs main transaction headers (`transaction_ref`, source/target account IDs, status).
- **`ledger_entries`**: Enforces double-entry accounting by recording matching `DEBIT` and `CREDIT` rows for every transfer.
- **`idempotency_keys`**: Caches idempotency headers to prevent duplicate charges across server restarts.

### Running the SQL Schema:

1. Ensure MySQL service (`MYSQL80`) is running on port `3306`.
2. Execute the schema script [db_schema.sql](file:///c:/Users/Mridul/Desktop/core-pay/java-backend/src/main/resources/db_schema.sql):

   - **Via Terminal (MySQL CLI):**
     ```bash
     mysql -u root -p < java-backend/src/main/resources/db_schema.sql
     ```
   - **Via Full Path (Windows):**
     ```cmd
     "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < java-backend\src\main\resources\db_schema.sql
     ```
   - **Via MySQL Prompt (`mysql>`):**
     ```sql
     SOURCE java-backend/src/main/resources/db_schema.sql;
     ```

> **Zero-Downtime Fallback Note:** If MySQL is not running or offline, the Java server gracefully catches `SQLException` and automatically operates in high-performance **In-Memory Store** (`ConcurrentHashMap`) mode out of the box!

---

## 🌐 Production Deployment Guide

### 1. Backend Deployment (Render / Railway / Docker)

- **Option A: Deploy to Render.com (Free Web Service)**
  1. Push code to GitHub and connect repo to [Render.com](https://render.com).
  2. Create a new **Web Service**, select **Docker** environment.
  3. Set Dockerfile Path to: `java-backend/Dockerfile`.
  4. Render will auto-build and assign a public URL (e.g. `https://core-pay-backend.onrender.com`).

- **Option B: Run via Docker Container (Local / VPS)**
  ```bash
  docker build -t core-pay-backend -f java-backend/Dockerfile .
  docker run -p 8080:8080 core-pay-backend
  ```

---

### 2. Frontend Deployment (Vercel / Netlify / GitHub Pages)

- **Option A: Deploy to Vercel (1-Click)**
  1. Import project repository into [Vercel.com](https://vercel.com).
  2. Vercel automatically detects `vercel.json` and deploys the static dashboard!

- **Option B: Deploy to GitHub Pages**
  1. Go to repository **Settings** -> **Pages**.
  2. Select Source `main` branch and folder `/frontend`.

---

### 3. Connect Frontend to Deployed Backend

Open the deployed frontend web dashboard, navigate to **Settings View**, and update **API Base URL** to your deployed backend URL:
`https://your-backend-url.onrender.com/api`

---

## License
This project is open-source under the MIT License.
