export type AddApiKeys<T, U> = {
  [K in keyof U]: FluentApi<U[K], U>;
};

export type AddConfigPropAndReturn<T, U> = T extends (ctx: any, ...args: infer A) => any
  ? (...args: A) => AddConfigPropAndReturn<U, U> & AddApiKeys<OmitFirstArg<T>, U>
  : {
      [P in keyof T]: T[P] extends (ctx: any, ...args: infer A) => any
        ? (...args: A) => AddConfigPropAndReturn<Omit<T, P>, U> & AddApiKeys<OmitFirstArg<T[P]>, U>
        : AddConfigPropAndReturn<T[P], U> & AddApiKeys<T[P], U>;
    } & AddApiKeys<T, U>;

type OmitFirstArg<T> = T extends (ctx: any, ...args: infer A) => infer R ? (...args: A) => R : T;

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

export type Ctx = {
  run: (op: any) => any;
  ops: Array<{ path: string; args: any[]; result?: any }>;
} & {
  [key: string]: any;
};

type RunCtx = Omit<Ctx, "run" | "ops"> & {
  run?: (op: any) => any;
  ops?: Array<{ path: string; args: any[]; result?: any }>;
};

export const run = ({ op, ctx: _ctx, api }: { op: any; ctx: RunCtx; api: any }): any | Promise<any> => {
  const config = typeof op === 'string' ? JSON.parse(op) : JSON.parse(JSON.stringify(op));

  const ctx = _ctx as Ctx;

  if (!ctx.run && !ctx.ops) {
    Object.defineProperties(ctx, {
      run: {
        value: (op: any) => run({ op, ctx, api }),
        enumerable: false,
        writable: false,
        configurable: false
      },
      ops: {
        value: [],
        enumerable: true,
        writable: false,
        configurable: false
      }
    });
  }

  const executeOperation = (item: any) => {
    const { method: path, args = [] } = item;
    const splitPath = path.split(".");
    const method = splitPath.reduce((acc, key) => acc[key], api);
    return method(ctx, ...args);
  };

  const executeChain = async (startIndex: number) => {
    for (let i = startIndex; i < config.length; i++) {
      const result = executeOperation(config[i]);
      if (result instanceof Promise) {
        const resolvedResult = await result;
        ctx.ops.push({ path: config[i].method, args: config[i].args, result: resolvedResult });
      } else {
        ctx.ops.push({ path: config[i].method, args: config[i].args, result });
      }
    }
    return ctx;
  };

  for (let i = 0; i < config.length; i++) {
    const result = executeOperation(config[i]);
    if (result instanceof Promise) {
      return executeChain(i).then(() => ctx) as Promise<any>;
    } else {
      ctx.ops.push({ path: config[i].method, args: config[i].args, result });
    }
  }

  return ctx as any;
};