"""Extract raw page text of every Paper 4 mark scheme (*_ms_4*.pdf).

Usage: <venv-python> -I tools/papers/extract_ms.py <papers_root> <outdir>
Pages are separated by "\\n\\f\\n" (same convention as extract.py).
Needs pdfplumber; the rest of the pipeline is stdlib only.
"""
import sys, os, glob
import pdfplumber

root, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for f in sorted(glob.glob(root + '/**/*_ms_4*.pdf', recursive=True)):
    with open(f, 'rb') as fh:
        if fh.read(5) != b'%PDF-':
            print('SKIP (not a PDF)', f)
            continue
    o = os.path.join(out, os.path.basename(f)[:-4] + '.txt')
    try:
        with pdfplumber.open(f) as pdf:
            with open(o, 'w') as w:
                w.write("\n\f\n".join((p.extract_text() or '') for p in pdf.pages))
    except Exception as e:
        print('FAIL', f, e)
