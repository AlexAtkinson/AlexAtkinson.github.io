#!/usr/bin/env python3
"""
fetch_gists.py

Fetch curated GitHub Gist metadata and write a local JSON asset at
`assets/gists.json` to avoid runtime API calls from the browser.

Usage:
    - The curated gist IDs are read from the `const curated = [...]` array in
        `articles.html`.
    - Or pass GIST IDs on the command line:
            ./scripts/fetch_gists.py  id1 id2 id3

Options:
    - `-f` / `--force` : re-fetch all listed IDs
    - `-g` / `--gist`  : update specific gist ID(s) (can be used multiple times)
    - `-d` / `--delete`: delete specific gist ID(s) from gists.json (requires -g)
    - `--sync`         : keep only IDs from articles.html (prune all others)
    - `--output <path>`: change output path (defaults to `assets/gists.json`)

Optionally set `GITHUB_TOKEN` in the environment to increase rate limits.

This script is intended to be run manually by the maintainer; commit and
push `assets/gists.json` into the site when ready.
"""
import sys
import os
import re
import json
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


DEFAULT_OUTPUT = os.path.join('assets', 'gists.json')


def read_ids_from_file(path='assets/misc/curated_gists.txt'):
    """
    Read curated gist IDs.
    Prefer extracting from `articles.html` by parsing the `const curated = [...]` JS array.
    If that fails, fall back to reading a plain text file at `path` (one ID per line).
    """
    # Parse `articles.html` and extract the `const curated = [...]` array.
    try:
        a_path = os.path.join(os.path.dirname(__file__), '..', 'articles.html')
        a_path = os.path.normpath(os.path.abspath(a_path))
        if os.path.exists(a_path):
            with open(a_path, 'r', encoding='utf-8') as fh:
                content = fh.read()
            m = re.search(r"const\s+curated\s*=\s*\[(.*?)\]\s*;", content, re.S)
            if m:
                inner = m.group(1)
                # find quoted IDs inside the array
                ids = re.findall(r"['\"]([0-9a-fA-F]{6,})['\"]", inner)
                return ids
    except Exception:
        pass

    # If parsing fails, return an empty list (no fallback file available).
    return []


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

    # simple args parsing with support for -f/--force, -d/--delete, --sync, -g/--gist and --output
    force = False
    delete = False
    sync = False
    args = []
    explicit_gists = []
    i = 1
    while i < len(argv):
        a = argv[i]
        if a in ('-f', '--force'):
            force = True
            i += 1
            continue
        if a in ('-d', '--delete'):
            delete = True
            i += 1
            continue
        if a == '--sync':
            sync = True
            i += 1
            continue
        if a in ('-g', '--gist'):
            # accept multiple -g flags and comma-separated lists
            try:
                val = argv[i + 1]
            except Exception:
                print('Usage: -g <gist-id> (can be used multiple times)', file=sys.stderr)
                return 2
            for part in val.split(','):
                p = part.strip()
                if p:
                    explicit_gists.append(p)
            i += 2
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

    # Handle delete mode
    if delete:
        if not explicit_gists:
            print('Error: -d/--delete requires specific gist IDs via -g flag', file=sys.stderr)
            return 2
        # In delete mode, we remove the specified IDs
        ids = explicit_gists
    elif explicit_gists:
        ids = explicit_gists
    elif args:
        ids = args
    else:
        ids = read_ids_from_file()

    if not delete and not ids:
        print('No gist IDs provided (pass IDs on the command line or update articles.html).')
        return 1

    # Safety: refuse to write HTML files. Output must be JSON (default: assets/gists.json).
    if outpath.lower().endswith('.html'):
        print('Refusing to write HTML file. Output must be a JSON file (e.g., assets/gists.json).', file=sys.stderr)
        return 2

    # Load existing data (if any) and build a map for quick lookup
    existing_map = {}
    existing_list = []
    if os.path.exists(outpath):
        try:
            with open(outpath, 'r', encoding='utf-8') as fh:
                existing_list = json.load(fh)
            for g in existing_list:
                if isinstance(g, dict) and g.get('id'):
                    existing_map[g['id']] = g
        except Exception:
            existing_map = {}
            existing_list = []

    # Handle delete mode - remove specified IDs and exit
    if delete:
        results = [g for g in existing_list if g.get('id') not in set(ids)]
        odir = os.path.dirname(outpath)
        if odir and not os.path.exists(odir):
            os.makedirs(odir, exist_ok=True)
        with open(outpath, 'w', encoding='utf-8') as fh:
            json.dump(results, fh, indent=2, ensure_ascii=False)
        print(f'Deleted {len(existing_list) - len(results)} gist(s). {len(results)} gists remaining in {outpath}')
        return 0

    # Determine which IDs need fetching
    ids_to_fetch = []
    if explicit_gists or args:
        ids_to_fetch = ids[:]
    else:
        for gid in ids:
            if force or gid not in existing_map:
                ids_to_fetch.append(gid)

    # If nothing to fetch and not syncing, still update order if needed
    if not ids_to_fetch and not sync:
        # Check if we need to update the order
        current_order = [g.get('id') for g in existing_list if g.get('id') in set(ids)]
        if current_order == [gid for gid in ids if gid in existing_map]:
            print('All gists are up-to-date. Use -f/--force to re-fetch all or --sync to prune.')
            return 0
        # Fall through to update the order

    fetched_map = {}
    for idx, gid in enumerate(ids_to_fetch, start=1):
        print(f'[{idx}/{len(ids_to_fetch)}] Fetching {gid}...')
        gist = fetch_gist(gid, token=token)
        if gist:
            pruned = prune_gist(gist)
            fetched_map[pruned['id']] = pruned
        else:
            print(f'Failed to fetch gist {gid}', file=sys.stderr)
        # be polite to the API
        time.sleep(0.2)

    # Build final results
    results = []
    if delete:
        # Keep only the ids listed (in that order), using fetched data when available
        for gid in ids:
            if gid in fetched_map:
                results.append(fetched_map[gid])
            elif gid in existing_map:
                results.append(existing_map[gid])
            else:
                # not found/failed fetch; skip
                pass
    else:
        # Always respect the order from articles.html (ids list)
        # For each ID in the curated list, use fetched data if available, else existing data
        ids_set = set(ids)
        seen = set()
        
        # First, add all IDs from the curated list in order
        for gid in ids:
            if gid in fetched_map:
                results.append(fetched_map[gid])
                seen.add(gid)
            elif gid in existing_map:
                results.append(existing_map[gid])
                seen.add(gid)
            # If not in either map, skip (failed fetch or invalid ID)
        
        # Then append any existing gists that are NOT in the curated list
        # (preserve them at the end so manual additions aren't lost)
        for g in existing_list:
            gid = g.get('id')
            if gid and gid not in ids_set and gid not in seen:
                results.append(g)
                seen.add(gid)

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
