## Configs and Paramters

Fluent can be very helpful in defining, validating and parsing complex configuration and parameters.

As a function author, you benefit by being able to abstract parameter parsing, validation out of your business logic. 

Users of your method benefit from autocompletion and types on each property. 

In addition if you have multiple functions that share the same types of inputs, 
you can have confidence they're being handled consistently everywhere.

```typescript
import { fluent } from "../../dist/index.js";

const { config } = fluent({
  // setup the chain ctx
  config: () => {
    return {};
  },
  // bunch of config, add validation / parsing / errors
  throttle: (ctx, limit) => {
    ctx.throttle = limit;
    return ctx;
  },
  retry: (ctx, count) => {
    ctx.retry = count;
    return ctx;
  },
  timeout: (ctx, ms) => {
    ctx.timeout = ms;
    return ctx;
  },
  headers: (ctx, headers) => {
    ctx.headers = headers;
    return ctx;
  },
  auth: (ctx, token) => {
    ctx.auth = token;
    return ctx;
  },
  required: (ctx, required) => {
    required.forEach(prop => {
      if (!ctx[prop]) {
        throw Error(`missing property ${prop}`);
      }
    })
  }
});

// your complex function runs the config and gets the values
function complicatedFunction(config) {
  const { throttle, retry, timeout, headers, auth } = config
    .required(['throttle', 'retry', 'timeout', 'headers', 'auth']).run();

  // no further checking needed all of param parsing and validation
  // is abstracted... only business logic here
}

// while the user gets a nice, typesafe API to build the config
complicatedFunction(
  config
    .throttle(10)
    .retry(3)
    .timeout(5000)
    .headers({ "Content-Type": "application/json" })
    .auth("123456")
);


function someOtherFunction(config) {
  const { headers, auth } = config
    .required(['headers', 'auth']).run();

  // we can be 100% sure that headers and auth 
  // will be the same as in other methods
}

someOtherFunction(
  config
    .headers({ "Content-Type": "text/csv" })
    .auth("123456");
)

```