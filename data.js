// --- GLOBAL STATE ---
const DB = {
    users: [],
    invoices: []
};

// --- DATA SERVICE (GOOGLE SHEETS INTEGRATION) ---
// Resilience: Try multiple proxies if one fails (Vercel IP blocking)
const PROXY_LIST = [
    'https://corsproxy.io/?',                         // Fast, usually works
    'https://api.allorigins.win/raw?url=',            // Backup 1
    'https://thingproxy.freeboard.io/fetch/'          // Backup 2
];

// USER PROVIDED ID: 1DN1xCFMW5Ol4TvYa77VNLkxQjR0Z2Fam8w0rIy5Q-kE
// Using /export format for direct access (Requires "Anyone with link can view")
const SPREADSHEET_ID = '1DN1xCFMW5Ol4TvYa77VNLkxQjR0Z2Fam8w0rIy5Q-kE';
const RAW_INVOICES_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=1887415643`;
const RAW_USERS_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`;

// Helper: Try proxies sequentially
async function fetchCSV(googleUrl) {
    // Cache Busting: Unique timestamp
    const timestamp = `&_t=${Date.now()}`;

    for (const proxy of PROXY_LIST) {
        try {
            // Append timestamp to Google URL to force fresh data from Sheet
            const url = proxy + encodeURIComponent(googleUrl + timestamp);
            const response = await fetch(url);

            // Validate HTTP Status
            if (!response.ok) throw new Error(`Status ${response.status}`);

            const text = await response.text();

            // Validate Content (Detect HTML errors like "Access Denied")
            if (text.trim().startsWith('<') || text.includes('DOCTYPE')) {
                throw new Error("Proxy returned HTML error");
            }

            return text; // Success!

        } catch (e) {
            console.warn(`Proxy ${proxy} failed:`, e);
            // Continue to next proxy
        }
    }
    throw new Error("All proxies failed to fetch data.");
}

// Helper: Parse CSV Row handling quoted commas (e.g. "$1,020")
function parseCSVRow(str) {
    const arr = [];
    let quote = false;
    let start = 0;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '"') quote = !quote;
        else if (str[i] === ',' && !quote) {
            arr.push(str.slice(start, i));
            start = i + 1;
        }
    }
    arr.push(str.slice(start));
    return arr;
}

const DataService = {
    login: async (username, password) => {
        try {
            // Use Fallback Fetch
            const csvText = await fetchCSV(RAW_USERS_URL);

            // Parse CSV: Nombre Completo, Usuario Generado, Contraseña
            const rows = csvText.split('\n').map(row => parseCSVRow(row));
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
                    email: `${userUser}@solvenza.com`,
                    project: (row[4] || "General").trim() // Capture Project from Column 5 (Index 4)
                };
            });

            // Master Admin fallback REMOVED for security


            // Populate Global DB for app usage
            DB.users = users;

            const user = users.find(u => u.username === username);

            if (!user) {
                throw new Error("Usuario no encontrado");
            }

            // Master Password or User Password
            if (user.password === password) {
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
            const csvText = await fetchCSV(RAW_INVOICES_URL);

            const rows = csvText.split('\n').map(row => parseCSVRow(row));
            const dataRows = rows.slice(1).filter(r => r.length > 1);

            const allInvoices = dataRows.map((row, index) => {
                // CSV Mapping Corrected (Verified via direct export): 
                // 0: ID_Pago, 1: Fecha, 2: Empleado, 3: Salario, 4: Comision, 5: Total, 6: Estado

                const parseMoney = (val) => {
                    if (!val) return 0;
                    // Remove $ and , and "
                    return parseFloat(val.replace(/[$,"]/g, '')) || 0;
                };

                const salary = parseMoney(row[3]);
                const commission = parseMoney(row[4]);
                const total = parseMoney(row[5]);

                // Date Parsing M/D/YYYY from Index 1
                // Note: CSV output from Sheets usually standardizes date format, but we handle M/D/Y
                const dateParts = (row[1] || "").split('/');
                let dateStr = new Date().toISOString().split('T')[0];
                let monthLabel = "Unknown";

                if (dateParts.length === 3) {
                    const m = dateParts[0].trim().padStart(2, '0');
                    const d = dateParts[1].trim().padStart(2, '0');
                    const y = dateParts[2].trim();
                    // Check if format is DD/MM/YYYY vs MM/DD/YYYY? 
                    // Example in chunk: "6/15/2025" -> Month 6 (June). So MM/DD/YYYY.
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

                const employeeName = (row[2] || "").trim();

                // FUZZY MATCH: Check strict equality OR containment (e.g. "Kevin" matches "Kevin Barros")
                const matchedUser = DB.users.find(u => {
                    const uName = normalizeString(u.fullName);
                    const iName = normalizeString(employeeName);
                    return uName === iName || uName.includes(iName) || iName.includes(uName);
                });

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
                    project: matchedUser ? matchedUser.project : "Unknown", // Attach Project
                    date: dateStr,
                    concept: `Payment ${monthLabel}`,
                    salary: salary,
                    commission: commission,
                    amount: total,
                    status: (row[6] || "Pagado").trim(),
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
