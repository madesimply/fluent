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

export function fluent<T extends Record<string, any>>(
  apiStructure: T
): CombinedFluentApi<T> {
  const createProxy = (
    parentCalls: ApiCall[] = [],
    path: string[] = []
  ): any => {
    const calls = [...parentCalls];

    const handler: ProxyHandler<any> = {
      get(_, prop: string | symbol): any {
        if (prop === "toJSON") return () => calls;
        if (typeof prop !== "string") return undefined;

        const baseTarget =
          prop in apiStructure ? apiStructure[prop] : undefined;
        const newPath = baseTarget ? [prop] : [...path, prop];
        const fullPath = newPath.join(".");
        const target =
          baseTarget || newPath.reduce((acc, key) => acc[key], apiStructure);

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

  return createProxy() as CombinedFluentApi<T>;
}

type Ctx = any;

export const run = async ({
  op,
  ctx,
  api,
}: {
  op: any;
  ctx: Ctx;
  api: any;
}): Promise<any> => {
  const config =
    typeof op === "string" ? JSON.parse(op) : JSON.parse(JSON.stringify(op));

  ctx = ctx as Ctx;

  const runHelper = async (op: any) => {
    return await run({ op, ctx, api });
  };

  const executeOperation = async (item: any) => {
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

export const chain = (op: string, fluent: any): any => {
  const config: ApiCall[] = typeof op === 'string' ? JSON.parse(op) : JSON.parse(JSON.stringify(op));

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
