"""
Layout-aware extractor for the Swan 48-233 electrical drawings.

Unlike plain page.get_text() (which scrambles multi-column schematics),
this reads every word WITH its x/y coordinates, then reconstructs the
page spatially: grouped into rows by y, sorted left-to-right by x.
That keeps designators (-F05), part numbers, and cross-refs (/464.12H)
sitting where they belong on the drawing.

Usage:
  python extract_sheet.py find "NAVIGATION LIGHTS"   # locate sheet -> PDF page
  python extract_sheet.py page 11                    # dump one PDF page (0-based)
"""
import sys
import fitz

PDF = r"C:\Users\fergu\iCloudDrive\Documents\Fergus Jack\Swan 48 - 233\Manuals\PDF Drawings 48-233\06 Electrical\48-233 Electrical 2022-05-13.PDF"


def layout_text(page, y_tol=3.0):
    """Reconstruct page text in reading order using word coordinates."""
    words = page.get_text("words")  # (x0, y0, x1, y1, word, block, line, word_no)
    if not words:
        return ""
    words.sort(key=lambda w: (round(w[1] / y_tol), w[0]))
    rows, cur, cur_y = [], [], None
    for x0, y0, x1, y1, w, *_ in words:
        if cur_y is None or abs(y0 - cur_y) <= y_tol:
            cur.append((x0, w))
            cur_y = y0 if cur_y is None else cur_y
        else:
            rows.append(cur)
            cur, cur_y = [(x0, w)], y0
    if cur:
        rows.append(cur)
    return "\n".join(" ".join(w for _, w in sorted(r)) for r in rows)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "find"
    doc = fitz.open(PDF)
    if cmd == "find":
        needle = sys.argv[2].lower()
        for i, page in enumerate(doc):
            t = page.get_text().lower()
            if needle in t:
                print(f"PDF page {i} (0-based) contains '{sys.argv[2]}'")
    elif cmd == "page":
        i = int(sys.argv[2])
        print(f"===== PDF PAGE {i} (layout-aware) =====")
        print(layout_text(doc[i]))
    doc.close()


if __name__ == "__main__":
    main()
