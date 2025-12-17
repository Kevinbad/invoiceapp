// --- GLOBAL STATE ---
const DB = {
    users: [],
    invoices: []
};

// --- API CONFIGURATION ---
// Note: We use a CORS Proxy to avoid "Failed to fetch" errors when running correctly from local "file://"
const RAW_API_URL = "https://script.google.com/macros/s/AKfycbwdgwxVuYeA16H31_9QBEVZM1FKJfGdEpQEUSgDEUi-hV6NnFZoUwFzoi5Cs0v925CC/exec";
const PROXY_URL = "https://corsproxy.io/?";

const DataService = {
    login: async (username, password) => {
        try {
            // Secure Login via Backend
            // Construct the target URL
            const targetUrl = `${RAW_API_URL}?action=login&user=${encodeURIComponent(username)}&pass=${encodeURIComponent(password)}`;

            // Wrap with Proxy
            const finalUrl = PROXY_URL + encodeURIComponent(targetUrl);

            const response = await fetch(finalUrl);

            if (!response.ok) throw new Error("Error de conexión al servidor");

            const result = await response.json();

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
            const targetUrl = `${RAW_API_URL}?action=getInvoices&userId=${userId}`;
            const finalUrl = PROXY_URL + encodeURIComponent(targetUrl);

            const response = await fetch(finalUrl);

            if (!response.ok) throw new Error("Error al obtener facturas");

            const result = await response.json();

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
