// fluent.ts

import {
  RuntimeApiCall,
  GotoItem,
  ChainItem,
  Chain,
  FluentProxyStructure,
  FluentProxy,
  FluentConfig,
  ApiContext,
  HasRequiredProperties,
  FluentOptions,
  ApiCall,
} from './types';

// Utility functions
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiCall(item: unknown): item is RuntimeApiCall {
  return (
    typeof item === 'object' &&
    item !== null &&
    'method' in item &&
    typeof (item as any).method === 'string' &&
    'args' in item &&
    Array.isArray((item as any).args)
  );
}

function isGotoItem(item: unknown): item is GotoItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'goto' in item &&
    typeof (item as any).goto === 'string' &&
    'args' in item &&
    Array.isArray((item as any).args)
  );
}

function isFluentProxy(value: unknown): value is FluentProxyStructure {
  return (
    typeof value === 'object' &&
    value !== null &&
    'chain' in value &&
    Array.isArray((value as any).chain)
  );
}

function processArgument(arg: unknown, api: any, ctx: any): any {
  if (isFluentProxy(arg)) {
    return fluent({ api, chain: arg.chain, ctx });
  }
  if (Array.isArray(arg)) {
    if (arg.every((a) => isApiCall(a) || isGotoItem(a))) {
      return fluent({ api, chain: arg, ctx });
    }
    return arg.map((item) => processArgument(item, api, ctx));
  }
  if (isApiCall(arg)) {
    return {
      ...arg,
      args: arg.args.map(a => processArgument(a, api, ctx))
    };
  }
  if (isGotoItem(arg)) {
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

function chainItemToString(item: ChainItem): string {
  if (isApiCall(item)) {
    const args = item.args.map(arg => JSON.stringify(arg)).join(', ');
    return `${item.method}(${args})`;
  } else if (isGotoItem(item)) {
    const args = item.args.map(arg => JSON.stringify(arg)).join(', ');
    return `goto(${item.goto}(${args}))`;
  }
  return ''; // This should never happen if ChainItem is correctly typed
}

function createProxy<TRootApi, TCurrentApi, TCurrentChain extends Chain, TPath extends string>(
  rootApi: TRootApi,
  currentApi: TCurrentApi,
  currentChain: TCurrentChain,
  path: TPath,
  options: FluentOptions
): FluentProxy<TRootApi, TCurrentApi, TCurrentChain, TPath> {
  const target: FluentProxy<TRootApi, TCurrentApi, TCurrentChain, TPath> = {
    chain: currentChain,
    run: (data: any) => runChain(rootApi, data, currentChain, options),
    goto: (fluentProxy: FluentProxyStructure) => {
      console.log('Goto received:', fluentProxy);
      if (!isFluentProxy(fluentProxy) || fluentProxy.chain.length === 0 || !isApiCall(fluentProxy.chain[0])) {
        throw new Error("Goto must receive a non-empty FluentProxy with an ApiCall as its first chain item");
      }
      const firstApiCall = fluentProxy.chain[0] as RuntimeApiCall;
      const gotoItem: GotoItem = { 
        goto: firstApiCall.method, 
        args: firstApiCall.args as ReadonlyArray<any>
      };
      return createProxy(rootApi, currentApi, [...currentChain, gotoItem] as any, path, options);
    },
    toString: () => currentChain.map(chainItemToString).join('.').replace(/\.$/, '')
  } as FluentProxy<TRootApi, TCurrentApi, TCurrentChain, TPath>;

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
          const newChain = [
            ...currentChain,
            { 
              method, 
              args: args.map(arg => isFluentProxy(arg) ? arg.chain[0] : arg),
              dataType: {} as any,
              returnType: {} as any
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
    if (isApiCall(item)) {
      return {
        ...item,
        args: item.args.map((arg) => processArgument(arg, api, ctx))
      };
    }
    if (isGotoItem(item)) {
      return {
        ...item,
        args: item.args.map((arg) => processArgument(arg, api, ctx))
      };
    }
    return item;
  }) as any;
}

function findGotoTarget(chain: Chain, gotoItem: GotoItem, currentIndex: number): number {
  // First, search forward from the current position
  for (let i = currentIndex + 1; i < chain.length; i++) {
    if (matchesGotoTarget(chain[i], gotoItem)) {
      return i;
    }
  }

  // If not found, search from the beginning up to the current position
  for (let i = 0; i < currentIndex; i++) {
    if (matchesGotoTarget(chain[i], gotoItem)) {
      return i;
    }
  }

  return -1; // Target not found
}

function matchesGotoTarget(
  chainItem: ChainItem,
  gotoItem: GotoItem
): boolean {
  if (!isApiCall(chainItem)) {
    return false;
  }
  return chainItem.method === gotoItem.goto && 
         chainItem.args.length === gotoItem.args.length &&
         chainItem.args.every((arg, index) => arg === gotoItem.args[index]);
}

const setImmediate = window.setImmediate || ((fn: Function, ...args: any[]) => setTimeout(fn, 0, ...args));

function runChain<TApi>(api: TApi, initialData: any, chain: Chain, options: FluentOptions): any {
  let data = initialData;
  let index = 0;
  let isAsync = false;

  function processNextItem(): any {
    if (index >= chain.length) {
      return data;
    }

    const item = chain[index];

    if (isGotoItem(item)) {
      const gotoIndex = findGotoTarget(chain, item, index);
      if (gotoIndex !== -1) {
        index = gotoIndex;
        isAsync = true;
        if (options.blocking) {
          processNextItem();
        } else {
          setImmediate(processNextItem);
        }
        return;
      }
    } else if (isApiCall(item)) {
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

    if (isGotoItem(item)) {
      const gotoIndex = findGotoTarget(chain, item, index);
      if (gotoIndex !== -1) {
        index = gotoIndex;
        continue;
      }
    } else if (isApiCall(item)) {
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
): FluentProxy<TApi, TApi, TInitialChain, ""> {
  const { api, ctx, chain: initialChain } = config;

  const boundApi = bindApiToContext(api, ctx);
  const parsedChain = parseInitialChain(boundApi, ctx || {}, initialChain) as TInitialChain;

  const options = ctx?.fluent || { blocking: false };

  return createProxy(boundApi, boundApi, parsedChain, "", options);
}
