"""
Builds the self-hosted font files in src/assets/fonts from the
@fontsource-variable packages (devDependencies). Requires: pip install fonttools brotli

- Anybody (wdth 50–150, wght) keeps both axes: it is the structural voice.
- "Anybody Hero" is a static wdth=50 wght=800 cut used by the hero words AND the
  WebGL reflection atlas, so DOM glyphs and reflected glyphs are identical.
- Newsreader is pinned to one optical size per style to drop the opsz axis.
Everything is subset to Latin + Turkish.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "node_modules/@fontsource-variable"
OUT = ROOT / "src/assets/fonts"
OUT.mkdir(parents=True, exist_ok=True)

LATIN = "U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-2033,U+2039-203A,U+2190-2193,U+20BA,U+2212,U+00B7,U+02D8,U+0131"
TURKISH = "U+011E-011F,U+0130-0131,U+015E-015F"


def build(src: Path, dst: str, unicodes: str, limits: dict | None = None):
    font = TTFont(src)
    if limits:
        font = instancer.instantiateVariableFont(font, limits)
    opts = subset.Options()
    opts.layout_features = ["kern", "liga", "tnum", "lnum", "case", "ccmp", "locl", "mark", "mkmk"]
    opts.flavor = "woff2"
    opts.name_IDs = ["*"]
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(unicodes))
    sub.subset(font)
    font.flavor = "woff2"
    font.save(OUT / dst)
    print(dst, (OUT / dst).stat().st_size)


for part, ranges in (("latin", LATIN), ("latin-ext", TURKISH)):
    any_src = SRC / f"anybody/files/anybody-{part}-wdth-normal.woff2"
    build(any_src, f"anybody-{part}.woff2", ranges)
    build(any_src, f"anybody-hero-{part}.woff2", ranges, {"wdth": 50, "wght": 800})
    nr = SRC / f"newsreader/files/newsreader-{part}-opsz-italic.woff2"
    build(nr, f"newsreader-italic-{part}.woff2", ranges, {"opsz": 60, "wght": (250, 500)})
    nr = SRC / f"newsreader/files/newsreader-{part}-opsz-normal.woff2"
    build(nr, f"newsreader-{part}.woff2", ranges, {"opsz": 16, "wght": (350, 500)})
