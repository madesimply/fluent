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

export type ApiCall = { method: string; args?: any[] };

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

    const run = (ctx: any) => {
      for (const call of calls) {
        const result = runMethod(ctx, call);
        if (result instanceof Promise) {
          const remaining = calls.slice(calls.indexOf(call) + 1);
          return runPromises(ctx, result, remaining);
        }
        ctx = result;
      }
      return ctx;
    };

    const handler: ProxyHandler<any> = {
      get(_, prop: string | symbol): any {
        if (prop === "run") return run;
        if (prop === "toJSON") return () => calls;
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
        current = current[m](...(args || []));
        continue;
      }
      current = current[m];
    }
  }

  return current;
};
