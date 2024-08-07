import { fluent } from "../../dist/index.js";

const validator = fluent({
  string: {
    min: (ctx, len) => {
      if (ctx.length < len) return undefined;
      return ctx;
    },
    max: (ctx, len) => {
      if (ctx.length > len) return undefined;
      return ctx;
    },
    email: (ctx) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ctx)) return undefined;
      return ctx;
    },
  },
  number: {
    min: (ctx, value) => {
      if (ctx < value) return undefined;
      return ctx;
    },
    max: (ctx, value) => {
      if (ctx > value) return undefined;
      return ctx;
    },
    positive: (ctx) => {
      if (ctx <= 0) return undefined;
      return ctx;
    },
  },
  array: {
    minLength: (ctx, len) => {
      if (ctx?.length < len) return undefined;
      return ctx;
    },
    maxLength: (ctx, len) => {
      if (ctx?.length > len) return undefined;
      return ctx;
    },
  },
  bool(ctx) {
    return ctx !== undefined;
  }
});

const { string, number, array } = validator;

// Usage example
const emailValidator = string.min(5).max(50).email.bool;
console.log(emailValidator.run("test@example.com")); // "test@example.com"
console.log(emailValidator.run("invalid-email")); // throws Error: Invalid email format

const numberValidator = number.min(0).max(100).positive.bool;
console.log(numberValidator.run(50)); // 50
console.log(numberValidator.run(-1)); // throws Error: Number must be positive

const arrayValidator = array.minLength(2).maxLength(5).bool;
console.log(arrayValidator.run([1, 2, 3])); // [1, 2, 3]
console.log(arrayValidator.run([1])); // throws Error: Array must have at least 2 elements