from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from models import get_db, Category, User
from schemas import CategoryCreate, CategoryResponse
from routers.users import get_current_user

router = APIRouter()

@router.post("/", response_model=CategoryResponse)
def create_category(
    category: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_category = Category(name=category.name, user_id=current_user.id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.get("/", response_model=List[CategoryResponse])
def get_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    categories = db.query(Category).filter(Category.user_id == current_user.id).all()
    return categories