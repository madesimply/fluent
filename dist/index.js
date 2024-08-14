// src/string.ts
function chainToString(calls) {
  return calls.map((call) => {
    var _a;
    const args = ((_a = call.args) == null ? void 0 : _a.length) ? `(${call.args.join(", ")})` : "";
    return `${call.method}${args}`;
  }).join(".");
}
function stringToChain(api, chain) {
  const getChain = new Function("api", "fluent", `
    const root = fluent({ api });
    const { ${Object.keys(api).join(",")} } = api;
    const chain = root.${chain};
    return JSON.parse(JSON.stringify(chain));
  `);
  return getChain(api, fluent);
}

// src/fluent.ts
function runMethod(api, data, call) {
  const { method, args } = call;
  const methodFunc = method.split(".").reduce((acc, key) => acc[key], api);
  return methodFunc(data, ...args || []);
}
async function runPromises(api, data, firstResult, calls) {
  data = await (firstResult === void 0 ? data : firstResult) ?? data;
  for (const call of calls) {
    const result = runMethod(api, data, call);
    data = await result ?? data;
  }
  return data;
}
function callIndex(calls, call, current) {
  const remaining = calls.slice(current + 1);
  const gotoCall = JSON.stringify(call);
  const nextIndex = remaining.findIndex((c) => JSON.stringify(c) === gotoCall);
  if (nextIndex > -1) {
    return nextIndex;
  }
  const start = calls.slice(0, current + 1);
  const prevIndex = start.findIndex(
    ({ goto, ...c }) => JSON.stringify(c) === gotoCall
  );
  return prevIndex;
}
function createProxy(api, parentCalls, path, ctx) {
  const calls = [...parentCalls];
  const run = (data, from = 0) => {
    var _a;
    let goto = -1;
    for (let i = from; i < calls.length; i++) {
      let call = calls[i];
      if (call.goto && call.goto.args) {
        const index = callIndex(calls, call.goto.args[0], i);
        if (index > -1) goto = index;
      }
      const result = runMethod(api, data, call);
      if (result instanceof Promise) {
        const remaining = calls.slice(calls.indexOf(call) + 1);
        return runPromises(api, data, result, remaining);
      }
      data = result === void 0 ? data : result;
      if (goto > -1) continue;
    }
    if (goto > -1) {
      if ((_a = ctx == null ? void 0 : ctx.fluent) == null ? void 0 : _a.blocking) {
        return run(data, goto);
      }
      {
        setTimeout(() => run(data, goto), 0);
      }
    }
    return data;
  };
  const handler = {
    get(_, prop) {
      if (prop === "run") return run;
      if (prop === "toJSON") return () => calls;
      if (prop === "goto")
        return (call) => {
          const goto = {
            method: "goto",
            args: JSON.parse(JSON.stringify(call))
          };
          calls[calls.length - 1].goto = goto;
          return createProxy(api, [...calls], path, ctx);
        };
      if (prop === "toString") return () => chainToString(calls);
      if (typeof prop !== "string") return void 0;
      const baseTarget = prop in api ? api[prop] : void 0;
      const newPath = baseTarget ? [prop] : [...path, prop];
      const fullPath = newPath.join(".");
      const targetValue = newPath.reduce((acc, key) => acc[key], api);
      if (typeof targetValue === "object" && targetValue !== null) {
        return createProxy(api, calls, newPath, ctx);
      }
      if (typeof targetValue === "function") {
        const func = targetValue;
        if (func.length <= 1) {
          return createProxy(api, [...calls, { method: fullPath }], path, ctx);
        }
        return (...args) => {
          return createProxy(
            api,
            [...calls, { method: fullPath, args }],
            path,
            ctx
          );
        };
      }
      return void 0;
    }
  };
  return new Proxy(() => {
  }, handler);
}
function bindConfigToApi(api, ctx) {
  const boundApi = {};
  for (const key in api) {
    if (typeof api[key] === "function") {
      boundApi[key] = api[key].bind(ctx);
    } else if (typeof api[key] === "object" && api[key] !== null) {
      boundApi[key] = bindConfigToApi(api[key], ctx);
    } else {
      boundApi[key] = api[key];
    }
  }
  return boundApi;
}
function initChain(chain, api, ctx) {
  return chain.map((call) => {
    if (call.args) {
      call.args = call.args.map((arg) => processArgument(arg, api, ctx));
    }
    return call;
  });
}
function processArgument(arg, api, ctx) {
  const isArray = Array.isArray(arg);
  const isObject = !isArray && typeof arg === "object" && arg !== null;
  if (isArray) {
    if (arg.every((a) => "method" in a)) {
      return fluent({ api, chain: arg, ctx });
    }
    return arg.map((item) => processArgument(item, api, ctx));
  }
  if (isObject) {
    for (const key in arg) {
      arg[key] = processArgument(arg[key], api, ctx);
    }
    return arg;
  }
  return arg;
}
function fluent({
  api,
  chain = [],
  ctx
}) {
  const jsonChain = typeof chain === "string" ? stringToChain(api, chain) : chain;
  const path = jsonChain.length ? jsonChain.slice(-1)[0].method.split(".").slice(0, -1) : [];
  const boundApi = bindConfigToApi(api, ctx || {});
  const parsedChain = chain ? initChain(jsonChain, boundApi, ctx) : [];
  return createProxy(boundApi, parsedChain, path, ctx || {});
}
export {
  fluent,
  initChain
};
//# sourceMappingURL=index.js.map