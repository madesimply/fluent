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
  initChain: () => initChain
});
module.exports = __toCommonJS(src_exports);

// src/string.ts
function chainToString(calls) {
  return calls.map((call) => {
    var _a;
    const args = ((_a = call.args) == null ? void 0 : _a.length) ? `(${call.args.join(", ")})` : "";
    return `${call.method}${args}`;
  }).join(".");
}
function stringToChain(api, str) {
  const mockRoot = fluent({ api, ctx: {} });
  const splitPath = str.split(".");
  const path = [];
  let current = "";
  splitPath.forEach((part) => {
    current += part;
    const openBrackets = (current.match(/\(/g) || []).length;
    const closeBrackets = (current.match(/\)/g) || []).length;
    if (openBrackets === closeBrackets) {
      path.push(current);
      current = "";
    } else {
      current += ".";
    }
  });
  let currentNode = mockRoot;
  path.forEach((part) => {
    const methodName = part.replace(/\(.*\)/, "");
    const argsMatch = part.match(/\((.*)\)/);
    let args = argsMatch ? argsMatch[1] : null;
    if (args) {
      try {
        args = JSON.parse(args);
      } catch (e) {
      }
      currentNode = currentNode[methodName](args);
    } else {
      currentNode = currentNode[methodName];
    }
  });
  return JSON.parse(JSON.stringify(currentNode));
}

// src/fluent.ts
function runMethod(api, ctx, call) {
  const { method, args } = call;
  const methodFunc = method.split(".").reduce((acc, key) => acc[key], api);
  return methodFunc(ctx, ...args || []);
}
async function runPromises(api, data, firstResult, calls) {
  await firstResult;
  data = firstResult === void 0 ? data : firstResult;
  for (const call of calls) {
    const result = runMethod(api, data, call);
    if (result instanceof Promise) {
      await result;
    }
    data = result === void 0 ? data : result;
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
  const boundApi = bindConfigToApi(api, ctx || {});
  const jsonChain = typeof chain === "string" ? stringToChain(boundApi, chain) : chain;
  const path = jsonChain.length ? jsonChain.slice(-1)[0].method.split(".").slice(0, -1) : [];
  const parsedChain = chain ? initChain(jsonChain, boundApi, ctx) : [];
  return createProxy(boundApi, parsedChain, path, ctx || {});
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  fluent,
  initChain
});
//# sourceMappingURL=index.cjs.map