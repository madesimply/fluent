import { fluent } from "./fluent";
import { ApiCall } from "./types";

function argToString(arg: any): string {
  if (typeof arg === "string") {
    return `"${arg}"`;
  }

  if (arg && arg.method) {
    return chainToString([arg]);
  }

  if (Array.isArray(arg)) {
    return `[${arg.map((v) => argToString(v)).join(", ")}]`;
  }
  if (arg && typeof arg === "object") {
    return `{ ${Object.entries(arg).map(([k, v]) => `${k}: ${argToString(v)}`).join(", ")} }`;
  }
  return arg;

}

/**
 * Converts an array of API calls into a string representation of a method chain.
 * @param calls - An array of API calls.
 * @returns The method chaining string.
 */
export function chainToString(calls: ApiCall[]): string {
  return calls
    .map((call) => {
      if (!call.args) {
        return call.method;
      }

      const args = call.args.map((arg) => {
        return argToString(arg);
      }).join(", ");

      return `${call.method}(${args})`;
    })
    .join(".");
}

/**
 * Converts a string representation of a method chain into an array of API calls. 
 * @param api - The base API object containing methods and properties.
 * @param str - The method chain string to execute.
 * @returns The result of executing the method chain on the mock API.
 */
export function stringToChain(api: Record<string, any>, chain: string): any {
  const getChain = new Function('api', 'fluent', `
    const root = fluent({ api });
    const { ${Object.keys(api).join(',')} } = root;
    const chain = ${chain};
    return JSON.parse(JSON.stringify(chain));
  `);
  return getChain(api, fluent);
}
