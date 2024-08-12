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
export function stringToChain(api: Record<string, any>, str: string): any {
  const mockRoot = fluent({ api, ctx: {} });

  const splitPath = str.split('.');
  const path: string[] = [];
  let current: string = '';

  // Parse the method chain string into a list of method calls
  splitPath.forEach(part => {
    current += part;
    const openBrackets = (current.match(/\(/g) || []).length;
    const closeBrackets = (current.match(/\)/g) || []).length;

    if (openBrackets === closeBrackets) {
      path.push(current);
      current = '';
    } else {
      current += '.';
    }
  });

  // Traverse the parsed path on the mockRoot
  let currentNode: any = mockRoot;
  path.forEach(part => {
    // Extract method name and arguments
    const methodName = part.replace(/\(.*\)/, '');
    const argsMatch = part.match(/\((.*)\)/);
    const args = argsMatch ? argsMatch[1] : null;
    if (args) currentNode = currentNode[methodName](args);
    else currentNode = currentNode[methodName];
  });

  // Execute the final method in the chain
  return JSON.parse(JSON.stringify(currentNode.run()));
}