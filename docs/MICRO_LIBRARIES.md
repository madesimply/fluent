## Micro Libraries

Microlibs are tiny libraries that tackle specific tasks, they're easy to test and modity. Fluent microlibs are especially handy because they can be chained or combined with other fluent apis.


```typescript
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
console.log(emailValidator.run("test@example.com")); // true
console.log(emailValidator.run("invalid-email")); // false

const numberValidator = number.min(0).max(100).positive.bool;
console.log(numberValidator.run(50)); // true
console.log(numberValidator.run(-1)); // false

const arrayValidator = array.minLength(2).maxLength(5).bool;
console.log(arrayValidator.run([1, 2, 3])); // true
console.log(arrayValidator.run([1])); // false

```