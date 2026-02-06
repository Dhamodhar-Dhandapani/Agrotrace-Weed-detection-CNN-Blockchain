from app import app
from models import db

def clear_db():
    with app.app_context():
        print("Dropping all tables...")
        db.drop_all()
        print("Creating all tables (Empty)...")
        db.create_all()
        print("Database cleared successfully!")

if __name__ == '__main__':
    clear_db()
