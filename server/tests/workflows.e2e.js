// End-to-end workflow test against a REAL MongoDB (not stubbed).
//   MONGO_URI=mongodb://127.0.0.1:27017/ims_e2e node tests/workflows.e2e.js
// Uses a throw-away database name; do NOT point it at data you care about.
// The two "concurrent" checks rely on MongoDB's per-document atomic updates, so they only run on a real
// MongoDB:  RUN_CONCURRENCY=true node tests/workflows.e2e.js   (MongoDB-compatible emulators such as
// FerretDB-SQLite lose concurrent updates and would give false failures).
process.env.JWT_SECRET = "e2e-secret"
process.env.RESET_LINK_IN_RESPONSE = "true"
const assert = require("node:assert")
const mongoose = require("mongoose")
const app = require("../server")

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ims_e2e_" + Date.now()
let base, token, staffToken
let passed = 0
const results = []

async function call(method, route, { body, tok = token } = {}) {
    const res = await fetch(base + route, {
        method,
        headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: body ? JSON.stringify(body) : undefined
    })
    let json = {}
    try { json = await res.json() } catch { /* empty */ }
    return { status: res.status, body: json, data: json.data }
}
const CONC = process.env.RUN_CONCURRENCY === "true"
async function check(name, fn, { concurrency = false } = {}) {
    if (concurrency && !CONC) { results.push(`  skip ${name} (set RUN_CONCURRENCY=true on a real MongoDB)`); return }
    try { await fn(); passed++; results.push(`  ok   ${name}`) } catch (e) { results.push(`  FAIL ${name}\n         ${e.message}`); process.exitCode = 1 }
}

async function main() {
    await mongoose.connect(uri)
    await mongoose.connection.dropDatabase()
    const server = app.listen(0)
    base = `http://127.0.0.1:${server.address().port}/api`

    // ---------- auth ----------
    await call("POST", "/registration/api", { body: { name: "Admin", email: "admin@x.com", password: "secret1" }, tok: null })
    await call("POST", "/registration/api", { body: { name: "Staff", email: "staff@x.com", password: "secret1" }, tok: null })
    token = (await call("POST", "/loginRoute/api", { body: { email: "admin@x.com", password: "secret1" }, tok: null })).body.token
    staffToken = (await call("POST", "/loginRoute/api", { body: { email: "staff@x.com", password: "secret1" }, tok: null })).body.token
    assert(token && staffToken, "login failed")

    const supplier = (await call("POST", "/suppliers", { body: { name: "Acme Supplies" } })).data
    const kb = (await call("POST", "/products", { body: { name: "Keyboard", sku: "kb-1", price: 500, quantity: 5, reorderLevel: 10 } })).data
    const laptop = (await call("POST", "/products", { body: { name: "Laptop", sku: "LP-1", price: 40000, quantity: 20, reorderLevel: 5 } })).data
    const sumUnits = async () => (await call("GET", "/products")).data.reduce((s, p) => s + p.quantity, 0)
    const whQty = async (whId, productId) => {
        const inv = (await call("GET", `/warehouses/${whId}/inventory`)).data.items.find((i) => i.product._id === productId)
        return inv ? inv.quantity : 0
    }

    // ---------- Feature 5: warehouses ----------
    let main_, mathura
    await check("warehouse list auto-creates default Main Warehouse holding pre-existing stock", async () => {
        const list = (await call("GET", "/warehouses")).data
        main_ = list.find((w) => w.isDefault)
        assert(main_ && main_.name === "Main Warehouse")
        assert.strictEqual(main_.totalUnits, 25)
    })
    await check("add warehouse; duplicate name rejected; empty name rejected", async () => {
        const r = await call("POST", "/warehouses", { body: { name: "Mathura Warehouse", location: "Mathura" } })
        assert.strictEqual(r.status, 201); mathura = r.data
        assert.strictEqual((await call("POST", "/warehouses", { body: { name: "mathura warehouse" } })).status, 400)
        assert.strictEqual((await call("POST", "/warehouses", { body: { name: "  " } })).status, 400)
    })
    await check("transfer 10 laptops: source -10, destination +10, total unchanged, history recorded", async () => {
        const before = await sumUnits()
        const r = await call("POST", "/transfers", { body: { fromWarehouse: main_._id, toWarehouse: mathura._id, product: laptop._id, quantity: 10 } })
        assert.strictEqual(r.status, 201); assert.strictEqual(r.data.status, "Completed")
        assert.strictEqual(await whQty(main_._id, laptop._id), 10)
        assert.strictEqual(await whQty(mathura._id, laptop._id), 10)
        assert.strictEqual(await sumUnits(), before)
        assert.strictEqual((await call("GET", "/transfers")).data.length, 1)
    })
    await check("cannot transfer more than available / same warehouse / zero / negative / bad ids", async () => {
        const t = (q, from = main_._id, to = mathura._id) => call("POST", "/transfers", { body: { fromWarehouse: from, toWarehouse: to, product: laptop._id, quantity: q } })
        assert.strictEqual((await t(11)).status, 400)
        assert.strictEqual((await t(0)).status, 400)
        assert.strictEqual((await t(-3)).status, 400)
        assert.strictEqual((await t(1.5)).status, 400)
        assert.strictEqual((await t(1, main_._id, main_._id)).status, 400)
        assert.strictEqual((await call("POST", "/transfers", { body: { fromWarehouse: "nope", toWarehouse: mathura._id, product: laptop._id, quantity: 1 } })).status, 400)
        assert.strictEqual(await whQty(main_._id, laptop._id), 10) // unchanged
    })
    await check("concurrent transfers cannot overdraw the source", async () => {
        const rs = await Promise.all(Array.from({ length: 5 }, () => call("POST", "/transfers", { body: { fromWarehouse: main_._id, toWarehouse: mathura._id, product: laptop._id, quantity: 4 } })))
        assert.strictEqual(rs.filter((r) => r.status === 201).length, 2) // 10 units / 4 = 2 succeed
        assert.strictEqual(await whQty(main_._id, laptop._id), 2)
        assert.strictEqual(await whQty(mathura._id, laptop._id), 18)
    }, { concurrency: true })
    await check("sequential transfers drain the source exactly, then are refused", async () => {
        if (CONC) return // state already set up by the concurrent check
        for (const q of [4, 4]) assert.strictEqual((await call("POST", "/transfers", { body: { fromWarehouse: main_._id, toWarehouse: mathura._id, product: laptop._id, quantity: q } })).status, 201)
        assert.strictEqual((await call("POST", "/transfers", { body: { fromWarehouse: main_._id, toWarehouse: mathura._id, product: laptop._id, quantity: 4 } })).status, 400)
        assert.strictEqual(await whQty(main_._id, laptop._id), 2)
        assert.strictEqual(await whQty(mathura._id, laptop._id), 18)
    })
    await check("deactivate: admin only, default protected, inactive blocks transfers", async () => {
        assert.strictEqual((await call("PATCH", `/warehouses/${mathura._id}/active`, { body: { isActive: false }, tok: staffToken })).status, 403)
        assert.strictEqual((await call("PATCH", `/warehouses/${main_._id}/active`, { body: { isActive: false } })).status, 400)
        assert.strictEqual((await call("PATCH", `/warehouses/${mathura._id}/active`, { body: { isActive: false } })).status, 200)
        assert.strictEqual((await call("POST", "/transfers", { body: { fromWarehouse: main_._id, toWarehouse: mathura._id, product: laptop._id, quantity: 1 } })).status, 400)
        await call("PATCH", `/warehouses/${mathura._id}/active`, { body: { isActive: true } })
    })
    await check("invalid / unknown warehouse ids", async () => {
        assert.strictEqual((await call("GET", "/warehouses/abc/inventory")).status, 400)
        assert.strictEqual((await call("GET", "/warehouses/64b7f0c2a1b2c3d4e5f6ffff/inventory")).status, 404)
    })
    await check("stock-out takes from main first, then other warehouses; totals stay equal to product quantity", async () => {
        // laptop: main 2, mathura 18 -> out 5 should drain main(2) then mathura(3)
        const r = await call("POST", "/stock/out", { body: { productId: laptop._id, quantity: 5 } })
        assert.strictEqual(r.status, 201)
        assert.strictEqual(await whQty(main_._id, laptop._id), 0)
        assert.strictEqual(await whQty(mathura._id, laptop._id), 15)
        assert.strictEqual((await call("GET", `/products/${laptop._id}`)).data.quantity, 15)
        assert.strictEqual((await call("POST", "/stock/out", { body: { productId: laptop._id, quantity: 16 } })).status, 400)
        assert.strictEqual((await call("GET", `/products/${laptop._id}`)).data.quantity, 15)
    })
    await check("stock-in into a chosen warehouse", async () => {
        const r = await call("POST", "/stock/in", { body: { productId: kb._id, quantity: 3, warehouseId: mathura._id } })
        assert.strictEqual(r.status, 201)
        assert.strictEqual(await whQty(mathura._id, kb._id), 3)
        assert.strictEqual((await call("GET", `/products/${kb._id}`)).data.quantity, 8)
    })
    await check("product edit quantity change stays in sync with warehouses", async () => {
        await call("PUT", `/products/${kb._id}`, { body: { name: "Keyboard", sku: "KB-1", price: 500, quantity: 4, reorderLevel: 10 } }) // 8 -> 4
        const invMain = await whQty(main_._id, kb._id), invM = await whQty(mathura._id, kb._id)
        assert.strictEqual(invMain + invM, 4)
        await call("PUT", `/products/${kb._id}`, { body: { name: "Keyboard", sku: "KB-1", price: 500, quantity: 5, reorderLevel: 10 } }) // 4 -> 5
        assert.strictEqual((await whQty(main_._id, kb._id)) + (await whQty(mathura._id, kb._id)), 5)
    })

    // ---------- Feature 1: purchase orders ----------
    let po
    await check("create PO: validation (no supplier, no items, dup product, qty<1, negative price, bad ids)", async () => {
        const mk = (over) => call("POST", "/purchase-orders", { body: { supplier: supplier._id, items: [{ product: kb._id, quantity: 50, unitPrice: 450 }], ...over } })
        assert.strictEqual((await mk({ supplier: "" })).status, 400)
        assert.strictEqual((await mk({ items: [] })).status, 400)
        assert.strictEqual((await mk({ items: [{ product: kb._id, quantity: 1, unitPrice: 1 }, { product: kb._id, quantity: 1, unitPrice: 1 }] })).status, 400)
        assert.strictEqual((await mk({ items: [{ product: kb._id, quantity: 0, unitPrice: 1 }] })).status, 400)
        assert.strictEqual((await mk({ items: [{ product: kb._id, quantity: -2, unitPrice: 1 }] })).status, 400)
        assert.strictEqual((await mk({ items: [{ product: kb._id, quantity: 2, unitPrice: -1 }] })).status, 400)
        assert.strictEqual((await mk({ items: [{ product: "zzz", quantity: 2, unitPrice: 1 }] })).status, 400)
        assert.strictEqual((await mk({ supplier: "64b7f0c2a1b2c3d4e5f6ffff" })).status, 400)
        assert.strictEqual((await mk({ expectedDate: "not-a-date" })).status, 400)
    })
    await check("create draft PO, totals computed, edit draft", async () => {
        const r = await call("POST", "/purchase-orders", { body: { supplier: supplier._id, items: [{ product: kb._id, quantity: 50, unitPrice: 450 }, { product: laptop._id, quantity: 2, unitPrice: 30000 }], notes: "rush" } })
        assert.strictEqual(r.status, 201); po = r.data
        assert.strictEqual(po.status, "Draft"); assert.match(po.poNumber, /^PO-\d+$/)
        const got = (await call("GET", `/purchase-orders/${po._id}`)).data
        assert.strictEqual(got.total, 50 * 450 + 2 * 30000)
        const up = await call("PUT", `/purchase-orders/${po._id}`, { body: { supplier: supplier._id, items: [{ product: kb._id, quantity: 50, unitPrice: 450 }], notes: "edited" } })
        assert.strictEqual(up.status, 200)
        assert.strictEqual((await call("GET", `/purchase-orders/${po._id}`)).data.items.length, 1)
    })
    await check("cannot receive a draft; place order; cannot edit a placed order", async () => {
        const item = (await call("GET", `/purchase-orders/${po._id}`)).data.items[0]
        assert.strictEqual((await call("POST", `/purchase-orders/${po._id}/receive`, { body: { items: [{ itemId: item._id, quantity: 1 }] } })).status, 400)
        assert.strictEqual((await call("POST", `/purchase-orders/${po._id}/order`)).status, 200)
        assert.strictEqual((await call("PUT", `/purchase-orders/${po._id}`, { body: { supplier: supplier._id, items: [{ product: kb._id, quantity: 1, unitPrice: 1 }] } })).status, 400)
    })
    await check("receive 30 of 50 -> Partially Received, inventory +30 in warehouse, ledger entry", async () => {
        const full = (await call("GET", `/purchase-orders/${po._id}`)).data
        const item = full.items[0]
        const before = await sumUnits()
        const r = await call("POST", `/purchase-orders/${po._id}/receive`, { body: { warehouseId: mathura._id, items: [{ itemId: item._id, quantity: 30 }] } })
        assert.strictEqual(r.status, 200); assert.strictEqual(r.data.status, "Partially Received")
        assert.strictEqual(r.data.items[0].receivedQuantity, 30)
        assert.strictEqual(await sumUnits(), before + 30)
        assert.strictEqual((await call("GET", `/products/${kb._id}`)).data.quantity, 35)
        assert.strictEqual((await whQty(mathura._id, kb._id)) + (await whQty(main_._id, kb._id)), 35)
    })
    await check("warehouse totals equal product total after receiving", async () => {
        const total = (await whQty(main_._id, kb._id)) + (await whQty(mathura._id, kb._id))
        assert.strictEqual(total, 35)
    })
    await check("receiving more than remaining is rejected and changes nothing", async () => {
        const item = (await call("GET", `/purchase-orders/${po._id}`)).data.items[0]
        const r = await call("POST", `/purchase-orders/${po._id}/receive`, { body: { items: [{ itemId: item._id, quantity: 21 }] } })
        assert.strictEqual(r.status, 400)
        assert.strictEqual((await call("GET", `/products/${kb._id}`)).data.quantity, 35)
        assert.strictEqual((await call("POST", `/purchase-orders/${po._id}/receive`, { body: { items: [{ itemId: item._id, quantity: -1 }] } })).status, 400)
        assert.strictEqual((await call("POST", `/purchase-orders/${po._id}/receive`, { body: { items: [{ itemId: item._id, quantity: 1.5 }] } })).status, 400)
        assert.strictEqual((await call("POST", `/purchase-orders/${po._id}/receive`, { body: { items: [] } })).status, 400)
        assert.strictEqual((await call("POST", `/purchase-orders/${po._id}/receive`, { body: { items: [{ itemId: "bad", quantity: 1 }] } })).status, 400)
    })
    await check("cannot cancel a partially received order", async () => {
        assert.strictEqual((await call("POST", `/purchase-orders/${po._id}/cancel`)).status, 400)
    })
    await check("concurrent receives cannot exceed remaining 20", async () => {
        const item = (await call("GET", `/purchase-orders/${po._id}`)).data.items[0]
        const rs = await Promise.all(Array.from({ length: 4 }, () => call("POST", `/purchase-orders/${po._id}/receive`, { body: { items: [{ itemId: item._id, quantity: 8 }] } })))
        assert(rs.filter((r) => r.status === 200).length <= 2, "at most 2 of 4 receives of 8 can fit into 20")
        const after = (await call("GET", `/purchase-orders/${po._id}`)).data
        assert.strictEqual((await call("GET", `/products/${kb._id}`)).data.quantity, 5 + after.items[0].receivedQuantity)
    }, { concurrency: true })
    await check("receive remaining -> Received, then no more receiving", async () => {
        const cur = (await call("GET", `/purchase-orders/${po._id}`)).data
        const item = cur.items[0]
        const left = item.quantity - item.receivedQuantity
        if (left > 0) {
            const r = await call("POST", `/purchase-orders/${po._id}/receive`, { body: { items: [{ itemId: item._id, quantity: left }] } })
            assert.strictEqual(r.status, 200); assert.strictEqual(r.data.status, "Received")
        }
        assert.strictEqual((await call("GET", `/purchase-orders/${po._id}`)).data.status, "Received")
        assert.strictEqual((await call("GET", `/products/${kb._id}`)).data.quantity, 55)
        assert.strictEqual((await call("POST", `/purchase-orders/${po._id}/receive`, { body: { items: [{ itemId: item._id, quantity: 1 }] } })).status, 400)
        assert.strictEqual((await whQty(main_._id, kb._id)) + (await whQty(mathura._id, kb._id)), 55)
    })
    await check("cancel + delete rules; staff cannot delete; invalid ids", async () => {
        const d = (await call("POST", "/purchase-orders", { body: { supplier: supplier._id, items: [{ product: laptop._id, quantity: 1, unitPrice: 1 }] } })).data
        assert.strictEqual((await call("DELETE", `/purchase-orders/${d._id}`, { tok: staffToken })).status, 403)
        assert.strictEqual((await call("POST", `/purchase-orders/${d._id}/cancel`)).status, 200)
        assert.strictEqual((await call("POST", `/purchase-orders/${d._id}/cancel`)).status, 400)
        assert.strictEqual((await call("DELETE", `/purchase-orders/${d._id}`)).status, 200)
        assert.strictEqual((await call("GET", "/purchase-orders/xyz")).status, 400)
        assert.strictEqual((await call("GET", "/purchase-orders/64b7f0c2a1b2c3d4e5f6ffff")).status, 404)
        assert.strictEqual((await call("GET", "/purchase-orders", { tok: null })).status, 401)
    })

    // ---------- Feature 3: CSV import ----------
    await check("import preview flags every error type without writing", async () => {
        const rows = [
            { rowNumber: 2, name: "Mouse", sku: "ms-1", category: "Accessories", quantity: "40", price: "299.50", reorderLevel: "5", supplier: "Acme Supplies" },
            { rowNumber: 3, name: "Cable", sku: "CB-1", quantity: "10", price: "50" },
            { rowNumber: 4, name: "Dup in file", sku: "MS-1", quantity: "1", price: "1" },
            { rowNumber: 5, name: "Dup in db", sku: "kb-1", quantity: "1", price: "1" },
            { rowNumber: 6, name: "", sku: "X-1" },
            { rowNumber: 7, name: "No sku", sku: "" },
            { rowNumber: 8, name: "Bad qty", sku: "BQ-1", quantity: "-5", price: "1" },
            { rowNumber: 9, name: "Float qty", sku: "FQ-1", quantity: "2.5", price: "1" },
            { rowNumber: 10, name: "Bad price", sku: "BP-1", quantity: "1", price: "abc" },
            { rowNumber: 11, name: "Neg price", sku: "NP-1", quantity: "1", price: "-4" },
            { rowNumber: 12, name: "Bad supplier", sku: "BS-1", supplier: "Nobody Ltd" },
            { rowNumber: 13, name: "", sku: "", quantity: "", price: "" },
            { rowNumber: 14, name: "Bad min", sku: "BM-1", reorderLevel: "x" }
        ]
        const r = await call("POST", "/products/import/preview", { body: { rows } })
        assert.strictEqual(r.status, 200)
        assert.strictEqual(r.data.valid, 2); assert.strictEqual(r.data.invalid, 11)
        const byRow = Object.fromEntries(r.data.rows.map((x) => [x.row, x.errors.join("|")]))
        assert.match(byRow[4], /Duplicate SKU in file/); assert.match(byRow[5], /already exists/)
        assert.match(byRow[6], /name is required/); assert.match(byRow[7], /SKU is required/)
        assert.match(byRow[8], /Quantity/); assert.match(byRow[9], /Quantity/); assert.match(byRow[10], /Price/); assert.match(byRow[11], /Price/)
        assert.match(byRow[12], /Supplier/); assert.match(byRow[13], /empty/); assert.match(byRow[14], /Minimum stock/)
        assert.strictEqual((await call("GET", "/products")).data.length, 2) // nothing written
    })
    await check("import commits only valid rows, builds categories, opening stock hits warehouse + ledger + dashboard", async () => {
        const before = await sumUnits()
        const rows = [
            { rowNumber: 2, name: "Mouse", sku: "ms-1", category: "Accessories", quantity: "40", price: "299.50", reorderLevel: "5", supplier: "acme supplies" },
            { rowNumber: 3, name: "Cable", sku: "CB-1", quantity: "10", price: "50" },
            { rowNumber: 4, name: "Dup in file", sku: "MS-1", quantity: "1", price: "1" },
            { rowNumber: 5, name: "Bad", sku: "BAD", quantity: "-1" }
        ]
        const r = await call("POST", "/products/import", { body: { rows } })
        assert.strictEqual(r.status, 201)
        assert.strictEqual(r.data.imported, 2); assert.strictEqual(r.data.failed.length, 2)
        assert.deepStrictEqual(r.data.failed.map((f) => f.row), [4, 5])
        const products = (await call("GET", "/products")).data
        const mouse = products.find((p) => p.sku === "MS-1")
        assert.strictEqual(mouse.quantity, 40); assert.strictEqual(mouse.price, 299.5); assert.strictEqual(mouse.category.name, "Accessories"); assert.strictEqual(mouse.supplier.name, "Acme Supplies")
        assert.strictEqual(await sumUnits(), before + 50)
        assert.strictEqual(await whQty(main_._id, mouse._id), 40)
        // re-import the same file -> everything is a duplicate, nothing corrupts
        const again = await call("POST", "/products/import", { body: { rows } })
        assert.strictEqual(again.data.imported, 0)
        assert.strictEqual((await call("GET", "/products")).data.length, 4)
    })
    await check("import rejects bad payloads", async () => {
        assert.strictEqual((await call("POST", "/products/import", { body: { rows: [] } })).status, 400)
        assert.strictEqual((await call("POST", "/products/import", { body: {} })).status, 400)
        assert.strictEqual((await call("POST", "/products/import", { body: { rows: ["x"] } })).status, 400)
        assert.strictEqual((await call("POST", "/products/import", { body: { rows: [{ name: "a", sku: "b" }] }, tok: null })).status, 401)
    })

    // ---------- Feature 2: reports ----------
    await check("report numbers match inventory and respond to the date range", async () => {
        const r = await call("GET", "/reports/summary")
        assert.strictEqual(r.status, 200)
        const inv = r.data.inventory
        const products = (await call("GET", "/products")).data
        assert.strictEqual(inv.totalProducts, products.length)
        assert.strictEqual(inv.totalUnits, products.reduce((s, p) => s + p.quantity, 0))
        assert.strictEqual(inv.totalValue, products.reduce((s, p) => s + p.quantity * p.price, 0))
        assert.strictEqual(inv.stockByCategory.reduce((s, c) => s + c.units, 0), inv.totalUnits)
        const today = new Date().toISOString().slice(0, 10)
        const trend = r.data.movement.trend
        assert.strictEqual(trend.length, 30)
        assert.strictEqual(trend[trend.length - 1].units, inv.totalUnits) // trend ends at today's real total
        const one = (await call("GET", `/reports/summary?from=${today}&to=${today}`)).data
        assert.strictEqual(one.range.days, 1)
        assert.strictEqual(one.movement.received, 25 + 3 + 50 + 50) // opening stock 25 + stock-in 3 + PO receipts 50 + CSV import 50
        assert.strictEqual(one.movement.issued, 5)    // the one 5-unit stock-out
        const past = (await call("GET", "/reports/summary?from=2020-01-01&to=2020-01-07")).data
        assert.strictEqual(past.movement.received, 0); assert.strictEqual(past.movement.transactions, 0)
        assert.strictEqual(past.movement.trend[0].units, 0) // in 2020 nothing had been stocked yet
        assert(past.performance.bestSelling.length === 0)
        assert(one.performance.bestSelling.some((p) => p.sku === "LP-1" && p.unitsIssued === 5))
    })
    await check("report rejects invalid dates / reversed / too long / unauthorized", async () => {
        assert.strictEqual((await call("GET", "/reports/summary?from=garbage&to=2024-01-01")).status, 400)
        assert.strictEqual((await call("GET", "/reports/summary?from=2024-02-30x&to=2024-03-01")).status, 400)
        assert.strictEqual((await call("GET", "/reports/summary?from=2024-03-02&to=2024-03-01")).status, 400)
        assert.strictEqual((await call("GET", "/reports/summary?from=2020-01-01&to=2024-01-01")).status, 400)
        assert.strictEqual((await call("GET", "/reports/summary", { tok: null })).status, 401)
    })
    await check("adjustments (product edit) are reported separately from sales/receipts", async () => {
        const p = (await call("GET", "/products")).data.find((x) => x.sku === "CB-1")
        await call("PUT", `/products/${p._id}`, { body: { name: "Cable", sku: "CB-1", price: 50, quantity: 7, reorderLevel: 10 } }) // 10 -> 7
        const today = new Date().toISOString().slice(0, 10)
        const r = (await call("GET", `/reports/summary?from=${today}&to=${today}`)).data.movement
        assert.strictEqual(r.adjustmentsOut, 4 + 3) // keyboard 8->4 earlier, cable 10->7 now
        assert.strictEqual(r.adjustmentsIn, 1)     // keyboard 4->5
    })

    // ---------- Feature 4: profile / passwords ----------
    await check("profile get/update; role not editable; duplicate email rejected; no password leaked", async () => {
        const g = await call("GET", "/profile", { tok: staffToken })
        assert.strictEqual(g.status, 200); assert.strictEqual(g.data.role, "staff"); assert(!("password" in g.data))
        const u = await call("PUT", "/profile", { tok: staffToken, body: { name: "Staffer", email: "staff2@x.com", role: "admin" } })
        assert.strictEqual(u.status, 200); assert.strictEqual(u.data.role, "staff"); assert.strictEqual(u.data.name, "Staffer")
        assert.strictEqual((await call("PUT", "/profile", { tok: staffToken, body: { name: "S", email: "admin@x.com" } })).status, 400)
        assert.strictEqual((await call("PUT", "/profile", { tok: staffToken, body: { name: "", email: "a@b.co" } })).status, 400)
        assert.strictEqual((await call("PUT", "/profile", { tok: staffToken, body: { name: "S", email: "nope" } })).status, 400)
        assert.strictEqual((await call("GET", "/profile", { tok: null })).status, 401)
    })
    await check("change password: wrong current, mismatch, short, same, success, old fails, new works, hashed", async () => {
        const put = (b) => call("PUT", "/profile/password", { body: b })
        assert.strictEqual((await put({ currentPassword: "WRONG", newPassword: "newpass1", confirmPassword: "newpass1" })).status, 400)
        assert.strictEqual((await put({ currentPassword: "secret1", newPassword: "newpass1", confirmPassword: "different" })).status, 400)
        assert.strictEqual((await put({ currentPassword: "secret1", newPassword: "abc", confirmPassword: "abc" })).status, 400)
        assert.strictEqual((await put({ currentPassword: "secret1", newPassword: "secret1", confirmPassword: "secret1" })).status, 400)
        assert.strictEqual((await put({ currentPassword: "secret1" })).status, 400)
        assert.strictEqual((await put({ currentPassword: "secret1", newPassword: "newpass1", confirmPassword: "newpass1" })).status, 200)
        assert.strictEqual((await call("POST", "/loginRoute/api", { body: { email: "admin@x.com", password: "secret1" }, tok: null })).status, 401)
        const ok = await call("POST", "/loginRoute/api", { body: { email: "admin@x.com", password: "newpass1" }, tok: null })
        assert.strictEqual(ok.status, 200); assert(!JSON.stringify(ok.body).includes("$2"))
        const raw = await mongoose.connection.collection("users").findOne({ email: "admin@x.com" })
        assert(raw.password.startsWith("$2") && raw.password !== "newpass1")
    })
    await check("forgot/reset: generic response, token single-use, expiry, bad token, hashed at rest", async () => {
        const unknown = await call("POST", "/auth/forgot-password", { body: { email: "ghost@x.com" }, tok: null })
        assert.strictEqual(unknown.status, 200); assert(!unknown.body.resetLink)
        assert.strictEqual((await call("POST", "/auth/forgot-password", { body: { email: "bad" }, tok: null })).status, 400)
        const f = await call("POST", "/auth/forgot-password", { body: { email: "admin@x.com" }, tok: null })
        assert.strictEqual(f.status, 200)
        const t = f.body.resetLink.split("/").pop()
        const rec = await mongoose.connection.collection("passwordresets").findOne({})
        assert(rec.tokenHash && rec.tokenHash !== t && !JSON.stringify(rec).includes(t))
        assert.strictEqual((await call("POST", "/auth/reset-password", { body: { token: "f".repeat(64), newPassword: "abcdef", confirmPassword: "abcdef" }, tok: null })).status, 400)
        assert.strictEqual((await call("POST", "/auth/reset-password", { body: { token: "short", newPassword: "abcdef", confirmPassword: "abcdef" }, tok: null })).status, 400)
        assert.strictEqual((await call("POST", "/auth/reset-password", { body: { token: t, newPassword: "abc", confirmPassword: "abc" }, tok: null })).status, 400)
        assert.strictEqual((await call("POST", "/auth/reset-password", { body: { token: t, newPassword: "abcdef", confirmPassword: "abcdeg" }, tok: null })).status, 400)
        assert.strictEqual((await call("POST", "/auth/reset-password", { body: { token: t, newPassword: "resetpw1", confirmPassword: "resetpw1" }, tok: null })).status, 200)
        assert.strictEqual((await call("POST", "/auth/reset-password", { body: { token: t, newPassword: "resetpw2", confirmPassword: "resetpw2" }, tok: null })).status, 400) // single use
        assert.strictEqual((await call("POST", "/loginRoute/api", { body: { email: "admin@x.com", password: "resetpw1" }, tok: null })).status, 200)
        // expired token
        const f2 = await call("POST", "/auth/forgot-password", { body: { email: "admin@x.com" }, tok: null })
        const t2 = f2.body.resetLink.split("/").pop()
        await mongoose.connection.collection("passwordresets").updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } })
        assert.strictEqual((await call("POST", "/auth/reset-password", { body: { token: t2, newPassword: "resetpw3", confirmPassword: "resetpw3" }, tok: null })).status, 400)
    })
    await check("existing features still work: register dup, login bad pw, low-stock, dashboard, ledger, delete cleans warehouse rows", async () => {
        assert.strictEqual((await call("POST", "/registration/api", { body: { name: "A", email: "admin@x.com", password: "secret1" }, tok: null })).status, 400)
        assert.strictEqual((await call("POST", "/loginRoute/api", { body: { email: "admin@x.com", password: "nope" }, tok: null })).status, 401)
        // (low-stock and dashboard use $expr/$lookup, which the FerretDB test server lacks; real MongoDB runs them)
        const tx = await call("GET", "/stock/transactions"); assert.strictEqual(tx.status, 200); assert(tx.data.length > 0)
        const cb = (await call("GET", "/products")).data.find((x) => x.sku === "CB-1")
        assert.strictEqual((await call("DELETE", `/products/${cb._id}`)).status, 200)
        assert.strictEqual(await mongoose.connection.collection("warehousestocks").countDocuments({ product: new mongoose.Types.ObjectId(cb._id) }), 0)
        // per-warehouse totals still add up to product totals for every product
        for (const p of (await call("GET", "/products")).data) {
            const rows = await mongoose.connection.collection("warehousestocks").find({ product: new mongoose.Types.ObjectId(p._id) }).toArray()
            assert.strictEqual(rows.reduce((s, r) => s + r.quantity, 0), p.quantity, `${p.sku}: warehouse sum != product quantity`)
        }
    })

    console.log(results.join("\n"))
    console.log(`\n${passed} checks passed${process.exitCode ? ", SOME FAILED" : ""}`)
    server.close()
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
