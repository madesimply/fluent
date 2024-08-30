// fluent.ts
import {
  Chain,
  Fluent,
  FluentConfig,
  FluentStructure,
  ApiContext,
  HasRequiredProperties,
  FluentOptions,
} from './types';

// Utility functions
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isChainItem(item: unknown): item is Chain[number] {
  return (
    typeof item === 'object' &&
    item !== null &&
    'method' in item &&
    typeof (item as any).method === 'string' &&
    'args' in item &&
    Array.isArray((item as any).args)
  );
}

function isFluent(value: unknown): value is FluentStructure {
  return (
    typeof value === 'object' &&
    value !== null &&
    'chain' in value &&
    Array.isArray((value as any).chain)
  );
}

function processArgument(arg: unknown, api: any, ctx: any): any {
  if (isFluent(arg)) {
    return fluent({ api, chain: arg.chain, ctx });
  }
  if (Array.isArray(arg)) {
    return arg.map((item) => processArgument(item, api, ctx));
  }
  if (isChainItem(arg)) {
    return {
      ...arg,
      args: arg.args.map(a => processArgument(a, api, ctx))
    };
  }
  if (typeof arg === 'object' && arg !== null) {
    const processedArg: Record<string, any> = {};
    for (const key in arg) {
      processedArg[key] = processArgument((arg as any)[key], api, ctx);
    }
    return processedArg;
  }
  return arg;
}

function chainItemToString(item: Chain[number]): string {
  const args = item.args.map(arg => JSON.stringify(arg)).join(', ');
  return `${item.method}(${args})`;
}

function createProxy<TRootApi, TCurrentApi, TCurrentChain extends Chain, TPath extends string>(
  rootApi: TRootApi,
  currentApi: TCurrentApi,
  currentChain: TCurrentChain,
  path: TPath,
  options: FluentOptions
): Fluent<TRootApi, TCurrentApi, TCurrentChain, TPath> {
  const target: Fluent<TRootApi, TCurrentApi, TCurrentChain, TPath> = {
    chain: currentChain,
    run: (data: any) => runChain(rootApi, data, currentChain, options),
    goto: (fluentProxy: FluentStructure) => {
      if (!isFluent(fluentProxy) || fluentProxy.chain.length === 0) {
        throw new Error("Goto must receive a non-empty Fluent");
      }
      return createProxy(rootApi, currentApi, [...currentChain, ...fluentProxy.chain] as any, path, options);
    },
    toString: () => currentChain.map(chainItemToString).join('.').replace(/\.$/, '')
  } as Fluent<TRootApi, TCurrentApi, TCurrentChain, TPath>;

  return new Proxy(target, {
    get(target, prop: string | symbol) {
      if (prop in target) {
        return (target as any)[prop];
      }

      let nextApi: unknown;
      let nextPath: string;

      if (isObject(currentApi) && prop in currentApi) {
        nextApi = (currentApi as any)[prop];
        nextPath = `${path}${path ? '.' : ''}${prop as string}`;
      } else if (isObject(rootApi) && prop in rootApi) {
        nextApi = (rootApi as any)[prop];
        nextPath = prop as string;
      } else {
        return undefined;
      }

      if (typeof nextApi === 'function') {
        return (...args: any[]) => {
          const method = nextPath;
          const constArgs = { args } as const;
          const newChain = [
            ...currentChain,
            { 
              method, 
              args: constArgs.args,
              data: {} as any, // Placeholder for data type
              return: {} as any, // Placeholder for return type
            }
          ];
          return createProxy(rootApi, currentApi, newChain, path, options);
        };
      }

      if (isObject(nextApi)) {
        return createProxy(rootApi, nextApi as any, currentChain, nextPath, options);
      }

      return undefined;
    }
  });
}
function bindApiToContext<TApi, TCtx>(api: TApi, ctx: TCtx = {} as TCtx): TApi {
  const boundApi: any = {};
  for (const key in api) {
    if (typeof api[key] === 'function') {
      boundApi[key] = (api[key] as Function).bind(ctx);
    } else if (typeof api[key] === 'object' && api[key] !== null) {
      boundApi[key] = bindApiToContext(api[key], ctx);
    } else {
      boundApi[key] = api[key];
    }
  }
  return boundApi as TApi;
}

function parseInitialChain<TApi, TCtx, T extends Chain | string | undefined>(
  api: TApi,
  ctx: TCtx,
  chain: T
): T extends string ? Chain : T extends Chain ? T : [] {
  if (!chain) return [] as any;

  let jsonChain: Chain;
  if (typeof chain === 'string') {
    const getChain = new Function("api", "fluent", `
      const root = fluent({ api });
      const { ${Object.keys(api as object).join(",")} } = root;
      const chain = ${chain};
      return chain.chain;
    `);
    jsonChain = getChain(api, fluent);
  } else {
    jsonChain = chain as Chain;
  }

  return jsonChain.map((item) => {
    if (isChainItem(item)) {
      return {
        ...item,
        args: item.args.map((arg) => processArgument(arg, api, ctx))
      };
    }
    return item;
  }) as any;
}

// Utility function to get a cross-environment compatible setImmediate
const getSetImmediate = () => {
  if (typeof setImmediate === 'function') {
    return setImmediate;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.setImmediate === 'function') {
    return globalThis.setImmediate;
  }
  return (fn: Function, ...args: any[]) => setTimeout(fn, 0, ...args);
};

// Use the utility function to create our setImmediate
const setImmediate = getSetImmediate();

function runChain<TApi>(api: TApi, initialData: any, chain: Chain, options: FluentOptions): any {
  let data = initialData;
  let index = 0;
  let isAsync = false;

  function processNextItem(): any {
    if (index >= chain.length) {
      return data;
    }

    const item = chain[index];

    if (isChainItem(item)) {
      const method = item.method.split('.').reduce((obj: any, key) => obj[key], api);
      if (typeof method !== 'function') {
        throw new Error(`Method ${item.method} not found in API`);
      }

      const result = method(data, ...item.args);

      if (result instanceof Promise) {
        return result.then(resolvedData => 
          runAsyncChain(api, resolvedData, chain.slice(index + 1), options)
        );
      }

      data = result === undefined ? data : result;
    }

    index++;
    return processNextItem();
  }

  const result = processNextItem();
  return isAsync ? new Promise(resolve => setImmediate(() => resolve(result))) : result;
}

async function runAsyncChain<TApi>(api: TApi, initialData: any, chain: Chain, options: FluentOptions): Promise<any> {
  let data = initialData;
  let index = 0;

  while (index < chain.length) {
    const item = chain[index];

    if (isChainItem(item)) {
      const method = item.method.split('.').reduce((obj: any, key) => obj[key], api);
      if (typeof method !== 'function') {
        throw new Error(`Method ${item.method} not found in API`);
      }

      const result = await method(data, ...item.args);
      data = result === undefined ? data : result;
    }

    index++;
  }

  return data;
}

export function fluent<TApi, TCtx extends ApiContext<TApi>, TInitialChain extends Chain = []>(
  config: HasRequiredProperties<ApiContext<TApi>> extends true
    ? FluentConfig<TApi, ApiContext<TApi>, TInitialChain> & { ctx: ApiContext<TApi> }
    : FluentConfig<TApi, ApiContext<TApi>, TInitialChain>
): Fluent<TApi, TApi, TInitialChain, ""> {
  const { api, ctx, chain: initialChain } = config;

  const boundApi = bindApiToContext(api, ctx);
  const parsedChain = parseInitialChain(boundApi, ctx || {}, initialChain) as TInitialChain;

  const options = ctx?.fluent || { blocking: false };

  return createProxy(boundApi, boundApi, parsedChain, "", options);
}

// export types

export {
  Fluent,
  FluentConfig,
  ApiContext,
  FluentOptions,
};
