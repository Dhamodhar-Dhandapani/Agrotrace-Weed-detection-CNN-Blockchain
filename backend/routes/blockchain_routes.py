from flask import Blueprint, request, jsonify
from models import db, Detection, Treatment, BlockchainLedger
import hashlib
import json

blockchain_bp = Blueprint('blockchain', __name__)

def generate_hash(data_string):
    return hashlib.sha256(data_string.encode()).hexdigest()

@blockchain_bp.route('/store', methods=['POST'])
def store_on_chain():
    data = request.json
    record_type = data.get('type') # 'DETECTION' or 'TREATMENT'
    record_id = data.get('id')
    
    if not record_id or not record_type:
        return jsonify({"error": "Missing ID or Type"}), 400
        
    record = None
    data_to_hash = ""
    
    if record_type == 'DETECTION':
        record = Detection.query.get(record_id)
        if record:
            data_to_hash = json.dumps(record.to_dict(), sort_keys=True)
    elif record_type == 'TREATMENT':
        record = Treatment.query.get(record_id)
        if record:
            data_to_hash = json.dumps(record.to_dict(), sort_keys=True)
            
    if not record:
        return jsonify({"error": "Record not found"}), 404
        
    if record.is_on_chain:
         return jsonify({"message": "Already on chain", "tx_hash": record.tx_hash}), 200

    # Create Blockchain Entry
    # Get last hash
    last_block = BlockchainLedger.query.order_by(BlockchainLedger.id.desc()).first()
    prev_hash = last_block.data_hash if last_block else "0000000000000000000000000000000000000000000000000000000000000000"
    
    current_hash = generate_hash(data_to_hash + prev_hash)
    
    ledger_entry = BlockchainLedger(
        record_type=record_type,
        record_id=record_id,
        data_hash=current_hash,
        prev_hash=prev_hash
    )
    
    # Update the record itself
    record.is_on_chain = True
    record.tx_hash = current_hash # This acts as our "transaction hash"
    
    db.session.add(ledger_entry)
    db.session.commit()
    
    return jsonify({
        "message": "Stored on simulated blockchain",
        "tx_hash": current_hash,
        "block": ledger_entry.id
    })

@blockchain_bp.route('/verify-external', methods=['POST'])
def verify_external_transaction():
    """
    Updates a detection record with a real Ethereum transaction hash
    sent from the frontend.
    """
    data = request.json
    record_id = data.get('id')
    tx_hash = data.get('tx_hash')
    
    if not record_id or not tx_hash:
        return jsonify({"error": "Missing ID or Transaction Hash"}), 400
        
    record = Detection.query.get(record_id)
    if not record:
        return jsonify({"error": "Detection record not found"}), 404
        
    # Update the record
    record.is_on_chain = True
    record.tx_hash = tx_hash
    
    try:
        db.session.commit()
        return jsonify({"message": "Record updated with blockchain verification"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
