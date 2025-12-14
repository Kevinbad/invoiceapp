/* Main Application Logic */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const btnLogin = loginForm.querySelector('button');
    const btnLogout = document.getElementById('logout-btn');

    // Dashboard Elements
    const userNameDisplay = document.getElementById('user-name-display');
    const welcomeMsg = document.getElementById('welcome-msg');
    const currentDateDisplay = document.getElementById('current-date');
    const lastPayAmount = document.getElementById('last-pay-amount');
    const commissionAmount = document.getElementById('commission-amount');
    const totalYearAmount = document.getElementById('total-year-amount'); // NEW
    const invoicesList = document.getElementById('invoices-list');

    // State
    let currentUser = null;
    let incomeChartInstance = null; // Store chart instance

    // --- UTILS ---
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    };

    const switchView = (viewName) => {
        if (viewName === 'dashboard') {
            loginView.classList.add('hidden');
            loginView.classList.remove('active');
            dashboardView.classList.remove('hidden');
            // Small delay to allow display:block to apply before opacity transition if we added one
            setTimeout(() => dashboardView.classList.add('active'), 10);
        } else {
            dashboardView.classList.add('hidden');
            dashboardView.classList.remove('active');
            loginView.classList.remove('hidden');
            loginView.classList.add('active');
        }
    };

    // --- LOGIN LOGIC ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = loginForm.username.value;
        const password = loginForm.password.value;

        // UI Loading State
        btnLogin.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Entrando...';
        loginError.classList.add('hidden');

        try {
            const response = await DataService.login(username, password);
            currentUser = response.user;
            initDashboard(currentUser);
        } catch (error) {
            loginError.textContent = error.message;
            loginError.classList.remove('hidden');
            // Shake animation
            loginForm.querySelector('.glass-card').animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(0)' }
            ], { duration: 300 });
        } finally {
            btnLogin.innerHTML = '<span>Ingresar</span><i class="ph-bold ph-arrow-right"></i>';
        }
    });

    btnLogout.addEventListener('click', () => {
        currentUser = null;
        loginForm.reset();
        switchView('login');
    });

    // --- DASHBOARD LOGIC ---
    async function initDashboard(user) {
        // Use animation to transition
        loginView.style.opacity = '0';
        setTimeout(() => {
            switchView('dashboard');
            loginView.style.opacity = '1'; // Reset for next time
        }, 300);

        // Populate User Info
        userNameDisplay.textContent = user.fullName;
        welcomeMsg.textContent = `Hola, ${user.fullName.split(' ')[0]}`;

        // Date
        const now = new Date();
        currentDateDisplay.textContent = `Hoy es ${now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`;

        // Load Data
        const invoices = await DataService.getInvoices(user.id);
        renderInvoices(invoices);
        calculateStats(invoices);

        // Calculate and display total year amount
        const totalYear = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        totalYearAmount.textContent = formatCurrency(totalYear);
    }

    function calculateStats(invoices) {
        // Logic: Last Pay is the most recent invoice regarding "Salario"
        const lastPay = invoices.find(inv => inv.concept.includes('Salario')) || invoices[0];
        lastPayAmount.textContent = lastPay ? formatCurrency(lastPay.amount) : "$0.00";

        // Logic: Sum commissions for current month
        // Simple mock logic: just sum all invoices with "Comisión" in mock data
        const commissions = invoices
            .filter(inv => inv.concept.toLowerCase().includes('comis'))
            .reduce((sum, inv) => sum + inv.amount, 0);

        commissionAmount.textContent = formatCurrency(commissions);
    }

    function renderInvoices(invoices) {
        invoicesList.innerHTML = '';
        if (invoices.length === 0) {
            invoicesList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No hay pagos registrados</td></tr>';
            return;
        }

        invoices.forEach(inv => {
            const row = document.createElement('tr');

            const statusClass = inv.status === 'Pagado' ? 'status-paid' : 'status-pending';

            row.innerHTML = `
                <td>${formatDate(inv.date)}</td>
                <td>
                    <div style="font-weight: 500">${inv.concept}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted)">${inv.id}</div>
                </td>
                <td><span class="status-badge ${statusClass}">${inv.status}</span></td>
                <td style="font-family: monospace; font-size: 1rem;">${formatCurrency(inv.amount)}</td>
                <td>
                    <button class="btn-download" onclick="generatePDF('${inv.id}')">
                        <i class="ph-bold ph-download-simple"></i>
                        <span>PDF</span>
                    </button>
                </td>
            `;
            invoicesList.appendChild(row);
        });
    }

    function renderIncomeChart(invoices) {
        const ctx = document.getElementById('incomeChart');
        if (!ctx) return;

        // Destroy existing to avoid duplicates/memory leaks
        if (incomeChartInstance) {
            incomeChartInstance.destroy();
        }

        // 1. Prepare Data Buckets (Jan - Dec)
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const incomeByMonth = new Array(12).fill(0);

        // 2. Aggregate Amounts
        invoices.forEach(inv => {
            // "2025-04-30" split to avoid timezone issues
            // parts[0] = Year, parts[1] = Month (1-12), parts[2] = Day
            const parts = inv.date.split('-');
            const monthIndex = parseInt(parts[1], 10) - 1; // 0-indexed

            if (monthIndex >= 0 && monthIndex < 12) {
                incomeByMonth[monthIndex] += inv.amount;
            }
        });

        // 3. Render Chart
        incomeChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthNames,
                datasets: [{
                    label: 'Total Pagado',
                    data: incomeByMonth,
                    borderColor: '#a3b1ff', // Soft Purple
                    backgroundColor: 'rgba(163, 177, 255, 0.15)',
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#6366f1',
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    fill: true,
                    tension: 0.4 // Smooth curve
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1e293b',
                        bodyColor: '#1e293b',
                        titleFont: { family: "'Outfit', sans-serif", weight: '600' },
                        bodyFont: { family: "'Outfit', sans-serif" },
                        padding: 12,
                        cornerRadius: 8,
                        borderColor: 'rgba(0,0,0,0.05)',
                        borderWidth: 1,
                        displayColors: false,
                        callbacks: {
                            label: (context) => formatCurrency(context.raw)
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.08)' },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: { family: "'Outfit', sans-serif" },
                            callback: (val) => '$' + val
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: { family: "'Outfit', sans-serif" }
                        }
                    }
                }
            }
        });
    }

    // --- PDF GENERATION (Global Scope for onclick) ---
    window.generatePDF = (invoiceId) => {
        const { jsPDF } = window.jspdf;
        const inv = DB.invoices.find(i => i.id === invoiceId);
        if (!inv) return;

        // Create PDF
        const doc = new jsPDF();

        // Colors
        const primaryColor = [99, 102, 241]; // Indigo

        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text("Solvenza Hub", 20, 20);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text("Comprobante de Pago", 20, 30);

        // Invoice Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Fecha: ${inv.date}`, 150, 60, { align: 'right' });
        doc.text(`Folio: ${inv.id}`, 150, 65, { align: 'right' });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Para: ${currentUser.fullName}`, 20, 60);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(currentUser.email, 20, 65);

        // Line Item Header
        let y = 90;
        doc.setFillColor(240, 240, 240);
        doc.rect(20, y - 5, 170, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text("Concepto", 25, y + 1);
        doc.text("Importe", 185, y + 1, { align: 'right' });

        // Items
        y += 15;
        doc.setFont('helvetica', 'normal');
        inv.items.forEach(item => {
            doc.text(item.desc, 25, y);
            doc.text(formatCurrency(item.amount), 185, y, { align: 'right' });
            y += 10;
        });

        // Total
        y += 10;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, y, 190, y);
        y += 10;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Total Pagado", 130, y, { align: 'right' });
        doc.setTextColor(...primaryColor);
        doc.text(formatCurrency(inv.amount), 185, y, { align: 'right' });

        // Save
        doc.save(`Solvenza_Invoice_${inv.id}.pdf`);
    };
});
