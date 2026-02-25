"""
Upload landmarks.json to Firestore with geohashing
"""

import firebase_admin
from firebase_admin import credentials, firestore
import json
import sys

def geohash_encode(lat, lng, precision=9):
    base32 = '0123456789bcdefghjkmnpqrstuvwxyz'
    lat_range = [-90.0, 90.0]
    lng_range = [-180.0, 180.0]
    geohash = []
    bits = bit = 0
    even = True
    
    while len(geohash) < precision:
        if even:
            mid = (lng_range[0] + lng_range[1]) / 2
            if lng > mid:
                bit |= (1 << (4 - bits))
                lng_range[0] = mid
            else:
                lng_range[1] = mid
        else:
            mid = (lat_range[0] + lat_range[1]) / 2
            if lat > mid:
                bit |= (1 << (4 - bits))
                lat_range[0] = mid
            else:
                lat_range[1] = mid
        
        even = not even
        bits += 1
        
        if bits == 5:
            geohash.append(base32[bit])
            bits = bit = 0
    
    return ''.join(geohash)


def upload_landmarks(credentials_path, json_file='landmarks.json'):
    """Upload landmarks to Firebase"""
    
    # Initialize Firebase
    cred = credentials.Certificate(credentials_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✓ Connected to Firebase\n")
    
    # Load landmarks
    with open(json_file, 'r', encoding='utf-8') as f:
        landmarks = json.load(f)
    
    print(f"Uploading {len(landmarks)} landmarks...")
    
    # Upload in batches of 500 (Firestore limit)
    for i in range(0, len(landmarks), 500):
        batch = db.batch()
        
        for lm in landmarks[i:i+500]:
            # Add geohashes
            lm['geohash'] = geohash_encode(lm['lat'], lm['lng'], 9)
            lm['geohash_short'] = geohash_encode(lm['lat'], lm['lng'], 5)
            
            # Upload
            doc_ref = db.collection('landmarks').document(str(lm['id']))
            batch.set(doc_ref, lm)
        
        batch.commit()
        print(f"  {min(i+500, len(landmarks))}/{len(landmarks)} uploaded")
    
    print(f"\n✓ Done! {len(landmarks)} landmarks in Firebase")
    print("\nNext: Create indexes in Firebase Console")
    print("Go to: Firestore > Indexes > Create Index")
    print("  Collection: landmarks")
    print("  Fields: geohash (Ascending), type (Ascending)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python firebase_uploader.py serviceAccountKey.json")
        sys.exit(1)
    
    upload_landmarks(sys.argv[1])