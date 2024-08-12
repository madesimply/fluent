import { fluent } from "./fluent";
import { ApiCall } from "./types";

/**
 * Converts an array of API calls back into a method chaining string.
 * @param calls - An array of API calls.
 * @returns The method chaining string.
 */
export function chainToString(calls: ApiCall[]): string {
  return calls
    .map((call) => {
      const args = call.args?.length ? `(${call.args.join(", ")})` : "";
      return `${call.method}${args}`;
    })
    .join(".");
}

/**
 * Parses an array of argument strings, attempting to convert each into its appropriate type.
 * If the argument is a method chain, it is recursively processed.
 * @param args - The array of argument strings to parse.
 * @param baseApi - The base API object containing methods and properties.
 * @returns An array of parsed arguments.
 */
function parseArguments(args: any[], baseApi: Record<string, any>): any[] {
  args = Array.isArray(args) ? args : [args];
  return args.map(arg => {
    try {
      // Try to parse as JSON
      return JSON.parse(arg);
    } catch {
      // If parsing fails, treat it as a method chain
      return stringToChain(baseApi, arg);
    }
  });
}

/**
 * Creates a mock method that returns its full method path and parsed arguments.
 * @param path - The full path of the method within the API.
 * @param baseApi - The base API object containing methods and properties.
 * @param argLength - The number of arguments the method accepts.
 * @returns A function that simulates the method call, returning the method path and arguments.
 */
function createMockMethod(
  path: string,
  baseApi: Record<string, any>,
  argLength: number
): (data: any, args: any[]) => { method: string; args: any[] } {
  if (argLength < 2) {
    return function (data: any): { method: string; args: any[] } {
      return { method: path, args: [] };
    };
  } else {
    return function (data: any, args): { method: string; args: any[] } {
      const parsedArgs = parseArguments(args, baseApi);
      return { method: path, args: parsedArgs };
    };
  }
}

/**
 * Recursively traverses an API object to build a mock API where each method is replaced
 * with a function that returns the method's full path and arguments.
 * @param api - The API object to traverse.
 * @param path - The current path of the method being traversed.
 * @param baseApi - The base API object containing methods and properties.
 * @returns A mock API object with methods that return their path and arguments.
 */
function traverseApi(
  api: Record<string, any>,
  path: string = "",
  baseApi: Record<string, any>
): Record<string, any> {
  const mock: Record<string, any> = {};
  for (let key in api) {
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof api[key] === "function") {
      mock[key] = createMockMethod(currentPath, baseApi, api[key].length);
    } else if (typeof api[key] === "object" && api[key] !== null) {
      mock[key] = traverseApi(api[key], currentPath, baseApi);
    }
  }
  return mock;
}

/**
 * Builds a mock API by traversing the base API and replacing methods with mock methods
 * that return their path and arguments.
 * @param baseApi - The base API object containing methods and properties.
 * @returns A mock API object.
 */
function buildMockApi(baseApi: Record<string, any>): Record<string, any> {
  return traverseApi(baseApi, "", baseApi);
}

/**
 * Executes a method chain on the mock API by parsing the method chain string
 * and invoking the appropriate methods on the mock API.
 * @param api - The base API object containing methods and properties.
 * @param str - The method chain string to execute.
 * @returns The result of executing the method chain on the mock API.
 */
export function stringToChain(api: Record<string, any>, str: string): any {
  const mockApi = buildMockApi(api);
  const mockRoot = fluent({ api: mockApi, ctx: {} });

  // Extract arguments and method chain from the input string
  const args = '(' + str.split('(').slice(1).join('(');  
  const chain = str.split('(')[0];
  const methods = chain.split('.');
  methods[methods.length - 1] += args === '(' ? '' : args;

  let current: any = mockRoot;
  for (let method of methods) {
    if (method.includes('(')) {
      const [methodName, args] = method.split('(');
      const parsedArgs = args.slice(0, -1).split(',').map(arg => arg.trim());
      current = current[methodName](parsedArgs, mockRoot);
    } else {
      current = current[method];
    }
  }

  // Execute the final method in the chain
  return [current.run()];
}
