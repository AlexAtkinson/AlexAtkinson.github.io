#!/usr/bin/env python3
"""
fetch_gists.py

Fetch curated GitHub Gist metadata and write a local JSON asset at
`assets/gists.json` to avoid runtime API calls from the browser.

Usage:
    - Create a file named `assets/misc/curated_gists.txt` with one GIST ID per line, or
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


def read_ids_from_file(path='assets/misc/curated_gists.txt'):
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

    # simple args parsing with support for -f/--force and --output
    force = False
    args = []
    i = 1
    while i < len(argv):
        a = argv[i]
        if a in ('-f', '--force'):
            force = True
            i += 1
            continue
        if a == '--output':
            try:
                outpath = argv[i + 1]
                i += 2
                continue
            except Exception:
                print('Usage: --output <path>', file=sys.stderr)
                return 2
        # ignore other flags
        if a.startswith('-'):
            i += 1
            continue
        args.append(a)
        i += 1

    if args:
        ids = args
    else:
        ids = read_ids_from_file()

    if not ids:
        print('No gist IDs provided (pass IDs on the command line or create curated_gists.txt).')
        return 1

    # If not forcing, avoid refetching existing gists already present in outpath
    existing_map = {}
    if os.path.exists(outpath):
        try:
            with open(outpath, 'r', encoding='utf-8') as fh:
                existing = json.load(fh)
            for g in existing:
                if isinstance(g, dict) and g.get('id'):
                    existing_map[g['id']] = g
        except Exception:
            existing_map = {}

    # Determine which IDs need fetching
    ids_to_fetch = []
    for gid in ids:
        if force or gid not in existing_map:
            ids_to_fetch.append(gid)

    if not ids_to_fetch:
        print('No new gists to fetch. Use -f/--force to re-fetch all.')
        return 0

    fetched_map = {}
    for i, gid in enumerate(ids_to_fetch, start=1):
        print(f'[{i}/{len(ids_to_fetch)}] Fetching {gid}...')
        gist = fetch_gist(gid, token=token)
        if gist:
            pruned = prune_gist(gist)
            fetched_map[pruned['id']] = pruned
        else:
            print(f'Failed to fetch gist {gid}', file=sys.stderr)
        # be polite to the API
        time.sleep(0.2)

    # Build results preserving order from `ids` using existing entries when present
    results = []
    for gid in ids:
        if not force and gid in existing_map:
            results.append(existing_map[gid])
        elif gid in fetched_map:
            results.append(fetched_map[gid])
        else:
            # skipped or failed fetch; omit
            pass

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
