// src/fluent.ts
function fluent(api) {
  let chain = null;
  const createProxy = (parentCalls = [], path = []) => {
    const calls = [...parentCalls];
    const run = (ctx) => {
      const executeAsyncOps = async (firstPromise, atIndex) => {
        await firstPromise;
        return Promise.all(
          calls.slice(atIndex + 1).map(async (item) => {
            return executeOp(item);
          })
        ).then(() => ctx);
      };
      const executeOp = (item) => {
        const { method: path2, args = [] } = item;
        const splitPath = path2.split(".");
        const method = splitPath.reduce((acc, key) => acc[key], api);
        return method({ ctx, chain }, ...args);
      };
      for (let i = 0; i < calls.length; i++) {
        const result = executeOp(calls[i]);
        if (result instanceof Promise) {
          return executeAsyncOps(result, i);
        }
      }
      return ctx;
    };
    const handler = {
      get(_, prop) {
        if (prop === "run") return run;
        if (prop === "toJSON") return () => calls;
        if (typeof prop !== "string") return void 0;
        const baseTarget = prop in api ? api[prop] : void 0;
        const newPath = baseTarget ? [prop] : [...path, prop];
        const fullPath = newPath.join(".");
        const target = baseTarget || newPath.reduce((acc, key) => acc[key], api);
        if (typeof target === "object") {
          return createProxy(calls, newPath);
        }
        if (typeof target === "function") {
          const func = target;
          if (func.length <= 1) {
            return createProxy([...calls, { method: fullPath }], path);
          }
          return (...args) => {
            return createProxy([...calls, { method: fullPath, args }], path);
          };
        }
        return void 0;
      }
    };
    return new Proxy(() => {
    }, handler);
  };
  chain = createProxy();
  return chain;
}
var toChain = (op, fluent2) => {
  const config = typeof op === "string" ? JSON.parse(op) : JSON.parse(JSON.stringify(op));
  let current = fluent2;
  for (const { method, args } of config) {
    const methods = method.split(".");
    for (const m of methods) {
      if (methods.indexOf(m) === methods.length - 1 && (args == null ? void 0 : args.length)) {
        current = current[m](...args || []);
        continue;
      }
      current = current[m];
    }
  }
  return current;
};
export {
  fluent,
  toChain
};
//# sourceMappingURL=index.js.map