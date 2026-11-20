"""Restore missing word spaces for DISPLAY text (stdlib only, deterministic).

About two thirds of the 9709 papers (2018-2023, spacing_ratio < 0.12 in the JSON)
come out of pdfplumber with many words run together ("Asmoothringofmass0.2kg").
The tagger ignores whitespace, so tagging is unaffected; this module only makes the
text shown to students readable (sim/data/p4-questions.js and the *_by_*.md lists).
The JSON keeps the extracted text unchanged.

Method: a word-frequency table is built from the well-spaced papers (all 9702 papers
and the 9709 papers with spacing_ratio >= 0.14).  A run-together token is split by
dynamic programming into known words, numbers, single-letter variables and
punctuation, minimising sum(-log p(word)).  A token is changed only when every
letter is explained by a known word or a single-letter variable; otherwise it is left
exactly as extracted.
"""
import math, re

WORD = re.compile(r'[A-Za-z]+')
GLUE_LEFT = set(',.;:)]°?!\'’%')
GLUE_RIGHT = set('([')


TWO = {'an', 'as', 'at', 'be', 'by', 'do', 'if', 'in', 'is', 'it', 'no', 'of', 'on', 'or', 'so', 'to',
       'up', 'kg', 'ms', 'km', 'cm', 'mm', 'kw', 'kj', 'mj', 'mw', 'we', 'he'}
VARS = set('cdhkmnpqstuvwxy')   # lower-case letters used as variables / units in the papers
# Words that occur in the run-together 9709 papers but too rarely (< 3 times) in the
# well-spaced corpus; found by listing the tokens left unsplit (VALIDATION.md notes this).
EXTRA = '''addition ascend barrier begin begins bounce bounces burning child coupling crane crate
cyclist deep denoted denoting driverless dropping eight elevator exerted finishes front fuel girl
hammerhead her journey keep lying minibus nail occasion occasions operates passengers pedalling
playground preventing projection quarter race radii railway respective riding rocket runner
satisfies she slide slides sloping sprinter station stopping strut sudden sufficiently swinging
tangential tank tractor tram triangular truck twice vehicles wood yet
raise subject brought goes foot post driven machine used'''.split()
ALLOW_UNKNOWN = False      # unknown chunks cut unknown words into pieces ("tract or"): off
PIECE_PENALTY = 4.0        # prefer fewer, longer words
UNKNOWN_BASE = 30.0        # an unknown chunk (4+ letters, e.g. "elevator") between known words
UNKNOWN_PER_CHAR = 8.0     # ... plus this per letter, above the cost per letter of any known word


class Respacer:
    def __init__(self, texts):
        cnt = {}
        for t in texts:
            for w in WORD.findall(t):
                w = w.lower()
                cnt[w] = cnt.get(w, 0) + 1
        # rare tokens in the corpus are often run-together fragments themselves
        cnt = {w: c for w, c in cnt.items()
               if (c >= 3 and len(w) > 3) or (c >= 5 and len(w) == 3) or w in TWO or w == 'a'}
        for w in EXTRA:
            cnt[w] = max(cnt.get(w, 0), 3)
        total = float(sum(cnt.values()))
        self.cost = {w: -math.log(c / total) + PIECE_PENALTY for w, c in cnt.items()}
        self.maxlen = max(len(w) for w in self.cost)
        self.var_cost = -math.log(1.0 / total) + 2.0 + PIECE_PENALTY   # single capital letter (A, P, R)
        # regular inflections of known words (threaded, accelerates, ...)
        for w, c in list(self.cost.items()):
            if len(w) >= 4:
                sufs = ['s', 'ing'] + (['d'] if w.endswith('e') else ['ed'])
                if w.endswith(('s', 'x', 'sh', 'ch')):
                    sufs.append('es')
                for suf in sufs:
                    self.cost.setdefault(w + suf, c + 3.0)
        self.known = set(self.cost)

    def split_alpha(self, s):
        """Best split of a pure-letter string into known words, single capital letters and
        (expensive) unknown chunks of 4+ letters; None if no split has a known word."""
        n = len(s)
        best = [(0.0, None, 0)] + [(math.inf, None, 0)] * n
        low = s.lower()
        for i in range(n):
            if best[i][0] == math.inf:
                continue
            c0, _, k0 = best[i]
            for j in range(i + 1, min(n, i + self.maxlen) + 1):
                if any(ch.isupper() for ch in s[i + 1:j]):
                    break          # a capital inside a word starts a new piece
                w = low[i:j]
                if w in self.cost:
                    c = c0 + self.cost[w]
                    if c < best[j][0]:
                        best[j] = (c, i, k0 + 1)
                elif ALLOW_UNKNOWN and 4 <= j - i <= 7 and not (i == 0 and j == n):
                    c = c0 + UNKNOWN_BASE + UNKNOWN_PER_CHAR * (j - i)
                    if c < best[j][0]:
                        best[j] = (c, i, k0)
            if s[i].isupper() or s[i] in VARS:   # one-letter variable; lower-case ones (t, m, v) cost more
                c = c0 + self.var_cost + (0.0 if s[i].isupper() else 5.0)
                if c < best[i + 1][0]:
                    best[i + 1] = (c, i, k0)
        if best[n][0] == math.inf or best[n][2] == 0:
            return None
        out, j = [], n
        while j > 0:
            i = best[j][1]
            out.append(s[i:j])
            j = i
        return out[::-1]

    def plausible(self, seg, sp):
        """Reject splits that are more likely to damage an unknown word than to help:
        a long unknown chunk, or one followed by two tiny words; a lower-case one-letter piece that is not a usual variable
        letter ("min i bus", "b r a kes", "at r act or"); a one-letter piece next to an
        unknown chunk; or one in a short segment ("tank" -> "tan k")."""
        unk = [i for i, x in enumerate(sp) if len(x) > 1 and x.lower() not in self.known]
        if any(len(sp[i]) >= 8 for i in unk):
            return False
        # "elev at or": an unknown chunk followed by two tiny words is a word cut into pieces
        if any(i + 2 < len(sp) and len(sp[i + 1]) <= 2 and len(sp[i + 2]) <= 2 for i in unk):
            return False
        lone = [x for x in sp if len(x) == 1 and x.islower() and x != 'a']
        if any(x not in VARS for x in lone):
            return False
        if lone and len(seg) <= 4:
            return False
        if lone and any(x.lower() not in self.known and len(x) > 1 for x in sp):
            return False
        return True

    def token(self, tok):
        if len(tok) < 3:
            return tok
        letters = WORD.findall(tok)
        if all(w.lower() in self.known for w in letters):
            return tok
        # kW / kJ / kN glued to the previous word ("inkW")
        tok = re.sub(r'(?<=[a-z]{2})k([WJN])$', r' k\1', tok)
        if ' ' in tok:
            return ' '.join(self.token(t) for t in tok.split(' '))
        pieces = []
        # capital runs not followed by a lower-case letter are variable names (ARB, FN): kept whole
        for m in re.finditer(r'[A-Z]{2,}(?![a-z])|[A-Z]?[a-z]+|[A-Z]|\d+(?:\.\d+)?|-\d+|.', tok):
            p = m.group(0)
            if re.fullmatch(r'[A-Z]{2,}', p):
                pieces.append(p)
                continue
            if p.isalpha():
                if p.lower() in self.known:
                    pieces.append(p)
                    continue
                sp = self.split_alpha(p)
                if sp and not self.plausible(p, sp):
                    sp = None      # keep the segment as extracted
                pieces.extend(sp if sp else [p])
            else:
                pieces.append(p)
        out = ''
        for p in pieces:
            if not out:
                out = p
            elif p[0] in GLUE_LEFT or re.match(r'-\d', p) or out[-1] in GLUE_RIGHT or out[-1] == '-' or p == '-':
                out += p
            else:
                out += ' ' + p
        return out

    def text(self, s):
        return ' '.join(self.token(t) for t in s.split(' '))
