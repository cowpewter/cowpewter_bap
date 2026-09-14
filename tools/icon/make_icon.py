#!/usr/bin/env python3
# Regenerate: python3 tools/icon/make_icon.py  (writes icon.svg, icon.png 512px, icon-sheet.png preview)
"""Seed & Stock icon: an old, cracked sword planted in soil, a vine climbing
from the ground and wrapping the blade. 32x32 pixel art -> SVG + PNGs."""
import os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
N, PAD = 32, 2

PAL = {
    "bg": "#F3E9D2",
    # weathered blade: highlight -> shadow, plus rust and cracks
    "a": "#E0E4E2", "s": "#BEC5C3", "S": "#959D9B", "X": "#68706F",
    "r": "#A8653B", "R": "#7A4526", "k": "#6E7675",
    # tarnished guard / pommel, with patina
    "g": "#C49A45", "o": "#8A672B", "p": "#7E9E86",
    # worn grip
    "h": "#7A5234", "H": "#4F331E",
    # moss
    "m": "#7C9A45", "M": "#58752F",
    # vine
    "v": "#3F7A2A", "L": "#9CCB55", "G": "#5E9E35",
    # flower
    "f": "#F6A5B4", "c": "#F9D55A",
    # ground
    "t": "#79B443", "T": "#5A9433", "d": "#8A5A3B", "D": "#6B4329", "e": "#A77A56",
}

grid = [[None] * N for _ in range(N)]


def px(x, y, c):
    if 0 <= x < N and 0 <= y < N:
        grid[y][x] = c


def hline(x0, x1, y, c):
    for x in range(x0, x1 + 1):
        px(x, y, c)


GRASS = 28  # top row of grass; blade runs down to here

# ---- ground ---------------------------------------------------------------
for y in range(GRASS, N):
    hline(0, 31, y, "d")
hline(0, 31, GRASS, "t")
hline(0, 31, GRASS + 1, "T")
for x, y in [(3, 30), (9, 31), (13, 30), (20, 31), (26, 30), (29, 31)]:
    px(x, y, "D")
for x, y in [(6, 31), (17, 30), (23, 31), (1, 30)]:
    px(x, y, "e")
for x in (1, 4, 8, 21, 25, 29):          # grass tufts
    px(x, GRASS - 1, "t")
px(2, GRASS - 2, "t")
px(28, GRASS - 2, "t")

# ---- sword ----------------------------------------------------------------
BLADE_TOP = 13
for y in range(BLADE_TOP, GRASS):
    px(14, y, "a"); px(15, y, "s"); px(16, y, "S"); px(17, y, "X")

# chipped edges: bites out of the blade
for x, y in [(17, 17), (14, 25)]:
    px(x, y, None)
px(16, 17, "X")                          # shadow inside the right-edge notch
px(15, 25, "a")                          # lit edge inside the left notch

# cracks
for x, y in [(14, 18), (15, 19), (15, 20)]:
    px(x, y, "k")

# rust, heavier toward the soil
for x, y in [(16, 15), (17, 25), (16, 26), (14, 27)]:
    px(x, y, "r")
for x, y in [(17, 27)]:
    px(x, y, "R")

# tarnished guard, one end cap broken off
hline(9, 22, 11, "g")
hline(9, 22, 12, "o")
px(8, 11, "o"); px(8, 12, "o")
px(22, 11, "o")                          # right end worn down
for x, y in [(11, 11), (19, 12), (21, 11)]:
    px(x, y, "p")                        # patina

# worn grip: bands slipped, leather darkened
for y in range(5, 11):
    px(15, y, "h"); px(16, y, "H")
px(15, 6, "H"); px(16, 6, "h")
px(16, 8, "h")
px(15, 9, "H")

# dented pommel
hline(14, 17, 3, "g")
hline(14, 17, 4, "g")
px(14, 4, "o"); px(17, 3, "o")
hline(15, 16, 2, "o")
px(16, 3, "p")
px(17, 4, None)                          # dent

# moss: on top of the guard, the pommel, and creeping up from the soil
for x, y, c in [
    (9, 10, "m"), (10, 10, "m"), (11, 10, "M"), (12, 10, "m"), (9, 11, "M"), (10, 11, "m"),
    (20, 10, "m"), (21, 10, "M"), (22, 12, "m"),
    (15, 2, "M"), (14, 3, "m"), (15, 3, "m"),
    (14, 26, "m"), (14, 24, "M"), (15, 27, "m"), (17, 26, "m"),
]:
    px(x, y, c)

# ---- vine -----------------------------------------------------------------
def vine(points):
    """2px vine: dark stem pixel, mid-green shading pixel beneath it."""
    for x, y in points:
        if y + 1 < N and grid[y + 1][x] != "v":
            px(x, y + 1, "G")
    for x, y in points:
        px(x, y, "v")


# rises from the soil left of the blade
vine([(10, 28), (10, 27), (11, 26), (11, 25), (12, 24), (13, 23)])
# front crossing #1 (over the blade, rising left -> right)
vine([(14, 23), (15, 22), (16, 22), (17, 21), (18, 21)])
# up the right side, then passes behind the blade
vine([(19, 20), (19, 19), (19, 18), (18, 17)])
# re-emerges on the left
vine([(13, 16), (12, 15), (12, 14)])
# front crossing #2, just under the guard
vine([(13, 14), (14, 14), (15, 13), (16, 13), (17, 12)])
# climbs over the guard and curls up beside the grip
vine([(18, 12), (19, 11), (19, 10), (20, 9), (20, 8), (21, 7)])


def leaf(ax, ay, side):
    """Leaf growing off stem point (ax, ay); side -1 = left, +1 = right."""
    shape = [
        (-4, -2, "L"), (-3, -2, "L"),
        (-5, -1, "L"), (-4, -1, "L"), (-3, -1, "L"), (-2, -1, "G"),
        (-4, 0, "G"), (-3, 0, "G"), (-2, 0, "G"), (-1, 0, "v"),
    ]
    for dx, dy, c in shape:
        px(ax - dx if side > 0 else ax + dx, ay + dy, c)


leaf(11, 26, -1)   # low left
leaf(19, 19, +1)   # mid right
leaf(13, 20, -1)   # upper left, below the guard crossing
leaf(20, 9, +1)    # top right

# flower at the tip of the vine
for x, y in [(20, 6), (22, 6), (21, 5), (21, 7)]:
    px(x, y, "f")
px(21, 6, "c")


# ---- output ---------------------------------------------------------------
def svg():
    n = N + PAD * 2
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" shape-rendering="crispEdges">',
           f'<rect width="{n}" height="{n}" rx="5" fill="{PAL["bg"]}"/>']
    for y in range(N):
        for x in range(N):
            c = grid[y][x]
            if c:
                out.append(f'<rect x="{x + PAD}" y="{y + PAD}" width="1" height="1" fill="{PAL[c]}"/>')
    out.append("</svg>")
    return "\n".join(out)


base = os.path.join(HERE, "icon")
open(base + ".svg", "w").write(svg())
subprocess.run(["rsvg-convert", "-w", "512", "-h", "512", base + ".svg", "-o", base + ".png"], check=True)

sheet = ['<svg xmlns="http://www.w3.org/2000/svg" width="720" height="420">',
         '<rect width="720" height="420" fill="#ffffff"/>',
         '<image href="icon.svg" x="16" y="16" width="384" height="384"/>',
         '<image href="icon.svg" x="430" y="16" width="192" height="192"/>',
         '<image href="icon.svg" x="430" y="240" width="96" height="96"/>',
         '<image href="icon.svg" x="546" y="264" width="48" height="48"/>',
         '<rect x="430" y="352" width="270" height="56" fill="#1e1f22"/>',
         '<image href="icon.svg" x="440" y="360" width="40" height="40"/>',
         '</svg>']
open(os.path.join(HERE, "icon-sheet.svg"), "w").write("\n".join(sheet))
subprocess.run(["rsvg-convert", os.path.join(HERE, "icon-sheet.svg"), "-o",
                os.path.join(HERE, "icon-sheet.png")], check=True)
print("wrote", base + ".png")
