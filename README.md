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
                       Alice (Acc #1) ──► Bob (Acc #2)
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
    │ Source: Acc #1 (Alice)    │       │ Target: Acc #2 (Bob)      │
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
- **Python 3.x** or **Node.js** *(Optional - for static HTTP server)*
- **Web Browser** (Chrome, Firefox, Edge, Safari)
- *(Optional)* **MySQL Server 8.0** *(In-Memory mode runs automatically if MySQL is not active)*

---

### Step 1: Run Java Backend Server

Open **Terminal 1** and run these commands:

```bash
# 1. Navigate to backend directory
cd java-backend

# 2. Compile all Java source files
javac -d target/classes src/main/java/com/corepay/*/*.java src/main/java/com/corepay/*/*/*.java

# 3. Start the Transaction Server
java -cp target/classes com.corepay.server.TransactionServer
```

*Expected Output:*
```text
Core-Pay HTTP Server running on port 8080
```

> [!TIP]
> **If Port 8080 is already in use (`Address already in use: bind`):**  
> - **PowerShell (Windows):** `Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess -Force`
> - **Command Prompt (CMD):** `for /f "tokens=5" %a in ('netstat -aon ^| findstr :8080') do taskkill /F /PID %a`
> - **Linux / macOS:** `kill -9 $(lsof -t -i:8080)`  
> Then re-run the `java -cp target/classes com.corepay.server.TransactionServer` command!

---

### Step 2: Run Web Dashboard Frontend

Choose any of these **3 easy methods**:

#### Method A: Direct File Open (Easiest — No Terminal Required)
Simply double-click or open [frontend/index.html](file:///c:/Users/Mridul/Desktop/core-pay/frontend/index.html) directly in Chrome, Edge, or Firefox!

#### Method B: Python Web Server (Terminal)
Open **Terminal 2** and run:
```bash
cd frontend
python -m http.server 8000
# Or if 'python' command gives an error, try:
py -m http.server 8000
```
Then open: **`http://localhost:8000`**

#### Method C: If Port 8000 is Already Occupied
```bash
cd frontend
python -m http.server 8081
```
Then open: **`http://localhost:8081`**

---

### Step 3: Access Application

1. Open your browser and navigate to: **`http://localhost:8000`**
2. Backend API endpoint (Health check): **`http://localhost:8080/api/accounts`**

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
