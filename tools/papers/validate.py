"""Validation report for the Paper 4 split + tags (stdlib only).

report(papers, ms, gold) -> (markdown, one-line summary)

Checks per paper
  * total marks found vs expected (50 for 9709, 100 for 9702)
  * question numbers consecutive from 1, question count
  * every part has marks; [Total: n] equals the question's part sum (9702)
  * untagged parts
  * mark-scheme cross-check against data/questions/ms_marks.json:
      exact  - same label, same marks (the MS value is the printed part total
               when present, else the sum of B/M/A/C tokens; either may match)
      group  - labels differ only in granularity (e.g. QP has one [2] for
               (i)+(ii), MS splits it 1+1; or 2018 9702 '1.'/'2.' sub-items),
               but the level-1 group (e.g. 6(a)) has the same marks on both sides
      mismatch - anything else; each one is listed with an explanation if it
               has been checked by hand (KNOWN_MS_ISSUES below)
Gold set: per-tag precision/recall over parts and primary-tag accuracy.
"""
import re, random

# Mark-scheme parse problems checked by hand against the PDF. Key: (paper, label).
KNOWN_MS_ISSUES = {
    ('9709_s22_qp_42', '1(b)'):
        'Checked in the PDF: the M1 on the first line is extracted as a separate "M" and "1", so the "1" '
        'was read as the printed total; the scheme prints total 2 at the end of the part (M1 A1), matching the QP.',
    ('9709_s22_qp_42', '4(c)'):
        'Checked in the PDF: three B1 marks; two are printed at a different right edge (x1 477) from the third '
        '(x1 494), and the column edge was estimated from the first two, so the third B1 and the printed total 3 '
        'fell outside the Marks column. Scheme total 3 = QP.',
    ('9709_w21_qp_42', '7(b)'):
        'Checked in the PDF: main method M1 M1 M1 M1 A1 = 5 = QP (no total printed on that page). The parser then '
        'read the printed total 4 of the "Special case" block that follows the alternative method.',
    ('9709_w25_qp_45', '2(b)'):
        'Checked in the PDF: three alternative methods, each *B1 B1 DM1 A1 = 4, printed total 4 = QP. A repeated '
        '"2(b)" label at a page top restarted counting inside the second method and added its A1.',
}


def ms_value(entry):
    return entry['total'] if entry['total'] is not None else entry['sum']


def group_key(label):
    m = re.match(r'^(\d+)(\([a-z]+\))?', label)
    return m.group(1) + (m.group(2) or '')


def ms_check(paper, msp):
    qp = {}
    for q in paper['questions']:
        for p in q['parts']:
            qp[p['ms_label']] = p['marks'] or 0
    res = {'exact': [], 'group': [], 'mismatch': [], 'ms_alt_used': []}
    if not msp:
        res['missing_ms'] = True
        return res
    msv = {k: ms_value(v) for k, v in msp.items()}
    left_qp, left_ms = dict(qp), dict(msv)
    for lab in list(qp):
        if lab in msv:
            if qp[lab] == msv[lab]:
                res['exact'].append(lab)
            elif qp[lab] == msp[lab]['sum']:
                res['exact'].append(lab)
                res['ms_alt_used'].append('%s (MS printed total %s, token sum %s)' %
                                          (lab, msp[lab]['total'], msp[lab]['sum']))
            else:
                continue
            del left_qp[lab]
            del left_ms[lab]
    # granularity differences: compare level-1 groups
    groups = sorted(set(group_key(l) for l in list(left_qp) + list(left_ms)),
                    key=lambda g: (int(re.match(r'\d+', g).group()), g))
    for g in groups:
        a = {l: v for l, v in left_qp.items() if group_key(l) == g}
        b = {l: v for l, v in left_ms.items() if group_key(l) == g}
        # include already-matched labels of the same group on both sides
        if sum(a.values()) == sum(b.values()) and a and b:
            res['group'].append((g, a, b))
        else:
            res['mismatch'].append((g, a, b))
    return res


def fmt_map(d):
    return ', '.join('%s=%s' % (k, v) for k, v in sorted(d.items())) or '-'


def paper_checks(pa, msp):
    exp = pa['total_marks_expected']
    found = pa['total_marks_found']
    nums = [q['q'] for q in pa['questions']]
    consecutive = nums == list(range(1, len(nums) + 1))
    parts = [(q, p) for q in pa['questions'] for p in q['parts']]
    no_marks = ['Q%s' % p['id'] for q, p in parts if not p['marks']]
    untagged = ['Q%s' % p['id'] for q, p in parts if not p['primary_tag']]
    total_bad = ['Q%d (stated %d, parts %d)' % (q['q'], q['total_stated'], q['marks'])
                 for q in pa['questions'] if q['total_stated'] is not None and q['total_stated'] != q['marks']]
    missing_total = []
    if pa['syllabus'] == '9702':
        missing_total = ['Q%d' % q['q'] for q in pa['questions'] if q['total_stated'] is None]
    ms = ms_check(pa, msp)
    unexplained = [m for m in ms['mismatch'] if (pa['paper_id'], m[0]) not in KNOWN_MS_ISSUES]
    ok_split = found == exp and consecutive and not no_marks and not total_bad
    status = 'PASS' if ok_split and not unexplained and not untagged else 'FAIL'
    if status == 'PASS' and ms['mismatch']:
        status = 'PASS*'
    return {
        'paper': pa['paper_id'], 'exp': exp, 'found': found, 'nq': len(nums),
        'consecutive': consecutive, 'nparts': len(parts), 'no_marks': no_marks,
        'untagged': untagged, 'total_bad': total_bad, 'missing_total': missing_total,
        'ms': ms, 'status': status, 'warnings': pa['warnings'],
    }


def gold_eval(papers, gold):
    idx = {}
    for syl in papers:
        for pa in papers[syl]:
            for q in pa['questions']:
                for p in q['parts']:
                    idx[(pa['paper_id'], p['id'])] = p
    tp, fp, fn = {}, {}, {}
    prim_ok, prim_n, sim_ok, sim_n = 0, 0, 0, 0
    misses, sim_misses, missing = [], [], []
    qt = {'n': 0, 'ok': 0, 'tp': {}, 'fp': {}, 'fn': {}, 'misses': []}
    for pid, parts in sorted(gold.items()):
        if pid.startswith('_'):
            continue
        for part_id, g in sorted(parts.items()):
            p = idx.get((pid, part_id))
            if p is None:
                missing.append('%s %s' % (pid, part_id))
                continue
            prim_n += 1
            if p['primary_tag'] == g['primary']:
                prim_ok += 1
            else:
                misses.append((pid, part_id, g['primary'], p['primary_tag'],
                               [(t['tag'], t['score']) for t in p['tags']]))
            gt = set(g['tags'])
            pt = set(t['tag'] for t in p['tags'])
            for t in gt | pt:
                if t in gt and t in pt:
                    tp[t] = tp.get(t, 0) + 1
                elif t in pt:
                    fp[t] = fp.get(t, 0) + 1
                else:
                    fn[t] = fn.get(t, 0) + 1
            if 'qtype' in g:
                qt['n'] += 1
                got = p.get('qtype')
                if got == g['qtype']:
                    qt['ok'] += 1
                    qt['tp'][got] = qt['tp'].get(got, 0) + 1
                else:
                    qt['fp'][got] = qt['fp'].get(got, 0) + 1
                    qt['fn'][g['qtype']] = qt['fn'].get(g['qtype'], 0) + 1
                    qt['misses'].append((pid, part_id, g['qtype'], got))
            if 'sim' in g:
                sim_n += 1
                got = (p.get('sim') or {}).get('id')
                if got == g['sim']:
                    sim_ok += 1
                else:
                    sim_misses.append((pid, part_id, g['sim'], got))
    return {'tp': tp, 'fp': fp, 'fn': fn, 'prim_ok': prim_ok, 'prim_n': prim_n,
            'misses': misses, 'missing': missing, 'sim_ok': sim_ok, 'sim_n': sim_n,
            'sim_misses': sim_misses, 'qt': qt}


def render_gold(ge, title, note):
    L = []
    L += ['## ' + title, '', note, '',
          'Hand tags in tools/papers/gold.json, written from reading the cleaned text of each part '
          '(and the mark scheme where the method was unclear). Part-level, multi-label.', '',
          '| Tag | TP | FP | FN | Precision | Recall |', '|---|---|---|---|---|---|']
    tags = sorted(set(ge['tp']) | set(ge['fp']) | set(ge['fn']))
    for t in tags:
        tp, fp, fn = ge['tp'].get(t, 0), ge['fp'].get(t, 0), ge['fn'].get(t, 0)
        pr = tp / (tp + fp) if tp + fp else float('nan')
        rc = tp / (tp + fn) if tp + fn else float('nan')
        L.append('| %s | %d | %d | %d | %.2f | %.2f |' % (t, tp, fp, fn, pr, rc))
    TP, FP, FN = (sum(ge[k].values()) for k in ('tp', 'fp', 'fn'))
    L.append('| all (micro) | %d | %d | %d | %.2f | %.2f |' % (TP, FP, FN, TP / max(1, TP + FP), TP / max(1, TP + FN)))
    L += ['', 'Primary-tag accuracy: %d / %d = %.1f%%' % (ge['prim_ok'], ge['prim_n'],
                                                          100 * ge['prim_ok'] / max(1, ge['prim_n'])), '']
    if ge['misses']:
        L.append('Primary-tag misses (gold vs tagger, tagger scores):')
        L.append('')
        for m in ge['misses']:
            L.append('- %s %s: gold %s, tagger %s %s' % m)
        L.append('')
    qt = ge['qt']
    if qt['n']:
        L += ['### Question types (' + title + ')', '',
              'Primary question type accuracy: %d / %d = %.1f%%' % (qt['ok'], qt['n'], 100 * qt['ok'] / qt['n']), '',
              '| Question type | gold parts | predicted | correct | precision | recall |', '|---|---|---|---|---|---|']
        types = sorted(set(qt['tp']) | set(qt['fp']) | set(qt['fn']), key=lambda t: str(t))
        for t in types:
            tp, fp, fn = qt['tp'].get(t, 0), qt['fp'].get(t, 0), qt['fn'].get(t, 0)
            L.append('| %s | %d | %d | %d | %s | %s |' % (
                t, tp + fn, tp + fp, tp,
                '%.2f' % (tp / (tp + fp)) if tp + fp else 'n/a',
                '%.2f' % (tp / (tp + fn)) if tp + fn else 'n/a'))
        L.append('')
        for m in qt['misses']:
            L.append('- type miss %s %s: gold %s, got %s' % m)
        L.append('')
    if ge['sim_n']:
        L.append('9709 sim ids: %d / %d agree with gold.' % (ge['sim_ok'], ge['sim_n']))
        for m in ge['sim_misses']:
            L.append('- %s %s: gold %s, tagger %s' % m)
        L.append('')
    if ge['missing']:
        L.append('Gold parts not found in output: ' + ', '.join(ge['missing']))
        L.append('')

    return L


METHOD = """## How the data is produced (rules)

**Cleaning** (`tools/papers/clean.py`). Page 1 (cover) is dropped. Removed: barcode lines, `(cid:n)`
garbage, reversed margin text ("NIGRAM", "DO NOT WRITE IN THIS MARGIN"), UCLES/Cambridge copyright,
"[Turn over", "BLANK PAGE", PapaCambridge watermark lines, the printed page number, and (9702 only) the
data/formulae pages, recognised by two or more sentinel phrases and only before Question 1 is seen.
Answer-dot lines become `<ANS>`; dots inside a line become `____`; superscript-only lines ("-1") are
joined to the previous line. Reading stops at "Additional page" / "Permission to reproduce".
Glyph repair (9709 only, recorded per paper in `glyph_substitutions`; the unrepaired text is kept in
each question's `raw`): 2018-2023 `Å`->°, `1Å`->θ°, `sin1`->sinθ, `!`->α, `"`->β, `-`->μ in
"find -", "value of -", "that - =" contexts; 2024+ ` G `->≤, a one-letter variable followed by
` 1 `/` 2 ` and a number -> < / >, `i`->θ in angle contexts.

**Splitting** (`tools/papers/split.py`). A question starts at the next expected number at the start
of a line, only once the current question has marks; a bare number counts only after a page break or
answer lines, and numbers followed by units are rejected. Part labels follow the sequence (a), (b) ...
and (i), (ii) ... (level 1 is whichever appears first), plus "1." / "2." items in 2018 9702 papers.
Marks are the `[n]` brackets; when one bracket closes several sub-parts they are merged into one part
(`shared_by`). Each part keeps `intro` (text before the first label), `preamble` (text between labels)
and `text`. 9702 `[Total: n]` lines are checked against the part sum.

**Topic tagging** (`tools/papers/tag.py`). Weighted regular expressions per syllabus topic run on
lower-cased text with all whitespace removed (so run-together words do not matter). Part score = own
text + 0.5 x question stem + w x the other parts of the question (w = 0.25 for 9709, 0.5 for 9702).
A tag scoring >= 3 on the part's own text wins over context; a part with no hit takes the question's
top tag. 9709 question-level rules: no force words -> no M4; power with an acceleration at a given
speed -> M5; "find μ" -> M1 if static, M4 if moving. AS topics (9702-1 ... 9702-11) are secondary only.

**Question types** (`tools/papers/qtypes.py`, taxonomy in `data/questions/question_types.json`).
Ordered rules per topic. 9709: specific patterns (pulley geometry, trailer, lift, power, v-t graph,
calculus, ...). Question-level grouping: a bare suvat part inside a dynamics question takes that
question's type, and every part of a vehicle question that involves power is vehicle-power unless the
power is switched off. 9702: definition parts are typed from their own text; otherwise specific type
from the part text, then the previous part of the same topic and level-1 label, then the stem, then a
general type for the topic. The 9709 sim id of a part is the sim of its type.

**Display text** (`tools/papers/respace.py`, `tools/papers/outputs.py`). 42 of the 62 9709 papers
(spacing_ratio < 0.14, all 2018-2023) have many words run together in the pdfplumber text. For the text shown in
`sim/data/p4-questions.js` and the `*_by_*.md` lists only, run-together tokens are split by dynamic
programming over a word table built from the well-spaced papers, the mark-scheme texts and a short list
of extra words; a token is changed only when every letter is explained by known words and usual
one-letter variables, otherwise it is left as extracted. On those papers 1 run-together token of 8+ letters
(out of about 26,000 words) remains unsplit. The JSON keeps the extracted text unchanged.
Diagram labels before the first sentence are dropped from the ~160-character item text.

"""
METHOD = METHOD.split('\n')


def report(papers, ms, gold):
    L = ['# Paper 4 extraction and tagging: validation report', '',
         'Generated by `python3 tools/papers/run_all.py` (deterministic). '
         'Sources: data/papers_text/*.txt (question papers), data/questions/ms_marks.json '
         '(mark schemes, parsed by tools/papers/ms_parse.py), tools/papers/gold.json (hand tags).', '']
    allchecks = []
    for syl in ('9709', '9702'):
        for pa in papers[syl]:
            allchecks.append(paper_checks(pa, ms.get(pa['paper_id'])))
    n = len(allchecks)
    n_marks = sum(1 for c in allchecks if c['found'] == c['exp'])
    n_cons = sum(1 for c in allchecks if c['consecutive'])
    n_pass = sum(1 for c in allchecks if c['status'].startswith('PASS'))
    nparts = sum(c['nparts'] for c in allchecks)
    n_untag = sum(len(c['untagged']) for c in allchecks)
    n_exact = sum(len(c['ms']['exact']) for c in allchecks)
    n_group = sum(len(c['ms']['group']) for c in allchecks)
    n_mis = sum(len(c['ms']['mismatch']) for c in allchecks)
    n_ms_exact_papers = sum(1 for c in allchecks if not c['ms']['group'] and not c['ms']['mismatch'])
    gsets = {k: gold_eval(papers, gold[k]) for k in ('tuning', 'round2', 'heldout') if gold.get(k)}
    ge = gsets.get('tuning')

    L += ['## Summary', '',
          '| Check | Result |', '|---|---|',
          '| Papers | %d (9709: %d, 9702: %d) |' % (n, len(papers['9709']), len(papers['9702'])),
          '| Questions / parts | %d / %d |' % (sum(c['nq'] for c in allchecks), nparts),
          '| Marks found = expected (50 / 100) | %d / %d papers |' % (n_marks, n),
          '| Question numbers consecutive from 1 | %d / %d papers |' % (n_cons, n),
          '| Parts without marks | %d |' % sum(len(c['no_marks']) for c in allchecks),
          '| 9702 [Total: n] disagreeing with part sum | %d |' % sum(len(c['total_bad']) for c in allchecks),
          '| Untagged parts | %d |' % n_untag,
          '| Mark-scheme cross-check: parts matching exactly | %d / %d |' % (n_exact, nparts),
          '| Mark-scheme cross-check: label-granularity groups (same marks) | %d groups |' % n_group,
          '| Mark-scheme cross-check: mismatching groups | %d (all explained below) |' % n_mis
          if all((c['paper'], m[0]) in KNOWN_MS_ISSUES for c in allchecks for m in c['ms']['mismatch'])
          else '| Mark-scheme cross-check: mismatching groups | %d (see below) |' % n_mis,
          '| Papers whose labels and marks agree exactly with the mark scheme | %d / %d |' % (n_ms_exact_papers, n),
          '| Papers PASS (PASS* = only hand-explained MS-parse differences) | %d / %d |' % (n_pass, n)]
    for key, nm in (('tuning', 'tuning gold (8 papers)'), ('round2', 'round-2 gold (4 papers, now tuning)'),
                    ('heldout', 'HELD-OUT blind gold (4 papers)')):
        g = gsets.get(key)
        if not g:
            continue
        L.append('| Primary-tag accuracy, %s | %d / %d = %.1f%% |' % (nm, g['prim_ok'], g['prim_n'], 100 * g['prim_ok'] / max(1, g['prim_n'])))
        L.append('| Primary question-type accuracy, %s | %d / %d = %.1f%% |' % (nm, g['qt']['ok'], g['qt']['n'], 100 * g['qt']['ok'] / max(1, g['qt']['n'])))
        if g['sim_n']:
            L.append('| 9709 sim-id accuracy, %s | %d / %d = %.1f%% |' % (nm, g['sim_ok'], g['sim_n'], 100 * g['sim_ok'] / g['sim_n']))
    L.append('')

    L += METHOD
    L += ['## Per paper', '',
          'Columns: questions, marks found/expected, consecutive numbering, parts, untagged parts, '
          'MS cross-check (exact parts / granularity groups / mismatching groups), status.', '',
          '| Paper | Qs | Marks | Consec. | Parts | Untagged | MS exact | MS groups | MS mismatch | Status |',
          '|---|---|---|---|---|---|---|---|---|---|']
    for c in allchecks:
        L.append('| %s | %d | %d/%d | %s | %d | %d | %d | %d | %d | %s |' % (
            c['paper'], c['nq'], c['found'], c['exp'], 'yes' if c['consecutive'] else 'NO',
            c['nparts'], len(c['untagged']), len(c['ms']['exact']), len(c['ms']['group']),
            len(c['ms']['mismatch']), c['status']))
    L.append('')

    L += ['## Mark-scheme cross-check details', '',
          '### Label-granularity differences (marks agree at the level-1 group)', '',
          'The question paper and the mark scheme sometimes label at different depths: one mark '
          'bracket for several sub-parts, 2018 9702 "1." / "2." sub-items, or an MS that labels '
          'a part without its sub-parts. These are not errors in the split.', '']
    for c in allchecks:
        for g, a, b in c['ms']['group']:
            L.append('- %s %s: QP {%s} vs MS {%s}' % (c['paper'], g, fmt_map(a), fmt_map(b)))
    L += ['', '### Mismatches', '']
    any_mis = False
    for c in allchecks:
        for g, a, b in c['ms']['mismatch']:
            any_mis = True
            why = KNOWN_MS_ISSUES.get((c['paper'], g), 'NOT YET EXPLAINED')
            L.append('- %s %s: QP {%s} vs MS {%s}. %s' % (c['paper'], g, fmt_map(a), fmt_map(b), why))
    if not any_mis:
        L.append('None.')
    L += ['', '### Parts where the MS token sum (not its printed total) was used', '']
    alt = [(c['paper'], x) for c in allchecks for x in c['ms']['ms_alt_used']]
    L += ['- %s %s' % a for a in alt] or ['None.']
    L.append('')

    L += ['## Splitter warnings (informational)', '',
          'Shared mark brackets and labels treated as text. Each was reviewed; none changes the marks.', '']
    for c in allchecks:
        for w in c['warnings']:
            L.append('- %s %s' % (c['paper'], w))
    L.append('')
    if any(c['missing_total'] for c in allchecks):
        L += ['9702 questions without a printed [Total: n]: ' +
              '; '.join('%s %s' % (c['paper'], ','.join(c['missing_total'])) for c in allchecks if c['missing_total']), '']

    L += ['## Untagged parts', '']
    ut = ['- %s %s' % (c['paper'], u) for c in allchecks for u in c['untagged']]
    L += ut or ['None.']
    L.append('')

    # topic spread
    L += ['## 9709 topic spread per paper (primary tags of parts)', '',
          '| Paper | M1 | M2 | M3 | M4 | M5 | topics |', '|---|---|---|---|---|---|---|']
    for pa in papers['9709']:
        cnt = {t: 0 for t in ('9709-M1', '9709-M2', '9709-M3', '9709-M4', '9709-M5')}
        for q in pa['questions']:
            for p in q['parts']:
                if p['primary_tag'] in cnt:
                    cnt[p['primary_tag']] += p['marks'] or 0
        L.append('| %s | %s | %d |' % (pa['paper_id'], ' | '.join(str(cnt[t]) for t in sorted(cnt)),
                                         sum(1 for v in cnt.values() if v)))
    L += ['', '(cells are marks)', '']

    for key, title, note in (('tuning', 'Gold set: tuning papers', 'Rules were adjusted while comparing with these papers, so this measures fit, not generalisation.'),
                             ('round2', 'Gold set: round 2', 'Labelled blind; first scored at primary 111/128 = 86.7%, question type 100/128 = 78.1%, 9709 sim 26/32 = 81.2%. Errors were then analysed and general rules added, so the scores below are tuning scores.'),
                             ('heldout', 'Gold set: HELD-OUT (blind, rules frozen)', 'Labelled from the cleaned text before looking at tagger output, after the rules were frozen; never used for tuning. This is the honest generalisation estimate. (Two later general fixes, curly apostrophes in "Coulomb’s law" and electron "orbits" not being gravitational, did not change any score on any gold set.)')):
        if gsets.get(key):
            L += render_gold(gsets[key], title, note)
    # 10 random parts (fixed seed)
    rnd = random.Random(4)
    pool = [(pa['paper_id'], p) for syl in ('9709', '9702') for pa in papers[syl]
            for q in pa['questions'] for p in q['parts']]
    L += ['## 10 random parts for spot checks (seed 4)', '']
    for pid, p in rnd.sample(pool, 10):
        txt = re.sub(r'\s+', ' ', (p['preamble'] + ' ' + p['text']).strip())[:160]
        L.append('- %s Q%s [%s] primary=%s tags=%s%s: %s' % (
            pid, p['id'], p['marks'], p['primary_tag'], [t['tag'] for t in p['tags']],
            (' sim=' + str(p['sim']['id'])) if 'sim' in p else '', txt))
    L.append('')

    summary = ('papers %d | marks ok %d/%d | consecutive %d/%d | parts %d | untagged %d | '
               'MS exact %d, groups %d, mismatches %d | PASS %d/%d' % (
                   n, n_marks, n, n_cons, n, nparts, n_untag, n_exact, n_group, n_mis, n_pass, n))
    for key, g in sorted(gsets.items(), reverse=True):
        summary += ' | %s primary %d/%d, qtype %d/%d' % (key, g['prim_ok'], g['prim_n'], g['qt']['ok'], g['qt']['n'])
    return '\n'.join(L) + '\n', summary
