import requests
from flask import Blueprint, request, jsonify

location_bp = Blueprint('location', __name__)

@location_bp.route('/verify', methods=['GET'])
def verify_location():
    location = request.args.get("location")
    
    # Basic validation: ensure location exists and isn't too short
    if not location or len(location.strip()) < 5:
        return jsonify({"valid": False}), 400

    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": location,
            "format": "json",
            "limit": 1,
            "countrycodes": "in",  # Restrict results to India 🇮🇳
            "addressdetails": 1
        }
        headers = {
            "User-Agent": "agrotrace-app (contact@yourdomain.com)" # Best practice to include a contact email
        }

        response = requests.get(
        url,
        params=params,
        headers=headers,
        timeout=5,
        verify=False
)
        
        # Check if the API request was successful
        if response.status_code != 200:
            return jsonify({"valid": False, "error": "API unreachable"}), 502

        data = response.json()

        if not data:
            return jsonify({"valid": False})

        place = data[0]
        display_name = place.get("display_name", "").lower()

        # Extra safety check to ensure the result is actually in India
        if "india" not in display_name:
            return jsonify({"valid": False})

        return jsonify({
            "valid": True,
            "display_name": place["display_name"],
            "lat": place["lat"],
            "lon": place["lon"]
        })

    except Exception as e:
        # Consider using app.logger.error instead of print for production
        print(f"Location verify error: {e}")
        return jsonify({"valid": False, "message": "Internal server error"}), 500
    
@location_bp.route('/suggest', methods=['GET'])
def suggest_location():
    query = request.args.get("q")

    if not query or len(query.strip()) < 3:
        return jsonify([])

    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": query,
            "format": "json",
            "limit": 5,
            "countrycodes": "in",
            "addressdetails": 1
        }

        headers = {
            "User-Agent": "agrotrace-app (contact@yourdomain.com)"
        }

        response = requests.get(
            url,
            params=params,
            headers=headers,
            timeout=5,
            verify=False
        )

        if response.status_code != 200:
            return jsonify([])

        data = response.json()
        suggestions = []

        for place in data:
            address = place.get("address", {})

            district = (
                address.get("city") or
                address.get("town") or
                address.get("village") or
                address.get("county") or
                address.get("state_district")
            )

            state = address.get("state")

            # fallback if nothing found
            name = district if district else place.get("display_name")

            # optional: include state
            if district and state:
                name = f"{district}, {state}"

            suggestions.append({
                "name": name,
                "lat": place.get("lat"),
                "lon": place.get("lon")
            })

        return jsonify(suggestions)

    except Exception as e:
        print(f"Suggest error: {e}")
        return jsonify([])