#! /usr/bin/env node

var parser = {};


/**
 * Function to parse out command line arguments and return object with values.
 * Returns object
 *    flags: array which stores the unique flags (single character with one hypen)(e.g., -a -ab -ac)
 *    Other properties are whatever is included in command with two hypen (e.g., --name=myname)
 *    If no equals or value is provided then property will be a boolean with value of true.
 *
 * node ./index.js -ab --name=myname -d --debug
 */
parser.parseArgs = function(args) {

  var final = {
    flags: [],
    attrs: []
  };

  args.forEach((arg) => {
    if (arg.startsWith('--')) {
      var split = arg.split('=');
      if (split.length == 1) {
        split.push(true);
      }
      var prop = split[0].substr(2).trim();
      final[prop] = split[1];
    } else if (arg.startsWith('-')) {
      var items = arg.split('');
      items.shift();
      if (items.length > 0) {
        items.forEach((flag) => {
          if (!final.flags.includes(flag)) {
            final.flags.push(flag);
          }
        });
      }
    } else {
      final.attrs.push(arg);
    }
  });
  return final;
}


module.exports = parser;
