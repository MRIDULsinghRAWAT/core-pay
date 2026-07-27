package com.corepay.dsa;

/**
 * Custom Singly Linked List acting as a queue for tracking idempotent request keys.
 * Demonstrates custom data structure implementation without relying on standard java.util structures.
 */
public class IdempotencyQueue {

    private static class Node {
        String idempotencyKey;
        long timestamp;
        Node next;

        Node(String idempotencyKey, long timestamp) {
            this.idempotencyKey = idempotencyKey;
            this.timestamp = timestamp;
            this.next = null;
        }
    }

    private Node head;
    private Node tail;
    private int size;
    private final int capacity;

    public IdempotencyQueue(int capacity) {
        this.head = null;
        this.tail = null;
        this.size = 0;
        this.capacity = capacity;
    }

    public synchronized void enqueue(String key) {
        if (contains(key)) {
            return;
        }

        if (size >= capacity) {
            dequeue();
        }

        Node newNode = new Node(key, System.currentTimeMillis());
        if (tail == null) {
            head = tail = newNode;
        } else {
            tail.next = newNode;
            tail = newNode;
        }
        size++;
    }

    public synchronized String dequeue() {
        if (head == null) {
            return null;
        }
        String key = head.idempotencyKey;
        head = head.next;
        if (head == null) {
            tail = null;
        }
        size--;
        return key;
    }

    public synchronized boolean contains(String key) {
        if (key == null) return false;
        Node current = head;
        while (current != null) {
            if (key.equals(current.idempotencyKey)) {
                return true;
            }
            current = current.next;
        }
        return false;
    }

    public synchronized int getSize() {
        return size;
    }
}
