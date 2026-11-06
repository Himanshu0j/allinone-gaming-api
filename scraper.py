import requests
import re
import json
from bs4 import BeautifulSoup

s = requests.Session()
s.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
})

print("1. Fetching documentation page to get nonce...")
doc_init = s.get("https://igamingapis.com/documentation/").text
nonce = re.search(r'var nonce = "([^"]+)"', doc_init).group(1)
post_id = re.search(r'var postId = ([0-9]+)', doc_init).group(1)

print(f"Nonce: {nonce}, PostId: {post_id}")
print("2. Validating agent code hdsoftapi1...")
val_resp = s.post("https://igamingapis.com/wp-admin/admin-ajax.php", data={
    "action": "aca_validate_agent_code",
    "code": "hdsoftapi1",
    "post_id": post_id,
    "context": "buy",
    "nonce": nonce
})
val_data = val_resp.json()
print("Validation result:", val_data)

print("3. Fetching unlocked Documentation...")
doc_unlocked = s.get("https://igamingapis.com/documentation/").text
soup_doc = BeautifulSoup(doc_unlocked, "html.parser")

# Extract documentation text and code blocks
doc_content = []
for el in soup_doc.select(".elementor-widget-container"):
    text = el.get_text(separator="\n", strip=True)
    if text and len(text) > 20:
        doc_content.append(text)

with open("scraped_documentation.txt", "w", encoding="utf-8") as f:
    f.write("\n\n=== SECTION ===\n\n".join(doc_content))
print(f"Saved scraped_documentation.txt ({len(doc_content)} sections)")

print("4. Fetching unlocked Buy page...")
buy_unlocked = s.get("https://igamingapis.com/buy/").text
soup_buy = BeautifulSoup(buy_unlocked, "html.parser")
buy_text = soup_buy.get_text(separator="\n", strip=True)
with open("scraped_buy.txt", "w", encoding="utf-8") as f:
    f.write(buy_text)
print("Saved scraped_buy.txt")

print("5. Scraping products / providers list...")
prod_html = s.get("https://igamingapis.com/products/").text
soup_prod = BeautifulSoup(prod_html, "html.parser")
brands = []
for item in soup_prod.select(".simple-brand-grid-item"):
    cat = item.get("data-sbg-cat", "")
    hot = item.get("data-sbg-hot", "0")
    rank = item.get("data-sbg-rank", "0")
    name = item.get("data-sbg-name", "")
    a = item.select_one("a")
    link = a["href"] if a and a.has_attr("href") else ""
    img = item.select_one(".simple-brand-grid-logo")
    logo = img["src"] if img and img.has_attr("src") else ""
    brands.append({
        "name": name,
        "category": cat,
        "is_hot": hot == "1",
        "rank": rank,
        "link": link,
        "logo": logo
    })

print(f"Total brands found: {len(brands)}")
with open("scraped_brands.json", "w", encoding="utf-8") as f:
    json.dump(brands, f, indent=2)

print("6. Sample brand page check...")
if brands:
    sample = brands[0]
    print(f"Checking {sample['name']} -> {sample['link']}")
    sample_html = s.get(sample['link']).text
    soup_sample = BeautifulSoup(sample_html, "html.parser")
    with open("sample_brand.html", "w", encoding="utf-8") as f:
        f.write(sample_html)
    print("Saved sample_brand.html")

