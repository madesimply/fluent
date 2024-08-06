var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  fluent: () => fluent,
  parseOp: () => parseOp,
  run: () => run
});
module.exports = __toCommonJS(src_exports);

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
    if (isFunction && currentTarget.length === 1) {
      calls.push({ method: currentPath.join(".") });
    }
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
var run = async ({ op, ctx, api }) => {
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
  const config = JSON.parse(op);
  let current = fluent2;
  for (const { method, args } of config) {
    const methods = method.split(".");
    for (const m of methods) {
      current = current[m];
    }
    if (args) {
      current = current(...args);
    }
  }
  return current;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  fluent,
  parseOp,
  run
});
//# sourceMappingURL=index.js.map