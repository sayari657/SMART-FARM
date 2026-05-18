import os, re, sys

CYCLE = "C:/Users/Mohamed/Desktop/FARM AI/rapport/cycle"

def read_file(path):
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        return f.read()

def get_lines(path):
    return read_file(path).splitlines()

issues = []

def err(sev, f, ln, msg):
    issues.append((sev, f, ln, msg))

# Collect all tex/bib files
tex_files = {}
for root, dirs, files in os.walk(CYCLE):
    for f in files:
        if f.endswith('.tex') or f.endswith('.bib'):
            rel = os.path.relpath(os.path.join(root, f), CYCLE).replace('\\','/')
            tex_files[rel] = os.path.join(root, f)

print(f"Auditing {len(tex_files)} files...\n")

# ── 1. UNSAFE UNICODE ──────────────────────────────────────────
SAFE_HIGH = set(range(0x00C0, 0x0180))
SAFE_HIGH |= {0x2013,0x2014,0x2018,0x2019,0x201C,0x201D,0x2022,0x2026,0x2020,0x2021,
              0x0153,0x0152,0x00E6,0x00C6,0x00F8,0x00D8,0x00E5,0x00C5,
              0x20AC,0x00A9,0x00AE,0x00B0,0x00B1,0x00D7,0x00F7,0x00A0,
              0x0300,0x0301,0x00AD}

for rel, path in tex_files.items():
    if rel.endswith('.bib'):
        continue
    ls = get_lines(path)
    in_verb = False
    for i, line in enumerate(ls, 1):
        if r'\begin{lstlisting}' in line or r'\begin{verbatim}' in line:
            in_verb = True
        if r'\end{lstlisting}' in line or r'\end{verbatim}' in line:
            in_verb = False
            continue
        if in_verb or line.strip().startswith('%'):
            continue
        for ch in line:
            cp = ord(ch)
            if cp > 0x017F and cp not in SAFE_HIGH:
                err('CRITICAL', rel, i, 'Unsafe Unicode U+%04X %s: %s' % (cp, repr(ch), line.strip()[:60]))
                break

# ── 2. STRUCTURAL COMMANDS IN CHILD FILES ─────────────────────
BAD_IN_CHILD = [
    (r'\\begin\{document\}',   'begin{document} in child'),
    (r'\\end\{document\}',     'end{document} in child'),
    (r'\\pagenumbering\{',     'pagenumbering{} in child'),
    (r'\\setcounter\{page\}',  'setcounter{page} in child'),
    (r'\\tableofcontents\b',   'tableofcontents in child'),
    (r'\\listoffigures\b',     'listoffigures in child'),
    (r'\\listoftables\b',      'listoftables in child'),
    (r'\\printbibliography\b', 'printbibliography in child'),
    (r'\\appendix\b',          'appendix command in child'),
]
for rel in [r for r in tex_files if r != 'main.tex' and r.endswith('.tex')]:
    ls = get_lines(tex_files[rel])
    for i, line in enumerate(ls, 1):
        if line.strip().startswith('%'):
            continue
        for pat, msg in BAD_IN_CHILD:
            if re.search(pat, line):
                err('CRITICAL', rel, i, msg + ': ' + line.strip()[:50])

# ── 3. BRACKET AFTER LINEBREAK ────────────────────────────────
for rel, path in tex_files.items():
    if rel.endswith('.bib'):
        continue
    ls = get_lines(path)
    for i in range(len(ls)-1):
        line = ls[i].rstrip()
        if line.strip().startswith('%'):
            continue
        if line.endswith('\\\\'):
            nxt = ls[i+1].lstrip() if i+1 < len(ls) else ''
            if nxt.startswith('[') and not re.match(r'^\[[\d.]+\s*(cm|mm|pt|em|ex|in|pc|bp)\]', nxt):
                err('CRITICAL', rel, i+2, 'Bracket [ after \\\\ parsed as spacing arg: ' + nxt[:40])

# ── 4. ENVIRONMENT BALANCE ────────────────────────────────────
ENV_RE = re.compile(r'\\(begin|end)\{(\w+[\*]?)\}')
for rel, path in tex_files.items():
    if rel.endswith('.bib'):
        continue
    stack = []
    ls = get_lines(path)
    for i, line in enumerate(ls, 1):
        if line.strip().startswith('%'):
            continue
        for m in ENV_RE.finditer(line):
            cmd, env = m.group(1), m.group(2)
            if cmd == 'begin':
                stack.append((env, i))
            else:
                if stack and stack[-1][0] == env:
                    stack.pop()
                elif stack:
                    err('CRITICAL', rel, i, 'Mismatched \\end{%s} (expected \\end{%s})' % (env, stack[-1][0]))
                else:
                    err('CRITICAL', rel, i, 'Unmatched \\end{%s} with empty stack' % env)
    for env, start_line in stack:
        err('CRITICAL', rel, start_line, 'Unclosed \\begin{%s}' % env)

# ── 5. CITE KEY CHECK ─────────────────────────────────────────
bib_path = tex_files.get('references.bib', '')
bib_keys = set()
if bib_path:
    bib_content = read_file(bib_path)
    for m in re.finditer(r'@\w+\{(\w+),', bib_content):
        bib_keys.add(m.group(1))

cite_map = {}
for rel, path in tex_files.items():
    if rel.endswith('.bib'):
        continue
    content = read_file(path)
    for m in re.finditer(r'\\cite\{([^}]+)\}', content):
        for key in m.group(1).split(','):
            key = key.strip()
            if key:
                cite_map[key] = rel

for key, rel in cite_map.items():
    if key not in bib_keys:
        err('CRITICAL', rel, 0, '\\cite{%s} not in references.bib' % key)

# ── 6. GANTTTITLELIST CHECK ───────────────────────────────────
for rel, path in tex_files.items():
    if rel.endswith('.bib'):
        continue
    ls = get_lines(path)
    for i, line in enumerate(ls, 1):
        if r'\gantttitlelist' in line and not line.strip().startswith('%'):
            err('CRITICAL', rel, i, 'gantttitlelist with string args (use individual gantttitle): ' + line.strip()[:50])

# ── 7. TIKZ NODE DOUBLE BACKSLASH WITHOUT ALIGN ───────────────
for rel, path in tex_files.items():
    if rel.endswith('.bib'):
        continue
    content = read_file(path)
    pattern = re.compile(r'\\node\[([^\]]*)\][^{]*\{([^}]*)\}', re.DOTALL)
    for m in pattern.finditer(content):
        style_str = m.group(1)
        node_text = m.group(2)
        if '\\\\' in node_text and 'align' not in style_str and 'text width' not in style_str:
            ln = content[:m.start()].count('\n') + 1
            err('WARNING', rel, ln, 'node with \\\\ but no align/text width: ' + node_text[:40])

# ── 8. DUPLICATE LABELS ───────────────────────────────────────
all_labels = {}
for rel, path in tex_files.items():
    if rel.endswith('.bib'):
        continue
    ls = get_lines(path)
    for i, line in enumerate(ls, 1):
        for m in re.finditer(r'\\label\{([^}]+)\}', line):
            lbl = m.group(1)
            if lbl in all_labels:
                err('WARNING', rel, i, 'Duplicate label {%s} (first in %s)' % (lbl, all_labels[lbl]))
            else:
                all_labels[lbl] = rel

# ── 9. INCLUDE PATH CHECK ─────────────────────────────────────
ls_main = get_lines(tex_files['main.tex'])
for i, line in enumerate(ls_main, 1):
    m = re.search(r'\\include\{([^}]+)\}', line)
    if m:
        inc = m.group(1) + '.tex'
        full = os.path.join(CYCLE, inc.replace('/', os.sep))
        if not os.path.exists(full):
            err('CRITICAL', 'main.tex', i, 'include file not found: ' + inc)

# ── 10. BIB BRACE BALANCE ─────────────────────────────────────
if bib_path:
    bib_content = read_file(bib_path)
    entries = re.split(r'(?=@\w+\{)', bib_content)
    for entry in entries:
        if not entry.strip().startswith('@'):
            continue
        m = re.match(r'@\w+\{(\w+),', entry)
        key = m.group(1) if m else '?'
        depth = sum(1 if c=='{' else (-1 if c=='}' else 0) for c in entry)
        if depth != 0:
            err('CRITICAL', 'references.bib', 0, 'Unbalanced braces in @{%s} (depth=%d)' % (key, depth))

# ── 11. MATRIX PLOT WITHOUT DIMENSIONS ────────────────────────
for rel, path in tex_files.items():
    if rel.endswith('.bib'):
        continue
    content = read_file(path)
    for m in re.finditer(r'\\addplot\[([^\]]*matrix plot[^\]]*)\]', content):
        opts = m.group(1)
        if 'matrix input' not in opts or 'mesh/rows' not in opts:
            ln = content[:m.start()].count('\n') + 1
            err('WARNING', rel, ln, 'matrix plot* without matrix input/mesh dims: ' + opts[:60])

# ── 12. NEWCOUNTER INSIDE FIGURE ──────────────────────────────
for rel, path in tex_files.items():
    if rel.endswith('.bib') or rel == 'main.tex':
        continue
    ls = get_lines(path)
    for i, line in enumerate(ls, 1):
        if r'\newcounter{' in line and not line.strip().startswith('%'):
            err('WARNING', rel, i, 'newcounter inside child file (should be in preamble): ' + line.strip())

# ── 13. DOUBLE-DOLLAR ─────────────────────────────────────────
for rel, path in tex_files.items():
    if rel.endswith('.bib'):
        continue
    ls = get_lines(path)
    in_verb = False
    for i, line in enumerate(ls, 1):
        if r'\begin{lstlisting}' in line or r'\begin{verbatim}' in line:
            in_verb = True
        if r'\end{lstlisting}' in line or r'\end{verbatim}' in line:
            in_verb = False; continue
        if in_verb or line.strip().startswith('%'):
            continue
        if '$$' in line:
            err('WARNING', rel, i, 'Use \\[...\\] instead of $$: ' + line.strip()[:50])

# ── REPORT ────────────────────────────────────────────────────
print('='*62)
critical = [x for x in issues if x[0]=='CRITICAL']
warnings = [x for x in issues if x[0]=='WARNING']
print('CRITICAL: %d    WARNING: %d' % (len(critical), len(warnings)))
print('='*62)

if critical:
    print('\n-- CRITICAL --')
    for sev, f, ln, msg in critical:
        print('  [%s:%s] %s' % (f, ln, msg))

if warnings:
    print('\n-- WARNINGS --')
    for sev, f, ln, msg in warnings:
        print('  [%s:%s] %s' % (f, ln, msg))

if not issues:
    print('\nAll checks passed. Project is clean.')
else:
    print('\nTotal: %d issues' % len(issues))
