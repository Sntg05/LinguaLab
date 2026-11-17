"""Writes a one-page PDF whose only content is an 8x8 grey image.

To a text extractor this is what a scanned page looks like: it opens, and it has
no text. Used by the document reader tests (S13). Usage:
    python3 scripts/fixtures/image-only-pdf.py <out.pdf>
"""
import sys
import zlib

width = height = 8
image = zlib.compress(b"".join(b"\x00" + bytes([128] * width) for _ in range(height)))
content = b"q 200 0 0 200 0 0 cm /Im1 Do Q"
objects = [
    b"<< /Type /Catalog /Pages 2 0 R >>",
    b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] "
    b"/Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>",
    b"<< /Type /XObject /Subtype /Image /Width 8 /Height 8 /ColorSpace /DeviceGray "
    b"/BitsPerComponent 8 /Filter /FlateDecode /Length %d >>\nstream\n" % len(image)
    + image
    + b"\nendstream",
    b"<< /Length %d >>\nstream\n" % len(content) + content + b"\nendstream",
]
out = b"%PDF-1.4\n"
offsets = []
for number, body in enumerate(objects, 1):
    offsets.append(len(out))
    out += b"%d 0 obj\n" % number + body + b"\nendobj\n"
xref = len(out)
out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
for offset in offsets:
    out += b"%010d 00000 n \n" % offset
out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objects) + 1, xref)
with open(sys.argv[1], "wb") as handle:
    handle.write(out)
