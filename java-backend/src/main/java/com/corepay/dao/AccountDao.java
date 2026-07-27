package com.corepay.dao;

import java.math.BigDecimal;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class AccountDao {

    public static class Account {
        public int accountId;
        public String accountNumber;
        public String holderName;
        public BigDecimal balance;
        public String currency;

        public Account(int accountId, String accountNumber, String holderName, BigDecimal balance, String currency) {
            this.accountId = accountId;
            this.accountNumber = accountNumber;
            this.holderName = holderName;
            this.balance = balance;
            this.currency = currency;
        }
    }

    private static final Map<Integer, Account> inMemoryAccounts = new ConcurrentHashMap<>();

    static {
        inMemoryAccounts.put(1, new Account(1, "ACC-1001", "Alice Smith", new BigDecimal("5000.00"), "USD"));
        inMemoryAccounts.put(2, new Account(2, "ACC-1002", "Bob Jones", new BigDecimal("2500.00"), "USD"));
        inMemoryAccounts.put(3, new Account(3, "ACC-1003", "Core-Pay Reserve", new BigDecimal("100000.00"), "USD"));
    }

    public List<Account> getAllAccounts() {
        try (Connection conn = DatabaseConnection.getConnection()) {
            List<Account> accounts = new ArrayList<>();
            String sql = "SELECT account_id, account_number, holder_name, balance, currency FROM accounts";
            try (PreparedStatement stmt = conn.prepareStatement(sql);
                 ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    accounts.add(new Account(
                            rs.getInt("account_id"),
                            rs.getString("account_number"),
                            rs.getString("holder_name"),
                            rs.getBigDecimal("balance"),
                            rs.getString("currency")
                    ));
                }
            }
            if (!accounts.isEmpty()) return accounts;
        } catch (Exception e) {
            System.out.println("[DB Fallback] Using in-memory accounts store: " + e.getMessage());
        }
        return new ArrayList<>(inMemoryAccounts.values());
    }

    public Account getAccountById(int accountId, Connection conn) throws SQLException {
        if (conn != null) {
            String sql = "SELECT account_id, account_number, holder_name, balance, currency FROM accounts WHERE account_id = ?";
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setInt(1, accountId);
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        return new Account(
                                rs.getInt("account_id"),
                                rs.getString("account_number"),
                                rs.getString("holder_name"),
                                rs.getBigDecimal("balance"),
                                rs.getString("currency")
                        );
                    }
                }
            }
        }
        return inMemoryAccounts.get(accountId);
    }

    public Account getAccountByIdInMemory(int accountId) {
        return inMemoryAccounts.get(accountId);
    }

    public void updateBalance(int accountId, BigDecimal newBalance, Connection conn) throws SQLException {
        if (conn != null) {
            String sql = "UPDATE accounts SET balance = ? WHERE account_id = ?";
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setBigDecimal(1, newBalance);
                stmt.setInt(2, accountId);
                stmt.executeUpdate();
            }
        }
        Account acc = inMemoryAccounts.get(accountId);
        if (acc != null) {
            acc.balance = newBalance;
        }
    }
}
