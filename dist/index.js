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
function processArgument(arg, api, ctx) {
  if (isFluent(arg)) {
    return fluent({ api, chain: arg.chain, ctx });
  }
  if (Array.isArray(arg)) {
    return arg.map((item) => processArgument(item, api, ctx));
  }
  if (isChainItem(arg)) {
    return {
      ...arg,
      args: arg.args.map((a) => processArgument(a, api, ctx))
    };
  }
  if (typeof arg === "object" && arg !== null) {
    const processedArg = {};
    for (const key in arg) {
      processedArg[key] = processArgument(arg[key], api, ctx);
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
          const newChain = [
            ...currentChain,
            {
              method,
              args: args.map((arg) => isFluent(arg) ? arg.chain[0] : arg),
              data: {},
              return: {}
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
function bindApiToContext(api, ctx = {}) {
  const boundApi = {};
  for (const key in api) {
    if (typeof api[key] === "function") {
      boundApi[key] = api[key].bind(ctx);
    } else if (typeof api[key] === "object" && api[key] !== null) {
      boundApi[key] = bindApiToContext(api[key], ctx);
    } else {
      boundApi[key] = api[key];
    }
  }
  return boundApi;
}
function parseInitialChain(api, ctx, chain) {
  if (!chain) return [];
  let jsonChain;
  if (typeof chain === "string") {
    const getChain = new Function("api", "fluent", `
      const root = fluent({ api });
      const { ${Object.keys(api).join(",")} } = root;
      const chain = ${chain};
      return chain.chain;
    `);
    jsonChain = getChain(api, fluent);
  } else {
    jsonChain = chain;
  }
  return jsonChain.map((item) => {
    if (isChainItem(item)) {
      return {
        ...item,
        args: item.args.map((arg) => processArgument(arg, api, ctx))
      };
    }
    return item;
  });
}
var setImmediate = window.setImmediate || ((fn, ...args) => setTimeout(fn, 0, ...args));
function runChain(api, initialData, chain, options) {
  let data = initialData;
  let index = 0;
  let isAsync = false;
  function processNextItem() {
    if (index >= chain.length) {
      return data;
    }
    const item = chain[index];
    if (isChainItem(item)) {
      const method = item.method.split(".").reduce((obj, key) => obj[key], api);
      if (typeof method !== "function") {
        throw new Error(`Method ${item.method} not found in API`);
      }
      const result2 = method(data, ...item.args);
      if (result2 instanceof Promise) {
        return result2.then(
          (resolvedData) => runAsyncChain(api, resolvedData, chain.slice(index + 1), options)
        );
      }
      data = result2 === void 0 ? data : result2;
    }
    index++;
    return processNextItem();
  }
  const result = processNextItem();
  return isAsync ? new Promise((resolve) => setImmediate(() => resolve(result))) : result;
}
async function runAsyncChain(api, initialData, chain, options) {
  let data = initialData;
  let index = 0;
  while (index < chain.length) {
    const item = chain[index];
    if (isChainItem(item)) {
      const method = item.method.split(".").reduce((obj, key) => obj[key], api);
      if (typeof method !== "function") {
        throw new Error(`Method ${item.method} not found in API`);
      }
      const result = await method(data, ...item.args);
      data = result === void 0 ? data : result;
    }
    index++;
  }
  return data;
}
function fluent(config) {
  const { api, ctx, chain: initialChain } = config;
  const boundApi = bindApiToContext(api, ctx);
  const parsedChain = parseInitialChain(boundApi, ctx || {}, initialChain);
  const options = (ctx == null ? void 0 : ctx.fluent) || { blocking: false };
  return createProxy(boundApi, boundApi, parsedChain, "", options);
}
export {
  fluent
};
//# sourceMappingURL=index.js.map