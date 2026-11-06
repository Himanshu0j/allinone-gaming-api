import requests, json

s = requests.Session()
feat = s.get('http://localhost:3000/api/games/featured').json()
print("Featured games total:", feat['total'])

for i, g in enumerate(feat['games'][:4]):
    name = g['game_name']
    pid = g['product_id']
    slug = g['brand_slug']
    print(f"\n--- [{i+1}] Testing live launch: {name} (PID: {pid}, Brand: {slug}) ---")
    
    res = s.post('http://localhost:3000/api/launch-game', json={
        'productId': pid,
        'brandSlug': slug,
        'gameTitle': name
    }).json()
    
    print(f"Success: {res.get('success')}")
    print(f"Type: {res.get('type')}")
    print(f"URL: {res.get('url')[:120]}...")

print("\n--- Testing brand games drawer for Spribe ---")
spribe = s.get('http://localhost:3000/api/brands/spribe/games').json()
print(f"Total Spribe games: {spribe.get('total_games')}")
for g in spribe.get('games', [])[:3]:
    print(f"  Game: {g['game_name']} | PID: {g['product_id']}")
