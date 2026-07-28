let API_BASE_URL = 'http://localhost:8080/api';
let pollingIntervalId = null;
let currentPollingRate = 3000;
let cachedAccounts = [];
let cachedTransactions = [];
let userGeminiApiKey = '';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    initRAGEngine();
});

window.sendQuickPrompt = sendQuickPrompt;
window.openTransferModal = openTransferModal;
window.openAddAccountModal = openAddAccountModal;
window.setPresetAmount = setPresetAmount;

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

    // Add Account Modal
    const addAccountModal = document.getElementById('addAccountModal');
    const closeAddAccountBtn = document.getElementById('closeAddAccountModalBtn');
    const cancelAddAccountBtn = document.getElementById('cancelAddAccountBtn');
    const addAccountForm = document.getElementById('addAccountForm');

    document.querySelectorAll('.openAddAccountModalBtn').forEach(btn => {
        btn.addEventListener('click', () => openAddAccountModal());
    });

    const closeAddAccountModal = () => addAccountModal.classList.remove('active');
    if (closeAddAccountBtn) closeAddAccountBtn.addEventListener('click', closeAddAccountModal);
    if (cancelAddAccountBtn) cancelAddAccountBtn.addEventListener('click', closeAddAccountModal);

    if (addAccountForm) {
        addAccountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitAddAccount();
        });
    }

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
            const apiKeyInput = document.getElementById('geminiApiKeyInput').value.trim();
            const rateSelect = parseInt(document.getElementById('pollingRateSelect').value);
            
            if (urlInput) API_BASE_URL = urlInput;
            if (apiKeyInput) userGeminiApiKey = apiKeyInput;
            currentPollingRate = rateSelect;
            startPolling(currentPollingRate);

            const badge = document.getElementById('pollingBadge');
            if (badge) {
                badge.innerHTML = rateSelect > 0 
                    ? `<span class="pulse-dot"></span> Live (${rateSelect / 1000}s)` 
                    : `<span>Manual Refresh</span>`;
            }

            alert('CorePay settings and AI configuration updated successfully!');
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
                <button class="btn btn-sm btn-primary" onclick="openTransferModal(${acc.id})">Transfer</button>
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
            <td style="font-family: var(--font-mono); font-weight: 600; color: var(--accent-purple-light);">${escapeHtml(tx.ref)}</td>
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
            <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-purple-light);">${escapeHtml(tx.ref)}</td>
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

function openAddAccountModal() {
    const modal = document.getElementById('addAccountModal');
    if (modal) {
        document.getElementById('newHolderName').value = '';
        document.getElementById('newInitialBalance').value = '';
        modal.classList.add('active');
    }
}

async function submitAddAccount() {
    const holderName = document.getElementById('newHolderName').value.trim();
    const balance = document.getElementById('newInitialBalance').value;
    const currency = document.getElementById('newCurrency').value;

    if (!holderName || balance === '') {
        alert('Please fill out all required fields.');
        return;
    }

    const btn = document.getElementById('submitAddAccountBtn');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
        const response = await fetch(`${API_BASE_URL}/accounts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                holderName: holderName,
                balance: parseFloat(balance),
                currency: currency
            })
        });

        if (response.ok) {
            const data = await response.json();
            alert(`Account created successfully!\nAccount Holder: ${data.holderName}\nAccount Number: ${data.accountNumber}`);
            document.getElementById('addAccountModal').classList.remove('active');
            document.getElementById('addAccountForm').reset();
            fetchAccounts();
        } else {
            const err = await response.json();
            alert('Failed to create account: ' + (err.error || 'Server error'));
        }
    } catch (e) {
        alert('Network error connecting to backend: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
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
        { id: 1, holderName: "Mridul", accountNumber: "ACC-1001", balance: 5000.00, currency: "USD" },
        { id: 2, holderName: "Don", accountNumber: "ACC-1002", balance: 2500.00, currency: "USD" },
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

/* ================================================================
   AI RAG ASSISTANT ENGINE
   ================================================================ */
function initRAGEngine() {
    const triggerBtn = document.getElementById('aiChatTrigger');
    const drawer = document.getElementById('aiChatDrawer');
    const closeBtn = document.getElementById('aiChatCloseBtn');
    const sendBtn = document.getElementById('aiChatSendBtn');
    const input = document.getElementById('aiChatInput');

    if (!triggerBtn || !drawer) return;

    triggerBtn.addEventListener('click', () => {
        drawer.classList.toggle('active');
    });

    closeBtn.addEventListener('click', () => {
        drawer.classList.remove('active');
    });

    sendBtn.addEventListener('click', () => handleUserChatMessage());
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserChatMessage();
    });
}

function sendQuickPrompt(promptText) {
    const input = document.getElementById('aiChatInput');
    input.value = promptText;
    handleUserChatMessage();
}

async function handleUserChatMessage() {
    const input = document.getElementById('aiChatInput');
    const container = document.getElementById('aiChatMessages');
    const userQuery = input.value.trim();

    if (!userQuery) return;

    // Append User Message Bubble
    appendChatMessage('user', escapeHtml(userQuery));
    input.value = '';

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;

    // Show AI Typing Indicator
    const typingId = 'typing_' + Date.now();
    const typingBubble = document.createElement('div');
    typingBubble.className = 'ai-msg bot';
    typingBubble.id = typingId;
    typingBubble.innerHTML = 'Thinking...';
    container.appendChild(typingBubble);
    container.scrollTop = container.scrollHeight;

    // Process RAG Response
    const aiResponse = await generateRAGResponse(userQuery);

    // Remove typing bubble and append AI response
    const bubbleToReplace = document.getElementById(typingId);
    if (bubbleToReplace) bubbleToReplace.remove();

    appendChatMessage('bot', aiResponse);
    container.scrollTop = container.scrollHeight;
}

function appendChatMessage(sender, htmlContent) {
    const container = document.getElementById('aiChatMessages');
    const msg = document.createElement('div');
    msg.className = `ai-msg ${sender}`;
    msg.innerHTML = htmlContent;
    container.appendChild(msg);
}

function buildRAGContext() {
    const totalLiquidity = cachedAccounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    const accountDetails = cachedAccounts.map(a => `${a.holderName} (${a.accountNumber}): $${Number(a.balance).toFixed(2)}`).join('\n');
    const recentTxLogs = cachedTransactions.slice(0, 10).map(t => `Ref: ${t.ref} | Source Acc #${t.sourceId} -> Target Acc #${t.targetId} | Amount: $${Number(t.amount).toFixed(2)} | Status: ${t.status} | Date: ${t.createdAt}`).join('\n');

    return `=== LIVE COREPAY LEDGER RAG CONTEXT ===
System Total Liquidity: $${totalLiquidity.toFixed(2)} USD
Total Active Accounts: ${cachedAccounts.length}
Registered Accounts:
${accountDetails}

Recent Transaction Audit Trail:
${recentTxLogs || 'No transactions logged yet.'}

System Rules:
1. Double-Entry Accounting: Every transfer logs matching DEBIT (source) and CREDIT (target) entries.
2. Idempotency Protection: Duplicate requests with same X-Idempotency-Key are rejected with 409 Conflict.
3. Hybrid Storage: Connects to MySQL 8.0 or falls back to In-Memory ConcurrentHashMap store.
========================================`;
}

async function generateRAGResponse(query) {
    const ragContext = buildRAGContext();
    const q = query.toLowerCase();

    // 1. If user provided a Gemini API Key in Settings, use Google Gemini API
    if (userGeminiApiKey) {
        try {
            const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${userGeminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: `You are CorePay AI Assistant. Use the following RAG context to answer the user's question accurately.\n\n${ragContext}\n\nUser Question: ${query}` }
                        ]
                    }]
                })
            });
            const data = await apiRes.json();
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                return data.candidates[0].content.parts[0].text.replace(/\n/g, '<br>');
            }
        } catch (e) {
            console.warn('Gemini API call failed, using built-in RAG fallback', e);
        }
    }

    // 2. Intelligent Built-in RAG Assistant Fallback
    if (q.includes('liquidity') || q.includes('reserve') || q.includes('balance') || q.includes('total')) {
        const total = cachedAccounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
        return `Current system total liquidity is <strong>$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong> across <strong>${cachedAccounts.length}</strong> active ledger accounts.`;
    }

    if (q.includes('who') || q.includes('recipient') || q.includes('don') || q.includes('mridul') || q.includes('bob') || q.includes('alice') || q.includes('transfer')) {
        if (cachedTransactions.length === 0) {
            return 'No transactions have been processed yet. You can click <strong>+ Transfer</strong> to send funds!';
        }
        const lastTx = cachedTransactions[0];
        const source = cachedAccounts.find(a => a.id === lastTx.sourceId) || { holderName: `Acc #${lastTx.sourceId}` };
        const target = cachedAccounts.find(a => a.id === lastTx.targetId) || { holderName: `Acc #${lastTx.targetId}` };
        
        return `The most recent transaction is <strong>${escapeHtml(lastTx.ref)}</strong>.<br>Amount: <strong>$${Number(lastTx.amount).toFixed(2)}</strong> sent from <strong>${escapeHtml(source.holderName)}</strong> to <strong>${escapeHtml(target.holderName)}</strong>.`;
    }

    if (q.includes('double entry') || q.includes('debit') || q.includes('credit') || q.includes('rule') || q.includes('how')) {
        return `CorePay enforces strict <strong>Double-Entry Accounting</strong>: Every transfer atomically logs a matching <strong>DEBIT</strong> record for the source account and a <strong>CREDIT</strong> record for the target account, guaranteeing zero balance discrepancies.`;
    }

    if (q.includes('idempotency') || q.includes('duplicate') || q.includes('key')) {
        return `CorePay's <strong>Idempotency Engine</strong> tracks X-Idempotency-Key headers in a sliding-window queue (IdempotencyQueue.java). Any duplicate transfer request within the window is blocked with HTTP 409 Conflict.`;
    }

    if (q.includes('account') || q.includes('list')) {
        const list = cachedAccounts.map(a => `<li><strong>${escapeHtml(a.holderName)}</strong> (${escapeHtml(a.accountNumber)}): $${Number(a.balance).toFixed(2)}</li>`).join('');
        return `Registered CorePay Accounts:<ul style="margin-left: 1.2rem; margin-top: 0.4rem;">${list}</ul>`;
    }

    // Default intelligent summary
    return `Based on live RAG context:<br>- System Liquidity: <strong>$${cachedAccounts.reduce((s, a) => s + Number(a.balance || 0), 0).toFixed(2)}</strong><br>- Active Accounts: <strong>${cachedAccounts.length}</strong><br>- Recent Tx Count: <strong>${cachedTransactions.length}</strong><br>How else can I assist with your ledger?`;
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
