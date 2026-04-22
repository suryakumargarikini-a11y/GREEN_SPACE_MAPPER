import requests
import time

BASE = 'http://localhost:8000'
places = ['Central Park, New York', 'Lalbagh, Bengaluru', 'Hyde Park, London', 'Sahara Desert, Africa', 'Shinjuku Gyoen, Tokyo']

for place in places:
    print(f'Testing {place}...')
    try:
        r = requests.get(f'{BASE}/api/search-region', params={'q': place}, timeout=20)
        if r.status_code != 200:
            print(f'  [FAIL] Search failed for {place}: {r.text}')
            continue
        feature = r.json()
        print(f'  [OK] Found: {feature["properties"]["display_name"][:50]}')
    except Exception as e:
        print(f'  [FAIL] Request error for {place}: {e}')
        continue

    try:
        payload = {'geojson': feature['geometry'], 'region_name': place}
        ar = requests.post(f'{BASE}/api/analyze', json=payload, timeout=120)
        if ar.status_code == 200:
            res = ar.json()
            is_mock = res.get('note') is not None and ('mock' in res.get('note', '').lower() or 'clamped' in res.get('note', '').lower())
            print(f'  [OK] Analysis OK. Green coverage: {res["green_percentage"]:.2f}%. Note: {res.get("note")}')
        else:
            print(f'  [FAIL] Analysis failed for {place}: {ar.status_code} {ar.text[:100]}')
    except Exception as e:
        print(f'  [FAIL] Analyze error for {place}: {e}')
    print('-' * 40)

print('Done.')
