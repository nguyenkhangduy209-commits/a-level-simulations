#!/usr/bin/env python3
"""Build sim/data/p4-ms.js from local 9709 P4, 9702 P4, and 9702 P2 past papers & mark schemes.

Reads:
  data/questions/9709_p4.json
  data/questions/9702_p4.json
  data/questions/ms_text/*.txt
  data/papers/9702/(2020..2026)/*/*_{qp,ms}_2*.pdf (extracted via macOS Swift PDFKit)

Writes:
  sim/data/p4-ms.js   -> window.P4_BANK = [...] (for sim/solver.html & sim/core/solver.js)
"""
import glob
import json
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAPERS_TOOLS = os.path.join(ROOT, 'tools', 'papers')
sys.path.insert(0, PAPERS_TOOLS)

import outputs  # noqa: E402
import respace  # noqa: E402

OUT_JS = os.path.join(ROOT, 'sim', 'data', 'p4-ms.js')
MS_DIR = os.path.join(ROOT, 'data', 'questions', 'ms_text')

SESS_MAP = {'m': 'F/M', 's': 'M/J', 'w': 'O/N'}

# Decode Symbol-font / Private Use Area glyphs left by PDF extraction
PUA_MAP = {
    0xF020: ' ', 0xF025: '%', 0xF028: '(', 0xF029: ')', 0xF02B: '+', 0xF02C: ',',
    0xF02D: '−', 0xF02E: '.', 0xF02F: '/', 0xF03D: '=', 0xF03C: '<', 0xF03E: '>',
    0xF044: 'Δ', 0xF053: 'Σ', 0xF057: 'Ω', 0xF05B: '[', 0xF05D: ']',
    0xF061: 'α', 0xF062: 'β', 0xF067: 'γ', 0xF064: 'δ', 0xF065: 'ε',
    0xF068: 'η', 0xF06C: 'λ', 0xF06D: 'μ', 0xF06E: 'ν', 0xF070: 'π',
    0xF071: 'θ', 0xF072: 'ρ', 0xF073: 'σ', 0xF074: 'τ', 0xF077: 'ω',
    0xF0A3: '≤', 0xF0B0: '°', 0xF0B1: '±', 0xF0B3: '≥', 0xF0B4: '×',
    0xF0B7: '·', 0xF0D6: '√', 0xF0DE: '⇒', 0xF0F7: '÷',
    0xF0E6: '(', 0xF0E7: '(', 0xF0E8: '(', 0xF0F6: ')', 0xF0F8: ')',
    0xF0E9: '[', 0xF0EA: '[', 0xF0EB: '[', 0xF0F9: ']', 0xF0FA: ']', 0xF0FB: ']',
    0xF0BC: '…',
}


def clean_pua(s):
    if not s:
        return ''
    out = []
    for ch in s:
        o = ord(ch)
        if 0xE000 <= o <= 0xF8FF:
            out.append(PUA_MAP.get(o, ' '))
        else:
            out.append(ch)
    res = ''.join(out)
    res = re.sub(r'\s+', ' ', res)
    return res.strip()


def clean_ms_lines(raw_lines):
    """Turn raw mark-scheme rows into concise, high-signal equations/answers."""
    lines = []
    seen = set()
    for ln in raw_lines:
        ln = clean_pua(ln)
        if not ln:
            continue
        if re.search(r'(UCLES|Cambridge|PUBLISHED|Page \d+ of \d+|Question\s+Answer\s+Marks|DO NOT WRITE)', ln, re.I):
            continue
        # Strip pure guidance fluff while keeping equations, B/M/A/C marks and values
        ln = re.sub(r'\s{2,}', ' ', ln).strip()
        if len(ln) < 2:
            continue
        if ln not in seen:
            seen.add(ln)
            lines.append(ln)
    joined = ' · '.join(lines)
    if len(joined) > 480:
        joined = joined[:477].rsplit(' ', 1)[0] + '…'
    return joined


def parse_ms_by_question(ms_text):
    """Split a mark-scheme text file into {q_num: [lines...]}."""
    if not ms_text:
        return {}
    m_hdr = re.search(r'Question\s+Answer\s+Marks[^\n]*\n', ms_text)
    body = ms_text[m_hdr.end():] if m_hdr else ms_text
    by_q = {}
    cur_q = None
    # Match start of a question/part row: e.g. "1(a)(i) ...", "2 ...", "10(b) ..."
    q_re = re.compile(r'^([1-9]\d?)(?:\([a-z]+\)|[a-z])?(?:\([ivx]+\))?\s+(.*)', re.I)
    for raw in body.splitlines():
        line = clean_pua(raw)
        if not line:
            continue
        if re.search(r'^(?:©|Cambridge Assessment|Cambridge International|\d+/\d+\s+Cambridge|Question\s+Answer|PUBLISHED|Page\s+\d+)', line):
            continue
        mq = q_re.match(line)
        if mq:
            qn = int(mq.group(1))
            if 1 <= qn <= 15:
                # Ensure it's not a formula like "1 = ..." or "2 × 3"
                rest = line[len(mq.group(1)):].lstrip()
                if not rest.startswith(('=', '×', '+', '-', '−', '/', '.', '%', 's ', 'm ', 'N ', 'V ', 'A ')):
                    cur_q = qn
                    by_q.setdefault(cur_q, [])
        if cur_q is not None:
            # Trim long prose guidance tails starting with common examiner notes if line is huge
            if len(line) > 130:
                line = line[:127].rsplit(' ', 1)[0] + '…'
            by_q[cur_q].append(line)
    return {q: clean_ms_lines(lines[:14]) for q, lines in by_q.items()}


def map_9702_sim(topic, qtype, text):
    s = (text or '').lower()
    if any(k in s for k in ('potential divider', 'potentiometer', 'thermistor', 'light-dependent', 'ldr')):
        return 'p10-divider'
    if any(k in s for k in ('internal resistance', 'e.m.f.', 'e.m.f ', 'electromotive force', 'terminal potential difference', 'terminal p.d')):
        return 'p10-emf'
    if any(k in s for k in ('resistivity', 'drift velocity', 'number density', 'charge carriers')):
        return 'p9-current'
    if any(k in s for k in ('kirchhoff', 'resistor', 'ohmic', 'voltmeter', 'ammeter', 'filament lamp', 'i–v', 'i-v')):
        if any(k in s for k in ('diode', 'filament lamp', 'metallic conductor', 'i–v', 'characteristic')):
            return 'p9-iv'
        return 'p10-builder'
    if any(k in s for k in ('moment', 'torque', 'couple', 'pivot', 'hinge')):
        return 'p4-moments'
    if any(k in s for k in ('young modulus', 'hooke', 'spring constant', 'tensile stress', 'tensile strain', 'elastic potential')):
        return 'p6-deformation'
    if any(k in s for k in ('pressure', 'upthrust', 'archimedes', 'hydrostatic')):
        return 'p4-pressure'
    if any(k in s for k in ('projectile', 'projected', 'horizontal range', 'angle of projection', 'trajectory')):
        return 'p2-projectile'
    if any(k in s for k in ('momentum', 'collision', 'coalesce', 'impulse')):
        return 'p3-momentum'
    if any(k in s for k in ('diffraction grating', 'd sin')):
        return 'p8-grating'
    if any(k in s for k in ('double-slit', 'double slit', 'fringes', 'interference', 'two-source', 'coherent')):
        return 'p8-interference'
    if any(k in s for k in ('stationary wave', 'standing wave', 'antinode')):
        return 'p8-stationary'
    if any(k in s for k in ('doppler', 'observed frequency', 'receding', 'approaching', 'redshift')):
        return 'p7-doppler'
    if any(k in s for k in ('polarisation', 'polarised', 'malus', 'electromagnetic spectrum', 'polaroid')):
        return 'p7-em-polarisation'
    if any(k in s for k in ('cathode-ray oscilloscope', 'c.r.o', 'time-base', 'y-gain')):
        return 'p7-cro'
    if any(k in s for k in ('progressive wave', 'wavelength', 'phase difference', 'amplitude', 'frequency')):
        return 'p7-waves'
    if any(k in s for k in ('percentage uncertainty', 'absolute uncertainty', 'si base', 'base quantity', 'base unit')):
        return 'p1-uncertainty'
    if any(k in s for k in ('kinetic energy', 'potential energy', 'efficiency', 'work done', 'gravitational potential')):
        return 'p5-energy'
    if '9702-23' in (topic or '') or any(k in s for k in ('half-life', 'radioactive', 'binding energy', 'nucleon', 'alpha-particle', 'beta-')):
        return 'p11-nuclear'
    if qtype in ('9702-shm', '9702-damping'):
        return 'p7-waves'
    if qtype == '9702-capacitors':
        return 'p10-builder'
    return None


def sim_of_9709(q):
    if q.get('sim'):
        return q['sim']
    qt = q.get('qtype', '')
    if qt in ('9709-force-motion',):
        return 'm1m4-plane'
    return None


def extract_9702_p2_pdfs():
    """Use macOS Swift PDFKit to extract text of 2020-2026 9702 Paper 2 QPs and MSs."""
    qp_files = []
    for yr in range(2020, 2027):
        qp_files.extend(sorted(glob.glob(os.path.join(ROOT, 'data', 'papers', '9702', str(yr), '*', '*_qp_2*.pdf'))))
    if not qp_files:
        return []
    pairs = []
    for qpf in qp_files:
        msf = qpf.replace('_qp_', '_ms_')
        if os.path.exists(msf):
            pairs.append((qpf, msf))
    swift_code = r'''
import Foundation
import PDFKit
let args = Array(CommandLine.arguments.dropFirst())
var results: [[String: String]] = []
var i = 0
while i + 1 < args.count {
    let qpPath = args[i]
    let msPath = args[i + 1]
    i += 2
    func dumpPdf(_ path: String, _ skipFirst: Int) -> String {
        guard let doc = PDFDocument(url: URL(fileURLWithPath: path)) else { return "" }
        var out = ""
        for p in skipFirst..<doc.pageCount {
            if let s = doc.page(at: p)?.string {
                out += "\n" + s
            }
        }
        return out
    }
    results.append([
        "id": URL(fileURLWithPath: qpPath).deletingPathExtension().lastPathComponent,
        "qp": dumpPdf(qpPath, 2),
        "ms": dumpPdf(msPath, 4)
    ])
}
let data = try JSONSerialization.data(withJSONObject: results, options: [])
print(String(data: data, encoding: .utf8) ?? "[]")
'''
    flat_args = []
    for qpf, msf in pairs:
        flat_args.extend([qpf, msf])
    try:
        proc = subprocess.run(['/usr/bin/swift', '-', *flat_args], input=swift_code, text=True, capture_output=True, timeout=90)
        if proc.returncode != 0:
            print('Swift PDFKit warning:', proc.stderr[:300], file=sys.stderr)
            return []
        raw = proc.stdout.strip()
        start = raw.find('[')
        if start < 0:
            return []
        return json.loads(raw[start:])
    except Exception as exc:
        print('P2 extraction skipped:', exc, file=sys.stderr)
        return []


def split_p2_questions(paper_id, qp_raw, ms_raw):
    """Split a 9702 Paper 2 text dump into question entries with MS answers."""
    m_id = re.match(r'9702_([msw])(\d{2})_qp_(\d{2})', paper_id)
    if not m_id:
        return []
    sess = SESS_MAP.get(m_id.group(1), 'M/J')
    yy = m_id.group(2)
    comp = m_id.group(3)
    paper_ref = f'9702/{comp} {sess} {yy}'

    # Clean noise lines
    cleaned_lines = []
    for raw_ln in qp_raw.splitlines():
        ln = clean_pua(raw_ln)
        if not ln:
            continue
        if re.search(r'(DO NOT WRITE IN THIS MARGIN|\* \d{6,}|© UCLES|© Cambridge|Trace ID:|Re-uploading,|mirroring or re-hosting|Licensed for hosting|PapaCambridge|Downloaded from|Cambridge Assessment|Turn over|BLANK PAGE|9702/\d{2}/[A-Z]/[A-Z]/\d{2}|^\d{1,2}$)', ln):
            continue
        if re.match(r'^\.{4,}', ln):
            continue
        cleaned_lines.append(ln)
    body = '\n'.join(cleaned_lines)

    # Split at top-level questions: line starting with 1..9 + space + capital/Fig/(a)
    q_starts = list(re.finditer(r'(?m)^([1-9])\s+(?=(?:\(a\)|A |An |The |Two |Three |State |Define |Explain |Calculate |Show |Fig\.|In |On ))', body))
    if not q_starts:
        return []

    ms_by_q = parse_ms_by_question(ms_raw)
    out = []
    for idx, m in enumerate(q_starts):
        qn = int(m.group(1))
        end = q_starts[idx + 1].start() if idx + 1 < len(q_starts) else len(body)
        chunk = body[m.end():end].strip()
        # Strip answer dotted blanks like "...... W m-2 [3]" -> "[3]" and inline PDF footer artifacts
        chunk = re.sub(r'[a-zA-Z\s]*\.{4,}[^\n\[]*(\[\d+\])?', r' \1 ', chunk)
        chunk = re.sub(r'(?:Licensed for hosting|PapaCambridge|Downloaded from|Trace ID:\s*[A-Za-z0-9-]+).*', '', chunk)
        chunk = re.sub(r'\b(?:DFD|E[0-9A-F]{4,})\b', '', chunk)
        chunk = re.sub(r'\s+', ' ', chunk).strip()
        if len(chunk) < 40:
            continue
        marks_list = [int(x) for x in re.findall(r'\[(\d+)\]', chunk)]
        marks = sum(marks_list) if marks_list else 8
        # Cut excessively long question text cleanly
        disp = chunk[:520].rsplit(' ', 1)[0] + '…' if len(chunk) > 520 else chunk
        sim = map_9702_sim('9702-AS', None, chunk)
        # Classify AS topic
        topic = '9702-AS'
        if sim and sim.startswith('p10'):
            topic = '9702-10'
        elif sim and sim.startswith('p9'):
            topic = '9702-9'
        elif sim and sim.startswith('p8'):
            topic = '9702-8'
        elif sim and sim.startswith('p7'):
            topic = '9702-7'
        elif sim and sim.startswith('p6'):
            topic = '9702-6'
        elif sim and sim.startswith('p5'):
            topic = '9702-5'
        elif sim and sim.startswith('p4'):
            topic = '9702-4'
        elif sim and sim.startswith('p2'):
            topic = '9702-2'
        elif sim and sim.startswith('p3'):
            topic = '9702-3'
        elif sim and sim.startswith('p11'):
            topic = '9702-11'
        elif sim and sim.startswith('p1'):
            topic = '9702-1'

        out.append({
            'r': f'{paper_ref} Q{qn}',
            's': '9702',
            'p': 'P2',
            'tp': topic,
            'qt': topic,
            'sim': sim,
            'm': marks,
            't': disp,
            'ms': ms_by_q.get(qn, '')
        })
    return out


def main():
    p9709 = json.load(open(os.path.join(ROOT, 'data', 'questions', '9709_p4.json'), encoding='utf-8'))
    p9702 = json.load(open(os.path.join(ROOT, 'data', 'questions', '9702_p4.json'), encoding='utf-8'))

    papers = {'9709': p9709, '9702': p9702}
    outputs.init_respacer(papers, MS_DIR)

    # Parse metadata from paper_id like 9709_s24_qp_42
    def fmt_ref(pa, qn):
        m = re.match(r'(\d{4})_([msw])(\d{2})_qp_(\d{2})', pa['paper_id'])
        if not m:
            return pa['paper_id'] + f' Q{qn}'
        return f"{m.group(1)}/{m.group(4)} {SESS_MAP.get(m.group(2), 'M/J')} {m.group(3)} Q{qn}"

    ms_cache = {}

    def get_ms_map(paper_id):
        if paper_id not in ms_cache:
            ms_id = paper_id.replace('_qp_', '_ms_') + '.txt'
            ms_path = os.path.join(MS_DIR, ms_id)
            if os.path.exists(ms_path):
                ms_cache[paper_id] = parse_ms_by_question(open(ms_path, encoding='utf-8').read())
            else:
                ms_cache[paper_id] = {}
        return ms_cache[paper_id]

    bank = []

    # 1. 9709 Paper 4 (Mechanics)
    for pa in p9709:
        ms_map = get_ms_map(pa['paper_id'])
        for q in pa['questions']:
            bits = [q.get('stem', '')]
            for pt in q.get('parts', []):
                bits.extend([pt.get('intro', ''), pt.get('preamble', ''), pt.get('text', '')])
            raw = ' '.join(b for b in bits if b)
            clean_txt = outputs.strip_diagram(outputs.display(pa, raw))
            clean_txt = clean_pua(clean_txt)
            if len(clean_txt) > 520:
                clean_txt = clean_txt[:517].rsplit(' ', 1)[0] + '…'
            bank.append({
                'r': fmt_ref(pa, q['q']),
                's': '9709',
                'p': 'P4',
                'tp': q.get('primary_tag', '9709-M1'),
                'qt': q.get('qtype', ''),
                'sim': sim_of_9709(q),
                'm': q.get('marks') or 0,
                't': clean_txt,
                'ms': ms_map.get(q['q'], '')
            })

    # 2. 9702 Paper 2 (AS Physics: Circuits, Moments, Projectiles, Waves, Deformation, Nuclear)
    p2_raw = extract_9702_p2_pdfs()
    p2_count = 0
    for item in p2_raw:
        qs = split_p2_questions(item['id'], item['qp'], item['ms'])
        bank.extend(qs)
        p2_count += len(qs)

    # 3. 9702 Paper 4 (A2 Physics)
    for pa in p9702:
        ms_map = get_ms_map(pa['paper_id'])
        for q in pa['questions']:
            bits = [q.get('stem', '')]
            for pt in q.get('parts', []):
                bits.extend([pt.get('intro', ''), pt.get('preamble', ''), pt.get('text', '')])
            raw = ' '.join(b for b in bits if b)
            clean_txt = outputs.strip_diagram(outputs.display(pa, raw))
            clean_txt = clean_pua(clean_txt)
            if len(clean_txt) > 420:
                clean_txt = clean_txt[:417].rsplit(' ', 1)[0] + '…'
            sim = map_9702_sim(q.get('primary_tag', ''), q.get('qtype', ''), clean_txt)
            bank.append({
                'r': fmt_ref(pa, q['q']),
                's': '9702',
                'p': 'P4',
                'tp': q.get('primary_tag', '9702-12'),
                'qt': q.get('qtype', ''),
                'sim': sim,
                'm': q.get('marks') or 0,
                't': clean_txt,
                'ms': ms_map.get(q['q'], '')
            })

    # Sort newest first: extract year and session from ref
    sess_rank = {'O/N': 3, 'M/J': 2, 'F/M': 1}

    def sort_key(entry):
        m = re.search(r'(\d{4})/\d{2}\s+(O/N|M/J|F/M)\s+(\d{2})\s+Q(\d+)', entry['r'])
        if not m:
            return (0, 0, 0, entry['r'])
        return (-int(m.group(3)), -sess_rank.get(m.group(2), 0), int(m.group(1)), int(m.group(4)))

    bank.sort(key=sort_key)

    header = (
        '// Generated by tools/build_solver_db.py from local 9709 P4, 9702 P2 & 9702 P4 past papers & mark schemes.\n'
        '// Fields: r=paper ref, s=syllabus, p=paper, tp=topic, qt=qtype, sim=target sim id, m=marks, t=question text, ms=mark scheme lines\n'
        '(typeof window !== "undefined" ? window : globalThis).P4_BANK = '
    )
    js_body = header + json.dumps(bank, ensure_ascii=False, separators=(',', ':')) + ';\n' + \
        'if (typeof module !== "undefined" && module.exports) module.exports = (typeof window !== "undefined" ? window : globalThis).P4_BANK;\n'
    with open(OUT_JS, 'w', encoding='utf-8') as fh:
        fh.write(js_body)

    print(f'Wrote {OUT_JS}: {len(bank)} total questions ({p2_count} from 9702 P2), {(len(js_body)/1024):.1f} KB')


if __name__ == '__main__':
    main()
