/* Main Application Logic */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const btnLogin = loginForm.querySelector('button');
    const btnLogout = document.getElementById('logout-btn');
    const btnAnnualReceipt = document.getElementById('btn-annual-receipt');

    // Dashboard Elements
    const userNameDisplay = document.getElementById('user-name-display');
    const welcomeMsg = document.getElementById('welcome-msg');
    const currentDateDisplay = document.getElementById('current-date');
    const lastPayAmount = document.getElementById('last-pay-amount');
    const commissionAmount = document.getElementById('commission-amount');
    const invoicesList = document.getElementById('invoices-list');

    // Admin Elements
    const adminStatsGrid = document.getElementById('admin-stats-grid');
    const defaultStatsGrid = document.querySelector('.stats-grid:not(.admin-grid)'); // Select default one
    const adminChartsView = document.getElementById('admin-charts-view'); // Kept variable to avoid breakage if referenced, but logic will change
    const defaultChartView = document.querySelector('.chart-container:not(.charts-split .chart-container)');
    const adminLeaderboardView = document.getElementById('admin-leaderboard-view');
    const adminLeaderboardList = document.getElementById('admin-leaderboard-list');
    const adminChartsSection = document.getElementById('admin-charts-section');

    // Admin KPIs
    const adminMonthTotal = document.getElementById('admin-month-total');
    const adminYearProj = document.getElementById('admin-year-proj');
    // const adminCommRatio = document.getElementById('admin-comm-ratio'); // REMOVED
    const adminTotalEmployees = document.getElementById('admin-total-employees');

    // State
    let currentUser = null;
    // let currentCalendarDate = new Date(); // REMOVED
    let incomeChartInstance = null;
    let adminTrendChartInstance = null;
    let adminDistChartInstance = null;

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
            const result = await DataService.login(username, password);
            if (result.success) {
                currentUser = result.user;
                initDashboard(currentUser);
                loginForm.reset();
            }
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
            btnLogin.innerHTML = '<span>Entrar</span> <i class="ph-bold ph-arrow-right"></i>';
        }
    });

    btnLogout.addEventListener('click', () => {
        currentUser = null;
        loginForm.reset();
        switchView('login');
    });

    if (btnAnnualReceipt) {
        btnAnnualReceipt.addEventListener('click', () => {
            if (currentUser) {
                generateAnnualReceipt(currentUser.id);
            }
        });
    }

    // --- DASHBOARD LOGIC ---
    async function initDashboard(user) {
        // Use animation to transition
        loginView.style.opacity = '0';
        setTimeout(() => {
            switchView('dashboard');
            loginView.style.opacity = '1';
        }, 300);

        // Populate User Info
        userNameDisplay.textContent = user.fullName;
        welcomeMsg.textContent = `Hola, ${user.fullName.split(' ')[0]}`; // Safe split

        const now = new Date();
        currentDateDisplay.textContent = `Hoy es ${now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`;

        // LOAD STATE: Show Skeletons
        const statValues = document.querySelectorAll('.stat-value');
        statValues.forEach(el => el.classList.add('skeleton'));
        invoicesList.innerHTML = '<tr><td colspan="5" class="skeleton skeleton-card"></td></tr>'; // Skeleton Row

        try {
            // Load Data
            const invoices = await DataService.getInvoices(user.id);

            // REMOVE LOAD STATE
            // REMOVE LOAD STATE
            statValues.forEach(el => el.classList.remove('skeleton'));

            // Determine Context (Admin vs Employee)
            if (user.role === 'Administrator') {
                setupAdminView(invoices);
            } else {
                renderInvoices(invoices); // ONLY RENDER TABLE FOR EMPLOYEES
                setupEmployeeView(invoices);
            }

            // Render Chart
            renderIncomeChart(invoices);

            // Setup Search
            setupSearch(invoices);

            // Check Notifications (After small delay)
            setTimeout(() => checkUnseenPayments(invoices), 1000);

        } catch (error) {
            console.error(error);
            // SHOW ERROR VIEW
            dashboardView.classList.add('hidden');
            const errorView = document.getElementById('error-view');
            errorView.classList.remove('hidden');
            // DEBUG: Show actual error
            const errorMsg = errorView.querySelector('p');
            if (errorMsg) errorMsg.innerHTML = `Error: ${error.message}<br><small>${error.stack}</small>`;
        }
    }

    function setupSearch(invoices) {
        const searchInput = document.getElementById('invoice-search');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();

            if (!query) {
                renderInvoices(invoices);
                return;
            }

            const filtered = invoices.filter(inv => {
                const date = inv.date.toLowerCase();
                const concept = inv.concept.toLowerCase();
                const amount = inv.amount.toString();
                const status = inv.status.toLowerCase();

                return date.includes(query) ||
                    concept.includes(query) ||
                    amount.includes(query) ||
                    status.includes(query);
            });

            renderInvoices(filtered);
        });
    }

    function checkUnseenPayments(invoices) {
        const notificationDot = document.getElementById('notification-dot');
        const notificationBell = document.getElementById('notification-bell');

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // 1. Get downloaded IDs from local storage
        const downloadedIds = JSON.parse(localStorage.getItem('downloadedInvoices') || '[]');

        // 2. Find any invoice...
        const unseenInvoices = invoices.filter(inv => {
            const d = new Date(inv.date);
            const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            const isPaid = inv.status === 'Pagado';
            return isCurrentMonth && isPaid && !downloadedIds.includes(inv.id);
        });

        if (unseenInvoices.length > 0) {
            notificationDot.classList.remove('hidden');

            // ADD CLICK EVENT
            // Remove old listener if exists to prevent duplicates (simple cloning trick)
            const newBell = notificationBell.cloneNode(true);
            notificationBell.parentNode.replaceChild(newBell, notificationBell);

            newBell.addEventListener('click', () => {
                showToast(`Tienes ${unseenInvoices.length} recibo(s) pendiente(s) de descargar este mes.`);
                // Optional: Scroll to table
                invoicesList.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });

        } else {
            notificationDot.classList.add('hidden');
            // Reset click to just say "No pending notifications"
            const newBell = notificationBell.cloneNode(true);
            notificationBell.parentNode.replaceChild(newBell, notificationBell);
            newBell.addEventListener('click', () => {
                showToast("Estás al día. No hay nuevas notificaciones.", "success");
            });
        }
    }

    function showToast(message, type = 'info') {
        // Create Toast Element dynamically
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <i class="ph-bold ${type === 'success' ? 'ph-check-circle' : 'ph-info'}"></i>
            <span>${message}</span>
        `;

        if (type === 'success') toast.style.borderLeftColor = 'var(--success)';

        document.body.appendChild(toast);

        // Trigger Animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto hide
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function markAsDownloaded(invoiceId) {
        const downloadedIds = JSON.parse(localStorage.getItem('downloadedInvoices') || '[]');
        if (!downloadedIds.includes(invoiceId)) {
            downloadedIds.push(invoiceId);
            localStorage.setItem('downloadedInvoices', JSON.stringify(downloadedIds));
        }
        // Hide dot if no more unseen
        const notificationDot = document.getElementById('notification-dot');
        if (notificationDot) notificationDot.classList.add('hidden');
        // Note: Ideally re-run checkUnseenPayments to be precise, but hiding immediately feels responsive
    }

    function setupAdminView(invoices) {
        // TOGGLE VIEW: Show Admin Grid, Hide Default
        // TOGGLE VIEW: Show Admin Grid, Hide Default
        defaultStatsGrid.classList.add('hidden');
        // Hide default chart container
        const employeeChartView = document.getElementById('employee-income-chart-view');
        if (employeeChartView) employeeChartView.classList.add('hidden');
        // Hide default Invoices Table
        invoicesList.closest('.table-container').classList.add('hidden');

        adminStatsGrid.classList.remove('hidden');

        adminStatsGrid.classList.remove('hidden');
        // adminChartsView.classList.remove('hidden'); // REMOVED per user request
        document.getElementById('admin-project-summary-view').classList.remove('hidden'); // UPDATED
        adminChartsSection.classList.remove('hidden'); // Show Charts

        document.querySelector('.dashboard-header h2').textContent = `Panel de Control (Admin)`;


        // --- 0. PROJECT FILTER SETUP ---
        const projectFilterContainer = document.getElementById('admin-project-filter-container'); // Note: ID in HTML is admin-filter-container but consistent naming nice?
        // Let's stick to what we put in HTML: admin-filter-container
        const filterContainer = document.getElementById('admin-filter-container');
        const projectSelect = document.getElementById('admin-project-filter');

        filterContainer.classList.remove('hidden');

        // Extract Unique Projects
        // Source from Users, but only those present in Invoices might be cleaner?
        // Or just all available projects.
        const projects = [...new Set(DB.users
            .filter(u => u.project && u.project !== 'General' && u.role !== 'Administrator')
            .map(u => u.project))
        ].sort();

        // Populate options if empty (avoid duplicate if re-run)
        if (projectSelect.options.length === 1) {
            projects.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                projectSelect.appendChild(opt);
            });
        }

        // Filter Logic
        let currentFilteredInvoices = [...invoices];

        const applyAdminFilter = (project) => {
            if (project === 'all') {
                currentFilteredInvoices = [...invoices];
            } else {
                currentFilteredInvoices = invoices.filter(inv => inv.project === project);
            }
            updateAdminDashboard(currentFilteredInvoices);
        };

        // Event Listener (Remove old to prevent dupes)
        const newSelect = projectSelect.cloneNode(true);
        projectSelect.parentNode.replaceChild(newSelect, projectSelect);

        newSelect.addEventListener('change', (e) => {
            applyAdminFilter(e.target.value);
        });

        // Initial Load
        updateAdminDashboard(invoices);
    }

    function updateAdminDashboard(filteredInvoices) {
        // --- 1. KPI CALCULATIONS ---
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const adminMonthTotal = document.getElementById('admin-month-total');
        const adminYearProj = document.getElementById('admin-year-proj');
        // const adminCommRatio = document.getElementById('admin-comm-ratio'); // REMOVED
        const adminTotalEmployees = document.getElementById('admin-total-employees');

        // Filter current month data
        const currentMonthInvoices = filteredInvoices.filter(inv => {
            const d = new Date(inv.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const totalMonthPaid = currentMonthInvoices.reduce((sum, inv) => sum + inv.amount, 0);

        // Annual Projection (Avg * 12)
        const totalYearPaid = filteredInvoices.filter(inv => new Date(inv.date).getFullYear() === currentYear)
            .reduce((sum, inv) => sum + inv.amount, 0);
        const monthsActive = currentMonth + 1; // Simple estimation
        const projectedYear = (totalYearPaid / monthsActive) * 12;

        // KPI: Total Active Clients (Projects)
        const activeProjects = [...new Set(DB.users
            .filter(u => u.project && u.project !== 'General' && u.role !== 'Administrator')
            .map(u => u.project))
        ].length;

        // UPDATE UI
        adminMonthTotal.textContent = formatCurrency(totalMonthPaid);
        adminYearProj.textContent = formatCurrency(projectedYear);
        if (document.getElementById('admin-active-clients')) {
            document.getElementById('admin-active-clients').textContent = activeProjects;
        }

        // Total Employees (Exclude 'Administrator')
        // We need to count Unique Employees in the filtered set? Or All users with that project?
        // Let's count Users associated with the current filter
        const selectValue = document.getElementById('admin-project-filter').value;
        let employeeCount = 0;

        if (selectValue === 'all') {
            employeeCount = DB.users.filter(u => u.role !== 'Administrator').length;
        } else {
            employeeCount = DB.users.filter(u => u.project === selectValue).length;
        }
        adminTotalEmployees.textContent = employeeCount;

        // --- 2. ADMIN CHARTS (REMOVED) ---
        // renderAdminCharts(filteredInvoices, currentYear); // REMOVED

        // --- 3. CLIENT PORTFOLIO (Replaces Project Summary) ---
        renderClientPortfolio(filteredInvoices);

        // --- 4. CHARTS (Replaces Calendar) ---
        renderAdminCharts(filteredInvoices);
    }

    function renderAdminCharts(invoices) {
        const year = new Date().getFullYear(); // Current Year Context

        // --- CHART 1: TREND (Stacked Bar: Salary vs Commission) ---
        const ctxTrend = document.getElementById('adminTrendChart');
        if (ctxTrend) {
            if (adminTrendChartInstance) adminTrendChartInstance.destroy();

            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            const salaryByMonth = new Array(12).fill(0);
            const commByMonth = new Array(12).fill(0);

            invoices.filter(i => new Date(i.date).getFullYear() === year).forEach(inv => {
                const m = new Date(inv.date).getMonth();
                salaryByMonth[m] += (inv.salary || 0);
                commByMonth[m] += (inv.commission || 0);
            });

            adminTrendChartInstance = new Chart(ctxTrend, {
                type: 'bar',
                data: {
                    labels: monthNames,
                    datasets: [
                        {
                            label: 'Salario Base',
                            data: salaryByMonth,
                            backgroundColor: '#3b82f6', // Blue
                            borderRadius: 4
                        },
                        {
                            label: 'Comisiones',
                            data: commByMonth,
                            backgroundColor: '#10b981', // Emerald
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#cbd5e1' } },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: { label: (c) => `${c.dataset.label}: ${formatCurrency(c.raw)}` }
                        }
                    },
                    scales: {
                        x: { stacked: true, grid: { display: false }, ticks: { color: '#cbd5e1' } },
                        y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#cbd5e1' } }
                    }
                }
            });
        }

        // --- CHART 2: PROJECT DISTRIBUTION (Doughnut) ---
        const ctxProj = document.getElementById('adminProjectChart');
        if (ctxProj) {
            if (adminDistChartInstance) adminDistChartInstance.destroy(); // Reuse variable or rename? Let's reuse adminDistChartInstance logic

            // Group by Project
            const projectMap = {};
            invoices.forEach(inv => {
                const p = inv.project || 'Otros';
                projectMap[p] = (projectMap[p] || 0) + inv.amount;
            });

            const labels = Object.keys(projectMap);
            const data = Object.values(projectMap);

            adminDistChartInstance = new Chart(ctxProj, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            '#6366f1', '#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { position: 'right', labels: { color: '#cbd5e1', boxWidth: 12 } },
                        tooltip: { callbacks: { label: (c) => `${c.label}: ${formatCurrency(c.raw)}` } }
                    }
                }
            });
        }
    }

    // function renderAdminCharts(invoices, year) { ... } // REMOVED

    function renderClientPortfolio(invoices) {
        const list = document.getElementById('admin-project-summary-list');
        if (!list) return;
        list.innerHTML = '';

        // 1. Get Projects
        const projects = [...new Set(DB.users
            .filter(u => u.project && u.project !== 'General' && u.role !== 'Administrator')
            .map(u => u.project))
        ].sort();

        // Calculate Total Investment YTD (or based on filter, but usually we want context of Total)
        // If filter is All, we show all. 
        const selectValue = document.getElementById('admin-project-filter')?.value || 'all';
        const projectsToShow = selectValue === 'all' ? projects : [selectValue];

        projectsToShow.forEach(proj => {
            // Stats
            const agents = DB.users.filter(u => u.project === proj).length;

            // Investment: Sum of invoices belonging to this project from the PASSED invoices set
            const projInvestment = invoices
                .filter(inv => inv.project === proj)
                .reduce((sum, inv) => sum + inv.amount, 0);

            // Average per Agent
            const avgPerAgent = agents > 0 ? (projInvestment / agents) : 0;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 500;">
                        <span style="background: rgba(255,255,255,0.1); width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; color: #a5b4fc;">
                            <i class="ph-fill ph-briefcase"></i>
                        </span>
                        <span>${proj}</span>
                    </div>
                </td>
                <td style="text-align: center;">${agents}</td>
                <td style="text-align: right; font-weight: bold;">${formatCurrency(projInvestment)}</td>
                 <td style="text-align: right;">
                    <span style="font-size: 0.9rem; color: var(--text-muted)">${formatCurrency(avgPerAgent)}</span>
                </td>
            `;
            list.appendChild(tr);
        });
    }

    function setupEmployeeView(invoices) {
        // ENSURE DEFAULT VIEW IS VISIBLE
        defaultStatsGrid.classList.remove('hidden');
        adminStatsGrid.classList.add('hidden');
        if (adminChartsView) adminChartsView.classList.add('hidden');
        if (adminChartsSection) adminChartsSection.classList.add('hidden'); // Hide Charts for employees

        // Hide Admin Project Summary (Client Portfolio) logic
        document.getElementById('admin-project-summary-view').classList.add('hidden');

        // Show Employee Chart
        const employeeChartView = document.getElementById('employee-income-chart-view');
        if (employeeChartView) employeeChartView.classList.remove('hidden');

        // Restore Default Table
        invoicesList.closest('.table-container').classList.remove('hidden');

        // Reset Labels
        defaultStatsGrid.querySelectorAll('.stat-card')[0].querySelector('h3').textContent = "Pagado hasta la fecha"; // More accurate
        defaultStatsGrid.querySelectorAll('.stat-card')[1].querySelector('h3').textContent = "Total Comisiones hasta la fecha";

        calculateStats(invoices);
    }

    function calculateStats(invoices) {
        // Logic: Sum specific items across all invoices
        let totalSalary = 0;
        let totalCommissions = 0;

        invoices.forEach(inv => {
            if (inv.items) {
                inv.items.forEach(item => {
                    if (item.desc === "Bi-weekly Period") {
                        totalSalary += item.amount;
                    } else if (item.desc.includes("Commission") || item.desc.includes("Comisión")) {
                        totalCommissions += item.amount;
                    }
                });
            }
        });

        lastPayAmount.textContent = formatCurrency(totalSalary);
        commissionAmount.textContent = formatCurrency(totalCommissions);
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

    // --- PDF GENERATION (Individual) ---
    // Helper to load image as Base64
    const loadImageBase64 = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.setAttribute('crossOrigin', 'anonymous');
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                console.log("PDF Logo loaded successfully");
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = (e) => {
                console.error("PDF Logo failed to load", e);
                resolve(null);
            };
            // Cache Busting: Force new image load
            img.src = url + '?t=' + new Date().getTime();
        });
    };

    window.generatePDF = async (invoiceId) => {
        const { jsPDF } = window.jspdf;
        const inv = DB.invoices.find(i => i.id === invoiceId);
        if (!inv) return;

        // Load Logo
        const logoData = await loadImageBase64('IMG/logo2.png');

        // Create PDF
        const doc = new jsPDF();

        // Dates for Context
        const parts = inv.date.split('-');
        // Force local date interpretation
        const displayDate = new Date(parts[0], parts[1] - 1, parts[2]);

        const monthName = displayDate.toLocaleDateString('en-US', { month: 'long' }); // English Month
        const year = displayDate.getFullYear();
        const fullDate = displayDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // --- DESIGN ---

        // 1. Header Area
        doc.setFillColor(15, 23, 42); // Dark Navy Background
        doc.rect(0, 0, 210, 50, 'F');

        // LOGO ADDITION (Top Left)
        if (logoData) {
            try {
                // Add logo with rounded corners styling is hard in PDF, just adding raw image
                // x=10, y=12.5 (Centered vertically in 50h header), w=25, h=25
                doc.addImage(logoData, 'PNG', 10, 12.5, 25, 25, undefined, 'FAST');
            } catch (e) {
                console.warn("Could not add logo to PDF", e);
            }
        }

        // Company Name
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);
        doc.text("Solvenza Solutions", 105, 22, { align: 'center' }); // Slightly higher

        // Title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text("PAYMENT RECEIPT", 105, 38, { align: 'center' }); // Centered below

        // 2. Invoice Meta (Right Aligned below header)
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("DATE:", 160, 60, { align: 'right' });
        doc.text("REF #:", 160, 65, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.text(fullDate, 200, 60, { align: 'right' });
        doc.text(inv.id, 200, 65, { align: 'right' });

        // 3. User Info (Left Aligned)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("TO:", 20, 60);

        doc.setFontSize(12);
        doc.text(DB.users.find(u => u.id === inv.userId)?.fullName || 'Employee', 20, 66);

        // Email removed per user request
        // doc.setFontSize(10);
        // doc.setFont('helvetica', 'normal');
        // doc.text(DB.users.find(u => u.id === inv.userId)?.email || '', 20, 71);

        // Context Message
        doc.setTextColor(100, 116, 139);
        doc.text(`Payment for the month of ${monthName} ${year}`, 20, 75);

        // 4. Line Items Table (AutoTable)
        doc.autoTable({
            startY: 85,
            head: [['Description', 'Bi-weekly Period', 'Commissions', 'Total Amount']],
            body: [[
                inv.concept,
                formatCurrency(inv.salary),
                formatCurrency(inv.commission),
                formatCurrency(inv.amount)
            ]],
            theme: 'striped',
            headStyles: {
                fillColor: [99, 102, 241],
                textColor: 255,
                halign: 'center',
                fontStyle: 'bold'
            },
            bodyStyles: {
                textColor: [51, 65, 85],
                halign: 'center',
                minCellHeight: 12
            },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold' }, // Desc
                3: { halign: 'right', fontStyle: 'bold' } // Total
            }
        });

        // Debug Data
        console.log("PDF Invoice Data:", inv);

        // 5. Sign-off / Footer REMOVED per user request

        doc.save(`Solvenza_Payment_${fullDate}.pdf`);

        // Mark as seen for notifications
        markAsDownloaded(invoiceId);
    };

    // --- ADMIN REPORT GENERATION ---
    window.generateMonthlyReport = (invoices) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const now = new Date();
        const currentMonthIndex = now.getMonth();
        const monthName = now.toLocaleDateString('en-US', { month: 'long' });
        const year = now.getFullYear();
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

        // 1. FILTER: Current Month
        const monthlyInvoices = invoices.filter(inv => {
            const d = new Date(inv.date);
            return d.getMonth() === currentMonthIndex && d.getFullYear() === year;
        });

        // 2. GROUP BY: Employee
        const reportData = {};

        monthlyInvoices.forEach(inv => {
            if (!reportData[inv.userId]) {
                const user = DB.users.find(u => u.id === inv.userId);
                reportData[inv.userId] = {
                    name: user ? user.fullName : 'Unknown',
                    salary: 0,
                    commissions: 0,
                    total: 0
                };
            }

            const isCommission = inv.concept.toLowerCase().includes('comis') || inv.concept.toLowerCase().includes('bono');

            if (isCommission) {
                reportData[inv.userId].commissions += inv.amount;
            } else {
                reportData[inv.userId].salary += inv.amount;
            }
            reportData[inv.userId].total += inv.amount;
        });

        // Convert to Array for AutoTable
        const tableBody = Object.values(reportData).map(row => [
            row.name,
            formatCurrency(row.salary),
            formatCurrency(row.commissions),
            formatCurrency(row.total)
        ]);

        const grandTotal = Object.values(reportData).reduce((sum, row) => sum + row.total, 0);

        // --- PDF DESIGN ---

        // 1. Header Area
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 50, 'F');

        // Company Name
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);
        doc.text("Solvenza Solutions", 105, 22, { align: 'center' }); // Adjusted centering

        // Title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text("PAYMENT RECEIPT", 105, 38, { align: 'center' });

        // 2. Context Message
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(11);
        doc.text(`For the month of ${capitalizedMonth} ${year}`, 105, 65, { align: 'center' });

        // 3. Table
        doc.autoTable({
            startY: 75,
            head: [['Employee', 'Bi-weekly Period', 'Commissions', 'Total Amount']],
            body: tableBody,
            theme: 'striped',
            headStyles: {
                fillColor: [99, 102, 241],
                textColor: 255,
                halign: 'center',
                fontStyle: 'bold'
            },
            bodyStyles: {
                textColor: [51, 65, 85],
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold' }, // Name
                1: { halign: 'right' }, // Salary
                2: { halign: 'right' }, // Commission
                3: { halign: 'right', fontStyle: 'bold' } // Total
            },
            foot: [['', '', 'GRAND TOTAL', formatCurrency(grandTotal)]],
            footStyles: {
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
                fontStyle: 'bold',
                halign: 'right'
            },
            didParseCell: function (data) {
                if (data.section === 'foot' && data.column.index === 2) {
                    data.cell.styles.halign = 'right';
                }
            }
        });

        // 4. Sign-off area
        const finalY = doc.lastAutoTable.finalY + 40; // Spacing relative to table

        doc.setDrawColor(203, 213, 225);
        doc.line(75, finalY, 135, finalY); // Center Line

        // "Signature" style - Bold Name above the line
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Kevin Barros", 105, finalY - 4, { align: 'center' });

        // Title below the line
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text("CBO Solvenza Solutions", 105, finalY + 5, { align: 'center' });

        doc.save(`Solvenza_Report_${capitalizedMonth}_${year}.pdf`);
    };

    // --- EMPLOYEE ANNUAL RECEIPT ---
    window.generateAnnualReceipt = async (userId) => {
        const { jsPDF } = window.jspdf;
        const invs = await DataService.getInvoices(userId);
        if (!invs || invs.length === 0) return;

        const now = new Date();
        const year = now.getFullYear();

        // Filter for Current Year
        const annualInvoices = invs.filter(i => new Date(i.date).getFullYear() === year);

        if (annualInvoices.length === 0) {
            alert("No payments found for this year.");
            return;
        }

        // Aggregate by Month
        const monthlyData = {};
        annualInvoices.forEach(inv => {
            // "YYYY-MM-DD"
            const parts = inv.date.split('-');
            // Create date object using parts to avoid timezone shifting
            // parts[0]=Year, parts[1]=Month(1-12), parts[2]=Day
            const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);

            const monthIndex = dateObj.getMonth(); // 0-11

            if (!monthlyData[monthIndex]) {
                monthlyData[monthIndex] = {
                    monthName: dateObj.toLocaleDateString('en-US', { month: 'long' }),
                    salary: 0,
                    commission: 0,
                    total: 0
                };
            }
            monthlyData[monthIndex].salary += (inv.salary || 0);
            monthlyData[monthIndex].commission += (inv.commission || 0);
            monthlyData[monthIndex].total += inv.amount;
        });

        // Convert to Array and Sort by Month Index
        const tableBody = Object.entries(monthlyData)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([k, d]) => [
                d.monthName,
                formatCurrency(d.salary),
                formatCurrency(d.commission),
                formatCurrency(d.total)
            ]);

        const totalSalary = Object.values(monthlyData).reduce((s, d) => s + d.salary, 0);
        const totalComm = Object.values(monthlyData).reduce((s, d) => s + d.commission, 0);
        const grandTotal = Object.values(monthlyData).reduce((s, d) => s + d.total, 0);

        // Add Totals Row
        tableBody.push([
            { content: 'TOTALS', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: formatCurrency(totalSalary), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } },
            { content: formatCurrency(totalComm), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } },
            { content: formatCurrency(grandTotal), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } }
        ]);

        // PDF Generation
        const doc = new jsPDF();

        // Try to load logo
        let logoData = null;
        try {
            logoData = await loadImageBase64('IMG/logo2.png');
        } catch (e) { console.warn("Logo load fail", e); }

        // Header
        doc.setFillColor(15, 23, 42); // Navy
        doc.rect(0, 0, 210, 50, 'F');

        if (logoData) {
            doc.addImage(logoData, 'PNG', 10, 12.5, 25, 25);
        }

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text("Solvenza Solutions", 105, 22, { align: 'center' });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text("ANNUAL INCOME CERTIFICATE", 105, 38, { align: 'center' });

        // User Info
        const user = DB.users.find(u => u.id === userId);
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Employee:`, 20, 65);
        doc.setFont('helvetica', 'normal');
        doc.text(user ? user.fullName : 'Unknown', 45, 65);

        doc.setFont('helvetica', 'bold');
        doc.text(`Year:`, 20, 72);
        doc.setFont('helvetica', 'normal');
        doc.text(String(year), 45, 72);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated: ${now.toLocaleDateString()}`, 190, 65, { align: 'right' });

        // Table
        doc.autoTable({
            startY: 80,
            head: [['Month', 'Base Salary', 'Commissions', 'Total Received']],
            body: tableBody,
            theme: 'striped',
            headStyles: {
                fillColor: [16, 185, 129], // Emerald Green
                textColor: 255,
                halign: 'center',
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { fontStyle: 'bold' },
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { fontStyle: 'bold', halign: 'right' }
            },
            didDrawPage: (data) => {
                // Footer
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Solvenza Solutions - Annual Report ${year}`, 105, 290, { align: 'center' });
            }
        });

        doc.save(`Solvenza_Annual_Receipt_${year}_${user ? user.fullName.replace(/\s+/g, '_') : 'Employee'}.pdf`);
    };
});
