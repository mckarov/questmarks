import requests
import json
import time
import math
from typing import List, Dict
from collections import defaultdict

class QuestmarksLandmarkImporter:
    """
    Comprehensive landmark importer for Questmarks app.
    Sources: OpenStreetMap, Wikidata, GeoNames
    """
    
    def __init__(self):
        self.landmarks = []
        self.seen_names = set()  # Deduplication
        self.landmark_id = 1
        
        # XP Classification keywords
        self.wonder_keywords = [
            'great wall', 'taj mahal', 'machu picchu', 'christ redeemer',
            'colosseum', 'petra', 'chichen itza', 'great pyramid',
            'hanging gardens', 'statue of zeus', 'temple of artemis',
            'mausoleum', 'colossus', 'lighthouse of alexandria'
        ]
        
        self.unesco_keywords = [
            'unesco', 'world heritage', 'heritage site'
        ]
        
        self.national_keywords = [
            'national monument', 'national memorial', 'national park',
            'capitol', 'parliament', 'presidential', 'royal palace',
            'national museum', 'national gallery', 'independence'
        ]
        
        self.regional_keywords = [
            'nature reserve', 'regional park', 'state park',
            'provincial park', 'wildlife sanctuary', 'botanical garden'
        ]
        
        self.semi_local_keywords = [
            'palace', 'castle', 'cathedral', 'basilica', 'temple',
            'fortress', 'citadel', 'museum', 'opera house', 'theater'
        ]
    
    def classify_landmark(self, name: str, tags: Dict) -> str:
        """Classify landmark into XP tiers"""
        name_lower = name.lower()
        
        # Check tags for heritage info
        if tags.get('heritage') == 'world_heritage' or tags.get('unesco') == 'yes':
            return 'UNESCO'
        
        # World Wonders
        if any(keyword in name_lower for keyword in self.wonder_keywords):
            return 'WONDER'
        
        # UNESCO sites
        if any(keyword in name_lower for keyword in self.unesco_keywords):
            return 'UNESCO'
        
        # National landmarks
        if any(keyword in name_lower for keyword in self.national_keywords):
            return 'NATIONAL'
        
        if tags.get('tourism') == 'museum' and 'national' in name_lower:
            return 'NATIONAL'
        
        # Regional landmarks
        if any(keyword in name_lower for keyword in self.regional_keywords):
            return 'REGIONAL'
        
        if tags.get('leisure') == 'nature_reserve':
            return 'REGIONAL'
        
        # Semi-local landmarks
        if any(keyword in name_lower for keyword in self.semi_local_keywords):
            return 'SEMI_LOCAL'
        
        if tags.get('historic') in ['castle', 'palace', 'cathedral']:
            return 'SEMI_LOCAL'
        
        # Default to local
        return 'LOCAL'
    
    def get_country_from_coords(self, lat: float, lng: float) -> str:
        """Reverse geocode to get country (using Nominatim)"""
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json"
            headers = {'User-Agent': 'QuestmarksApp/1.0'}
            response = requests.get(url, headers=headers, timeout=10)
            time.sleep(1)  # Rate limit
            
            if response.status_code == 200:
                data = response.json()
                if 'address' in data:
                    return data['address'].get('country', 'Unknown')
        except Exception as e:
            print(f"Geocoding error: {e}")
        
        return "Unknown"
    
    def import_from_overpass(self, bbox: tuple, query_type: str = 'tourism'):
        """
        Import landmarks from OpenStreetMap via Overpass API
        bbox: (min_lat, min_lon, max_lat, max_lon)
        """
        print(f"Querying Overpass API for {query_type} in bbox {bbox}...")
        
        # Overpass QL query
        overpass_url = "http://overpass-api.de/api/interpreter"
        
        queries = {
            'tourism': f"""
                [out:json][timeout:300];
                (
                  node["tourism"~"attraction|museum|gallery|castle|monument|viewpoint"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
                  way["tourism"~"attraction|museum|gallery|castle|monument|viewpoint"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
                  relation["tourism"~"attraction|museum|gallery|castle|monument|viewpoint"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
                );
                out center;
            """,
            'historic': f"""
                [out:json][timeout:300];
                (
                  node["historic"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
                  way["historic"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
                  relation["historic"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
                );
                out center;
            """,
            'natural': f"""
                [out:json][timeout:300];
                (
                  node["natural"~"peak|volcano|hot_spring|geyser|beach|cave_entrance"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
                  way["natural"~"peak|volcano|hot_spring|geyser|beach|cave_entrance"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
                  relation["natural"~"peak|volcano|hot_spring|geyser|beach|cave_entrance"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
                );
                out center;
            """,
            'heritage': f"""
                [out:json][timeout:300];
                (
                  node["heritage"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
                  way["heritage"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
                  relation["heritage"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
                );
                out center;
            """
        }
        
        query = queries.get(query_type, queries['tourism'])
        
        try:
            response = requests.post(overpass_url, data=query, timeout=400)
            
            if response.status_code == 200:
                data = response.json()
                
                for element in data.get('elements', []):
                    # Get coordinates
                    if element['type'] == 'node':
                        lat = element['lat']
                        lon = element['lon']
                    elif 'center' in element:
                        lat = element['center']['lat']
                        lon = element['center']['lon']
                    else:
                        continue
                    
                    # Get name
                    tags = element.get('tags', {})
                    name = tags.get('name', tags.get('name:en', ''))
                    
                    if not name or len(name) < 3:
                        continue
                    
                    # Skip Israel (as requested)
                    if 31 < lat < 33.5 and 34 < lon < 36:
                        continue
                    
                    # Deduplication
                    name_key = f"{name}_{lat:.3f}_{lon:.3f}"
                    if name_key in self.seen_names:
                        continue
                    self.seen_names.add(name_key)
                    
                    # Classify
                    landmark_type = self.classify_landmark(name, tags)
                    
                    # Get country (expensive, cache this)
                    country = tags.get('addr:country', 'Unknown')
                    
                    landmark = {
                        'id': self.landmark_id,
                        'name': name,
                        'lat': round(lat, 6),
                        'lng': round(lon, 6),
                        'type': landmark_type,
                        'country': country
                    }
                    
                    self.landmarks.append(landmark)
                    self.landmark_id += 1
                    
                    if self.landmark_id % 100 == 0:
                        print(f"Imported {self.landmark_id} landmarks...")
                
                print(f"Successfully imported {len(data.get('elements', []))} elements from this query")
                
            else:
                print(f"Error: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"Error querying Overpass API: {e}")
        
        time.sleep(5)  # Rate limiting
    
    def scan_world_grid(self, cell_size: float = 1.0):
        """
        Scan entire world in grid pattern
        cell_size: degrees (1.0 = ~111km at equator)
        """
        print(f"Starting world scan with {cell_size}° grid cells...")
        
        # World bounds (excluding Israel region)
        regions = [
            # Europe
            {"name": "Western Europe", "bounds": (36, -10, 72, 15)},
            {"name": "Eastern Europe", "bounds": (36, 15, 72, 45)},
            
            # Asia (excluding Israel)
            {"name": "Middle East", "bounds": (12, 35, 42, 65)},
            {"name": "South Asia", "bounds": (5, 65, 40, 100)},
            {"name": "East Asia", "bounds": (20, 100, 55, 145)},
            {"name": "Southeast Asia", "bounds": (-10, 95, 25, 145)},
            
            # Africa
            {"name": "North Africa", "bounds": (0, -20, 38, 52)},
            {"name": "Sub-Saharan Africa", "bounds": (-35, -20, 0, 52)},
            
            # Americas
            {"name": "North America", "bounds": (15, -170, 75, -50)},
            {"name": "Central America", "bounds": (5, -120, 25, -75)},
            {"name": "South America", "bounds": (-55, -85, 15, -30)},
            
            # Oceania
            {"name": "Australia", "bounds": (-45, 110, -10, 155)},
            {"name": "Pacific Islands", "bounds": (-25, 155, 25, -120)},
        ]
        
        total_cells = 0
        
        for region in regions:
            print(f"\n{'='*60}")
            print(f"Scanning region: {region['name']}")
            print(f"{'='*60}")
            
            min_lat, min_lon, max_lat, max_lon = region['bounds']
            
            lat = min_lat
            while lat < max_lat:
                lon = min_lon
                while lon < max_lon:
                    bbox = (lat, lon, lat + cell_size, lon + cell_size)
                    
                    # Query different types
                    for query_type in ['tourism', 'historic', 'natural', 'heritage']:
                        self.import_from_overpass(bbox, query_type)
                        total_cells += 1
                    
                    lon += cell_size
                lat += cell_size
            
            print(f"Region complete. Total landmarks so far: {len(self.landmarks)}")
        
        print(f"\nScanned {total_cells} cells total")
    
    def import_unesco_sites(self):
        """Import UNESCO World Heritage Sites from Wikidata"""
        print("Importing UNESCO World Heritage Sites from Wikidata...")
        
        # SPARQL query for UNESCO sites
        sparql_query = """
        SELECT ?site ?siteLabel ?coord ?countryLabel WHERE {
          ?site wdt:P1435 wd:Q9259.
          ?site wdt:P625 ?coord.
          OPTIONAL { ?site wdt:P17 ?country. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
        """
        
        url = "https://query.wikidata.org/sparql"
        
        try:
            response = requests.get(
                url,
                params={'query': sparql_query, 'format': 'json'},
                headers={'User-Agent': 'QuestmarksApp/1.0'},
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                
                for item in data['results']['bindings']:
                    name = item['siteLabel']['value']
                    
                    # Parse coordinates
                    coord_str = item['coord']['value']
                    # Format: Point(lon lat)
                    coords = coord_str.replace('Point(', '').replace(')', '').split()
                    lng = float(coords[0])
                    lat = float(coords[1])
                    
                    # Skip Israel
                    if 31 < lat < 33.5 and 34 < lng < 36:
                        continue
                    
                    country = item.get('countryLabel', {}).get('value', 'Unknown')
                    
                    # Deduplication
                    name_key = f"{name}_{lat:.3f}_{lng:.3f}"
                    if name_key in self.seen_names:
                        continue
                    self.seen_names.add(name_key)
                    
                    landmark = {
                        'id': self.landmark_id,
                        'name': name,
                        'lat': round(lat, 6),
                        'lng': round(lng, 6),
                        'type': 'UNESCO',
                        'country': country
                    }
                    
                    self.landmarks.append(landmark)
                    self.landmark_id += 1
                
                print(f"Imported {len(data['results']['bindings'])} UNESCO sites")
                
        except Exception as e:
            print(f"Error importing UNESCO sites: {e}")
        
        time.sleep(2)
    
    def import_wonders(self):
        """Manually add the World Wonders with verified coordinates"""
        wonders = [
            # New 7 Wonders
            {"name": "Great Wall of China", "lat": 40.4319, "lng": 116.5704, "country": "China"},
            {"name": "Petra", "lat": 30.3285, "lng": 35.4444, "country": "Jordan"},
            {"name": "Christ the Redeemer", "lat": -22.9519, "lng": -43.2105, "country": "Brazil"},
            {"name": "Machu Picchu", "lat": -13.1631, "lng": -72.5450, "country": "Peru"},
            {"name": "Chichen Itza", "lat": 20.6843, "lng": -88.5678, "country": "Mexico"},
            {"name": "Colosseum", "lat": 41.8902, "lng": 12.4922, "country": "Italy"},
            {"name": "Taj Mahal", "lat": 27.1751, "lng": 78.0421, "country": "India"},
            
            # Ancient Wonders (existing)
            {"name": "Great Pyramid of Giza", "lat": 29.9792, "lng": 31.1342, "country": "Egypt"},
        ]
        
        for wonder in wonders:
            landmark = {
                'id': self.landmark_id,
                'name': wonder['name'],
                'lat': wonder['lat'],
                'lng': wonder['lng'],
                'type': 'WONDER',
                'country': wonder['country']
            }
            self.landmarks.append(landmark)
            self.landmark_id += 1
            self.seen_names.add(f"{wonder['name']}_{wonder['lat']:.3f}_{wonder['lng']:.3f}")
        
        print(f"Added {len(wonders)} World Wonders")
    
    def export_to_json(self, filename: str = 'landmarks.json'):
        """Export all landmarks to JSON file"""
        print(f"\nExporting {len(self.landmarks)} landmarks to {filename}...")
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.landmarks, f, indent=2, ensure_ascii=False)
        
        print(f"✓ Export complete!")
        
        # Print statistics
        type_counts = defaultdict(int)
        country_counts = defaultdict(int)
        
        for lm in self.landmarks:
            type_counts[lm['type']] += 1
            country_counts[lm['country']] += 1
        
        print("\n" + "="*60)
        print("IMPORT STATISTICS")
        print("="*60)
        print(f"Total landmarks: {len(self.landmarks)}")
        print("\nBy Type:")
        for lm_type, count in sorted(type_counts.items()):
            print(f"  {lm_type}: {count}")
        print(f"\nCountries covered: {len(country_counts)}")
        print(f"Top 10 countries by landmarks:")
        for country, count in sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"  {country}: {count}")
    
    def run_full_import(self):
        """Run complete import process"""
        print("="*60)
        print("QUESTMARKS LANDMARK IMPORTER")
        print("="*60)
        print("\nThis will import landmarks from:")
        print("1. World Wonders (manual)")
        print("2. UNESCO World Heritage Sites (Wikidata)")
        print("3. OpenStreetMap (Overpass API - worldwide scan)")
        print("\nWARNING: Full world scan will take 24-72 hours!")
        print("="*60)
        
        # Step 1: World Wonders
        print("\n[1/3] Importing World Wonders...")
        self.import_wonders()
        
        # Step 2: UNESCO Sites
        print("\n[2/3] Importing UNESCO Sites...")
        self.import_unesco_sites()
        
        # Step 3: World scan
        print("\n[3/3] Starting world scan...")
        response = input("Start full world scan? This takes 24-72 hours (y/n): ")
        
        if response.lower() == 'y':
            self.scan_world_grid(cell_size=0.5)  # 0.5° = ~55km cells
        else:
            print("Skipping world scan. Running quick sample instead...")
            # Sample major cities
            major_cities = [
                (48.8566, 2.3522, 49.0, 2.5),  # Paris
                (51.5074, -0.1278, 51.6, 0.0),  # London
                (40.7128, -74.0060, 40.8, -73.9),  # NYC
                (35.6762, 139.6503, 35.8, 139.8),  # Tokyo
                (-33.8688, 151.2093, -33.7, 151.3),  # Sydney
            ]
            
            for bbox in major_cities:
                for query_type in ['tourism', 'historic', 'natural', 'heritage']:
                    self.import_from_overpass(bbox, query_type)
        
        # Export
        self.export_to_json()


# Usage
if __name__ == "__main__":
    importer = QuestmarksLandmarkImporter()
    importer.run_full_import()
