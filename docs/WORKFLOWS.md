## Semantic Workflows

This type of problem space is what inspired Fluent. Often there's a lot of mis-communication between developers and business units... because effectively we're speaking two different languages. 

With fluent it's trivial to put logic behind human readable sentences so that you and business teams can speak the same lingo. 

For these types of flows, skips or gotos are particularly useful.

This type of setup is also useful for data processing imo.

```typescript
import { fluent } from "../../dist/index.js";

const { workflow } = fluent({
  workflow: (ctx = {}) => {
    // set up the context
    Object.defineProperties(ctx, {
      skip: { value: false, writable: true, enumerable: false },
    });
    ctx.processed = [];
    return ctx;
  },
  everyMonth: (ctx) => {
    // if not the first business day of the month, skip
    const day = new Date().getDate();
    const weekday = new Date().getDay();
    const skip = day !== 1 || weekday === 0 || weekday === 6;
    ctx.skip = skip;
    if (!skip) {
      ctx.processed.push("Monthly report");
    }
    return ctx;
  },
  everyQuarter: (ctx) => {
    // if not the first business day of the quarter, skip
    const day = new Date().getDate();
    const weekday = new Date().getDay();
    const month = new Date().getMonth();

    const skip =
      day !== 1 || weekday === 0 || weekday === 6 || (month + 1) % 3 !== 1;

    ctx.skip = skip;
    if (!skip) {
      ctx.processed.push("Quarterly report");
    }
    return ctx;
  },
  everyYear: (ctx) => {
    // if not the first business day of the year, skip
    const day = new Date().getDate();
    const weekday = new Date().getDay();
    const month = new Date().getMonth();
    const skip = day !== 1 || weekday === 0 || weekday === 6 || month !== 0;
    ctx.skip = skip;
    if (!skip) {
      ctx.processed.push("Annual report");
    }
    return ctx;
  },
  processNewsLetter: (ctx) => {
    if (ctx.skip) return ctx;
    // do your work here
    ctx.processed.push(" -News letter");
    return ctx;
  },
  processMonthlyReport: (ctx) => {
    if (ctx.skip) return ctx;
    // do your work here
    ctx.processed.push(" -Monthly report");
    return ctx;
  },
  processQuarterlyReport: (ctx) => {
    if (ctx.skip) return ctx;
    // do your work here
    ctx.processed.push(" -Quarterly report");
    return ctx;
  },
  processAnnualReport: (ctx) => {
    if (ctx.skip) return ctx;
    // do your work here
    ctx.processed.push(" -Annual report");
    return ctx;
  },
  emailShareholders: (ctx) => {
    if (ctx.skip) return ctx;
    // do your work here
    ctx.processed.push(" -Email shareholders");
    return ctx;
  },
  emailBoardMembers: (ctx) => {
    if (ctx.skip) return ctx;
    // do your work here
    ctx.processed.push(" -Email board members");
    return ctx;
  },
  emailCEO: (ctx) => {
    if (ctx.skip) return ctx;
    // do your work here
    ctx.processed.push(" -Email CEO");
    return ctx;
  },
});

const reporting =
  workflow
    .everyMonth
      .processNewsLetter
      .emailShareholders
      .emailBoardMembers
    .everyQuarter
      .processQuarterlyReport
      .emailShareholders
      .emailBoardMembers
    .everyYear
      .processAnnualReport
      .emailCEO;

// now you can run this chain daily or whatever.

// imagine a db with stored workflows (because they're just json)
// departments could define their own workflows (easily because of the chainable semantic api)
// while a central api could parse, organise and run them all on a schedule
// if the workflows need to change fine... Dave from accounting can do it himself

const result = reporting.run();
console.log(result);


```