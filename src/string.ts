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
 * Executes a method chain on the mock API by parsing the method chain string
 * and invoking the appropriate methods on the mock API.
 * @param api - The base API object containing methods and properties.
 * @param str - The method chain string to execute.
 * @returns The result of executing the method chain on the mock API.
 */
export function stringToChain(api: Record<string, any>, chain: string): any {
  const root = fluent({ api, ctx: {} });
  const path = chain.split(".");

  let current: any = root;
  for (const key of path) {
    let [name, args] = key.split("(");
    args = args ? args.slice(0, -1) : args;
    if (args) {
      current = current[name](args);
    } else {
      current = current[name];
    }
  }

  return JSON.parse(JSON.stringify(current));
}
