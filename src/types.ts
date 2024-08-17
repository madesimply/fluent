// Represents a call to an API method, storing the method name, optional arguments, and an optional goto reference.
export type ApiCall = { 
  method: string; 
  args?: any[]; 
  goto?: any; 
};

// Represents the context object, which can have any string keys with any type of values.
export type Ctx = {
  [key: string]: any;
};

// The Fluent type recursively transforms an API structure into a fluent interface.
// - For functions with no arguments or only optional arguments, allows them to be called as properties.
// - For functions with required arguments, ensures they are invoked with the correct arguments.
// - For nested objects, recursively applies the same transformation, allowing deeper structures to also be fluent.
export type Fluent<T> = {
  [K in keyof T]: 
    // If the property is a function, infer its argument types
    T[K] extends (ctx: any, ...args: infer Rest) => any ? 
      
      // Check if the function has at least one argument
      Rest extends [infer First, ...any[]] ? (...args: Rest) => Fluent<T> 
        
      //   // If the first argument is optional, treat the function like a property
      //   [First] extends [undefined] ? 
      //     Fluent<T> & { (): Fluent<T> } 
          
      //     // Otherwise, enforce the function arguments
      //     : (...args: Rest) => Fluent<T> 
          
      // // If the function has no arguments, treat it like a property
      // : Fluent<T> & { (): Fluent<T> } 
      
      // If the property is an object, recursively apply the Fluent type
      : T[K] extends object ? 
        Fluent<T[K]> : never
      
      // If the property is neither a function nor an object, it's not supported in the fluent interface
      : never;
} & { 
  // Allows the execution of the API chain with an optional context
  run: (args?: any) => any; 
  
  // Allows jumping to a different call in the fluent chain
  goto: (call: Fluent<T>) => Fluent<T>; 

  // Returns the current API chain as a string
  toString: () => string;
};

// Extracts the `this` type from a function, or returns `never` if the input is not a function.
// This is used to determine the context (`this`) type required by each method.
export type ExtractThisType<T> = T extends (this: infer U, ...args: any[]) => any ? U : never;

// Recursively traverses the API structure to collect all `this` types into a union.
// - If the current type is an object, it checks each property and extracts its `this` type.
// - If the current type is not an object, it returns `never`, effectively filtering out non-object types.
export type UnionThisTypes<T> = T extends object
  ? {
      [K in keyof T]: ExtractThisType<T[K]> | UnionThisTypes<T[K]>;
    }[keyof T]
  : never;

// Converts a union of types into an intersection of types.
// - Uses TypeScript's distributive conditional types to convert a union into an intersection.
// - This allows the merging of multiple `this` types into a single type that contains all properties.
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends ((k: infer I) => void) ? I : never;

// Determines the required context (`this`) type for the API structure.
// - First, it collects all `this` types into a union.
// - Then, it converts the union into an intersection to ensure the context satisfies all required properties.
// - If no `this` types are found, it returns `never`, indicating no specific context is required.
export type RequiredContext<T> = UnionToIntersection<UnionThisTypes<T>> extends never
  ? never
  : UnionToIntersection<UnionThisTypes<T>>;


export type StringChain = `${string}` | `${string}(${string})`;