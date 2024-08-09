export type ApiCall = { method: string; args?: any[]; goto?: any };

export type Ctx = {
  [key: string]: any;
}

export type Fluent<T> = {
  [K in keyof T]: 
    T[K] extends (ctx: any, ...args: infer Rest) => any ? 
      Rest extends [] ? 
        Fluent<T> & { (): Fluent<T> } : 
        (...args: Rest) => Fluent<T> 
      : T[K] extends object ? 
        Fluent<T[K]> 
      : never;
} & { run: (ctx?: any) => any; goto: (call: Fluent<T>) => Fluent<T> };

// Extract the `this` type from a function, or return `never` if not a function
export type ExtractThisType<T> = T extends (this: infer U, ...args: any[]) => any ? U : never;

// Recursively extract and union all `this` types found in the structure, while filtering out non-object types
export type UnionThisTypes<T> = T extends object
  ? {
      [K in keyof T]: ExtractThisType<T[K]> | UnionThisTypes<T[K]>;
    }[keyof T]
  : never;

// Convert a union of types into an intersection
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends ((k: infer I) => void) ? I : never;

// If no `this` type is found, return `never`; otherwise, return the intersection of all found `this` types
export type RequiredContext<T> = UnionToIntersection<UnionThisTypes<T>> extends never
  ? never
  : UnionToIntersection<UnionThisTypes<T>>;