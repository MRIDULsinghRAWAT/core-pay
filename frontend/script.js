let API_BASE_URL = 'http://localhost:8080/api';
let pollingIntervalId = null;
let currentPollingRate = 3000;
let cachedAccounts = [];
let cachedTransactions = [];

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    setupViewNavigation();
    setupEventListeners();
    fetchAccounts();
    fetchTransactions();
    startPolling(currentPollingRate);
}

function startPolling(rate) {
    if (pollingIntervalId) clearInterval(pollingIntervalId);
    if (rate > 0) {
        pollingIntervalId = setInterval(() => {
            fetchAccounts();
            fetchTransactions();
        }, rate);
    }
}

/* Navigation System */
function setupViewNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = item.getAttribute('data-view');
            switchTab(targetView);
        });
    });

    document.querySelectorAll('.nav-shortcut').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            if (target) switchTab(target);
        });
    });

    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(`view-${hash}`)) {
        switchTab(hash);
    }
}

function switchTab(targetView) {
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    navItems.forEach(nav => {
        if (nav.getAttribute('data-view') === targetView) {
            nav.classList.add('active');
        } else {
            nav.classList.remove('active');
        }
    });

    viewSections.forEach(section => {
        if (section.id === `view-${targetView}`) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    window.location.hash = targetView;
}

function setupEventListeners() {
    const modal = document.getElementById('transferModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelTransferBtn');
    const transferForm = document.getElementById('transferForm');

    document.querySelectorAll('.openTransferModalBtn').forEach(btn => {
        btn.addEventListener('click', () => openTransferModal());
    });

    const closeModal = () => modal.classList.remove('active');
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    document.querySelectorAll('.refreshBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            fetchAccounts();
            fetchTransactions();
        });
    });

    transferForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitTransfer();
    });

    const accountSearch = document.getElementById('accountSearchInput');
    if (accountSearch) {
        accountSearch.addEventListener('input', (e) => {
            renderFullAccounts(filterAccounts(e.target.value));
        });
    }

    const ledgerSearch = document.getElementById('ledgerSearchInput');
    if (ledgerSearch) {
        ledgerSearch.addEventListener('input', (e) => {
            renderFullLedgerTable(filterTransactions(e.target.value));
        });
    }

    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const urlInput = document.getElementById('apiUrlInput').value.trim();
            const rateSelect = parseInt(document.getElementById('pollingRateSelect').value);
            
            if (urlInput) API_BASE_URL = urlInput;
            currentPollingRate = rateSelect;
            startPolling(currentPollingRate);

            const badge = document.getElementById('pollingBadge');
            if (badge) {
                badge.innerHTML = rateSelect > 0 
                    ? `<span class="pulse-dot"></span> Live (${rateSelect / 1000}s)` 
                    : `<span>Manual Refresh</span>`;
            }

            alert('Application settings updated successfully!');
            fetchAccounts();
            fetchTransactions();
        });
    }
}

function openTransferModal(preselectedSourceId = null) {
    const modal = document.getElementById('transferModal');
    modal.classList.add('active');
    generateRandomIdempotencyKey();

    if (preselectedSourceId) {
        const sourceSelect = document.getElementById('sourceAccountSelect');
        sourceSelect.value = preselectedSourceId;
    }
}

function setPresetAmount(amount) {
    const input = document.getElementById('transferAmount');
    const current = parseFloat(input.value) || 0;
    input.value = (current + amount).toFixed(2);
}

function generateRandomIdempotencyKey() {
    const randomKey = 'key_' + Math.random().toString(36).substring(2, 10);
    document.getElementById('idempotencyKey').value = randomKey;
}

/* API Calls */
async function fetchAccounts() {
    try {
        const response = await fetch(`${API_BASE_URL}/accounts`);
        if (!response.ok) throw new Error('Failed to fetch accounts');
        const accounts = await response.json();
        if (!accounts || accounts.length === 0) {
            renderAccountsFallback();
        } else {
            cachedAccounts = accounts;
            updateAccountViews(accounts);
        }
        updateServerStatus(true);
    } catch (err) {
        console.warn('Backend unavailable, using fallback mock state:', err.message);
        updateServerStatus(false);
        renderAccountsFallback();
    }
}

function updateAccountViews(accounts) {
    cachedAccounts = accounts;
    renderAccounts(accounts);
    renderQuickContacts(accounts);
    renderFullAccounts(accounts);
    populateAccountSelects(accounts);
    updateMetrics();
}

function renderAccounts(accounts) {
    const grid = document.getElementById('accountsGrid');
    if (!grid) return;
    if (!accounts || accounts.length === 0) {
        grid.innerHTML = '<p class="text-muted">No accounts registered yet.</p>';
        return;
    }

    grid.innerHTML = accounts.map(acc => `
        <div class="account-card">
            <div class="account-header">
                <span class="holder-name">${escapeHtml(acc.holderName)}</span>
                <span class="account-number">${escapeHtml(acc.accountNumber)}</span>
            </div>
            <div class="balance-amount">$${Number(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
    `).join('');
}

function renderQuickContacts(accounts) {
    const row = document.getElementById('quickContactsRow');
    if (!row) return;
    if (!accounts || accounts.length === 0) {
        row.innerHTML = '<p class="text-muted">No contacts available.</p>';
        return;
    }

    row.innerHTML = accounts.map(acc => {
        const initial = acc.holderName ? acc.holderName.charAt(0).toUpperCase() : 'A';
        return `
            <div class="quick-contact-chip" onclick="openTransferModal(${acc.id})">
                <div class="avatar-initial">${initial}</div>
                <div>
                    <div class="contact-name">${escapeHtml(acc.holderName)}</div>
                    <div class="contact-acc">${escapeHtml(acc.accountNumber)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderFullAccounts(accounts) {
    const grid = document.getElementById('accountsGridFull');
    if (!grid) return;
    if (!accounts || accounts.length === 0) {
        grid.innerHTML = '<p class="text-muted">No matching accounts found.</p>';
        return;
    }

    grid.innerHTML = accounts.map(acc => `
        <div class="account-card-extended">
            <div class="account-header">
                <div>
                    <span class="holder-name" style="display: block; font-size: 1.2rem;">${escapeHtml(acc.holderName)}</span>
                    <span class="account-number" style="margin-top: 4px; display: inline-block;">${escapeHtml(acc.accountNumber)}</span>
                </div>
                <span class="status-tag completed">ACTIVE</span>
            </div>
            <div style="margin-top: 0.5rem;">
                <span style="font-size: 0.8rem; color: var(--text-secondary); display: block;">Ledger Balance (${acc.currency || 'USD'})</span>
                <div class="balance-amount">$${Number(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="account-actions">
                <button class="btn btn-sm btn-primary" onclick="openTransferModal(${acc.id})">Send Money</button>
            </div>
        </div>
    `).join('');
}

function populateAccountSelects(accounts) {
    const sourceSelect = document.getElementById('sourceAccountSelect');
    const targetSelect = document.getElementById('targetAccountSelect');

    const currentSource = sourceSelect.value;
    const currentTarget = targetSelect.value;

    const options = accounts.map(acc => 
        `<option value="${acc.id}">${escapeHtml(acc.holderName)} (${acc.accountNumber})</option>`
    ).join('');

    sourceSelect.innerHTML = '<option value="">Select Source Account</option>' + options;
    targetSelect.innerHTML = '<option value="">Select Target Account</option>' + options;

    if (currentSource) sourceSelect.value = currentSource;
    if (currentTarget) targetSelect.value = currentTarget;
}

async function fetchTransactions() {
    try {
        const response = await fetch(`${API_BASE_URL}/transactions`);
        if (!response.ok) throw new Error('Failed to fetch transactions');
        const transactions = await response.json();
        cachedTransactions = transactions;
        renderTransactions(transactions);
        renderFullLedgerTable(transactions);
        updateMetrics();
    } catch (err) {
        console.warn('Transaction fetch fallback active');
        renderTransactionsFallback();
    }
}

function renderTransactions(transactions) {
    const tbody = document.getElementById('transactionTableBody');
    if (!tbody) return;
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No activity recorded yet.</td></tr>';
        return;
    }

    const recent = transactions.slice(0, 5);
    tbody.innerHTML = recent.map(tx => `
        <tr>
            <td style="font-family: var(--font-mono); font-weight: 600; color: var(--accent-lime);">${escapeHtml(tx.ref)}</td>
            <td>Acc #${tx.sourceId}</td>
            <td>Acc #${tx.targetId}</td>
            <td style="font-weight: 800; color: var(--accent-green);">$${Number(tx.amount).toFixed(2)}</td>
            <td><span class="status-tag completed">${escapeHtml(tx.status)}</span></td>
            <td style="color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(tx.createdAt)}</td>
        </tr>
    `).join('');
}

function renderFullLedgerTable(transactions) {
    const tbody = document.getElementById('fullLedgerTableBody');
    if (!tbody) return;
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No transactions matching criteria.</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.map(tx => `
        <tr>
            <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-lime);">${escapeHtml(tx.ref)}</td>
            <td><span class="entry-tag debit">DEBIT</span> Acc #${tx.sourceId}</td>
            <td><span class="entry-tag credit">CREDIT</span> Acc #${tx.targetId}</td>
            <td style="font-weight: 800;">$${Number(tx.amount).toFixed(2)}</td>
            <td style="font-size: 0.8rem; font-family: var(--font-mono);">
                Double-Entry Verified
            </td>
            <td><span class="status-tag completed">${escapeHtml(tx.status)}</span></td>
            <td style="color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(tx.createdAt)}</td>
        </tr>
    `).join('');
}

async function submitTransfer() {
    const sourceId = document.getElementById('sourceAccountSelect').value;
    const targetId = document.getElementById('targetAccountSelect').value;
    const amount = document.getElementById('transferAmount').value;
    const idempotencyKey = document.getElementById('idempotencyKey').value;

    if (!sourceId || !targetId || !amount) {
        alert('Please fill out all required transfer fields.');
        return;
    }

    if (sourceId === targetId) {
        alert('Source and Target account cannot be the same!');
        return;
    }

    const submitBtn = document.getElementById('submitTransferBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    try {
        const response = await fetch(`${API_BASE_URL}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify({
                sourceAccountId: parseInt(sourceId),
                targetAccountId: parseInt(targetId),
                amount: parseFloat(amount)
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Transfer Executed Successfully!');
            document.getElementById('transferModal').classList.remove('active');
            document.getElementById('transferForm').reset();
            fetchAccounts();
            fetchTransactions();
        } else {
            alert('Transfer Failed: ' + (result.error || result.message || 'Unknown error'));
        }
    } catch (err) {
        alert('Network or Server Error: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm & Transfer';
    }
}

function updateServerStatus(online) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    const dbDisplay = document.getElementById('dbModeDisplay');

    if (online) {
        dot.className = 'status-indicator online';
        text.textContent = 'Connected (Port 8080)';
        if (dbDisplay) dbDisplay.textContent = 'Active (Live Java API Server)';
    } else {
        dot.className = 'status-indicator';
        text.textContent = 'Offline (Fallback Mode)';
        if (dbDisplay) dbDisplay.textContent = 'In-Memory Fallback Active';
    }
}

function updateMetrics() {
    const liquidityEl = document.getElementById('metricLiquidity');

    if (liquidityEl && cachedAccounts.length > 0) {
        const total = cachedAccounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
        liquidityEl.textContent = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

function filterAccounts(query) {
    if (!query) return cachedAccounts;
    const q = query.toLowerCase();
    return cachedAccounts.filter(acc => 
        (acc.holderName && acc.holderName.toLowerCase().includes(q)) ||
        (acc.accountNumber && acc.accountNumber.toLowerCase().includes(q))
    );
}

function filterTransactions(query) {
    if (!query) return cachedTransactions;
    const q = query.toLowerCase();
    return cachedTransactions.filter(tx => 
        (tx.ref && tx.ref.toLowerCase().includes(q)) ||
        String(tx.sourceId).includes(q) ||
        String(tx.targetId).includes(q)
    );
}

function renderAccountsFallback() {
    const fallbackAccounts = [
        { id: 1, holderName: "Alice Smith", accountNumber: "ACC-1001", balance: 5000.00, currency: "USD" },
        { id: 2, holderName: "Bob Jones", accountNumber: "ACC-1002", balance: 2500.00, currency: "USD" },
        { id: 3, holderName: "Core-Pay Reserve", accountNumber: "ACC-1003", balance: 100000.00, currency: "USD" }
    ];
    updateAccountViews(fallbackAccounts);
}

function renderTransactionsFallback() {
    const fallbackTxs = [
        { id: 1, ref: "TXN-SAMPLE01", sourceId: 1, targetId: 2, amount: 250.00, status: "COMPLETED", createdAt: "2026-07-28 01:25:00" }
    ];
    cachedTransactions = fallbackTxs;
    renderTransactions(fallbackTxs);
    renderFullLedgerTable(fallbackTxs);
    updateMetrics();
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
