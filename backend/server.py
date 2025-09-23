from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, date
from bson import ObjectId
import json


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Expense Tracking Models
class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str
    icon: str
    is_custom: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CategoryCreate(BaseModel):
    name: str
    color: str = "#FF6B6B"
    icon: str = "dollar-sign"

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float
    category_id: str
    category_name: str
    transaction_type: str  # "income" or "expense"
    description: Optional[str] = ""
    currency: str = "INR"
    transaction_date: date
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_voice_input: bool = False

class TransactionCreate(BaseModel):
    amount: float
    category_id: str
    category_name: str
    transaction_type: str
    description: Optional[str] = ""
    currency: str = "INR"
    transaction_date: date
    is_voice_input: bool = False

class MonthlyAnalytics(BaseModel):
    month: int
    year: int
    total_income: float
    total_expense: float
    net_amount: float
    category_breakdown: List[Dict[str, Any]]
    transaction_count: int

# Helper function to convert ObjectId to string
def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# Initialize default categories
async def initialize_default_categories():
    existing_categories = await db.categories.count_documents({})
    if existing_categories == 0:
        default_categories = [
            {"name": "Rent", "color": "#FF6B6B", "icon": "home", "is_custom": False},
            {"name": "EMI", "color": "#4ECDC4", "icon": "credit-card", "is_custom": False},
            {"name": "Travel", "color": "#45B7D1", "icon": "plane", "is_custom": False},
            {"name": "Groceries", "color": "#FFA07A", "icon": "shopping-cart", "is_custom": False},
            {"name": "Eating Out", "color": "#98D8C8", "icon": "utensils", "is_custom": False},
            {"name": "Utilities", "color": "#F7DC6F", "icon": "zap", "is_custom": False},
            {"name": "Transport", "color": "#BB8FCE", "icon": "car", "is_custom": False},
            {"name": "Household", "color": "#85C1E9", "icon": "home", "is_custom": False},
            {"name": "Grooming & PC", "color": "#F8C471", "icon": "scissors", "is_custom": False},
            {"name": "Miscellaneous", "color": "#D5A6BD", "icon": "more-horizontal", "is_custom": False}
        ]
        
        for cat_data in default_categories:
            category = Category(**cat_data)
            await db.categories.insert_one(category.dict())

# Existing routes
@api_router.get("/")
async def root():
    return {"message": "Expense Tracker API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Category endpoints
@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find().to_list(1000)
    return [Category(**serialize_doc(cat)) for cat in categories]

@api_router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate):
    category = Category(**category_data.dict(), is_custom=True)
    result = await db.categories.insert_one(category.dict())
    return category

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    # Check if it's a default category
    category = await db.categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if not category.get("is_custom", False):
        raise HTTPException(status_code=400, detail="Cannot delete default categories")
    
    # Delete category and update transactions
    await db.categories.delete_one({"id": category_id})
    # Move transactions to "Miscellaneous" category
    misc_category = await db.categories.find_one({"name": "Miscellaneous"})
    if misc_category:
        await db.transactions.update_many(
            {"category_id": category_id},
            {"$set": {"category_id": misc_category["id"], "category_name": "Miscellaneous"}}
        )
    
    return {"message": "Category deleted successfully"}

# Transaction endpoints
@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(limit: int = 100, offset: int = 0):
    transactions = await db.transactions.find().sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    return [Transaction(**serialize_doc(trans)) for trans in transactions]

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate):
    # Verify category exists
    category = await db.categories.find_one({"id": transaction_data.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    transaction_dict = transaction_data.dict()
    transaction_dict["category_name"] = category["name"]
    transaction = Transaction(**transaction_dict)
    
    # Convert date to string for MongoDB storage
    transaction_for_db = transaction.dict()
    if isinstance(transaction_for_db["transaction_date"], date):
        transaction_for_db["transaction_date"] = transaction_for_db["transaction_date"].isoformat()
    if isinstance(transaction_for_db["created_at"], datetime):
        transaction_for_db["created_at"] = transaction_for_db["created_at"].isoformat()
    
    result = await db.transactions.insert_one(transaction_for_db)
    return transaction

@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str):
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return Transaction(**serialize_doc(transaction))

@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, transaction_data: TransactionCreate):
    # Verify category exists
    category = await db.categories.find_one({"id": transaction_data.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = transaction_data.dict()
    update_data["category_name"] = category["name"]
    
    result = await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    updated_transaction = await db.transactions.find_one({"id": transaction_id})
    return Transaction(**serialize_doc(updated_transaction))

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    result = await db.transactions.delete_one({"id": transaction_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted successfully"}

# Analytics endpoints
@api_router.get("/analytics/monthly/{year}/{month}", response_model=MonthlyAnalytics)
async def get_monthly_analytics(year: int, month: int):
    # Create date range for the month
    from datetime import datetime, timedelta
    import calendar
    
    start_date = datetime(year, month, 1).date()
    if month == 12:
        end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
    else:
        end_date = datetime(year, month + 1, 1).date() - timedelta(days=1)
    
    # Get transactions for the month
    transactions = await db.transactions.find({
        "transaction_date": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    }).to_list(None)
    
    total_income = sum(t["amount"] for t in transactions if t["transaction_type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["transaction_type"] == "expense")
    
    # Category breakdown
    category_breakdown = {}
    for trans in transactions:
        cat_name = trans["category_name"]
        if cat_name not in category_breakdown:
            category_breakdown[cat_name] = {
                "category": cat_name,
                "amount": 0,
                "count": 0,
                "type": trans["transaction_type"]
            }
        category_breakdown[cat_name]["amount"] += trans["amount"]
        category_breakdown[cat_name]["count"] += 1
    
    return MonthlyAnalytics(
        month=month,
        year=year,
        total_income=total_income,
        total_expense=total_expense,
        net_amount=total_income - total_expense,
        category_breakdown=list(category_breakdown.values()),
        transaction_count=len(transactions)
    )

@api_router.get("/analytics/category-summary/{days}")
async def get_category_summary(days: int = 30):
    from datetime import datetime, timedelta
    
    start_date = (datetime.now() - timedelta(days=days)).date()
    
    transactions = await db.transactions.find({
        "transaction_date": {"$gte": start_date.isoformat()}
    }).to_list(None)
    
    category_summary = {}
    for trans in transactions:
        cat_name = trans["category_name"]
        if cat_name not in category_summary:
            category_summary[cat_name] = {
                "category": cat_name,
                "total_amount": 0,
                "transaction_count": 0,
                "avg_amount": 0
            }
        category_summary[cat_name]["total_amount"] += trans["amount"]
        category_summary[cat_name]["transaction_count"] += 1
    
    # Calculate averages
    for cat in category_summary.values():
        if cat["transaction_count"] > 0:
            cat["avg_amount"] = cat["total_amount"] / cat["transaction_count"]
    
    return {"categories": list(category_summary.values()), "period_days": days}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await initialize_default_categories()
    logger.info("Default categories initialized")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()