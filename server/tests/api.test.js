// Lightweight API tests. Models are stubbed, so no MongoDB is needed.
// Run: npm test
process.env.JWT_SECRET = "test-secret"
const test = require("node:test")
const assert = require("node:assert")
const path = require("node:path")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")

const base = path.join(__dirname, "..", "Backend Configuration")
const load = (rel) => require(path.join(base, rel))

const User = load("Models/UserSchema/user")
const Product = load("Models/ProductSchema/product")
const StockTransaction = load("Models/StockTransactionSchema/stockTransaction")
const ActivityLog = load("Models/ActivityLogSchema/activityLog")
const Warehouse = load("Models/WarehouseSchema/warehouse")
const WarehouseStock = load("Models/WarehouseStockSchema/warehouseStock")

const ADMIN_ID = "64b7f0c2a1b2c3d4e5f60001"
const STAFF_ID = "64b7f0c2a1b2c3d4e5f60002"
const PRODUCT_ID = "64b7f0c2a1b2c3d4e5f60003"
const users = {
    [ADMIN_ID]: { _id: ADMIN_ID, name: "Ada", email: "ada@x.com", role: "admin" },
    [STAFF_ID]: { _id: STAFF_ID, name: "Sam", email: "sam@x.com", role: "staff" }
}
const tokenFor = (id, role) => jwt.sign({ id, role }, "test-secret")

// --- stubs ---
User.findById = (id) => ({ select: async () => users[id] || null })
ActivityLog.create = async () => ({})
// warehouse layer: one default warehouse, with the stock "already assigned" so reconcile is a no-op
Warehouse.findOne = async () => ({ _id: "64b7f0c2a1b2c3d4e5f60009", name: "Main Warehouse", isDefault: true, isActive: true })
WarehouseStock.aggregate = async () => [{ _id: PRODUCT_ID, total: 1e9 }]
WarehouseStock.find = async () => [{ warehouse: "64b7f0c2a1b2c3d4e5f60009", quantity: 1e9 }]
WarehouseStock.updateOne = async () => ({ modifiedCount: 1 })
WarehouseStock.deleteMany = async () => ({})
// default for reconcileProduct(); individual tests override Product.findById when they need to
Product.findById = () => ({ select: async () => ({ _id: PRODUCT_ID, quantity: 10 }) })

const app = require("../server")
let server, url
test.before(async () => { server = app.listen(0); url = `http://127.0.0.1:${server.address().port}/api` })
test.after(() => server.close())

const call = (method, route, { token, body } = {}) => fetch(url + route, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
})

test("protected routes reject missing token", async () => {
    assert.strictEqual((await call("GET", "/products")).status, 401)
})

test("token for a deleted user is rejected", async () => {
    const res = await call("GET", "/products", { token: tokenFor("64b7f0c2a1b2c3d4e5f6ffff", "admin") })
    assert.strictEqual(res.status, 401)
})

test("role comes from the database, not the token (demoted admin loses access)", async () => {
    // token claims admin, but DB says staff
    const res = await call("GET", "/activity-logs", { token: tokenFor(STAFF_ID, "admin") })
    assert.strictEqual(res.status, 403)
})

test("staff cannot delete products; admin can", async () => {
    Product.findByIdAndDelete = async () => ({ _id: PRODUCT_ID, name: "Bolt", sku: "B1" })
    assert.strictEqual((await call("DELETE", `/products/${PRODUCT_ID}`, { token: tokenFor(STAFF_ID, "staff") })).status, 403)
    assert.strictEqual((await call("DELETE", `/products/${PRODUCT_ID}`, { token: tokenFor(ADMIN_ID, "admin") })).status, 200)
})

test("malformed ids return 400, not 500", async () => {
    const res = await call("DELETE", "/suppliers/not-an-id", { token: tokenFor(ADMIN_ID, "admin") })
    assert.strictEqual(res.status, 400)
})

test("registration cannot self-assign admin", async () => {
    let created
    User.findOne = async () => null
    User.countDocuments = async () => 3
    User.create = async (doc) => { created = doc; return { _id: "x", ...doc } }
    const res = await call("POST", "/registration/api", { body: { name: "Eve", email: "eve@x.com", password: "secret1", role: "admin" } })
    assert.strictEqual(res.status, 201)
    assert.strictEqual(created.role, "staff")
})

test("first registered user becomes admin", async () => {
    let created
    User.findOne = async () => null
    User.countDocuments = async () => 0
    User.create = async (doc) => { created = doc; return { _id: "x", ...doc } }
    await call("POST", "/registration/api", { body: { name: "First", email: "first@x.com", password: "secret1" } })
    assert.strictEqual(created.role, "admin")
})

test("login gives the same error for unknown email and wrong password", async () => {
    User.findOne = async () => null
    const a = await call("POST", "/loginRoute/api", { body: { email: "no@x.com", password: "whatever" } })
    const hash = await bcrypt.hash("right-pass", 4)
    User.findOne = async () => ({ _id: ADMIN_ID, email: "ada@x.com", role: "admin", password: hash })
    const b = await call("POST", "/loginRoute/api", { body: { email: "ada@x.com", password: "wrong-pass" } })
    assert.strictEqual(a.status, 401)
    assert.strictEqual(b.status, 401)
    assert.deepStrictEqual(await a.json(), await b.json())
})

test("cannot demote the last admin", async () => {
    User.findById = (id) => ({ select: async () => users[id] || null })
    // requester is a different admin, target is an admin, only 1 admin exists
    const other = "64b7f0c2a1b2c3d4e5f60009"
    users[other] = { _id: other, name: "Bo", email: "bo@x.com", role: "admin" }
    User.countDocuments = async () => 1
    User.findOne = async () => null
    const res = await call("PUT", `/user/update/${other}`, { token: tokenFor(ADMIN_ID, "admin"), body: { name: "Bo", email: "bo@x.com", role: "staff" } })
    assert.strictEqual(res.status, 400)
})

test("stock-out: insufficient stock is rejected and ledger untouched", async () => {
    let ledgerWrites = 0
    Product.findOneAndUpdate = async () => null
    Product.exists = async () => ({ _id: PRODUCT_ID })
    StockTransaction.create = async () => { ledgerWrites++; return {} }
    const res = await call("POST", "/stock/out", { token: tokenFor(STAFF_ID, "staff"), body: { productId: PRODUCT_ID, quantity: 5 } })
    assert.strictEqual(res.status, 400)
    assert.strictEqual(ledgerWrites, 0)
})

test("stock-in: failed ledger write rolls the quantity back", async () => {
    const incs = []
    Product.findOneAndUpdate = async (f, update) => { incs.push(update.$inc.quantity); return { name: "Bolt", quantity: 15 } }
    Product.updateOne = async (f, update) => { incs.push(update.$inc.quantity) }
    StockTransaction.create = async () => { throw new Error("db down") }
    const res = await call("POST", "/stock/in", { token: tokenFor(STAFF_ID, "staff"), body: { productId: PRODUCT_ID, quantity: 5 } })
    assert.strictEqual(res.status, 500)
    assert.deepStrictEqual(incs, [5, -5])
})

test("stock quantity validation", async () => {
    for (const quantity of [0, -3, 1.5, "abc"]) {
        const res = await call("POST", "/stock/in", { token: tokenFor(STAFF_ID, "staff"), body: { productId: PRODUCT_ID, quantity } })
        assert.strictEqual(res.status, 400, `quantity ${quantity}`)
    }
})

test("product edit that changes quantity writes a ledger adjustment", async () => {
    let entry
    Product.findOne = async () => null
    Product.findById = () => ({ select: async () => ({ quantity: 10 }) })
    Product.findOneAndUpdate = async (f, update) => ({ _id: PRODUCT_ID, name: "Bolt", sku: "B1", quantity: 10 + update.$inc.quantity })
    StockTransaction.create = async (doc) => { entry = doc; return doc }
    const res = await call("PUT", `/products/${PRODUCT_ID}`, {
        token: tokenFor(STAFF_ID, "staff"),
        body: { name: "Bolt", sku: "b1", price: 5, quantity: 4, reorderLevel: 2 }
    })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(entry.type, "OUT")
    assert.strictEqual(entry.quantity, 6)
})

// ---------- regression tests for bugs fixed in this review ----------
const Category = load("Models/CategorySchema/category")
const Supplier = load("Models/SupplierSchema/supplier")

test("REG: login/register with no request body return 400, not 500", async () => {
    for (const route of ["/loginRoute/api", "/registration/api"]) {
        const res = await fetch(url + route, { method: "POST" })
        assert.strictEqual(res.status, 400, route)
    }
})

test("REG: malformed JSON returns 400 without leaking parser internals", async () => {
    const res = await fetch(url + "/loginRoute/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad" })
    assert.strictEqual(res.status, 400)
    assert.deepStrictEqual(await res.json(), { message: "Invalid JSON in request body" })
})

test("REG: product edit without quantity leaves stock and ledger untouched", async () => {
    let ledgerWrites = 0
    let update
    Product.findOne = async () => null
    Product.findById = () => ({ select: async () => ({ quantity: 10 }) })
    Product.findOneAndUpdate = async (f, u) => { update = u; return { _id: PRODUCT_ID, name: "Bolt", sku: "B1", quantity: 10 } }
    StockTransaction.create = async () => { ledgerWrites++; return {} }
    const res = await call("PUT", `/products/${PRODUCT_ID}`, {
        token: tokenFor(STAFF_ID, "staff"),
        body: { name: "Bolt", sku: "b1", price: 5, reorderLevel: 2 }
    })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(update.$inc.quantity, 0)
    assert.strictEqual(ledgerWrites, 0)
})

test("REG: creating a product (quantity still required) and unknown category/supplier are rejected", async () => {
    const token = tokenFor(STAFF_ID, "staff")
    const ghost = "64b7f0c2a1b2c3d4e5f6aaaa"
    Product.findOne = async () => null
    Category.exists = async () => null
    Supplier.exists = async () => null
    let r = await call("POST", "/products", { token, body: { name: "A", sku: "a", price: 1, reorderLevel: 1 } })
    assert.strictEqual(r.status, 400) // missing quantity on create
    r = await call("POST", "/products", { token, body: { name: "A", sku: "a", price: 1, quantity: 1, reorderLevel: 1, category: ghost } })
    assert.strictEqual(r.status, 400)
    assert.match((await r.json()).message, /category/i)
    r = await call("POST", "/products", { token, body: { name: "A", sku: "a", price: 1, quantity: 1, reorderLevel: 1, supplier: ghost } })
    assert.strictEqual(r.status, 400)
    assert.match((await r.json()).message, /supplier/i)
})

test("REG: valid product with existing category is still created (no false rejection)", async () => {
    Product.findOne = async () => null
    Category.exists = async () => ({ _id: "x" })
    Product.create = async (d) => ({ _id: PRODUCT_ID, ...d })
    StockTransaction.create = async (d) => d
    const res = await call("POST", "/products", { token: tokenFor(STAFF_ID, "staff"),
        body: { name: "A", sku: "a", price: 1, quantity: 2, reorderLevel: 1, category: "64b7f0c2a1b2c3d4e5f6aaaa" } })
    assert.strictEqual(res.status, 201)
})

test("REG: CSV export neutralises spreadsheet formulas", async () => {
    const { csvCell } = await import(path.join(__dirname, "..", "..", "client", "src", "utils", "csv.js"))
    assert.strictEqual(csvCell("=HYPERLINK(\"http://evil\")"), "\"'=HYPERLINK(\"\"http://evil\"\")\"")
    assert.strictEqual(csvCell("@SUM(A1)"), "'@SUM(A1)")
    assert.strictEqual(csvCell("+1"), "'+1")
    assert.strictEqual(csvCell(-5), "-5")        // real negative numbers untouched
    assert.strictEqual(csvCell("Bolt, M8"), "\"Bolt, M8\"")
    assert.strictEqual(csvCell(null), "")
})
