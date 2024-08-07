## Batch User Processing

Here's a more complete example for hypothetical user processing job.

```
└── src
  ├── index.ts
  ├── types.ts
  ├── data.ts
  ├── string.ts
  ├── number.ts
  ├── helpers.ts
  ├── remote.ts
  └── server.ts
```

Let's start with the data we may want to process. Suppose we want to register all valid user. We know we want a valid email, and perhaps within a certain age range. 

```typescript 
// data.ts
export const data = [
  {
    name: "John Doe",
    email: "john.doe@example.com",
    age: 12,
    city: "New York",
  },
  {
    name: "Jane Smith",
    email: "jane.smith@example",
    age: 101,
    city: "Los Angeles",
  },
  {
    name: "Bob Johnson",
    email: "bob.johnson@example.com",
    age: 40,
    city: "Chicago",
  }
];
```

Now let's setup our types.

```typescript
// types.ts

// setup our context
// we'll add errors to the records
// we'll also add a current key to track the record being processes
export type Context = {
  data: { [key: string]: any, errors: string[] }[]; 
  current: { record: any, path: string; value: any, userId?: string }; 
};

// we'll use this to check strings (email etc..)
// we'll also provide the ability for custom error msgs
export type StringValidator = {
  min(ctx: Context, len: number, msg?: string): Context;
  max(ctx: Context, len: number, msg?: string): Context;
  pattern(ctx: Context, regex: string, msg?: string): Context;
  required(ctx: Context, msg?: string): Context;
}

// we'll use this to check numbers (age)
// we'll also provide the ability for custom error msgs
export type NumberValidator = {
  min(ctx: Context, min: number, msg?: string): Context;
  max(ctx: Context, max: number, msg?: string): Context;
  required(ctx: Context, msg?: string): Context;
}

// we'll use this to interact with the server
export type ServerApi = {
  registerUser(ctx: Context): Promise<Context>
}

// each will iterate the records for us
export type EachRecord = (ctx: Context, ops: any[]) => Promise<Context>;

// path will set the current path and value for the rest of the ops
export type SetPath = (ctx: Context, path: string) => Context;

// this will perform check and if there's no errors will run the ops
export type OnSuccess = (ctx: Context, ops: any[]) => Promise<Context>;

// here's our whole api
export type Api = {
  each: EachRecord;
  path: SetPath;
  onSuccess: OnSuccess;
  string: StringValidator;
  number: NumberValidator;
  server: ServerApi;
}
```

Let's setup our string validator

```typescript
// string.ts
import { StringValidator } from "./types";

const string: StringValidator = {
  min(ctx, len, msg) {
    if (typeof ctx.current.value !== "string" || ctx.current.value.length < len) {
      ctx.errors.push(msg || "String is too short");
    }
    return ctx;
  },
  max(ctx, len, msg) {
    if (typeof ctx.current.value !== "string" || ctx.current.value.length > len) {
      ctx.errors.push(msg || "String is too long");
    }
    return ctx;
  },
  pattern(ctx, pattern, msg) {
    const regex = new RegExp(pattern);
    if (typeof ctx.current.value !== "string" || !regex.test(ctx.current.value)) {
      ctx.errors.push(msg || "String does not match pattern");
    }
    return ctx;
  },
  required(ctx, msg) {
    if (typeof ctx.current.value !== "string" || !ctx.current.value.length) {
      ctx.errors.push(msg || "String is required");
    }
    return ctx;
  }
}
```

Now the number validator

```typescript
// number.ts
import { NumberValidator } from "./types";

const number: NumberValidator = {
  min(ctx, min, msg) {
    if (typeof ctx.current.value !== "number" || ctx.current.value < min) {
      ctx.errors.push(msg || "Number is too small");
    }
    return ctx;
  },
  max(ctx, max, msg) {
    if (typeof ctx.current.value !== "number" || ctx.current.value > max) {
      ctx.errors.push(msg || "Number is too big");
    }
    return ctx;
  },
  required(ctx, msg) {
    if (typeof ctx.current.value !== "number") {
      ctx.errors.push(msg || "Number is required");
    }
    return ctx;
  }
}
```

The server methods

```typescript
// server.ts
import { Server } from "./types";

const server: Server = {
  async registerUser(ctx) {
    const userId = Math.random().toString(36).substring(2, 9);
    ctx.current.record.userId = userId;
    return ctx;
  },
  async sendNewsLetter(ctx) {
    ctx.current.record.newsLetterSent = true;
    return ctx;
  }
}
```

Finally our helpers

```typescript
// helpers.ts
import { EachRecord, SetPath, OnSuccess } from "./types";

const helpers: {
  each: EachRecord,
  path: SetPath,
  onSuccess: OnSuccess,
} = {
  async each(ctx, ops) {
    const isArray = Array.isArray(ctx.data);
    if (!isArray) {
      ctx.errors.push("Data is not an array");
    }
    for(const record of ctx.data) {
      ctx.current.record = record;
      for(const op of ops) {
        await op.run(ctx)
      }
      // if there's errors, add them to the record
      if (ctx.errors.length) {
        record.errors = [ ...ctx.errors ]; 
        ctx.errors = [];
      }
    }
    return ctx;
  },
  path(ctx, path) {
    ctx.current.path = path;
    ctx.current.value = ctx.current.record[path];
    return ctx;
  },
  async onSuccess(ctx, ops) {
    if (!ctx.errors.length) {
      for(const op of ops) {
        await op.run(ctx)
      }
    }
    return ctx;
  },
}
```
Let's bring it altogether 

```typescript
// index.ts
import { Api, Context } from "./types";
import { data } from "./data";
import { string } from "./string";
import { number } from "./number";
import { helpers } from "./helpers";
import { server } from "./server";
import { fluent } from "fluent";

const api: Api = {
  ...helpers,
  string,
  number,
  server,
};

// a helper regex
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.source

const root = fluent(api);
const { each, path, onSuccess, server } = root;

// setup the op chain
const op = each([
  path("name").string.min(3).max(50),
  path("email").string.pattern(emailPattern, 'INVALID_EMAIL'),
  path("age").number.min(18, 'TO_YOUNG').max(100, 'TO_OLD'),
  path("city").string.min(3).max(50),
  onSuccess([server.registerUser])
]);

// setup the context
const ctx: Context = { 
  data, 
  current: { record: {}, path: "", value: "" }, 
  errors: [] 
};

// run your data
const { data } = await op.run(ctx);

/**
 *  [
 *    {
 *      "name": "John Doe",
 *      "email": "john.doe@example.com",
 *      "age": 12,
 *      "city": "New York",
 *      "errors": [
 *        "TO_YOUNG"
 *      ]
 *    },
 *    {
 *      "name": "Jane Smith",
 *      "email": "jane.smith@example",
 *      "age": 101,
 *      "city": "Los Angeles",
 *      "errors": [
 *        "INVALID_EMAIL",
 *        "TO_OLD"
 *      ]
 *    },
 *    {
 *      "name": "Bob Johnson",
 *      "email": "bob.johnson@example.com",
 *      "age": 40,
 *      "city": "Chicago",
 *      "userId": "w0oda1a"
 *    }
 *  ]
 */
```
Later in a remote system you may want to / need to add functionality. Let's bring our serialized op chain in say from a database, enhance it. 

```typescript
// remote.ts
import { data } from "./data";
import { string } from "./string";
import { number } from "./number";
import { helpers } from "./helpers";
import { server } from "./server";
import { fluent, toChain } from "fluent";

// we need to rebuild our root api
// IRL you'd ideally have a share lib for this
// and just import { userApi } from your env
const root = fluent({
  ...helpers,
  string,
  number,
  server,
});

// let's bring in our db
const db = JSON.stringify(op);

// we can parse it and remove the registration step
const json = JSON.parse(db);
json[0].args.slice(-1);

// let's now parse it back to a chainable api
const originalChain = toChain(json, root);
console.log(JSON.stringify(originalChain.onSuccess([server.sendNewsLetter]), null, 2));  

// we now have an operation chain based on 
// a user registration chain

// let's send a news letter to registered users
// while not losing any of the prechecks / validations
const op = originalChain.onSuccess([server.sendNewsLetter]);

const ctx = { 
  data, 
  current: { record: {}, path: "", value: "" }, 
  errors: [] 
}; 

const result = await op.run(ctx);
console.log(JSON.stringify(result.data, null, 2))  

/**
 * [
 *   {
 *     "name": "John Doe",
 *     "email": "john.doe@example.com",
 *     "age": 12,
 *     "city": "New York",
 *     "errors": [
 *       "TO_YOUNG"
 *     ]
 *   },
 *   {
 *     "name": "Jane Smith",
 *     "email": "jane.smith@example",
 *     "age": 101,
 *     "city": "Los Angeles",
 *     "errors": [
 *       "INVALID_EMAIL",
 *       "TO_OLD"
 *     ]
 *   },
 *   {
 *     "name": "Bob Johnson",
 *     "email": "bob.johnson@example.com",
 *     "age": 40,
 *     "city": "Chicago",
 *     "userId": "cy2sn2g",
 *     "newsLetterSent": true
 *   }
 * ]
 */

```