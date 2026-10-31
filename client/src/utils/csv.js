// Downloads an array of rows (arrays of values) as a .csv file.
export function csvCell(value) {
    let text = String(value ?? "")
    // Stop spreadsheet formula injection: a cell starting with = + - @ (or tab/CR) would be
    // executed by Excel/Sheets. Prefix with an apostrophe; plain negative numbers are left alone.
    if (typeof value !== "number" && /^[=+\-@\t\r]/.test(text)) text = "'" + text
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function downloadCsv(filename, headers, rows) {
    const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","))
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    // revoking immediately can cancel the download in some browsers
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, commas/newlines inside quotes).
// Returns an array of rows (arrays of strings). No dependency needed.
export function parseCsv(text) {
    const rows = []
    let row = []
    let field = ""
    let inQuotes = false
    const src = text.replace(/^\uFEFF/, "")

    for (let i = 0; i < src.length; i++) {
        const ch = src[i]
        if (inQuotes) {
            if (ch === '"') {
                if (src[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
            } else field += ch
        } else if (ch === '"') {
            inQuotes = true
        } else if (ch === ",") {
            row.push(field); field = ""
        } else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && src[i + 1] === "\n") i++
            row.push(field); field = ""
            rows.push(row); row = []
        } else field += ch
    }
    if (inQuotes) throw new Error("The file has an unclosed quote (\")")
    if (field !== "" || row.length) { row.push(field); rows.push(row) }
    return rows
}
