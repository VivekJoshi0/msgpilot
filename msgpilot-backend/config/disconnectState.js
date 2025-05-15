// config/disconnectState.js

const disconnectingClients = new Set();

const addDisconnectingClient = (userId) => disconnectingClients.add(userId);
const removeDisconnectingClient = (userId) => disconnectingClients.delete(userId);
const isDisconnecting = (userId) => disconnectingClients.has(userId);

module.exports = {
    addDisconnectingClient,
    removeDisconnectingClient,
    isDisconnecting
};
