// src/fluent.ts
function runMethod(api, ctx, call) {
  const { method, args } = call;
  const methodFunc = method.split(".").reduce((acc, key) => acc[key], api);
  return methodFunc(ctx, ...args || []);
}
async function runPromises(api, ctx, firstResult, calls) {
  ctx = await firstResult;
  for (const call of calls) {
    const result = runMethod(api, ctx, call);
    if (result instanceof Promise) {
      await result;
    }
    ctx = result;
  }
  return ctx;
}
function callIndex(calls, call, current) {
  const remaining = calls.slice(current + 1);
  const gotoCall = JSON.stringify(call);
  const nextIndex = remaining.findIndex((c) => JSON.stringify(c) === gotoCall);
  if (nextIndex > -1) {
    return nextIndex;
  }
  const start = calls.slice(0, current + 1);
  const prevIndex = start.findIndex(({ goto, ...c }) => JSON.stringify(c) === gotoCall);
  return prevIndex;
}
function createProxy(api, parentCalls = [], path = [], config) {
  const calls = [...parentCalls];
  const run = (ctx, from = 0) => {
    let goto = -1;
    for (let i = from; i < calls.length; i++) {
      let call = calls[i];
      if (call.goto && call.goto.args) {
        const index = callIndex(calls, call.goto.args[0], i);
        if (index > -1) goto = index;
      }
      const result = runMethod(api, ctx, call);
      if (result instanceof Promise) {
        const remaining = calls.slice(calls.indexOf(call) + 1);
        return runPromises(api, ctx, result, remaining);
      }
      ctx = result;
      if (goto > -1) continue;
    }
    if (goto > -1) {
      setTimeout(() => run(ctx, goto), 0);
    }
    return ctx;
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
          return createProxy(api, [...calls], path, config);
        };
      if (typeof prop !== "string") return void 0;
      const baseTarget = prop in api ? api[prop] : void 0;
      const newPath = baseTarget ? [prop] : [...path, prop];
      const fullPath = newPath.join(".");
      const targetValue = newPath.reduce((acc, key) => acc[key], api);
      if (typeof targetValue === "object" && targetValue !== null) {
        return createProxy(api, calls, newPath, config);
      }
      if (typeof targetValue === "function") {
        const func = targetValue;
        if (func.length <= 1) {
          return createProxy(api, [...calls, { method: fullPath }], path, config);
        }
        return (...args) => {
          return createProxy(api, [...calls, { method: fullPath, args }], path, config);
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
function fluent({
  api,
  chain = [],
  ctx
}) {
  const path = chain.length ? chain.slice(-1)[0].method.split(".").slice(0, -1) : [];
  const boundApi = bindConfigToApi(api, ctx || {});
  return createProxy(boundApi, chain, path, ctx || {});
}
export {
  fluent
};
//# sourceMappingURL=index.js.map