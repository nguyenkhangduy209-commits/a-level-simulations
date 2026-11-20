"""Question-type outputs (stdlib only), called from run_all.py.

  data/questions/question_types.json      taxonomy + counts
  data/questions/<syl>_p4_by_type.md      type -> parts, newest first
  sim/data/p4-questions.js                window.P4_QUESTIONS / window.P4_TYPES for the hub

Item grouping: a question whose parts all share one value (topic or type) gives one
item with the plain question ref ("9709/42 M/J 24 Q5").  When parts differ, one item
is made per value, with the part ids appended ("... Q5 (b)(i), (b)(ii)") and the marks
of just those parts.  A question with no parts is a single item.
"""
import re, json

import os, glob

import qtypes
import respace

GOOD_SPACING = 0.14     # papers below this spacing_ratio get display re-spacing
_R = None


def init_respacer(papers, ms_text_dir):
    """Word table from well-spaced question papers and all mark-scheme texts."""
    global _R
    texts = []
    for syl in sorted(papers):
        for pa in papers[syl]:
            if pa['spacing_ratio'] >= GOOD_SPACING:
                for q in pa['questions']:
                    texts.append(q['stem'])
                    texts.extend(' '.join((x['intro'], x['preamble'], x['text'])) for x in q['parts'])
    for f in sorted(glob.glob(os.path.join(ms_text_dir, '*.txt'))):
        with open(f, encoding='utf-8') as fh:
            texts.append(fh.read())
    _R = respace.Respacer(texts)


def display(pa, s):
    """Text for showing to people: whitespace tidied, run-together words split (low-spacing papers)."""
    s = tidy(s)
    if _R is not None and pa is not None and pa['spacing_ratio'] < GOOD_SPACING:
        s = _R.text(s)
    s = re.sub(r'([’\'])\s(s)\b', r'\1\2', s)          # "engine’ s" -> "engine’s"
    s = re.sub(r'\bink W\b', 'in kW', s)                    # "Find, ink W, the power"
    s = re.sub(r'(?<=\d)\s?k\s?W\b|\bk W\b', ' kW', s)
    return re.sub(r'\s+', ' ', s).strip()

SESS_CODE = {'m': 'F/M', 's': 'M/J', 'w': 'O/N'}
SESS_RANK = {'w': 3, 's': 2, 'm': 1}       # within a year: Oct/Nov newest, Feb/Mar oldest
# sentence start: a capitalised word (or "Fig.") followed by a lower-case word of 3+ letters
SENT = re.compile(r'(?:(?<=\s)|^)(?:[A-Z][a-z]*\s(?=[a-z]{3,}\b)|Fig\.\s?\d)')


def paper_ref(pa):
    return '%s/%s %s %02d' % (pa['syllabus'], pa['component'], SESS_CODE[pa['series']], pa['year'] % 100)


def newest_key(pa, qn):
    return (-pa['year'], -SESS_RANK[pa['series']], pa['component'], qn)


def tidy(s):
    s = s.replace('<ANS>', ' ').replace('____', ' ')
    return re.sub(r'\s+', ' ', s).strip()


def strip_diagram(s):
    """Drop diagram labels that pdfplumber puts before the first sentence."""
    m = SENT.search(s)
    if m and m.start() > 0 and not re.search(r'[a-z]{4,}', s[:m.start()]):
        s = s[m.start():]
    # figure captions that precede the first sentence ("Fig. 7.1 Fig. 7.2 Four forces ...")
    return re.sub(r'^(?:Fig\.\s?\d+\.\d+\s+)+(?=[A-Z])', '', s)


def cut(s, n):
    if len(s) <= n:
        return s
    c = s[:n]
    sp = c.rfind(' ')
    if sp > n * 0.7:
        c = c[:sp]
    return c.rstrip(' ,;:') + '…'


def stem_text(q, parts=None, n=160, pa=None):
    """Question stem, then the text of the (first selected) part, ~n chars."""
    parts = parts if parts is not None else q['parts']
    bits = [q['stem']]
    if parts:
        p = parts[0]
        bits += [p['intro'], p['preamble'], p['text']]
    s = strip_diagram(display(pa, ' '.join(b for b in bits if b)))
    return cut(s, n)


def fmt_id(pid):
    """'5b(ii)' -> '(b)(ii)', '3' -> '', '2(i)' -> '(i)', '6a(ii)1.' -> '(a)(ii)1.'"""
    m = re.match(r'(\d+)([a-h])?((?:\([ivx]+\))*)(.*)$', pid)
    return ('(%s)' % m.group(2) if m.group(2) else '') + m.group(3) + m.group(4)


def grouped(pa, q, key, sim_of):
    """Items for one question, grouped by key(part)."""
    base = '%s Q%d' % (paper_ref(pa), q['q'])
    parts = q['parts']
    if not parts:
        k = key(None)
        return [(k, {'ref': base, 'marks': q['marks'], 'text': stem_text(q, [], pa=pa),
                     'sim': sim_of(q, None, k), 'qtype': q['qtype']})]
    groups = {}
    for p in parts:
        groups.setdefault(key(p), []).append(p)
    if len(groups) == 1:
        k = next(iter(groups))
        return [(k, {'ref': base, 'marks': q['marks'], 'text': stem_text(q, pa=pa),
                     'sim': sim_of(q, None, k), 'qtype': q['qtype']})]
    out = []
    for k, ps in groups.items():
        ids = [fmt_id(p['id']) for p in ps]
        out.append((k, {'ref': base + ' ' + ', '.join(i for i in ids if i), 'marks': sum(p['marks'] or 0 for p in ps),
                        'text': stem_text(q, ps, pa=pa), 'sim': sim_of(q, ps, k),
                        'qtype': ps[0]['qtype'] if len({p['qtype'] for p in ps}) == 1 else q['qtype']}))
    return out


def _sim(q, ps, _k):
    if q.get('sim') is None and not ps:
        return None
    if ps:
        sims = [p.get('sim', {}).get('id') for p in ps]
        sims = [s for s in sims if s]
        if sims:
            return max(set(sims), key=lambda s: (sims.count(s), s))
        return None
    return q.get('sim')


def _sim_type(q, ps, k):
    return qtypes.TYPE[k]['sim'] if k in qtypes.TYPE else None


def collect(papers):
    """Return (by_topic{tag:[(sortkey,item)]}, by_type{qtype:[(sortkey,item,parts)]})."""
    by_topic, by_type = {}, {}
    for syl in ('9709', '9702'):
        for pa in papers[syl]:
            for q in pa['questions']:
                sk = newest_key(pa, q['q'])
                for k, it in grouped(pa, q, lambda p: p['primary_tag'] if p else q['primary_tag'], _sim):
                    if syl == '9702':
                        it['sim'] = None
                    by_topic.setdefault(k, []).append((sk, it))
                for k, it in grouped(pa, q, lambda p: p['qtype'] if p else q['qtype'], _sim_type):
                    it['qtype'] = k
                    by_type.setdefault(k, []).append((sk, it))
    for d in (by_topic, by_type):
        for k in d:
            d[k].sort(key=lambda x: x[0])
    return by_topic, by_type


def question_types_json(papers):
    parts_n, marks_n, q_n = {}, {}, {}
    for syl in papers:
        for pa in papers[syl]:
            for q in pa['questions']:
                for t in set(q['qtypes']):
                    q_n[t] = q_n.get(t, 0) + 1
                for p in q['parts']:
                    parts_n[p['qtype']] = parts_n.get(p['qtype'], 0) + 1
                    marks_n[p['qtype']] = marks_n.get(p['qtype'], 0) + (p['marks'] or 0)
    out = []
    for t in qtypes.taxonomy():
        d = dict(t)
        d['count_questions'] = q_n.get(t['id'], 0)
        d['count_parts'] = parts_n.get(t['id'], 0)
        d['count_marks'] = marks_n.get(t['id'], 0)
        out.append(d)
    return out


def by_type_md(syl, papers, topic_names):
    rows = {}
    for pa in papers[syl]:
        for q in pa['questions']:
            for p in q['parts']:
                rows.setdefault(p['qtype'], []).append((newest_key(pa, q['q']), pa, q, p))
    title = '9709 Paper 4 (Mechanics)' if syl == '9709' else '9702 Paper 4 (A Level structured questions)'
    out = ['# %s: parts by question type' % title, '',
           'Generated by `python3 tools/papers/run_all.py`. Types are defined in '
           '`data/questions/question_types.json`. Each line: paper Q(part) [marks] first ~100 characters '
           'of the part (question stem for the first part of a question). Newest papers first.',
           'Types are assigned per part with question-level grouping (e.g. every part of a vehicle question '
           'that involves power is "vehicle-power"); see VALIDATION.md for accuracy on the gold sets.', '',
           '| Type | Topic | Sim | Parts | Marks |', '|---|---|---|---|---|']
    types = [t for t in qtypes.taxonomy() if t['subject'] == syl]
    for t in types:
        lst = rows.get(t['id'], [])
        out.append('| %s | %s | %s | %d | %d |' % (t['name'], t['topic'], t['sim'] or '-', len(lst),
                                                  sum(p['marks'] or 0 for *_, p in lst)))
    if rows.get(None):
        out.append('| (none) | | | %d | |' % len(rows[None]))
    out.append('')
    for t in types:
        lst = sorted(rows.get(t['id'], []), key=lambda x: (x[0], x[3]['id']))
        out.append('## %s (`%s`, %d parts)' % (t['name'], t['id'], len(lst)))
        out.append('')
        out.append('%s Topic %s %s.%s' % (t['description'], t['topic'], topic_names.get(t['topic'], ''),
                                          (' Sim: `%s`.' % t['sim']) if t['sim'] else ''))
        out.append('')
        for _, pa, q, p in lst:
            first = q['parts'] and q['parts'][0] is p
            s = tidy(' '.join(x for x in ((q['stem'] if first else ''), p['intro'] if first else '',
                                          p['preamble'], p['text']) if x)) or tidy(p['intro'] or q['stem'])
            s = cut(strip_diagram(display(pa, s)), 100)
            out.append('- %s Q%d%s [%s] %s' % (paper_ref(pa), q['q'], fmt_id(p['id']), p['marks'], s))
        out.append('')
    return '\n'.join(out) + '\n'


def p4_js(papers):
    by_topic, by_type = collect(papers)
    order = [t for t in ('9709-M1', '9709-M2', '9709-M3', '9709-M4', '9709-M5')] + \
            ['9702-%d' % i for i in range(12, 26)] + ['9702-LEGACY-electronics', '9702-LEGACY-communication']
    topics = {}
    for t in order + sorted(k for k in by_topic if k not in order and k):
        if t in by_topic:
            topics[t] = [it for _, it in by_topic[t]]
    # broad groups for the hub (tools/papers/groups.py); each item keeps its fine type as 'sub'
    import groups
    tax = qtypes.taxonomy()
    groups.check([t['id'] for t in tax])
    name_of = {t['id']: t['name'] for t in tax}
    types = []
    for gid, gname, subj, topic, ggroup, gmode, members in groups.GROUPS:
        merged = []
        for tid in members:
            for key, it in by_type.get(tid, []):
                it = dict(it); it['sub'] = name_of[tid]
                merged.append((key, it))
        merged.sort(key=lambda kv: kv[0])
        items = [it for _, it in merged]
        types.append({'id': gid, 'name': gname, 'subject': subj, 'topic': topic, 'group': ggroup, 'mode': gmode,
                      'subtypes': [name_of[t] for t in members], 'count': len(items), 'items': items})
    head = ('// Generated by tools/papers/run_all.py from Cambridge 9709/9702 Paper 4 question papers.\n'
            '// Do not edit by hand. Text is raw (not HTML-escaped): the hub escapes on display.\n'
            '// P4_QUESTIONS: topic tag -> items (newest first). P4_TYPES: question types with items.\n')
    js = head + 'window.P4_QUESTIONS = ' + json.dumps(topics, ensure_ascii=False, indent=1) + ';\n' + \
        'window.P4_TYPES = ' + json.dumps(types, ensure_ascii=False, indent=1) + ';\n'
    # U+2028/2029 are legal in JSON but break JS string literals in older engines
    return js.replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
