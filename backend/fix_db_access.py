from app import app
from models import db, User, Land
from werkzeug.security import generate_password_hash

def fix_database():
    with app.app_context():
        # 1. Find or Create Admin User
        admin = User.query.filter_by(username='Admin').first()
        if not admin:
            print("Admin user not found. Creating...")
            admin = User(
                username='Admin', 
                email='admin@agrotrace.com', 
                password_hash=generate_password_hash('password123')
            )
            db.session.add(admin)
            db.session.commit()
            print("Created Admin user.")
        else:
            print(f"Found Admin user (ID: {admin.id}). Resetting password...")
            admin.password_hash = generate_password_hash('password123')
            db.session.commit()
            print("Admin password reset to 'password123'.")
            
        # 2. Assign ALL lands to Admin
        print("Re-assigning all assets to Admin...")
        lands = Land.query.all()
        count = 0
        for land in lands:
            land.user_id = admin.id
            count += 1
        
        db.session.commit()
        print(f"Successfully linked {count} assets to user 'Admin'.")
        
        # 3. Verify
        print("\n--- Verification ---")
        print(f"User: {admin.username} (ID: {admin.id})")
        user_lands = Land.query.filter_by(user_id=admin.id).count()
        print(f"Assets owned: {user_lands}")

if __name__ == '__main__':
    print("Starting Database Fix...")
    try:
        fix_database()
        print("Database Fix Completed Successfully.")
    except Exception as e:
        print(f"Error: {e}")
