// WebSocket connection manager
const connections = new Map();

export const connectionManager = {
  add(debateId, ws) {
    if (!connections.has(debateId)) {
      connections.set(debateId, []);
    }
    connections.get(debateId).push(ws);
  },

  remove(debateId, ws) {
    const conns = connections.get(debateId);
    if (conns) {
      const index = conns.indexOf(ws);
      if (index > -1) conns.splice(index, 1);
      if (conns.length === 0) connections.delete(debateId);
    }
  },

  broadcast(debateId, message) {
    const conns = connections.get(debateId);
    if (conns) {
      conns.forEach(ws => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(JSON.stringify(message));
        }
      });
    }
  },
};

