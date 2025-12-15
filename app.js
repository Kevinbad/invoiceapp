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
    const invoicesList = document.getElementById('invoices-list');

    // Admin Elements
    const adminStatsGrid = document.getElementById('admin-stats-grid');
    const defaultStatsGrid = document.querySelector('.stats-grid:not(.admin-grid)'); // Select default one
    const adminChartsView = document.getElementById('admin-charts-view');
    const defaultChartView = document.querySelector('.chart-container:not(.charts-split .chart-container)');
    const adminLeaderboardView = document.getElementById('admin-leaderboard-view');
    const adminLeaderboardList = document.getElementById('admin-leaderboard-list');
    const adminCalendarView = document.getElementById('admin-calendar-view'); // NEW
    const calendarGrid = document.getElementById('calendar-grid'); // NEW
    const calMonthYear = document.getElementById('cal-month-year'); // NEW
    const btnCalPrev = document.getElementById('cal-prev'); // NEW
    const btnCalNext = document.getElementById('cal-next'); // NEW

    // Admin KPIs
    const adminMonthTotal = document.getElementById('admin-month-total');
    const adminYearProj = document.getElementById('admin-year-proj');
    const adminCommRatio = document.getElementById('admin-comm-ratio');
    const adminTotalEmployees = document.getElementById('admin-total-employees');

    // State
    let currentUser = null;
    let currentCalendarDate = new Date(); // State for calendar
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

        } catch (error) {
            console.error(error);
            // SHOW ERROR VIEW
            dashboardView.classList.add('hidden');
            document.getElementById('error-view').classList.remove('hidden');
        }
    }

    function setupAdminView(invoices) {
        // TOGGLE VIEW: Show Admin Grid, Hide Default
        // TOGGLE VIEW: Show Admin Grid, Hide Default
        defaultStatsGrid.classList.add('hidden');
        // Hide default chart container
        if (defaultChartView) defaultChartView.classList.add('hidden');
        // Hide default Invoices Table
        invoicesList.closest('.table-container').classList.add('hidden');

        adminStatsGrid.classList.remove('hidden');

        adminStatsGrid.classList.remove('hidden');
        adminChartsView.classList.remove('hidden');
        adminLeaderboardView.classList.remove('hidden');
        adminCalendarView.classList.remove('hidden'); // Show Calendar

        document.querySelector('.dashboard-header h2').textContent = `Panel de Control (Admin)`;

        // --- 1. KPI CALCULATIONS ---
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Filter current month data
        const currentMonthInvoices = invoices.filter(inv => {
            const d = new Date(inv.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const totalMonthPaid = currentMonthInvoices.reduce((sum, inv) => sum + inv.amount, 0);

        // Annual Projection (Avg * 12)
        const totalYearPaid = invoices.filter(inv => new Date(inv.date).getFullYear() === currentYear)
            .reduce((sum, inv) => sum + inv.amount, 0);
        const monthsActive = currentMonth + 1; // Simple estimation
        const projectedYear = (totalYearPaid / monthsActive) * 12;

        // Commission Ratio
        const totalBase = currentMonthInvoices.reduce((sum, inv) => sum + (inv.salary || 0), 0);
        const totalComm = currentMonthInvoices.reduce((sum, inv) => sum + (inv.commission || 0), 0);
        const loopTotal = totalBase + totalComm;
        const ratio = loopTotal > 0 ? (totalComm / loopTotal) * 100 : 0;

        // UPDATE UI
        adminMonthTotal.textContent = formatCurrency(totalMonthPaid);
        adminYearProj.textContent = formatCurrency(projectedYear);
        adminCommRatio.textContent = ratio.toFixed(1) + '%';

        // Total Employees (Exclude 'Administrator' or just Solvenza Master)
        // Let's count Active Employees (Role != Administrator)
        const totalEmployees = DB.users.filter(u => u.role !== 'Administrator').length;
        adminTotalEmployees.textContent = totalEmployees;

        // --- 2. ADMIN CHARTS ---
        renderAdminCharts(invoices, currentYear);

        // --- 3. LEADERBOARD ---
        renderLeaderboard(currentMonthInvoices);

        // --- 4. CALENDAR ---
        renderCalendar(invoices, currentCalendarDate);

        // Calendar Navigation Events (Remove old listeners to prevent duplicates if re-called)
        const newPrev = btnCalPrev.cloneNode(true);
        const newNext = btnCalNext.cloneNode(true);
        btnCalPrev.parentNode.replaceChild(newPrev, btnCalPrev);
        btnCalNext.parentNode.replaceChild(newNext, btnCalNext);

        newPrev.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar(invoices, currentCalendarDate);
        });

        newNext.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar(invoices, currentCalendarDate);
        });

        // --- 5. EXPORT BUTTON LOGIC (Keep existing) ---
        // Show Download Button logic stays if needed
    }

    function renderCalendar(invoices, dateObj) {
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth(); // 0-11

        // Header
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        calMonthYear.textContent = `${monthNames[month]} ${year}`;

        calendarGrid.innerHTML = '';

        // Day Headers
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        days.forEach(d => {
            const el = document.createElement('div');
            el.className = 'cal-day-header';
            el.textContent = d;
            calendarGrid.appendChild(el);
        });

        // Calculations
        const firstDay = new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty cells for first week
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'cal-day empty';
            calendarGrid.appendChild(empty);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const invsToday = invoices.filter(inv => inv.date === dateStr);
            const totalToday = invsToday.reduce((sum, i) => sum + i.amount, 0);

            const dayEl = document.createElement('div');
            dayEl.className = 'cal-day';

            // Check if today
            const now = new Date();
            if (day === now.getDate() && month === now.getMonth() && year === now.getFullYear()) {
                dayEl.classList.add('today');
            }

            if (invsToday.length > 0) {
                dayEl.classList.add('has-payments');

                // Tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'cal-tooltip';
                tooltip.innerHTML = `${invsToday.length} Pagos<br><b>${formatCurrency(totalToday)}</b>`;
                dayEl.appendChild(tooltip);

                // Dots
                const dotsContainer = document.createElement('div');
                dotsContainer.className = 'payment-dots';
                // Limit dots to avoid overflow
                const dotsCount = Math.min(invsToday.length, 5);
                for (let k = 0; k < dotsCount; k++) {
                    const dot = document.createElement('div');
                    dot.className = 'p-dot';
                    dotsContainer.appendChild(dot);
                }
                dayEl.appendChild(dotsContainer);
            }

            const num = document.createElement('span');
            num.textContent = day;
            dayEl.prepend(num); // Add number at top

            calendarGrid.appendChild(dayEl);
        }
    }

    function renderAdminCharts(invoices, year) {
        // CHART 1: Spend Trend (Line)
        const ctxTrend = document.getElementById('adminTrendChart');
        if (ctxTrend) {
            if (adminTrendChartInstance) adminTrendChartInstance.destroy();

            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            const dataByMonth = new Array(12).fill(0);

            invoices.filter(i => new Date(i.date).getFullYear() === year).forEach(inv => {
                dataByMonth[new Date(inv.date).getMonth()] += inv.amount;
            });

            adminTrendChartInstance = new Chart(ctxTrend, {
                type: 'line',
                data: {
                    labels: monthNames,
                    datasets: [{
                        label: 'Dispersión 2025',
                        data: dataByMonth,
                        borderColor: '#6366f1', // Indigo
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } } }
                }
            });
        }

        // CHART 2: Distribution (Doughnut)
        const ctxDist = document.getElementById('adminDistChart');
        if (ctxDist) {
            if (adminDistChartInstance) adminDistChartInstance.destroy();

            // Aggregate ALL TIME or THIS YEAR? Let's do THIS YEAR
            const yearInvoices = invoices.filter(i => new Date(i.date).getFullYear() === year);
            const totalSal = yearInvoices.reduce((sum, i) => sum + (i.salary || 0), 0);
            const totalComm = yearInvoices.reduce((sum, i) => sum + (i.commission || 0), 0);

            adminDistChartInstance = new Chart(ctxDist, {
                type: 'doughnut',
                data: {
                    labels: ['Salario Base', 'Comisiones'],
                    datasets: [{
                        data: [totalSal, totalComm],
                        backgroundColor: ['#3b82f6', '#10b981'], // Blue, Emerald
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#cbd5e1' } }
                    }
                }
            });
        }
    }

    function renderLeaderboard(monthInvoices) {
        adminLeaderboardList.innerHTML = '';

        // Group by User
        const userStats = {};
        monthInvoices.forEach(inv => {
            if (!userStats[inv.employeeName]) userStats[inv.employeeName] = 0;
            userStats[inv.employeeName] += (inv.commission || 0);
        });

        // Convert to Array & Sort
        const sorted = Object.entries(userStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Top 5

        const totalComms = monthInvoices.reduce((sum, i) => sum + (i.commission || 0), 0);

        sorted.forEach(([name, amount], index) => {
            if (amount === 0) return; // Skip zero commissions

            const percentage = totalComms > 0 ? (amount / totalComms) * 100 : 0;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="background: rgba(255,255,255,0.1); width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-size: 0.8rem;">
                            ${index + 1}
                        </span>
                        <span>${name}</span>
                    </div>
                </td>
                <td style="text-align: right; font-weight: bold;">${formatCurrency(amount)}</td>
                <td style="text-align: right;">
                    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem;">
                        <span style="font-size: 0.9rem; color: var(--text-muted)">${percentage.toFixed(1)}%</span>
                        <div style="width: 40px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px;">
                            <div style="width: ${percentage}%; height: 100%; background: #10b981; border-radius: 2px;"></div>
                        </div>
                    </div>
                </td>
            `;
            adminLeaderboardList.appendChild(tr);
        });
    }

    function setupEmployeeView(invoices) {
        // ENSURE DEFAULT VIEW IS VISIBLE
        defaultStatsGrid.classList.remove('hidden');
        adminStatsGrid.classList.add('hidden');
        adminChartsView.classList.add('hidden');
        adminLeaderboardView.classList.add('hidden');
        adminCalendarView.classList.add('hidden'); // Hide calendar
        document.querySelector('.dashboard-content .chart-container').classList.remove('hidden');

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
});
