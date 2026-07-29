#!/usr/bin/env python3
"""Pack a skool course into one JSON bundle the browser terminal can load.

Usage: python3 build-course-bundle.py code-skool
Writes run/<course>.json as {"root": name, "files": {path: text}}.
"""
import json, os, sys, pathlib

SRC = pathlib.Path('/Users/oberfelder/Projects/skool')
OUT = pathlib.Path(__file__).parent / 'run'

SKIP_DIRS = {'.git', '.venv', '__pycache__', '.pytest_cache', 'build', 'dist'}
SKIP_SUFFIX = {'.pyc', '.pyo', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.so'}
SKIP_NAMES = {'.DS_Store'}


def pack(course):
    root = SRC / course
    if not root.is_dir():
        sys.exit(f'no such course: {root}')
    files, skipped, total = {}, [], 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames
                       if d not in SKIP_DIRS and not d.endswith('.egg-info')]
        for name in filenames:
            if name in SKIP_NAMES or pathlib.Path(name).suffix.lower() in SKIP_SUFFIX:
                skipped.append(name)
                continue
            full = pathlib.Path(dirpath) / name
            rel = str(full.relative_to(root))
            try:
                files[rel] = full.read_text(encoding='utf-8')
                total += len(files[rel])
            except (UnicodeDecodeError, OSError):
                skipped.append(rel)

    OUT.mkdir(exist_ok=True)
    dest = OUT / f'{course}.json'
    dest.write_text(json.dumps({'root': course, 'files': files},
                               separators=(',', ':')), encoding='utf-8')
    print(f'{course}: {len(files)} files, {total/1024:.0f} KB text '
          f'-> {dest.name} ({dest.stat().st_size/1024:.0f} KB)')
    if skipped:
        print(f'  skipped {len(skipped)} binary/ignored: {", ".join(sorted(set(skipped))[:6])}')


if __name__ == '__main__':
    for c in (sys.argv[1:] or ['code-skool']):
        pack(c)
