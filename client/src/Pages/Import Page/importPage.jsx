import { useRef, useState } from "react"
import { Link } from "react-router-dom"
import Layout from "../../Components/Navbar/layout"
import styles from "../../Styles/page.module.css"
import api, { getErrorMessage } from "../../utils/api"
import { downloadCsv, parseCsv } from "../../utils/csv"
import { useToast } from "../../Components/Toast/toastContext"

const MAX_BYTES = 1024 * 1024
const MAX_ROWS = 2000

// accepted header spellings -> internal field
const ALIASES = {
    name: ["name", "product name", "product", "productname"],
    sku: ["sku", "product sku", "code"],
    category: ["category", "category name"],
    supplier: ["supplier", "supplier name"],
    quantity: ["quantity", "qty", "stock", "opening stock"],
    price: ["price", "unit price", "cost"],
    reorderLevel: ["minimum stock level", "min stock", "min stock level", "reorder level", "reorderlevel", "minimum stock"],
    unit: ["unit", "uom"]
}

function ImportPage() {
    const showToast = useToast()
    const fileRef = useRef(null)
    const [fileName, setFileName] = useState("")
    const [rows, setRows] = useState([])          // parsed objects
    const [preview, setPreview] = useState(null)  // server validation
    const [result, setResult] = useState(null)    // import summary
    const [error, setError] = useState("")
    const [busy, setBusy] = useState(false)

    function reset() {
        setFileName(""); setRows([]); setPreview(null); setResult(null); setError("")
        if (fileRef.current) fileRef.current.value = ""
    }

    function downloadTemplate() {
        downloadCsv("product-import-template.csv",
            ["Name", "SKU", "Category", "Quantity", "Price", "Supplier", "Minimum Stock Level", "Unit"],
            [["Wireless Keyboard", "KB-100", "Electronics", 50, 799, "", 10, "pcs"]])
    }

    async function handleFile(e) {
        const file = e.target.files[0]
        setPreview(null); setResult(null); setRows([]); setError("")
        if (!file) return
        setFileName(file.name)
        if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") return setError("Please choose a .csv file")
        if (file.size > MAX_BYTES) return setError("File is too large (max 1 MB)")

        setBusy(true)
        try {
            const matrix = parseCsv(await file.text())
            if (matrix.length === 0) throw new Error("The file is empty")
            const headers = matrix[0].map((h) => h.trim().toLowerCase())
            const index = {}
            for (const [field, names] of Object.entries(ALIASES)) index[field] = headers.findIndex((h) => names.includes(h))
            if (index.name < 0 || index.sku < 0) throw new Error("The header row must include at least Name and SKU columns")

            // fully empty lines are skipped; the others keep their spreadsheet row number for error messages
            const data = matrix
                .map((cells, n) => ({ cells, rowNumber: n + 1 }))   // spreadsheet row number (header = 1)
                .slice(1)
                .filter(({ cells }) => cells.some((c) => c.trim() !== ""))
                .map(({ cells, rowNumber }) => ({ rowNumber, ...Object.fromEntries(Object.entries(index).map(([field, i]) => [field, i >= 0 ? (cells[i] ?? "").trim() : ""])) }))
            if (data.length === 0) throw new Error("The file has a header but no data rows")
            if (data.length > MAX_ROWS) throw new Error(`Too many rows (${data.length}). Import up to ${MAX_ROWS} at a time`)

            setRows(data)
            const res = await api.post("/products/import/preview", { rows: data })
            setPreview(res.data.data)
        } catch (err) {
            setError(err.response ? getErrorMessage(err, "Unable to validate the file") : err.message)
        } finally {
            setBusy(false)
        }
    }

    async function handleImport() {
        setBusy(true); setError("")
        try {
            const res = await api.post("/products/import", { rows })
            const summary = res.data.data
            setResult(summary)
            showToast(`${summary.imported} product${summary.imported === 1 ? "" : "s"} imported`)
        } catch (err) {
            setError(getErrorMessage(err, "Import failed"))
        } finally {
            setBusy(false)
        }
    }

    function downloadErrors(list) {
        downloadCsv("import-errors.csv", ["Row", "SKU", "Errors"], list.map((r) => [r.row, r.sku || "", r.errors.join("; ")]))
    }

    const invalidRows = preview ? preview.rows.filter((r) => r.errors.length > 0) : []

    return (
        <Layout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Import Products</h1>
                        <p className={styles.pageSubtitle}>Upload a CSV to add many products at once</p>
                    </div>
                    <div className={styles.headerActions}>
                        <Link to="/products"><button className={styles.secondaryBtn}>Back to Products</button></Link>
                        <button className={styles.secondaryBtn} onClick={downloadTemplate}>Download Template</button>
                    </div>
                </div>

                {!result && (
                    <div className={styles.dropZone}>
                        <p style={{ margin: "0 0 12px 0" }}>Columns: <strong>Name</strong>, <strong>SKU</strong> (required) · Category, Quantity, Price, Supplier, Minimum Stock Level, Unit (optional)</p>
                        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} disabled={busy} />
                        <p className={styles.mutedText} style={{ marginBottom: 0 }}>Max 1 MB / {MAX_ROWS} rows. New categories are created automatically; suppliers must already exist. Quantities go into the default warehouse.</p>
                    </div>
                )}

                {error && <div className={styles.errorBox} style={{ marginTop: 16 }}><span>{error}</span></div>}
                {busy && <p className={styles.emptyState}>Working...</p>}

                {preview && !result && (
                    <div style={{ marginTop: 20 }}>
                        <div className={styles.statGrid}>
                            <div className={styles.statCard}><p className={styles.statLabel}>Rows in file</p><p className={styles.statValue}>{preview.total}</p></div>
                            <div className={styles.statCard}><p className={styles.statLabel}>Ready to import</p><p className={styles.statValue} style={{ color: "#1a7f37" }}>{preview.valid}</p></div>
                            <div className={styles.statCard}><p className={styles.statLabel}>With errors</p><p className={`${styles.statValue} ${preview.invalid ? styles.statValueAlert : ""}`}>{preview.invalid}</p></div>
                        </div>

                        <div className={styles.headerActions} style={{ marginBottom: 16 }}>
                            <button className={styles.primaryBtn} onClick={handleImport} disabled={busy || preview.valid === 0}>
                                Import {preview.valid} valid product{preview.valid === 1 ? "" : "s"}
                            </button>
                            <button className={styles.secondaryBtn} onClick={reset} disabled={busy}>Choose another file</button>
                            {invalidRows.length > 0 && <button className={styles.secondaryBtn} onClick={() => downloadErrors(invalidRows.map((r) => ({ row: r.row, sku: r.data.sku, errors: r.errors })))}>Download errors</button>}
                        </div>
                        {preview.invalid > 0 && <p className={styles.mutedText}>Rows with errors will be skipped; only valid rows are imported.</p>}

                        <p className={styles.resultCount}>{fileName} — showing first {Math.min(preview.rows.length, 200)} of {preview.rows.length} rows</p>
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead><tr><th>Row</th><th>Name</th><th>SKU</th><th>Category</th><th>Qty</th><th>Price</th><th>Min</th><th>Result</th></tr></thead>
                                <tbody>
                                    {preview.rows.slice(0, 200).map((r) => (
                                        <tr key={r.row} className={r.errors.length ? styles.rowError : ""}>
                                            <td className={styles.mono}>{r.row}</td>
                                            <td>{r.data.name || "—"}</td>
                                            <td className={styles.mono}>{r.data.sku || "—"}</td>
                                            <td>{r.data.categoryName || "—"}{r.isNewCategory && r.errors.length === 0 && <span className={`${styles.badge} ${styles.badgeInfo}`} style={{ marginLeft: 6 }}>new</span>}</td>
                                            <td className={styles.mono}>{r.data.quantity}</td>
                                            <td className={styles.mono}>₹{r.data.price}</td>
                                            <td className={styles.mono}>{r.data.reorderLevel}</td>
                                            <td style={{ whiteSpace: "normal", minWidth: 220 }}>
                                                {r.errors.length === 0 ? <span className={`${styles.badge} ${styles.badgeOk}`}>Valid</span> : <span className={styles.dangerText}>{r.errors.join("; ")}</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {result && (
                    <div style={{ marginTop: 8 }}>
                        <div className={result.failed.length ? styles.card : styles.successBox}>
                            <p style={{ margin: 0, fontSize: 16 }}><strong>Successfully imported: {result.imported}</strong></p>
                            <p style={{ margin: "6px 0 0 0", fontSize: 16 }} className={result.failed.length ? styles.dangerText : ""}><strong>Failed: {result.failed.length}</strong></p>
                        </div>
                        {result.failed.length > 0 && (
                            <>
                                <h3 className={styles.cardTitle} style={{ marginTop: 20 }}>Failed rows</h3>
                                <div className={styles.tableWrap}>
                                    <table className={styles.table}>
                                        <thead><tr><th>Row</th><th>SKU</th><th>Reason</th></tr></thead>
                                        <tbody>
                                            {result.failed.map((f) => <tr key={f.row}><td className={styles.mono}>{f.row}</td><td className={styles.mono}>{f.sku || "—"}</td><td style={{ whiteSpace: "normal" }}>{f.errors.join("; ")}</td></tr>)}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                        <div className={styles.headerActions} style={{ marginTop: 20 }}>
                            <Link to="/products"><button className={styles.primaryBtn}>View Products</button></Link>
                            {result.failed.length > 0 && <button className={styles.secondaryBtn} onClick={() => downloadErrors(result.failed)}>Download errors</button>}
                            <button className={styles.secondaryBtn} onClick={reset}>Import another file</button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}

export default ImportPage
