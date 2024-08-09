type ApiCall = {
    method: string;
    args?: any[];
    goto?: any;
};
type Ctx = {
    [key: string]: any;
};
type Fluent<T> = {
    [K in keyof T]: T[K] extends (ctx: any, ...args: infer Rest) => any ? Rest extends [] ? Fluent<T> & {
        (): Fluent<T>;
    } : (...args: Rest) => Fluent<T> : T[K] extends object ? Fluent<T[K]> : never;
} & {
    run: (ctx?: any) => any;
    goto: (call: Fluent<T>) => Fluent<T>;
};
type ExtractThisType<T> = T extends (this: infer U, ...args: any[]) => any ? U : never;
type UnionThisTypes<T> = T extends object ? {
    [K in keyof T]: ExtractThisType<T[K]> | UnionThisTypes<T[K]>;
}[keyof T] : never;
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type RequiredContext<T> = UnionToIntersection<UnionThisTypes<T>> extends never ? never : UnionToIntersection<UnionThisTypes<T>>;

declare function fluent<T extends Record<string, any>>({ api, chain, ctx }: {
    api: T;
    chain?: ApiCall[];
    ctx: RequiredContext<T>;
}): Fluent<T>;

export { type ApiCall, type Ctx, type ExtractThisType, type Fluent, type RequiredContext, type UnionThisTypes, type UnionToIntersection, fluent };
