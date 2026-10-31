const Product = require("../../Models/ProductSchema/product")
const StockTransaction = require("../../Models/StockTransactionSchema/stockTransaction")

const DAY = 24 * 60 * 60 * 1000
const dayKey = (d) => d.toISOString().slice(0, 10)

// ?from=YYYY-MM-DD&to=YYYY-MM-DD  (both inclusive, UTC days). Defaults to the last 30 days.
function parseRange(query) {
    const today = new Date(); today.setUTCHours(0, 0, 0, 0)
    let from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date(today.getTime() - 29 * DAY)
    let to = query.to ? new Date(`${query.to}T00:00:00.000Z`) : today
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(query.from || "2000-01-01") || !/^\d{4}-\d{2}-\d{2}$/.test(query.to || "2000-01-01")) {
        return { error: "Invalid date. Use YYYY-MM-DD" }
    }
    if (from > to) return { error: "Start date must be on or before the end date" }
    const days = Math.round((to - from) / DAY) + 1
    if (days > 366) return { error: "Date range cannot be longer than 366 days" }
    return { from, toExclusive: new Date(to.getTime() + DAY), to, days }
}

const getSummary = async (req, res) => {
    try {
        const range = parseRange(req.query)
        if (range.error) return res.status(400).json({ message: range.error })
        const { from, toExclusive, to, days } = range

        const products = await Product.find().populate("category", "name").lean()

        // ---- inventory snapshot (right now) ----
        const totalValue = products.reduce((s, p) => s + p.price * p.quantity, 0)
        const totalUnits = products.reduce((s, p) => s + p.quantity, 0)
        const slim = (p) => ({ _id: p._id, name: p.name, sku: p.sku, quantity: p.quantity, reorderLevel: p.reorderLevel, unit: p.unit, value: p.price * p.quantity })
        const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= p.reorderLevel).sort((a, b) => a.quantity - b.quantity).map(slim)
        const outOfStock = products.filter((p) => p.quantity === 0).map(slim)

        const byCat = new Map()
        for (const p of products) {
            const name = p.category ? p.category.name : "Uncategorised"
            const row = byCat.get(name) || { category: name, products: 0, units: 0, value: 0 }
            row.products += 1; row.units += p.quantity; row.value += p.price * p.quantity
            byCat.set(name, row)
        }
        const stockByCategory = [...byCat.values()].sort((a, b) => b.value - a.value)

        const highestValue = [...products].map(slim).sort((a, b) => b.value - a.value).slice(0, 8)

        // ---- movement: one ledger query from the start of the range, bucketed in JS ----
        // (range is capped at 366 days, so this stays small and works on any MongoDB-compatible server)
        const ledger = await StockTransaction.find({ createdAt: { $gte: from } }).select("product type quantity reason createdAt").lean()

        const movement = { received: 0, issued: 0, adjustmentsIn: 0, adjustmentsOut: 0, transactions: 0 }
        const daily = []
        for (let i = 0; i < days; i++) {
            daily.push({ date: dayKey(new Date(from.getTime() + i * DAY)), inUnits: 0, outUnits: 0 })
        }
        const dayIndex = new Map(daily.map((d) => [d.date, d]))
        const netByDay = new Map()        // net units per day (for the trend), including days after the range
        const issuedMap = new Map()       // product -> units issued/sold inside the range
        const endKey = dayKey(to)

        for (const t of ledger) {
            const key = dayKey(t.createdAt)
            const signed = t.type === "IN" ? t.quantity : -t.quantity
            netByDay.set(key, (netByDay.get(key) || 0) + signed)
            if (t.createdAt >= toExclusive) continue // only used for the trend baseline

            movement.transactions += 1
            const d = dayIndex.get(key)
            if (d) { if (t.type === "IN") d.inUnits += t.quantity; else d.outUnits += t.quantity }

            if (t.reason === "adjustment") {
                if (t.type === "IN") movement.adjustmentsIn += t.quantity; else movement.adjustmentsOut += t.quantity
            } else if (t.type === "IN") {
                movement.received += t.quantity
            } else {
                movement.issued += t.quantity
                issuedMap.set(String(t.product), (issuedMap.get(String(t.product)) || 0) + t.quantity)
            }
        }

        // inventory trend: walk backwards from today's total, undoing every movement after each day
        let netAfterEnd = 0
        for (const [day, net] of netByDay) { if (day > endKey) netAfterEnd += net }
        let level = totalUnits - netAfterEnd // stock at the end of the last day in range
        const trend = new Array(days)
        for (let i = days - 1; i >= 0; i--) {
            trend[i] = { date: daily[i].date, units: level }
            level -= netByDay.get(daily[i].date) || 0
        }

        // ---- product performance (units issued inside the range) ----
        const perf = products.map((p) => ({ ...slim(p), unitsIssued: issuedMap.get(String(p._id)) || 0 }))
        const bestSelling = perf.filter((p) => p.unitsIssued > 0).sort((a, b) => b.unitsIssued - a.unitsIssued).slice(0, 8)
        // slow-moving: stock on hand but little or no outflow in the period
        const slowMoving = perf.filter((p) => p.quantity > 0).sort((a, b) => a.unitsIssued - b.unitsIssued || b.value - a.value).slice(0, 8)

        res.json({
            message: "Report Generated Successfully",
            data: {
                range: { from: dayKey(from), to: dayKey(to), days },
                inventory: { totalProducts: products.length, totalUnits, totalValue, lowStockCount: lowStock.length, outOfStockCount: outOfStock.length, lowStock: lowStock.slice(0, 10), outOfStock: outOfStock.slice(0, 10), stockByCategory },
                performance: { bestSelling, slowMoving, highestValue },
                movement: { ...movement, daily, trend }
            }
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to generate report" })
    }
}

module.exports = { getSummary }
