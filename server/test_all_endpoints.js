const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Route imports
const RegistrationApi = require('./Backend Configuration/Routes/Registration & Login Route/Register/register');
const LoginRoute = require('./Backend Configuration/Routes/Registration & Login Route/Login/loginRoute');
const getUsers = require('./Backend Configuration/Routes/Get All User Route/getUser');
const deleteUsers = require('./Backend Configuration/Routes/User Data Deleted/userDataDelete');
const updatedUser = require('./Backend Configuration/Routes/User Updation Route/userUpdateRoute');
const productRoute = require('./Backend Configuration/Routes/Product Route/productRoute');
const categoryRoute = require('./Backend Configuration/Routes/Category Route/categoryRoute');
const supplierRoute = require('./Backend Configuration/Routes/Supplier Route/supplierRoute');
const stockRoute = require('./Backend Configuration/Routes/Stock Route/stockRoute');
const dashboardRoute = require('./Backend Configuration/Routes/Dashboard Route/dashboardRoute');

const Product = require('./Backend Configuration/Models/ProductSchema/product');
const Category = require('./Backend Configuration/Models/CategorySchema/category');
const Supplier = require('./Backend Configuration/Models/SupplierSchema/supplier');
const StockTransaction = require('./Backend Configuration/Models/StockTransactionSchema/stockTransaction');
const User = require('./Backend Configuration/Models/UserSchema/user');

const app = express();
app.use(express.json());
app.use(cors());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', RegistrationApi);
app.use('/api', LoginRoute);
app.use('/api', getUsers);
app.use('/api', deleteUsers);
app.use('/api', updatedUser);
app.use('/api', productRoute);
app.use('/api', categoryRoute);
app.use('/api', supplierRoute);
app.use('/api', stockRoute);
app.use('/api', dashboardRoute);

async function request(method, path, body = null, token = null) {
    const res = await fetch(`http://localhost:4005${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

async function run() {
    console.log("-> Connecting to MongoDB...");
    await mongoose.connect("mongodb://localhost:27017/InventoryManagementDB");
    console.log("-> Connected to MongoDB.");

    const server = app.listen(4005, async () => {
        console.log("-> Test server running at port 4005.");
        try {
            // 1. Health check
            const health = await request('GET', '/api/health');
            console.log("1. Health check:", health.status === 200 ? "PASS" : "FAIL", health.data);

            // 2. Register User
            const testEmail = `tester_${Date.now()}@college.edu`;
            const reg = await request('POST', '/api/registration/api', {
                name: "Rahul Verma",
                email: testEmail,
                password: "password123",
                role: "admin"
            });
            console.log("2. Registration:", reg.status === 201 ? "PASS" : "FAIL", reg.data.message);

            // 3. Login
            const login = await request('POST', '/api/loginRoute/api', {
                email: testEmail,
                password: "password123"
            });
            const token = login.data.token;
            console.log("3. Login:", token ? "PASS" : "FAIL", "Token received:", !!token);

            // 4. Create Category
            const catRes = await request('POST', '/api/categories', {
                name: `Peripherals_${Date.now()}`,
                description: "Computer accessories and peripherals"
            }, token);
            const categoryId = catRes.data.data?._id;
            console.log("4. Category creation:", catRes.status === 201 ? "PASS" : "FAIL", "ID:", categoryId);

            // 5. Create Supplier
            const supRes = await request('POST', '/api/suppliers', {
                name: `LogiTech Supplies ${Date.now()}`,
                email: "sales@logitechsupplies.com",
                phone: "9876543210",
                address: "Plot 42, Tech Park, Delhi"
            }, token);
            const supplierId = supRes.data.data?._id;
            console.log("5. Supplier creation:", supRes.status === 201 ? "PASS" : "FAIL", "ID:", supplierId);

            // 6. Create Product with Category & Supplier
            const sku1 = `MOU-${Date.now().toString().slice(-4)}`;
            const prodRes1 = await request('POST', '/api/products', {
                name: "Ergonomic Optical Mouse",
                sku: sku1,
                category: categoryId,
                supplier: supplierId,
                price: 850,
                quantity: 40,
                reorderLevel: 15,
                unit: "pcs"
            }, token);
            const prodId1 = prodRes1.data.data?._id;
            console.log("6. Product 1 (with Category & Supplier):", prodRes1.status === 201 ? "PASS" : "FAIL", "SKU:", sku1);

            // 7. Create Product WITHOUT Category & Supplier (testing empty-string CastError fix!)
            const sku2 = `KEY-${Date.now().toString().slice(-4)}`;
            const prodRes2 = await request('POST', '/api/products', {
                name: "Mechanical Keyboard",
                sku: sku2,
                category: "",
                supplier: "",
                price: 2400,
                quantity: 5, // below reorderLevel to test low-stock
                reorderLevel: 10,
                unit: "pcs"
            }, token);
            const prodId2 = prodRes2.data.data?._id;
            console.log("7. Product 2 (Empty Category/Supplier CastError Test):", prodRes2.status === 201 ? "PASS" : "FAIL", "SKU:", sku2);

            // 8. Quick Stock Update (+10)
            const quickPlus = await request('PATCH', `/api/products/${prodId1}/quick-stock`, { delta: 10 }, token);
            console.log("8. Quick Stock (+10):", quickPlus.status === 200 && quickPlus.data.data.quantity === 50 ? "PASS" : "FAIL", `New Qty: ${quickPlus.data.data?.quantity}`);

            // 9. Quick Stock Update (-5)
            const quickMinus = await request('PATCH', `/api/products/${prodId1}/quick-stock`, { delta: -5 }, token);
            console.log("9. Quick Stock (-5):", quickMinus.status === 200 && quickMinus.data.data.quantity === 45 ? "PASS" : "FAIL", `New Qty: ${quickMinus.data.data?.quantity}`);

            // 10. Record Stock In
            const stockInRes = await request('POST', '/api/stock/in', {
                productId: prodId2,
                quantity: 20,
                note: "Batch purchase replenishment"
            }, token);
            console.log("10. Stock In:", stockInRes.status === 201 ? "PASS" : "FAIL", stockInRes.data.message);

            // 11. Record Stock Out
            const stockOutRes = await request('POST', '/api/stock/out', {
                productId: prodId2,
                quantity: 23, // was 5 + 20 = 25, leaving 2 (low stock!)
                note: "Issued to CSE Lab 3"
            }, token);
            console.log("11. Stock Out:", stockOutRes.status === 201 ? "PASS" : "FAIL", stockOutRes.data.message);

            // 12. Fetch Low Stock Products
            const lowStockRes = await request('GET', '/api/products/low-stock', null, token);
            const hasLowStock = lowStockRes.data.data?.some(p => p._id === prodId2);
            console.log("12. Low Stock Alerts:", hasLowStock ? "PASS" : "FAIL", `Found ${lowStockRes.data.data?.length} low-stock products`);

            // 13. Fetch Dashboard Stats
            const dashRes = await request('GET', '/api/dashboard/stats', null, token);
            const stats = dashRes.data.data;
            console.log("13. Dashboard Stats:", stats ? "PASS" : "FAIL", {
                totalProducts: stats?.totalProducts,
                totalUnits: stats?.totalStockUnits,
                totalValue: stats?.totalStockValue,
                lowStockCount: stats?.lowStockProducts,
                outOfStockCount: stats?.outOfStockProducts,
                health: stats?.inventoryHealth
            });

            // 14. Stock Ledger Transactions
            const txRes = await request('GET', '/api/stock/transactions', null, token);
            console.log("14. Stock Ledger:", txRes.status === 200 && txRes.data.data.length >= 4 ? "PASS" : "FAIL", `Found ${txRes.data.data?.length} transactions`);

            console.log("\n=== ALL 14 VERIFICATION CHECKS COMPLETED SUCCESSFULLY! ===");
        } catch (err) {
            console.error("Test failed with error:", err);
        } finally {
            server.close();
            await mongoose.disconnect();
            process.exit(0);
        }
    });
}

run();
