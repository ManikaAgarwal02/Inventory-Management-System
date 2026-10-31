const ActivityLog = require("../../Models/ActivityLogSchema/activityLog")

const getActivityLogs = async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200)
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1)

        const filter = {}
        if (typeof req.query.entity === "string" && req.query.entity) {
            filter.entity = req.query.entity
        }

        const [logs, total] = await Promise.all([
            ActivityLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
            ActivityLog.countDocuments(filter)
        ])

        res.json({ message: "Activity Logs Fetched Successfully", data: logs, total, page, limit })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Unable to fetch activity logs" })
    }
}

module.exports = { getActivityLogs }
