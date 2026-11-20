"""Hand-review corrections applied on top of the rule-based tagger (stdlib only).

Files: tools/papers/overrides/*.json, each  { "<paper_id>": { "<part id e.g. 3b(ii)> | Q<n>": {
          "primary_tag": "9709-M4", "qtype": "9709-pulley-table", "note": "why" } } }
A "Q<n>" key applies to every part of question n that has no part-specific entry.
Unknown tags / types raise, so a typo can never slip through silently.
"""
import os, glob, json
import qtypes

HERE = os.path.dirname(os.path.abspath(__file__))
_cache = None
VALID_TAGS = {'9709-M1', '9709-M2', '9709-M3', '9709-M4', '9709-M5',
              '9702-LEGACY-electronics', '9702-LEGACY-communication'} | {'9702-%d' % i for i in range(1, 26)}


def load():
    global _cache
    if _cache is None:
        _cache = {}
        for f in sorted(glob.glob(os.path.join(HERE, 'overrides', '*.json'))):
            with open(f, encoding='utf-8') as fh:
                data = json.load(fh)
            for pid, entries in data.items():
                for key, o in entries.items():
                    if 'primary_tag' in o and o['primary_tag'] not in VALID_TAGS:
                        raise ValueError('%s %s %s: unknown tag %s' % (os.path.basename(f), pid, key, o['primary_tag']))
                    if 'qtype' in o and o['qtype'] not in qtypes.TYPE:
                        raise ValueError('%s %s %s: unknown qtype %s' % (os.path.basename(f), pid, key, o['qtype']))
                    _cache.setdefault(pid, {})[key] = o
    return _cache


def _apply_one(target, o):
    if 'primary_tag' in o:
        target['primary_tag'] = o['primary_tag']
        tags = target.get('tags', [])
        if tags and isinstance(tags[0], dict):
            if not any(t['tag'] == o['primary_tag'] for t in tags):
                tags.insert(0, {'tag': o['primary_tag'], 'score': 99, 'rules': ['hand review']})
        elif o['primary_tag'] not in tags:
            tags.insert(0, o['primary_tag'])
    if 'qtype' in o:
        target['qtype'] = o['qtype']
        target['qtypes'] = [o['qtype']] + [t for t in target.get('qtypes', []) if t != o['qtype']]
    target['reviewed'] = True


def apply(pid, q):
    """Apply overrides for one question in place; recompute question-level tag and type. Returns #changes."""
    ov = load().get(pid)
    if not ov:
        return 0
    n = 0
    qkey = 'Q%d' % q['q']
    if q['parts']:
        for p in q['parts']:
            o = ov.get(p['id']) or ov.get(qkey)
            if o:
                _apply_one(p, o); n += 1
        if n:
            by_t, by_y = {}, {}
            for p in q['parts']:
                if p.get('primary_tag'):
                    by_t[p['primary_tag']] = by_t.get(p['primary_tag'], 0) + (p['marks'] or 0)
                if p.get('qtype'):
                    by_y[p['qtype']] = by_y.get(p['qtype'], 0) + (p['marks'] or 0)
            order = [t[0] for t in qtypes.TYPES]
            if by_t:
                q['primary_tag'] = max(by_t, key=lambda t: (by_t[t], t))
                q['tags'] = [q['primary_tag']] + [t for t in by_t if t != q['primary_tag']]
            if by_y:
                q['qtype'] = max(by_y, key=lambda t: (by_y[t], -order.index(t)))
                q['qtypes'] = [q['qtype']] + [t for t in by_y if t != q['qtype']]
    elif ov.get(qkey):
        _apply_one(q, ov[qkey]); n = 1
    return n
