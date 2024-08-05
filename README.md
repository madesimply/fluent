# Fluent

> [!WARNING]  
> This is very much in beta mode. Expect breaking changes as things mature, meantime provide feedback, create issues or PRs. 


**TLDR** - Fluent helps you build complex [fluent interfaces](https://en.wikipedia.org/wiki/Fluent_interface) aka "chainable methods" easily. 

Fluent is a lightweight TypeScript library designed to help you build complex, strongly typed fluent APIs with ease. It provides a flexible and intuitive way to create and execute chains of operations, which can include validations, data transformations, API calls, and more. Fluent simplifies the process of constructing these operation chains. When used effectively, it allows you to write logic that reads like the business requirement equivalent, making it easier to align your code with business rules. Additionally, Fluent's programming paradigm encourages the use of small, reusable methods, which enhances testability and supports robust and reliable development.

## Motivation

**TLDR** - Fluent interfaces are great to use but hard to setup, harder to maintain. This aims to remove the shortcomings.

[Fluent Interface](https://en.wikipedia.org/wiki/Fluent_interface) patterns can make your code very succinct and semantic. This can be extermely beneficial for complex business logic. But traditional fluent interface patterns have some challenged with [error capture](https://en.wikipedia.org/wiki/Fluent_interface#Errors_cannot_be_captured_at_compile_time), [debugging](https://en.wikipedia.org/wiki/Fluent_interface#Debugging_and_error_reporting), [logging](https://en.wikipedia.org/wiki/Fluent_interface#Logging), [subclassing](https://en.wikipedia.org/wiki/Fluent_interface#Subclasses), [maintenance](https://www.yegor256.com/2018/03/13/fluent-interfaces.html#:~:text=Fluent%20interfaces%20are%20good%20for%20users%2C%20but%20bad%20for%20library,an%20advantage%2C%20not%20a%20drawback.). Furthermore methods and their relationships must be known at the time you're building them, you have to make assumptions about how they'll be used. 

Leveraging TypeScript, Proxies and the concept of context... Fluent allows you to build fluent apis without the challenges and some added benefit.

## Installation

To install Fluent, use npm:

```bash
npm install https://github.com/paulpomerleau/fluent
```

## Quickstart

```typescript
// import your library and types 
import { fluent, run } from "./fluent"

/** 
 * setup context type (can be anything)
 * context is passed to all methods in the chain
 * and retuned at the end
 * 
 * type Ctx = {
 *     [key: string]: any - add whatever you want
 * }
 */
type Context = {
    value: any; // we'll use the value key to set our input
    errors: string[]; // let's track any errors here
    token: string | null; // we'll store the token here
}

/**
 * along with the context, methods are passed an run function
 * this function allows you to run other ops in the chain
 */
type Opts = {
  ctx: Context;
  run?: (op: any) => Promise<any>;
}

/**
 * setup methods you want to chain
 * let's do a string validator and auth as seperate apis
 */
 
// for the string we'll check for length and pattern
type VString = {
    min: (opts: Opts, len: number) => void, 
    max: (opts: Opts, len: number) => void, 
    pattern: (opts: Opts, regex: string) => void,
}

// helper for all string methods
const isString = (ctx: Context) => {
    const isValid = typeof ctx.value === 'string';
    if (!isValid) ctx.errors.push('Invalid string');
    return isValid;
}

const stringMethods: VString = {
    min(opts: Opts, len: number) {
        if(!isString(opts.ctx) || opts.ctx.value.length < len) {
            opts.ctx.errors.push('String is too short');
        }
    },
    max(opts: Opts, len: number) {
        if(!isString(opts.ctx) || opts.ctx.value.length > len) {
            opts.ctx.errors.push('String is too long');
        }
    },
    pattern(opts: Opts, pattern: string) {
        const regex = new RegExp(pattern);
        if (!isString(opts.ctx) || !regex.test(opts.ctx.value)) {
            opts.ctx.errors.push('String does not match expected pattern');
        }
    }
}

// for the auth we'll expose a createToken method
type Auth = {
    createToken: (opts: Opts) => void,
}

const authMethods: Auth = {
    createToken(opts: Opts) {
        opts.ctx.token = opts.ctx.errors.length ? 
            null : (Math.random() + 1).toString(36).substring(7);
    }
}

// now we can create our fluent api
const api = { string: stringMethods, auth: authMethods };
const { string, auth } = fluent(api);

// setup the chains you'll need
const isEmail = /^\S+@\S+\.\S+$/.source;
const login = string.pattern(isEmail).auth.createToken;
const ctx = { value: 'test@email.com', errors: [] };

// now you can run this chain against any number of values
// run functions always return a promise
run({ op: login, api, ctx }).then(result => {
    console.log(result);
})
/** 
 * output:
 * {
 *   value: 'test@email.com',
 *   errors: [],
 *   token: 'p8ze5g'
 * }
 */

/** 
 *  later it's graceful to add more constraints or functionality
 *  for example, if you wanted to add an email.send method
 *  you could create an email api then inject it into the chain
 */ 

const loginThenEmail = 
    string.pattern(isEmail).min(8).max(20).
    auth.createToken.
    email.send('welcome');

```
See the [batch user registration example](./docs/BATCH_USER_REGISTRATION.md) for more a more complete / advanced setup.

#### You can switch APIs in your chain
You can switch to another API anywhere in your chain by calling a root. 
```typescript
string.min(8).number.even;
```

#### Null param methods are not callable
If you have functions that have no arguments defined, you reference them as a property in the chain, not a function call. Eg a `required` function without args is chained like this: `string.min(8).required`.

#### Async functions
Methods are called in order and await for responses if they're asynchronous. If you're certain your chain has no promises, you don't need an await. If you're unsure, there's no harm in using await. 

#### Method namespacing
You can have methods at any level... it's completely up to you.
```typescript
type FancyMethods = {
    // let's create a logic or operator at root,
    or: ({ ctx, run }, ...ops: any) => void, 
    // a namespace for string methods
    string: { 
        min: ({ ctx, run }, len: number) => void,
         // a nested namespace for certain types of strings
        email: {
            corporate: () => void, 
            gmail: () => void, 
        }
    },
    auth: {
        registerLead: () => void,
    }
}

// ... later
const op = or(
    string.email.corporate,
    string.email.gmail
).auth.registerLead;
```

## Use Cases

In general any problem space that has complex and often varying business requirements is a good candidate. Some challenges that that seem particularly suited to fluent apis:

- Data validation and sanitization
- Chaining API calls with structured error handling
- Implementing complex business logic
- Orchestrating multi-step workflows
- Creating reusable and testable methods
- Building dynamic query builders
- Data processing with complex requirements
- Managing feature toggles and configurations
- Handling user authentication and authorization flows
- Aggregating and processing data from multiple sources
- Coordinating event-driven actions

You can also get creative. Context can be anything that can hold props (for `run` helper). It can be a function, suppose to log ops to datadog / sentry. It can be a reactive Proxy like a valtio store and trigger re-renders on your UI. It can hold many functions and store results for complex data transformations. 

If you also think about touring completeness, you can create logical operands, looping at the root and math via methods. This can lead to extremely complex chains that retain their semantic legibility. This can lead to better cohesion and collaboration between development and business units eg: 

```typescript
const op = whileNotFinished(
    if(string.email.corporate, email.monthlyReport).
    if(string.email.gmail, email.monthlyUpdates).
    everyStaff(email.chainResults)
);

const result = await run({ op, api, ctx });
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.


