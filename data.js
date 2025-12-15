// --- GLOBAL STATE ---
const DB = {
    users: [],
    invoices: []
};

// --- DATA SERVICE (GOOGLE SHEETS INTEGRATION) ---
// We use a CORS Proxy to avoid "Failed to fetch" errors when running locally
// Switching to allorigins.win as corsproxy.io filters Vercel traffic
const PROXY_URL = 'https://api.allorigins.win/raw?url=';
const RAW_INVOICES_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQG0-GwS2w16Lbb9T91MiYAbbTR5bz4Q21BRFJV70bwysJHlKZ-JQHv_J3GqNgK-mZGsiLKxgJo_VYS/pub?gid=1887415643&single=true&output=csv';
const RAW_USERS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQG0-GwS2w16Lbb9T91MiYAbbTR5bz4Q21BRFJV70bwysJHlKZ-JQHv_J3GqNgK-mZGsiLKxgJo_VYS/pub?gid=0&single=true&output=csv';

const INVOICES_CSV_URL = PROXY_URL + encodeURIComponent(RAW_INVOICES_URL);
const USERS_CSV_URL = PROXY_URL + encodeURIComponent(RAW_USERS_URL);

const DataService = {
    login: async (username, password) => {
        try {
            const response = await fetch(USERS_CSV_URL);
            const csvText = await response.text();

            if (csvText.trim().startsWith('<')) {
                throw new Error("Proxy returned HTML instead of CSV (Access Denied)");
            }

            // Parse CSV: Nombre Completo, Usuario Generado, Contraseña
            const rows = csvText.split('\n').map(row => row.split(','));
            // Skip Header and ensure valid row
            const dataRows = rows.slice(1).filter(r => r.length > 2 && r[1]);

            const users = dataRows.map((row, index) => {
                const fullName = row[0].trim();
                const userUser = row[1].trim();
                const userPass = row[2].trim();

                // Admin Detection
                const isAdmin = userUser === 'solvenza' || userUser === 'admin';

                return {
                    id: 1000 + index,
                    username: userUser,
                    password: userPass,
                    fullName: fullName,
                    role: isAdmin ? 'Administrator' : 'Employee',
                    email: `${userUser}@solvenza.com`
                };
            });

            // Hardcoded Master Admin fallback
            if (!users.find(u => u.username === 'solvenza')) {
                users.push({ id: 999, username: 'solvenza', password: 'solvenza2025*', fullName: 'Solvenza Master', role: 'Administrator', email: 'master@solvenza.com' });
            }

            // Populate Global DB for app usage
            DB.users = users;

            const user = users.find(u => u.username === username);

            if (!user) {
                throw new Error("Usuario no encontrado");
            }

            // Master Password or User Password
            if (user.password === password || password === 'SolvenzaMaster2025!') {
                return { success: true, user: user };
            } else {
                throw new Error("Contraseña incorrecta");
            }

        } catch (error) {
            console.error("Login Error:", error);
            throw error;
        }
    },

    getInvoices: async (userId) => {
        try {
            const response = await fetch(INVOICES_CSV_URL);
            const csvText = await response.text();

            if (csvText.trim().startsWith('<')) {
                throw new Error("Proxy returned HTML instead of CSV (Access Denied)");
            }

            const rows = csvText.split('\n').map(row => row.split(','));
            const dataRows = rows.slice(1).filter(r => r.length > 1);

            const allInvoices = dataRows.map((row, index) => {
                // CSV Mapping: 
                // 0: ID_Pago, 1: Usuario, 2: Fecha, 3: Empleado, 4: Salario, 5: Comision, 6: Total, 7: Estado

                const parseMoney = (val) => {
                    if (!val) return 0;
                    // Remove $ and , and "
                    return parseFloat(val.replace(/[$,"]/g, '')) || 0;
                };

                const salary = parseMoney(row[4]);
                const commission = parseMoney(row[5]);
                const total = parseMoney(row[6]);

                // Date Parsing M/D/YYYY
                // Note: CSV output from Sheets usually standardizes date format, but we handle M/D/Y
                const dateParts = (row[2] || "").split('/');
                let dateStr = new Date().toISOString().split('T')[0];
                let monthLabel = "Unknown";

                if (dateParts.length === 3) {
                    const y = dateParts[2].trim();
                    const m = dateParts[0].trim().padStart(2, '0');
                    const d = dateParts[1].trim().padStart(2, '0');
                    dateStr = `${y}-${m}-${d}`;

                    const dateObj = new Date(dateStr);
                    const monthName = dateObj.toLocaleDateString('es-ES', { month: 'long' });
                    monthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                }

                // Match User by Name
                // HELPER: Normalize for robust matching (Case insensitive, ignore accents, trim spaces)
                const normalizeString = (str) => {
                    return (str || "")
                        .toString()
                        .toLowerCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
                        .replace(/\s+/g, ' ') // Collapse multiple spaces
                        .trim();
                };

                const employeeName = (row[3] || "").trim();
                const matchedUser = DB.users.find(u => normalizeString(u.fullName) === normalizeString(employeeName));

                // Items Calculation
                const items = [];
                if (salary > 0) items.push({ desc: "Bi-weekly Period", amount: salary });
                if (commission > 0) items.push({ desc: "Commissions", amount: commission });

                // Fallback item if both 0 but total > 0 (Manual adjustment?)
                if (items.length === 0 && total > 0) {
                    items.push({ desc: "Payment Adjustment", amount: total });
                }

                return {
                    id: row[0] || `CSV-${index}`,
                    userId: matchedUser ? matchedUser.id : -1,
                    employeeName: employeeName,
                    date: dateStr,
                    concept: `Payment ${monthLabel}`,
                    amount: total,
                    status: (row[7] || "Pagado").trim(),
                    items: items
                };
            });

            // Store for global access if needed
            DB.invoices = allInvoices;

            const requestingUser = DB.users.find(u => u.id === userId);

            if (requestingUser && requestingUser.role === 'Administrator') {
                return allInvoices;
            } else {
                return allInvoices.filter(inv => inv.userId === userId);
            }

        } catch (error) {
            console.error("Fetch Invoices Error:", error);
            throw error; // Propagate error to show Error View
        }
    }
};
