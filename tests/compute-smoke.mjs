import { ComputeEngine } from '@cortex-js/compute-engine';
import { unwrapPlaceholders } from '../src/math-utils.js';
import { evaluateCalculus } from '../src/symbolic-calculus.js';
import { evaluateIntervalSet } from '../src/interval-sets.js';

const ce = new ComputeEngine();
const placeholderCases = [
  [String.raw`\frac{\placeholder[numerator]{1}}{\placeholder[denominator]{2}}`, String.raw`\frac{1}{2}`],
  [String.raw`\sqrt{\placeholder[value]{\frac{9}{4}}}`, String.raw`\sqrt{\frac{9}{4}}`],
  [String.raw`\frac{\placeholder[numerator]{}}{\placeholder[denominator]{}}`, String.raw`\frac{}{}`]
];
const cases = [
  [String.raw`\frac{1}{2}`, '0.5'],
  [String.raw`\log_{2}(8)`, '3'],
  [String.raw`\sqrt{81}`, '9'],
  [String.raw`2^{10}`, '1024'],
  [String.raw`\sin(0)`, '0']
];

let failed = false;
for (const [input, expected] of placeholderCases) {
  const actual = unwrapPlaceholders(input);
  const passed = actual === expected;
  console.log(`${passed ? 'PASS' : 'FAIL'} unwrap ${input} => ${actual}`);
  failed ||= !passed;
}

for (const [input, expected] of cases) {
  const expression = ce.parse(input);
  const numeric = expression.N().latex.replace(String.raw`\,`, '');
  const passed = expression.isValid && numeric === expected;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${input} => ${numeric}`);
  failed ||= !passed;
}

const calculusCases = [
  [String.raw`\lim_{x\to\infty}\frac{1}{x}`, '0'],
  [String.raw`\sum_{i=1}^{5}i`, '15'],
  [String.raw`\int_{0}^{1}x\,\mathrm{d}x`, '1/2']
];

for (const [input, expected] of calculusCases) {
  const expression = ce.parse(input);
  const actual = evaluateCalculus(expression).plain;
  const passed = actual === expected;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${input} => ${actual}`);
  failed ||= !passed;
}

const intervalCases = [
  [String.raw`\left[3,6\right]\cup\left[5,7\right]`, String.raw`\left[3,7\right]`],
  [String.raw`\left[3,6\right]∪\left[5,7\right]`, String.raw`\left[3,7\right]`],
  [String.raw`\left(1,3\right)\cup\left[3,5\right]`, String.raw`\left(1,5\right]`],
  [String.raw`\left[1,3\right]\cup\left[5,7\right]`, String.raw`\left[1,3\right]\cup\left[5,7\right]`],
  [String.raw`\left[3,6\right]\cap\left[5,7\right]`, String.raw`\left[5,6\right]`],
  [String.raw`[2,6]\cap[4,8]`, String.raw`\left[4,6\right]`],
  [String.raw`\left[1,3\right)\cap\left[3,5\right]`, String.raw`\emptyset`]
];

for (const [input, expected] of intervalCases) {
  const actual = evaluateIntervalSet(input, ce);
  const passed = actual === expected;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${input} => ${actual}`);
  failed ||= !passed;
}

if (failed) process.exitCode = 1;
