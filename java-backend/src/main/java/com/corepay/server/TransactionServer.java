package com.corepay.server;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import com.corepay.service.LedgerEngine;
import com.corepay.dao.AccountDao;
import com.corepay.dao.TransactionDao;

import java.io.IOException;
import java.io.OutputStream;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.math.BigDecimal;

public class TransactionServer {

    private final int port;
    private final LedgerEngine ledgerEngine;
    private final AccountDao accountDao;
    private final TransactionDao transactionDao;

    public TransactionServer(int port) {
        this.port = port;
        this.ledgerEngine = new LedgerEngine();
        this.accountDao = new AccountDao();
        this.transactionDao = new TransactionDao();
    }

    public void start() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        server.createContext("/api/accounts", new AccountsHandler());
        server.createContext("/api/transactions", new TransactionsHandler());
        server.createContext("/api/transfer", new TransferHandler());

        server.setExecutor(null);
        System.out.println("Core-Pay HTTP Server running on port " + port);
        server.start();
    }

    private class AccountsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                var accounts = accountDao.getAllAccounts();
                StringBuilder json = new StringBuilder("[");
                for (int i = 0; i < accounts.size(); i++) {
                    var acc = accounts.get(i);
                    json.append(String.format("{\"id\":%d,\"accountNumber\":\"%s\",\"holderName\":\"%s\",\"balance\":%.2f,\"currency\":\"%s\"}",
                            acc.accountId, acc.accountNumber, acc.holderName, acc.balance, acc.currency));
                    if (i < accounts.size() - 1) json.append(",");
                }
                json.append("]");
                sendJsonResponse(exchange, 200, json.toString());
            } catch (Exception e) {
                sendJsonResponse(exchange, 500, "{\"error\":\"" + e.getMessage() + "\"}");
            }
        }
    }

    private class TransactionsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                var txs = transactionDao.getAllTransactions();
                StringBuilder json = new StringBuilder("[");
                for (int i = 0; i < txs.size(); i++) {
                    var tx = txs.get(i);
                    json.append(String.format("{\"id\":%d,\"ref\":\"%s\",\"sourceId\":%d,\"targetId\":%d,\"amount\":%.2f,\"status\":\"%s\",\"createdAt\":\"%s\"}",
                            tx.transactionId, tx.transactionRef, tx.sourceAccountId, tx.targetAccountId, tx.amount, tx.status, tx.createdAt));
                    if (i < txs.size() - 1) json.append(",");
                }
                json.append("]");
                sendJsonResponse(exchange, 200, json.toString());
            } catch (Exception e) {
                sendJsonResponse(exchange, 500, "{\"error\":\"" + e.getMessage() + "\"}");
            }
        }
    }

    private class TransferHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }

            try {
                InputStream is = exchange.getRequestBody();
                String body = new String(is.readAllBytes());

                String idempotencyKey = exchange.getRequestHeaders().getFirst("X-Idempotency-Key");
                
                // Parse rudimentary JSON payload
                int sourceId = Integer.parseInt(extractJsonVal(body, "sourceAccountId"));
                int targetId = Integer.parseInt(extractJsonVal(body, "targetAccountId"));
                BigDecimal amount = new BigDecimal(extractJsonVal(body, "amount"));

                boolean success = ledgerEngine.processTransfer(idempotencyKey, sourceId, targetId, amount);
                if (success) {
                    sendJsonResponse(exchange, 200, "{\"status\":\"SUCCESS\",\"message\":\"Transfer processed successfully\"}");
                } else {
                    sendJsonResponse(exchange, 409, "{\"status\":\"DUPLICATE\",\"message\":\"Duplicate request ignored\"}");
                }
            } catch (Exception e) {
                sendJsonResponse(exchange, 400, "{\"status\":\"FAILED\",\"error\":\"" + e.getMessage() + "\"}");
            }
        }
    }

    private static String extractJsonVal(String json, String key) {
        String search = "\"" + key + "\":";
        int start = json.indexOf(search);
        if (start == -1) return "0";
        start += search.length();
        int end = json.indexOf(",", start);
        if (end == -1) end = json.indexOf("}", start);
        return json.substring(start, end).replace("\"", "").trim();
    }

    private static void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, X-Idempotency-Key");
    }

    private static void sendJsonResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
        byte[] bytes = response.getBytes();
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    public static void main(String[] args) {
        try {
            TransactionServer server = new TransactionServer(8080);
            server.start();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
