from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
from math import radians, cos, sin, asin, sqrt, exp
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app
app = FastAPI(title="Nirbhay - Safe Route Generator")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Data paths
DATA_DIR = ROOT_DIR / 'data'

# West Bengal district centroids (approximate)
WEST_BENGAL_DISTRICTS = {
    'Kolkata': {'lat': 22.5726, 'lng': 88.3639, 'urban': True},
    'North 24 Parganas': {'lat': 22.6175, 'lng': 88.4378, 'urban': True},
    'South 24 Parganas': {'lat': 22.1350, 'lng': 88.4031, 'urban': False},
    'Howrah': {'lat': 22.5958, 'lng': 88.2636, 'urban': True},
    'Hooghly': {'lat': 22.9006, 'lng': 88.3892, 'urban': False},
    'Bardhaman': {'lat': 23.2324, 'lng': 87.8615, 'urban': False},
    'Murshidabad': {'lat': 24.1860, 'lng': 88.2461, 'urban': False},
    'Medinipur West': {'lat': 22.4269, 'lng': 87.3193, 'urban': False},
    'Medinipur East': {'lat': 22.0201, 'lng': 87.9467, 'urban': False},
    'Nadia': {'lat': 23.4711, 'lng': 88.5565, 'urban': False},
    'Malda': {'lat': 25.0108, 'lng': 88.1411, 'urban': False},
    'Birbhum': {'lat': 23.8378, 'lng': 87.5550, 'urban': False},
    'Bankura': {'lat': 23.2324, 'lng': 87.0766, 'urban': False},
    'Purulia': {'lat': 23.3322, 'lng': 86.3650, 'urban': False},
    'Jalpaiguri': {'lat': 26.5167, 'lng': 88.7333, 'urban': False},
    'Darjeeling': {'lat': 27.0360, 'lng': 88.2627, 'urban': False},
    'Coochbehar': {'lat': 26.3452, 'lng': 89.4482, 'urban': False},
    'Alipurduar': {'lat': 26.4872, 'lng': 89.5227, 'urban': False},
    'Uttar Dinajpur': {'lat': 25.6220, 'lng': 88.1246, 'urban': False},
    'Dakshin Dinajpur': {'lat': 25.1661, 'lng': 88.7620, 'urban': False},
}

# Kolkata area bounds for focused view
KOLKATA_BOUNDS = {
    'north': 22.65,
    'south': 22.45,
    'east': 88.45,
    'west': 88.25
}

# Global data storage
crime_data = {}
population_data = {}
risk_scores = {}


def haversine(lon1, lat1, lon2, lat2):
    """Calculate the great circle distance between two points in km"""
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return 6371 * c


def load_crime_data():
    """Load and process crime data from CSV files"""
    global crime_data
    
    try:
        # Load 2014 data
        df_2014 = pd.read_csv(DATA_DIR / 'crime_2014.csv')
        df_2014_wb = df_2014[df_2014['States/UTs'].str.lower().str.contains('west bengal', na=False)]
        
        # Load 2015 data
        df_2015 = pd.read_csv(DATA_DIR / 'crime_2015.csv')
        df_2015_wb = df_2015[df_2015['State/ UT'].str.lower().str.contains('west bengal', na=False)]
        
        # Process 2014 data - aggregate total crimes per district
        crime_2014 = {}
        for _, row in df_2014_wb.iterrows():
            district = row['District'].strip()
            # Get total cognizable crimes or sum key columns
            total = row.get('Total Cognizable IPC crimes', 0)
            if pd.isna(total):
                total = 0
            crime_2014[district] = int(total)
        
        # Process 2015 data
        crime_2015 = {}
        for _, row in df_2015_wb.iterrows():
            district = str(row['District/ Area']).strip()
            total = row.get('Total Crimes against Women', 0)
            if pd.isna(total):
                total = 0
            crime_2015[district] = int(total)
        
        crime_data = {
            '2014': crime_2014,
            '2015': crime_2015
        }
        
        logger.info(f"Loaded crime data for {len(crime_2014)} districts (2014)")
        logger.info(f"Loaded crime data for {len(crime_2015)} districts (2015)")
        
    except Exception as e:
        logger.error(f"Error loading crime data: {e}")
        crime_data = {'2014': {}, '2015': {}}


def load_population_data():
    """Load population data from CSV"""
    global population_data
    
    try:
        df = pd.read_csv(DATA_DIR / 'population.csv')
        df_wb = df[df['state'].str.lower().str.contains('west bengal', na=False)]
        
        for _, row in df_wb.iterrows():
            district = row['district'].strip()
            population_data[district] = {
                'population': int(row['population']),
                'area_km2': float(row['area_km2'])
            }
        
        logger.info(f"Loaded population data for {len(population_data)} districts")
        
    except Exception as e:
        logger.error(f"Error loading population data: {e}")
        population_data = {}


def calculate_risk_scores():
    """Calculate projected 2025 crime risk scores for each district"""
    global risk_scores
    
    if not crime_data.get('2014'):
        return
    
    for district, info in WEST_BENGAL_DISTRICTS.items():
        # Find matching crime data (handle name variations)
        crime_count = 0
        for d, count in crime_data.get('2014', {}).items():
            if district.lower() in d.lower() or d.lower() in district.lower():
                crime_count = max(crime_count, count)
                break
        
        # Find matching population data
        pop_info = None
        for d, pinfo in population_data.items():
            if district.lower() in d.lower() or d.lower() in district.lower():
                pop_info = pinfo
                break
        
        # Calculate base risk (crime per 100k population)
        if pop_info and pop_info['population'] > 0:
            crime_per_capita = (crime_count / pop_info['population']) * 100000
            density = pop_info['population'] / pop_info['area_km2']
        else:
            crime_per_capita = crime_count / 50  # Estimate
            density = 1000  # Default density
        
        # Apply growth factor for 2025 projection
        growth_factor = 1.4 if info['urban'] else 1.15
        projected_risk = crime_per_capita * growth_factor
        
        # Apply density factor (higher density = higher risk)
        density_factor = min(1.5, max(0.8, density / 5000))
        projected_risk *= density_factor
        
        risk_scores[district] = {
            'lat': info['lat'],
            'lng': info['lng'],
            'risk': projected_risk,
            'urban': info['urban']
        }
    
    # Normalize risk scores to 0-1
    if risk_scores:
        max_risk = max(r['risk'] for r in risk_scores.values())
        min_risk = min(r['risk'] for r in risk_scores.values())
        risk_range = max_risk - min_risk if max_risk > min_risk else 1
        
        for district in risk_scores:
            normalized = (risk_scores[district]['risk'] - min_risk) / risk_range
            risk_scores[district]['normalized_risk'] = normalized
    
    logger.info(f"Calculated risk scores for {len(risk_scores)} districts")


def generate_heatmap_points():
    """Generate heatmap data points with risk propagation"""
    if not risk_scores:
        return []
    
    heatmap_points = []
    
    # Generate points around each district centroid with decay
    for district, data in risk_scores.items():
        lat, lng = data['lat'], data['lng']
        risk = data.get('normalized_risk', 0.5)
        
        # Add central point
        heatmap_points.append([lat, lng, risk])
        
        # Generate surrounding points with exponential decay
        alpha = 0.3  # Decay rate
        for radius in [0.01, 0.02, 0.03, 0.05, 0.08]:
            for angle in range(0, 360, 45):
                rad = radians(angle)
                new_lat = lat + radius * cos(rad)
                new_lng = lng + radius * sin(rad)
                
                # Apply exponential decay
                dist = radius * 111  # Approximate km
                decayed_risk = risk * exp(-alpha * dist)
                
                if decayed_risk > 0.05:  # Threshold
                    heatmap_points.append([new_lat, new_lng, decayed_risk])
    
    # Add interpolated points for smoother heatmap
    additional_points = []
    for i in range(len(heatmap_points)):
        for j in range(i + 1, min(i + 5, len(heatmap_points))):
            p1 = heatmap_points[i]
            p2 = heatmap_points[j]
            
            # Midpoint
            mid_lat = (p1[0] + p2[0]) / 2
            mid_lng = (p1[1] + p2[1]) / 2
            mid_risk = (p1[2] + p2[2]) / 2
            
            dist = haversine(p1[1], p1[0], p2[1], p2[0])
            if dist < 30:  # Only for nearby points
                additional_points.append([mid_lat, mid_lng, mid_risk * 0.7])
    
    heatmap_points.extend(additional_points)
    
    return heatmap_points


def get_point_risk(lat: float, lng: float) -> float:
    """Calculate risk score for a specific point based on nearby districts"""
    if not risk_scores:
        return 0.5
    
    total_weight = 0
    weighted_risk = 0
    
    for district, data in risk_scores.items():
        dist = haversine(lng, lat, data['lng'], data['lat'])
        
        if dist < 0.1:  # Very close
            return data.get('normalized_risk', 0.5)
        
        # Inverse distance weighting
        weight = 1 / (dist ** 2)
        total_weight += weight
        weighted_risk += weight * data.get('normalized_risk', 0.5)
    
    if total_weight > 0:
        return weighted_risk / total_weight
    
    return 0.5


def calculate_route_risk(coordinates: List[List[float]]) -> dict:
    """Calculate accumulated risk for a route"""
    if not coordinates:
        return {'risk_score': 0.5, 'total_risk': 0, 'high_risk_segments': 0}
    
    total_risk = 0
    high_risk_segments = 0
    
    # Sample points along the route
    sample_interval = max(1, len(coordinates) // 50)
    sampled_coords = coordinates[::sample_interval]
    
    for coord in sampled_coords:
        lng, lat = coord[0], coord[1]
        point_risk = get_point_risk(lat, lng)
        total_risk += point_risk
        
        if point_risk > 0.7:
            high_risk_segments += 1
    
    avg_risk = total_risk / len(sampled_coords) if sampled_coords else 0.5
    
    # Calculate safety score (inverse of risk)
    safety_score = max(0, min(100, int((1 - avg_risk) * 100)))
    
    return {
        'risk_score': round(avg_risk, 3),
        'safety_score': safety_score,
        'total_risk': round(total_risk, 3),
        'high_risk_segments': high_risk_segments,
        'sampled_points': len(sampled_coords)
    }


# Pydantic models
class RouteRequest(BaseModel):
    source_lat: float
    source_lng: float
    dest_lat: float
    dest_lng: float
    mode: Optional[str] = 'safest'  # 'safest' or 'fastest'


class RouteResponse(BaseModel):
    geometry: List[List[float]]
    distance: float
    duration: float
    safety_score: int
    risk_score: float
    high_risk_segments: int
    safety_level: str


class HeatmapResponse(BaseModel):
    points: List[List[float]]
    districts: dict


# API Endpoints
@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "data_loaded": bool(crime_data.get('2014')),
        "districts_count": len(risk_scores),
        "population_loaded": bool(population_data)
    }


@api_router.get("/heatmap")
async def get_heatmap():
    """Return heatmap data points"""
    if not risk_scores:
        calculate_risk_scores()
    
    points = generate_heatmap_points()
    
    # Return district info for legend
    districts_info = {}
    for district, data in risk_scores.items():
        districts_info[district] = {
            'lat': data['lat'],
            'lng': data['lng'],
            'risk': round(data.get('normalized_risk', 0.5), 2),
            'urban': data['urban']
        }
    
    return {
        "points": points,
        "districts": districts_info,
        "bounds": KOLKATA_BOUNDS
    }


@api_router.post("/route/safe")
async def find_safe_route(request: RouteRequest):
    """Find the safest route between two points using OSRM"""
    
    try:
        # Call OSRM public API for driving routes with alternatives
        osrm_url = (
            f"http://router.project-osrm.org/route/v1/driving/"
            f"{request.source_lng},{request.source_lat};"
            f"{request.dest_lng},{request.dest_lat}"
            f"?overview=full&geometries=geojson&alternatives=3"
        )
        
        response = requests.get(osrm_url, timeout=10)
        
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="OSRM service unavailable")
        
        data = response.json()
        
        if data.get('code') != 'Ok' or not data.get('routes'):
            raise HTTPException(status_code=404, detail="No route found")
        
        # Calculate risk for each route
        routes_with_risk = []
        
        for route in data['routes']:
            coordinates = route['geometry']['coordinates']
            distance = route['distance'] / 1000  # Convert to km
            duration = route['duration'] / 60  # Convert to minutes
            
            risk_data = calculate_route_risk(coordinates)
            
            # Determine safety level
            safety_score = risk_data['safety_score']
            if safety_score >= 70:
                safety_level = 'safe'
            elif safety_score >= 40:
                safety_level = 'moderate'
            else:
                safety_level = 'danger'
            
            routes_with_risk.append({
                'geometry': coordinates,
                'distance': round(distance, 2),
                'duration': round(duration, 1),
                'safety_score': safety_score,
                'risk_score': risk_data['risk_score'],
                'high_risk_segments': risk_data['high_risk_segments'],
                'safety_level': safety_level
            })
        
        # Sort by mode preference
        if request.mode == 'safest':
            routes_with_risk.sort(key=lambda x: x['safety_score'], reverse=True)
        else:  # fastest
            routes_with_risk.sort(key=lambda x: x['duration'])
        
        # Return the best route based on mode
        best_route = routes_with_risk[0]
        
        return {
            "route": best_route,
            "alternatives": routes_with_risk[1:] if len(routes_with_risk) > 1 else []
        }
        
    except requests.RequestException as e:
        logger.error(f"OSRM request failed: {e}")
        raise HTTPException(status_code=502, detail="Routing service unavailable")


@api_router.get("/districts")
async def get_districts():
    """Return district data with risk scores"""
    if not risk_scores:
        calculate_risk_scores()
    
    return {
        "districts": [
            {
                "name": name,
                "lat": data['lat'],
                "lng": data['lng'],
                "risk": round(data.get('normalized_risk', 0.5), 2),
                "urban": data['urban']
            }
            for name, data in risk_scores.items()
        ]
    }


@api_router.post("/geocode")
async def geocode_location(query: str):
    """Geocode a location name using Nominatim"""
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                'q': f"{query}, West Bengal, India",
                'format': 'json',
                'limit': 5
            },
            headers={'User-Agent': 'Nirbhay-SafeRoute/1.0'},
            timeout=10
        )
        
        if response.status_code == 200:
            results = response.json()
            return {
                "results": [
                    {
                        "name": r.get('display_name', ''),
                        "lat": float(r['lat']),
                        "lng": float(r['lon'])
                    }
                    for r in results
                ]
            }
        
        return {"results": []}
        
    except Exception as e:
        logger.error(f"Geocoding failed: {e}")
        return {"results": []}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Load data on startup"""
    logger.info("Starting Nirbhay backend...")
    load_crime_data()
    load_population_data()
    calculate_risk_scores()
    logger.info("Nirbhay backend ready!")
