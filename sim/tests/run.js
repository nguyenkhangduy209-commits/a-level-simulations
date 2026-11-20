/* Headless physics tests: `node sim/tests/run.js` (optionally a filter substring). */
'use strict';
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0; const filter = process.argv[2] || '';
global.approx = function (got, exp, rel, label) {
  rel = rel === undefined ? 1e-4 : rel;
  const ok = Math.abs(got - exp) <= Math.max(1e-9, rel * Math.max(Math.abs(exp), 1e-9));
  if (!ok) throw new Error((label ? label + ': ' : '') + 'expected ' + exp + ', got ' + got);
};
global.check = function (cond, msg) { if (!cond) throw new Error(msg || 'check failed'); };
const files = fs.readdirSync(__dirname).filter(f => /^cases-.*\.js$/.test(f)).sort();
for (const f of files) {
  const cases = require(path.join(__dirname, f));
  for (const [name, fn] of Object.entries(cases)) {
    if (filter && !(f + ' ' + name).includes(filter)) continue;
    try { fn(); pass++; } catch (e) { fail++; console.log('FAIL  ' + f + ' › ' + name + '\n      ' + e.message); }
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
