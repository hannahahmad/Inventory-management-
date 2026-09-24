# UPSO-1 Integrated IT Asset Inventory & Service Request Management System

A full-stack enterprise web application designed for IT asset inventory tracking, location mapping, lifecycle monitoring, and service request management.

---

## 🚀 Key Features

- **Centralized Asset Management:** Comprehensive tracking of IT assets with unique identifiers, PO details, serial numbers, warranty, and lifecycle statuses.
- **Service Request Lifecycle:** Complete ticketing workflow from creation to engineer assignment, resolution tracking, and SLA monitoring.
- **Role-Based Access Control (RBAC):** Tiered permissions across Administrator, Asset Manager, Location Coordinator, and End-User roles.
- **Automated Excel Synchronization:** Two-way synchronized master records backed by SQLite and atomic file locking.
- **Audit Logging:** Traceable modification history for all critical asset and ticket operations.

---

## ⚡ Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ recommended)
- npm (comes bundled with Node.js)

### Running the Application

#### On Windows:
Double-click `start.bat` or run:
```powershell
.\start.bat
# or
npm start
```

#### On macOS / Linux:
```bash
chmod +x start.sh
./start.sh
# or
npm start
```

> **Automated Orchestration:**
> The startup script (`run.js`) automatically:
> 1. Verifies the Node.js runtime.
> 2. Creates the local configuration file (`backend/.env`).
> 3. Installs backend and frontend dependencies if not present.
> 4. Applies database migrations and generates the Prisma ORM client.
> 5. Synchronizes initial dataset and seeds default administrative accounts.
> 6. Starts both Backend (Port `4000`) and Frontend (Port `5173`).
> 7. Opens `http://localhost:5173` in your default browser.

---

## 🔑 Default Demonstration Accounts

| Role | Email | Password | Access / Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@upso1.in` | `Admin@123` | Global administrative access across all locations & assets |
| **Standard User** | `satyanshu@upso1.in` | `User@123` | Location-scoped (Ambabai Depot) & assigned personal assets |

*Note: In production environments, passwords should be changed immediately after initial deployment.*

---

## 🏗️ Architecture & Project Structure

```
├── backend/            # Express REST API with Prisma ORM & SQLite
│   ├── prisma/         # Database schema and migration history
│   ├── src/            # Controllers, routes, and sync services
│   └── tests/          # Unit & integration test suites
├── frontend/           # React 18 Single Page Application (Vite)
│   ├── src/pages/      # Views for Assets, Requests, Locations, Dashboard
│   └── src/components/ # Shared navigation and UI components
├── run.js              # Cross-platform startup orchestrator
├── start.bat           # Windows single-click launcher
├── start.sh            # Unix / macOS launcher
└── package.json        # Root scripts and workspace definitions
```

---

## 🧪 Testing

To execute automated test suites:
```bash
npm test
```

---

## 🛑 Stopping the Application

Press `Ctrl + C` in your terminal to cleanly terminate both the frontend and backend processes.
