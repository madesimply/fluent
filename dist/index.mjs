// src/fluent.ts
function fluent(apiStructure) {
  const createProxy = (parentCalls = [], path = []) => {
    const calls = [...parentCalls];
    const handler = {
      get(_, prop) {
        if (prop === "toJSON") return () => calls;
        if (typeof prop !== "string") return void 0;
        const baseTarget = prop in apiStructure ? apiStructure[prop] : void 0;
        const newPath = baseTarget ? [prop] : [...path, prop];
        const fullPath = newPath.join(".");
        const target = baseTarget || newPath.reduce((acc, key) => acc[key], apiStructure);
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
  return createProxy();
}
var run = async ({
  op,
  ctx,
  api
}) => {
  const config = typeof op === "string" ? JSON.parse(op) : JSON.parse(JSON.stringify(op));
  ctx = ctx;
  const runHelper = async (op2) => {
    return await run({ op: op2, ctx, api });
  };
  const executeOperation = async (item) => {
    const { method: path, args = [] } = item;
    const splitPath = path.split(".");
    const method = splitPath.reduce((acc, key) => acc[key], api);
    return method({ ctx, run: runHelper, api }, ...args);
  };
  for (let i = 0; i < config.length; i++) {
    await executeOperation(config[i]);
  }
  return ctx;
};
var parseOp = (op, fluent2) => {
  const config = typeof op === "string" ? JSON.parse(op) : op;
  let current = fluent2;
  for (const { method, args } of config) {
    const methods = method.split(".");
    for (const m of methods) {
      if (methods.indexOf(m) === methods.length - 1) {
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
  parseOp,
  run
};
//# sourceMappingURL=index.mjs.map