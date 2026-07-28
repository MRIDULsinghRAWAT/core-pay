-- Core-Pay MySQL Database Schema
CREATE DATABASE IF NOT EXISTS corepay_db;
USE corepay_db;

-- Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    account_id INT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(32) UNIQUE NOT NULL,
    holder_name VARCHAR(100) NOT NULL,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_ref VARCHAR(64) UNIQUE NOT NULL,
    source_account_id INT NOT NULL,
    target_account_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_account_id) REFERENCES accounts(account_id),
    FOREIGN KEY (target_account_id) REFERENCES accounts(account_id)
);

-- Double-Entry Ledger Entries Table
CREATE TABLE IF NOT EXISTS ledger_entries (
    entry_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    account_id INT NOT NULL,
    entry_type ENUM('DEBIT', 'CREDIT') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),
    FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

-- Idempotency Keys Table
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    response_payload TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample Seed Data
INSERT INTO accounts (account_number, holder_name, balance, currency) VALUES
('ACC-1001', 'Mridul', 5000.00, 'USD'),
('ACC-1002', 'Don ', 2500.00, 'USD'),
('ACC-1003', 'Core-Pay Reserve', 100000.00, 'USD')
ON DUPLICATE KEY UPDATE account_id=account_id;
