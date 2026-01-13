#!/usr/bin/env python3
"""
fetch_gists.py

Fetch curated GitHub Gist metadata and write a local JSON asset at
`assets/gists.json` to avoid runtime API calls from the browser.

Usage:
  - Create a file named `curated_gists.txt` with one GIST ID per line, or
  - Pass GIST IDs on the command line:
      ./scripts/fetch_gists.py  id1 id2 id3

Optionally set `GITHUB_TOKEN` in the environment to increase rate limits.
The output file defaults to `assets/gists.json` but can be changed with
`--output`.

This script is intended to be run manually by the maintainer; commit and
push `assets/gists.json` into the site when ready.
"""
import sys
import os
import json
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


DEFAULT_OUTPUT = os.path.join('assets', 'gists.json')


def read_ids_from_file(path='curated_gists.txt'):
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8') as fh:
        lines = [ln.strip() for ln in fh if ln.strip() and not ln.startswith('#')]
    return lines


def fetch_gist(id_, token=None):
    url = f'https://api.github.com/gists/{id_}'
    headers = {'User-Agent': 'fetch_gists.py'}
    if token:
        headers['Authorization'] = f'token {token}'
    req = Request(url, headers=headers)
    try:
        with urlopen(req, timeout=15) as res:
            data = res.read().decode('utf-8')
            return json.loads(data)
    except HTTPError as e:
        print(f'HTTP error for {id_}: {e.code} {e.reason}', file=sys.stderr)
    except URLError as e:
        print(f'URL error for {id_}: {e.reason}', file=sys.stderr)
    except Exception as e:
        print(f'Unexpected error for {id_}: {e}', file=sys.stderr)
    return None


def prune_gist(gist):
    # Keep a small subset useful for rendering: id, html_url, description, files (filename -> meta)
    out = {
        'id': gist.get('id'),
        'html_url': gist.get('html_url'),
        'description': gist.get('description') or '',
        'files': {}
    }
    files = gist.get('files', {})
    for fname, meta in files.items():
        out['files'][fname] = {
            'raw_url': meta.get('raw_url'),
            'type': meta.get('type'),
            'language': meta.get('language')
        }
    return out


def main(argv):
    token = os.environ.get('GITHUB_TOKEN')
    outpath = DEFAULT_OUTPUT
    ids = []

    # simple args parsing
    args = [a for a in argv[1:] if not a.startswith('--')]
    if '--output' in argv:
        try:
            idx = argv.index('--output')
            outpath = argv[idx + 1]
        except Exception:
            print('Usage: --output <path>', file=sys.stderr)
            return 2

    if args:
        ids = args
    else:
        ids = read_ids_from_file()

    if not ids:
        print('No gist IDs provided (pass IDs on the command line or create curated_gists.txt).')
        return 1

    results = []
    for i, gid in enumerate(ids, start=1):
        print(f'[{i}/{len(ids)}] Fetching {gid}...')
        gist = fetch_gist(gid, token=token)
        if gist:
            results.append(prune_gist(gist))
        else:
            print(f'Failed to fetch gist {gid}', file=sys.stderr)
        # be polite to the API
        time.sleep(0.2)

    # ensure output directory exists
    odir = os.path.dirname(outpath)
    if odir and not os.path.exists(odir):
        os.makedirs(odir, exist_ok=True)

    with open(outpath, 'w', encoding='utf-8') as fh:
        json.dump(results, fh, indent=2, ensure_ascii=False)

    print(f'Wrote {len(results)} gists to {outpath}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
