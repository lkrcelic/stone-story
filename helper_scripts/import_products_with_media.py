import csv
import requests

# ==============================
# CONFIG
# ==============================

CSV_FILE = "C:/Users/lkrcelic/Downloads/Baza kamen - Sheet1 (7).csv"  # <-- change to your real CSV path
API_URL = "http://localhost:3000/api/products"
MEDIA_API_URL = "http://localhost:3000/api/media"

JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiY29sbGVjdGlvbiI6InVzZXJzIiwiZW1haWwiOiJsb3Zyby5rcmNlbGljQGdtYWlsLmNvbSIsInNpZCI6ImM5NWNmNzFhLWFkM2UtNGRmOC04NzhlLTc0MDI2OTNkMzk4YyIsImlhdCI6MTc2NDk2NDY3MCwiZXhwIjoxNzY2MTc0MjcwfQ.5rNM9g1j5WcJuVwMce4qinru7tE-c_iOoLJs-D3wUf0"  # <-- DO NOT reuse the exposed one

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"JWT {JWT_TOKEN}"
}

# ==============================
# HELPER FUNCTIONS
# ==============================

def find_media_by_title(title):
    """
    Search for media by title (alt text).
    Returns the media ID if found, None otherwise.
    """
    try:
        # Query the media collection for matching alt text
        search_url = f"{MEDIA_API_URL}?where[alt][equals]={title}"
        response = requests.get(search_url, headers=HEADERS)
        
        if response.status_code == 200:
            data = response.json()
            docs = data.get('docs', [])
            if docs:
                # Return the first matching media ID
                return docs[0]['id']
        return None
    except Exception as e:
        print(f"⚠️  Error searching for media '{title}': {e}")
        return None


def clean_title_for_search(title):
    """
    Clean the product title to match the media alt text format.
    Example: "Aberdeen Granite" -> "This is the picture of Aberdeen Granite"
    """
    return f"This is the picture of {title}"


def create_lexical_description(text):
    """
    Convert plain text to Lexical editor format.
    Splits by newlines and creates paragraphs.
    """
    if not text or not text.strip():
        return None
    
    # Split text by newlines to create separate paragraphs
    lines = text.strip().split('\n')
    children = []
    
    for line in lines:
        if line.strip():  # Skip empty lines
            children.append({
                "type": "paragraph",
                "format": "",
                "indent": 0,
                "version": 1,
                "children": [
                    {
                        "mode": "normal",
                        "text": line.strip(),
                        "type": "text",
                        "style": "",
                        "detail": 0,
                        "format": 0,
                        "version": 1
                    }
                ],
                "direction": None,
                "textStyle": "",
                "textFormat": 0
            })
    
    return {
        "root": {
            "type": "root",
            "format": "",
            "indent": 0,
            "version": 1,
            "children": children,
            "direction": None
        }
    }


# ==============================
# IMPORT LOOP
# ==============================

with open(CSV_FILE, newline="", encoding="utf-8") as csvfile:
    # Use quotechar to handle commas inside fields
    # If your CSV uses semicolon (;) instead of comma, change delimiter=';'
    reader = csv.DictReader(csvfile, delimiter=',', quotechar='"')

    for row in reader:
        try:
            title = row["name"].strip()
            origin = row["origin"].strip().lower()
            product_type = row["type"].strip().lower()
            short_description = row["short_description"].strip()
            description_text = row.get("description", "").strip()

            # Search for matching media
            media_alt_text = clean_title_for_search(title)
            media_id = find_media_by_title(media_alt_text)
            
            # Build the product payload
            payload = {
                "title": title,
                "short_description": short_description,
                "origin": origin,
                "type": product_type,
                "inventory": 20,
                "enableVariants": False,
                "priceInUSDEnabled": True,
                "priceInUSD": 15,
                "_status": "published"
            }
            
            # Add description in Lexical format if available
            if description_text:
                lexical_description = create_lexical_description(description_text)
                if lexical_description:
                    payload["description"] = lexical_description
            
            # Add gallery if media was found
            if media_id:
                payload["gallery"] = [
                    {
                        "image": media_id
                    }
                ]
               # print(f"📷 Found media for '{title}' (ID: {media_id})")
            else:
                print(f"⚠️  No media found for '{title}'")

            # Create the product
            response = requests.post(API_URL, json=payload, headers=HEADERS)

            if response.status_code in (200, 201):
                product_data = response.json()
                product_id = product_data.get('doc', {}).get('id', 'unknown')
                print(f"✅ Created: {title} (ID: {product_id})")
            else:
                print(f"❌ Failed: {title}")
                print("Status:", response.status_code)
                print("Response:", response.text[:300])

        except Exception as e:
            print("⚠️ Error processing row:", row)
            print(e)

print("\n" + "="*50)
print("Import complete!")
print("="*50)
