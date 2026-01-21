import firebase_admin
from firebase_admin import credentials, firestore
import json
import time
from geohash import encode as geohash_encode

class FirebaseLandmarkUploader:
    """
    Upload landmarks to Firebase Firestore with geohashing for efficient queries
    """
    
    def __init__(self, credentials_path: str):
        """
        Initialize Firebase
        credentials_path: Path to your Firebase service account JSON
        """
        cred = credentials.Certificate(credentials_path)
        firebase_admin.initialize_app(cred)
        self.db = firestore.client()
        print("✓ Connected to Firebase")
    
    def add_geohash(self, landmark: dict) -> dict:
        """Add geohash to landmark for efficient location queries"""
        lat = landmark['lat']
        lng = landmark['lng']
        
        # Generate geohashes at different precisions
        landmark['geohash'] = geohash_encode(lat, lng, precision=9)
        landmark['geohash_short'] = geohash_encode(lat, lng, precision=5)
        
        return landmark
    
    def upload_landmarks(self, json_file: str, batch_size: int = 500):
        """
        Upload landmarks to Firestore in batches
        json_file: Path to landmarks.json from importer
        batch_size: Number of landmarks per batch (max 500 for Firestore)
        """
        print(f"Loading landmarks from {json_file}...")
        
        with open(json_file, 'r', encoding='utf-8') as f:
            landmarks = json.load(f)
        
        print(f"Uploading {len(landmarks)} landmarks to Firebase...")
        
        total = len(landmarks)
        uploaded = 0
        
        # Upload in batches
        for i in range(0, total, batch_size):
            batch = self.db.batch()
            chunk = landmarks[i:i + batch_size]
            
            for landmark in chunk:
                # Add geohash
                landmark = self.add_geohash(landmark)
                
                # Create document reference
                doc_ref = self.db.collection('landmarks').document(str(landmark['id']))
                
                # Set data
                batch.set(doc_ref, landmark)
            
            # Commit batch
            batch.commit()
            uploaded += len(chunk)
            
            print(f"Progress: {uploaded}/{total} ({(uploaded/total)*100:.1f}%)")
            time.sleep(0.5)  # Rate limiting
        
        print(f"\n✓ Successfully uploaded {uploaded} landmarks!")
        
        # Create indexes
        self.create_indexes()
    
    def create_indexes(self):
        """Print instructions for creating Firestore indexes"""
        print("\n" + "="*60)
        print("IMPORTANT: Create these indexes in Firebase Console")
        print("="*60)
        print("\nGo to: Firebase Console > Firestore > Indexes")
        print("\nCreate Composite Indexes:")
        print("\n1. Collection: landmarks")
        print("   Fields: geohash_short (Ascending), type (Ascending)")
        print("\n2. Collection: landmarks")
        print("   Fields: country (Ascending), type (Ascending)")
        print("\n3. Collection: landmarks")
        print("   Fields: type (Ascending), id (Ascending)")
        print("\nOr use this firebase.indexes.json:")
        
        indexes = {
            "indexes": [
                {
                    "collectionGroup": "landmarks",
                    "queryScope": "COLLECTION",
                    "fields": [
                        {"fieldPath": "geohash_short", "order": "ASCENDING"},
                        {"fieldPath": "type", "order": "ASCENDING"}
                    ]
                },
                {
                    "collectionGroup": "landmarks",
                    "queryScope": "COLLECTION",
                    "fields": [
                        {"fieldPath": "country", "order": "ASCENDING"},
                        {"fieldPath": "type", "order": "ASCENDING"}
                    ]
                },
                {
                    "collectionGroup": "landmarks",
                    "queryScope": "COLLECTION",
                    "fields": [
                        {"fieldPath": "type", "order": "ASCENDING"},
                        {"fieldPath": "id", "order": "ASCENDING"}
                    ]
                }
            ]
        }
        
        with open('firestore.indexes.json', 'w') as f:
            json.dump(indexes, f, indent=2)
        
        print("\n✓ Saved to firestore.indexes.json")
        print("Deploy with: firebase deploy --only firestore:indexes")
    
    def test_queries(self):
        """Test some sample queries"""
        print("\nTesting queries...")
        
        # Test 1: Get nearby landmarks (geohash query)
        test_geohash = geohash_encode(48.8584, 2.2945, precision=5)  # Paris
        nearby = self.db.collection('landmarks')\
            .where('geohash_short', '==', test_geohash)\
            .limit(10)\
            .stream()
        
        print(f"\nNearby landmarks (geohash {test_geohash}):")
        for doc in nearby:
            data = doc.to_dict()
            print(f"  - {data['name']} ({data['type']})")
        
        # Test 2: Get UNESCO sites
        unesco = self.db.collection('landmarks')\
            .where('type', '==', 'UNESCO')\
            .limit(10)\
            .stream()
        
        print("\nUNESCO sites:")
        for doc in unesco:
            data = doc.to_dict()
            print(f"  - {data['name']} in {data['country']}")
        
        # Test 3: Get World Wonders
        wonders = self.db.collection('landmarks')\
            .where('type', '==', 'WONDER')\
            .stream()
        
        print("\nWorld Wonders:")
        for doc in wonders:
            data = doc.to_dict()
            print(f"  - {data['name']} ({data['country']})")


# Usage
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python firebase_uploader.py <firebase-credentials.json>")
        print("\nSteps:")
        print("1. Run landmark_importer.py to generate landmarks.json")
        print("2. Download Firebase service account key from Firebase Console")
        print("3. Run: python firebase_uploader.py path/to/serviceAccountKey.json")
        sys.exit(1)
    
    credentials_path = sys.argv[1]
    
    uploader = FirebaseLandmarkUploader(credentials_path)
    uploader.upload_landmarks('landmarks.json')
    uploader.test_queries()
    
    print("\n" + "="*60)
    print("UPLOAD COMPLETE!")
    print("="*60)
