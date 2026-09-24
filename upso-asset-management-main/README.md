# UPSO-1 Integrated IT Asset Inventory & Service Request Management System

A full-stack web application designed for UPSO-1 IT asset inventory, location mapping, and service request lifecycle management.

---

## ⚡ Quick Start (Single-Click Startup)

### 🪟 On Windows:

#### Option 1 (Easiest — File Explorer):
Open the project folder in File Explorer and double-click:
```
start.bat
```

#### Option 2 (Via PowerShell / Command Prompt):
Navigate to the project folder first, then run:
```powershell
cd "c:\Users\zoorr\Downloads\upso-asset-management-main\upso-asset-management-main"
.\start.bat
# or
npm start
```

---

### 🍎 On macOS / Linux:
Navigate to the project directory in Terminal, then run:
```bash
./start.sh
# or
npm start
```

---

> **Note**: The startup script automatically performs all initial setup:
> 1. Validates Node.js runtime.
> 2. Auto-creates configuration (`backend/.env`).
> 3. Installs backend and frontend dependencies if missing.
> 4. Applies database migrations and generates Prisma ORM client.
> 5. Imports Excel master data and seeds default user accounts.
> 6. Launches both Backend (Port 4000) and Frontend (Port 5173).
> 7. Automatically opens the web app in your default browser (`http://localhost:5173`).

---

## 🔑 Default Login Credentials

| Role | Email | Password | Access / Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@upso1.in` | `Admin@123` | Full access across all locations and assets |
| **Standard User** | `satyanshu@upso1.in` | `User@123` | Location-scoped (Ambabai Depot - 1449) & personal assets |

---

## 🏗️ Architecture & Project Structure

- **`/backend`**: Node.js & Express REST API powered by Prisma ORM and SQLite.
- **`/frontend`**: React 18 SPA built with Vite and React Router.
- **`run.js`**: Cross-platform single-command orchestrator for process management and automatic initialization.
- **`start.bat`**: Windows launcher script.
- **`start.sh`**: macOS / Linux launcher script.
- **`Inventory Detail (1).xlsx`**: Master IT asset records.
- **`Location code (2).xlsx`**: Official location master directory.
- **`ServiceRequestReport-*.xlsx`**: Sample service request ticket exports.

---

## 🧪 Running Automated Tests

To execute the unit and integration test suite:

```bash
npm test
```

---

## 🛑 Stopping the Application

Press `Ctrl + C` in the terminal window to cleanly stop both Backend and Frontend services.
