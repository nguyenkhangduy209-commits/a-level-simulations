import sys, os, glob, pdfplumber
root, out = sys.argv[1], sys.argv[2]
for f in sorted(glob.glob(root+'/**/*_qp_4*.pdf', recursive=True)):
    o = os.path.join(out, os.path.basename(f)[:-4]+'.txt')
    try:
        with pdfplumber.open(f) as pdf:
            open(o,'w').write("\n\f\n".join((p.extract_text() or '') for p in pdf.pages))
    except Exception as e: print('FAIL', f, e)
