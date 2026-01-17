import os
import requests
from pathlib import Path

# ==============================
# CONFIG
# ==============================

IMAGES_FOLDER = "C:/Users/lkrcelic/Desktop/stone_pictures"
API_URL = "http://localhost:3000/api/media"

# Get your JWT token from the browser after logging in to /admin
# Or use the same token from import_products.py
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiY29sbGVjdGlvbiI6InVzZXJzIiwiZW1haWwiOiJsb3Zyby5rcmNlbGljQGdtYWlsLmNvbSIsInNpZCI6IjdjNGIzOTJiLTA1MmUtNDcwNy05N2U1LTc2MDk4OTM4ODdhYSIsImlhdCI6MTc2ODM0NTg5MCwiZXhwIjoxNzY5NTU1NDkwfQ.LGP_hIFa8M3lOk0NKswmX0wNT_a4orB-iGRai-eS-qA"

HEADERS = {
    "Authorization": f"JWT {JWT_TOKEN}"
}

# ==============================
# UPLOAD LOOP
# ==============================

def clean_stone_name(filename):
    """
    Convert filename to clean title.
    Example: 'Carrara_Marble.png' -> 'Carrara Marble'
    """
    name = Path(filename).stem  # Remove .png extension
    name = name.replace('_', ' ').replace('-', ' ')  # Replace underscores/hyphens with spaces
    return name.title()  # Capitalize each word


def upload_image(file_path):
    """Upload a single image to Payload media collection"""
    filename = os.path.basename(file_path)
    stone_name = clean_stone_name(filename)
    alt_text = f"This is the picture of {stone_name}"
    
    # Read file content
    with open(file_path, 'rb') as image_file:
        file_content = image_file.read()
    
    # Approach: Send file in 'files' and JSON data separately
    # Some APIs expect JSON in a specific multipart field
    import json
    
    files = {
        'file': (filename, file_content, 'image/png'),
    }
    
    # Payload might expect JSON data in a '_payload' field
    # Try sending the metadata as JSON string
    payload_json = json.dumps({
        'alt': alt_text,
    })
    
    data = {
        '_payload': payload_json,
    }
    
    # Make the request - remove Authorization header temporarily to test
    response = requests.post(
        API_URL,
        files=files,
        data=data,
        headers=HEADERS
    )
    
    return response, stone_name


# Main execution
if __name__ == "__main__":
    # Check if folder exists
    if not os.path.exists(IMAGES_FOLDER):
        print(f"❌ Folder not found: {IMAGES_FOLDER}")
        exit(1)
    
    # Get all PNG files
    png_files = [f for f in os.listdir(IMAGES_FOLDER) if f.lower().endswith('.png')]
    
    if not png_files:
        print(f"⚠️  No PNG files found in {IMAGES_FOLDER}")
        exit(0)
    
    print(f"Found {len(png_files)} PNG files to upload\n")
    
    success_count = 0
    failed_count = 0
    
    for filename in png_files:
        file_path = os.path.join(IMAGES_FOLDER, filename)
        
        try:
            response, stone_name = upload_image(file_path)
            
            if response.status_code in (200, 201):
                media_data = response.json()
                media_id = media_data.get('doc', {}).get('id', 'unknown')
                print(f"✅ Uploaded: {stone_name} (ID: {media_id})")
                success_count += 1
            else:
                print(f"❌ Failed: {stone_name}")
                print(f"   Status: {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                failed_count += 1
        
                
        except Exception as e:
            print(f"⚠️  Error uploading {filename}: {e}")
            failed_count += 1
    
    print(f"\n{'='*50}")
    print(f"Upload complete!")
    print(f"✅ Success: {success_count}")
    print(f"❌ Failed: {failed_count}")
    print(f"{'='*50}")
