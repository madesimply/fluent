## Logic Traversal

Here's some example of logical traveral of data structure without losing chain reference. Useful for things like data processing. 

```typescript
import { fluent } from "../../dist/index.js";

const logic = fluent({
  // iterate through an array
  _each: (ctx, chains) => {
    for (const record of ctx) {
      for (const chain of chains) {
        chain.run({ ...ctx, current: record });
      }
    }
    return ctx;
  },
  // return true if one or more suboperations are truthy
  _or: (ctx, chains) => {
    const results = [];
    for (const chain of chains) {
      results.push(chain.run(ctx));
    }
    return results.some((result) => result);
  },
  // if chain run passes then execute the next
  _if: (ctx, logic, then) => {
    if (logic.run(ctx)) {
      then.run(ctx);
    }
  },
  // get a certain property from current item
  _get: (ctx, path) => {
    return ctx.current[path];
  },
  // just for demo purpose
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

// for each record if item has userId or email then dosomething
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


```