// Single place to read the JWT secret so login and auth middleware always agree.
function getJwtSecret() {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not set. Copy .env.example to .env and set it.")
    }
    return process.env.JWT_SECRET
}

module.exports = getJwtSecret
