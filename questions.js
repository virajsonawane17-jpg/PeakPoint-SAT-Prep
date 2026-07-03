/* ============================================
   PEAKPOINT SAT PREP — Question Engine
   Generates unlimited SAT-style questions from
   parameterized templates. Math questions use
   randomized numbers (infinite pool); Reading &
   Writing questions combine sentence banks with
   randomized answer sets.
   ============================================ */

window.PP = window.PP || {};

PP.questions = (() => {

  /* ---------- Utilities ---------- */
  const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = (arr) => arr[ri(0, arr.length - 1)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = ri(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const frac = (n, d) => {
    const g = gcd(n, d) || 1;
    n /= g; d /= g;
    return d === 1 ? String(n) : `${n}/${d}`;
  };

  // Builds a shuffled 4-choice set from a correct answer + distractor pool.
  // Pads with numeric jitter if distractors collide with the answer.
  function makeChoices(correct, distractors) {
    const seen = new Set([String(correct)]);
    const uniq = [];
    for (const d of distractors) {
      const s = String(d);
      if (!seen.has(s)) { seen.add(s); uniq.push(s); }
      if (uniq.length === 3) break;
    }
    let pad = 1;
    while (uniq.length < 3) {
      const base = parseFloat(correct);
      const cand = isNaN(base) ? String(correct) + ' ' : String(base + pad * (Math.random() < 0.5 ? -1 : 1));
      if (!seen.has(cand)) { seen.add(cand); uniq.push(cand); }
      pad++;
    }
    const choices = shuffle([String(correct), ...uniq]);
    return { choices, answer: choices.indexOf(String(correct)) };
  }

  function q(skill, section, diff, text, correct, distractors, explanation) {
    const { choices, answer } = makeChoices(correct, distractors);
    return { skill, section, difficulty: diff, text, choices, answer, explanation };
  }

  /* ---------- Skill map ---------- */
  const SKILLS = [
    { id: 'lin-eq',   name: 'Linear Equations',              section: 'math' },
    { id: 'systems',  name: 'Systems of Equations',          section: 'math' },
    { id: 'lin-fn',   name: 'Linear Functions & Graphs',     section: 'math' },
    { id: 'ratios',   name: 'Ratios, Percents & Proportions', section: 'math' },
    { id: 'data',     name: 'Data Analysis & Statistics',    section: 'math' },
    { id: 'prob',     name: 'Probability',                   section: 'math' },
    { id: 'quad',     name: 'Quadratics & Exponents',        section: 'math' },
    { id: 'expo',     name: 'Exponential Growth & Decay',    section: 'math' },
    { id: 'geom',     name: 'Geometry',                      section: 'math' },
    { id: 'trig',     name: 'Trigonometry',                  section: 'math' },
    { id: 'agree',    name: 'Subject-Verb Agreement',        section: 'rw' },
    { id: 'punct',    name: 'Punctuation & Boundaries',      section: 'rw' },
    { id: 'trans',    name: 'Transitions',                   section: 'rw' },
    { id: 'vocab',    name: 'Words in Context',              section: 'rw' },
    { id: 'concise',  name: 'Concision & Style',             section: 'rw' }
  ];

  /* ============================================
     MATH GENERATORS — randomized every call
     ============================================ */

  const gen = {};

  gen['lin-eq'] = (diff) => {
    if (diff === 1) {
      const x = ri(2, 12), a = ri(2, 9), b = ri(1, 20), c = a * x + b;
      return q('lin-eq', 'math', diff,
        `If ${a}x + ${b} = ${c}, what is the value of x?`,
        x, [x + ri(1, 3), Math.max(1, x - ri(1, 3)), Math.round((c + b) / a)],
        `Subtract ${b} from both sides: ${a}x = ${c - b}. Divide by ${a}: x = ${x}.`);
    }
    if (diff === 2) {
      const a = ri(3, 9);
      const c = ri(1, a - 1);
      const x = ri(2, 10), b = ri(-9, 9), d = (a - c) * x + b;
      const bs = b < 0 ? `- ${-b}` : `+ ${b}`;
      const ds = d < 0 ? `- ${-d}` : `+ ${d}`;
      return q('lin-eq', 'math', diff,
        `If ${a}x ${bs} = ${c}x ${ds}, what is the value of x?`,
        x, [-x, x + 2, x - 1],
        `Move the x terms together: ${a - c}x = ${d - b}, so x = ${x}.`);
    }
    const fee = ri(2, 8) * 5, per = ri(2, 9) * 5, months = ri(3, 12);
    const total = fee + per * months;
    return q('lin-eq', 'math', diff,
      `A gym charges a one-time sign-up fee of $${fee} plus $${per} per month. If a member has paid $${total} in total, for how many months has she been a member?`,
      months, [months + 1, months - 1, Math.round(total / per)],
      `Total cost is ${fee} + ${per}m = ${total}. So ${per}m = ${total - fee}, and m = ${months}.`);
  };

  gen['systems'] = (diff) => {
    if (diff === 1) {
      const x = ri(4, 15), y = ri(1, x - 1);
      return q('systems', 'math', diff,
        `If x + y = ${x + y} and x − y = ${x - y}, what is the value of x?`,
        x, [y, x + y, x - y],
        `Add the two equations: 2x = ${2 * x}, so x = ${x}. (Then y = ${y}.)`);
    }
    if (diff === 2) {
      const x = ri(1, 8), y = ri(1, 8);
      let a = ri(1, 5), b = ri(1, 5), c = ri(1, 5), d = ri(1, 5);
      if (a * d === b * c) d += 1;
      const e = a * x + b * y, f = c * x + d * y;
      return q('systems', 'math', diff,
        `The system of equations\n${a}x + ${b}y = ${e}\n${c}x + ${d}y = ${f}\nhas solution (x, y). What is the value of x + y?`,
        x + y, [x, y, x + y + ri(1, 2)],
        `Solving the system gives x = ${x} and y = ${y}, so x + y = ${x + y}.`);
    }
    const ap = ri(8, 15), cp = ri(3, 7);
    const ac = ri(3, 10), cc = ri(3, 10);
    const people = ac + cc, money = ap * ac + cp * cc;
    return q('systems', 'math', diff,
      `Tickets to a play cost $${ap} for adults and $${cp} for children. A group of ${people} people paid $${money} in total. How many adult tickets did the group buy?`,
      ac, [cc, ac + 1, Math.max(1, ac - 1)],
      `With a adults and c children: a + c = ${people} and ${ap}a + ${cp}c = ${money}. Solving gives a = ${ac}.`);
  };

  gen['lin-fn'] = (diff) => {
    if (diff === 1) {
      const x1 = ri(-5, 3), m = ri(-4, 4) || 2, x2 = x1 + ri(1, 5);
      const y1 = ri(-6, 6), y2 = y1 + m * (x2 - x1);
      return q('lin-fn', 'math', diff,
        `What is the slope of the line that passes through the points (${x1}, ${y1}) and (${x2}, ${y2})?`,
        m, [-m, m + 1, m - 1],
        `Slope = (y₂ − y₁)/(x₂ − x₁) = (${y2} − ${y1})/(${x2} − ${x1}) = ${m}.`);
    }
    if (diff === 2) {
      const m = ri(2, 6), b = ri(-8, 8), x = ri(2, 7);
      const y = m * x + b;
      const bs = b < 0 ? `− ${-b}` : `+ ${b}`;
      return q('lin-fn', 'math', diff,
        `The function f is defined by f(x) = ${m}x ${bs}. What is the value of f(${x})?`,
        y, [y - m, y + m, m * x - b],
        `f(${x}) = ${m}(${x}) ${bs} = ${y}.`);
    }
    const start = ri(20, 60), rate = ri(2, 8), t = ri(5, 12);
    const val = start + rate * t;
    return q('lin-fn', 'math', diff,
      `A plant is ${start} cm tall and grows at a constant rate of ${rate} cm per week. Which is the plant's height, in cm, after ${t} weeks?`,
      val, [start + rate * (t - 1), rate * t, val + rate],
      `Height = ${start} + ${rate}·t. After ${t} weeks: ${start} + ${rate * t} = ${val} cm.`);
  };

  gen['ratios'] = (diff) => {
    if (diff === 1) {
      const p = pick([10, 20, 25, 40, 50, 75]);
      const n = ri(2, 12) * 20;
      const ans = n * p / 100;
      return q('ratios', 'math', diff,
        `What is ${p}% of ${n}?`,
        ans, [ans * 2, ans / 2, n - ans],
        `${p}% of ${n} = ${p / 100} × ${n} = ${ans}.`);
    }
    if (diff === 2) {
      const a = ri(3, 8) * 10;
      const p = pick([10, 20, 25, 50]);
      const b = a + a * p / 100;
      return q('ratios', 'math', diff,
        `The price of an item increased from $${a} to $${b}. By what percent did the price increase?`,
        p + '%', [(p / 2) + '%', (p * 2) + '%', (p + 5) + '%'],
        `Increase = ${b - a}. Percent change = ${b - a}/${a} × 100 = ${p}%.`);
    }
    const flour = ri(2, 5), cookies = ri(2, 4) * 12;
    const mult = ri(2, 4);
    return q('ratios', 'math', diff,
      `A recipe uses ${flour} cups of flour to make ${cookies} cookies. How many cups of flour are needed to make ${cookies * mult} cookies?`,
      flour * mult, [flour * (mult + 1), flour * mult + 1, flour + mult],
      `${cookies * mult} is ${mult} times ${cookies}, so multiply the flour by ${mult}: ${flour} × ${mult} = ${flour * mult} cups.`);
  };

  gen['data'] = (diff) => {
    if (diff === 1) {
      const mean = ri(5, 20);
      const a = mean - ri(1, 4), b = mean + ri(1, 4), c = mean - ri(0, 3);
      const d = 4 * mean - a - b - c;
      return q('data', 'math', diff,
        `What is the mean of the numbers ${a}, ${b}, ${c}, and ${d}?`,
        mean, [mean + 1, mean - 1, mean + 2],
        `Sum = ${a + b + c + d}. Mean = ${a + b + c + d} ÷ 4 = ${mean}.`);
    }
    if (diff === 2) {
      const mean = ri(10, 30), n = ri(4, 6);
      const known = [];
      let sum = 0;
      for (let i = 0; i < n - 1; i++) {
        const v = mean + ri(-5, 5);
        known.push(v); sum += v;
      }
      const missing = mean * n - sum;
      return q('data', 'math', diff,
        `The mean of ${n} numbers is ${mean}. If ${n - 1} of the numbers are ${known.join(', ')}, what is the remaining number?`,
        missing, [missing + n, missing - n, mean],
        `The ${n} numbers must sum to ${mean} × ${n} = ${mean * n}. The known numbers sum to ${sum}, so the missing number is ${missing}.`);
    }
    const dist = ri(3, 8) * 30, time = pick([2, 3, 4, 5]);
    const speed = dist / time;
    return q('data', 'math', diff,
      `A cyclist travels ${dist} miles in ${time} hours at a constant speed. What is her speed in miles per hour?`,
      speed, [speed + 5, speed - 5, dist - time],
      `Speed = distance ÷ time = ${dist} ÷ ${time} = ${speed} mph.`);
  };

  gen['prob'] = (diff) => {
    const r = ri(2, 6), b = ri(2, 6), g = ri(2, 6);
    const total = r + b + g;
    if (diff === 1) {
      return q('prob', 'math', diff,
        `A bag contains ${r} red, ${b} blue, and ${g} green marbles. If one marble is drawn at random, what is the probability that it is red?`,
        frac(r, total), [frac(b, total), frac(r, b + g), frac(1, 3)],
        `P(red) = red ÷ total = ${r}/${total}${frac(r, total) !== `${r}/${total}` ? ' = ' + frac(r, total) : ''}.`);
    }
    if (diff === 2) {
      return q('prob', 'math', diff,
        `A bag contains ${r} red, ${b} blue, and ${g} green marbles. If one marble is drawn at random, what is the probability that it is NOT red?`,
        frac(b + g, total), [frac(r, total), frac(b, total), frac(g, total)],
        `P(not red) = 1 − P(red) = ${b + g}/${total}${frac(b + g, total) !== `${b + g}/${total}` ? ' = ' + frac(b + g, total) : ''}.`);
    }
    return q('prob', 'math', diff,
      `A bag contains ${r} red, ${b} blue, and ${g} green marbles. A marble is drawn, replaced, and a second marble is drawn. What is the probability that both marbles are red?`,
      frac(r * r, total * total), [frac(r, total), frac(2 * r, total), frac(r * r, total)],
      `With replacement, P(red then red) = (${r}/${total}) × (${r}/${total}) = ${frac(r * r, total * total)}.`);
  };

  gen['quad'] = (diff) => {
    if (diff === 1) {
      const a = ri(2, 6), b = ri(2, 6);
      return q('quad', 'math', diff,
        `Which expression is equivalent to x${sup(a)} · x${sup(b)}?`,
        `x${sup(a + b)}`, [`x${sup(a * b)}`, `x${sup(Math.abs(a - b))}`, `${a + b}x`],
        `When multiplying powers with the same base, add the exponents: x${sup(a)} · x${sup(b)} = x${sup(a + b)}.`);
    }
    if (diff === 2) {
      const p = ri(1, 6), qq = ri(1, 6);
      const bcoef = p + qq, ccoef = p * qq;
      return q('quad', 'math', diff,
        `What are the solutions of x² − ${bcoef}x + ${ccoef} = 0?`,
        `x = ${p} and x = ${qq}`,
        [`x = ${-p} and x = ${-qq}`, `x = ${p} and x = ${-qq}`, `x = ${bcoef} and x = ${ccoef}`],
        `Factor: (x − ${p})(x − ${qq}) = 0, so x = ${p} or x = ${qq}.`);
    }
    const h = ri(-5, 5), k = ri(-8, 8);
    const hs = h < 0 ? `+ ${-h}` : `− ${h}`;
    const ks = k < 0 ? `− ${-k}` : `+ ${k}`;
    return q('quad', 'math', diff,
      `The graph of y = (x ${hs})² ${ks} is a parabola. What are the coordinates of its vertex?`,
      `(${h}, ${k})`, [`(${-h}, ${k})`, `(${h}, ${-k})`, `(${k}, ${h})`],
      `Vertex form y = (x − h)² + k has vertex (h, k). Here h = ${h} and k = ${k}.`);
  };

  gen['expo'] = (diff) => {
    if (diff === 1) {
      const p = ri(2, 9) * 100, d = pick([3, 4, 5, 10]);
      return q('expo', 'math', diff,
        `A bacteria population of ${p} doubles every ${d} hours. What is the population after ${2 * d} hours?`,
        p * 4, [p * 2, p * 3, p * 8],
        `${2 * d} hours is 2 doubling periods: ${p} → ${p * 2} → ${p * 4}.`);
    }
    if (diff === 2) {
      const a = ri(1, 5) * 100, r = pick([10, 20, 50]);
      const val = Math.round(a * Math.pow(1 + r / 100, 2));
      return q('expo', 'math', diff,
        `An investment of $${a} grows by ${r}% each year. What is its value, in dollars, after 2 years?`,
        val, [Math.round(a * (1 + 2 * r / 100)), Math.round(a * (1 + r / 100)), val + a],
        `Multiply by ${1 + r / 100} each year: ${a} × ${1 + r / 100}² = ${val}. (Note: growth compounds — it is not simply ${r}% + ${r}%.)`);
    }
    const start = ri(2, 8) * 100, hl = pick([2, 3, 5, 6]);
    return q('expo', 'math', diff,
      `A ${start} mg sample of a substance has a half-life of ${hl} days. How many mg remain after ${3 * hl} days?`,
      start / 8, [start / 2, start / 4, start / 3],
      `${3 * hl} days is 3 half-lives: ${start} → ${start / 2} → ${start / 4} → ${start / 8} mg.`);
  };

  gen['geom'] = (diff) => {
    if (diff === 1) {
      const w = ri(3, 12), l = w + ri(1, 8);
      if (Math.random() < 0.5) {
        return q('geom', 'math', diff,
          `A rectangle has length ${l} and width ${w}. What is its area?`,
          l * w, [2 * (l + w), l * w / 2, l * w + l],
          `Area = length × width = ${l} × ${w} = ${l * w}.`);
      }
      return q('geom', 'math', diff,
        `A rectangle has length ${l} and width ${w}. What is its perimeter?`,
        2 * (l + w), [l * w, l + w, 2 * l + w],
        `Perimeter = 2(length + width) = 2(${l} + ${w}) = ${2 * (l + w)}.`);
    }
    if (diff === 2) {
      const r = ri(2, 9);
      if (Math.random() < 0.5) {
        return q('geom', 'math', diff,
          `What is the area of a circle with radius ${r}?`,
          `${r * r}π`, [`${2 * r}π`, `${r}π`, `${4 * r}π`],
          `Area = πr² = π × ${r}² = ${r * r}π.`);
      }
      const bse = ri(4, 14), ht = ri(3, 10);
      return q('geom', 'math', diff,
        `A triangle has a base of ${bse} and a height of ${ht}. What is its area?`,
        bse * ht / 2, [bse * ht, bse + ht, bse * ht / 2 + bse],
        `Area = ½ × base × height = ½ × ${bse} × ${ht} = ${bse * ht / 2}.`);
    }
    const [a3, b3, c3] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]]);
    return q('geom', 'math', diff,
      `A right triangle has legs of length ${a3} and ${b3}. What is the length of its hypotenuse?`,
      c3, [a3 + b3, c3 + 1, c3 - 1],
      `By the Pythagorean theorem: √(${a3}² + ${b3}²) = √${a3 * a3 + b3 * b3} = ${c3}.`);
  };

  gen['trig'] = (diff) => {
    const [o, a, h] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [7, 24, 25]]);
    if (diff === 1) {
      return q('trig', 'math', diff,
        `In a right triangle, the side opposite angle A has length ${o} and the hypotenuse has length ${h}. What is sin A?`,
        frac(o, h), [frac(a, h), frac(o, a), frac(h, o)],
        `sin A = opposite ÷ hypotenuse = ${frac(o, h)}.`);
    }
    if (diff === 2) {
      return q('trig', 'math', diff,
        `In a right triangle, the side opposite angle A has length ${o} and the side adjacent to angle A has length ${a}. What is tan A?`,
        frac(o, a), [frac(a, o), frac(o, h), frac(a, h)],
        `tan A = opposite ÷ adjacent = ${frac(o, a)}.`);
    }
    const ang = ri(10, 80);
    return q('trig', 'math', diff,
      `If sin(${ang}°) = cos(x°) and 0 < x < 90, what is the value of x?`,
      90 - ang, [ang, 180 - ang, 90 + ang],
      `Sine and cosine of complementary angles are equal: sin(θ) = cos(90° − θ), so x = 90 − ${ang} = ${90 - ang}.`);
  };

  function sup(n) {
    const map = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    return String(n).split('').map(c => map[c] || c).join('');
  }

  /* ============================================
     READING & WRITING GENERATORS — sentence banks
     combined with randomized answer sets
     ============================================ */

  const AGREE_FRAMES = [
    { t: 'The bouquet of roses on the windowsill ___ a splash of color to the kitchen.', c: 'adds', d: ['add', 'have added', 'are adding'], why: 'The subject is "bouquet" (singular) — "of roses" is a prepositional phrase, not the subject.' },
    { t: 'The list of eligible candidates ___ posted outside the main office every Monday.', c: 'is', d: ['are', 'were', 'have been'], why: 'The subject is "list" (singular), so the verb must be singular: "is."' },
    { t: 'Each of the experiments ___ a different hypothesis about plant growth.', c: 'tests', d: ['test', 'are testing', 'have tested'], why: '"Each" is always singular, even when followed by "of the experiments."' },
    { t: 'The results of the latest survey ___ that most students prefer studying in the morning.', c: 'suggest', d: ['suggests', 'is suggesting', 'has suggested'], why: 'The subject is "results" (plural), so the verb must be plural: "suggest."' },
    { t: 'Neither of the two proposals ___ enough support to pass the committee vote.', c: 'has', d: ['have', 'are having', 'were having'], why: '"Neither" is singular, so it takes the singular verb "has."' },
    { t: 'The team of engineers ___ responsible for inspecting the bridge each spring.', c: 'is', d: ['are', 'were', 'have been'], why: '"Team" is a singular collective noun; "of engineers" does not change that.' },
    { t: 'The paintings in the museum\'s east wing ___ restored by a specialist last year.', c: 'were', d: ['was', 'is', 'has been'], why: 'The subject is "paintings" (plural), so the past-tense verb must be "were."' },
    { t: 'A number of volunteers ___ signed up to help with the beach cleanup.', c: 'have', d: ['has', 'is', 'was'], why: '"A number of" takes a plural verb: many volunteers have signed up.' },
    { t: 'The quality of the recordings ___ noticeably from one session to the next.', c: 'varies', d: ['vary', 'are varying', 'have varied'], why: 'The subject is "quality" (singular), so the verb must be "varies."' },
    { t: 'There ___ several reasons why the launch was postponed.', c: 'are', d: ['is', 'was', 'has been'], why: 'The true subject is "reasons" (plural), so the verb must be "are."' },
    { t: 'The professor, along with her graduate students, ___ attending the conference in June.', c: 'is', d: ['are', 'were', 'have been'], why: 'Phrases like "along with" do not make the subject plural; "professor" is the subject.' },
    { t: 'Everyone in the robotics club ___ expected to contribute to the final design.', c: 'is', d: ['are', 'were', 'have been'], why: '"Everyone" is singular and takes a singular verb.' }
  ];

  const PUNCT_PAIRS = [
    { a: 'The experiment failed twice', b: 'the researchers refused to give up' },
    { a: 'The storm knocked out power across the city', b: 'thousands of homes were dark by midnight' },
    { a: 'Maya practiced the violin every morning', b: 'her dedication eventually earned her a seat in the orchestra' },
    { a: 'The museum\'s new exhibit drew record crowds', b: 'tickets sold out within hours' },
    { a: 'The recipe called for fresh basil', b: 'the store had only dried herbs in stock' },
    { a: 'The satellite drifted off course', b: 'engineers scrambled to correct its trajectory' },
    { a: 'The novel opens in a quiet coastal town', b: 'its calm is shattered by the third chapter' },
    { a: 'The volunteers planted trees along the riverbank', b: 'erosion had stripped the soil bare' },
    { a: 'The debate lasted well past midnight', b: 'neither side was willing to compromise' },
    { a: 'The glacier has retreated two miles since 1950', b: 'scientists monitor its edge every summer' }
  ];

  const TRANSITIONS = {
    contrast: ['However,', 'Nevertheless,', 'On the other hand,', 'In contrast,'],
    cause: ['Therefore,', 'As a result,', 'Consequently,', 'Thus,'],
    addition: ['Moreover,', 'Furthermore,', 'In addition,', 'Likewise,'],
    example: ['For example,', 'For instance,', 'In particular,', 'Specifically,']
  };

  const TRANS_PAIRS = [
    { a: 'The novel received glowing reviews from nearly every major critic.', b: 'it sold surprisingly few copies in its first year.', rel: 'contrast' },
    { a: 'The city added protected bike lanes to its busiest streets.', b: 'ridership doubled within eighteen months.', rel: 'cause' },
    { a: 'Solar panels have become far cheaper over the past decade.', b: 'battery storage costs have fallen just as quickly.', rel: 'addition' },
    { a: 'Many desert plants have adapted remarkable ways to conserve water.', b: 'the saguaro cactus stores hundreds of gallons in its expandable trunk.', rel: 'example' },
    { a: 'The committee spent months drafting the new policy.', b: 'it was rejected after a single afternoon of debate.', rel: 'contrast' },
    { a: 'The bridge\'s support cables showed significant corrosion.', b: 'inspectors ordered it closed to heavy trucks.', rel: 'cause' },
    { a: 'Octopuses can change color to match their surroundings.', b: 'they can alter the texture of their skin to mimic coral or rock.', rel: 'addition' },
    { a: 'Several ancient cultures tracked the movement of the planets with surprising precision.', b: 'Babylonian astronomers recorded Venus\'s cycles on clay tablets.', rel: 'example' },
    { a: 'The orchard lost half its trees to the late frost.', b: 'this year\'s harvest was the smallest in a decade.', rel: 'cause' },
    { a: 'The lab\'s early prototypes were bulky and unreliable.', b: 'the final device fit in the palm of a hand and ran for weeks.', rel: 'contrast' }
  ];

  const VOCAB_BANK = [
    { w: 'ambivalent', s: 'Torn between excitement and dread, Lena felt ambivalent about leaving her hometown for college.', c: 'having mixed feelings', d: ['completely indifferent', 'openly hostile', 'fully confident'] },
    { w: 'candid', s: 'The director gave a candid interview, admitting the film\'s budget problems openly.', c: 'honest and direct', d: ['carefully rehearsed', 'harshly critical', 'briefly summarized'] },
    { w: 'diligent', s: 'A diligent researcher, Park checked every source twice before publishing.', c: 'careful and hardworking', d: ['naturally talented', 'extremely cautious of danger', 'quick and careless'] },
    { w: 'ephemeral', s: 'The beauty of the cherry blossoms is ephemeral, lasting barely two weeks each spring.', c: 'short-lived', d: ['delicate', 'legendary', 'seasonal but recurring'] },
    { w: 'lucid', s: 'Her lucid explanation made the complex theorem accessible even to first-year students.', c: 'clear and easy to understand', d: ['long and detailed', 'highly technical', 'enthusiastic'] },
    { w: 'mitigate', s: 'Planting mangroves can mitigate the damage that storms inflict on coastal villages.', c: 'lessen', d: ['prevent entirely', 'measure', 'reverse'] },
    { w: 'novel', s: 'The engineers proposed a novel approach to cooling the reactor, one never attempted before.', c: 'new and original', d: ['fictional', 'risky', 'complicated'] },
    { w: 'pragmatic', s: 'Rather than debating ideals, the mayor took a pragmatic approach focused on what could actually be built that year.', c: 'practical', d: ['pessimistic', 'political', 'ambitious'] },
    { w: 'reluctant', s: 'Though reluctant to speak in public, Amir agreed to present the team\'s findings.', c: 'unwilling or hesitant', d: ['unable', 'unqualified', 'eager but nervous'] },
    { w: 'scrutinize', s: 'Auditors scrutinize every transaction, however small, before approving the annual report.', c: 'examine closely', d: ['record quickly', 'criticize publicly', 'summarize'] },
    { w: 'tenacious', s: 'Tenacious even after three failed attempts, the climbers returned to the peak a fourth time.', c: 'persistent', d: ['cautious', 'aggressive', 'well-prepared'] },
    { w: 'undermine', s: 'Repeated leaks to the press began to undermine the negotiators\' trust in one another.', c: 'weaken', d: ['expose', 'complicate', 'delay'] },
    { w: 'venerate', s: 'The villagers venerate the ancient oak, holding festivals beneath its branches each harvest.', c: 'deeply respect', d: ['fear', 'decorate', 'preserve'] },
    { w: 'prudent', s: 'Saving part of every paycheck is a prudent habit, even when money is tight.', c: 'wise and careful', d: ['profitable', 'difficult', 'generous'] },
    { w: 'corroborate', s: 'Two independent witnesses corroborated the pilot\'s account of the near miss.', c: 'confirmed', d: ['contradicted', 'recorded', 'questioned'] },
    { w: 'obsolete', s: 'The rise of digital cameras rendered film-developing shops nearly obsolete within a decade.', c: 'no longer in use', d: ['unprofitable', 'old but valuable', 'highly specialized'] },
    { w: 'meticulous', s: 'A meticulous restorer, Chen spent months matching the mural\'s original pigments.', c: 'extremely careful about details', d: ['artistically gifted', 'slow and inefficient', 'formally trained'] },
    { w: 'advocate', s: 'For decades, Dr. Reyes has advocated expanding access to school lunches.', c: 'publicly supported', d: ['studied', 'funded', 'questioned'] },
    { w: 'skeptical', s: 'Reviewers were skeptical of the study\'s claims until the data were independently verified.', c: 'doubtful', d: ['dismissive', 'unaware', 'critical of the methods only'] },
    { w: 'abundant', s: 'Fossils are abundant in the exposed shale, so students rarely leave the site empty-handed.', c: 'plentiful', d: ['visible', 'well-preserved', 'valuable'] }
  ];

  const CONCISE_BANK = [
    { pre: 'The committee will meet', post: 'to discuss the budget.', c: 'annually', d: ['on an annual basis each year', 'once a year annually', 'at yearly intervals of a year'], why: 'The other options repeat the same idea twice ("annual" + "each year").' },
    { pre: 'The two studies reached', post: 'conclusions about caffeine\'s effects.', c: 'similar', d: ['similar and alike', 'basically similar in most ways', 'similar, resembling each other,'], why: '"Similar" alone expresses the idea; the other options are redundant.' },
    { pre: 'Scientists', post: 'the samples to a second laboratory.', c: 'sent', d: ['sent and delivered', 'made a delivery of', 'proceeded to send off'], why: 'A single precise verb is more concise than a padded verb phrase.' },
    { pre: 'The mayor\'s plan is', post: 'to reduce traffic downtown.', c: 'intended', d: ['intended and designed', 'meant with the intention', 'designed with the purpose and intent'], why: '"Intended" says it once; the other options say it twice.' },
    { pre: 'The results were', post: ', so the team ran the experiment again.', c: 'unexpected', d: ['unexpected and surprising', 'not what anyone expected or predicted at all', 'unexpected in a surprising way'], why: '"Unexpected" and "surprising" mean the same thing — use one.' },
    { pre: 'Volunteers must arrive', post: 'for the morning shift.', c: 'early', d: ['early and ahead of time', 'at an early point in time', 'early, in advance,'], why: '"Early" alone is sufficient; the alternatives are wordy.' },
    { pre: 'The final chapter', post: 'the novel\'s central mystery.', c: 'resolves', d: ['resolves and settles', 'brings to a resolution', 'comes to resolve and conclude'], why: 'One exact verb beats a wordy phrase built around a noun.' },
    { pre: 'The museum is', post: 'closed for renovations.', c: 'temporarily', d: ['temporarily for the time being', 'for a temporary period of time', 'temporarily, not permanently,'], why: '"Temporarily" already means "for a limited time."' },
    { pre: 'The board members reached a', post: 'after six hours of debate.', c: 'consensus', d: ['consensus of opinion', 'unanimous consensus that they all shared', 'consensus agreed on by everyone'], why: 'A consensus is by definition a shared opinion — the additions are redundant.' },
    { pre: 'The software update', post: 'the app\'s loading time.', c: 'reduced', d: ['reduced and decreased', 'made a reduction in', 'served to bring about a reduction of'], why: 'Use the single strong verb "reduced."' }
  ];

  gen['agree'] = (diff) => {
    const f = pick(AGREE_FRAMES);
    return q('agree', 'rw', diff,
      `Which choice completes the text so that it conforms to the conventions of Standard English?\n\n${f.t.replace('___', '______')}`,
      f.c, f.d, f.why);
  };

  gen['punct'] = (diff) => {
    const p = pick(PUNCT_PAIRS);
    const style = pick(['semi', 'conj', 'period']);
    const bLower = p.b.charAt(0).toLowerCase() + p.b.slice(1);
    const bCap = p.b.charAt(0).toUpperCase() + p.b.slice(1);
    let correct, distractors, why;
    if (style === 'semi') {
      correct = `${p.a}; ${bLower}.`;
      why = 'Two independent clauses can be joined with a semicolon. A comma alone creates a comma splice, and no punctuation creates a run-on.';
    } else if (style === 'conj') {
      correct = `${p.a}, and ${bLower}.`;
      why = 'Two independent clauses can be joined with a comma plus a coordinating conjunction (like "and"). A comma alone creates a comma splice.';
    } else {
      correct = `${p.a}. ${bCap}.`;
      why = 'Two independent clauses can stand as separate sentences. A comma alone creates a comma splice, and no punctuation creates a run-on.';
    }
    distractors = [
      `${p.a}, ${bLower}.`,
      `${p.a} ${bLower}.`,
      style === 'semi' ? `${p.a}; and, ${bLower}.` : `${p.a}; ${bCap}.`
    ];
    return q('punct', 'rw', diff,
      'Which choice is punctuated correctly?',
      correct, distractors, why);
  };

  gen['trans'] = (diff) => {
    const p = pick(TRANS_PAIRS);
    const correct = pick(TRANSITIONS[p.rel]);
    const others = Object.keys(TRANSITIONS).filter(r => r !== p.rel);
    const distractors = others.map(r => pick(TRANSITIONS[r]));
    const relName = { contrast: 'a contrast', cause: 'a cause-and-effect relationship', addition: 'an additional supporting point', example: 'a specific example' }[p.rel];
    return q('trans', 'rw', diff,
      `Which choice completes the text with the most logical transition?\n\n${p.a} ______ ${p.b}`,
      correct, distractors,
      `The second sentence expresses ${relName} relative to the first, so "${correct.replace(',', '')}" is the logical transition.`);
  };

  gen['vocab'] = (diff) => {
    const v = pick(VOCAB_BANK);
    return q('vocab', 'rw', diff,
      `${v.s}\n\nAs used in the text, "${v.w}" most nearly means:`,
      v.c, v.d,
      `"${v.w.charAt(0).toUpperCase() + v.w.slice(1)}" means ${v.c} in this context.`);
  };

  gen['concise'] = (diff) => {
    const c = pick(CONCISE_BANK);
    return q('concise', 'rw', diff,
      `Which choice completes the text so that it is clearest and most concise?\n\n${c.pre} ______ ${c.post}`,
      c.c, c.d, c.why);
  };

  /* ---------- Public API ---------- */

  function generate(skillId, diff) {
    diff = Math.max(1, Math.min(3, diff || 2));
    const g = gen[skillId];
    if (!g) throw new Error('Unknown skill: ' + skillId);
    const question = g(diff);
    question.id = skillId + '-' + Date.now() + '-' + ri(1000, 9999);
    return question;
  }

  // One question per skill at medium difficulty — establishes the baseline.
  function diagnosticSet() {
    return SKILLS.map(s => generate(s.id, 2));
  }

  // Picks the next skill + difficulty for adaptive practice:
  // weaker skills are chosen more often; difficulty tracks mastery.
  function adaptivePick(mastery, sectionFilter) {
    const pool = SKILLS.filter(s => !sectionFilter || s.section === sectionFilter);
    const weights = pool.map(s => 115 - (mastery[s.id] ?? 30));
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    let chosen = pool[0];
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i];
      if (roll <= 0) { chosen = pool[i]; break; }
    }
    const m = mastery[chosen.id] ?? 30;
    let diff;
    if (m < 40) diff = ri(1, 2) === 1 ? 1 : 2;
    else if (m < 70) diff = ri(1, 2) === 1 ? 2 : pick([1, 3]);
    else diff = ri(1, 2) === 1 ? 3 : 2;
    return { skill: chosen.id, diff };
  }

  function skillById(id) {
    return SKILLS.find(s => s.id === id);
  }

  return { SKILLS, generate, diagnosticSet, adaptivePick, skillById };
})();
