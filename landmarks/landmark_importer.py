import argparse
import json
import math
import os
import re
import shutil
import time
from collections import defaultdict
from typing import Dict, Iterable, List, Optional

import requests

try:
    import osmium
except ImportError:
    osmium = None


ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT_DIR, 'data')
OUTPUT_FILE = os.path.join(ROOT_DIR, 'landmarks.json')
LEGACY_CHECKPOINT_FILE = os.path.join(ROOT_DIR, 'landmarks_checkpoint.json')
PROGRESS_FILE = os.path.join(ROOT_DIR, 'landmark_import_progress.json')
FAILURES_FILE = os.path.join(ROOT_DIR, 'landmark_import_failures.json')
INDEX_CACHE_FILE = os.path.join(DATA_DIR, 'geofabrik_index_cache.json')
DOWNLOAD_DIR = os.path.join(ROOT_DIR, 'downloads', 'geofabrik')
WONDERS_FILE = os.path.join(DATA_DIR, 'manual_wonders.json')
RELEASE_EXTRACTS_FILE = os.path.join(DATA_DIR, 'geofabrik_release_extracts.json')
GEOFABRIK_INDEX_URL = 'https://download.geofabrik.de/index-v1-nogeom.json'
WIKIDATA_SPARQL_URL = 'https://query.wikidata.org/sparql'

TYPE_PRIORITY = {
    'LOCAL': 0,
    'SEMI_LOCAL': 1,
    'REGIONAL': 2,
    'NATIONAL': 3,
    'UNESCO': 4,
    'WONDER': 5,
}

SOURCE_PRIORITY = {
    'geofabrik': 0,
    'wikidata': 1,
    'manual': 2,
}


def normalize_name(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', ' ', name.lower()).strip()


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(delta_lon / 2) ** 2
    )
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class QuestmarksLandmarkImporter:
    """
    Stronger landmark import pipeline for QuestMarks.

    Bulk landmark base:
      - Geofabrik/OpenStreetMap country extracts parsed locally with pyosmium
    Supplements:
      - UNESCO World Heritage sites from Wikidata
      - Curated wonders from a local JSON file
    Final tiering:
      - LOCAL / SEMI_LOCAL / REGIONAL / NATIONAL / UNESCO / WONDER
    """

    def __init__(
        self,
        output_file: str = OUTPUT_FILE,
        download_dir: str = DOWNLOAD_DIR,
        fresh: bool = False,
    ):
        self.output_file = output_file if os.path.isabs(output_file) else os.path.join(ROOT_DIR, output_file)
        self.download_dir = download_dir if os.path.isabs(download_dir) else os.path.join(ROOT_DIR, download_dir)
        self.progress_file = PROGRESS_FILE
        self.failures_file = FAILURES_FILE
        self.index_cache_file = INDEX_CACHE_FILE
        self.legacy_checkpoint_file = LEGACY_CHECKPOINT_FILE

        self.landmarks: List[dict] = []
        self.landmark_id = 1
        self.completed_sources = set()
        self.failed_sources: List[dict] = []
        self.name_index = defaultdict(list)
        self.feature_map: Dict[str, dict] = {}

        self.request_pause_seconds = 1.0
        self.max_retries = 4
        self.last_request_at = 0.0
        self.session = requests.Session()
        self.session.headers.update(
            {
                'User-Agent': 'QuestMarks/1.0 landmark importer (Geofabrik+Wikidata)',
                'Accept': 'application/json',
            }
        )

        self.excluded_extract_ids = {'israel-and-palestine'}
        self.excluded_iso_codes = {'IL', 'PS'}

        self.wonder_keywords = [
            'great wall',
            'taj mahal',
            'machu picchu',
            'christ the redeemer',
            'christ redeemer',
            'colosseum',
            'petra',
            'chichen itza',
            'great pyramid',
            'giza',
        ]
        self.unesco_keywords = ['unesco', 'world heritage', 'heritage site']
        self.national_keywords = [
            'national monument',
            'national memorial',
            'national museum',
            'national gallery',
            'national park',
            'parliament',
            'capitol',
            'presidential',
            'royal palace',
            'state house',
        ]
        self.regional_keywords = [
            'regional park',
            'regional nature park',
            'provincial park',
            'state park',
            'nature reserve',
            'wildlife sanctuary',
            'protected landscape',
        ]
        self.semi_local_keywords = [
            'palace',
            'castle',
            'cathedral',
            'basilica',
            'abbey',
            'temple',
            'mosque',
            'synagogue',
            'shrine',
            'fortress',
            'citadel',
            'museum',
            'gallery',
            'opera',
            'theatre',
            'theater',
            'monument',
        ]

        if fresh:
            self.reset_progress()

        self.load_progress()

    def reset_progress(self):
        for path in [
            self.output_file,
            self.progress_file,
            self.failures_file,
            self.legacy_checkpoint_file,
        ]:
            if os.path.exists(path):
                os.remove(path)

        if os.path.isdir(self.download_dir):
            shutil.rmtree(self.download_dir)

    def load_progress(self):
        source_file = self.output_file
        if not os.path.exists(source_file) and os.path.exists(self.legacy_checkpoint_file):
            source_file = self.legacy_checkpoint_file

        if os.path.exists(source_file):
            with open(source_file, 'r', encoding='utf-8') as handle:
                self.landmarks = json.load(handle)

            for index, landmark in enumerate(self.landmarks):
                self.name_index[normalize_name(landmark['name'])].append(index)

            if self.landmarks:
                self.landmark_id = max(item['id'] for item in self.landmarks) + 1

        if os.path.exists(self.progress_file):
            with open(self.progress_file, 'r', encoding='utf-8') as handle:
                payload = json.load(handle)
            self.completed_sources = set(payload.get('completed_sources', []))
            self.failed_sources = payload.get('failed_sources', [])

        if self.landmarks or self.completed_sources:
            print(
                f"Resuming import: {len(self.landmarks)} landmarks already saved, "
                f"{len(self.completed_sources)} completed sources"
            )

    def save_progress(self, force: bool = False):
        if not force and len(self.completed_sources) % 2 != 0:
            return

        with open(self.output_file, 'w', encoding='utf-8') as handle:
            json.dump(self.landmarks, handle, indent=2, ensure_ascii=False)

        payload = {
            'completed_sources': sorted(self.completed_sources),
            'failed_sources': self.failed_sources,
            'landmark_count': len(self.landmarks),
            'next_landmark_id': self.landmark_id,
            'saved_at': time.strftime('%Y-%m-%d %H:%M:%S'),
        }
        with open(self.progress_file, 'w', encoding='utf-8') as handle:
            json.dump(payload, handle, indent=2, ensure_ascii=False)

        with open(self.failures_file, 'w', encoding='utf-8') as handle:
            json.dump(self.failed_sources, handle, indent=2, ensure_ascii=False)

    def throttle_requests(self):
        elapsed = time.time() - self.last_request_at
        if elapsed < self.request_pause_seconds:
            time.sleep(self.request_pause_seconds - elapsed)
        self.last_request_at = time.time()

    def fetch_json(self, url: str, params: Optional[dict] = None, cache_path: Optional[str] = None) -> dict:
        last_error = None
        for attempt in range(1, self.max_retries + 1):
            self.throttle_requests()
            try:
                response = self.session.get(url, params=params, timeout=(30, 180))
                if response.status_code == 200:
                    data = response.json()
                    if cache_path:
                        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
                        with open(cache_path, 'w', encoding='utf-8') as handle:
                            json.dump(data, handle, ensure_ascii=False)
                    return data

                last_error = f"HTTP {response.status_code}"
                if response.status_code in (429, 500, 502, 503, 504):
                    delay = attempt * 4
                    print(f"Retrying {url} after {last_error} (wait {delay}s)")
                    time.sleep(delay)
                    continue

                response.raise_for_status()
            except requests.RequestException as error:
                last_error = str(error)
                delay = attempt * 4
                print(f"Retrying {url} after request error (wait {delay}s): {error}")
                time.sleep(delay)

        if cache_path and os.path.exists(cache_path):
            print(f"Using cached data from {cache_path} after fetch failure: {last_error}")
            with open(cache_path, 'r', encoding='utf-8') as handle:
                return json.load(handle)

        raise RuntimeError(f"Failed to fetch {url}: {last_error}")

    def load_geofabrik_index(self):
        if self.feature_map:
            return

        data = self.fetch_json(GEOFABRIK_INDEX_URL, cache_path=self.index_cache_file)
        self.feature_map = {
            feature['properties']['id']: feature['properties']
            for feature in data.get('features', [])
        }

    def load_release_extracts(self) -> List[str]:
        with open(RELEASE_EXTRACTS_FILE, 'r', encoding='utf-8') as handle:
            return json.load(handle)

    def world_country_extract_ids(self) -> List[str]:
        self.load_geofabrik_index()
        extract_ids = []
        for props in self.feature_map.values():
            urls = props.get('urls', {})
            iso_codes = props.get('iso3166-1:alpha2', [])
            if not urls.get('pbf') or not iso_codes:
                continue
            if props['id'] in self.excluded_extract_ids:
                continue
            if any(code in self.excluded_iso_codes for code in iso_codes):
                continue
            extract_ids.append(props['id'])
        return sorted(set(extract_ids), key=lambda extract_id: self.feature_map[extract_id].get('name', extract_id))

    def resolve_extract_ids(self, scope: str, custom_extracts: Optional[Iterable[str]] = None) -> List[str]:
        self.load_geofabrik_index()

        if scope == 'release':
            extract_ids = self.load_release_extracts()
        elif scope == 'world':
            extract_ids = self.world_country_extract_ids()
        elif scope == 'custom':
            if not custom_extracts:
                raise ValueError('Custom scope requires --extracts.')
            extract_ids = [item.strip() for item in custom_extracts if item.strip()]
        else:
            raise ValueError(f'Unsupported scope: {scope}')

        missing = [extract_id for extract_id in extract_ids if extract_id not in self.feature_map]
        if missing:
            raise ValueError(f'Unknown Geofabrik extract ids: {", ".join(missing)}')

        return extract_ids

    def resolve_country_for_extract(self, extract_id: str) -> str:
        feature = self.feature_map.get(extract_id)
        if not feature:
            return extract_id.replace('-', ' ').title()

        if feature.get('iso3166-1:alpha2'):
            return feature.get('name', extract_id)

        if '/' in extract_id:
            root_id = extract_id.split('/')[0]
            root_feature = self.feature_map.get(root_id)
            if root_feature and root_feature.get('name'):
                return root_feature['name']

        parent_id = feature.get('parent')
        visited = set()
        while parent_id and parent_id not in visited:
            visited.add(parent_id)
            parent = self.feature_map.get(parent_id)
            if not parent:
                break
            if parent.get('iso3166-1:alpha2'):
                return parent.get('name', parent_id)
            parent_id = parent.get('parent')

        return feature.get('name', extract_id.split('/')[-1]).replace('-', ' ').title()

    def record_failure(self, stage: str, identifier: str, reason: str):
        self.failed_sources.append(
            {
                'stage': stage,
                'identifier': identifier,
                'reason': reason,
            }
        )
        self.save_progress(force=True)

    def download_extract(self, extract_id: str) -> str:
        self.load_geofabrik_index()
        feature = self.feature_map[extract_id]
        url = feature['urls']['pbf']
        filename = f"{extract_id.replace('/', '__')}.osm.pbf"
        destination = os.path.join(self.download_dir, filename)

        if os.path.exists(destination) and os.path.getsize(destination) > 0:
            return destination

        os.makedirs(self.download_dir, exist_ok=True)
        temporary = f"{destination}.part"

        last_error = None
        for attempt in range(1, self.max_retries + 1):
            self.throttle_requests()
            try:
                with self.session.get(url, stream=True, timeout=(30, 600)) as response:
                    response.raise_for_status()
                    with open(temporary, 'wb') as handle:
                        for chunk in response.iter_content(chunk_size=1024 * 1024):
                            if chunk:
                                handle.write(chunk)

                os.replace(temporary, destination)
                return destination
            except requests.RequestException as error:
                last_error = str(error)
                delay = attempt * 6
                print(f"Retrying download for {extract_id} after error (wait {delay}s): {error}")
                time.sleep(delay)

        raise RuntimeError(f"Failed to download {extract_id}: {last_error}")

    def is_blocked_region(self, lat: float, lng: float) -> bool:
        return 31 < lat < 33.5 and 34 < lng < 36

    def extract_name(self, tags: Dict[str, str]) -> str:
        for key in ('name', 'name:en', 'official_name', 'loc_name', 'alt_name'):
            value = tags.get(key)
            if value:
                cleaned = re.sub(r'\s+', ' ', value).strip()
                if len(cleaned) >= 3:
                    return cleaned
        return ''

    def is_interesting_tags(self, tags: Dict[str, str]) -> bool:
        tourism_values = {
            'attraction',
            'museum',
            'gallery',
            'castle',
            'monument',
            'viewpoint',
            'zoo',
            'aquarium',
            'theme_park',
            'artwork',
        }
        natural_values = {
            'peak',
            'volcano',
            'hot_spring',
            'geyser',
            'beach',
            'cave_entrance',
            'arch',
            'glacier',
            'spring',
            'waterfall',
            'cape',
            'bay',
            'rock',
        }
        leisure_values = {'nature_reserve', 'park', 'garden'}
        man_made_values = {'tower', 'lighthouse', 'observatory'}
        amenity_values = {'theatre', 'arts_centre', 'planetarium'}

        tourism = tags.get('tourism')
        natural = tags.get('natural')
        leisure = tags.get('leisure')
        man_made = tags.get('man_made')
        amenity = tags.get('amenity')
        boundary = tags.get('boundary')
        historic = tags.get('historic')
        heritage = tags.get('heritage')
        waterway = tags.get('waterway')

        if tourism in tourism_values:
            return True
        if historic and historic not in {'wayside_cross', 'memorial_plaque', 'boundary_stone'}:
            return True
        if natural in natural_values:
            return True
        if natural == 'water' and (tags.get('wikidata') or tags.get('wikipedia') or tags.get('tourism') == 'attraction'):
            return True
        if waterway == 'waterfall':
            return True
        if heritage:
            return True
        if leisure in leisure_values:
            return True
        if man_made in man_made_values:
            return True
        if amenity in amenity_values:
            return True
        if boundary == 'national_park':
            return True

        if amenity == 'place_of_worship':
            name = self.extract_name(tags).lower()
            worship_keywords = ['cathedral', 'basilica', 'abbey', 'temple', 'mosque', 'synagogue', 'shrine']
            return any(keyword in name for keyword in worship_keywords) or bool(tags.get('wikidata'))

        return False

    def classify_landmark(self, name: str, tags: Dict[str, str], source: str) -> str:
        name_lower = name.lower()

        if source == 'manual':
            return 'WONDER'

        if (
            tags.get('heritage') == 'world_heritage'
            or tags.get('unesco') == 'yes'
            or tags.get('heritage:operator', '').lower() == 'unesco'
            or tags.get('source:heritage', '').lower() == 'unesco'
            or any(keyword in name_lower for keyword in self.unesco_keywords)
        ):
            return 'UNESCO'

        if any(keyword in name_lower for keyword in self.wonder_keywords):
            return 'WONDER'

        if tags.get('boundary') == 'national_park':
            return 'NATIONAL'

        if any(keyword in name_lower for keyword in self.national_keywords):
            return 'NATIONAL'

        if tags.get('leisure') == 'nature_reserve':
            return 'REGIONAL'

        if any(keyword in name_lower for keyword in self.regional_keywords):
            return 'REGIONAL'

        if any(keyword in name_lower for keyword in self.semi_local_keywords):
            return 'SEMI_LOCAL'

        if tags.get('historic') in {'castle', 'palace', 'cathedral', 'fort', 'monument'}:
            return 'SEMI_LOCAL'

        if tags.get('tourism') in {'museum', 'gallery', 'castle', 'monument', 'attraction'}:
            return 'SEMI_LOCAL'

        if tags.get('wikidata') or tags.get('wikipedia'):
            return 'SEMI_LOCAL'

        return 'LOCAL'

    def build_landmark_record(
        self,
        *,
        name: str,
        lat: float,
        lng: float,
        landmark_type: str,
        country: str,
        source: str,
        source_id: Optional[str] = None,
        extract_id: Optional[str] = None,
        wikidata: Optional[str] = None,
    ) -> dict:
        record = {
            'id': self.landmark_id,
            'name': name,
            'lat': round(lat, 6),
            'lng': round(lng, 6),
            'type': landmark_type,
            'country': country or 'Unknown',
            'source': source,
        }
        if source_id:
            record['sourceId'] = source_id
        if extract_id:
            record['extractId'] = extract_id
        if wikidata:
            record['wikidata'] = wikidata
        return record

    def merge_or_add_landmark(self, record: dict) -> bool:
        normalized = normalize_name(record['name'])
        candidates = self.name_index.get(normalized, [])

        for candidate_index in candidates:
            existing = self.landmarks[candidate_index]
            distance = haversine_km(record['lat'], record['lng'], existing['lat'], existing['lng'])
            if distance > 5:
                continue

            if TYPE_PRIORITY[record['type']] > TYPE_PRIORITY[existing['type']]:
                existing['type'] = record['type']

            if existing.get('country') == 'Unknown' and record.get('country') != 'Unknown':
                existing['country'] = record['country']

            if SOURCE_PRIORITY[record['source']] > SOURCE_PRIORITY.get(existing.get('source', 'geofabrik'), 0):
                existing['source'] = record['source']
                existing['lat'] = record['lat']
                existing['lng'] = record['lng']
                if record.get('country'):
                    existing['country'] = record['country']
                if record.get('sourceId'):
                    existing['sourceId'] = record['sourceId']
                if record.get('wikidata'):
                    existing['wikidata'] = record['wikidata']

            for field in ('sourceId', 'extractId', 'wikidata'):
                if record.get(field) and not existing.get(field):
                    existing[field] = record[field]

            return False

        self.landmarks.append(record)
        self.name_index[normalized].append(len(self.landmarks) - 1)
        self.landmark_id += 1
        return True

    def country_from_tags(self, tags: Dict[str, str], fallback_country: str) -> str:
        for key in ('addr:country', 'is_in:country', 'country'):
            value = tags.get(key)
            if value:
                return value
        return fallback_country or 'Unknown'

    def extract_wikidata_id(self, uri_or_qid: Optional[str]) -> Optional[str]:
        if not uri_or_qid:
            return None
        if uri_or_qid.startswith('http'):
            return uri_or_qid.rstrip('/').split('/')[-1]
        return uri_or_qid

    def ingest_landmark(
        self,
        *,
        name: str,
        lat: float,
        lng: float,
        tags: Dict[str, str],
        country: str,
        source: str,
        source_id: Optional[str] = None,
        extract_id: Optional[str] = None,
        wikidata: Optional[str] = None,
    ) -> bool:
        if not name or self.is_blocked_region(lat, lng):
            return False

        landmark_type = self.classify_landmark(name, tags, source)
        record = self.build_landmark_record(
            name=name,
            lat=lat,
            lng=lng,
            landmark_type=landmark_type,
            country=country,
            source=source,
            source_id=source_id,
            extract_id=extract_id,
            wikidata=wikidata,
        )
        return self.merge_or_add_landmark(record)

    def centroid_from_node_refs(self, node_refs: Iterable) -> Optional[tuple]:
        lat_total = 0.0
        lon_total = 0.0
        count = 0
        for ref in node_refs:
            location = getattr(ref, 'location', None)
            if not location or not location.valid():
                continue
            lat_total += location.lat
            lon_total += location.lon
            count += 1

        if count == 0:
            return None
        return lat_total / count, lon_total / count

    def centroid_from_area(self, area) -> Optional[tuple]:
        lat_total = 0.0
        lon_total = 0.0
        count = 0
        for ring in area.outer_rings():
            for ref in ring:
                location = getattr(ref, 'location', None)
                if not location or not location.valid():
                    continue
                lat_total += location.lat
                lon_total += location.lon
                count += 1

        if count == 0:
            return None
        return lat_total / count, lon_total / count

    def require_osmium(self):
        if osmium is None:
            raise RuntimeError(
                "The Geofabrik importer requires the Python 'osmium' package. "
                "Install it with: python3 -m pip install osmium"
            )
        return osmium

    def import_geofabrik_extract(self, extract_id: str):
        self.require_osmium()
        stage_key = f"geofabrik:{extract_id}"
        if stage_key in self.completed_sources:
            print(f"Skipping completed extract {extract_id}")
            return

        feature = self.feature_map[extract_id]
        default_country = self.resolve_country_for_extract(extract_id)
        local_path = self.download_extract(extract_id)
        before_count = len(self.landmarks)
        importer = self

        class GeofabrikHandler(osmium.SimpleHandler):
            def __init__(self):
                super().__init__()
                self.added = 0

            def ingest(self, element_id: int, tags_view, coords: Optional[tuple], element_type: str):
                if coords is None:
                    return
                tags = dict(tags_view)
                if not importer.is_interesting_tags(tags):
                    return

                name = importer.extract_name(tags)
                if not name:
                    return

                country = importer.country_from_tags(tags, default_country)
                created = importer.ingest_landmark(
                    name=name,
                    lat=coords[0],
                    lng=coords[1],
                    tags=tags,
                    country=country,
                    source='geofabrik',
                    source_id=f"{element_type}:{element_id}",
                    extract_id=extract_id,
                    wikidata=tags.get('wikidata'),
                )
                if created:
                    self.added += 1

            def node(self, node):
                if not node.location.valid():
                    return
                self.ingest(node.id, node.tags, (node.location.lat, node.location.lon), 'node')

            def way(self, way):
                coords = importer.centroid_from_node_refs(way.nodes)
                self.ingest(way.id, way.tags, coords, 'way')

            def area(self, area):
                coords = importer.centroid_from_area(area)
                self.ingest(area.id, area.tags, coords, 'area')

        print(f"Importing Geofabrik extract {extract_id} from {feature['urls']['pbf']}")
        handler = GeofabrikHandler()
        try:
            handler.apply_file(local_path, locations=True)
        except Exception as error:
            self.record_failure('geofabrik', extract_id, str(error))
            raise

        self.completed_sources.add(stage_key)
        self.save_progress(force=True)
        print(
            f"Finished {extract_id}: +{len(self.landmarks) - before_count} net landmarks "
            f"({handler.added} new before merges)"
        )

    def import_geofabrik_bulk(self, extract_ids: List[str], max_extracts: Optional[int] = None):
        selected = extract_ids[:max_extracts] if max_extracts else extract_ids
        print(f"Importing {len(selected)} Geofabrik extracts...")
        for index, extract_id in enumerate(selected, start=1):
            print(f"\n[{index}/{len(selected)}] {extract_id}")
            try:
                self.import_geofabrik_extract(extract_id)
            except Exception as error:
                print(f"Failed extract {extract_id}: {error}")
                self.record_failure('geofabrik', extract_id, str(error))

    def import_unesco_sites(self):
        stage_key = 'wikidata:unesco'
        if stage_key in self.completed_sources:
            print('Skipping completed UNESCO import')
            return

        print('Importing UNESCO World Heritage Sites from Wikidata...')
        sparql_query = """
        SELECT ?site ?siteLabel ?coord ?countryLabel ?unescoId WHERE {
          ?site wdt:P1435 wd:Q9259;
                wdt:P625 ?coord.
          OPTIONAL { ?site wdt:P17 ?country. }
          OPTIONAL { ?site wdt:P757 ?unescoId. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
        """

        try:
            response = self.session.get(
                WIKIDATA_SPARQL_URL,
                params={'query': sparql_query, 'format': 'json'},
                headers={'User-Agent': 'QuestMarks/1.0 landmark importer (Wikidata UNESCO sync)'},
                timeout=(30, 180),
            )
            response.raise_for_status()
            data = response.json()

            added = 0
            for item in data.get('results', {}).get('bindings', []):
                name = item['siteLabel']['value']
                coords = item['coord']['value'].replace('Point(', '').replace(')', '').split()
                lng = float(coords[0])
                lat = float(coords[1])
                country = item.get('countryLabel', {}).get('value', 'Unknown')
                qid = self.extract_wikidata_id(item['site']['value'])
                unesco_id = item.get('unescoId', {}).get('value')
                created = self.ingest_landmark(
                    name=name,
                    lat=lat,
                    lng=lng,
                    tags={
                        'heritage': 'world_heritage',
                        'unesco': 'yes',
                        'wikidata': qid or '',
                    },
                    country=country,
                    source='wikidata',
                    source_id=unesco_id or qid,
                    wikidata=qid,
                )
                if created:
                    added += 1

            self.completed_sources.add(stage_key)
            self.save_progress(force=True)
            print(f"UNESCO import complete: {added} new landmarks merged in")
        except Exception as error:
            self.record_failure('wikidata', 'unesco', str(error))
            raise

    def import_wonders(self):
        stage_key = 'manual:wonders'
        if stage_key in self.completed_sources:
            print('Skipping completed wonders import')
            return

        print('Importing curated world wonders...')
        with open(WONDERS_FILE, 'r', encoding='utf-8') as handle:
            wonders = json.load(handle)

        added = 0
        for wonder in wonders:
            created = self.ingest_landmark(
                name=wonder['name'],
                lat=float(wonder['lat']),
                lng=float(wonder['lng']),
                tags={'wonder': 'yes'},
                country=wonder['country'],
                source='manual',
                source_id=wonder.get('slug'),
                wikidata=wonder.get('wikidata'),
            )
            if created:
                added += 1

        self.completed_sources.add(stage_key)
        self.save_progress(force=True)
        print(f"Wonders import complete: {added} new landmarks merged in")

    def export_to_json(self):
        self.landmarks.sort(key=lambda item: item['id'])
        self.save_progress(force=True)

        type_counts = defaultdict(int)
        country_counts = defaultdict(int)
        source_counts = defaultdict(int)
        for landmark in self.landmarks:
            type_counts[landmark['type']] += 1
            country_counts[landmark['country']] += 1
            source_counts[landmark.get('source', 'unknown')] += 1

        print("\n" + "=" * 64)
        print("QUESTMARKS LANDMARK IMPORT COMPLETE")
        print("=" * 64)
        print(f"Output file: {self.output_file}")
        print(f"Total landmarks: {len(self.landmarks)}")
        print("\nBy Type:")
        for key in ('LOCAL', 'SEMI_LOCAL', 'REGIONAL', 'NATIONAL', 'UNESCO', 'WONDER'):
            print(f"  {key}: {type_counts.get(key, 0)}")
        print("\nBy Source:")
        for source, count in sorted(source_counts.items()):
            print(f"  {source}: {count}")
        print(f"\nCountries covered: {len(country_counts)}")
        print("Top 10 countries by landmarks:")
        for country, count in sorted(country_counts.items(), key=lambda item: item[1], reverse=True)[:10]:
            print(f"  {country}: {count}")

        if self.failed_sources:
            print(f"\nFailures recorded: {len(self.failed_sources)}")
            print(f"See {self.failures_file}")

    def run_pipeline(
        self,
        *,
        scope: str,
        custom_extracts: Optional[List[str]] = None,
        max_extracts: Optional[int] = None,
        include_geofabrik: bool = True,
        include_unesco: bool = True,
        include_wonders: bool = True,
    ):
        print("=" * 64)
        print("QUESTMARKS LANDMARK IMPORTER")
        print("=" * 64)
        print("Bulk base: Geofabrik/OpenStreetMap country extracts")
        print("UNESCO supplement: Wikidata World Heritage query")
        print("Wonders supplement: curated local JSON")
        print("=" * 64)

        if include_geofabrik:
            extract_ids = self.resolve_extract_ids(scope, custom_extracts)
            print(f"Bulk scope '{scope}' resolved to {len(extract_ids)} extract(s)")
            self.import_geofabrik_bulk(extract_ids, max_extracts=max_extracts)

        if include_unesco:
            print("\nImporting UNESCO supplement...")
            self.import_unesco_sites()

        if include_wonders:
            print("\nImporting wonders supplement...")
            self.import_wonders()

        self.export_to_json()


def parse_args():
    parser = argparse.ArgumentParser(description='Build the QuestMarks landmark dataset.')
    parser.add_argument(
        '--scope',
        choices=['release', 'world', 'custom'],
        default='release',
        help='Bulk Geofabrik scope to import.',
    )
    parser.add_argument(
        '--extracts',
        default='',
        help='Comma-separated Geofabrik extract ids when using --scope custom.',
    )
    parser.add_argument(
        '--output',
        default=OUTPUT_FILE,
        help='Output JSON path for the merged landmark dataset.',
    )
    parser.add_argument(
        '--download-dir',
        default=DOWNLOAD_DIR,
        help='Directory for downloaded Geofabrik extracts.',
    )
    parser.add_argument(
        '--max-extracts',
        type=int,
        default=None,
        help='Limit the number of extracts processed. Useful for testing.',
    )
    parser.add_argument(
        '--fresh',
        action='store_true',
        help='Delete previous output/progress/download state before importing.',
    )
    parser.add_argument(
        '--skip-geofabrik',
        action='store_true',
        help='Skip the Geofabrik bulk stage.',
    )
    parser.add_argument(
        '--skip-unesco',
        action='store_true',
        help='Skip the Wikidata UNESCO supplement stage.',
    )
    parser.add_argument(
        '--skip-wonders',
        action='store_true',
        help='Skip the curated wonders supplement stage.',
    )
    return parser.parse_args()


if __name__ == '__main__':
    args = parse_args()
    custom_extracts = [item.strip() for item in args.extracts.split(',') if item.strip()]
    importer = QuestmarksLandmarkImporter(
        output_file=args.output,
        download_dir=args.download_dir,
        fresh=args.fresh,
    )
    importer.run_pipeline(
        scope=args.scope,
        custom_extracts=custom_extracts,
        max_extracts=args.max_extracts,
        include_geofabrik=not args.skip_geofabrik,
        include_unesco=not args.skip_unesco,
        include_wonders=not args.skip_wonders,
    )
