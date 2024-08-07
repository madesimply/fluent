import { fluent } from "../../dist/index.js";

/**
 * Fluent can be useful for building and 
 * validating complex configuration objects.
 * 
 * As a function developer you get to abstract 
 * parsing and validation complexity away from
 * your core business logic.
 */

const { config } = fluent({
  config: (opts) => {
    return {};
  },
  throttle: ({ ctx }, limit) => {
    ctx.throttle = limit;
    return ctx;
  },
  retry: ({ ctx }, count) => {
    ctx.retry = count;
    return ctx;
  },
  timeout: ({ ctx }, ms) => {
    ctx.timeout = ms;
    return ctx;
  },
  headers: ({ ctx }, headers) => {
    ctx.headers = headers;
    return ctx;
  },
  auth: ({ ctx }, token) => {
    ctx.auth = token;
    return ctx;
  },
});

// your complex function runs the config and gets the values
function complicatedFunction(config) {
  const { throttle, retry, timeout, headers, auth } = config.run();
  console.log({ throttle, retry, timeout, headers, auth });

  // no checking needed all of param parsing and validation
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
