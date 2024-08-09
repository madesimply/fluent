type ApiCall = {
    method: string;
    args?: any[];
    goto?: any;
};
type Ctx = {
    [key: string]: any;
};
type Fluent<T> = {
    [K in keyof T]: T[K] extends (ctx: any, ...args: infer Rest) => any ? Rest extends [infer First, ...any[]] ? [
        First
    ] extends [undefined] ? Fluent<T> & {
        (): Fluent<T>;
    } : (...args: Rest) => Fluent<T> : Fluent<T> & {
        (): Fluent<T>;
    } : T[K] extends object ? Fluent<T[K]> : never;
} & {
    run: (args?: any) => any;
    goto: (call: Fluent<T>) => Fluent<T>;
};
type ExtractThisType<T> = T extends (this: infer U, ...args: any[]) => any ? U : never;
type UnionThisTypes<T> = T extends object ? {
    [K in keyof T]: ExtractThisType<T[K]> | UnionThisTypes<T[K]>;
}[keyof T] : never;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type RequiredContext<T> = UnionToIntersection<UnionThisTypes<T>> extends never ? never : UnionToIntersection<UnionThisTypes<T>>;

/**
 * Creates a fluent interface for the given API, allowing for method chaining and context management.
 * @param {Object} params - The parameters for creating the fluent interface.
 * @param {T} params.api - The API object containing methods and properties.
 * @param {ApiCall[]} [params.chain=[]] - The initial chain of API calls.
 * @param {RequiredContext<T>} params.ctx - The context object required by the API methods.
 * @returns {Fluent<T>} - A fluent interface for the given API.
 */
declare function fluent<T extends Record<string, any>>({ api, chain, ctx }: {
    api: T;
    chain?: ApiCall[];
    ctx: RequiredContext<T>;
}): Fluent<T>;

export { type ApiCall, type Ctx, type ExtractThisType, type Fluent, type RequiredContext, type UnionThisTypes, type UnionToIntersection, fluent };
