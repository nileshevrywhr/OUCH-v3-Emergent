#!/usr/bin/env python3
"""
Backend API Testing Script for Expense Type Analytics
Focus: Testing the new GET /api/analytics/expense-types/{year}/{month} endpoint
"""

import requests
import json
from datetime import datetime, date
import uuid
import sys

# Get backend URL from backend .env or use fallback
def get_backend_url():
    try:
        # Try to read from frontend .env first
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL=') or line.startswith('REACT_APP_BACKEND_URL='):
                    base_url = line.split('=')[1].strip().strip('"')
                    return f"{base_url}/api"
    except Exception:
        pass
    
    # Fallback to localhost
    return "http://localhost:8001/api"

BASE_URL = get_backend_url()
print(f"🚀 Testing Expense Type Analytics at: {BASE_URL}")

class ExpenseAnalyticsTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_results = []
        self.created_transactions = []
        self.categories = []
        
    def log_test(self, test_name: str, success: bool, message: str, details=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        })
    
    def test_api_connection(self):
        """Test basic API connectivity"""
        try:
            response = self.session.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                self.log_test("API Connection", True, "API is accessible")
                return True
            else:
                self.log_test("API Connection", False, f"API returned status {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Connection", False, f"Connection failed: {str(e)}")
            return False
    
    def get_categories(self):
        """Get available categories for testing"""
        try:
            response = self.session.get(f"{self.base_url}/categories", timeout=10)
            if response.status_code == 200:
                self.categories = response.json()
                self.log_test("Get Categories", True, f"Retrieved {len(self.categories)} categories")
                return True
            else:
                self.log_test("Get Categories", False, f"Failed to get categories: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Get Categories", False, f"Error getting categories: {str(e)}")
            return False
    
    def create_sample_expense_transactions(self):
        """Create sample expense transactions with different expense types"""
        if not self.categories:
            self.log_test("Create Sample Transactions", False, "No categories available")
            return False
        
        # Get current date for testing
        current_date = date.today()
        
        # Sample transactions with different expense types
        sample_transactions = [
            {
                "amount": 5000.0,
                "category_id": self.categories[0]["id"],  # Rent
                "category_name": self.categories[0]["name"],
                "transaction_type": "expense",
                "expense_type": "need",
                "description": "Monthly rent payment",
                "currency": "INR",
                "transaction_date": current_date.isoformat(),
                "is_voice_input": False
            },
            {
                "amount": 1500.0,
                "category_id": self.categories[3]["id"] if len(self.categories) > 3 else self.categories[0]["id"],  # Groceries
                "category_name": self.categories[3]["name"] if len(self.categories) > 3 else self.categories[0]["name"],
                "transaction_type": "expense",
                "expense_type": "need",
                "description": "Weekly groceries",
                "currency": "INR",
                "transaction_date": current_date.isoformat(),
                "is_voice_input": False
            },
            {
                "amount": 2000.0,
                "category_id": self.categories[4]["id"] if len(self.categories) > 4 else self.categories[0]["id"],  # Eating Out
                "category_name": self.categories[4]["name"] if len(self.categories) > 4 else self.categories[0]["name"],
                "transaction_type": "expense",
                "expense_type": "want",
                "description": "Restaurant dinner",
                "currency": "INR",
                "transaction_date": current_date.isoformat(),
                "is_voice_input": False
            },
            {
                "amount": 800.0,
                "category_id": self.categories[2]["id"] if len(self.categories) > 2 else self.categories[0]["id"],  # Travel
                "category_name": self.categories[2]["name"] if len(self.categories) > 2 else self.categories[0]["name"],
                "transaction_type": "expense",
                "expense_type": "want",
                "description": "Weekend trip",
                "currency": "INR",
                "transaction_date": current_date.isoformat(),
                "is_voice_input": False
            },
            {
                "amount": 10000.0,
                "category_id": self.categories[1]["id"] if len(self.categories) > 1 else self.categories[0]["id"],  # EMI
                "category_name": self.categories[1]["name"] if len(self.categories) > 1 else self.categories[0]["name"],
                "transaction_type": "expense",
                "expense_type": "investment",
                "description": "SIP investment",
                "currency": "INR",
                "transaction_date": current_date.isoformat(),
                "is_voice_input": False
            }
        ]
        
        created_count = 0
        for i, transaction_data in enumerate(sample_transactions):
            try:
                response = self.session.post(f"{self.base_url}/transactions", 
                                           json=transaction_data, 
                                           timeout=10)
                
                if response.status_code == 200:
                    transaction = response.json()
                    self.created_transactions.append(transaction["id"])
                    created_count += 1
                else:
                    self.log_test(f"Create Sample Transaction {i+1}", False, 
                                f"Failed: {response.status_code} - {response.text}")
            except Exception as e:
                self.log_test(f"Create Sample Transaction {i+1}", False, f"Error: {str(e)}")
        
        if created_count == len(sample_transactions):
            self.log_test("Create Sample Transactions", True, 
                        f"Created {created_count} sample expense transactions")
            return True
        else:
            self.log_test("Create Sample Transactions", False, 
                        f"Only created {created_count}/{len(sample_transactions)} transactions")
            return False
    
    def test_expense_type_analytics_current_month(self):
        """Test the new expense type analytics endpoint with current month data"""
        current_date = date.today()
        year = current_date.year
        month = current_date.month
        
        try:
            response = self.session.get(f"{self.base_url}/analytics/expense-types/{year}/{month}", 
                                      timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response format
                required_fields = ["month", "year", "total_expenses", "expense_types"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Expense Type Analytics Format", False, 
                                f"Missing fields: {missing_fields}")
                    return False
                
                # Verify month and year
                if data["month"] != month or data["year"] != year:
                    self.log_test("Expense Type Analytics Date", False, 
                                f"Expected {year}/{month}, got {data['year']}/{data['month']}")
                    return False
                
                # Verify expense_types structure
                expense_types = data["expense_types"]
                if not isinstance(expense_types, list):
                    self.log_test("Expense Types Structure", False, "expense_types should be a list")
                    return False
                
                # Verify each expense type has required fields
                for expense_type in expense_types:
                    required_type_fields = ["type", "amount", "count", "percentage"]
                    missing_type_fields = [field for field in required_type_fields if field not in expense_type]
                    
                    if missing_type_fields:
                        self.log_test("Expense Type Fields", False, 
                                    f"Missing fields in expense type: {missing_type_fields}")
                        return False
                
                self.log_test("Expense Type Analytics Current Month", True, 
                            f"Retrieved analytics for {year}/{month} with {len(expense_types)} expense types")
                
                # Log details for verification
                details = {
                    "total_expenses": data["total_expenses"],
                    "expense_types": expense_types
                }
                self.log_test("Analytics Details", True, 
                            f"Total expenses: ₹{data['total_expenses']}", details)
                
                return data
            else:
                self.log_test("Expense Type Analytics Current Month", False, 
                            f"Failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            self.log_test("Expense Type Analytics Current Month", False, f"Error: {str(e)}")
            return None
    
    def test_percentage_calculation(self, analytics_data):
        """Test that percentages add up correctly"""
        if not analytics_data:
            self.log_test("Percentage Calculation", False, "No analytics data available")
            return False
        
        expense_types = analytics_data.get("expense_types", [])
        if not expense_types:
            self.log_test("Percentage Calculation", True, "No expense types to calculate percentages for")
            return True
        
        total_percentage = sum(expense_type["percentage"] for expense_type in expense_types)
        
        # Allow for small rounding differences (within 0.1%)
        if abs(total_percentage - 100.0) <= 0.1:
            self.log_test("Percentage Calculation", True, 
                        f"Percentages add up correctly: {total_percentage}%")
            return True
        else:
            self.log_test("Percentage Calculation", False, 
                        f"Percentages don't add up to 100%: {total_percentage}%")
            return False
    
    def test_expense_type_analytics_empty_month(self):
        """Test expense type analytics with no data (future month)"""
        # Use a future month that should have no data
        year = 2025
        month = 12
        
        try:
            response = self.session.get(f"{self.base_url}/analytics/expense-types/{year}/{month}", 
                                      timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data["total_expenses"] == 0 and len(data["expense_types"]) == 0:
                    self.log_test("Expense Type Analytics Empty Month", True, 
                                f"Correctly returned empty data for {year}/{month}")
                    return True
                else:
                    self.log_test("Expense Type Analytics Empty Month", False, 
                                f"Expected empty data but got: total={data['total_expenses']}, types={len(data['expense_types'])}")
                    return False
            else:
                self.log_test("Expense Type Analytics Empty Month", False, 
                            f"Failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_test("Expense Type Analytics Empty Month", False, f"Error: {str(e)}")
            return False
    
    def test_existing_endpoints_still_work(self):
        """Verify that existing API endpoints still work properly"""
        endpoints_to_test = [
            ("/categories", "Categories endpoint"),
            ("/transactions", "Transactions endpoint"),
            (f"/analytics/monthly/{date.today().year}/{date.today().month}", "Monthly analytics endpoint"),
            ("/analytics/category-summary/30", "Category summary endpoint")
        ]
        
        all_working = True
        
        for endpoint, description in endpoints_to_test:
            try:
                response = self.session.get(f"{self.base_url}{endpoint}", timeout=10)
                
                if response.status_code == 200:
                    self.log_test(f"Existing Endpoint - {description}", True, 
                                f"Endpoint {endpoint} working correctly")
                else:
                    self.log_test(f"Existing Endpoint - {description}", False, 
                                f"Endpoint {endpoint} failed: {response.status_code}")
                    all_working = False
            except Exception as e:
                self.log_test(f"Existing Endpoint - {description}", False, 
                            f"Endpoint {endpoint} error: {str(e)}")
                all_working = False
        
        return all_working
    
    def cleanup_test_data(self):
        """Clean up created test transactions"""
        cleanup_count = 0
        for transaction_id in self.created_transactions:
            try:
                response = self.session.delete(f"{self.base_url}/transactions/{transaction_id}", 
                                             timeout=10)
                if response.status_code == 200:
                    cleanup_count += 1
            except Exception:
                pass  # Ignore cleanup errors
        
        if cleanup_count > 0:
            self.log_test("Cleanup Test Data", True, f"Cleaned up {cleanup_count} test transactions")
    
    def run_all_tests(self):
        """Run all expense type analytics tests"""
        print("🧪 Starting Expense Type Analytics Tests")
        print("=" * 60)
        
        # Test 1: API Connection
        if not self.test_api_connection():
            return False
        
        # Test 2: Get Categories
        if not self.get_categories():
            return False
        
        # Test 3: Create Sample Transactions
        if not self.create_sample_expense_transactions():
            return False
        
        # Test 4: Test New Expense Type Analytics Endpoint
        analytics_data = self.test_expense_type_analytics_current_month()
        
        # Test 5: Test Percentage Calculation
        self.test_percentage_calculation(analytics_data)
        
        # Test 6: Test Empty Month
        self.test_expense_type_analytics_empty_month()
        
        # Test 7: Test Existing Endpoints Still Work
        self.test_existing_endpoints_still_work()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        self.print_summary()
        
        # Return overall success
        failed_tests = [result for result in self.test_results if not result["success"]]
        return len(failed_tests) == 0
    
    def print_summary(self):
        """Print test summary"""
        total_tests = len(self.test_results)
        passed_tests = len([result for result in self.test_results if result["success"]])
        failed_tests = total_tests - passed_tests
        
        print("\n" + "=" * 60)
        print("📊 EXPENSE TYPE ANALYTICS TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    tester = ExpenseAnalyticsTester()
    success = tester.run_all_tests()
    
    if not success:
        sys.exit(1)