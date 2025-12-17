// --- GLOBAL STATE ---
const DB = {
    users: [],
    invoices: []
};

// --- API CONFIGURATION ---
const RAW_API_URL = "https://script.google.com/macros/s/AKfycbwdgwxVuYeA16H31_9QBEVZM1FKJfGdEpQEUSgDEUi-hV6NnFZoUwFzoi5Cs0v925CC/exec";

// Resilience: Try multiple proxies
const PROXY_LIST = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://thingproxy.freeboard.io/fetch/'
];

async function fetchAPI(params) {
    const targetUrl = `${RAW_API_URL}?${params}`;

    for (const proxy of PROXY_LIST) {
        try {
            const finalUrl = proxy + encodeURIComponent(targetUrl);
            const response = await fetch(finalUrl);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const text = await response.text();

            // Try Parse JSON
            try {
                return JSON.parse(text);
            } catch (jsonError) {
                console.error(`Proxy ${proxy} returned HTML/Invalid JSON:`, text.substring(0, 100)); // Log first 100 chars
                // If it starts with <, it's likely an HTML error page (Permission or 404)
                if (text.trim().startsWith('<')) throw new Error("Recibimos HTML (Login/Error) en lugar de datos.");
                throw jsonError;
            }

        } catch (e) {
            console.warn(`Proxy ${proxy} failed:`, e.message);
            // Try next proxy
        }
    }
    throw new Error("No se pudo conectar con el servidor (Fallo en Proxies). Verifica permisos de Google Script.");
}

const DataService = {
    login: async (username, password) => {
        try {
            const result = await fetchAPI(`action=login&user=${encodeURIComponent(username)}&pass=${encodeURIComponent(password)}`);

            if (result.success) {
                // Populate DB for session use
                DB.currentUser = result.user;
                // Note: We don't have the full user list anymore (Security Feature!), just the logged user.
                // If Admin needs full list, we might need a separate 'getUsers' action for Admins later.
                // For now, let's keep it simple.

                // BACKWARDS COMPATIBILITY HACK: 
                // The app previously expected DB.users to be populated for Admin lookups.
                // We'll stick the current user in there.
                DB.users = [result.user];
                return { success: true, user: result.user };
            } else {
                throw new Error(result.message || "Credenciales incorrectas");
            }

        } catch (error) {
            console.error("Login Error:", error);
            throw error;
        }
    },

    getInvoices: async (userId) => {
        try {
            const result = await fetchAPI(`action=getInvoices&userId=${userId}`);

            if (result.success) {
                // REVERTING DATE PARSING LOGIC TO FRONTEND TO BE SAFE
                // The API sends "2025-06-15" (ISO ish)
                // We ensure it looks right in the UI

                const invoices = result.invoices.map(inv => {
                    // Ensure status is valid
                    if (!inv.status) inv.status = 'Pagado';

                    // Re-calculate items if missing (Backward compatibility)
                    if (!inv.items || inv.items.length === 0) {
                        const items = [];
                        if (inv.salary > 0) items.push({ desc: "Bi-weekly Period", amount: inv.salary });
                        if (inv.commission > 0) items.push({ desc: "Commissions", amount: inv.commission });
                        inv.items = items;
                    }
                    return inv;
                });

                DB.invoices = invoices;
                return invoices;
            } else {
                throw new Error(result.message || "No se pudieron cargar los datos");
            }

        } catch (error) {
            console.error("Fetch Invoices Error:", error);
            throw error;
        }
    }
};
