#!/usr/bin/env python3
"""
Backend API Testing Script for Expense Tracker - MULTI-USER FUNCTIONALITY FOCUS
Focus: Testing multi-user functionality with user filtering and analytics
"""

import requests
import json
from datetime import datetime, date
import uuid
import sys

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    base_url = line.split('=')[1].strip().strip('"')
                    return f"{base_url}/api"
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
    
    # Fallback
    return "http://localhost:8001/api"

BASE_URL = get_backend_url()
print(f"🚀 Testing backend MULTI-USER functionality at: {BASE_URL}")

class MultiUserTestSuite:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = []
        self.created_transactions = []
        self.categories = []
        
    def log_result(self, test_name, success, message="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response": response_data
        })
    
    def setup_test_data(self):
        """Get categories for testing"""
        try:
            response = requests.get(f"{self.base_url}/categories")
            if response.status_code == 200:
                self.categories = response.json()
                self.log_result("Setup: Get Categories", True, f"Retrieved {len(self.categories)} categories")
                return True
            else:
                self.log_result("Setup: Get Categories", False, f"Status: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Setup: Get Categories", False, f"Exception: {str(e)}")
            return False
    
    def test_create_self_transactions(self):
        """Test creating transactions for 'self' user with different expense types"""
        print("=== Testing Self User Transaction Creation ===")
        
        if not self.categories:
            self.log_result("Create Self Transactions", False, "No categories available")
            return False
        
        # Test data for self user with different expense types
        test_transactions = [
            {
                "amount": 500.0,
                "category_id": self.categories[0]["id"],  # Rent
                "category_name": self.categories[0]["name"],
                "transaction_type": "expense",
                "expense_type": "need",
                "description": "Monthly rent payment",
                "currency": "INR",
                "transaction_date": "2024-01-15",
                "user": "self"
            },
            {
                "amount": 150.0,
                "category_id": self.categories[3]["id"],  # Groceries
                "category_name": self.categories[3]["name"],
                "transaction_type": "expense",
                "expense_type": "need",
                "description": "Weekly groceries",
                "currency": "INR",
                "transaction_date": "2024-01-16",
                "user": "self"
            },
            {
                "amount": 200.0,
                "category_id": self.categories[4]["id"],  # Eating Out
                "category_name": self.categories[4]["name"],
                "transaction_type": "expense",
                "expense_type": "want",
                "description": "Dinner at restaurant",
                "currency": "INR",
                "transaction_date": "2024-01-17",
                "user": "self"
            },
            {
                "amount": 1000.0,
                "category_id": self.categories[1]["id"],  # EMI
                "category_name": self.categories[1]["name"],
                "transaction_type": "expense",
                "expense_type": "investment",
                "description": "Mutual fund SIP",
                "currency": "INR",
                "transaction_date": "2024-01-18",
                "user": "self"
            }
        ]
        
        success_count = 0
        for i, transaction_data in enumerate(test_transactions):
            try:
                response = requests.post(f"{self.base_url}/transactions", json=transaction_data)
                if response.status_code == 200:
                    created_transaction = response.json()
                    self.created_transactions.append(created_transaction)
                    
                    # Verify user field is saved correctly
                    if created_transaction.get("user") == "self":
                        self.log_result(f"Create Self Transaction {i+1} ({transaction_data['expense_type']})", True, 
                                      f"Amount: ₹{transaction_data['amount']}, Type: {transaction_data['expense_type']}")
                        success_count += 1
                    else:
                        self.log_result(f"Create Self Transaction {i+1}", False, 
                                      f"User field incorrect: expected 'self', got '{created_transaction.get('user')}'")
                else:
                    self.log_result(f"Create Self Transaction {i+1}", False, 
                                  f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result(f"Create Self Transaction {i+1}", False, f"Exception: {str(e)}")
        
        return success_count == len(test_transactions)
    
    def test_create_spouse_transactions(self):
        """Test creating transactions for 'spouse' user with different expense types"""
        print("=== Testing Spouse User Transaction Creation ===")
        
        if not self.categories:
            self.log_result("Create Spouse Transactions", False, "No categories available")
            return False
        
        # Test data for spouse user with different expense types
        test_transactions = [
            {
                "amount": 300.0,
                "category_id": self.categories[2]["id"],  # Travel
                "category_name": self.categories[2]["name"],
                "transaction_type": "expense",
                "expense_type": "need",
                "description": "Bus fare to office",
                "currency": "INR",
                "transaction_date": "2024-01-15",
                "user": "spouse"
            },
            {
                "amount": 250.0,
                "category_id": self.categories[8]["id"],  # Grooming & PC
                "category_name": self.categories[8]["name"],
                "transaction_type": "expense",
                "expense_type": "want",
                "description": "Haircut and styling",
                "currency": "INR",
                "transaction_date": "2024-01-16",
                "user": "spouse"
            },
            {
                "amount": 800.0,
                "category_id": self.categories[1]["id"],  # EMI
                "category_name": self.categories[1]["name"],
                "transaction_type": "expense",
                "expense_type": "investment",
                "description": "Stock market investment",
                "currency": "INR",
                "transaction_date": "2024-01-17",
                "user": "spouse"
            }
        ]
        
        success_count = 0
        for i, transaction_data in enumerate(test_transactions):
            try:
                response = requests.post(f"{self.base_url}/transactions", json=transaction_data)
                if response.status_code == 200:
                    created_transaction = response.json()
                    self.created_transactions.append(created_transaction)
                    
                    # Verify user field is saved correctly
                    if created_transaction.get("user") == "spouse":
                        self.log_result(f"Create Spouse Transaction {i+1} ({transaction_data['expense_type']})", True, 
                                      f"Amount: ₹{transaction_data['amount']}, Type: {transaction_data['expense_type']}")
                        success_count += 1
                    else:
                        self.log_result(f"Create Spouse Transaction {i+1}", False, 
                                      f"User field incorrect: expected 'spouse', got '{created_transaction.get('user')}'")
                else:
                    self.log_result(f"Create Spouse Transaction {i+1}", False, 
                                  f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result(f"Create Spouse Transaction {i+1}", False, f"Exception: {str(e)}")
        
        return success_count == len(test_transactions)
    
    def test_user_filtering_transactions(self):
        """Test GET /api/transactions with user filtering"""
        print("=== Testing User Filtering in Transactions ===")
        
        success_count = 0
        total_tests = 3
        
        # Test 1: Get all transactions (no user filter)
        try:
            response = requests.get(f"{self.base_url}/transactions")
            if response.status_code == 200:
                all_transactions = response.json()
                self_count = sum(1 for t in all_transactions if t.get("user") == "self")
                spouse_count = sum(1 for t in all_transactions if t.get("user") == "spouse")
                
                self.log_result("Get All Transactions", True, 
                              f"Total: {len(all_transactions)}, Self: {self_count}, Spouse: {spouse_count}")
                success_count += 1
            else:
                self.log_result("Get All Transactions", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get All Transactions", False, f"Exception: {str(e)}")
        
        # Test 2: Get only self transactions
        try:
            response = requests.get(f"{self.base_url}/transactions?user=self")
            if response.status_code == 200:
                self_transactions = response.json()
                
                # Verify all transactions belong to self user
                all_self = all(t.get("user") == "self" for t in self_transactions)
                if all_self:
                    self.log_result("Get Self Transactions", True, 
                                  f"Retrieved {len(self_transactions)} self transactions")
                    success_count += 1
                else:
                    non_self = [t.get("user") for t in self_transactions if t.get("user") != "self"]
                    self.log_result("Get Self Transactions", False, 
                                  f"Found non-self transactions: {non_self}")
            else:
                self.log_result("Get Self Transactions", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Self Transactions", False, f"Exception: {str(e)}")
        
        # Test 3: Get only spouse transactions
        try:
            response = requests.get(f"{self.base_url}/transactions?user=spouse")
            if response.status_code == 200:
                spouse_transactions = response.json()
                
                # Verify all transactions belong to spouse user
                all_spouse = all(t.get("user") == "spouse" for t in spouse_transactions)
                if all_spouse:
                    self.log_result("Get Spouse Transactions", True, 
                                  f"Retrieved {len(spouse_transactions)} spouse transactions")
                    success_count += 1
                else:
                    non_spouse = [t.get("user") for t in spouse_transactions if t.get("user") != "spouse"]
                    self.log_result("Get Spouse Transactions", False, 
                                  f"Found non-spouse transactions: {non_spouse}")
            else:
                self.log_result("Get Spouse Transactions", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Get Spouse Transactions", False, f"Exception: {str(e)}")
        
        return success_count == total_tests
    
    def test_expense_type_analytics_all_users(self):
        """Test expense type analytics without user filtering (all users)"""
        print("=== Testing Expense Type Analytics - All Users ===")
        
        try:
            response = requests.get(f"{self.base_url}/analytics/expense-types/2024/1")
            if response.status_code == 200:
                analytics = response.json()
                
                # Verify response structure
                required_fields = ["month", "year", "total_expenses", "expense_types"]
                missing_fields = [field for field in required_fields if field not in analytics]
                
                if missing_fields:
                    self.log_result("Expense Analytics All Users - Structure", False, 
                                  f"Missing fields: {missing_fields}")
                    return False
                
                # Verify data
                expense_types = analytics["expense_types"]
                total_expenses = analytics["total_expenses"]
                
                # Verify percentages add up to 100% (with tolerance for rounding)
                total_percentage = sum(et["percentage"] for et in expense_types)
                percentage_valid = abs(total_percentage - 100.0) < 0.1
                
                if percentage_valid and total_expenses > 0:
                    self.log_result("Expense Analytics All Users", True, 
                                  f"Total: ₹{total_expenses}, Types: {len(expense_types)}, Percentages sum: {total_percentage}%")
                    
                    # Log breakdown
                    for et in expense_types:
                        print(f"   {et['type']}: ₹{et['amount']} ({et['percentage']}%) - {et['count']} transactions")
                    
                    return True
                else:
                    self.log_result("Expense Analytics All Users", False, 
                                  f"Invalid data - Total: ₹{total_expenses}, Percentage sum: {total_percentage}%")
                    return False
            else:
                self.log_result("Expense Analytics All Users", False, f"Status: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Expense Analytics All Users", False, f"Exception: {str(e)}")
            return False
    
    def test_expense_type_analytics_self_user(self):
        """Test expense type analytics with self user filtering"""
        print("=== Testing Expense Type Analytics - Self User ===")
        
        try:
            response = requests.get(f"{self.base_url}/analytics/expense-types/2024/1?user=self")
            if response.status_code == 200:
                analytics = response.json()
                
                # Verify user field in response
                if analytics.get("user") != "self":
                    self.log_result("Expense Analytics Self User", False, 
                                  f"User field incorrect: expected 'self', got '{analytics.get('user')}'")
                    return False
                
                expense_types = analytics["expense_types"]
                total_expenses = analytics["total_expenses"]
                
                # Verify percentages add up to 100%
                total_percentage = sum(et["percentage"] for et in expense_types)
                percentage_valid = abs(total_percentage - 100.0) < 0.1
                
                if percentage_valid and total_expenses > 0:
                    self.log_result("Expense Analytics Self User", True, 
                                  f"Total: ₹{total_expenses}, Types: {len(expense_types)}, Percentages sum: {total_percentage}%")
                    
                    # Log breakdown
                    for et in expense_types:
                        print(f"   {et['type']}: ₹{et['amount']} ({et['percentage']}%) - {et['count']} transactions")
                    
                    return True
                else:
                    self.log_result("Expense Analytics Self User", False, 
                                  f"Invalid data - Total: ₹{total_expenses}, Percentage sum: {total_percentage}%")
                    return False
            else:
                self.log_result("Expense Analytics Self User", False, f"Status: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Expense Analytics Self User", False, f"Exception: {str(e)}")
            return False
    
    def test_expense_type_analytics_spouse_user(self):
        """Test expense type analytics with spouse user filtering"""
        print("=== Testing Expense Type Analytics - Spouse User ===")
        
        try:
            response = requests.get(f"{self.base_url}/analytics/expense-types/2024/1?user=spouse")
            if response.status_code == 200:
                analytics = response.json()
                
                # Verify user field in response
                if analytics.get("user") != "spouse":
                    self.log_result("Expense Analytics Spouse User", False, 
                                  f"User field incorrect: expected 'spouse', got '{analytics.get('user')}'")
                    return False
                
                expense_types = analytics["expense_types"]
                total_expenses = analytics["total_expenses"]
                
                # Verify percentages add up to 100%
                total_percentage = sum(et["percentage"] for et in expense_types)
                percentage_valid = abs(total_percentage - 100.0) < 0.1
                
                if percentage_valid and total_expenses > 0:
                    self.log_result("Expense Analytics Spouse User", True, 
                                  f"Total: ₹{total_expenses}, Types: {len(expense_types)}, Percentages sum: {total_percentage}%")
                    
                    # Log breakdown
                    for et in expense_types:
                        print(f"   {et['type']}: ₹{et['amount']} ({et['percentage']}%) - {et['count']} transactions")
                    
                    return True
                else:
                    self.log_result("Expense Analytics Spouse User", False, 
                                  f"Invalid data - Total: ₹{total_expenses}, Percentage sum: {total_percentage}%")
                    return False
            else:
                self.log_result("Expense Analytics Spouse User", False, f"Status: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Expense Analytics Spouse User", False, f"Exception: {str(e)}")
            return False
    
    def test_data_integrity(self):
        """Test data integrity - verify calculations are correct"""
        print("=== Testing Data Integrity ===")
        
        success_count = 0
        total_tests = 2
        
        # Test 1: Verify individual user totals add up to combined total
        try:
            # Get all users analytics
            all_response = requests.get(f"{self.base_url}/analytics/expense-types/2024/1")
            self_response = requests.get(f"{self.base_url}/analytics/expense-types/2024/1?user=self")
            spouse_response = requests.get(f"{self.base_url}/analytics/expense-types/2024/1?user=spouse")
            
            if all([r.status_code == 200 for r in [all_response, self_response, spouse_response]]):
                all_data = all_response.json()
                self_data = self_response.json()
                spouse_data = spouse_response.json()
                
                all_total = all_data["total_expenses"]
                self_total = self_data["total_expenses"]
                spouse_total = spouse_data["total_expenses"]
                
                # Verify totals add up
                if abs((self_total + spouse_total) - all_total) < 0.01:
                    self.log_result("Data Integrity - Total Verification", True, 
                                  f"All: ₹{all_total}, Self: ₹{self_total}, Spouse: ₹{spouse_total}")
                    success_count += 1
                else:
                    self.log_result("Data Integrity - Total Verification", False, 
                                  f"Totals don't match - All: ₹{all_total}, Self+Spouse: ₹{self_total + spouse_total}")
            else:
                self.log_result("Data Integrity - Total Verification", False, "Failed to get analytics data")
        except Exception as e:
            self.log_result("Data Integrity - Total Verification", False, f"Exception: {str(e)}")
        
        # Test 2: Verify expense type breakdown consistency
        try:
            # Get self and spouse data again
            self_response = requests.get(f"{self.base_url}/analytics/expense-types/2024/1?user=self")
            spouse_response = requests.get(f"{self.base_url}/analytics/expense-types/2024/1?user=spouse")
            
            if all([r.status_code == 200 for r in [self_response, spouse_response]]):
                self_data = self_response.json()
                spouse_data = spouse_response.json()
                
                # Verify each user has the expected expense types
                self_types = {et["type"]: et for et in self_data["expense_types"]}
                spouse_types = {et["type"]: et for et in spouse_data["expense_types"]}
                
                # Expected breakdown based on our test data:
                # Self: need=650 (500+150), want=200, investment=1000
                # Spouse: need=300, want=250, investment=800
                
                integrity_valid = True
                
                # Check self user breakdown
                if "need" in self_types and abs(self_types["need"]["amount"] - 650) < 0.01:
                    pass  # Good
                else:
                    integrity_valid = False
                
                if "want" in self_types and abs(self_types["want"]["amount"] - 200) < 0.01:
                    pass  # Good
                else:
                    integrity_valid = False
                
                if "investment" in self_types and abs(self_types["investment"]["amount"] - 1000) < 0.01:
                    pass  # Good
                else:
                    integrity_valid = False
                
                if integrity_valid:
                    self.log_result("Data Integrity - Breakdown Verification", True, 
                                  "Expense type breakdowns are accurate")
                    success_count += 1
                else:
                    self.log_result("Data Integrity - Breakdown Verification", False, 
                                  "Expense type amounts don't match expected values")
            else:
                self.log_result("Data Integrity - Breakdown Verification", False, "Failed to get user analytics data")
        except Exception as e:
            self.log_result("Data Integrity - Breakdown Verification", False, f"Exception: {str(e)}")
        
        return success_count == total_tests
    
    def run_all_tests(self):
        """Run all multi-user functionality tests"""
        print("🚀 Starting Multi-User Functionality Tests")
        print("=" * 60)
        
        # Setup
        if not self.setup_test_data():
            print("❌ Setup failed. Cannot proceed with tests.")
            return False
        
        # Run all tests
        test_methods = [
            self.test_create_self_transactions,
            self.test_create_spouse_transactions,
            self.test_user_filtering_transactions,
            self.test_expense_type_analytics_all_users,
            self.test_expense_type_analytics_self_user,
            self.test_expense_type_analytics_spouse_user,
            self.test_data_integrity
        ]
        
        passed_tests = 0
        total_tests = len(test_methods)
        
        for test_method in test_methods:
            if test_method():
                passed_tests += 1
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        success_rate = (passed_tests / total_tests) * 100
        print(f"Tests Passed: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        
        if passed_tests == total_tests:
            print("🎉 ALL TESTS PASSED! Multi-user functionality is working correctly.")
        else:
            print("⚠️  Some tests failed. Please review the issues above.")
        
        return passed_tests == total_tests

if __name__ == "__main__":
    test_suite = MultiUserTestSuite()
    test_suite.run_all_tests()