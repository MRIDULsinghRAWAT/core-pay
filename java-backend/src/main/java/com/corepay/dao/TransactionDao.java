package com.corepay.dao;

import java.math.BigDecimal;
import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

public class TransactionDao {

    public static class TransactionRecord {
        public int transactionId;
        public String transactionRef;
        public int sourceAccountId;
        public int targetAccountId;
        public BigDecimal amount;
        public String status;
        public String createdAt;

        public TransactionRecord(int transactionId, String transactionRef, int sourceAccountId, int targetAccountId, BigDecimal amount, String status, String createdAt) {
            this.transactionId = transactionId;
            this.transactionRef = transactionRef;
            this.sourceAccountId = sourceAccountId;
            this.targetAccountId = targetAccountId;
            this.amount = amount;
            this.status = status;
            this.createdAt = createdAt;
        }
    }

    private static final List<TransactionRecord> inMemoryTransactions = new CopyOnWriteArrayList<>();
    private static final AtomicInteger idCounter = new AtomicInteger(100);

    public int createTransaction(String ref, int sourceId, int targetId, BigDecimal amount, String status, Connection conn) throws SQLException {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        if (conn != null) {
            String sql = "INSERT INTO transactions (transaction_ref, source_account_id, target_account_id, amount, status) VALUES (?, ?, ?, ?, ?)";
            try (PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                stmt.setString(1, ref);
                stmt.setInt(2, sourceId);
                stmt.setInt(3, targetId);
                stmt.setBigDecimal(4, amount);
                stmt.setString(5, status);
                stmt.executeUpdate();

                try (ResultSet rs = stmt.getGeneratedKeys()) {
                    if (rs.next()) {
                        int generatedId = rs.getInt(1);
                        inMemoryTransactions.add(0, new TransactionRecord(generatedId, ref, sourceId, targetId, amount, status, timestamp));
                        return generatedId;
                    }
                }
            }
        }
        int newId = idCounter.incrementAndGet();
        inMemoryTransactions.add(0, new TransactionRecord(newId, ref, sourceId, targetId, amount, status, timestamp));
        return newId;
    }

    public List<TransactionRecord> getAllTransactions() {
        try (Connection conn = DatabaseConnection.getConnection()) {
            List<TransactionRecord> list = new ArrayList<>();
            String sql = "SELECT transaction_id, transaction_ref, source_account_id, target_account_id, amount, status, created_at FROM transactions ORDER BY created_at DESC";
            try (PreparedStatement stmt = conn.prepareStatement(sql);
                 ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(new TransactionRecord(
                            rs.getInt("transaction_id"),
                            rs.getString("transaction_ref"),
                            rs.getInt("source_account_id"),
                            rs.getInt("target_account_id"),
                            rs.getBigDecimal("amount"),
                            rs.getString("status"),
                            rs.getTimestamp("created_at").toString()
                    ));
                }
            }
            if (!list.isEmpty()) return list;
        } catch (Exception e) {
            System.out.println("[DB Fallback] Using in-memory transactions store: " + e.getMessage());
        }
        return new ArrayList<>(inMemoryTransactions);
    }
}
