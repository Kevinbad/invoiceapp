// --- CONFIGURACIÓN ---
// Nombres EXACTOS de las pestañas en tu Google Sheet
const SHEET_USERS = "credenciales";
const SHEET_INVOICES = "Pagos";

// ------------------------------------------------------------------

function doGet(e) {
  const action = e.parameter.action;
  
  // CORS Headers para permitir acceso desde cualquier sitio
  const headers = {
    "Access-Control-Allow-Origin": "*"
  };
  
  try {
    if (action === 'login') {
      return responseJSON(handleLogin(e.parameter.user, e.parameter.pass));
    } 
    else if (action === 'getInvoices') {
      return responseJSON(getInvoices(e.parameter.userId));
    }
    else {
      return responseJSON({ success: false, message: "Acción no válida" });
    }
  } catch (error) {
    return responseJSON({ success: false, message: error.toString() });
  }
}

// --- LÓGICA DE LOGIN ---
function handleLogin(username, password) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  if (!sheet) throw new Error(`No se encontró la pestaña "${SHEET_USERS}"`);
  
  const data = sheet.getDataRange().getValues(); 
  // ASUMIMOS ESTRUCTURA CSV (data.js):
  // Col 0: Nombre Completo
  // Col 1: Usuario
  // Col 2: Contraseña
  
  // Empezamos en 1 para saltar encabezados
  for (let i = 1; i < data.length; i++) {
    const rowName = data[i][0];
    const rowUser = data[i][1];
    const rowPass = data[i][2];
    
    // Normalizar strings para evitar errores de espacios
    if (String(rowUser).trim() === String(username).trim() && String(rowPass).trim() === String(password).trim()) {
      
      const isAdmin = (rowUser === 'solvenza' || rowUser === 'admin');
      
      return {
        success: true,
        user: {
          id: 1000 + i, // Generamos ID basado en fila igual que en data.js
          username: rowUser,
          fullName: rowName,
          role: isAdmin ? 'Administrator' : 'Employee'
        }
      };
    }
  }
  
  return { success: false, message: "Usuario o contraseña incorrectos" };
}

// --- LÓGICA DE FACTURAS ---
function getInvoices(userId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_INVOICES);
  if (!sheet) throw new Error(`No se encontró la pestaña "${SHEET_INVOICES}"`);
  
  const data = sheet.getDataRange().getDisplayValues(); // Usar DisplayValues para mantener formato fecha
  // ASUMIMOS ESTRUCTURA CSV (data.js):
  // Col 0: ID_Pago
  // Col 1: Fecha (MM/DD/YYYY)
  // Col 2: Empleado (Nombre)
  // Col 3: Salario
  // Col 4: Comision
  // Col 5: Total
  // Col 6: Estado
  
  const invoices = [];
  const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  const usersData = usersSheet.getDataRange().getValues();
  
  // Buscar al usuario solicitante para saber si es Admin
  // (En una app real validaríamos un token de sesión, aquí confiamos en el ID enviado)
  let isAdmin = false;
  let requestUserName = "";
  
  // Buscar usuario por ID (reversa de 1000 + i)
  const userRowIndex = parseInt(userId) - 1000;
  if (userRowIndex > 0 && userRowIndex < usersData.length) {
     const uUser = usersData[userRowIndex][1];
     if (uUser === 'solvenza' || uUser === 'admin') isAdmin = true;
     requestUserName = usersData[userRowIndex][0]; // Nombre completo
  }
  
  // Hardcoded Master
  if (userId == 999) isAdmin = true;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row.length < 2) continue; // Fila vacía
    
    const empName = row[2];
    
    // FILTRADO:
    // Si es Admin -> Ve todo
    // Si es Empleado -> Solo ve si su nombre coincide (Fuzzy Match como en data.js)
    let isMatch = false;
    if (isAdmin) {
      isMatch = true;
    } else {
      // Comparar nombre del empleado en la fila con nombre del usuario
      const normEmp = String(empName).toLowerCase().replace(/\s/g, '');
      const normUser = String(requestUserName).toLowerCase().replace(/\s/g, '');
      if (normEmp.includes(normUser) || normUser.includes(normEmp)) {
        isMatch = true;
      }
    }
    
    if (isMatch) {
       // Parsear montos (quitar $ y ,)
       const cleanMoney = (val) => parseFloat(String(val).replace(/[$,]/g, '')) || 0;
       
       const salary = cleanMoney(row[3]);
       const commission = cleanMoney(row[4]);
       const total = cleanMoney(row[5]);
       
       // Items
       const items = [];
       if (salary > 0) items.push({ desc: "Bi-weekly Period", amount: salary });
       if (commission > 0) items.push({ desc: "Commissions", amount: commission });
       
       invoices.push({
         id: row[0],
         userId: userId, // Mantenemos el ID del que lo pide para compatibilidad
         employeeName: empName,
         date: formatDateISO(row[1]), // Convertir a YYYY-MM-DD
         salary: salary,
         commission: commission,
         amount: total,
         status: row[6] || "Pagado",
         items: items,
         concept: `Payment ${getMonthName(row[1])}`
       });
    }
  }
  
  return { success: true, invoices: invoices };
}

// --- HELPERS ---
function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatDateISO(dateStr) {
  // Input: 6/15/2025 (US) or 15/6/2025? Sheets usually gives what represents the cell.
  // Asumamos M/D/YYYY por data.js
  if (!dateStr) return "";
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
  }
  return dateStr;
}

function getMonthName(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split('/');
  const date = new Date(parts[2], parts[0]-1, parts[1]);
  const month = date.toLocaleString('es-ES', { month: 'long' });
  return month.charAt(0).toUpperCase() + month.slice(1);
}
