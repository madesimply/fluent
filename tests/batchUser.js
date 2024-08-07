import { fluent, toChain } from "../dist/index.js";

const data = [
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
  },
];

const string = {
  min({ ctx }, len, msg) {
    if (
      typeof ctx.current.value !== "string" ||
      ctx.current.value.length < len
    ) {
      ctx.errors.push(msg || "String is too short");
    }
    return ctx;
  },
  max({ ctx }, len, msg) {
    if (
      typeof ctx.current.value !== "string" ||
      ctx.current.value.length > len
    ) {
      ctx.errors.push(msg || "String is too long");
    }
    return ctx;
  },
  pattern({ ctx }, pattern, msg) {
    const regex = new RegExp(pattern);
    if (
      typeof ctx.current.value !== "string" ||
      !regex.test(ctx.current.value)
    ) {
      ctx.errors.push(msg || "String does not match pattern");
    }
    return ctx;
  },
  required({ ctx }, msg) {
    if (typeof ctx.current.value !== "string" || !ctx.current.value.length) {
      ctx.errors.push(msg || "String is required");
    }
    return ctx;
  },
};

const number = {
  min({ ctx }, min, msg) {
    if (typeof ctx.current.value !== "number" || ctx.current.value < min) {
      ctx.errors.push(msg || "Number is too small");
    }
    return ctx;
  },
  max({ ctx }, max, msg) {
    if (typeof ctx.current.value !== "number" || ctx.current.value > max) {
      ctx.errors.push(msg || "Number is too big");
    }
    return ctx;
  },
  required({ ctx }, msg) {
    if (typeof ctx.current.value !== "number") {
      ctx.errors.push(msg || "Number is required");
    }
    return ctx;
  },
};

const serverMethods = {
  async registerUser({ ctx }) {
    if (ctx.current.record.userId) {
      return;
    }
    const userId = Math.random().toString(36).substring(2, 9);
    ctx.current.record.userId = userId;
    return ctx;
  },
  async sendNewsLetter({ ctx }) {
    ctx.current.record.newsLetterSent = true;
    return ctx;
  },
};

const helpers = {
  async each({ ctx, chain }, ops) {
    const isArray = Array.isArray(ctx.data);
    if (!isArray) {
      ctx.errors.push("Data is not an array");
    }
    for (const record of ctx.data) {
      ctx.current.record = record;
      for (const op of ops) {
        await toChain(op, chain).run(ctx);
      }
      // if there's errors, add them to the record
      if (ctx.errors.length) {
        record.errors = [...ctx.errors];
        ctx.errors = [];
      }
    }
    return ctx;
  },
  path({ ctx }, path) {
    ctx.current.path = path;
    ctx.current.value = ctx.current.record[path];
    return ctx;
  },
  async onSuccess({ ctx, chain }, ops) {
    if (!ctx.errors.length) {
      for (const op of ops) {
        await toChain(op, chain).run(ctx);
      }
    }
    return ctx;
  },
};

const api = {
  ...helpers,
  string,
  number,
  server: serverMethods,
};

// a helper regex
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.source;

const root = fluent(api);
const { each, path, onSuccess, server } = root;

// setup the op chain
const op = each([
  path("name").string.min(3).max(50),
  path("email").string.pattern(emailPattern, "INVALID_EMAIL"),
  path("age").number.min(18, "TO_YOUNG").max(100, "TO_OLD"),
  path("city").string.min(3).max(50),
  onSuccess([server.registerUser]),
]);

// setup the context
const ctx = {
  data,
  current: { record: {}, path: "", value: "" },
  errors: [],
};

// run your data
const result = await op.run(ctx);
console.log(JSON.stringify(result.data, null, 2));

// let's bring in our db
const db = JSON.stringify(op);

// we can parse it and remove the registration step
const json = JSON.parse(db);
json[0].args.slice(-1);

// let's now parse it back to a chainable api
const originalChain = toChain(json, root);
console.log(
  JSON.stringify(originalChain.onSuccess([server.sendNewsLetter]), null, 2)
);

// we now have an operation chain based on
// a user registration chain

// let's send a news letter to registered users
// while not losing any of the prechecks / validations
const op2 = originalChain.onSuccess([server.sendNewsLetter]);

const ctx2 = {
  data,
  current: { record: {}, path: "", value: "" },
  errors: [],
};

const result2 = await op2.run(ctx2);
console.log(JSON.stringify(result2.data, null, 2));
