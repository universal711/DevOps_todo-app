from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from models import get_db, Task, Category, User
from schemas import TaskCreate, TaskUpdate, TaskResponse, StatsResponse
from routers.users import get_current_user
from metrics import TASK_CREATED, TASK_COMPLETED, DATABASE_ERRORS, EXCEPTIONS_COUNT

router = APIRouter()

@router.post("/", response_model=TaskResponse)
def create_task(
    task: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if task.category_id:
            category = db.query(Category).filter(
                Category.id == task.category_id,
                Category.user_id == current_user.id
            ).first()
            if not category:
                raise HTTPException(status_code=404, detail="Category not found")
        
        db_task = Task(
            title=task.title,
            description=task.description,
            user_id=current_user.id,
            category_id=task.category_id
        )
        db.add(db_task)
        db.commit()
        db.refresh(db_task)

        TASK_CREATED.inc()
        return db_task
        
    except HTTPException:
        # Пробрасываем HTTP исключения без логирования как ошибок
        raise
    except Exception as e:
        DATABASE_ERRORS.inc()
        EXCEPTIONS_COUNT.labels(
            exception_type=type(e).__name__,
            endpoint="/tasks"
        ).inc()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    completed: Optional[bool] = None,
    category_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(Task).filter(Task.user_id == current_user.id)
        
        if completed is not None:
            query = query.filter(Task.completed == completed)
        
        if category_id is not None:
            query = query.filter(Task.category_id == category_id)
        
        tasks = query.all()
        return tasks
        
    except Exception as e:
        DATABASE_ERRORS.inc()
        EXCEPTIONS_COUNT.labels(
            exception_type=type(e).__name__,
            endpoint="/tasks"
        ).inc()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        db_task = db.query(Task).filter(
            Task.id == task_id,
            Task.user_id == current_user.id
        ).first()
        
        if not db_task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        if task_update.category_id is not None:
            category = db.query(Category).filter(
                Category.id == task_update.category_id,
                Category.user_id == current_user.id
            ).first()
            if not category:
                raise HTTPException(status_code=404, detail="Category not found")
        
        # Запоминаем, была ли задача завершена до обновления
        was_completed = db_task.completed
        
        for field, value in task_update.dict(exclude_unset=True).items():
            setattr(db_task, field, value)
        
        db.commit()
        db.refresh(db_task)
        
        # Если задача перешла в статус "завершена", увеличиваем счетчик
        if not was_completed and db_task.completed:
            TASK_COMPLETED.inc()
            
        return db_task
        
    except HTTPException:
        raise
    except Exception as e:
        DATABASE_ERRORS.inc()
        EXCEPTIONS_COUNT.labels(
            exception_type=type(e).__name__,
            endpoint="/tasks/{task_id}"
        ).inc()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/{task_id}/complete", response_model=TaskResponse)
def complete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        db_task = db.query(Task).filter(
            Task.id == task_id,
            Task.user_id == current_user.id
        ).first()
        
        if not db_task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Увеличиваем счетчик только если задача еще не была завершена
        if not db_task.completed:
            TASK_COMPLETED.inc()
        
        db_task.completed = True
        db.commit()
        db.refresh(db_task)
        return db_task
        
    except HTTPException:
        raise
    except Exception as e:
        DATABASE_ERRORS.inc()
        EXCEPTIONS_COUNT.labels(
            exception_type=type(e).__name__,
            endpoint="/tasks/{task_id}/complete"
        ).inc()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        db_task = db.query(Task).filter(
            Task.id == task_id,
            Task.user_id == current_user.id
        ).first()
        
        if not db_task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        db.delete(db_task)
        db.commit()
        return {"message": "Task deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        DATABASE_ERRORS.inc()
        EXCEPTIONS_COUNT.labels(
            exception_type=type(e).__name__,
            endpoint="/tasks/{task_id}"
        ).inc()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/stats", response_model=StatsResponse)
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        total_tasks = db.query(Task).filter(Task.user_id == current_user.id).count()
        completed_tasks = db.query(Task).filter(
            Task.user_id == current_user.id,
            Task.completed == True
        ).count()
        pending_tasks = total_tasks - completed_tasks
        
        return StatsResponse(
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            pending_tasks=pending_tasks
        )
        
    except Exception as e:
        DATABASE_ERRORS.inc()
        EXCEPTIONS_COUNT.labels(
            exception_type=type(e).__name__,
            endpoint="/tasks/stats"
        ).inc()
        raise HTTPException(status_code=500, detail="Internal server error")