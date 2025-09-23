#!/usr/bin/env python3
"""
Backend API Testing Script for Expense Tracker - EDIT/DELETE FOCUS
Focus: Testing PUT and DELETE endpoints for transactions
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
print(f"🚀 Testing backend EDIT/DELETE functionality at: {BASE_URL}")

class ExpenseTrackerTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        self.created_categories = []
        self.created_transactions = []
        
    def log_test(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                self.log_test("API Root", True, f"API is accessible: {data.get('message', 'No message')}")
                return True
            else:
                self.log_test("API Root", False, f"API not accessible, status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Root", False, f"Connection failed: {str(e)}")
            return False
    
    def test_get_categories(self):
        """Test GET /api/categories - should return default categories"""
        try:
            response = self.session.get(f"{self.base_url}/categories")
            if response.status_code == 200:
                categories = response.json()
                if len(categories) >= 10:  # Should have default categories
                    default_names = [cat['name'] for cat in categories]
                    expected_defaults = ['Rent', 'EMI', 'Travel', 'Groceries', 'Eating Out', 'Utilities', 'Transport', 'Household', 'Grooming & PC', 'Miscellaneous']
                    
                    missing_defaults = [name for name in expected_defaults if name not in default_names]
                    if not missing_defaults:
                        self.log_test("Get Categories", True, f"Found {len(categories)} categories including all defaults")
                        return categories
                    else:
                        self.log_test("Get Categories", False, f"Missing default categories: {missing_defaults}")
                        return categories
                else:
                    self.log_test("Get Categories", False, f"Expected at least 10 default categories, got {len(categories)}")
                    return categories
            else:
                self.log_test("Get Categories", False, f"Failed to get categories, status: {response.status_code}", response.text)
                return []
        except Exception as e:
            self.log_test("Get Categories", False, f"Exception: {str(e)}")
            return []
    
    def test_create_category(self):
        """Test POST /api/categories - create custom category"""
        try:
            new_category = {
                "name": "Entertainment",
                "color": "#9B59B6",
                "icon": "music"
            }
            
            response = self.session.post(f"{self.base_url}/categories", json=new_category)
            if response.status_code == 200:
                category = response.json()
                if category.get('is_custom') == True and category.get('name') == 'Entertainment':
                    self.created_categories.append(category['id'])
                    self.log_test("Create Category", True, f"Created custom category: {category['name']}")
                    return category
                else:
                    self.log_test("Create Category", False, f"Category created but properties incorrect: {category}")
                    return None
            else:
                self.log_test("Create Category", False, f"Failed to create category, status: {response.status_code}", response.text)
                return None
        except Exception as e:
            self.log_test("Create Category", False, f"Exception: {str(e)}")
            return None
    
    def test_delete_default_category(self, categories: List[Dict]):
        """Test DELETE /api/categories/{id} - should prevent deletion of default categories"""
        if not categories:
            self.log_test("Delete Default Category", False, "No categories available for testing")
            return
        
        try:
            # Find a default category
            default_category = next((cat for cat in categories if not cat.get('is_custom', True)), None)
            if not default_category:
                self.log_test("Delete Default Category", False, "No default category found for testing")
                return
            
            response = self.session.delete(f"{self.base_url}/categories/{default_category['id']}")
            if response.status_code == 400:
                self.log_test("Delete Default Category", True, "Correctly prevented deletion of default category")
            else:
                self.log_test("Delete Default Category", False, f"Should have prevented deletion, got status: {response.status_code}")
        except Exception as e:
            self.log_test("Delete Default Category", False, f"Exception: {str(e)}")
    
    def test_delete_custom_category(self):
        """Test DELETE /api/categories/{id} - should allow deletion of custom categories"""
        if not self.created_categories:
            self.log_test("Delete Custom Category", False, "No custom categories to delete")
            return
        
        try:
            category_id = self.created_categories[0]
            response = self.session.delete(f"{self.base_url}/categories/{category_id}")
            if response.status_code == 200:
                self.log_test("Delete Custom Category", True, "Successfully deleted custom category")
                self.created_categories.remove(category_id)
            else:
                self.log_test("Delete Custom Category", False, f"Failed to delete custom category, status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Delete Custom Category", False, f"Exception: {str(e)}")
    
    def test_create_transaction(self, categories: List[Dict]):
        """Test POST /api/transactions - create income and expense transactions"""
        if not categories:
            self.log_test("Create Transaction", False, "No categories available for transaction creation")
            return []
        
        transactions_created = []
        
        # Create expense transaction
        try:
            groceries_cat = next((cat for cat in categories if cat['name'] == 'Groceries'), categories[0])
            expense_transaction = {
                "amount": 2500.50,
                "category_id": groceries_cat['id'],
                "category_name": groceries_cat['name'],
                "transaction_type": "expense",
                "description": "Weekly grocery shopping at BigBasket",
                "currency": "INR",
                "transaction_date": date.today().isoformat(),
                "is_voice_input": False
            }
            
            response = self.session.post(f"{self.base_url}/transactions", json=expense_transaction)
            if response.status_code == 200:
                transaction = response.json()
                self.created_transactions.append(transaction['id'])
                transactions_created.append(transaction)
                self.log_test("Create Expense Transaction", True, f"Created expense: ₹{transaction['amount']} for {transaction['category_name']}")
            else:
                self.log_test("Create Expense Transaction", False, f"Failed to create expense, status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Create Expense Transaction", False, f"Exception: {str(e)}")
        
        # Create income transaction
        try:
            misc_cat = next((cat for cat in categories if cat['name'] == 'Miscellaneous'), categories[0])
            income_transaction = {
                "amount": 75000.00,
                "category_id": misc_cat['id'],
                "category_name": misc_cat['name'],
                "transaction_type": "income",
                "description": "Monthly salary from TechCorp",
                "currency": "INR",
                "transaction_date": date.today().isoformat(),
                "is_voice_input": False
            }
            
            response = self.session.post(f"{self.base_url}/transactions", json=income_transaction)
            if response.status_code == 200:
                transaction = response.json()
                self.created_transactions.append(transaction['id'])
                transactions_created.append(transaction)
                self.log_test("Create Income Transaction", True, f"Created income: ₹{transaction['amount']} for {transaction['category_name']}")
            else:
                self.log_test("Create Income Transaction", False, f"Failed to create income, status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Create Income Transaction", False, f"Exception: {str(e)}")
        
        # Create USD transaction
        try:
            travel_cat = next((cat for cat in categories if cat['name'] == 'Travel'), categories[0])
            usd_transaction = {
                "amount": 150.75,
                "category_id": travel_cat['id'],
                "category_name": travel_cat['name'],
                "transaction_type": "expense",
                "description": "Hotel booking in New York",
                "currency": "USD",
                "transaction_date": (date.today() - timedelta(days=2)).isoformat(),
                "is_voice_input": True
            }
            
            response = self.session.post(f"{self.base_url}/transactions", json=usd_transaction)
            if response.status_code == 200:
                transaction = response.json()
                self.created_transactions.append(transaction['id'])
                transactions_created.append(transaction)
                self.log_test("Create USD Transaction", True, f"Created USD expense: ${transaction['amount']} for {transaction['category_name']}")
            else:
                self.log_test("Create USD Transaction", False, f"Failed to create USD transaction, status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Create USD Transaction", False, f"Exception: {str(e)}")
        
        return transactions_created
    
    def test_get_transactions(self):
        """Test GET /api/transactions - list transactions with pagination"""
        try:
            # Test without pagination
            response = self.session.get(f"{self.base_url}/transactions")
            if response.status_code == 200:
                transactions = response.json()
                self.log_test("Get All Transactions", True, f"Retrieved {len(transactions)} transactions")
                
                # Test with pagination
                response_paginated = self.session.get(f"{self.base_url}/transactions?limit=2&offset=0")
                if response_paginated.status_code == 200:
                    paginated_transactions = response_paginated.json()
                    if len(paginated_transactions) <= 2:
                        self.log_test("Get Transactions Pagination", True, f"Pagination working: got {len(paginated_transactions)} transactions with limit=2")
                    else:
                        self.log_test("Get Transactions Pagination", False, f"Pagination not working: expected ≤2, got {len(paginated_transactions)}")
                else:
                    self.log_test("Get Transactions Pagination", False, f"Pagination failed, status: {response_paginated.status_code}")
                
                return transactions
            else:
                self.log_test("Get All Transactions", False, f"Failed to get transactions, status: {response.status_code}", response.text)
                return []
        except Exception as e:
            self.log_test("Get All Transactions", False, f"Exception: {str(e)}")
            return []
    
    def test_get_single_transaction(self):
        """Test GET /api/transactions/{id} - get single transaction"""
        if not self.created_transactions:
            self.log_test("Get Single Transaction", False, "No transactions available for testing")
            return
        
        try:
            transaction_id = self.created_transactions[0]
            response = self.session.get(f"{self.base_url}/transactions/{transaction_id}")
            if response.status_code == 200:
                transaction = response.json()
                if transaction['id'] == transaction_id:
                    self.log_test("Get Single Transaction", True, f"Retrieved transaction: {transaction['description']}")
                else:
                    self.log_test("Get Single Transaction", False, f"ID mismatch: expected {transaction_id}, got {transaction['id']}")
            else:
                self.log_test("Get Single Transaction", False, f"Failed to get transaction, status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get Single Transaction", False, f"Exception: {str(e)}")
    
    def test_update_transaction(self, categories: List[Dict]):
        """Test PUT /api/transactions/{id} - update existing transaction"""
        if not self.created_transactions or not categories:
            self.log_test("Update Transaction", False, "No transactions or categories available for testing")
            return
        
        try:
            transaction_id = self.created_transactions[0]
            rent_cat = next((cat for cat in categories if cat['name'] == 'Rent'), categories[0])
            
            update_data = {
                "amount": 3000.00,
                "category_id": rent_cat['id'],
                "category_name": rent_cat['name'],
                "transaction_type": "expense",
                "description": "Updated: Monthly rent payment",
                "currency": "INR",
                "transaction_date": date.today().isoformat(),
                "is_voice_input": False
            }
            
            response = self.session.put(f"{self.base_url}/transactions/{transaction_id}", json=update_data)
            if response.status_code == 200:
                updated_transaction = response.json()
                if updated_transaction['amount'] == 3000.00 and updated_transaction['description'] == "Updated: Monthly rent payment":
                    self.log_test("Update Transaction", True, f"Successfully updated transaction amount to ₹{updated_transaction['amount']}")
                else:
                    self.log_test("Update Transaction", False, f"Update didn't apply correctly: {updated_transaction}")
            else:
                self.log_test("Update Transaction", False, f"Failed to update transaction, status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Update Transaction", False, f"Exception: {str(e)}")
    
    def test_delete_transaction(self):
        """Test DELETE /api/transactions/{id} - delete transaction"""
        if not self.created_transactions:
            self.log_test("Delete Transaction", False, "No transactions available for deletion")
            return
        
        try:
            transaction_id = self.created_transactions[-1]  # Delete the last one
            response = self.session.delete(f"{self.base_url}/transactions/{transaction_id}")
            if response.status_code == 200:
                self.log_test("Delete Transaction", True, "Successfully deleted transaction")
                self.created_transactions.remove(transaction_id)
            else:
                self.log_test("Delete Transaction", False, f"Failed to delete transaction, status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Delete Transaction", False, f"Exception: {str(e)}")
    
    def test_monthly_analytics(self):
        """Test GET /api/analytics/monthly/{year}/{month} - monthly analytics data"""
        try:
            current_date = datetime.now()
            year = current_date.year
            month = current_date.month
            
            response = self.session.get(f"{self.base_url}/analytics/monthly/{year}/{month}")
            if response.status_code == 200:
                analytics = response.json()
                required_fields = ['month', 'year', 'total_income', 'total_expense', 'net_amount', 'category_breakdown', 'transaction_count']
                
                missing_fields = [field for field in required_fields if field not in analytics]
                if not missing_fields:
                    self.log_test("Monthly Analytics", True, 
                                f"Analytics for {month}/{year}: Income=₹{analytics['total_income']}, "
                                f"Expense=₹{analytics['total_expense']}, Net=₹{analytics['net_amount']}, "
                                f"Transactions={analytics['transaction_count']}")
                else:
                    self.log_test("Monthly Analytics", False, f"Missing fields in response: {missing_fields}")
            else:
                self.log_test("Monthly Analytics", False, f"Failed to get monthly analytics, status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Monthly Analytics", False, f"Exception: {str(e)}")
    
    def test_category_summary(self):
        """Test GET /api/analytics/category-summary/{days} - category breakdown for period"""
        try:
            days = 30
            response = self.session.get(f"{self.base_url}/analytics/category-summary/{days}")
            if response.status_code == 200:
                summary = response.json()
                if 'categories' in summary and 'period_days' in summary:
                    categories_data = summary['categories']
                    self.log_test("Category Summary", True, 
                                f"Category summary for {days} days: {len(categories_data)} categories with activity")
                    
                    # Validate category data structure
                    if categories_data:
                        first_cat = categories_data[0]
                        required_cat_fields = ['category', 'total_amount', 'transaction_count', 'avg_amount']
                        missing_cat_fields = [field for field in required_cat_fields if field not in first_cat]
                        if missing_cat_fields:
                            self.log_test("Category Summary Structure", False, f"Missing fields in category data: {missing_cat_fields}")
                        else:
                            self.log_test("Category Summary Structure", True, "Category data structure is correct")
                else:
                    self.log_test("Category Summary", False, f"Missing required fields in response: {summary}")
            else:
                self.log_test("Category Summary", False, f"Failed to get category summary, status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Category Summary", False, f"Exception: {str(e)}")
    
    def test_invalid_category_transaction(self):
        """Test creating transaction with invalid category ID"""
        try:
            invalid_transaction = {
                "amount": 100.00,
                "category_id": "invalid-category-id",
                "category_name": "Invalid Category",
                "transaction_type": "expense",
                "description": "This should fail",
                "currency": "INR",
                "transaction_date": date.today().isoformat(),
                "is_voice_input": False
            }
            
            response = self.session.post(f"{self.base_url}/transactions", json=invalid_transaction)
            if response.status_code == 404:
                self.log_test("Invalid Category Transaction", True, "Correctly rejected transaction with invalid category")
            else:
                self.log_test("Invalid Category Transaction", False, f"Should have rejected invalid category, got status: {response.status_code}")
        except Exception as e:
            self.log_test("Invalid Category Transaction", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("=" * 80)
        print("EXPENSE TRACKER BACKEND API TESTING")
        print("=" * 80)
        
        # Test API connectivity
        if not self.test_api_root():
            print("❌ API is not accessible. Stopping tests.")
            return self.generate_summary()
        
        # Test Categories API
        print("\n🏷️  TESTING CATEGORIES API")
        print("-" * 40)
        categories = self.test_get_categories()
        created_category = self.test_create_category()
        self.test_delete_default_category(categories)
        self.test_delete_custom_category()
        
        # Test Transactions API
        print("\n💰 TESTING TRANSACTIONS API")
        print("-" * 40)
        created_transactions = self.test_create_transaction(categories)
        all_transactions = self.test_get_transactions()
        self.test_get_single_transaction()
        self.test_update_transaction(categories)
        self.test_delete_transaction()
        self.test_invalid_category_transaction()
        
        # Test Analytics API
        print("\n📊 TESTING ANALYTICS API")
        print("-" * 40)
        self.test_monthly_analytics()
        self.test_category_summary()
        
        return self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for test in self.test_results:
                if not test['success']:
                    print(f"  • {test['test']}: {test['message']}")
        
        print(f"\n✅ PASSED TESTS:")
        for test in self.test_results:
            if test['success']:
                print(f"  • {test['test']}: {test['message']}")
        
        return {
            'total': total_tests,
            'passed': passed_tests,
            'failed': failed_tests,
            'success_rate': (passed_tests/total_tests)*100,
            'results': self.test_results
        }

if __name__ == "__main__":
    tester = ExpenseTrackerTester()
    summary = tester.run_all_tests()
    
    # Exit with error code if tests failed
    if summary['failed'] > 0:
        sys.exit(1)
    else:
        print("\n🎉 All tests passed!")
        sys.exit(0)