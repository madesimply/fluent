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
  fluent: () => fluent
});
module.exports = __toCommonJS(src_exports);

// src/fluent.ts
function isObject(value) {
  return typeof value === "object" && value !== null;
}
function isChainItem(item) {
  return typeof item === "object" && item !== null && "method" in item && typeof item.method === "string" && "args" in item && Array.isArray(item.args);
}
function isFluent(value) {
  return typeof value === "object" && value !== null && "chain" in value && Array.isArray(value.chain);
}
function processArgument(arg, api2, ctx) {
  if (isFluent(arg)) {
    return fluent({ api: api2, chain: arg.chain, ctx });
  }
  if (Array.isArray(arg)) {
    return arg.map((item) => processArgument(item, api2, ctx));
  }
  if (isChainItem(arg)) {
    return {
      ...arg,
      args: arg.args.map((a) => processArgument(a, api2, ctx))
    };
  }
  if (typeof arg === "object" && arg !== null) {
    const processedArg = {};
    for (const key in arg) {
      processedArg[key] = processArgument(arg[key], api2, ctx);
    }
    return processedArg;
  }
  return arg;
}
function chainItemToString(item) {
  const args = item.args.map((arg) => JSON.stringify(arg)).join(", ");
  return `${item.method}(${args})`;
}
function createProxy(rootApi, currentApi, currentChain, path, options) {
  const target = {
    chain: currentChain,
    run: (data) => runChain(rootApi, data, currentChain, options),
    goto: (fluentProxy) => {
      if (!isFluent(fluentProxy) || fluentProxy.chain.length === 0) {
        throw new Error("Goto must receive a non-empty Fluent");
      }
      return createProxy(rootApi, currentApi, [...currentChain, ...fluentProxy.chain], path, options);
    },
    toString: () => currentChain.map(chainItemToString).join(".").replace(/\.$/, "")
  };
  return new Proxy(target, {
    get(target2, prop) {
      if (prop in target2) {
        return target2[prop];
      }
      let nextApi;
      let nextPath;
      if (isObject(currentApi) && prop in currentApi) {
        nextApi = currentApi[prop];
        nextPath = `${path}${path ? "." : ""}${prop}`;
      } else if (isObject(rootApi) && prop in rootApi) {
        nextApi = rootApi[prop];
        nextPath = prop;
      } else {
        return void 0;
      }
      if (typeof nextApi === "function") {
        return (...args) => {
          const method = nextPath;
          const constArgs = { args };
          const newChain = [
            ...currentChain,
            {
              method,
              args: constArgs.args,
              data: {},
              // Placeholder for data type
              return: {}
              // Placeholder for return type
            }
          ];
          return createProxy(rootApi, currentApi, newChain, path, options);
        };
      }
      if (isObject(nextApi)) {
        return createProxy(rootApi, nextApi, currentChain, nextPath, options);
      }
      return void 0;
    }
  });
}
function bindApiToContext(api2, ctx = {}) {
  const boundApi = {};
  for (const key in api2) {
    if (typeof api2[key] === "function") {
      boundApi[key] = api2[key].bind(ctx);
    } else if (typeof api2[key] === "object" && api2[key] !== null) {
      boundApi[key] = bindApiToContext(api2[key], ctx);
    } else {
      boundApi[key] = api2[key];
    }
  }
  return boundApi;
}
function parseInitialChain(api2, ctx, chain) {
  if (!chain) return [];
  let jsonChain;
  if (typeof chain === "string") {
    const getChain = new Function("api", "fluent", `
      const root = fluent({ api });
      const { ${Object.keys(api2).join(",")} } = root;
      const chain = ${chain};
      return chain.chain;
    `);
    jsonChain = getChain(api2, fluent);
  } else {
    jsonChain = chain;
  }
  return jsonChain.map((item) => {
    if (isChainItem(item)) {
      return {
        ...item,
        args: item.args.map((arg) => processArgument(arg, api2, ctx))
      };
    }
    return item;
  });
}
var getSetImmediate = () => {
  if (typeof setImmediate === "function") {
    return setImmediate;
  }
  if (typeof globalThis !== "undefined" && typeof globalThis.setImmediate === "function") {
    return globalThis.setImmediate;
  }
  return (fn, ...args) => setTimeout(fn, 0, ...args);
};
var setImmediate = getSetImmediate();
function runChain(api2, initialData, chain, options) {
  let data = initialData;
  let index = 0;
  let isAsync = false;
  function processNextItem() {
    if (index >= chain.length) {
      return data;
    }
    const item = chain[index];
    if (isChainItem(item)) {
      const method = item.method.split(".").reduce((obj, key) => obj[key], api2);
      if (typeof method !== "function") {
        throw new Error(`Method ${item.method} not found in API`);
      }
      const result3 = method(data, ...item.args);
      if (result3 instanceof Promise) {
        return result3.then(
          (resolvedData) => runAsyncChain(api2, resolvedData, chain.slice(index + 1), options)
        );
      }
      data = result3 === void 0 ? data : result3;
    }
    index++;
    return processNextItem();
  }
  const result2 = processNextItem();
  return isAsync ? new Promise((resolve) => setImmediate(() => resolve(result2))) : result2;
}
async function runAsyncChain(api2, initialData, chain, options) {
  let data = initialData;
  let index = 0;
  while (index < chain.length) {
    const item = chain[index];
    if (isChainItem(item)) {
      const method = item.method.split(".").reduce((obj, key) => obj[key], api2);
      if (typeof method !== "function") {
        throw new Error(`Method ${item.method} not found in API`);
      }
      const result2 = await method(data, ...item.args);
      data = result2 === void 0 ? data : result2;
    }
    index++;
  }
  return data;
}
function fluent(config) {
  const { api: api2, ctx, chain: initialChain } = config;
  const boundApi = bindApiToContext(api2, ctx);
  const parsedChain = parseInitialChain(boundApi, ctx || {}, initialChain);
  const options = (ctx == null ? void 0 : ctx.fluent) || { blocking: false };
  return createProxy(boundApi, boundApi, parsedChain, "", options);
}
var api = {
  users: {
    get(data, name) {
      console.log("users.get", data);
      return { name: "John Doe" };
    },
    update(data, name) {
      console.log("users.update", data, name);
      return { name };
    }
  },
  posts: {
    get(data, chain) {
      console.log("posts.get", data);
    },
    update(data, title) {
      console.log("posts.update", data, title);
      return { title };
    }
  }
};
var root = fluent({ api });
var chain1 = root.users.get("test");
var chain2 = root.posts.get({ chain: ["test", 1] });
var chain3 = root.posts.get({ chain: root.users.get("test") });
var result = chain3.run(1);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  fluent
});
//# sourceMappingURL=index.cjs.map