class timeoutManager {
    constructor() {
        this.timeouts = new Map(); // userId -> timeout
    }

    set(userId, callback, delay) {
        this.clear(userId); // Clear old timeout first
        const timeout = setTimeout(() => {
            this.timeouts.delete(userId);
            callback();
        }, delay);
        this.timeouts.set(userId, timeout);
    }

    clear(userId) {
        if (this.timeouts.has(userId)) {
            clearTimeout(this.timeouts.get(userId));
            this.timeouts.delete(userId);
        }
    }
}

module.exports = new timeoutManager();