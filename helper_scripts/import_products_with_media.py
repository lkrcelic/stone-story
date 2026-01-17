import csv
import requests
import csv
import random
import time
from urllib.parse import quote

# ==============================
# CONFIG
# ==============================

CSV_FILE = "C:/Users/lkrcelic/Downloads/Untitled spreadsheet - Baza kamen - Sheet1 (2).csv"  # <-- change to your real CSV path

# HOSTNAME = "http://localhost:3000"  # Local development
HOSTNAME = "https://stone-story.vercel.app"  # Production

API_URL = f"{HOSTNAME}/api/products"
MEDIA_API_URL = f"{HOSTNAME}/api/media"

#JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiY29sbGVjdGlvbiI6InVzZXJzIiwiZW1haWwiOiJsb3Zyby5rcmNlbGljQGdtYWlsLmNvbSIsInNpZCI6IjdjNGIzOTJiLTA1MmUtNDcwNy05N2U1LTc2MDk4OTM4ODdhYSIsImlhdCI6MTc2ODM0NTg5MCwiZXhwIjoxNzY5NTU1NDkwfQ.LGP_hIFa8M3lOk0NKswmX0wNT_a4orB-iGRai-eS-qA"  # <-- DO NOT reuse the exposed one
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiY29sbGVjdGlvbiI6InVzZXJzIiwiZW1haWwiOiJsb3Zyby5rcmNlbGljQGdtYWlsLmNvbSIsInNpZCI6ImExNWNiNWM3LTVlMTgtNGM0OS1hOWNlLWFiZDIyNjI2NGVhYSIsImlhdCI6MTc2ODE3Mjk0MywiZXhwIjoxNzY5MzgyNTQzfQ.GkLqZKSqfhccXB99OrO438WTX5RaooaMMD2uCAyFi7g"

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
        # Query the media collection for matching alt text (URL encode the title)
        # Use 'like' for case-insensitive matching
        encoded_title = quote(title)
        search_url = f"{MEDIA_API_URL}?where[alt][like]={encoded_title}"
        response = requests.get(search_url, headers=HEADERS)
        
        if response.status_code == 200:
            data = response.json()
            docs = data.get('docs', [])
            if docs:
                # Return the first matching media ID
                return docs[0]['id']
            else:
                # Debug: Show what we searched for and suggest checking media
                print(f"   🔍 Searched for alt text: '{title}'")
                print(f"   💡 Check if media exists with this exact alt text in admin")
        else:
            print(f"   ⚠️  API error: {response.status_code}")
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
                "inventory": random.randint(1, 30),
                "enableVariants": False,
                "priceInUSDEnabled": True,
                "priceInUSD": random.randint(1, 30),
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
