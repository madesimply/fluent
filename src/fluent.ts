import { chainToString, stringToChain } from "./string";
import { ApiCall, Ctx, Fluent, RequiredContext, StringChain } from "./types";

/**
 * Executes a method from the API with the provided context and arguments.
 * @param api - The API object containing the methods.
 * @param data - The context object passed to the method.
 * @param call - An object containing the method name and arguments.
 * @returns The result of the method execution.
 */
function runMethod(api: Record<string, any>, data: any, call: ApiCall) {
  const { method, args } = call;
  const methodFunc: any = method.split(".").reduce((acc, key) => acc[key], api);
  return methodFunc(data, ...(args || []));
}

/**
 * Executes a sequence of API calls, handling promises for asynchronous operations.
 * @param api - The API object containing the methods.
 * @param data - The initial context object.
 * @param firstResult - The result of the first API call.
 * @param calls - An array of subsequent API calls to execute.
 * @returns A promise that resolves to the final context after all calls are executed.
 */
async function runPromises(
  api: Record<string, any>,
  data: any,
  firstResult: Promise<any>,
  calls: ApiCall[]
) {
  data = await (firstResult === void 0 ? data : firstResult) ?? data;
  for (const call of calls) {
    const result = runMethod(api, data, call);
    data = await result ?? data;
  }
  return data;
}

/**
 * Finds the index of the next API call in the chain that matches the specified call.
 * @param calls - The list of API calls.
 * @param call - The API call to find in the list.
 * @param current - The current index in the list of API calls.
 * @returns The index of the matching call, or -1 if not found.
 */
function callIndex(calls: ApiCall[], call: ApiCall, current: number) {
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

/**
 * Creates a proxy object that allows fluent method chaining for the given API.
 * @param api - The API object containing methods and properties.
 * @param parentCalls - The list of previous API calls.
 * @param path - The current path of method calls.
 * @param ctx - The context configuration object.
 * @returns A proxy object that supports method chaining.
 */
function createProxy<T extends Record<string, any>>(
  api: T,
  parentCalls: ApiCall[],
  path: string[],
  ctx: Ctx
): any {
  const calls = [...parentCalls];

  const run = (data: any, from = 0) => {
    let goto = -1;
    for (let i = from; i < calls.length; i++) {
      let call = calls[i];
      if (call.goto && call.goto.args) {
        const index = callIndex(calls, call.goto.args[0], i);
        if (index > -1) goto = index;
      }
      const result = runMethod(api, data, call);
      if (result instanceof Promise) {
        const remaining = calls.slice(i + 1);
        return runPromises(api, data, result, remaining);
      }
      data = result === void 0 ? data : result;
      if (goto > -1) continue;
    }
    if (goto > -1) {
      if (ctx?.fluent?.blocking) {
        return run(data, goto);
      }
      {
        setTimeout(() => run(data, goto), 0);
      }
    }
    return data;
  };

  const handler: ProxyHandler<any> = {
    has(_, prop: string | symbol): boolean {
      if (prop === "run" || prop === "toJSON" || prop === "goto" || prop === "toString") {
        return true;
      }
      return prop in api;
    },
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
          return createProxy(api, [...calls], path, ctx);
        };
      if (prop === "toString") return () => chainToString(calls);

      if (typeof prop !== "string") return undefined;

      const baseTarget = prop in api ? api[prop] : undefined;
      const newPath = baseTarget ? [prop] : [...path, prop];
      const fullPath = newPath.join(".");
      const targetValue = newPath.reduce((acc, key) => acc[key], api);

      if (typeof targetValue === "object" && targetValue !== null) {
        return createProxy(api, calls, newPath, ctx);
      }

      if (typeof targetValue === "function") {
        // const func = targetValue as Function;
        // if (func.length <= 1) {
        //   return createProxy(api, [...calls, { method: fullPath }], path, ctx);
        // }
        return (...args: any[]) => {
          return createProxy(
            api,
            [...calls, { method: fullPath, args }],
            path,
            ctx
          );
        };
      }

      return undefined;
    },
  };

  return new Proxy(() => {}, handler);
}

/**
 * Binds a context object to all functions within an API, allowing them to use the context as `this`.
 * @param api - The API object containing methods and properties.
 * @param ctx - The context object to bind to the API functions.
 * @returns The API object with context-bound functions.
 */
function bindConfigToApi<T extends Record<string, any>>(api: T, ctx: Ctx): T {
  const boundApi = {} as T;

  for (const key in api) {
    if (typeof api[key] === "function") {
      // Bind the configuration to the function
      boundApi[key] = api[key].bind(ctx);
    } else if (typeof api[key] === "object" && api[key] !== null) {
      // Recursively bind the configuration for nested objects
      boundApi[key] = bindConfigToApi(api[key], ctx);
    } else {
      boundApi[key] = api[key];
    }
  }

  return boundApi;
}

/**
 * Traverses the chain and its arguments. Recursively processes each element, converting serialized chains back into fluent interfaces,
 * and handling primitives, objects, and nested structures as needed.
 * @param chain - The chain to traverse.
 * @param api - The API object containing methods and properties.
 * @param ctx - The context object required by the API methods.
 * @returns The chain with serialized chains and nested structures converted into their appropriate forms.
 */
export function initChain<T extends Record<string, any>>(
  chain: ApiCall[],
  api: T,
  ctx: RequiredContext<T>
): ApiCall[] {
  return chain.map((call) => {
    if (call.args) {
      call.args = call.args.map((arg) => processArgument(arg, api, ctx));
    }
    return call;
  });
}

/**
 * Processes individual arguments within an API call, handling arrays, objects, and primitives.
 * @param arg - The argument to process.
 * @param api - The API object containing methods and properties.
 * @param ctx - The context object required by the API methods.
 * @returns The processed argument, potentially converted back into a fluent interface.
 */
function processArgument<T extends Record<string, any>>(
  arg: any,
  api: T,
  ctx: RequiredContext<T>
): any {
  const isArray = Array.isArray(arg);
  const isObject = !isArray && typeof arg === "object" && arg !== null;

  if (isArray) {
    // Handle arrays that may contain serialized chains or other arrays
    if (arg.every((a) => "method" in a)) {
      return fluent({ api, chain: arg, ctx });
    }
    return arg.map((item) => processArgument(item, api, ctx)); // Recurse for nested arrays
  }

  if (isObject) {
    // Handle objects by recursively processing each property
    for (const key in arg) {
      arg[key] = processArgument(arg[key], api, ctx);
    }
    return arg;
  }

  // Return primitive values as-is
  return arg;
}

/**
 * Creates a fluent interface for the given API, allowing for method chaining and context management.
 * @param params - The parameters for creating the fluent interface.
 * @param params.api - The API object containing methods and properties.
 * @param params.chain - The initial chain of API calls.
 * @param params.ctx - The context object required by the API methods.
 * @returns A fluent interface for the given API.
 */
export function fluent<T extends Record<string, any>>({
  api,
  chain = [],
  ctx,
}: {
  api: T;
  chain?: StringChain | ApiCall[];
  ctx: RequiredContext<T>;
}): Fluent<T> {
  const jsonChain = typeof chain === "string" ? stringToChain(api, chain) : chain;
  const path = jsonChain.length ? jsonChain.slice(-1)[0].method.split(".").slice(0, -1) : [];
  const boundApi = bindConfigToApi(api, ctx || {});
  const parsedChain = chain ? initChain(jsonChain, boundApi, ctx) : [];
  return createProxy(boundApi, parsedChain, path, ctx || {}) as Fluent<T>;
}
