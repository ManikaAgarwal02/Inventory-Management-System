# Inventory Management System (IMS)

A full-stack Inventory Management System built with **React, Node.js, Express, and MongoDB**.

## Features

- JWT authentication with Admin and Staff roles
- Product, category, and supplier management
- Stock In / Stock Out
- Warehouse and warehouse-to-warehouse transfers
- Purchase orders and stock receiving
- Staff stock requests
- CSV product import
- Dashboard, reports, alerts, and activity logs
- User and profile management
- Password reset
- Role-based access control
- Inventory validation and concurrency protection

## Tech Stack

**Frontend**
- React 19
- Vite
- React Router
- Axios

**Backend**
- Node.js
- Express 5
- MongoDB
- Mongoose
- JWT
- bcrypt

## Project Structure

```text
IMS/
├── client/          # React frontend
│   └── src/
│       ├── Components/
│       ├── Pages/
│       ├── Styles/
│       └── utils/
│
├── server/          # Express backend
│   ├── Backend Configuration/
│   │   ├── Controllers/
│   │   ├── Models/
│   │   └── Routes/
│   ├── tests/
│   └── server.js
│
└── README.md
```

## Setup

### 1. Backend

```bash
cd server
npm install
```

Create `server/.env`:

```env
MONGO_URI=mongodb://localhost:27017/InventoryManagementDB
JWT_SECRET=your-secret-key
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

Start the backend:

```bash
npm start
```

Development mode:

```bash
npm run dev
```

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Frontend normally runs on:

```text
http://localhost:5173
```

Backend API:

```text
http://localhost:4000/api
```

## Main API Routes

```text
POST   /api/loginRoute/api
POST   /api/registration/api

GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id

POST   /api/stock/in
POST   /api/stock/out
GET    /api/stock/transactions

GET    /api/suppliers
POST   /api/suppliers

GET    /api/warehouses
POST   /api/warehouses
POST   /api/transfers

GET    /api/purchase-orders
POST   /api/purchase-orders
POST   /api/purchase-orders/:id/receive

POST   /api/stock-requests
GET    /api/stock-requests

GET    /api/dashboard/stats
GET    /api/reports/summary
GET    /api/activity-logs
```

## Database

Main MongoDB models:

- User
- Product
- Category
- Supplier
- Warehouse
- WarehouseStock
- StockTransaction
- StockTransfer
- PurchaseOrder
- StockRequest
- PasswordReset
- ActivityLog

## Roles

### Admin

Full access to inventory, warehouses, purchase orders, reports, users, activity logs, and administrative operations.

### Staff

Access to permitted inventory operations, products, profile management, and stock requests.

## Testing

Backend tests:

```bash
cd server
npm test
npm run test:e2e
```

Frontend lint:

```bash
cd client
npm run lint
```

## Production Build

```bash
cd client
npm run build
```

Set production environment variables before deploying.

## Important Rule

The system maintains the inventory relationship:

```text
Product.quantity = Sum of WarehouseStock quantities
```

Stock operations and warehouse transfers are validated to prevent negative or inconsistent inventory.

## License

This project is for educational/development use unless a separate license is provided.
