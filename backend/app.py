from flask import Flask, jsonify
from flask_cors import CORS
from models import db
import os

app = Flask(__name__)
# Enable CORS for all domains, specifically allowing headers and methods
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Database Config
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'agrotrace.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Increase Max Upload Size to 500MB
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024


db.init_app(app)

# Register Blueprints (to be created)
# Register Blueprints (to be created)
from routes.land_routes import land_bp
from routes.detection_routes import detection_bp
from routes.blockchain_routes import blockchain_bp
from routes.auth_routes import auth_bp
from routes.stream_routes import stream_bp
from services.yolo_service import CustomBackbone, FeatureSelector # CRITICAL for pickle loading

app.register_blueprint(land_bp, url_prefix='/api/land')
app.register_blueprint(detection_bp, url_prefix='/api/detect')
app.register_blueprint(blockchain_bp, url_prefix='/api/blockchain')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(stream_bp, url_prefix='/api/stream')

@app.route('/')
def home():
    return jsonify({"message": "AgroTrace API is running", "status": "active"})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)
