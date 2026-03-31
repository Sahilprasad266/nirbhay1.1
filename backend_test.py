#!/usr/bin/env python3
"""
Backend API Testing for Nirbhay Safe Route Generator
Tests all backend endpoints for functionality and data integrity
"""

import requests
import sys
import json
from datetime import datetime

class NirbhayAPITester:
    def __init__(self, base_url="https://safety-heatmap-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", expected="", actual=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name}")
            if details:
                print(f"   Details: {details}")
            if expected:
                print(f"   Expected: {expected}")
            if actual:
                print(f"   Actual: {actual}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "expected": expected,
            "actual": actual
        })

    def test_health_endpoint(self):
        """Test /api/health endpoint"""
        print("\n🔍 Testing Health Check Endpoint...")
        
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ['status', 'data_loaded', 'districts_count', 'population_loaded']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test(
                        "Health endpoint structure", 
                        False, 
                        f"Missing fields: {missing_fields}",
                        str(required_fields),
                        str(list(data.keys()))
                    )
                else:
                    self.log_test("Health endpoint structure", True)
                
                # Check status
                if data.get('status') == 'healthy':
                    self.log_test("Health status", True)
                else:
                    self.log_test("Health status", False, f"Status: {data.get('status')}")
                
                # Check data loading
                if data.get('data_loaded'):
                    self.log_test("Crime data loaded", True)
                else:
                    self.log_test("Crime data loaded", False, "Crime data not loaded")
                
                # Check districts count
                districts_count = data.get('districts_count', 0)
                if districts_count >= 20:  # West Bengal has 20 districts
                    self.log_test("Districts count", True, f"Found {districts_count} districts")
                else:
                    self.log_test("Districts count", False, f"Only {districts_count} districts found", ">=20", str(districts_count))
                
                return data
                
            else:
                self.log_test("Health endpoint status", False, f"HTTP {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test("Health endpoint connection", False, str(e))
            return None

    def test_heatmap_endpoint(self):
        """Test /api/heatmap endpoint"""
        print("\n🔍 Testing Heatmap Endpoint...")
        
        try:
            response = requests.get(f"{self.api_url}/heatmap", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check structure
                required_fields = ['points', 'districts', 'bounds']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test(
                        "Heatmap structure", 
                        False, 
                        f"Missing fields: {missing_fields}"
                    )
                else:
                    self.log_test("Heatmap structure", True)
                
                # Check points data
                points = data.get('points', [])
                if len(points) > 0:
                    self.log_test("Heatmap points", True, f"Found {len(points)} heatmap points")
                    
                    # Validate point structure [lat, lng, intensity]
                    valid_points = 0
                    for point in points[:10]:  # Check first 10 points
                        if (isinstance(point, list) and len(point) == 3 and 
                            all(isinstance(x, (int, float)) for x in point)):
                            valid_points += 1
                    
                    if valid_points == min(10, len(points)):
                        self.log_test("Heatmap point format", True)
                    else:
                        self.log_test("Heatmap point format", False, f"Invalid point format detected")
                else:
                    self.log_test("Heatmap points", False, "No heatmap points found")
                
                # Check districts data
                districts = data.get('districts', {})
                if len(districts) >= 20:
                    self.log_test("Districts data", True, f"Found {len(districts)} districts")
                    
                    # Check district structure
                    sample_district = next(iter(districts.values())) if districts else {}
                    required_district_fields = ['lat', 'lng', 'risk', 'urban']
                    missing_district_fields = [field for field in required_district_fields if field not in sample_district]
                    
                    if not missing_district_fields:
                        self.log_test("District data structure", True)
                    else:
                        self.log_test("District data structure", False, f"Missing: {missing_district_fields}")
                else:
                    self.log_test("Districts data", False, f"Only {len(districts)} districts found")
                
                # Check bounds
                bounds = data.get('bounds', {})
                required_bounds = ['north', 'south', 'east', 'west']
                if all(bound in bounds for bound in required_bounds):
                    self.log_test("Map bounds", True)
                else:
                    self.log_test("Map bounds", False, "Missing bounds data")
                
                return data
                
            else:
                self.log_test("Heatmap endpoint status", False, f"HTTP {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test("Heatmap endpoint connection", False, str(e))
            return None

    def test_route_endpoint(self):
        """Test /api/route/safe endpoint"""
        print("\n🔍 Testing Safe Route Endpoint...")
        
        # Test coordinates in Kolkata area
        test_routes = [
            {
                "name": "Kolkata Central to Salt Lake",
                "source_lat": 22.5726,
                "source_lng": 88.3639,
                "dest_lat": 22.5675,
                "dest_lng": 88.4378,
                "mode": "safest"
            },
            {
                "name": "Park Street to Howrah",
                "source_lat": 22.5448,
                "source_lng": 88.3426,
                "dest_lat": 22.5958,
                "dest_lng": 88.2636,
                "mode": "fastest"
            }
        ]
        
        for route_test in test_routes:
            try:
                payload = {
                    "source_lat": route_test["source_lat"],
                    "source_lng": route_test["source_lng"],
                    "dest_lat": route_test["dest_lat"],
                    "dest_lng": route_test["dest_lng"],
                    "mode": route_test["mode"]
                }
                
                response = requests.post(
                    f"{self.api_url}/route/safe", 
                    json=payload, 
                    timeout=20
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check response structure
                    if 'route' in data:
                        route = data['route']
                        required_route_fields = ['geometry', 'distance', 'duration', 'safety_score', 'risk_score', 'safety_level']
                        missing_fields = [field for field in required_route_fields if field not in route]
                        
                        if not missing_fields:
                            self.log_test(f"Route structure ({route_test['name']})", True)
                            
                            # Validate route data
                            geometry = route.get('geometry', [])
                            if len(geometry) > 0:
                                self.log_test(f"Route geometry ({route_test['name']})", True, f"{len(geometry)} coordinates")
                            else:
                                self.log_test(f"Route geometry ({route_test['name']})", False, "No geometry data")
                            
                            # Check safety score
                            safety_score = route.get('safety_score', 0)
                            if 0 <= safety_score <= 100:
                                self.log_test(f"Safety score ({route_test['name']})", True, f"Score: {safety_score}/100")
                            else:
                                self.log_test(f"Safety score ({route_test['name']})", False, f"Invalid score: {safety_score}")
                            
                            # Check safety level
                            safety_level = route.get('safety_level')
                            if safety_level in ['safe', 'moderate', 'danger']:
                                self.log_test(f"Safety level ({route_test['name']})", True, f"Level: {safety_level}")
                            else:
                                self.log_test(f"Safety level ({route_test['name']})", False, f"Invalid level: {safety_level}")
                        else:
                            self.log_test(f"Route structure ({route_test['name']})", False, f"Missing: {missing_fields}")
                    else:
                        self.log_test(f"Route response ({route_test['name']})", False, "No route in response")
                        
                else:
                    self.log_test(f"Route endpoint ({route_test['name']})", False, f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"Route endpoint ({route_test['name']})", False, str(e))

    def test_districts_endpoint(self):
        """Test /api/districts endpoint"""
        print("\n🔍 Testing Districts Endpoint...")
        
        try:
            response = requests.get(f"{self.api_url}/districts", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'districts' in data:
                    districts = data['districts']
                    if len(districts) >= 20:
                        self.log_test("Districts endpoint", True, f"Found {len(districts)} districts")
                        
                        # Check district structure
                        if districts:
                            sample = districts[0]
                            required_fields = ['name', 'lat', 'lng', 'risk', 'urban']
                            missing_fields = [field for field in required_fields if field not in sample]
                            
                            if not missing_fields:
                                self.log_test("District structure", True)
                            else:
                                self.log_test("District structure", False, f"Missing: {missing_fields}")
                    else:
                        self.log_test("Districts endpoint", False, f"Only {len(districts)} districts")
                else:
                    self.log_test("Districts endpoint", False, "No districts in response")
                    
            else:
                self.log_test("Districts endpoint status", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Districts endpoint connection", False, str(e))

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Nirbhay Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test all endpoints
        health_data = self.test_health_endpoint()
        heatmap_data = self.test_heatmap_endpoint()
        self.test_route_endpoint()
        self.test_districts_endpoint()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['test']}")
                if test['details']:
                    print(f"    {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = NirbhayAPITester()
    success = tester.run_all_tests()
    
    # Save results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "failed_tests": tester.tests_run - tester.tests_passed,
        "success_rate": (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0,
        "test_details": tester.test_results
    }
    
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Results saved to: /app/backend_test_results.json")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())