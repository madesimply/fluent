import { fluent } from "../../dist/index.js";

/**
 * You can use loops and operands to build up complex logical chains.
 */
const logic = fluent({
  _each: (ctx, chains) => {
    for (const record of ctx) {
      for (const chain of chains) {
        chain.run({ ...ctx, current: record });
      }
    }
    return ctx;
  },
  _or: (ctx, chains) => {
    const results = [];
    for (const chain of chains) {
      results.push(chain.run(ctx));
    }
    return results.some((result) => result);
  },
  _if: (ctx, logic, then) => {
    if (logic.run(ctx)) {
      then.run(ctx);
    }
  },
  _get: (ctx, path) => {
    return ctx.current[path];
  },
  doSomething: (ctx) => {
    ctx.current.something = "has been done";
    return ctx;
  },
});

const data = [
  { userId: null }, 
  { email: "test@email.com" }
];

const { _each, _if, _or, _get, doSomething } = logic;
 
// you can build up complex logic chains
// and then serialize them for later use by other systems
const logicChain = _each([
  _if(
    _or([
      _get("userId"), 
      _get("email")
    ]),
    doSomething
  ),
]);

const result = logicChain.run(data);
console.log(result);

// and again this can be serialized / saved / reused / enhanced 
// across your systems
console.log(JSON.stringify(logicChain));
