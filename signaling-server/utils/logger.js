module.exports = {
    info: (...args) => console.log("[INFO]", ...args),
    warn: (...args) => console.log("[WARN]", ...args),
    error: (...args) => console.log("[ERROR]", ...args),
};