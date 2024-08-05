// src/fluent.ts
function fluent(apiStructure) {
  const createProxy = (parentCalls = [], currentPath = [], currentTarget = apiStructure) => {
    const calls = [...parentCalls];
    const handler = {
      get(_, prop) {
        if (prop === "toJSON") {
          return () => calls;
        }
        if (typeof prop === "string") {
          const newPath = [...currentPath, prop];
          const fullPath = newPath.join(".");
          const isNamespace = typeof currentTarget[prop] === "object";
          if (isNamespace) {
            return createProxy(calls, newPath, currentTarget[prop]);
          } else {
            if (prop in apiStructure) {
              return createProxy(calls, [prop], apiStructure[prop]);
            }
            calls.push({ method: fullPath });
            const proxy2 = new Proxy(function(...args) {
              calls[calls.length - 1].args = args;
              return createProxy(calls, currentPath, currentTarget);
            }, handler);
            return proxy2;
          }
        }
        return void 0;
      }
    };
    const isFunction = typeof currentTarget === "function";
    const func = isFunction ? (...args) => {
      calls.push({ method: currentPath.join("."), args });
      return createProxy(calls, currentPath, currentTarget);
    } : () => {
    };
    const proxy = new Proxy(func, handler);
    proxy.toJSON = () => calls;
    return proxy;
  };
  const rootProxy = new Proxy({}, {
    get(_, prop) {
      if (prop === "toJSON") {
        return () => [];
      }
      return createProxy([], [prop], apiStructure[prop]);
    }
  });
  rootProxy.toJSON = () => [];
  return rootProxy;
}
var run = ({ op, ctx: _ctx, api }) => {
  const config = typeof op === "string" ? JSON.parse(op) : JSON.parse(JSON.stringify(op));
  const ctx = _ctx;
  if (!ctx.run && !ctx.ops) {
    Object.defineProperties(ctx, {
      run: {
        value: (op2) => run({ op: op2, ctx, api }),
        enumerable: false,
        writable: false,
        configurable: false
      },
      ops: {
        value: [],
        enumerable: true,
        writable: false,
        configurable: false
      }
    });
  }
  const executeOperation = (item) => {
    const { method: path, args = [] } = item;
    const splitPath = path.split(".");
    const method = splitPath.reduce((acc, key) => acc[key], api);
    return method(ctx, ...args);
  };
  const executeChain = async (startIndex) => {
    for (let i = startIndex; i < config.length; i++) {
      const result = executeOperation(config[i]);
      if (result instanceof Promise) {
        const resolvedResult = await result;
        ctx.ops.push({ path: config[i].method, args: config[i].args, result: resolvedResult });
      } else {
        ctx.ops.push({ path: config[i].method, args: config[i].args, result });
      }
    }
    return ctx;
  };
  for (let i = 0; i < config.length; i++) {
    const result = executeOperation(config[i]);
    if (result instanceof Promise) {
      return executeChain(i).then(() => ctx);
    } else {
      ctx.ops.push({ path: config[i].method, args: config[i].args, result });
    }
  }
  return ctx;
};
export {
  fluent,
  run
};
//# sourceMappingURL=index.mjs.map