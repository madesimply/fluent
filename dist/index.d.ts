type ApiCall = {
    method: string;
    args?: any[];
    goto?: any;
};
type Fluent<T> = {
    [K in keyof T]: T[K] extends (ctx: any, ...args: infer Rest) => any ? Rest extends [] ? Fluent<T> & {
        (): Fluent<T>;
    } : (...args: Rest) => Fluent<T> : T[K] extends object ? Fluent<T[K]> : never;
} & {
    run: (ctx?: any) => any;
    goto: (call: Fluent<T>) => Fluent<T>;
};

declare function fluent<T extends Record<string, any>>(api: T): Fluent<T>;
declare function fluent<T extends Record<string, any>>(api: T, chain: ApiCall[]): Fluent<T>;

export { type ApiCall, type Fluent, fluent };
