"""Clean raw pdfplumber page text of Cambridge Paper 4 question papers.

Input : data/papers_text/<paper_id>.txt (pages separated by "\\n\\f\\n").
Output: a list of cleaned lines per paper, in reading order, with markers
          <PB n>   start of printed page n
          <ANS>    one or more answer-dot lines were here
and per-paper flags (glyph substitutions, spacing ratio, dropped pages).

Stdlib only. See docs/PLAN.md section C.1 for the rule set; deviations found
in the data are noted inline.
"""
import re

PAGE_SEP = '\n\f\n'

# ---------------------------------------------------------------- patterns
BARCODE = re.compile(r'^\*\s?\d{6,}\s?\*(\s*DFD)?$')
CID = re.compile(r'\(cid:\d+\)')
MARGIN = re.compile(r'^(NIGRAM|SIHT|NI|ETIRW|TON|OD|DO NOT WRITE IN THIS MARGIN|'
                    r'DONOTWRITEINTHISMARGIN)$')
BOILER = [
    re.compile(r'©\s?UCLES'),
    re.compile(r'©\s?Cambridge University Press'),
    re.compile(r'^\[\s?Turn\s?over\s*\]?$'),
    re.compile(r'^BLANK\s?PAGE$'),
    re.compile(r'This\s?document\s?(has|consists)'),
    re.compile(r'^DC\s?\('),
    re.compile(r'^Answer\s?all\s?(the\s?)?questions\s?in\s?the\s?spaces\s?provided\.?$', re.I),
    re.compile(r'^Trace ID:'),
    re.compile(r'Re-uploading'),
    re.compile(r'Licensed for hosting'),
    re.compile(r'Downloaded from PapaCambridge'),
    re.compile(r'Question Paper (February|March|May|June|October|November)'),
    re.compile(r'^DFD$'),
]
# trailing "[Turn over" / "© UCLES ..." glued to a content line
TRAIL = re.compile(r'\s*(©\s?UCLES.*|\[\s?Turn\s?over\s*)$')
END_OF_PAPER = re.compile(r'^(Additional\s?[Pp]age|Permission\s?to\s?reproduce)')
DOTS_ONLY = re.compile(r'^[\s.…]*\.{6,}[\s.…]*$')
DOTS_MIXED = re.compile(r'\.{6,}|…{2,}')
SUPERSCRIPT = re.compile(r'^[-–−]\s?\d\.?$')     # "-1", "–2", "-1."
# 9702 data/formulae pages (appear before Q1)
DATA_SENTINELS = ('acceleration of free fall', 'Formulae', 'Stefan–Boltzmann law',
                  'decay constant', 'Hall voltage', 'capacitors in series',
                  'simple harmonic motion', 'gravitational potential energy E',
                  'radioactive decay', 'speed of light in free space',
                  'elementary charge', 'Planck constant', 'Boltzmann constant',
                  'gravitational constant', 'molar gas constant',
                  'unified atomic mass unit', 'permittivity of free space')


Q1_LINE = re.compile(r'^1\s+(\(a\)|[A-Z].*[a-z]{3,})')


def is_cid_line(line):
    toks = CID.findall(line)
    if not toks:
        return False
    rest = CID.sub('', line).strip()
    return len(''.join(toks)) > len(rest)


def is_data_page(lines):
    hits = sum(1 for s in DATA_SENTINELS if any(s in l for l in lines))
    has_q1 = any(Q1_LINE.match(l) for l in lines)
    return hits >= 2 and not has_q1


# ---------------------------------------------------------------- glyphs
def glyph_fix(text, syllabus, year, flags):
    """Repair font-encoding glyphs in 9709 files. Returns new text.

    2018-2023 9709: 'Å' is the degree sign; '1Å' (not part of a number) is
    theta-degrees; '!' and '"' are alpha and beta.
    2024+ 9709: ' G ' between operands is <=; a single-letter variable followed
    by ' 1 ' / ' 2 ' and a number means < / >; 'i' is theta in angle contexts.
    Every substitution class used is recorded in flags.
    """
    if syllabus != '9709':
        return text
    out = text
    def sub(pat, rep, s, name):
        new, n = re.subn(pat, rep, s)
        if n:
            flags.append('glyph:%s x%d' % (name, n))
        return new
    if year <= 2023:
        out = sub(r'(?<![\d.])1Å', 'θ°', out, '1Å->θ°')
        out = sub(r'(sin|cos|tan)1(?=\s?[=<>]|\s?Å)', r'\1θ', out, 'sin1->sinθ')
        out = sub(r'Å', '°', out, 'Å->°')
        out = sub(r'!', 'α', out, '!->α')
        out = sub(r'"', 'β', out, '"->β')
        # '-' printed for mu: "Find -.", "is -.", "value of -", "that - = 0.25", "Find - and"
        out = sub(r'(?<=[Ff]ind)\s?-(?=\s?(\.|,|and\b|$))|(?<=[a-z]is)\s?-(?=\s?[.,])|'
                  r'(?<=valueof)\s?-(?=\s|\.|,|$)|(?<=value of )-(?=\s|\.|,|$)|(?<=that)\s?-(?=\s?=)|'
                  r'(?<=that )-(?= =)|(?<=friction )-(?=[ .,])', 'μ', out, '-->μ')
    else:
        out = sub(r'(?<=[0-9A-Za-z]) G (?=[0-9A-Za-z])', ' ≤ ', out, 'G->≤')
        out = sub(r'(?<![A-Za-z0-9])([A-Za-z]) 1 (?=-?\d)', r'\1 < ', out, '1-><')
        out = sub(r'(?<![A-Za-z0-9])([A-Za-z]) 2 (?=-?\d)', r'\1 > ', out, '2->>')
        out = sub(r'(?<=\bangle )i\b|(?<=\bangle of )i\b|(?<=\bvalue of )i\b|'
                  r'(?<=\bwhere )i(?= =)|(?<=\b(sin|cos|tan) )i\b|(?<=\b(sin|cos|tan))i\b|'
                  r'(?<![A-Za-z])i(?=°)', 'θ', out, 'i->θ')
    return out


# ---------------------------------------------------------------- main
def clean_paper(raw, syllabus, year):
    """Return (lines, info). lines contain '<PB n>' and '<ANS>' markers."""
    pages = raw.split(PAGE_SEP)
    info = {'pages': len(pages), 'dropped_pages': [], 'flags': [], 'page_numbers': {}}
    out = []
    ended = False
    seen_q1 = False
    for idx, page in enumerate(pages, 1):
        if idx == 1:
            info['dropped_pages'].append((1, 'cover'))
            continue
        if ended:
            break
        lines = [l.strip() for l in page.split('\n')]
        lines = [l for l in lines if l]
        # barcodes, cid garbage, margin text
        kept = []
        for l in lines:
            if BARCODE.match(l) or is_cid_line(l) or MARGIN.match(l):
                continue
            l = CID.sub('', l).strip()
            if l:
                kept.append(l)
        lines = kept
        # page number = first remaining line equal to page index
        if lines and lines[0] == str(idx):
            info['page_numbers'][idx] = idx
            lines = lines[1:]
        # data/formulae pages only ever precede Question 1
        if syllabus == '9702' and not seen_q1:
            if is_data_page(lines):
                info['dropped_pages'].append((idx, 'data/formulae'))
                continue
            if any(Q1_LINE.match(l) for l in lines):
                seen_q1 = True
        page_out = []
        for l in lines:
            if END_OF_PAPER.match(l):
                ended = True
                break
            if any(p.search(l) for p in BOILER):
                # a boilerplate tail may be glued to real text, e.g. "... [2] © UCLES 2019 ..."
                m = TRAIL.search(l)
                head = l[:m.start()].strip() if m else ''
                if head and not any(p.search(head) for p in BOILER):
                    l = head
                else:
                    continue
            if DOTS_ONLY.match(l):
                if not page_out or page_out[-1] != '<ANS>':
                    page_out.append('<ANS>')
                continue
            if DOTS_MIXED.search(l):
                l = DOTS_MIXED.sub(' ____ ', l)
                l = re.sub(r'\s+', ' ', l).strip()
            l = l.replace('–', '-').replace('−', '-')
            # join superscript-only lines ("-1", "-2") to the previous line
            if SUPERSCRIPT.match(l) and page_out and not page_out[-1].startswith('<'):
                page_out[-1] = page_out[-1] + l.replace(' ', '')
                continue
            page_out.append(l)
        if not page_out and not ended:
            info['dropped_pages'].append((idx, 'empty'))
            continue
        out.append('<PB %d>' % idx)
        out.extend(page_out)
    # glyph repair on the joined text (line structure preserved)
    text = '\n'.join(out)
    fixed = glyph_fix(text, syllabus, year, info['flags'])
    lines = fixed.split('\n')
    info['raw_lines'] = out          # same length/order as lines, before glyph repair
    assert len(info['raw_lines']) == len(lines)
    # spacing ratio: spaces per character in content lines (low = words run together)
    content = ''.join(l for l in lines if not l.startswith('<'))
    info['spacing_ratio'] = round(content.count(' ') / max(1, len(content)), 3)
    return lines, info
