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
            statValues.forEach(el => el.classList.remove('skeleton'));

            renderInvoices(invoices);

            // Determine Context (Admin vs Employee)
            if (user.role === 'Administrator') {
                setupAdminView(invoices);
            } else {
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
        // Change Labels
        document.querySelector('.stat-card .stat-icon.income').nextElementSibling.querySelector('h3').textContent = "Total Dispersado";
        document.querySelector('.stat-card .stat-icon.bonus').nextElementSibling.querySelector('h3').textContent = "Pagos del Mes";
        document.querySelector('.dashboard-header h2').textContent = `Hola, ${currentUser.fullName}`; // Show full name for Admin

        // 1. Total All Time
        const totalPaid = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        lastPayAmount.textContent = formatCurrency(totalPaid);

        // 2. Total This Month
        const currentMonthIndex = new Date().getMonth(); // 0-11
        const totalMonth = invoices.filter(inv => {
            const d = new Date(inv.date);
            return d.getMonth() === currentMonthIndex; // Simple check, ignores year for simplicity or needs robust check
        }).reduce((sum, inv) => sum + inv.amount, 0);

        // Use the second card for Monthly Total instead of "Commissions"
        commissionAmount.textContent = formatCurrency(totalMonth);

        // Show Download Button
        const btnReport = document.getElementById('btn-month-report');
        if (btnReport) {
            btnReport.classList.remove('hidden');
            // Remove old listener to avoid duplicates if re-rendering
            const newBtn = btnReport.cloneNode(true);
            btnReport.parentNode.replaceChild(newBtn, btnReport);

            newBtn.addEventListener('click', () => {
                generateMonthlyReport(invoices);
            });
        }
    }

    function setupEmployeeView(invoices) {
        // Reset Labels
        document.querySelector('.stat-card .stat-icon.income').nextElementSibling.querySelector('h3').textContent = "Total Salario"; // More accurate
        document.querySelector('.stat-card .stat-icon.bonus').nextElementSibling.querySelector('h3').textContent = "Total Comisiones";

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
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null); // Fail gracefully
            // Cache Busting: Force new image load
            img.src = url + '?t=' + new Date().getTime();
        });
    };

    window.generatePDF = async (invoiceId) => {
        const { jsPDF } = window.jspdf;
        const inv = DB.invoices.find(i => i.id === invoiceId);
        if (!inv) return;

        // Load Logo
        const logoData = await loadImageBase64('IMG/logo2.jpg');

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
                // x=10, y=5, w=40, h=40 (approx)
                doc.addImage(logoData, 'JPEG', 10, 5, 40, 40, undefined, 'FAST');
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

        // Context Message (Adjusted Y position since email is gone)
        doc.setTextColor(100, 116, 139);
        doc.text(`Payment for the month of ${monthName} ${year}`, 20, 75); // Moved up from 82

        // 4. Line Items Table
        let y = 90; // Moved up slightly

        // Header Bar
        doc.setFillColor(99, 102, 241); // Indigo
        doc.rect(20, y - 6, 170, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text("DESCRIPTION", 25, y);
        doc.text("AMOUNT", 185, y, { align: 'right' });

        // Items
        y += 15;
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');

        inv.items.forEach(item => {
            doc.text(item.desc, 25, y);
            doc.text(formatCurrency(item.amount), 185, y, { align: 'right' });
            y += 10;
        });

        // 5. Total
        y += 10;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, y, 190, y);
        y += 10;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("TOTAL PAID", 130, y, { align: 'right' });
        doc.setTextColor(99, 102, 241);
        doc.text(formatCurrency(inv.amount), 185, y, { align: 'right' });

        // 6. Signatures REMOVED per user request

        // Save
        doc.save(`Solvenza_Receipt_${inv.id}.pdf`);
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
