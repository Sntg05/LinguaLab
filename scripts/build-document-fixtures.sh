#!/usr/bin/env bash
# Regenerates the document fixtures used by the document reader tests (S13).
# They are versioned so the tests run in CI without pandoc.
#
#   sample.docx      pandoc's .docx of source.md (deflate-compressed entries)
#   stored.docx      the same entries re-zipped without compression (method 0)
#   sample.pdf       pandoc + xelatex PDF of source.md (real, extractable text)
#   sample.pdf.txt   poppler's pdftotext of sample.pdf: the independent reference
#                    the pdf.js extraction is compared with
#   image-only.pdf   one page with only an image, like a scanned page
#
# Needs pandoc, zip, xelatex (DejaVu Serif), pdftotext and python3. Usage: bash scripts/build-document-fixtures.sh
set -euo pipefail
dir="packages/adapters/src/document/fixtures"
pandoc -f markdown-smart "$dir/source.md" -o "$dir/sample.docx"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
(cd "$work" && unzip -q "$OLDPWD/$dir/sample.docx" && zip -q -0 -X -r stored.docx .)
cp "$work/stored.docx" "$dir/stored.docx"
pandoc -f markdown-smart "$dir/source.md" --pdf-engine=xelatex -V mainfont="DejaVu Serif" -o "$dir/sample.pdf"
pdftotext "$dir/sample.pdf" "$dir/sample.pdf.txt"
python3 scripts/fixtures/image-only-pdf.py "$dir/image-only.pdf"
echo "fixtures written to $dir"
