// const { format } = require("date-fns");

function tokenizeDates(eat, value, silent) {
  const matchDue = /^@due\((.*)\)/.exec(value);
  const matchToday = /^@today/.exec(value);

  const match = matchDue || matchToday;

  if (match) {
    if (silent) {
      return true;
    }

    return eat(match[0])({
      type: "due",
      value,
      date: match[1],
      children: [{ type: "text", value: match[0] }]
    });
  }
}

function locateDue(value, fromIndex) {
  return value.indexOf("@", fromIndex);
}

tokenizeDates.notInLink = true;
tokenizeDates.locator = locateDue;

function remarkDates() {
  if (this.Compiler) {
    const Compiler = this.Compiler;
    const visitors = Compiler.prototype.visitors;

    // // process today
    // visitors.due = node => {
    //   const today = format(Date.now(), "YYYY-MM-DD");
    //   return node.date === today ? "@today" : node.value;
    // };

    visitors.due = node => node.value;
  }

  if (this.Parser) {
    const Parser = this.Parser;
    const tokenizers = Parser.prototype.inlineTokenizers;
    const methods = Parser.prototype.inlineMethods;

    tokenizers["due"] = tokenizeDates;

    methods.splice(methods.indexOf("text"), 0, "due");
  }
}

module.exports = remarkDates;
