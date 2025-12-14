/* MOCK DATA LAYER
 * In the future, this will be replaced by a fetch() call to Google Sheets.
 */

// MASTER PASSWORD (Allows admin access to ANY account)
const MASTER_PASSWORD = "SolvenzaMaster2025!";

const DB = {
    // We will populate this array when you provide the employee list
    users: [
        { id: 100, username: "admin", password: "admin123", fullName: "Administrador", role: "Administrator", email: "admin@solvenza.com" },
        { id: 1, username: "alvaro.nino", password: "Alvaro@N2025!", fullName: "Alvaro Andrés Niño Lizcano", role: "Employee", email: "" },
        { id: 2, username: "bryan.barros", password: "Bryan@B2025!", fullName: "Bryan Andrés Barros del Duca", role: "Employee", email: "" },
        { id: 3, username: "camila.barrera", password: "Camila@B2025!", fullName: "Camila Andrea Barrera Campo", role: "Employee", email: "" },
        { id: 4, username: "daniela.bohorquez", password: "Daniela@B2025!", fullName: "Daniela Fernanda Bohórquez Castellanos", role: "Employee", email: "" },
        { id: 5, username: "deisy.monsalve", password: "Deisy@M2025!", fullName: "Deisy Carolina monsalve Hernández", role: "Employee", email: "" },
        { id: 6, username: "diego.afanador", password: "Diego@A2025!", fullName: "Diego afanador Sandoval", role: "Employee", email: "" },
        { id: 7, username: "erika.rodriguez", password: "Erika@R2025!", fullName: "Erika Liliana Rodríguez Serrano", role: "Employee", email: "" },
        { id: 8, username: "harold.cuberos", password: "Harold@C2025!", fullName: "Harold Armando Cuberos Del Duca", role: "Employee", email: "" },
        { id: 9, username: "jaibelis.gonzalez", password: "Jaibelis@G2025!", fullName: "Jaibelis Gabriela Gonzalez miquilena", role: "Employee", email: "" },
        { id: 10, username: "johan.solano", password: "Johan@S2025!", fullName: "JOHAN SMYAKELL SOLANO R", role: "Employee", email: "" },
        { id: 11, username: "jose.brest", password: "Jose@B2025!", fullName: "Jose Alcides Brest", role: "Employee", email: "" },
        { id: 12, username: "juan.castillo", password: "Juan@C2025!", fullName: "Juan Carlos Castillo", role: "Employee", email: "" },
        { id: 13, username: "juan.gutierrez", password: "Juan@G2025!", fullName: "Juan Carlos Gutiérrez Cáceres", role: "Employee", email: "" },
        { id: 14, username: "juan.bayona", password: "Juan@B2025!", fullName: "Juan David Bayona Serrano", role: "Employee", email: "" },
        { id: 15, username: "juana.trujillo", password: "Juana@T2025!", fullName: "Juana Luna Trujillo Benítez", role: "Employee", email: "" },
        { id: 16, username: "laura.molano", password: "Laura@M2025!", fullName: "Laura Jimena Molano Castillo", role: "Employee", email: "" },
        { id: 17, username: "lesly.demey", password: "Lesly@D2025!", fullName: "Lesly Gabriela Demey Rincon", role: "Employee", email: "" },
        { id: 18, username: "luis.labastida", password: "Luis@L2025!", fullName: "Luis Gabriel Labastida Velázquez", role: "Employee", email: "" },
        { id: 19, username: "monica.galvis", password: "Monica@G2025!", fullName: "Mónica Elizabeth Galvis García", role: "Employee", email: "" },
        { id: 20, username: "nelly.puerto", password: "Nelly@P2025!", fullName: "Nelly del Carmen Puerto Fonseca", role: "Employee", email: "" },
        { id: 21, username: "nicolas.diaz", password: "Nicolas@D2025!", fullName: "Nicolás David Díaz Zambrano", role: "Employee", email: "" },
        { id: 22, username: "nilian.sajonero", password: "Nilian@S2025!", fullName: "Nilian Daniela Sajonero Fonseca", role: "Employee", email: "" },
        { id: 23, username: "richard.cuberos", password: "Richard@C2025!", fullName: "Richard Armando Cuberos del Duca", role: "Employee", email: "" },
        { id: 24, username: "sergio.carreno", password: "Sergio@C2025!", fullName: "Sergio Andres Carreño Chacon", role: "Employee", email: "" },
        { id: 25, username: "sergio.castillo", password: "Sergio@C2025!", fullName: "Sergio Enrique Castillo Fandiño", role: "Employee", email: "" },
        { id: 26, username: "sheyla.sarmiento", password: "Sheyla@S2025!", fullName: "Sheyla Gabriela Sarmiento Paez", role: "Employee", email: "" },
        { id: 27, username: "susan.castro", password: "Susan@C2025!", fullName: "Susan Lorena castro diaz", role: "Employee", email: "" },
        { id: 28, username: "vilma.bedoya", password: "Vilma@B2025!", fullName: "Vilma Dahiana Bedoya Bahamón", role: "Employee", email: "" },
        { id: 29, username: "yineth.castro", password: "Yineth@C2025!", fullName: "Yineth Natalia Castro", role: "Employee", email: "" },
        { id: 30, username: "paula.puerto", password: "Paula@P2025!", fullName: "Paula Natalia Puerto Lara", role: "Employee", email: "" },
        { id: 31, username: "daniel.sira", password: "Daniel@S2025!", fullName: "Daniel Alejandro Sira", role: "Employee", email: "" },
        { id: 32, username: "stephany.garzon", password: "Stephany@G2025!", fullName: "Stephany Garzón Ardila", role: "Employee", email: "" },
        { id: 33, username: "luis.bohorquez", password: "Luis@B2025!", fullName: "Luis Jeronimo Bohórquez", role: "Employee", email: "" },
        { id: 34, username: "jesus.verde", password: "Jesus@V2025!", fullName: "Jesús Manuel Verde Campos", role: "Employee", email: "" },
        { id: 35, username: "karoll.estupinan", password: "Karoll@E2025!", fullName: "Karoll Eliana Estupiñan", role: "Employee", email: "" },
        { id: 36, username: "david.bohorquez", password: "David@B2025!", fullName: "David Bohorquez", role: "Employee", email: "" },
        { id: 37, username: "arlidis.burgos", password: "Arlidis@B2025!", fullName: "Arlidis Burgos", role: "Employee", email: "" },
        { id: 38, username: "daniel.puerto", password: "Daniel@P2025!", fullName: "Daniel Puerto", role: "Employee", email: "" },
        { id: 39, username: "samir.nino", password: "Samir@N2025!", fullName: "Samir Arley Niño Lizcano", role: "Employee", email: "" },
        { id: 40, username: "jose.celis", password: "Jose@C2025!", fullName: "Jose Luis Celis Guevara", role: "Employee", email: "" },
        { id: 41, username: "silvia.guerra", password: "Silvia@G2025!", fullName: "SILVIA MARCELA GUERRA ORTIZ", role: "Employee", email: "" },
        { id: 42, username: "guillermo.orjuela", password: "Guillermo@O2025!", fullName: "Guillermo Orjuela", role: "Employee", email: "" },
        { id: 43, username: "sandra.castro", password: "Sandra@C2025!", fullName: "Sandra Castro", role: "Employee", email: "" },
        { id: 44, username: "monica.pinzon", password: "Monica@P2025!", fullName: "Monica Pinzon Vasquez", role: "Employee", email: "" },
        { id: 45, username: "anderson.quintero", password: "Anderson@Q2025!", fullName: "Anderson Jesus Quintero Contreras", role: "Employee", email: "" },
        { id: 46, username: "yesika.padilla", password: "Yesika@P2025!", fullName: "Yesika Padilla", role: "Employee", email: "" },
        { id: 47, username: "tatiana.parra", password: "Tatiana@P2025!", fullName: "Tatiana Parra", role: "Employee", email: "" },
        { id: 48, username: "luis.campos", password: "Luis@C2025!", fullName: "Luis Gerardo Campos Silva", role: "Employee", email: "" },
        { id: 49, username: "laura.lechuga", password: "Laura@L2025!", fullName: "Laura Lechuga", role: "Employee", email: "" },
        { id: 50, username: "diego.pedraza", password: "Diego@P2025!", fullName: "Diego pedraza", role: "Employee", email: "" },
        { id: 51, username: "camila.pedraza", password: "Camila@P2025!", fullName: "Camila Pedraza", role: "Employee", email: "" },
        { id: 52, username: "ester.del", password: "Ester@D2025!", fullName: "Ester Del Duca", role: "Employee", email: "" },
        { id: 53, username: "gustavo.cardozo", password: "Gustavo@C2025!", fullName: "Gustavo Cardozo", role: "Employee", email: "" },
        { id: 54, username: "karen.garcia", password: "Karen@G2025!", fullName: "Karen sofia garcia", role: "Employee", email: "" },
        { id: 55, username: "ivan.gama", password: "Ivan@G2025!", fullName: "Ivan Gama Serrano", role: "Employee", email: "" },
        { id: 56, username: "luis.mercado", password: "Luis@M2025!", fullName: "Luis Mercado", role: "Employee", email: "" },
        { id: 57, username: "jeyner.diaz", password: "Jeyner@D2025!", fullName: "Jeyner Diaz", role: "Employee", email: "" },
        { id: 58, username: "juan.flores", password: "Juan@F2025!", fullName: "Juan flores", role: "Employee", email: "" },
        { id: 59, username: "kevin.barros", password: "Kevin@B2025!", fullName: "Kevin Barros", role: "Employee", email: "" },
        { id: 60, username: "cindy.daza", password: "Cindy@D2025!", fullName: "Cindy Daza", role: "Employee", email: "" },
        { id: 61, username: "diana.burgos", password: "Diana@D2025!", fullName: "Diana Burgos", role: "Employee", email: "" },
        { id: 62, username: "cristian.pita", password: "Cristian@P2025!", fullName: "Cristian Pita", role: "Employee", email: "" },
        { id: 63, username: "edith.bernal", password: "Edith@B2025!", fullName: "Edith Johana Bernal", role: "Employee", email: "" },
        { id: 64, username: "tatiana.lechuga", password: "Tatiana@L2025!", fullName: "Tatiana Lechuga", role: "Employee", email: "" },
        // New Users from Practice Data
        { id: 65, username: "alina.ramirez", password: "Alina@R2025!", fullName: "Alina Ramirez", role: "Employee", email: "" },
        { id: 66, username: "maria.camila.pedraza", password: "Maria@P2025!", fullName: "Maria Camila Pedraza", role: "Employee", email: "" },
        { id: 67, username: "christian.cuzma", password: "Christian@C2025!", fullName: "Christian Cuzma", role: "Employee", email: "" }
    ],
    // Practice Invoices
    invoices: [
        // ABRIL
        { id: "INV-2025-04-30-001", userId: 49, date: "2025-04-30", concept: "Pago Abril", amount: 600.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 600.00 }] }, // laura.lechuga
        { id: "INV-2025-04-30-002", userId: 50, date: "2025-04-30", concept: "Pago Abril", amount: 600.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 600.00 }] }, // diego.pedraza
        { id: "INV-2025-04-30-003", userId: 65, date: "2025-04-30", concept: "Pago Abril", amount: 400.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 400.00 }] }, // alina.ramirez
        { id: "INV-2025-04-30-004", userId: 66, date: "2025-04-30", concept: "Pago Abril", amount: 350.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 350.00 }] }, // maria.camila.pedraza
        { id: "INV-2025-04-30-005", userId: 67, date: "2025-04-30", concept: "Pago Abril", amount: 1000.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 1000.00 }] }, // christian.cuzma
        { id: "INV-2025-04-30-006", userId: 60, date: "2025-04-30", concept: "Pago Abril", amount: 400.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 400.00 }] }, // cindy.daza

        // MAYO
        { id: "INV-2025-05-15-001", userId: 49, date: "2025-05-15", concept: "Pago Mayo (Q1)", amount: 600.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 600.00 }] },
        { id: "INV-2025-05-15-002", userId: 50, date: "2025-05-15", concept: "Pago Mayo (Q1)", amount: 730.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 730.00 }] },
        { id: "INV-2025-05-15-003", userId: 65, date: "2025-05-15", concept: "Pago Mayo (Q1)", amount: 400.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 400.00 }] },
        { id: "INV-2025-05-15-004", userId: 66, date: "2025-05-15", concept: "Pago Mayo (Q1)", amount: 350.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 350.00 }] },

        { id: "INV-2025-05-30-001", userId: 49, date: "2025-05-30", concept: "Pago Mayo (Q2)", amount: 700.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 700.00 }] },
        { id: "INV-2025-05-30-002", userId: 50, date: "2025-05-30", concept: "Pago Mayo (Q2)", amount: 700.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 700.00 }] },
        { id: "INV-2025-05-30-003", userId: 65, date: "2025-05-30", concept: "Pago Mayo (Q2)", amount: 400.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 400.00 }] },

        // JUNIO
        { id: "INV-2025-06-15-001", userId: 49, date: "2025-06-15", concept: "Pago Junio (Q1)", amount: 700.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 700.00 }] },
        { id: "INV-2025-06-15-002", userId: 50, date: "2025-06-15", concept: "Pago Junio (Q1)", amount: 750.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 750.00 }] },
        { id: "INV-2025-06-15-003", userId: 65, date: "2025-06-15", concept: "Pago Junio (Q1)", amount: 400.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 400.00 }] },

        { id: "INV-2025-06-30-001", userId: 49, date: "2025-06-30", concept: "Pago Junio (Q2)", amount: 700.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 700.00 }] },
        { id: "INV-2025-06-30-002", userId: 50, date: "2025-06-30", concept: "Pago Junio (Q2)", amount: 750.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 750.00 }] },

        // JULIO
        { id: "INV-2025-07-15-001", userId: 49, date: "2025-07-15", concept: "Pago Julio (Q1)", amount: 700.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 700.00 }] },
        { id: "INV-2025-07-15-002", userId: 50, date: "2025-07-15", concept: "Pago Julio (Q1)", amount: 750.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 750.00 }] },

        { id: "INV-2025-07-30-001", userId: 49, date: "2025-07-30", concept: "Pago Julio (Q2)", amount: 700.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 700.00 }] },
        { id: "INV-2025-07-30-002", userId: 50, date: "2025-07-30", concept: "Pago Julio (Q2)", amount: 750.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 750.00 }] },

        // AGOSTO
        { id: "INV-2025-08-15-001", userId: 49, date: "2025-08-15", concept: "Pago Agosto (Q1)", amount: 700.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 700.00 }] },
        { id: "INV-2025-08-15-002", userId: 50, date: "2025-08-15", concept: "Pago Agosto (Q1)", amount: 750.00, status: "Pagado", items: [{ desc: "Honorarios", amount: 750.00 }] }
    ]
};

// Simulate Data Fetching Service
const DataService = {
    login: (username, password) => {
        return new Promise((resolve, reject) => {
            // Simulate network delay
            setTimeout(() => {
                const user = DB.users.find(u => u.username === username);

                if (!user) {
                    reject({ success: false, message: "Usuario no encontrado" });
                    return;
                }

                // Check Password OR Master Password
                if (user.password === password || password === MASTER_PASSWORD) {
                    resolve({ success: true, user: user });
                } else {
                    reject({ success: false, message: "Contraseña incorrecta" });
                }
            }, 800);
        });
    },

    getInvoices: (userId) => {
        return new Promise((resolve) => {
            const invoices = DB.invoices.filter(inv => inv.userId === userId);
            // Sort by date desc
            invoices.sort((a, b) => new Date(b.date) - new Date(a.date));
            resolve(invoices);
        });
    }
};
