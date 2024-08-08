import { ApiCall, CombinedFluentApi } from "./types";

function runMethod(api: Record<string, any>, ctx: any, call: ApiCall) {
  const { method, args } = call;
  const methodFunc: any = method.split(".").reduce((acc, key) => acc[key], api);
  return methodFunc(ctx, ...(args || []));
}

async function runPromises(api: Record<string, any>, ctx: any, firstResult: Promise<any>, calls: ApiCall[]) {
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

function callIndex(calls: ApiCall[], call: ApiCall, current: number) {
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

function createProxy<T extends Record<string, any>>(api: T, parentCalls: ApiCall[] = [], path: string[] = []): any {
  const calls = [...parentCalls];

  const run = (ctx: any, from = 0) => {
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

  const handler: ProxyHandler<any> = {
    get(_, prop: string | symbol): any {
      if (prop === "run") return run;
      if (prop === "toJSON") return () => calls;
      if (prop === "goto")
        return (call: ApiCall) => {
          const goto = {
            method: "goto",
            args: JSON.parse(JSON.stringify(call)),
          };
          calls[calls.length - 1].goto = goto;
          return createProxy(api, [...calls], path);
        };

      if (typeof prop !== "string") return undefined;

      const baseTarget = prop in api ? api[prop] : undefined;
      const newPath = baseTarget ? [prop] : [...path, prop];
      const fullPath = newPath.join(".");
      const targetValue = newPath.reduce((acc, key) => acc[key], api);

      if (typeof targetValue === "object" && targetValue !== null) {
        return createProxy(api, calls, newPath);
      }

      if (typeof targetValue === "function") {
        const func = targetValue as Function;
        if (func.length <= 1) {
          return createProxy(api, [...calls, { method: fullPath }], path);
        }
        return (...args: any[]) => {
          return createProxy(api, [...calls, { method: fullPath, args }], path);
        };
      }

      return undefined;
    },
  };

  return new Proxy(() => {}, handler);
}


export function fluent<T extends Record<string, any>>(api: T): CombinedFluentApi<T>;
export function fluent<T extends Record<string, any>>(api: T, chain: ApiCall[]): CombinedFluentApi<T>;

export function fluent<T extends Record<string, any>>(api: T, chain: ApiCall[] = []): CombinedFluentApi<T> {
  const path = chain.length ? chain.slice(-1)[0].method.split('.').slice(0,-1) : [];
  return createProxy(api, chain, path) as CombinedFluentApi<T>;
}
