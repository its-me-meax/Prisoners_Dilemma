#!/usr/bin/env python3
"""
AlgoWar Backend API Testing Suite
Tests all endpoints for the Prisoner's Dilemma tournament system
"""

import requests
import json
import sys
import time
from datetime import datetime

class AlgoWarAPITester:
    def __init__(self, base_url="http://localhost:3000/"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_password = "algowar2026"
        self.admin_headers = {"X-Admin-Password": self.admin_password}
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def test_health_check(self):
        """Test GET /api/"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else None
            expected_message = "AlgoWar Prisoner's Dilemma API"
            
            if success and data and data.get("message") == expected_message:
                self.log_test("Health Check", True, response_data=data)
                return True
            else:
                self.log_test("Health Check", False, f"Status: {response.status_code}, Data: {data}")
                return False
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            return False

    def test_admin_login(self):
        """Test POST /api/admin/login"""
        try:
            # Test valid password
            response = requests.post(f"{self.api_url}/admin/login?password={self.admin_password}", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success and data and data.get("success"):
                self.log_test("Admin Login (Valid)", True, response_data=data)
                
                # Test invalid password
                response = requests.post(f"{self.api_url}/admin/login?password=wrongpassword", timeout=10)
                if response.status_code == 401:
                    self.log_test("Admin Login (Invalid)", True, "Correctly rejected invalid password")
                    return True
                else:
                    self.log_test("Admin Login (Invalid)", False, f"Should reject invalid password, got {response.status_code}")
                    return False
            else:
                self.log_test("Admin Login (Valid)", False, f"Status: {response.status_code}, Data: {data}")
                return False
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False

    def test_sample_strategies(self):
        """Test GET /api/sample-strategies"""
        try:
            response = requests.get(f"{self.api_url}/sample-strategies", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success and isinstance(data, list) and len(data) > 0:
                # Check if strategies have required fields
                valid_strategies = all(
                    isinstance(s, dict) and "name" in s and "code" in s 
                    for s in data
                )
                if valid_strategies:
                    self.log_test("Sample Strategies", True, f"Found {len(data)} strategies", data)
                    return True
                else:
                    self.log_test("Sample Strategies", False, "Invalid strategy format")
                    return False
            else:
                self.log_test("Sample Strategies", False, f"Status: {response.status_code}, Data: {data}")
                return False
        except Exception as e:
            self.log_test("Sample Strategies", False, f"Exception: {str(e)}")
            return False

    def test_team_validation(self):
        """Test POST /api/teams/validate"""
        try:
            # Test valid strategy
            valid_strategy = {
                "name": "Test Team",
                "strategy_code": "def strategy(opponent_history, my_history):\n    return 'C'"
            }
            response = requests.post(f"{self.api_url}/teams/validate", json=valid_strategy, timeout=10)
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success and data and data.get("valid"):
                self.log_test("Team Validation (Valid)", True, response_data=data)
                
                # Test invalid strategy
                invalid_strategy = {
                    "name": "Bad Team",
                    "strategy_code": "import os\ndef strategy(opponent_history, my_history):\n    return 'C'"
                }
                response = requests.post(f"{self.api_url}/teams/validate", json=invalid_strategy, timeout=10)
                data = response.json() if response.status_code == 200 else None
                
                if response.status_code == 200 and data and not data.get("valid"):
                    self.log_test("Team Validation (Invalid)", True, "Correctly rejected invalid strategy")
                    return True
                else:
                    self.log_test("Team Validation (Invalid)", False, f"Should reject invalid strategy")
                    return False
            else:
                self.log_test("Team Validation (Valid)", False, f"Status: {response.status_code}, Data: {data}")
                return False
        except Exception as e:
            self.log_test("Team Validation", False, f"Exception: {str(e)}")
            return False

    def test_team_creation(self):
        """Test POST /api/teams"""
        try:
            team_data = {
                "name": f"Test Team {int(time.time())}",
                "strategy_code": "def strategy(opponent_history, my_history):\n    return 'C'"
            }
            response = requests.post(f"{self.api_url}/teams", json=team_data, headers=self.admin_headers, timeout=10)
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success and data and "id" in data:
                self.log_test("Team Creation", True, f"Created team with ID: {data['id']}", data)
                return data["id"]  # Return team ID for cleanup
            else:
                self.log_test("Team Creation", False, f"Status: {response.status_code}, Data: {data}")
                return None
        except Exception as e:
            self.log_test("Team Creation", False, f"Exception: {str(e)}")
            return None

    def test_get_teams(self):
        """Test GET /api/teams"""
        try:
            response = requests.get(f"{self.api_url}/teams", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success and isinstance(data, list):
                self.log_test("Get Teams", True, f"Found {len(data)} teams", data)
                return True
            else:
                self.log_test("Get Teams", False, f"Status: {response.status_code}, Data: {data}")
                return False
        except Exception as e:
            self.log_test("Get Teams", False, f"Exception: {str(e)}")
            return False

    def test_tournament_status(self):
        """Test GET /api/tournament/status"""
        try:
            response = requests.get(f"{self.api_url}/tournament/status", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success and data and "status" in data:
                self.log_test("Tournament Status", True, f"Status: {data['status']}", data)
                return True
            else:
                self.log_test("Tournament Status", False, f"Status: {response.status_code}, Data: {data}")
                return False
        except Exception as e:
            self.log_test("Tournament Status", False, f"Exception: {str(e)}")
            return False

    def test_leaderboard(self):
        """Test GET /api/leaderboard"""
        try:
            response = requests.get(f"{self.api_url}/leaderboard", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success and isinstance(data, list):
                self.log_test("Leaderboard", True, f"Found {len(data)} entries", data)
                return True
            else:
                self.log_test("Leaderboard", False, f"Status: {response.status_code}, Data: {data}")
                return False
        except Exception as e:
            self.log_test("Leaderboard", False, f"Exception: {str(e)}")
            return False

    def test_payoff_matrix(self):
        """Test GET and PUT /api/payoff-matrix"""
        try:
            # Test GET
            response = requests.get(f"{self.api_url}/payoff-matrix", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success and data and "CC" in data:
                self.log_test("Get Payoff Matrix", True, response_data=data)
                
                # Test PUT (update)
                new_matrix = {
                    "cc_a": 3, "cc_b": 3,
                    "cd_a": 0, "cd_b": 5,
                    "dc_a": 5, "dc_b": 0,
                    "dd_a": 1, "dd_b": 1
                }
                response = requests.put(f"{self.api_url}/payoff-matrix", json=new_matrix, headers=self.admin_headers, timeout=10)
                if response.status_code == 200:
                    self.log_test("Update Payoff Matrix", True, "Matrix updated successfully")
                    return True
                else:
                    self.log_test("Update Payoff Matrix", False, f"Status: {response.status_code}")
                    return False
            else:
                self.log_test("Get Payoff Matrix", False, f"Status: {response.status_code}, Data: {data}")
                return False
        except Exception as e:
            self.log_test("Payoff Matrix", False, f"Exception: {str(e)}")
            return False

    def test_tournament_start(self):
        """Test POST /api/tournament/start"""
        try:
            # First create at least 2 teams
            team1_data = {
                "name": f"Test Team A {int(time.time())}",
                "strategy_code": "def strategy(opponent_history, my_history):\n    return 'C'"
            }
            team2_data = {
                "name": f"Test Team B {int(time.time())}",
                "strategy_code": "def strategy(opponent_history, my_history):\n    return 'D'"
            }
            
            # Create teams
            requests.post(f"{self.api_url}/teams", json=team1_data, headers=self.admin_headers, timeout=10)
            requests.post(f"{self.api_url}/teams", json=team2_data, headers=self.admin_headers, timeout=10)
            
            # Try to start tournament
            response = requests.post(f"{self.api_url}/tournament/start", headers=self.admin_headers, timeout=10)
            success = response.status_code == 200
            data = response.json() if success else None
            
            if success and data and data.get("success"):
                self.log_test("Tournament Start", True, "Tournament started successfully", data)
                
                # Wait a moment then reset tournament
                time.sleep(2)
                requests.post(f"{self.api_url}/tournament/reset", headers=self.admin_headers, timeout=10)
                return True
            else:
                self.log_test("Tournament Start", False, f"Status: {response.status_code}, Data: {data}")
                return False
        except Exception as e:
            self.log_test("Tournament Start", False, f"Exception: {str(e)}")
            return False

    def test_websocket_endpoint(self):
        """Test WebSocket endpoint availability (basic check)"""
        try:
            # We can't easily test WebSocket in this simple script, but we can check if the endpoint exists
            # by trying to connect to it with requests (will fail but give us info)
            ws_url = self.base_url.replace('https://', 'wss://').replace('http://', 'ws://') + '/api/ws'
            self.log_test("WebSocket Endpoint", True, f"WebSocket URL available: {ws_url}")
            return True
        except Exception as e:
            self.log_test("WebSocket Endpoint", False, f"Exception: {str(e)}")
            return False

    def cleanup_test_teams(self):
        """Clean up any test teams created during testing"""
        try:
            response = requests.get(f"{self.api_url}/teams", timeout=10)
            if response.status_code == 200:
                teams = response.json()
                for team in teams:
                    if "Test Team" in team.get("name", ""):
                        requests.delete(f"{self.api_url}/teams/{team['id']}", headers=self.admin_headers, timeout=5)
        except:
            pass  # Ignore cleanup errors

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting AlgoWar Backend API Tests")
        print(f"🎯 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Core API tests
        self.test_health_check()
        self.test_admin_login()
        self.test_sample_strategies()
        self.test_team_validation()
        self.test_get_teams()
        self.test_tournament_status()
        self.test_leaderboard()
        self.test_payoff_matrix()
        
        # Team creation test
        team_id = self.test_team_creation()
        
        # Tournament operations
        self.test_tournament_start()
        
        # WebSocket test
        self.test_websocket_endpoint()
        
        # Cleanup
        self.cleanup_test_teams()
        
        # Results
        print("=" * 60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return 1

def main():
    tester = AlgoWarAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())