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

export function fluent<T extends Record<string, any>>(apiStructure: T): CombinedFluentApi<T> {
  const createProxy = (parentCalls: ApiCall[] = [], currentPath: string[] = [], currentTarget: any = apiStructure): any => {
    const calls = [...parentCalls];

    const handler: ProxyHandler<any> = {
      get(_, prop: string | symbol): any {
        if (prop === 'toJSON') {
          return () => calls;
        }

        if (typeof prop === 'string') {
          const newPath = [...currentPath, prop];
          const fullPath = newPath.join('.');

          // Check if the current property is a namespace
          const isNamespace = typeof currentTarget[prop] === 'object';

          if (isNamespace) {
            // If it's a namespace, continue building the path without adding to calls
            return createProxy(calls, newPath, currentTarget[prop]);
          } else {
            // Check if the property is a new top-level API
            if (prop in apiStructure) {
              // Switch to a new API
              return createProxy(calls, [prop], apiStructure[prop]);
            }

            // If it's not a namespace, add it to calls
            calls.push({ method: fullPath });

            const proxy = new Proxy(function (...args: any[]) {
              calls[calls.length - 1].args = args;
              // Keep the full current path
              return createProxy(calls, currentPath, currentTarget);
            }, handler);

            return proxy;
          }
        }

        return undefined;
      }
    };

    const isFunction = typeof currentTarget === "function";
    const func = isFunction ? (...args: any[]) => {
      calls.push({ method: currentPath.join('.'), args });
      return createProxy(calls, currentPath, currentTarget);
    } : () => { };

    const proxy = new Proxy(func, handler);
    (proxy as any).toJSON = () => calls;

    return proxy;
  };

  const rootProxy = new Proxy({}, {
    get(_, prop: string | symbol): any {
      if (prop === 'toJSON') {
        return () => [];
      }

      return createProxy([], [prop as string], apiStructure[prop as string]);
    }
  }) as CombinedFluentApi<T>;

  (rootProxy as any).toJSON = () => [];

  return rootProxy;
}

type Ctx = any;

export const run = async ({ op, ctx: _ctx, api }: { op: any; ctx: Ctx; api: any }): Promise<any> => {
  const config = typeof op === 'string' ? JSON.parse(op) : JSON.parse(JSON.stringify(op));
  const ctx = _ctx as Ctx;

  const runHelper = async (op: any) => {
    return await run({ op, ctx, api });
  }

  const executeOperation = async (item: any) => {
    const { method: path, args = [] } = item;
    const splitPath = path.split(".");
    const method = splitPath.reduce((acc, key) => acc[key], api);
    return method({ctx, run }, ...args, runHelper);
  };

  for (let i = 0; i < config.length; i++) {
    await executeOperation(config[i]);
  }

  return ctx;
};
