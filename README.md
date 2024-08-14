# Fluent

Fluent helps you build complex [fluent interfaces](https://en.wikipedia.org/wiki/Fluent_interface) (chainable methods). Fluent chains are typesafe, serializable, non-blocking and when setup thoughfully - can lead to extremely legible, testable and portable code. 

## Motivation

[Fluent Interface](https://en.wikipedia.org/wiki/Fluent_interface) patterns are great to use but can but hard to setup, harder to maintain. ([error capture](https://en.wikipedia.org/wiki/Fluent_interface#Errors_cannot_be_captured_at_compile_time), [debugging](https://en.wikipedia.org/wiki/Fluent_interface#Debugging_and_error_reporting), [logging](https://en.wikipedia.org/wiki/Fluent_interface#Logging), [subclassing](https://en.wikipedia.org/wiki/Fluent_interface#Subclasses), [maintenance](https://www.yegor256.com/2018/03/13/fluent-interfaces.html#:~:text=Fluent%20interfaces%20are%20good%20for%20users%2C%20but%20bad%20for%20library,an%20advantage%2C%20not%20a%20drawback.)). This aims to remove the shortcomings.

## Installation

To install Fluent, use npm to install from github (npm register coming later):

```bash
npm install https://github.com/paulpomerleau/fluent
```

## Quickstart

```typescript
// import
import { fluent } from "../dist/index.js";

// build your fluent methods

// methods get the data parameter from the run
// and is returned to pass along the chain
const withTimeOfDay = (data) => {
  const time = new Date().getHours();
  if (time < 12) {
    data.time = "morning";
  } else if (time < 18) {
    data.time = "afternoon";
  } else {
    data.time = "evening";
  }

  return data;
};

// methods can accept aruments from the chain
const sayHello = (data, name) => {
  const { time, weather } = data;
  const message = `
    Hello${time ? ` good ${time}` : ''}${name ? ` ${name}` : ''}!
    ${weather ? `Looks like a ${weather} day today` : ""}
  `;

  console.log(message);
  return data;
};

// methods have context to access global config
const withWeather = (data) => {
  const weather = ["cold", "mild", "hot"];
  const apiKey = this.apiKey;

  // mock call for the weather
  const index = Math.floor(Math.random() * weather.length);
  data.weather = weather[index];

  return data;
};

const greetingApi = { withTimeOfDay, withWeather, sayHello };

// let's build our fluent instance
const api = fluent({ api: greetingApi, ctx: { apiKey: 'mykey' }});

// now we can build up our chain
const chain = api.withTimeOfDay.sayHello("Bob");

// output: Hello good morning Bob!
chain.run({});

// implement as many as you want ...
const withNews = context => context;
const withStockPrices = context => context;
const enhancedApi = { ...greetingApi, withNews, withStockPrices };

// you can add more functionality later
const api2 = fluent({ api: enhancedApi });

const chain2 = api2.withWeather.withNews.sayHello("Alice");

// output: Hello Alice! Looks like a cold day today
chain2.run({});

// you can serialize chains
const json = JSON.parse(JSON.stringify(chain2));

// you can modify and build back up chains
const withoutSayHello = json.slice(0, -1);

// passing a chain inits to the last step
const rehydratedChain = fluent({ api: enhancedApi, chain: withoutSayHello });

// now we can add to it and run it
// outputs: Hello good morning Tim! Looks like a cold day today
rehydratedChain
    .withTimeOfDay
    .sayHello("Tim")
    .run({});
```

## Fluent Argument

### api
a object containing your api methods

```typescript
const api = {
    hello() { console.log('hello' )},
    world() { console.log('world') }
};

const root = fluent({ api });

const chain = root.hello;
```

### chain
optional chain to re-hydrate against the api. can be parsed object `[{ method: "test" }, { method: "chain", args: [ "hello" ] }]` or a string representation `test.chain("hello")`
```typescript

const hello = fluent({ api, chain });
```

### contex
you can pass context in that methods will be bound to for global api settings.


## Chain Methods
Fluent chains have two methods availble

### run
runs the chain with a given context and returns the result
```typescript
const result = root
    .add(3)
    .run(0) // 3
```

### toJSON
returns an object representation of the chain. usually used for serialization via `JSON.stringify(chain)` but handy if you need to make chain transformations.
```typescript
const json = root.add(3).toJSON();

// transform the chain if you want

console.log(json); // [ { method: "add", args: [3] }]
```

### toString
returns a string representation of the chain. useful for storage or communication. 
```typescript
root.add(3).add(5).toString(); // add(3).add(5)
```

### goto
goes to the next equivalent operation in the chain, if not found looks from the beginning. exact match with methods and args.

```typescript
const { 
    stepOne, 
    stepTwo,
    stepThree,
    stepFour, 
    stepFive, 
    goto 
} = fluent({ api: { shouldSkip, ...steps }});

stepOne
 .shouldSkip('skip', goto(stepFive))
 .stepTwo
 .shouldSkip('skip', goto(stepFour('with args')))
 .stepThree
 .stepFour('with args')
 .stepFive.run()
```
it's also non blocking making it great for tasks that are recursive in nature. 
```typescript
// this won't block the main thread or eat up your stack
const { hello } = fluent({ api: { hello: () => console.log('hello forever') }});

// this is fine, maybe not a good idea but it's fine
hello
    .goto(hello)
    .run();
```

## Gotchas

### Async operations
If you have a promise in your chain you'll need to await for the ctx result. If you don't know what's in the chain, assume there's a promise.

```typescript
const result = await chain.asyncMethod.run({});
```

### Sending chains as args
You can send to and run chains in other chain methods.
```typescript
const each(data, ops) => {
    for(const op of ops) {
        op.run(data);
    }
}
```

### You can't use spread arguments
We had to choose between requiring `()` on no arg chain functions or forcing named arguments and chose the later.
```typescript
// we could have done this but it hurts readability imo
chain.noArgs().withArgs('here'); 

// we went with this
chain.noArgs.withArgs('here');
```
The workaround is to use an array.
```typescript
chain.withNplusArgs([...data]);
```

### Args must be serializable
Because the chains can be serialized, ensure your args are too. If you need to send non-serializable objects / functions, do it by reference and context. 

```typescript
const saySomething = (data, pointer) => {
    const message = data[pointer];
    console.log(message);
    return data;
}

// later
chain
  .saySomething('hello')
  .saySomething('world')
  .run({
    hello => 'hello',
    world => 'world',
  })

```

### Method namespacing
You can have methods at any level... it's completely up to you.
```typescript
const api = {
    // let's create a logic or operator at root,
    or: data => data,
    // a namespace for string methods
    string: { 
        min: data => data,
         // a nested namespace for certain types of strings
        email: {
            corporate: data => data,
            gmail: data => data,
        }
    },
    auth: {
        registerLead: data => data,
    }
}

// ... later
const op = root.or([
    root.string.email.corporate,
    root.string.email.gmail
]).auth.registerLead;
```

### Typescript Support
Chain methods are fully type safe.

```typescript
const api: {
    method: (data: any) => data,
    withArgs: (data: any, test: string) => data,
} = {
    method: data => data,
    withArgs: (data, test) => data,
}

// later
root.method //fine
root.method.withArgs() // typerror
```

### Namespace traversal
You can switch to another namespace anywhere in your chain by calling a root. 
```typescript
const api = fluent({ api: {
    base: data => data,
    namespace: {
        first: data => data,
        second: data => data,
    },
    different: {
        third: data =>data,
    }
}});

root = 
    base
        // we're in namespace and can chain namespace methods
        .namespace.first.second 
        // switch to different and use those methods
        .different.third
        // use a root method
        .base
```

## Use Cases

In general any problem space that has complex and often varying business requirements is a good candidate. Some challenges that that seem particularly suited to fluent apis:

- Data validation and sanitization
- Chaining API calls (parallel or sequenced w/promises)
- Implementing complex business logic
- Orchestrating multi-step workflows
- Dynamic query, config, parameter builders
- Data processing with complex requirements
- Middleware flows for auth/auth or data transforms
- Aggregating and processing data from multiple sources
- Coordinating event-driven actions

Be creative about it... context can be anything, args can be anything serializable. 
- function: suppose to log ops to datadog / sentry.  
- obsverable / signal proxy: re-renders your UI when changes are made in chain.  
- other chains: have one chain to calculate, pass another to format.
 
You can also create logical operands. This can lead to extremely complex chains that retain their semantic legibility (great for cross functional teams).

```typescript
const op = whileNotFinished([
    if(string.email.corporate, email.monthlyReport).
    if(string.email.gmail, email.monthlyUpdates).
]).everyStaff(email.chainResults);

const result = await run({ op, api, ctx });
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.


