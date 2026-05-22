#!/usr/bin/env python3
"""
Fix memoire_complet.tex for Overleaf free plan:
 1. Embed references.bib via filecontents* (solves BibTeX error)
 2. Add \iffast flag — \fasttrue uses placeholders (< 30s compile)
    \fastfalse uses full TikZ figures (local / Overleaf paid)
"""
import re, sys

SRC  = r'C:\Users\Mohamed\Desktop\FARM AI\rapport\cycle\memoire_complet.tex'
BIB  = r'C:\Users\Mohamed\Desktop\FARM AI\rapport\cycle\references.bib'
DST  = r'C:\Users\Mohamed\Desktop\FARM AI\rapport\cycle\memoire_overleaf.tex'

# ── Read inputs ───────────────────────────────────────────────
with open(SRC, 'r', encoding='utf-8') as f:
    content = f.read()

with open(BIB, 'r', encoding='utf-8') as f:
    bib = f.read()

# ── 1. Prepend filecontents* block ────────────────────────────
bib_block = (
    '% ============================================================\n'
    '%  Bibliographie intégrée — évite le besoin de téléverser\n'
    '%  references.bib séparément sur Overleaf\n'
    '% ============================================================\n'
    '\\begin{filecontents*}[overwrite]{references.bib}\n'
    + bib.strip() + '\n'
    '\\end{filecontents*}\n\n'
)
content = bib_block + content

# ── 2. Add \newif\iffast after \documentclass ─────────────────
DOCCLASS = '\\documentclass[12pt,a4paper,twoside]{report}'
FAST_BLOCK = (
    '\n\n'
    '% ── Mode compilation rapide (Overleaf gratuit) ─────────────\n'
    '% \\fasttrue  = placeholders colorés — compile en < 30 s (Overleaf free)\n'
    '% \\fastfalse = figures TikZ complètes — compilation locale ou Overleaf payant\n'
    '\\newif\\iffast\\fasttrue  % ← remplacer \\fasttrue par \\fastfalse pour la version finale'
)
content = content.replace(DOCCLASS, DOCCLASS + FAST_BLOCK, 1)

# ── 3. Wrap every figure containing tikzpicture / ganttchart ──

def wrap_figures(text):
    """
    Find every \\begin{figure}...\\end{figure} block that contains
    \\begin{tikzpicture} or \\begin{ganttchart}, extract the caption,
    and wrap the tikz environment with \\iffast...\\else...\\fi.
    """
    lines  = text.split('\n')
    result = []
    i = 0
    n = len(lines)

    while i < n:
        stripped = lines[i].strip()

        # Detect figure start (any placement option)
        if stripped.startswith('\\begin{figure}'):
            fig_start = i
            fig_body  = [lines[i]]
            j = i + 1

            # Collect lines until matching \end{figure}
            depth = 1
            while j < n:
                fig_body.append(lines[j])
                if lines[j].strip().startswith('\\begin{figure}'):
                    depth += 1
                elif lines[j].strip() == '\\end{figure}':
                    depth -= 1
                    if depth == 0:
                        break
                j += 1

            fig_text = '\n'.join(fig_body)
            has_tikz = ('\\begin{tikzpicture}' in fig_text or
                        '\\begin{ganttchart}'  in fig_text)

            if has_tikz:
                # Extract caption (first match, up to 150 chars, strip \label refs)
                cm = re.search(r'\\caption\{((?:[^{}]|\{[^{}]*\})+)\}', fig_text)
                if cm:
                    cap_raw = cm.group(1).strip()
                    # Limit length for placeholder argument
                    cap_short = cap_raw[:150]
                else:
                    cap_short = 'Figure — voir version locale'

                # Process fig_body line by line to wrap tikz env
                new_body = []
                k = 0
                fl = fig_body

                while k < len(fl):
                    ln = fl[k]
                    is_tikz  = '\\begin{tikzpicture}' in ln
                    is_gantt = '\\begin{ganttchart}' in ln

                    if is_tikz or is_gantt:
                        env = 'tikzpicture' if is_tikz else 'ganttchart'
                        end_env = f'\\end{{{env}}}'

                        # Insert \iffast placeholder
                        new_body.append('\\iffast')
                        new_body.append(f'  \\placeholder{{{cap_short}}}')
                        new_body.append('\\else')
                        new_body.append(ln)  # \begin{tikzpicture}[...]

                        # Copy until matching \end{env}
                        depth2 = 1
                        k += 1
                        while k < len(fl):
                            new_body.append(fl[k])
                            if f'\\begin{{{env}}}' in fl[k]:
                                depth2 += 1
                            elif end_env in fl[k]:
                                depth2 -= 1
                                if depth2 == 0:
                                    break
                            k += 1

                        new_body.append('\\fi')
                    else:
                        new_body.append(ln)

                    k += 1

                result.extend(new_body)
            else:
                result.extend(fig_body)

            i = j + 1  # continue after \end{figure}

        else:
            result.append(lines[i])
            i += 1

    return '\n'.join(result)


content = wrap_figures(content)

# ── 4. Write output ───────────────────────────────────────────
with open(DST, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

# ── 5. Report ─────────────────────────────────────────────────
orig_lines  = content.count('\n')
with open(SRC, encoding='utf-8') as f:
    src_lines = f.read().count('\n')

print(f"Source  : {src_lines:,} lines")
print(f"Output  : {orig_lines:,} lines ({DST})")

# Count wrapped figures
wrapped = content.count('\\iffast\n  \\placeholder{')
print(f"Figures wrapped with \\iffast : {wrapped}")
print(f"filecontents* bib block      : {'YES' if 'filecontents*' in content else 'NO'}")
print(f"\\newif\\iffast flag          : {'YES' if '\\newif\\iffast' in content else 'NO'}")
print("\nDone — upload memoire_overleaf.tex to Overleaf (single file, no other upload needed).")
print("To get full figures: change \\fasttrue → \\fastfalse (line ~12) for local compile.")
