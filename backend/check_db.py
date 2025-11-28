from models import SessionLocal, User, Task, Category

def check_database():
    db = SessionLocal()
    try:
        print("=== ПОЛЬЗОВАТЕЛИ ===")
        users = db.query(User).all()
        for user in users:
            print(f"ID: {user.id}, Email: {user.email}, Created: {user.created_at}")

        print("\n=== ЗАДАЧИ ===")
        tasks = db.query(Task).all()
        for task in tasks:
            print(f"ID: {task.id}, Title: {task.title}, User: {task.user_id}, Completed: {task.completed}")

        print("\n=== КАТЕГОРИИ ===")
        categories = db.query(Category).all()
        for category in categories:
            print(f"ID: {category.id}, Name: {category.name}, User: {category.user_id}")

    finally:
        db.close()

if __name__ == "__main__":
    check_database()