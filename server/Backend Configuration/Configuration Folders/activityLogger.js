const ActivityLog = require("../Models/ActivityLogSchema/activityLog")

// Fire-and-forget audit trail. Logging must never break the request it describes.
async function logActivity(req, action, entity, entityId, summary) {
    try {
        await ActivityLog.create({
            user: req.user ? req.user.id : undefined,
            userName: req.user ? req.user.name : "",
            action,
            entity,
            entityId: entityId ? String(entityId) : "",
            summary: String(summary || "").slice(0, 300)
        })
    } catch (error) {
        console.log("Activity log failed:", error.message)
    }
}

module.exports = logActivity
