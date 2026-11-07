"""Optional font regeneration: requires fonttools and brotli."""
from pathlib import Path
from fontTools.ttLib import TTFont

assets = Path(__file__).resolve().parent.parent / 'dist' / 'assets' / 'fonts'
for source in assets.glob('*.ttf'):
    font = TTFont(source)
    font.flavor = 'woff2'
    font.save(source.with_suffix('.woff2'))
