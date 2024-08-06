// import your library and types
import { fluent, toChain } from "../dist/index.js";

// helper for all string methods
const isString = (ctx) => {
  const isValid = typeof ctx.value === "string";
  if (!isValid) ctx.errors.push("Invalid string");
  return isValid;
};

const stringMethods = {
  required: (opts) => {
    if (!isString(opts.ctx) || !opts.ctx.value.length) {
      opts.ctx.errors.push("String is required");
    }
  },
  min(opts, len) {
    if (!isString(opts.ctx) || opts.ctx.value.length < len) {
      opts.ctx.errors.push("String is too short");
    }
  },
  max(opts, len) {
    if (!isString(opts.ctx) || opts.ctx.value.length > len) {
      opts.ctx.errors.push("String is too long");
    }
  },
  pattern(opts, pattern) {
    const regex = new RegExp(pattern);
    if (!isString(opts.ctx) || !regex.test(opts.ctx.value)) {
      opts.ctx.errors.push("String does not match expected pattern");
    }
  },
};

// for the auth we'll expose a createToken method
const authMethods = {
  createToken(opts) {
    opts.ctx.token = opts.ctx.errors.length
      ? null
      : (Math.random() + 1).toString(36).substring(7);
  },
};

// now we can create our fluent api
const api = { string: stringMethods, auth: authMethods };
const { string } = fluent(api);

// setup the chains you'll need
const isEmail = /^\S+@\S+\.\S+$/.source;
const login = string.pattern(isEmail).auth.createToken;
const ctx = { value: "test@email.com", errors: [] };

// now you can run this chain against any number of values
// run functions always return a promise
const result = login.run(ctx);
console.log(result);

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

const sendEmail = async (opts, message) => {
  if (opts.ctx.errors.length) {
    opts.ctx.email = "Email not sent";
  } else {
    opts.ctx.email = `Email sent: ${message}`;
  }
};

const enhancedApi = { ...api, sendEmail };
const root = fluent(enhancedApi);
const loginChain = toChain(login, root);

const loginThenEmail =
  loginChain.sendEmail('welcome');

const emailResult = await loginThenEmail.run(ctx);
console.log(emailResult);
