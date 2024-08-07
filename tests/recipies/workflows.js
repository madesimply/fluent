import { fluent } from "../../dist/index.js";

/**
 * If you're working closely with business units
 * You can use skips and simple language to describe workflows
 * (except they won't just be descriptions, they'll be executable code)
 *
 * A similar approach can be quite useful for data processing / pipelines.
 */

const { workflow } = fluent({
  workflow: ({ ctx = {} }) => {
    // set up the context
    Object.defineProperties(ctx, {
      skip: { value: false, writable: true, enumerable: false },
    });
    ctx.processed = [];
    return ctx;
  },
  everyMonth: ({ ctx }) => {
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
  everyQuarter: ({ ctx }) => {
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
  everyYear: ({ ctx }) => {
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
  processNewsLetter: ({ ctx }) => {
    if (ctx.skip) return ctx;
    // do your work here
    ctx.processed.push(" -News letter");
    return ctx;
  },
  processMonthlyReport: ({ ctx }) => {
    if (ctx.skip) return ctx;
    // do your work here
    ctx.processed.push(" -Monthly report");
    return ctx;
  },
  processQuarterlyReport: ({ ctx }) => {
    if (ctx.skip) return ctx;
    // do your work here
    ctx.processed.push(" -Quarterly report");
    return ctx;
  },
  processAnnualReport: ({ ctx }) => {
    if (ctx.skip) return ctx;
    // do your work here
    ctx.processed.push(" -Annual report");
    return ctx;
  },
  emailShareholders: ({ ctx }) => {
    if (ctx.skip) return ctx;
    // do your work here
    ctx.processed.push(" -Email shareholders");
    return ctx;
  },
  emailBoardMembers: ({ ctx }) => {
    if (ctx.skip) return ctx;
    // do your work here
    ctx.processed.push(" -Email board members");
    return ctx;
  },
  emailCEO: ({ ctx }) => {
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
