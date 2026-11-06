import requests
import json

print("Fetching full providers...")
try:
    r = requests.get('https://igamingapis.com/provider/', headers={'User-Agent': 'Mozilla/5.0'}).json()
    providers = r.get('games', [])
    print(f"Fetched {len(providers)} providers")
except Exception as e:
    print(f"Error fetching providers: {e}")
    providers = []

# Map scraped_brands.json if exists for category & hot info
brand_meta = {}
try:
    with open('scraped_brands.json', 'r', encoding='utf-8') as f:
        meta_list = json.load(f)
        for m in meta_list:
            brand_meta[m['name'].strip().lower()] = m
except Exception as e:
    print(f"Error loading meta: {e}")

enriched_providers = []
for p in providers:
    title = p['brand_title'].strip()
    meta = brand_meta.get(title.lower(), {})
    enriched_providers.append({
        'brand_id': p['brand_id'],
        'brand_title': title,
        'logo': p['logo'] or meta.get('logo', ''),
        'category': meta.get('category', 'slots'),
        'is_hot': meta.get('is_hot', False),
        'rank': meta.get('rank', '0')
    })

catalog = {}
total_games = 0

print("Fetching games for prominent brands...")
for p in enriched_providers[:30]:
    bid = p['brand_id']
    try:
        g = requests.get(f'https://igamingapis.com/provider/brands/?brand_id={bid}', headers={'User-Agent': 'Mozilla/5.0'}, timeout=8).json()
        games = g.get('games', [])
        catalog[bid] = games
        total_games += len(games)
        print(f"  Brand {p['brand_title']} (ID {bid}): {len(games)} games")
    except Exception as e:
        print(f"  Error for {bid}: {e}")

result = {
    'providers': enriched_providers,
    'catalog': catalog,
    'total_providers': len(enriched_providers),
    'total_cached_games': total_games
}

with open('site_catalog.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, indent=2)

print(f"Success! Saved site_catalog.json with {len(enriched_providers)} providers and {total_games} games.")
