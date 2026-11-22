"""Make the site's logo files from the source drawing (black on white).

    python tools/make-logo.py path/to/Mu.png

Writes into media/: mu-logo.png (ink on a clear ground), mu-logo-on-dark.png (paper on a clear ground) and
mu-icon.png (the browser-tab icon: paper on an ink square). The darkness of the source becomes opacity, so the
letters keep their smooth edges on any ground. Needs Pillow.
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

INK, PAPER = (29, 26, 22), (243, 239, 231)  # the site's --ink and --paper
MEDIA = Path(__file__).resolve().parent.parent / "media"

darkness = ImageChops.invert(Image.open(sys.argv[1]).convert("L"))
darkness = darkness.crop(darkness.point(lambda v: 255 if v > 24 else 0).getbbox())  # without the white margin


def tinted(colour):
    image = Image.new("RGBA", darkness.size, colour + (0,))
    image.putalpha(darkness)
    return image


tinted(INK).save(MEDIA / "mu-logo.png", optimize=True)
tinted(PAPER).save(MEDIA / "mu-logo-on-dark.png", optimize=True)

side, fine = 512, 4  # drawn four times larger, then reduced, so the corners are smooth
square = Image.new("RGBA", (side * fine, side * fine), (0, 0, 0, 0))
ImageDraw.Draw(square).rounded_rectangle((0, 0, side * fine - 1, side * fine - 1), radius=112 * fine, fill=INK + (255,))
icon = square.resize((side, side), Image.LANCZOS)
mark = tinted(PAPER)
scale = 0.66 * side / max(mark.size)
mark = mark.resize((round(mark.width * scale), round(mark.height * scale)), Image.LANCZOS)
icon.alpha_composite(mark, ((side - mark.width) // 2, (side - mark.height) // 2))
icon.save(MEDIA / "mu-icon.png", optimize=True)
print("wrote mu-logo.png", darkness.size, "mu-logo-on-dark.png and mu-icon.png into", MEDIA)
