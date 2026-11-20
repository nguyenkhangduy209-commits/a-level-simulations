"""Regenerate all Paper 4 question outputs (stdlib only).

Usage (from the project root):  python3 tools/papers/run_all.py

Reads   data/papers_text/*.txt          (made by tools/papers/extract.py)
        data/questions/ms_marks.json     (made by tools/papers/ms_parse.py)
        tools/papers/gold.json           (hand tags)
Writes  data/questions/9709_p4.json, data/questions/9702_p4.json
        data/questions/9709_p4_by_topic.md, data/questions/9702_p4_by_topic.md
        data/questions/9709_p4_by_type.md, data/questions/9702_p4_by_type.md
        data/questions/question_types.json
        data/questions/VALIDATION.md
        sim/data/p4-questions.js         (browser data for the hub)

The PDF-dependent steps are separate (they need pdfplumber):
  <venv>/python -I tools/papers/extract.py    data/papers data/papers_text
  <venv>/python -I tools/papers/ms_parse.py   data/papers data/questions/ms_marks.json
Output is deterministic: no timestamps, sorted inputs, sorted JSON keys.
"""
import os, re, sys, glob, json

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import clean, split, tag, qtypes, validate, outputs, overrides  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TEXT_DIR = os.path.join(ROOT, 'data', 'papers_text')
OUT_DIR = os.path.join(ROOT, 'data', 'questions')
SIM_DATA = os.path.join(ROOT, 'sim', 'data')     # only p4-questions.js is written under sim/

SESSIONS = {'m': 'February/March', 's': 'May/June', 'w': 'October/November'}
TOPIC_NAMES = {
    '9709-M1': 'Forces and equilibrium',
    '9709-M2': 'Kinematics of motion in a straight line',
    '9709-M3': 'Momentum',
    '9709-M4': "Newton's laws of motion",
    '9709-M5': 'Energy, work and power',
    '9702-12': 'Motion in a circle', '9702-13': 'Gravitational fields',
    '9702-14': 'Temperature', '9702-15': 'Ideal gases', '9702-16': 'Thermodynamics',
    '9702-17': 'Oscillations', '9702-18': 'Electric fields', '9702-19': 'Capacitance',
    '9702-20': 'Magnetic fields', '9702-21': 'Alternating currents',
    '9702-22': 'Quantum physics', '9702-23': 'Nuclear physics',
    '9702-24': 'Medical physics', '9702-25': 'Astronomy and cosmology',
    '9702-LEGACY-electronics': 'Electronics (2019-21 syllabus, legacy)',
    '9702-LEGACY-communication': 'Communication (2019-21 syllabus, legacy)',
    '9702-1': 'Physical quantities and units', '9702-2': 'Kinematics', '9702-3': 'Dynamics',
    '9702-4': 'Forces, density and pressure', '9702-5': 'Work, energy and power',
    '9702-6': 'Deformation of solids', '9702-7': 'Waves', '9702-8': 'Superposition',
    '9702-9': 'Electricity', '9702-10': 'D.C. circuits', '9702-11': 'Particle physics',
}


def syllabus_version(syl, year):
    if syl == '9709':
        return '2017-19 M1' if year <= 2019 else '2020-2027'
    if year <= 2021:
        return '2019-21 legacy'
    return '2022-24' if year <= 2024 else '2025-27'


def build_paper(path):
    pid = os.path.basename(path)[:-4]
    m = re.match(r'(\d{4})_([msw])(\d\d)_qp_(\d\d)$', pid)
    syl, series, yy, comp = m.group(1), m.group(2), int(m.group(3)), m.group(4)
    year = 2000 + yy
    with open(path, encoding='utf-8') as fh:
        raw = fh.read()
    lines, info = clean.clean_paper(raw, syl, year)
    qs, _pre = split.split_lines(lines)
    questions = []
    for qo in qs:
        q = split.to_dict(qo)
        tag.tag_question(syl, year, q)
        # raw = cleaned lines before glyph repair; flag the question if any differ
        idx = q.pop('line_idx')
        rawl = [info['raw_lines'][i] for i in idx if not info['raw_lines'][i].startswith('<')]
        fixl = [lines[i] for i in idx if not lines[i].startswith('<')]
        q['raw'] = '\n'.join(rawl)
        q['flags'] = ['glyph_subst'] if rawl != fixl else []
        if q['parts'] and any(p['marks'] is None for p in q['parts']):
            q['flags'].append('part_without_marks')
        qtypes.classify_question(syl, q)
        overrides.apply(pid, q)          # hand-review corrections (tools/papers/overrides/*.json)
        for p in q['parts']:
            if syl == '9709':
                # sim: the sim of the part's question type; keyword fallback otherwise
                tsim = qtypes.TYPE[p['qtype']]['sim'] if p['qtype'] else None
                if p['qtype'] == '9709-collisions' and re.search(r'vertically', tag.norm(q['stem'] + tag.own_text(p))):
                    tsim = 'm2-vertical'      # mid-air vertical collision (catalogue M3.5)
                p['sim'] = {'id': tsim or tag.pick_sim(p, q['stem']), 'preset': None}
                p['catalogue_codes'] = tag.qtypes_9709(p, q['stem'])
            else:
                p['catalogue_codes'] = []
        q['catalogue_codes'] = sorted(set(c for p in q['parts'] for c in p['catalogue_codes']))
        if syl == '9709':
            q['sim'] = qtypes.TYPE[q['qtype']]['sim'] if q['qtype'] else None
        questions.append(q)
    expected = 50 if syl == '9709' else 100
    found = sum(q['marks'] for q in questions)
    warnings = []
    for q in questions:
        warnings.extend('Q%d: %s' % (q['q'], w) for w in q['warnings'])
    paper = {
        'paper_id': pid, 'syllabus': syl, 'component': comp, 'series': series,
        'year': year, 'session': SESSIONS[series],
        'syllabus_version': syllabus_version(syl, year),
        'total_marks_expected': expected, 'total_marks_found': found,
        'spacing_ratio': info['spacing_ratio'],
        'glyph_substitutions': info['flags'],
        'dropped_pages': [list(x) for x in info['dropped_pages']],
        'warnings': warnings,
        'questions': questions,
    }
    return paper


def first_chars(pa, p, n=100):
    s = ' '.join(x for x in (p['preamble'], p['text']) if x) or p['intro']
    return outputs.cut(outputs.display(pa, s), n)


def by_topic_md(syl, papers):
    order = tag.ORDER[syl]
    rows = {t: [] for t in order}
    rows[None] = []
    for pa in papers:
        for q in pa['questions']:
            for p in q['parts']:
                rows.setdefault(p['primary_tag'], []).append((pa, q['q'], p))
    title = '9709 Paper 4 (Mechanics)' if syl == '9709' else '9702 Paper 4 (A Level structured questions)'
    out = ['# %s: parts by primary topic' % title, '',
           'Generated by `python3 tools/papers/run_all.py`. Each line: paper, part id, [marks], '
           'secondary tags in braces, first ~100 characters of the part (preamble + text).',
           'Primary tags come from the keyword tagger (see VALIDATION.md for accuracy on the gold set).', '']
    counts = ['| Topic | Parts | Marks |', '|---|---|---|']
    for t in order + [None]:
        lst = rows.get(t, [])
        if not lst:
            continue
        counts.append('| %s %s | %d | %d |' % (t or 'untagged', TOPIC_NAMES.get(t, ''), len(lst),
                                              sum(p['marks'] or 0 for _, _, p in lst)))
    out += counts + ['']
    for t in order + [None]:
        lst = rows.get(t, [])
        if not lst:
            continue
        out.append('## %s %s (%d parts)' % (t or 'Untagged', TOPIC_NAMES.get(t, ''), len(lst)))
        out.append('')
        for pa, qn, p in lst:
            sec = [x['tag'].replace(syl + '-', '') for x in p['tags'] if x['tag'] != t]
            sim = (' sim:' + p['sim']['id']) if syl == '9709' and p.get('sim', {}).get('id') else ''
            out.append('- %s Q%s [%s]%s%s %s' % (pa['paper_id'], p['id'], p['marks'],
                                                 (' {' + ','.join(sec) + '}') if sec else '',
                                                 sim, first_chars(pa, p)))
        out.append('')
    return '\n'.join(out) + '\n'


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    files = sorted(glob.glob(os.path.join(TEXT_DIR, '*_qp_4*.txt')))
    papers = {'9709': [], '9702': []}
    for f in files:
        pa = build_paper(f)
        papers[pa['syllabus']].append(pa)
    outputs.init_respacer(papers, os.path.join(OUT_DIR, 'ms_text'))
    for syl in ('9709', '9702'):
        with open(os.path.join(OUT_DIR, '%s_p4.json' % syl), 'w', encoding='utf-8') as w:
            json.dump(papers[syl], w, indent=1, ensure_ascii=False, sort_keys=True)
            w.write('\n')
        with open(os.path.join(OUT_DIR, '%s_p4_by_topic.md' % syl), 'w', encoding='utf-8') as w:
            w.write(by_topic_md(syl, papers[syl]))
        with open(os.path.join(OUT_DIR, '%s_p4_by_type.md' % syl), 'w', encoding='utf-8') as w:
            w.write(outputs.by_type_md(syl, papers, TOPIC_NAMES))
    with open(os.path.join(OUT_DIR, 'question_types.json'), 'w', encoding='utf-8') as w:
        json.dump(outputs.question_types_json(papers), w, indent=1, ensure_ascii=False, sort_keys=True)
        w.write('\n')
    os.makedirs(SIM_DATA, exist_ok=True)
    with open(os.path.join(SIM_DATA, 'p4-questions.js'), 'w', encoding='utf-8') as w:
        w.write(outputs.p4_js(papers))
    ms_path = os.path.join(OUT_DIR, 'ms_marks.json')
    ms = json.load(open(ms_path)) if os.path.exists(ms_path) else {}
    gold_path = os.path.join(HERE, 'gold.json')
    gold = json.load(open(gold_path)) if os.path.exists(gold_path) else {}
    report, summary = validate.report(papers, ms, gold)
    with open(os.path.join(OUT_DIR, 'VALIDATION.md'), 'w', encoding='utf-8') as w:
        w.write(report)
    print(summary)


if __name__ == '__main__':
    main()
