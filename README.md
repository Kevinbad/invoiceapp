# Solvenza Hub - Employee Portal

A modern, lightweight employee portal for viewing payment history, commissions, and downloading PDF receipts.

## Features
- **Live Data**: Fetches "Users" and "Invoices" directly from Google Sheets (CSV).
- **PDF Generation**: Auto-generates professional payment receipts in client-side JavaScript.
- **Role-Based Access**:
  - **Admin**: Views global stats and all invoices.
  - **Employee**: Views only personal payment history.
- **Real-time UX**: Skeleton loaders, error handling, and responsive design.

## Tech Stack
- **Core**: Vanilla HTML5, CSS3, JavaScript (ES6+).
- **PDF Engine**: `jspdf` & `jspdf-autotable`.
- **Charts**: `Chart.js`.
- **Icons**: Phosphor Icons.
- **Backend**: Google Sheets (Publish to Web Mode).

## Deployment
This project is static and ready for Vercel, Netlify, or GitHub Pages.
1. Connect Repository.
2. Deploy.
No build command required.
