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
function createProxy(api, parentCalls = [], path = []) {
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
    get(target, prop) {
      if (prop === "run") return run;
      if (prop === "toJSON") return () => calls;
      if (prop === "goto")
        return (call) => {
          const goto = {
            method: "goto",
            args: JSON.parse(JSON.stringify(call))
          };
          calls[calls.length - 1].goto = goto;
          return createProxy(api, [...calls], path);
        };
      if (typeof prop !== "string") return void 0;
      const baseTarget = prop in api ? api[prop] : void 0;
      const newPath = baseTarget ? [prop] : [...path, prop];
      const fullPath = newPath.join(".");
      const targetValue = newPath.reduce((acc, key) => acc[key], api);
      if (typeof targetValue === "object" && targetValue !== null) {
        return createProxy(api, calls, newPath);
      }
      if (typeof targetValue === "function") {
        const func = targetValue;
        if (func.length <= 1) {
          return createProxy(api, [...calls, { method: fullPath }], path);
        }
        return (...args) => {
          return createProxy(api, [...calls, { method: fullPath, args }], path);
        };
      }
      return void 0;
    }
  };
  return new Proxy(() => {
  }, handler);
}
function fluent(api) {
  return createProxy(api);
}

// src/toChain.ts
var isPrimitive = (arg) => {
  const primitives = ["string", "number", "boolean"];
  return primitives.includes(typeof arg);
};
var isObject = (arg) => {
  return !Array.isArray(arg) && arg !== null && typeof arg === "object";
};
var isArray = (arg) => {
  return Array.isArray(arg);
};
var isChain = (arg) => {
  return isArray(arg) && arg.every((a) => typeof a === "object" && a.method);
};
var parseObject = (obj, fluent2) => {
  const newObj = {};
  for (const key in obj) {
    if (obj[key] && typeof obj[key] === "object" && obj[key].method) {
      newObj[key] = toChain(obj[key], fluent2);
    } else {
      newObj[key] = parseArgs([obj[key]], fluent2);
    }
  }
  return newObj;
};
var parseArray = (arr, fluent2) => {
  return arr.map((arg) => {
    if (isPrimitive(arg)) return arg;
    if (isChain(arg)) {
      return toChain(arg, fluent2);
    }
    if (isArray(arg)) {
      return parseArray(arg, fluent2);
    }
    if (isObject(arg)) {
      return parseObject(arg, fluent2);
    }
    return arg;
  });
};
var parseArgs = (args, fluent2) => {
  if (isPrimitive(args)) return args;
  if (isObject(args)) {
    return parseObject(args, fluent2);
  }
  if (isArray(args)) {
    return parseArray(args, fluent2);
  }
  return args;
};
var toChain = (op, fluent2) => {
  const config = typeof op === "string" ? JSON.parse(op) : JSON.parse(JSON.stringify(op));
  let current = fluent2;
  for (const { method, args } of config) {
    const methods = method.split(".");
    for (const m of methods) {
      if (methods.indexOf(m) === methods.length - 1 && (args == null ? void 0 : args.length)) {
        const _args = parseArgs(args, fluent2);
        current = current[m](..._args);
        continue;
      }
      current = current[m];
    }
  }
  return current;
};