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

export type Opts = {
  ctx: Context;
  run?: (op: any) => Promise<any>
}

// we'll use this to check strings (email etc..)
// we'll also provide the ability for custom error msgs
export type StringValidator = {
  min(opts: Opts, len: number, msg?: string): void;
  max(opts: Opts, len: number, msg?: string): void;
  pattern(opts: Opts, regex: string, msg?: string): void;
  required(opts: Opts, msg?: string): void;
}

// we'll use this to check numbers (age)
// we'll also provide the ability for custom error msgs
export type NumberValidator = {
  min(opts: Opts, min: number, msg?: string): void;
  max(opts: Opts, max: number, msg?: string): void;
  required(opts: Opts, msg?: string): void;
}

// we'll use this to interact with the server
export type ServerApi = {
  registerUser(opts: Opts): Promise<void>
}

// each will iterate the records for us
export type EachRecord = (opts: Opts, ...ops: any) => Promise<void>;

// path will set the current path and value for the rest of the ops
export type SetPath = (opts: Opts, path: string) => void;

// this will perform check and if there's no errors will run the ops
export type OnSuccess = (opts: Opts, ...ops: any) => Promise<void>;

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
  min({ ctx }, len, msg) {
    if (typeof ctx.current.value !== "string" || ctx.current.value.length < len) {
      ctx.errors.push(msg || "String is too short");
    }
  },
  max({ ctx }, len, msg) {
    if (typeof ctx.current.value !== "string" || ctx.current.value.length > len) {
      ctx.errors.push(msg || "String is too long");
    }
  },
  pattern({ ctx }, pattern, msg) {
    const regex = new RegExp(pattern);
    if (typeof ctx.current.value !== "string" || !regex.test(ctx.current.value)) {
      ctx.errors.push(msg || "String does not match pattern");
    }
  },
  required({ ctx }, msg) {
    if (typeof ctx.current.value !== "string" || !ctx.current.value.length) {
      ctx.errors.push(msg || "String is required");
    }
  }
}
```

Now the number validator

```typescript
// number.ts
import { NumberValidator } from "./types";

const number: NumberValidator = {
  min({ ctx }, min, msg) {
    if (typeof ctx.current.value !== "number" || ctx.current.value < min) {
      ctx.errors.push(msg || "Number is too small");
    }
  },
  max({ ctx }, max, msg) {
    if (typeof ctx.current.value !== "number" || ctx.current.value > max) {
      ctx.errors.push(msg || "Number is too big");
    }
  },
  required({ ctx }, msg) {
    if (typeof ctx.current.value !== "number") {
      ctx.errors.push(msg || "Number is required");
    }
  }
}
```

The server methods

```typescript
// server.ts
import { Server } from "./types";

const server: Server = {
  async registerUser({ ctx }) {
    const userId = Math.random().toString(36).substring(2, 9);
    ctx.current.record.userId = userId
  },
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
  async each({ ctx, run }, ...ops) {
    const isArray = Array.isArray(ctx.data);
    if (!isArray) {
      ctx.errors.push("Data is not an array");
    }
    for(const record of ctx.data) {
      ctx.current.record = record;
      for(const op of ops) {
        await run(op);
      }
      // if there's errors, add them to the record
      if (ctx.errors.length) {
        record.errors = [ ...ctx.errors ]; 
        ctx.errors = [];
      }
    }
  },
  path({ ctx }, path) {
    ctx.current.path = path;
    ctx.current.value = ctx.current.record[path];
  },
  async onSuccess({ ctx, run }, ...ops) {
    if (!ctx.errors.length) {
      for(const op of ops) {
        await run(op);
      }
    }
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
import { fluent, run } from "fluent";

const api: Api = {
  ...helpers,
  string,
  number,
  server,
};

// a helper regex
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.source

const { each, path, onSuccess, server } = fluent(api);

// setup the op chain
const op = each(
  path("name").string.min(3).max(50),
  path("email").string.pattern(emailPattern, 'INVALID_EMAIL'),
  path("age").number.min(18, 'TO_YOUNG').max(100, 'TO_OLD'),
  path("city").string.min(3).max(50),
  onSuccess(server.registerUser)
);

// setup the context
const ctx: Context = { 
  data, 
  current: { record: {}, path: "", value: "" }, 
  errors: [] 
};

// run your data
run({ op, ctx, api })
  .then(({ data }) => {
    console.log(JSON.stringify(data, null, 2))
  });

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
