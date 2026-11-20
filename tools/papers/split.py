"""Split cleaned Paper 4 lines into questions and leaf parts.

A state machine over the cleaned lines produced by clean.py ('<PB n>' and
'<ANS>' markers). Stdlib only. Rules (docs/PLAN.md C.2, tightened by the data):

* Question start: a line '^(\\d{1,2})(\\s+rest)?$' whose number equals the
  expected next number, and
    - rest starts with a capital letter (and contains a lower-case word),
      '(a)' or '(i)'; or
    - the line is a bare number directly after a page break or an answer block
      (diagram-first questions).
  Rest starting with a unit or a number ('2.6 m 35 N') is rejected.
  A new question can only start once the current question has marks.
* Part labels must follow the sequence: level 1 is the type of the first label
  in the question (letters (a),(b).. or, in 2018-19 9709 papers, romans
  (i),(ii)..); level 2 is the other type. A label out of sequence is text.
* Marks '[n]' attach to the current leaf; '[Total: n]' records the stated total.
* Text after a mark and before the next label is the next leaf's preamble;
  text between a level-1 label and its first level-2 label is the 'intro'
  shared by all its sub-parts; text before the first label is the stem.
"""
import re

ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']
LETTERS = list('abcdefgh')
QSTART = re.compile(r'^(\d{1,2})(?:\s+(.*)|(?=[A-Z][a-z]{2,})(.*))?$')
UNIT_START = re.compile(r'^(kg|g\b|m\b|N\b|s\b|cm|mm|km|°|J\b|W\b|kW|V\b|A\b(?=\s*$)|Ω|\d|\.|,|-|\+|=|×|\))')
LABEL = re.compile(r'^\((' + '|'.join(sorted(LETTERS + ROMAN, key=len, reverse=True)) + r')\)\s*')
MARK = re.compile(r'\[\s?(\d{1,2})\s?\]')
TOTAL = re.compile(r'\[\s?Total\s?:\s?(\d{1,3})\s?\]', re.I)
PB = re.compile(r'^<PB (\d+)>$')
NUM3 = re.compile(r'^([1-6])\.\s+(?=[A-Z])')


def next_in(seq, cur):
    if cur is None:
        return seq[0]
    i = seq.index(cur)
    return seq[i + 1] if i + 1 < len(seq) else None


class Leaf:
    def __init__(self, label, sub, page):
        self.label, self.sub = label, sub
        self.subsub = None       # level 3 ('1.', '2.' in 2018 9702 papers)
        self.merged = []         # sub labels sharing one mark bracket
        self.preamble, self.text, self.marks = [], [], []
        self.intro = []          # shared level-1 intro (list object shared by siblings)
        self.pages = [page]

    def add_page(self, page):
        if page not in self.pages:
            self.pages.append(page)


class Question:
    def __init__(self, q, page, first):
        self.q = q
        self.pages = [page]
        self.raw = [first]
        self.line_idx = []       # indices into the cleaned line list
        self.stem = []
        self.leaves = []
        self.total_stated = None
        self.l1_type = None      # 'letter' or 'roman'
        self.cur1 = None         # current level-1 label
        self.cur2 = None         # current level-2 label
        self.cur3 = None         # current level-3 number
        self.cur1_intro = None   # intro list for current level-1 label
        self.cur1_leaf = None    # leaf created for a level-1 label awaiting marks
        self.pending = []        # text after last mark, waiting for a label
        self.warnings = []

    @property
    def marks(self):
        return sum(sum(l.marks) for l in self.leaves)

    def cur_leaf(self):
        return self.leaves[-1] if self.leaves else None


def label_type(lab):
    # letters a-h never collide with romans except 'i'/'v'/'x' which are not letters here
    return 'letter' if lab in LETTERS else 'roman'


def try_label(q, lab):
    """Return 1 or 2 (level) if lab is the next label in sequence, else None."""
    t = label_type(lab)
    if q.l1_type is None:
        return 1 if lab in ('a', 'i') else None
    seq1 = LETTERS if q.l1_type == 'letter' else ROMAN
    seq2 = ROMAN if q.l1_type == 'letter' else LETTERS
    if t == ('letter' if q.l1_type == 'letter' else 'roman'):
        return 1 if lab == next_in(seq1, q.cur1) else None
    # level 2
    if q.cur1 is None:
        return None
    return 2 if lab == next_in(seq2, q.cur2) else None


def start_label(q, lab, level, page):
    if q.l1_type is None:
        q.l1_type = label_type(lab)
    q.cur3 = None
    if level == 1:
        q.cur1, q.cur2 = lab, None
        q.cur1_intro = []
        leaf = Leaf(lab, None, page)
        leaf.preamble = q.pending
        leaf.intro = q.cur1_intro
        q.pending = []
        q.leaves.append(leaf)
        q.cur1_leaf = leaf
    else:
        parent = q.cur1_leaf
        if parent is not None and not parent.marks and q.cur2 is None and parent.sub is None:
            # level-1 label had no marks of its own: its text becomes the intro
            q.cur1_intro.extend(parent.preamble + parent.text)
            q.leaves.remove(parent)
            q.cur1_leaf = None
            pre = q.pending
        else:
            pre = q.pending
        q.cur2 = lab
        leaf = Leaf(q.cur1, lab, page)
        leaf.preamble = pre
        leaf.intro = q.cur1_intro
        q.pending = []
        q.leaves.append(leaf)


def add_text(q, text, page):
    if not text:
        return
    leaf = q.cur_leaf()
    if leaf is None:
        q.stem.append(text)
    elif leaf.marks:
        q.pending.append(text)
    else:
        leaf.text.append(text)
        leaf.add_page(page)


def add_mark(q, n, page):
    leaf = q.cur_leaf()
    if leaf is None or (leaf.marks and q.pending):
        # marks with no open part: whole-question leaf (or text after a mark
        # that ended with another mark -> unlabelled continuation)
        if leaf is None:
            leaf = Leaf(None, None, page)
            leaf.text = q.stem
            q.stem = []
            q.leaves.append(leaf)
        else:
            q.warnings.append('mark [%d] after text with no new label; added to %s' %
                              (n, leaf_id(q.q, leaf)))
            leaf.text.extend(q.pending)
            q.pending = []
    elif leaf.marks:
        q.warnings.append('second mark [%d] in %s' % (n, leaf_id(q.q, leaf)))
    elif leaf.subsub is not None:
        grp = []
        for prev in reversed(q.leaves[:-1]):
            if prev.label == leaf.label and prev.sub == leaf.sub and prev.subsub is not None \
                    and not prev.marks:
                grp.insert(0, prev)
            else:
                break
        if grp:
            subs = [g.subsub for g in grp] + [leaf.subsub]
            merged = Leaf(leaf.label, leaf.sub, grp[0].pages[0])
            merged.subsub = None if subs[0] == '1' else subs[0] + '-' + subs[-1]
            merged.intro = leaf.intro
            merged.preamble = grp[0].preamble
            body = []
            for g in grp + [leaf]:
                if g is not grp[0] and g.preamble:
                    body.extend(g.preamble)
                body.append('%s.' % g.subsub)
                body.extend(g.text)
                for pg in g.pages:
                    merged.add_page(pg)
            merged.text = body
            for g in grp + [leaf]:
                q.leaves.remove(g)
            q.leaves.append(merged)
            q.warnings.append('one mark bracket [%d] shared by %s' %
                              (n, ', '.join('%s.' % x for x in subs)))
            leaf = merged
    elif leaf.sub is not None:
        # one bracket shared by several sub-parts, e.g. '(i) ... (ii) ... [2]':
        # merge the unmarked preceding siblings into this leaf
        grp = []
        for prev in reversed(q.leaves[:-1]):
            if prev.label == leaf.label and prev.sub is not None and not prev.marks \
                    and prev.subsub is None:
                grp.insert(0, prev)
            else:
                break
        if grp:
            subs = [g.sub for g in grp] + [leaf.sub]
            merged = Leaf(leaf.label, subs[0] + '-' + subs[-1], grp[0].pages[0])
            merged.merged = subs
            merged.intro = leaf.intro
            merged.preamble = grp[0].preamble
            body = []
            for g in grp + [leaf]:
                if g is not grp[0] and g.preamble:
                    body.extend(g.preamble)
                body.append('(%s)' % g.sub)
                body.extend(g.text)
                for pg in g.pages:
                    merged.add_page(pg)
            merged.text = body
            for g in grp + [leaf]:
                q.leaves.remove(g)
            q.leaves.append(merged)
            q.warnings.append('one mark bracket [%d] shared by %s' %
                              (n, ', '.join('(%s)' % x for x in subs)))
            leaf = merged
    leaf.marks.append(n)
    leaf.add_page(page)


def process_segment(q, seg, page):
    """seg: a piece of a line (no mark brackets inside except at its end)."""
    s = seg.strip()
    while True:
        m = LABEL.match(s)
        if not m:
            break
        lab = m.group(1)
        lvl = try_label(q, lab)
        if lvl is None:
            if q.l1_type is not None or lab not in ('a', 'i'):
                q.warnings.append('label (%s) out of sequence treated as text' % lab)
            break
        start_label(q, lab, lvl, page)
        s = s[m.end():]
    m = NUM3.match(s)
    if m and q.cur2 is not None:
        want = str(int(q.cur3) + 1) if q.cur3 else '1'
        if m.group(1) == want:
            leaf = q.cur_leaf()
            if want == '1' and leaf is not None and not leaf.marks and leaf.sub == q.cur2:
                leaf.preamble = leaf.preamble + leaf.text
                leaf.text = []
                leaf.subsub = '1'
            else:
                nl = Leaf(q.cur1, q.cur2, page)
                nl.subsub = want
                nl.preamble = q.pending
                nl.intro = q.cur1_intro
                q.pending = []
                q.leaves.append(nl)
            q.cur3 = want
            s = s[m.end():]
    return s


def handle_line(q, line, page, record=True):
    if record:
        q.raw.append(line)
    t = TOTAL.search(line)
    if t:
        q.total_stated = int(t.group(1))
        line = (line[:t.start()] + line[t.end():]).strip()
        if not line:
            return
    pos = 0
    for m in MARK.finditer(line):
        seg = line[pos:m.start()]
        rest = process_segment(q, seg, page)
        add_text(q, rest.strip(), page)
        add_mark(q, int(m.group(1)), page)
        pos = m.end()
    rest = process_segment(q, line[pos:], page)
    add_text(q, rest.strip(), page)


def leaf_id(qn, leaf):
    if leaf.label is None:
        return str(qn)
    if label_type(leaf.label) == 'letter':
        s = '%d%s' % (qn, leaf.label) + ('(%s)' % leaf.sub if leaf.sub else '')
    else:
        s = '%d(%s)' % (qn, leaf.label) + ('(%s)' % leaf.sub if leaf.sub else '')
    return s + (leaf.subsub or '')


def ms_label(qn, leaf):
    s = str(qn)
    if leaf.label:
        s += '(%s)' % leaf.label
    if leaf.sub:
        s += '(%s)' % leaf.sub
    if leaf.subsub:
        s += leaf.subsub + '.'
    return s


def finalize(q):
    # a merged range that covers every sub-part of its label is just the parent
    for lf in q.leaves:
        if lf.merged and lf.merged[0] in ('i', 'a'):
            if not any(o is not lf and o.label == lf.label for o in q.leaves):
                lf.sub = None


def is_qstart(line, expected, after_break, cur):
    m = QSTART.match(line)
    if not m or int(m.group(1)) != expected:
        return False
    if cur is not None and cur.marks == 0:
        return False
    rest = (m.group(2) or m.group(3) or '').strip()
    if not rest:
        return after_break
    if UNIT_START.match(rest):
        return False
    if rest.startswith('(a)') or rest.startswith('(i)'):
        return True
    if re.match(r'^[A-Z]', rest) and re.search(r'[a-z]{2,}', rest):
        return True
    return False


def split_lines(lines):
    questions = []
    cur = None
    expected = 1
    page = None
    after_break = True
    pre_q1 = []
    for li, line in enumerate(lines):
        if cur is not None:
            cur.line_idx.append(li)
        pm = PB.match(line)
        if pm:
            page = int(pm.group(1))
            after_break = True
            continue
        if line == '<ANS>':
            after_break = True
            continue
        if is_qstart(line, expected, after_break, cur):
            m = QSTART.match(line)
            rest = (m.group(2) or m.group(3) or '').strip()
            if cur is not None:
                cur.line_idx.pop()       # this line belongs to the new question
            cur = Question(expected, page, line)
            cur.line_idx.append(li)
            questions.append(cur)
            expected += 1
            if rest:
                handle_line(cur, rest, page, record=False)
            after_break = False
            continue
        if cur is None:
            pre_q1.append(line)
            continue
        if page not in cur.pages:
            cur.pages.append(page)
        handle_line(cur, line, page)
        # a bare question number is only accepted right after a page break or an
        # answer block (NOT after a mark line: w22_42 has a stray fraction
        # denominator '3' straight after '[3]')
        after_break = False
    return questions, pre_q1


def to_dict(q):
    finalize(q)
    parts = []
    for lf in q.leaves:
        parts.append({
            'id': leaf_id(q.q, lf),
            'ms_label': ms_label(q.q, lf),
            'label': lf.label,
            'sub': lf.sub,
            'subsub': lf.subsub,
            'shared_by': ['(%s)' % x for x in lf.merged],
            'intro': ' '.join(lf.intro).strip(),
            'preamble': ' '.join(lf.preamble).strip(),
            'text': ' '.join(lf.text).strip(),
            'marks': sum(lf.marks) if lf.marks else None,
            'pages': lf.pages,
        })
    trailing = ' '.join(q.pending).strip()
    return {
        'q': q.q,
        'pages': q.pages,
        'stem': ' '.join(q.stem).strip(),
        'raw': '\n'.join(q.raw),
        'line_idx': q.line_idx,
        'marks': q.marks,
        'total_stated': q.total_stated,
        'trailing': trailing,
        'warnings': q.warnings,
        'parts': parts,
    }
