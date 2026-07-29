# CorePay | Comprehensive Technical Interview Preparation Guide

This cheat sheet equips you to pitch **CorePay** to interviewers, defend your architectural choices, and confidently answer tough cross-questions.

---

## 0. Easy-Level English Explanation (Simplest Terms)

### 📌 What is CorePay in 2 Simple Lines?
> **CorePay** is a backend money transfer engine (like the core engine of Google Pay or PayPal) paired with an iOS-style dark glass web dashboard and a built-in AI Assistant. It ensures money is transferred safely without getting lost, double-charged, or crashing when the database drops.

---

### ⚡ Quick 8-10 Line Project Summary (Plain English)

1. **What CorePay Is:** CorePay is a high-performance financial ledger engine and real-time transaction processing platform built in core Java.
2. **Core Functionality:** It enables account creation, real-time fund transfers, and immutable transaction auditing without data loss or balance discrepancies.
3. **No Spring Boot Overhead:** Built using native Java `HttpServer` and thread pool executor for sub-millisecond route handling and minimal memory footprint (~30MB).
4. **Double-Entry Accounting:** Every transaction logs matching `DEBIT` and `CREDIT` entries in `LedgerEngine.java`, guaranteeing zero-sum balance integrity ($\sum \text{DEBITs} = \sum \text{CREDITs}$).
5. **Atomic SQL Transactions:** Wraps balance deductions, additions, and ledger inserts inside explicit `conn.setAutoCommit(false)` blocks with automatic `rollback()` on failure.
6. **Idempotency Protection:** Intercepts retry attempts using an `X-Idempotency-Key` header and a sliding-window queue (`IdempotencyQueue.java`), blocking duplicate payments with HTTP `409 Conflict`.
7. **Production Database Layer:** Operates over JDBC and MySQL 8.0 in normal production mode with 4 normalized tables (`accounts`, `transactions`, `ledger_entries`, `idempotency_keys`).
8. **Zero-Downtime Failover:** Automatically catches JDBC connection failures and fails over to an in-memory `ConcurrentHashMap` store so transfers never crash during database outages.
9. **Real-Time RAG AI Assistant:** Injects live account balances and transaction history directly into Gemini LLM prompts for natural language financial queries without hallucinations.
10. **Modern Web UI:** Features an iOS-style dark frosted glassmorphism SPA dashboard built in pure HTML/CSS/JS with live status polling.

---

### ❓ What 3 Main Problems Do We Solve?

#### Problem 1: Money Disappears Midway
- **What goes wrong:** In basic apps, if the server crashes while sending $100 from Mridul to Don, Mridul loses $100, but Don gets $0!
- **Our Solution:** **Double-Entry Ledger Engine**  
  - We log two matching records at the exact same second: a `DEBIT` (minus $100 from Mridul) and a `CREDIT` (plus $100 to Don).  
  - If any step fails, the whole transaction cancels automatically (`ROLLBACK`). Money is never lost!

#### Problem 2: Double-Charging On Double Click or Poor Internet
- **What goes wrong:** If a user taps "Pay" twice by mistake, or their internet disconnects and retries, they get charged twice ($200 instead of $100)!
- **Our Solution:** **Idempotency Key System**  
  - Every payment tap sends a unique ticket key (e.g. `key_9f8a7b6c`).  
  - If the server sees the exact same ticket key again in a short time window, it blocks the 2nd payment automatically and says: *"Duplicate request blocked!"*

#### Problem 3: App Crashes Completely When Database Goes Offline
- **What goes wrong:** If the MySQL database server crashes or stops working, standard payment APIs crash with 500 errors.
- **Our Solution:** **Smart Hybrid Storage (Zero-Downtime Fallback)**  
  - The Java server automatically detects if MySQL is offline.  
  - It seamlessly switches to RAM memory storage (`ConcurrentHashMap`) so payments keep working with zero downtime!

#### 🤖 Bonus Feature: AI Financial Assistant (RAG Chatbot)
- Instead of manually checking database logs, users can open the floating `CP AI` glass window and ask: *"Who received money recently?"* or *"What is our total reserve balance?"*. The AI reads live transaction records in real-time and answers accurately without guessing.

---

## 0.1 Has This Problem Been Solved Before in the Industry?

> **Yes!** Companies like **Stripe, Wise, PayPal, and Revolut** solved these exact problems using internal ledger engines (e.g., Stripe's *LedgerDB*). 

### Why Building CorePay is Impressive in an Interview:
Most candidates build simple CRUD payment apps using `UPDATE balance = balance - X`. Those apps break in real life when networks lag or servers crash. 

By building **CorePay**, you proved that you understand **how real-world fintech giants work under the hood**:
1. You didn't just write basic SQL; you implemented **Double-Entry Accounting**.
2. You didn't ignore network retries; you implemented **Idempotency Header Queues**.
3. You didn't rely on Spring Boot magic; you engineered native **Java Multithreading & Hybrid Fallback** from first principles.

### 💬 What to Say if the Interviewer Asks: *"Hasn't Stripe already solved this?"*
> *"Yes! Stripe and Wise solved this for their platforms. My goal wasn't to compete with Stripe, but to **re-engineer their underlying core architecture from scratch in pure Java**. Most project tutorials ignore race conditions, idempotency, and double-entry accounting. Building CorePay allowed me to master the exact low-level distributed systems patterns that real-world fintech engineering teams rely on."*

---

## 0.2 Live Accounts & Balance Calculation Walkthrough

When demonstrating the UI or explaining account balances to an interviewer, use this exact live example:

### 💳 Initial Default Accounts & Seed Balances:
- **`ACC-1001` (Mridul):** Starting Balance = **`$5,000.00 USD`**
- **`ACC-1002` (Don):** Starting Balance = **`$2,500.00 USD`**
- **`ACC-1003` (Core-Pay Reserve):** Starting Balance = **`$100,000.00 USD`**

### 🔄 Live Transfer Walkthrough ($250.00 Transfer from Mridul to Reserve):
1. **Source Account (`ACC-1001` Mridul):**  
   `DEBIT` Entry of **`-$250.00`** -> New Balance: **`$4,750.00`**
2. **Target Account (`ACC-1003` Core-Pay Reserve):**  
   `CREDIT` Entry of **`+$250.00`** -> New Balance: **`$100,250.00`**
3. **Double-Entry Accounting Verification:**  
   `Sum(DEBIT) + Sum(CREDIT) = -$250.00 + $250.00 = $0.00` (System-wide zero-sum balance is mathematically preserved!).

---

## 1. The 60-Second "Elevator Pitch"
*(Use this when the interviewer asks: "Tell me about your project")*

> "I built **CorePay**, a high-performance financial ledger engine and payment dashboard designed to handle atomic payment transfers with zero balance discrepancies. 
> 
> Most simple payment applications just subtract from user A and add to user B. But in real-world fintech systems, network drops cause double-charging, and database outages halt transfers. CorePay solves this using an **Atomic Double-Entry Ledger Engine**, a **Sliding-Window Idempotency Protection System** to block duplicate transfers, and a **Smart Hybrid Storage layer** that automatically falls back to an in-memory concurrent store if the primary MySQL database goes offline. 
> 
> On top of the Java backend, I built a dark frosted glass web dashboard featuring a **Real-Time RAG AI Financial Assistant** that lets users query their ledger history using natural language."

---

## 2. Problem Statement & Real-World Impact

### The Problem in Traditional Systems:
1. **Partial Balance Updates:** If the server crashes midway through a transfer, user A's money is debited, but user B never receives it.
2. **Double Charging:** If a user taps "Pay" twice or their connection stutters, two identical transactions go through.
3. **Database Outages:** If the SQL database drops, the entire payment API throws 500 errors and shuts down.
4. **Opaque Transaction History:** Single-balance columns make it impossible to audit where funds originated.

### CorePay's Solution & Impact:
- **Financial Balance Integrity:** Enforces matching `DEBIT` and `CREDIT` entries for 100% accounting accuracy (`sum(DEBIT) == sum(CREDIT)`).
- **Network Safety:** Deduplicates retries using `X-Idempotency-Key` headers.
- **Zero Downtime:** Seamlessly transitions between MySQL SQL persistence and thread-safe In-Memory storage.
- **AI Accessibility:** Non-technical users can ask natural language questions about liquidity and transaction history.

---

## 3. How I Came Up With This Project Idea

> *"I wanted to understand how mission-critical financial platforms like Stripe, PayPal, and Revolut process millions of dollars securely without losing funds or double-billing during network retries. Rather than using high-level frameworks like Spring Boot that hide low-level mechanics, I decided to build a native Java ledger engine from scratch to master atomic transactions, idempotency queues, and hybrid persistence."*

---

## 4. Why We Used This Tech Stack

| Component | Choice | Technical Justification |
| :--- | :--- | :--- |
| **Backend Language** | **Java 17+** | High performance, multithreading primitives (`ConcurrentHashMap`, `CopyOnWriteArrayList`), and strict type safety required for financial math. |
| **Server Framework** | **Native Java `HttpServer`** | Built using `com.sun.net.httpserver`. Eliminates Spring Boot overhead, achieving sub-millisecond startup times and lightweight memory footprint. |
| **Primary Database** | **MySQL 8.0** | Relational ACID compliance (`BEGIN...COMMIT/ROLLBACK`), foreign key constraints, and transactional consistency for financial records. |
| **Fallback Storage** | **In-Memory Store** | Thread-safe in-memory data structures allow zero-downtime operation if MySQL drops. |
| **Frontend Framework** | **Vanilla HTML5 / CSS3 / JS** | No heavy framework bloat (React/Angular). Pure glassmorphism styling with backdrop blur filters, delivering instant load speeds. |
| **AI Assistant** | **RAG + Gemini API** | Retrieval-Augmented Generation injects live ledger state into LLM prompt context, eliminating hallucinations for balance queries. |

---

## 5. Detailed System Architecture & Low-Level Implementation

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      Dark Frosted Glass Web UI                         │
 │           (SPA Navigation, Live Polling, RAG AI Assistant)           │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP REST Requests
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                Native Java HTTP Server (Port 8080)                     │
 ├───────────────────────────────────┬────────────────────────────────────┤
 │ 1. Idempotency Protection Engine  │ Checks X-Idempotency-Key in        │
 │    (IdempotencyQueue.java)        │ Sliding-Window Queue               │
 ├───────────────────────────────────┼────────────────────────────────────┤
 │ 2. Double-Entry Accounting Engine │ Generates matching DEBIT & CREDIT  │
 │    (LedgerEngine.java)            │ atomic entries                     │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                        ┌────────────┴────────────┐
                        │ Smart Hybrid Storage    │
                        ▼                         ▼
            ┌───────────────────────┐ ┌───────────────────────┐
            │ Primary: MySQL 8.0 DB │ │ Fallback: In-Memory   │
            │ (SQL Persistence)     │ │ (ConcurrentHashMap)   │
            └───────────────────────┘ └───────────────────────┘
```

### Key Java Classes to Highlight:
- `TransactionServer.java`: Handles HTTP routing (`GET/POST /api/accounts`, `/api/transactions`, `/api/transfer`), CORS headers, and JSON request body parsing.
- `LedgerEngine.java`: Executes atomic double-entry operations (`DEBIT` source, `CREDIT` target).
- `IdempotencyQueue.java`: Implements a sliding-window queue (capacity: 1000 keys) to block duplicate requests within the time window.
- `AccountDao.java` & `TransactionDao.java`: Implements smart dual-mode persistence (`createAccount()`, balance updates, fetching records via MySQL JDBC or thread-safe `ConcurrentHashMap` fallback).

---

## 5.1 Comprehensive SQL Database Architecture & Transaction Management

In an interview, when asked **"Where and how is SQL used in this project?"**, explain these **4 Core Pillars**:

### 1. Database Schema & Relational Tables ([db_schema.sql](file:///c:/Users/Mridul/Desktop/core-pay/java-backend/src/main/resources/db_schema.sql))
The SQL database consists of **4 normalized tables** designed for financial compliance and high auditability:
- **`accounts`**: Stores account details (`account_id`, `account_number`, `holder_name`, `balance`, `currency`, `created_at`). Uses `DECIMAL(15,2)` for exact monetary precision (never `FLOAT`/`DOUBLE` to avoid floating-point rounding bugs).
- **`transactions`**: Stores main transaction headers (`transaction_id`, `transaction_ref`, `source_account_id`, `target_account_id`, `amount`, `status`, `created_at`). Linked via Foreign Keys to `accounts`.
- **`ledger_entries`**: Stores matching `DEBIT` and `CREDIT` double-entry accounting records (`entry_id`, `transaction_id`, `account_id`, `entry_type ENUM('DEBIT','CREDIT')`, `amount`).
- **`idempotency_keys`**: Stores processed `idempotency_key` (VARCHAR UNIQUE) and cached response payloads for persistent deduplication across server restarts.

### 2. JDBC & Prepared Statements (Data Access Layer)
- **[DatabaseConnection.java](file:///c:/Users/Mridul/Desktop/core-pay/java-backend/src/main/java/com/corepay/dao/DatabaseConnection.java)**: Manages JDBC connection pooling via MySQL Driver (`com.mysql.cj.jdbc.Driver`) connecting to `jdbc:mysql://localhost:3306/corepay_db`.
- **[AccountDao.java](file:///c:/Users/Mridul/Desktop/core-pay/java-backend/src/main/java/com/corepay/dao/AccountDao.java)**: Executes parameterized SQL queries to read accounts (`SELECT ... FROM accounts`) and update balances (`UPDATE accounts SET balance = ? WHERE account_id = ?`).
- **[TransactionDao.java](file:///c:/Users/Mridul/Desktop/core-pay/java-backend/src/main/java/com/corepay/dao/TransactionDao.java)**: Executes `INSERT INTO transactions ...` and `SELECT ... FROM transactions ORDER BY created_at DESC`.

### 3. SQL Transactions & ACID Guarantees ([LedgerEngine.java](file:///c:/Users/Mridul/Desktop/core-pay/java-backend/src/main/java/com/corepay/service/LedgerEngine.java))
In `LedgerEngine.java`, we manage SQL transactions manually to guarantee **ACID compliance**:
- **Disable Auto-Commit**: `conn.setAutoCommit(false);`
- **Atomic Execution Grouping**:
  1. Deduct source account balance (`UPDATE accounts SET balance = ?`)
  2. Add target account balance (`UPDATE accounts SET balance = ?`)
  3. Insert main transaction log (`INSERT INTO transactions ...`)
  4. Insert `DEBIT` entry in `ledger_entries`
  5. Insert `CREDIT` entry in `ledger_entries`
- **Commit or Rollback**:
  - If all queries succeed: `conn.commit();`
  - If any step fails (e.g., insufficient funds or SQL error): `conn.rollback();` cancels every query in the batch so money is never lost or partially updated!

### 4. Zero-Downtime Smart SQL Fallback
- If the MySQL server drops or is offline, JDBC throws `SQLException`.
- The DAOs catch this exception and **automatically switch to an in-memory thread-safe `ConcurrentHashMap` store**, allowing the application to continue serving transfers with zero downtime.

---

## 5.2 Resume Bullet Points — Deep-Dive Breakdown & Interview Defense

> **Note for Interviewees:** When an interviewer asks *"Walk me through these lines on your resume"* or asks deep technical questions on specific bullet points, use this section as your exact speaking script and architectural defense guide.

---

### 📌 Project Title & Overview Line
> **Resume Text:**  
> `Core-Pay | Java, JDBC, MySQL, REST APIs, Multi-threading | GitHub | Live Demo`  
> `A high-performance financial ledger platform for secure, real-time transaction processing and auditing.`

#### 💡 How to Explain this to the Interviewer:
- **Core Pitch:** "Core-Pay is a production-ready financial engine built from scratch in core Java without relying on heavy frameworks like Spring Boot. It handles money movement, atomic balance updates, audit logging, and idempotency control under high concurrency."
- **Key Technical Tags to Emphasize:**
  - **Core Java & Multi-threading:** Uses `com.sun.net.httpserver` with custom thread handling to process concurrent HTTP REST calls with minimal overhead and sub-50ms startup times.
  - **JDBC & MySQL 8.0:** Direct relational database persistence using parameterized SQL and explicit transaction management (`setAutoCommit(false)`).
  - **REST APIs:** Structured HTTP JSON endpoints for account management, ledger auditing, and funds transfer.

---

### 📌 Bullet Point 1: Core Engine & Multi-threaded REST APIs
> **Resume Text:**  
> `● Built a high-performance financial ledger engine in core Java — a multi-threaded HTTP server exposing REST APIs for account management, transaction auditing, and fund transfers.`

#### 💡 Deep Technical Explanation:

1. **Why Core Java over Spring Boot?**
   - **Framework Overhead:** Spring Boot brings large dependency trees (Tomcat, Spring MVC, Jackson, Spring Data).
   - **Performance & Learning:** Building on `com.sun.net.httpserver` allowed native thread pool management, low memory footprint (~30MB RSS), sub-millisecond route handling, and complete visibility into raw HTTP protocol mechanics (headers, status codes, CORS, JSON stream parsing).

2. **Multi-Threaded HTTP Server Mechanics:**
   - The native Java `HttpServer` delegates incoming HTTP connections across worker threads from the JVM thread pool.
   - **Concurrency Safety:** Handlers (`AccountsHandler`, `TransactionsHandler`, `TransferHandler`) execute concurrently. To ensure thread safety when reading/writing account states, balance updates are synchronized in memory or protected via row locks (`SELECT ... FOR UPDATE`) and atomic SQL transactions in MySQL.

3. **Exposed REST API Endpoints ([TransactionServer.java](file:///c:/Users/Mridul/Desktop/core-pay/java-backend/src/main/java/com/corepay/server/TransactionServer.java)):**
   - **Account Management (`POST /api/accounts`, `GET /api/accounts`):** Creates new user accounts (`ACC-100X`), auto-assigns initial balance & currency (`USD`), and lists active account ledgers.
   - **Transaction Auditing (`GET /api/transactions`):** Fetches immutable audit logs of all historical transfer operations with timestamps (`createdAt`), status (`COMPLETED`), and reference numbers (`TXN-XXXXXXXX`).
   - **Fund Transfers (`POST /api/transfer`):** Receives transfer payloads (`sourceAccountId`, `targetAccountId`, `amount`) along with `X-Idempotency-Key` header to execute double-entry ledger transfers.

#### 💬 What to Say in Interview:
> *"Instead of relying on Spring Boot starter packages, I built the REST server directly using Java's native `HttpServer`. Each request runs on a multi-threaded execution context, routing traffic to handlers for Account Management, Transaction Auditing, and Transfers. Building this from scratch gave me direct mastery over HTTP exchange pipelines, thread isolation, and custom JSON parsing without framework magic."*

---

### 📌 Bullet Point 2: Double-Entry Ledger & Idempotency Queue
> **Resume Text:**  
> `● Designed a double-entry LedgerEngine with atomic DEBIT/CREDIT writes and a custom IdempotencyQueue that blocks duplicate transfers on retry with a 409 Conflict response.`

#### 💡 Deep Technical Explanation:

1. **Double-Entry Ledger Engine Architecture ([LedgerEngine.java](file:///c:/Users/Mridul/Desktop/core-pay/java-backend/src/main/java/com/corepay/service/LedgerEngine.java)):**
   - **What is Double-Entry Accounting?** In standard CRUD apps, transfers just subtract from A and add to B (`UPDATE balance`). If a system drops mid-operation, money vanishes. In double-entry accounting, every single transaction strictly requires matching balanced records:
     - `DEBIT`: Deducts amount from source account.
     - `CREDIT`: Adds amount to target account.
   - **Atomic Transaction Writes:** In MySQL mode, we wrap database operations inside a single explicit transaction (`conn.setAutoCommit(false)`):
     1. Validate source account balance (`balance >= amount`).
     2. Deduct from source balance (`UPDATE accounts SET balance = ...`).
     3. Add to target balance (`UPDATE accounts SET balance = ...`).
     4. Create transaction header (`INSERT INTO transactions ...`).
     5. Write dual ledger records (`INSERT INTO ledger_entries` -> 1 `DEBIT` + 1 `CREDIT`).
     6. Commit transaction (`conn.commit()`). If any query fails, `conn.rollback()` restores the exact state.
   - **System-Wide Auditing Guarantee:** $\sum \text{DEBITs} = \sum \text{CREDITs}$. The total change across all system accounts is mathematically zero ($-\text{Amount} + \text{Amount} = 0$).

2. **Custom Idempotency Queue ([IdempotencyQueue.java](file:///c:/Users/Mridul/Desktop/core-pay/java-backend/src/main/java/com/corepay/dsa/IdempotencyQueue.java)):**
   - **The Network Retry Problem:** In financial APIs, network blips or user double-clicks cause clients to retry requests. Without idempotency protection, $100 transfers get executed twice ($200 charged).
   - **Data Structure Implementation:** Designed a custom thread-safe **Singly Linked List-based Sliding-Window Queue** with fixed capacity (capacity: 1000 keys).
   - **Request Handling Flow:**
     - Client passes `X-Idempotency-Key` header (e.g. `key_abc123`).
     - `IdempotencyQueue.contains(key)` checks if key was processed recently.
     - If key exists: Server immediately halts execution and returns HTTP `409 Conflict` (`{"status":"DUPLICATE","message":"Duplicate request ignored"}`).
     - If key is new: `LedgerEngine` executes the transfer and calls `idempotencyQueue.enqueue(key)` to protect subsequent retries within the sliding window.

#### 💬 What to Say in Interview:
> *"To ensure balance integrity, I built a `LedgerEngine` following double-entry bookkeeping. Every transfer atomically writes matching `DEBIT` and `CREDIT` records inside an explicit SQL transaction block—if any step fails, the entire transaction rolls back so money is never lost. Additionally, to handle network retries, I implemented a custom `IdempotencyQueue` using a thread-safe sliding-window linked list. When a duplicate `X-Idempotency-Key` is received, the server intercepts it and returns an HTTP `409 Conflict` response without processing a duplicate debit."*

---

### 📌 Bullet Point 3: Hybrid DAO Layer & Automatic In-Memory Failover
> **Resume Text:**  
> `● Implemented a hybrid DAO layer over JDBC - MySQL 8.0 in production with automatic in-memory failover for zero downtime.`

#### 💡 Deep Technical Explanation:

1. **Hybrid Data Access Object (DAO) Pattern:**
   - **[AccountDao.java](file:///c:/Users/Mridul/Desktop/core-pay/java-backend/src/main/java/com/corepay/dao/AccountDao.java)** and **[TransactionDao.java](file:///c:/Users/Mridul/Desktop/core-pay/java-backend/src/main/java/com/corepay/dao/TransactionDao.java)** abstract data persistence away from business logic.
   - Primary Storage Mode: MySQL 8.0 relational database queried via JDBC using `PreparedStatement` to prevent SQL injection.

2. **Automatic In-Memory Failover Engine:**
   - **Why In-Memory Failover?** In high-availability fintech systems, a primary database connection loss should not immediately cause 500 internal server errors or total app crashes.
   - **How Fallback Works:**
     - When `LedgerEngine` or `AccountDao` attempts to connect via JDBC, if MySQL is offline or throws a `SQLException` / connection timeout, the exception is caught in the `catch` block.
     - The DAO automatically and seamlessly redirects execution to a secondary in-memory data store powered by Java thread-safe structures (`ConcurrentHashMap` for accounts and `CopyOnWriteArrayList` for transactions).
   - **Zero Downtime:** Reads (`getAccountById()`) and Writes (`processTransfer()`) continue executing seamlessly in-memory, ensuring continuous service uptime even during database outages.

#### 💬 What to Say in Interview:
> *"For high availability, I designed a Hybrid DAO layer that operates over JDBC and MySQL 8.0 in normal production mode. However, if the MySQL database drops or connection fails, our system catches the `SQLException` and automatically fails over to a thread-safe in-memory store (`ConcurrentHashMap`). This guarantees zero downtime and enables the platform to continue serving payment transfers uninterrupted."*

---

## 6. Expected Interview Cross-Questions & Bulletproof Answers

### Q1: How do you handle concurrency if two users send money at the exact same time?
> **Answer:** 
> *"In MySQL mode, we use relational transaction isolation (`BEGIN...COMMIT`) with row-level locks (`SELECT ... FOR UPDATE`) to prevent race conditions. In In-Memory mode, we use `ConcurrentHashMap` and thread-safe synchronized blocks on the account objects so balance deductions and additions are executed atomically."*

### Q2: Why use Double-Entry Accounting instead of just updating a balance column?
> **Answer:** 
> *"Updating a single balance column (`UPDATE accounts SET balance = balance - 100`) creates a single point of failure with no audit trail. Double-Entry Accounting logs two distinct financial ledger entries—a `DEBIT` for the source and a `CREDIT` for the target. This ensures that the sum of all DEBITs always equals the sum of all CREDITs, making system-wide auditing mathematically verifiable."*

### Q3: What happens if the network connection drops right after the client submits a payment?
> **Answer:** 
> *"The client retries the request using the exact same `X-Idempotency-Key`. CorePay passes the key through `IdempotencyQueue`. If the key is already in the sliding-window queue, CorePay immediately intercepts the request and returns a `409 Conflict` duplicate response without executing the transfer a second time."*

### Q4: How does your RAG AI Assistant answer questions without hallucinating account balances?
> **Answer:** 
> *"We use Retrieval-Augmented Generation (RAG). Before sending the user's prompt to the LLM, our `buildRAGContext()` function dynamically fetches the exact live account balances, active account numbers, and recent transaction logs. This structured live context is injected directly into the LLM system prompt, so the model answers strictly based on real-time ledger facts rather than guessing."*

### Q5: Why build a custom Java HTTP server instead of using Spring Boot?
> **Answer:** 
> *"While Spring Boot is great for enterprise production apps, building a native Java HTTP server using `com.sun.net.httpserver` allowed me to master the underlying HTTP protocol, custom header parsing, CORS handling, and thread isolation without relying on framework magic. It also resulted in sub-50ms server startup times and minimal memory footprint."*

### Q6: Where is SQL used in this project and how are database transactions handled?
> **Answer:** 
> *"SQL is used in our persistence layer across 4 tables (`accounts`, `transactions`, `ledger_entries`, `idempotency_keys`). In `LedgerEngine.java`, we manage SQL transactions using JDBC prepared statements with `conn.setAutoCommit(false)`. We execute the balance update, transaction record creation, and `DEBIT`/`CREDIT` ledger entries inside a single atomic block. If any query fails, `conn.rollback()` is invoked, preserving complete ACID transaction integrity."*

### Q7: Why use `DECIMAL(15,2)` in SQL instead of `FLOAT` or `DOUBLE`?
> **Answer:** 
> *"Floating-point types like `FLOAT` and `DOUBLE` use binary floating-point representation, which causes rounding errors in monetary calculations (e.g. `0.1 + 0.2 = 0.30000000000000004`). `DECIMAL(15,2)` stores numbers as exact fixed-point decimal values in SQL, matching Java's `BigDecimal` and guaranteeing penny-exact financial accuracy."*

### Q8: How does dynamic account creation work and how is data persisted?
> **Answer:** 
> *"When a new account is created via `POST /api/accounts`, our `AccountDao.createAccount()` method auto-generates a unique account number (`ACC-100X`) and executes an `INSERT INTO accounts` query if MySQL is active, while simultaneously updating our thread-safe `ConcurrentHashMap` in-memory store. This guarantees that newly created accounts persist permanently in the database and appear dynamically on the UI dashboard without requiring server restarts."*

### Q9: Why use Structured Real-Time RAG instead of a Vector Database (Pinecone/Chroma)?
> **Answer:** 
> *"Vector databases (like Pinecone, Milvus, Chroma) rely on vector embeddings to perform semantic similarity searches on unstructured text (like PDFs or support articles). However, financial ledger systems require **real-time, penny-exact numerical accuracy**. Semantic similarity search cannot perform exact arithmetic or guarantee live balance state. Therefore, CorePay utilizes **Real-Time Structured Context RAG**, where live SQL/In-Memory ledger objects are retrieved directly and injected into the LLM prompt context. If scaling to millions of historical compliance documents or policy PDFs, a hybrid architecture combining `pgvector` with structured context can be used!"*

---

## 7. Quick Summary Cheatsheet for Interview Day

- **Project Name:** CorePay
- **Core Concept:** High-Performance Financial Ledger Engine & AI Dashboard
- **Key Modules:**
  1. Atomic Double-Entry Ledger (`DEBIT` & `CREDIT`)
  2. Idempotency Protection Queue (`X-Idempotency-Key` deduplication)
  3. Smart Hybrid Storage (SQL Primary + In-Memory Fallback)
  4. Real-Time RAG AI Assistant (Live Ledger Context + Gemini API)
  5. Dark Frosted Glassmorphism UI (iOS-style aesthetic)
