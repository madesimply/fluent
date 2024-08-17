type ApiCall = {
    method: string;
    args?: any[];
    goto?: any;
};
type Ctx = {
    [key: string]: any;
};
type Fluent<T> = {
    [K in keyof T]: T[K] extends (ctx: any, ...args: infer Rest) => any ? Rest extends [infer First, ...any[]] ? (...args: Rest) => Fluent<T> : Fluent<T> & {
        (): Fluent<T>;
    } : T[K] extends object ? Fluent<T[K]> : never;
} & {
    run: (args?: any) => any;
    goto: (call: Fluent<T>) => Fluent<T>;
    toString: () => string;
};
type ExtractThisType<T> = T extends (this: infer U, ...args: any[]) => any ? U : never;
type UnionThisTypes<T> = T extends object ? {
    [K in keyof T]: ExtractThisType<T[K]> | UnionThisTypes<T[K]>;
}[keyof T] : never;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type RequiredContext<T> = UnionToIntersection<UnionThisTypes<T>> extends never ? never : UnionToIntersection<UnionThisTypes<T>>;
type StringChain = `${string}` | `${string}(${string})`;

/**
 * Traverses the chain and its arguments. Recursively processes each element, converting serialized chains back into fluent interfaces,
 * and handling primitives, objects, and nested structures as needed.
 * @param chain - The chain to traverse.
 * @param api - The API object containing methods and properties.
 * @param ctx - The context object required by the API methods.
 * @returns The chain with serialized chains and nested structures converted into their appropriate forms.
 */
declare function initChain<T extends Record<string, any>>(chain: ApiCall[], api: T, ctx: RequiredContext<T>): ApiCall[];
/**
 * Creates a fluent interface for the given API, allowing for method chaining and context management.
 * @param params - The parameters for creating the fluent interface.
 * @param params.api - The API object containing methods and properties.
 * @param params.chain - The initial chain of API calls.
 * @param params.ctx - The context object required by the API methods.
 * @returns A fluent interface for the given API.
 */
declare function fluent<T extends Record<string, any>>({ api, chain, ctx, }: {
    api: T;
    chain?: StringChain | ApiCall[];
    ctx: RequiredContext<T>;
}): Fluent<T>;

export { type ApiCall, type Ctx, type ExtractThisType, type Fluent, type RequiredContext, type StringChain, type UnionThisTypes, type UnionToIntersection, fluent, initChain };
