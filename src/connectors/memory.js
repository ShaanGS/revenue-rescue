/** A deterministic connector used by the demo and automated reliability tests. */
export function createMemoryConnector(name, { failVerificationFor } = {}) {
  const writes = new Map();

  return {
    name,
    writes,
    async execute(action, idempotencyKey) {
      if (!writes.has(idempotencyKey)) {
        writes.set(idempotencyKey, {
          id: `${name}-${writes.size + 1}`,
          connector: name,
          action: action.type,
          idempotencyKey
        });
      }
      return writes.get(idempotencyKey);
    },
    async verify(receipt) {
      return receipt.action !== failVerificationFor && writes.has(receipt.idempotencyKey);
    }
  };
}

export function createDemoConnectors(options = {}) {
  return Object.fromEntries(['linear', 'slack', 'gmail', 'calendar', 'hubspot'].map((name) => [name, createMemoryConnector(name, options[name])])) ;
}
