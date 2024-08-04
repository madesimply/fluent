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
function isPromise(value) {
  return value instanceof Promise;
}
var run = ({ ops, ctx, api }) => {
  const config = JSON.parse(JSON.stringify(ops));
  Object.defineProperty(ctx, "api", {
    value: api,
    enumerable: false,
    writable: false,
    configurable: false
  });
  let hasPromise = false;
  const results = config.map((item) => {
    const { method: path, args = [] } = item;
    const splitPath = path.split(".");
    const method = splitPath.reduce((acc, key) => acc[key], api);
    const result = method(ctx, ...args);
    if (isPromise(result)) {
      hasPromise = true;
    }
    return result;
  });
  if (hasPromise) {
    return Promise.all(results).then(() => {
      return ctx;
    });
  }
  return ctx;
};
export {
  fluent,
  run
};
//# sourceMappingURL=index.mjs.map