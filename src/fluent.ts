type AddApiKeys<T, U> = {
  [K in keyof U]: U[K] extends (...args: infer P) => any
    ? P extends [infer Ctx, ...infer Rest]
      ? (...args: Rest) => AddConfigPropAndReturn<U, U>
      : AddConfigPropAndReturn<U, U>
    : AddConfigPropAndReturn<U[K], U>;
};

export type AddConfigPropAndReturn<T, U> = T extends (...args: any[]) => any
  ? Parameters<T> extends [infer Ctx, ...infer Rest]
    ? ((...args: Rest) => AddConfigPropAndReturn<U, U>) & AddApiKeys<T, U>
    : AddConfigPropAndReturn<U, U> & AddApiKeys<T, U>
  : {
      [P in keyof T]: T[P] extends (...args: any[]) => any
        ? Parameters<T[P]> extends [infer Ctx, ...infer Rest]
          ? ((...args: Rest) => AddConfigPropAndReturn<U, U>) & AddApiKeys<T, U>
          : AddConfigPropAndReturn<U, U> & AddApiKeys<T, U> & T[P]
        : AddConfigPropAndReturn<T[P], U>;
    } & AddApiKeys<T, U>;

export type FluentApi<V, U> = AddConfigPropAndReturn<V, U>;

export type CombinedFluentApi<T> = {
  [K in keyof T]: FluentApi<T[K], T>;
};

export type ApiCall = { method: string; args?: any[]; goto?: ApiCall };

export function fluent<T extends Record<string, any>>(api: T): CombinedFluentApi<T> {
  let chain: any = null;

  const createProxy = (parentCalls: ApiCall[] = [], path: string[] = []): any => {
    const calls = [...parentCalls];

    const runMethod = (ctx: any, call: ApiCall) => {
      const { method: path, args } = call;
      const method: any = path.split(".").reduce((acc, key) => acc[key], api);
      return method(ctx, ...(args || []));
    };

    const runPromises = async (ctx: any, firstResult: Promise<any>, calls: ApiCall[]) => {
      ctx = await firstResult;
      for (const call of calls) {
        const result = runMethod(ctx, call);
        if (result instanceof Promise) {
          await result;
        }
        ctx = result;
      }
      return ctx;
    };

    // search from current index to end of calls
    // if not found, search from start to current index
    const callIndex = (call, current) => {
      const remaining = calls.slice(current + 1);
      const gotoCall = JSON.stringify(call);
      const nextIndex = remaining.findIndex(
        (c) => JSON.stringify(c) === gotoCall
      );
      if (nextIndex > -1) {
        return nextIndex;
      }
      const start = calls.slice(0, current + 1);
      const prevIndex = start.findIndex(
        ({ goto, ...c }) => JSON.stringify(c) === gotoCall
      );
      return prevIndex;
    };

    const run = (ctx, from = 0) => {
      let goto = -1;
      for (let i = from; i < calls.length; i++) {
        let call = calls[i];
        if (call.goto && call.goto.args) {
          const index = callIndex(call.goto.args[0], i);
          if (index > -1) goto = index;
        }
        const result = runMethod(ctx, call);
        if (result instanceof Promise) {
          const remaining = calls.slice(calls.indexOf(call) + 1);
          return runPromises(ctx, result, remaining);
        }
        ctx = result;
        if (goto > -1) 
          continue;
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
            return createProxy([...calls], path);
          };

        if (typeof prop !== "string") return undefined;

        const baseTarget = prop in api ? api[prop] : undefined;
        const newPath = baseTarget ? [prop] : [...path, prop];
        const fullPath = newPath.join(".");
        const target = baseTarget || newPath.reduce((acc, key) => acc[key], api);

        if (typeof target === "object") {
          return createProxy(calls, newPath);
        }

        if (typeof target === "function") {
          const func = target as Function;
          if (func.length <= 1) {
            return createProxy([...calls, { method: fullPath }], path);
          }
          return (...args: any[]) => {
            return createProxy([...calls, { method: fullPath, args }], path);
          };
        }

        return undefined;
      },
    };

    return new Proxy(() => {}, handler);
  };

  chain = createProxy() as CombinedFluentApi<T>;
  return chain;
}

export const toChain = (op: string, fluent: any): any => {
  const config: ApiCall[] =
    typeof op === "string" ? JSON.parse(op) : JSON.parse(JSON.stringify(op));

  let current = fluent;
  for (const { method, args } of config) {
    const methods = method.split(".");
    for (const m of methods) {
      if (methods.indexOf(m) === methods.length - 1 && args?.length) {
        const _args = args.map((arg) => { 
          const args = Array.isArray(arg) ? arg : [arg];
          const hasChain = args.some((a) => a.method);
          return hasChain ? toChain(arg, fluent) : arg;
        });

        current = current[m](..._args);
        continue;
      }
      current = current[m];
    }
  }

  return current;
};
