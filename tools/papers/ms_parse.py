"""Parse Paper 4 mark schemes into {paper_id: {label: {...}}} using word positions.

Usage: <venv-python> -I tools/papers/ms_parse.py <papers_root> <out_json>

This is the only pipeline step that needs pdfplumber; it writes
data/questions/ms_marks.json, which validate.py (stdlib) reads.

Mark-scheme tables have columns Question | Answer | Marks [| Guidance].
For each page we locate the header words, then
  * the Question column = words whose x0 lies left of Question.x0 + 45 and that
    look like a label: 1, 1(a), 4(iii), 2(b)(ii), Q6(i) ... (never 0: a line of
    working such as "0 = 0.8 - 6T" can start in that column)
  * the Marks column    = words right-aligned with the mark tokens: R is the most
    common x1 of B1/M1/A1-like words under the Marks header; words with
    x1 <= R+2 and x0 >= Marks.x0-25 are taken ('A1 FT' puts A1 left of R).
    Guidance text is left-aligned to the right of R, so it never ends there.
Each label "owns" the marks-column words below it until the next label.
Tokens such as B1 / M1 / A1 / C1 / DM1 / *M1 / B1FT / B2 / B1B1 are summed ("sum");
'(B1' ... 'A1)' brackets of a 9709 EITHER/OR block count, a fully bracketed
'(C1)' (9702: implied by the next mark) does not.
A bare integer in the Marks column is the part total printed by 9709 schemes
("total"; the first one wins). Everything after an "Alternative ..." line is
ignored until the next label, and a later repeat of a label adds nothing once a
total is known, so alternative methods are not double counted.
"""
import sys, os, re, glob, json
import pdfplumber

LABEL = re.compile(r'^Q?([1-9]\d?)([a-h])?((?:\((?:[a-h]|i|ii|iii|iv|v|vi|vii)\))*)((?:\d\.)?)$')
ALT = re.compile(r'^(\d{1,2}\S*\s+)?(Alternative|ALTERNATIVE|Alt\b)|Alternative (method|scheme|solution|answer)', re.I)
# one or more tokens in a word ('B1B1'), optionally in the brackets of an EITHER/OR block ('(*B1', 'A1)')
ONE = r'\*?(?:D|d)?[BMACbmac]\d(?:\*|FT|ft|dep|DEP)*'
TOKEN = re.compile(r'^\(?(?:%s)+\)?$' % ONE)
TOKEN_VAL = re.compile(r'[BMACbmac](\d)')
INT = re.compile(r'^\d{1,2}$')


def lines_of(words, tol=3):
    rows = []
    for w in sorted(words, key=lambda w: (round(w['top']), w['x0'])):
        if rows and abs(rows[-1][0] - w['top']) <= tol:
            rows[-1][1].append(w)
        else:
            rows.append([w['top'], [w]])
    return rows


def parse(path):
    out = {}
    order = []
    cur = None          # current label
    skipping = False    # inside an alternative-method block
    last_R = None       # right edge of the Marks column on the previous page
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            words = page.extract_words(keep_blank_chars=False, use_text_flow=False)
            hdr = {}
            for q in words:
                if q['text'] != 'Question':
                    continue
                same = [w for w in words if abs(w['top'] - q['top']) < 4]
                cand = {('Marks' if w['text'] == 'Mark' else w['text']): w for w in same}
                if 'Answer' in cand and 'Marks' in cand:
                    hdr = {k: cand[k] for k in ('Answer', 'Marks', 'Guidance') if k in cand}
                    hdr['Question'] = q
                    break
            if not hdr:
                continue
            qx = hdr['Question']['x0']
            htop = hdr['Question']['top']
            mk = hdr['Marks']
            # Mark tokens and part totals are right-aligned in the Marks column.
            # Find that right edge R as the most common x1 of B1/M1/A1-like
            # words near the header, then accept words ending within R-3..R+2.
            win = [w for w in words if w['top'] > htop + 5 and TOKEN.match(w['text'])
                   and mk['x0'] - 25 <= w['x0'] and w['x1'] <= mk['x1'] + 20]
            if win:
                xs = [round(w['x1']) for w in win]
                R = max(sorted(set(xs)), key=xs.count)
                last_R = R
            else:
                R = last_R if last_R is not None else mk['x1'] + 4
            body = [w for w in words if w['top'] > htop + 5 and w['top'] < page.height - 45]
            for top, row in lines_of(body):
                text = ' '.join(w['text'] for w in row)
                lab = None
                for w in row:
                    m = LABEL.match(w['text']) if w['x0'] < qx + 45 else None
                    if m:
                        # canonical form 9(a)(ii)1. (one scheme prints '9a(ii)')
                        lab = m.group(1) + ('(%s)' % m.group(2) if m.group(2) else '') + m.group(3) + m.group(4)
                        break
                answer_text = ' '.join(w['text'] for w in row if w['x1'] < mk['x0'])
                is_alt = bool(ALT.search(answer_text))
                if lab is not None:
                    alt = is_alt
                    if lab not in out:
                        out[lab] = {'total': None, 'sum': 0, 'tokens': []}
                        order.append(lab)
                    cur = lab
                    # a repeated label (continuation page / alternative method)
                    skipping = alt or out[lab]['total'] is not None
                    if alt:
                        continue
                elif is_alt:
                    skipping = True
                    continue
                if cur is None or skipping:
                    continue
                for w in row:
                    # whole Marks column: right edge at R; a token may be followed by
                    # 'FT' ('A1 FT'), so only the right end is constrained.
                    if not (w['x0'] >= mk['x0'] - 25 and w['x1'] <= R + 2):
                        continue
                    t = w['text']
                    m = TOKEN.match(t)
                    if m and t.startswith('(') and t.endswith(')'):
                        continue    # '(C1)': a mark implied by a later one (9702), not added
                    if m:
                        out[cur]['tokens'].append(t)
                        out[cur]['sum'] += sum(int(v) for v in TOKEN_VAL.findall(t.strip('()*')))
                    elif INT.match(t) and out[cur]['total'] is None:
                        out[cur]['total'] = int(t)
    return {k: out[k] for k in order}


def main():
    root, dst = sys.argv[1], sys.argv[2]
    res = {}
    for f in sorted(glob.glob(root + '/**/*_ms_4*.pdf', recursive=True)):
        with open(f, 'rb') as fh:
            if fh.read(5) != b'%PDF-':
                continue
        pid = os.path.basename(f)[:-4].replace('_ms_', '_qp_')
        try:
            res[pid] = parse(f)
        except Exception as e:  # pragma: no cover
            print('FAIL', f, e)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, 'w') as w:
        json.dump(res, w, indent=1, sort_keys=True)
    print('wrote', dst, len(res), 'mark schemes')


if __name__ == '__main__':
    main()
