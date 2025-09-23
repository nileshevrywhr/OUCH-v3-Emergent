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

class BackendEditDeleteTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_results = []
        self.created_transactions = []
        
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
                categories = response.json()
                self.log_test("Get Categories", True, f"Retrieved {len(categories)} categories")
                return categories
            else:
                self.log_test("Get Categories", False, f"Failed to get categories: {response.status_code}")
                return []
        except Exception as e:
            self.log_test("Get Categories", False, f"Error getting categories: {str(e)}")
            return []
    
    def create_test_transaction(self, categories, description="Test transaction for edit/delete"):
        """Create a test transaction for update/delete testing"""
        if not categories:
            self.log_test("Create Test Transaction", False, "No categories available")
            return None
            
        category = categories[0]  # Use first available category
        
        transaction_data = {
            "amount": 150.75,
            "category_id": category["id"],
            "category_name": category["name"],
            "transaction_type": "expense",
            "description": description,
            "currency": "INR",
            "transaction_date": date.today().isoformat(),
            "is_voice_input": False
        }
        
        try:
            response = self.session.post(f"{self.base_url}/transactions", 
                                       json=transaction_data, 
                                       timeout=10)
            
            if response.status_code == 200:
                transaction = response.json()
                self.created_transactions.append(transaction["id"])
                self.log_test("Create Test Transaction", True, 
                            f"Created transaction ID: {transaction['id']}")
                return transaction
            else:
                self.log_test("Create Test Transaction", False, 
                            f"Failed to create transaction: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            self.log_test("Create Test Transaction", False, f"Error creating transaction: {str(e)}")
            return None
    
    def test_update_transaction_amount(self, transaction, categories):
        """Test updating transaction amount"""
        if not transaction:
            return False
            
        transaction_id = transaction["id"]
        original_amount = transaction["amount"]
        new_amount = 275.50
        
        update_data = {
            "amount": new_amount,
            "category_id": transaction["category_id"],
            "category_name": transaction["category_name"],
            "transaction_type": transaction["transaction_type"],
            "description": transaction["description"],
            "currency": transaction["currency"],
            "transaction_date": transaction["transaction_date"],
            "is_voice_input": transaction["is_voice_input"]
        }
        
        try:
            response = self.session.put(f"{self.base_url}/transactions/{transaction_id}",
                                      json=update_data,
                                      timeout=10)
            
            if response.status_code == 200:
                updated_transaction = response.json()
                if updated_transaction["amount"] == new_amount:
                    self.log_test("Update Transaction Amount", True,
                                f"Amount updated from ₹{original_amount} to ₹{new_amount}")
                    return True
                else:
                    self.log_test("Update Transaction Amount", False,
                                f"Amount not updated correctly. Expected: {new_amount}, Got: {updated_transaction['amount']}")
                    return False
            else:
                self.log_test("Update Transaction Amount", False,
                            f"Update failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_test("Update Transaction Amount", False, f"Error updating amount: {str(e)}")
            return False
    
    def test_update_transaction_category(self, transaction, categories):
        """Test updating transaction category"""
        if not transaction or len(categories) < 2:
            return False
            
        transaction_id = transaction["id"]
        original_category = transaction["category_name"]
        
        # Find a different category
        new_category = None
        for cat in categories:
            if cat["id"] != transaction["category_id"]:
                new_category = cat
                break
        
        if not new_category:
            self.log_test("Update Transaction Category", False, "No alternative category found")
            return False
        
        update_data = {
            "amount": transaction["amount"],
            "category_id": new_category["id"],
            "category_name": new_category["name"],
            "transaction_type": transaction["transaction_type"],
            "description": transaction["description"],
            "currency": transaction["currency"],
            "transaction_date": transaction["transaction_date"],
            "is_voice_input": transaction["is_voice_input"]
        }
        
        try:
            response = self.session.put(f"{self.base_url}/transactions/{transaction_id}",
                                      json=update_data,
                                      timeout=10)
            
            if response.status_code == 200:
                updated_transaction = response.json()
                if (updated_transaction["category_id"] == new_category["id"] and 
                    updated_transaction["category_name"] == new_category["name"]):
                    self.log_test("Update Transaction Category", True,
                                f"Category updated from '{original_category}' to '{new_category['name']}'")
                    return True
                else:
                    self.log_test("Update Transaction Category", False,
                                f"Category not updated correctly")
                    return False
            else:
                self.log_test("Update Transaction Category", False,
                            f"Update failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_test("Update Transaction Category", False, f"Error updating category: {str(e)}")
            return False
    
    def test_update_transaction_type(self, transaction, categories):
        """Test updating transaction type"""
        if not transaction:
            return False
            
        transaction_id = transaction["id"]
        original_type = transaction["transaction_type"]
        new_type = "income" if original_type == "expense" else "expense"
        
        update_data = {
            "amount": transaction["amount"],
            "category_id": transaction["category_id"],
            "category_name": transaction["category_name"],
            "transaction_type": new_type,
            "description": transaction["description"],
            "currency": transaction["currency"],
            "transaction_date": transaction["transaction_date"],
            "is_voice_input": transaction["is_voice_input"]
        }
        
        try:
            response = self.session.put(f"{self.base_url}/transactions/{transaction_id}",
                                      json=update_data,
                                      timeout=10)
            
            if response.status_code == 200:
                updated_transaction = response.json()
                if updated_transaction["transaction_type"] == new_type:
                    self.log_test("Update Transaction Type", True,
                                f"Type updated from '{original_type}' to '{new_type}'")
                    return True
                else:
                    self.log_test("Update Transaction Type", False,
                                f"Type not updated correctly")
                    return False
            else:
                self.log_test("Update Transaction Type", False,
                            f"Update failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_test("Update Transaction Type", False, f"Error updating type: {str(e)}")
            return False
    
    def test_update_transaction_description(self, transaction, categories):
        """Test updating transaction description"""
        if not transaction:
            return False
            
        transaction_id = transaction["id"]
        original_description = transaction["description"]
        new_description = "Updated: Coffee at Starbucks downtown"
        
        update_data = {
            "amount": transaction["amount"],
            "category_id": transaction["category_id"],
            "category_name": transaction["category_name"],
            "transaction_type": transaction["transaction_type"],
            "description": new_description,
            "currency": transaction["currency"],
            "transaction_date": transaction["transaction_date"],
            "is_voice_input": transaction["is_voice_input"]
        }
        
        try:
            response = self.session.put(f"{self.base_url}/transactions/{transaction_id}",
                                      json=update_data,
                                      timeout=10)
            
            if response.status_code == 200:
                updated_transaction = response.json()
                if updated_transaction["description"] == new_description:
                    self.log_test("Update Transaction Description", True,
                                f"Description updated successfully")
                    return True
                else:
                    self.log_test("Update Transaction Description", False,
                                f"Description not updated correctly")
                    return False
            else:
                self.log_test("Update Transaction Description", False,
                            f"Update failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_test("Update Transaction Description", False, f"Error updating description: {str(e)}")
            return False
    
    def test_update_transaction_date(self, transaction, categories):
        """Test updating transaction date"""
        if not transaction:
            return False
            
        transaction_id = transaction["id"]
        original_date = transaction["transaction_date"]
        new_date = "2024-01-15"  # Different date
        
        update_data = {
            "amount": transaction["amount"],
            "category_id": transaction["category_id"],
            "category_name": transaction["category_name"],
            "transaction_type": transaction["transaction_type"],
            "description": transaction["description"],
            "currency": transaction["currency"],
            "transaction_date": new_date,
            "is_voice_input": transaction["is_voice_input"]
        }
        
        try:
            response = self.session.put(f"{self.base_url}/transactions/{transaction_id}",
                                      json=update_data,
                                      timeout=10)
            
            if response.status_code == 200:
                updated_transaction = response.json()
                if updated_transaction["transaction_date"] == new_date:
                    self.log_test("Update Transaction Date", True,
                                f"Date updated from '{original_date}' to '{new_date}'")
                    return True
                else:
                    self.log_test("Update Transaction Date", False,
                                f"Date not updated correctly")
                    return False
            else:
                self.log_test("Update Transaction Date", False,
                            f"Update failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_test("Update Transaction Date", False, f"Error updating date: {str(e)}")
            return False
    
    def test_update_invalid_transaction_id(self, categories):
        """Test updating with invalid transaction ID"""
        invalid_id = str(uuid.uuid4())
        
        if not categories:
            return False
            
        update_data = {
            "amount": 100.0,
            "category_id": categories[0]["id"],
            "category_name": categories[0]["name"],
            "transaction_type": "expense",
            "description": "Test",
            "currency": "INR",
            "transaction_date": date.today().isoformat(),
            "is_voice_input": False
        }
        
        try:
            response = self.session.put(f"{self.base_url}/transactions/{invalid_id}",
                                      json=update_data,
                                      timeout=10)
            
            if response.status_code == 404:
                self.log_test("Update Invalid Transaction ID", True,
                            "Correctly returned 404 for invalid transaction ID")
                return True
            else:
                self.log_test("Update Invalid Transaction ID", False,
                            f"Expected 404, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Update Invalid Transaction ID", False, f"Error testing invalid ID: {str(e)}")
            return False
    
    def test_update_invalid_category_id(self, transaction):
        """Test updating with invalid category ID"""
        if not transaction:
            return False
            
        transaction_id = transaction["id"]
        invalid_category_id = str(uuid.uuid4())
        
        update_data = {
            "amount": transaction["amount"],
            "category_id": invalid_category_id,
            "category_name": "Invalid Category",
            "transaction_type": transaction["transaction_type"],
            "description": transaction["description"],
            "currency": transaction["currency"],
            "transaction_date": transaction["transaction_date"],
            "is_voice_input": transaction["is_voice_input"]
        }
        
        try:
            response = self.session.put(f"{self.base_url}/transactions/{transaction_id}",
                                      json=update_data,
                                      timeout=10)
            
            if response.status_code == 404:
                self.log_test("Update Invalid Category ID", True,
                            "Correctly returned 404 for invalid category ID")
                return True
            else:
                self.log_test("Update Invalid Category ID", False,
                            f"Expected 404, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Update Invalid Category ID", False, f"Error testing invalid category: {str(e)}")
            return False
    
    def test_update_malformed_data(self, transaction):
        """Test updating with malformed data"""
        if not transaction:
            return False
            
        transaction_id = transaction["id"]
        
        # Test with missing required fields
        malformed_data = {
            "amount": "invalid_amount",  # Should be float
            "category_id": transaction["category_id"]
            # Missing other required fields
        }
        
        try:
            response = self.session.put(f"{self.base_url}/transactions/{transaction_id}",
                                      json=malformed_data,
                                      timeout=10)
            
            if response.status_code in [400, 422]:  # Bad request or validation error
                self.log_test("Update Malformed Data", True,
                            f"Correctly rejected malformed data with status {response.status_code}")
                return True
            else:
                self.log_test("Update Malformed Data", False,
                            f"Expected 400/422, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Update Malformed Data", False, f"Error testing malformed data: {str(e)}")
            return False
    
    def test_delete_transaction(self, transaction):
        """Test deleting a transaction"""
        if not transaction:
            return False
            
        transaction_id = transaction["id"]
        
        try:
            response = self.session.delete(f"{self.base_url}/transactions/{transaction_id}",
                                         timeout=10)
            
            if response.status_code == 200:
                # Verify transaction is actually deleted
                get_response = self.session.get(f"{self.base_url}/transactions/{transaction_id}",
                                              timeout=10)
                
                if get_response.status_code == 404:
                    self.log_test("Delete Transaction", True,
                                f"Transaction {transaction_id} successfully deleted")
                    # Remove from our tracking list
                    if transaction_id in self.created_transactions:
                        self.created_transactions.remove(transaction_id)
                    return True
                else:
                    self.log_test("Delete Transaction", False,
                                "Transaction still exists after deletion")
                    return False
            else:
                self.log_test("Delete Transaction", False,
                            f"Delete failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_test("Delete Transaction", False, f"Error deleting transaction: {str(e)}")
            return False
    
    def test_delete_invalid_transaction_id(self):
        """Test deleting with invalid transaction ID"""
        invalid_id = str(uuid.uuid4())
        
        try:
            response = self.session.delete(f"{self.base_url}/transactions/{invalid_id}",
                                         timeout=10)
            
            if response.status_code == 404:
                self.log_test("Delete Invalid Transaction ID", True,
                            "Correctly returned 404 for invalid transaction ID")
                return True
            else:
                self.log_test("Delete Invalid Transaction ID", False,
                            f"Expected 404, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Delete Invalid Transaction ID", False, f"Error testing invalid delete: {str(e)}")
            return False
    
    def cleanup_test_data(self):
        """Clean up any remaining test transactions"""
        print("\n🧹 Cleaning up test data...")
        for transaction_id in self.created_transactions[:]:
            try:
                response = self.session.delete(f"{self.base_url}/transactions/{transaction_id}",
                                             timeout=10)
                if response.status_code == 200:
                    print(f"   Cleaned up transaction: {transaction_id}")
                    self.created_transactions.remove(transaction_id)
            except Exception as e:
                print(f"   Failed to cleanup transaction {transaction_id}: {str(e)}")
    
    def run_all_tests(self):
        """Run all edit/delete tests"""
        print("🚀 BACKEND EDIT/DELETE API TESTING")
        print("=" * 60)
        
        # Test API connection
        if not self.test_api_connection():
            print("❌ Cannot proceed - API is not accessible")
            return False
        
        # Get categories
        categories = self.get_categories()
        if not categories:
            print("❌ Cannot proceed - No categories available")
            return False
        
        # Create test transactions for different test scenarios
        print("\n📝 Creating test transactions...")
        
        # Transaction for amount update test
        transaction1 = self.create_test_transaction(categories, "Transaction for amount update test")
        
        # Transaction for category update test  
        transaction2 = self.create_test_transaction(categories, "Transaction for category update test")
        
        # Transaction for type update test
        transaction3 = self.create_test_transaction(categories, "Transaction for type update test")
        
        # Transaction for description update test
        transaction4 = self.create_test_transaction(categories, "Transaction for description update test")
        
        # Transaction for date update test
        transaction5 = self.create_test_transaction(categories, "Transaction for date update test")
        
        # Transaction for delete test
        transaction6 = self.create_test_transaction(categories, "Transaction for delete test")
        
        print("\n🔄 Testing UPDATE operations...")
        
        # Test all update scenarios
        self.test_update_transaction_amount(transaction1, categories)
        self.test_update_transaction_category(transaction2, categories)
        self.test_update_transaction_type(transaction3, categories)
        self.test_update_transaction_description(transaction4, categories)
        self.test_update_transaction_date(transaction5, categories)
        
        print("\n❌ Testing UPDATE error cases...")
        
        # Test error cases
        self.test_update_invalid_transaction_id(categories)
        self.test_update_invalid_category_id(transaction1)
        self.test_update_malformed_data(transaction1)
        
        print("\n🗑️ Testing DELETE operations...")
        
        # Test delete operations
        self.test_delete_transaction(transaction6)
        self.test_delete_invalid_transaction_id()
        
        # Cleanup remaining test data
        self.cleanup_test_data()
        
        # Print summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    tester = BackendEditDeleteTester()
    success = tester.run_all_tests()
    
    if not success:
        sys.exit(1)