"""
Upload landmarks.json to Firestore with geohashing
"""

import firebase_admin
from firebase_admin import credentials, firestore
import json
import os
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


def upload_landmarks(credentials_path, json_file='sample_landmarks.json'):
    """Upload landmarks to Firebase"""

    cred = credentials.Certificate(credentials_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✓ Connected to Firebase\n")

    with open(json_file, 'r', encoding='utf-8') as f:
        sample_landmarks = json.load(f)

    print(f"Uploading {len(sample_landmarks)} landmarks...")

    for i in range(0, len(sample_landmarks), 500):
        batch = db.batch()

        for lm in sample_landmarks[i:i+500]:
            lm['geohash'] = geohash_encode(lm['lat'], lm['lng'], 9)
            lm['geohash_short'] = geohash_encode(lm['lat'], lm['lng'], 5)

            doc_ref = db.collection('landmarks').document(str(lm['id']))
            batch.set(doc_ref, lm)

        batch.commit()
        print(f"  {min(i+500, len(sample_landmarks))}/{len(sample_landmarks)} uploaded")
    
    print(f"\n✓ Done! {len(sample_landmarks)} landmarks in Firebase")
    print("\nNext: Create indexes in Firebase Console")
    print("Go to: Firestore > Indexes > Create Index")
    print("  Collection: landmarks")
    print("  Fields: geohash (Ascending), type (Ascending)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python firebase_uploader.py serviceAccountKey.json [landmarks.json]")
        sys.exit(1)

    default_json = os.path.join(os.path.dirname(__file__), 'sample_landmarks.json')
    json_file = sys.argv[2] if len(sys.argv) > 2 else default_json

    upload_landmarks(sys.argv[1], json_file=json_file)
