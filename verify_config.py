import json
import os
import sys

def verify_config():
    print("[-] Verifying System Configuration...")
    
    # 1. Check Frontend Contract Artifact
    contract_path = os.path.join("frontend", "src", "contracts", "WeedRegistry.json")
    if not os.path.exists(contract_path):
        print(f"    [FAIL] Contract JSON not found at: {contract_path}")
        print("           Did the blockchain deployment script run?")
        return False
    
    try:
        with open(contract_path, 'r') as f:
            data = json.load(f)
            address = data.get('address')
            abi = data.get('abi')
            
            if not address:
                print("    [FAIL] Contract address is missing in JSON.")
                return False
            if not abi:
                print("    [FAIL] Contract ABI is missing in JSON.")
                return False
                
            print(f"    [PASS] Frontend configured with contract: {address}")
    except Exception as e:
        print(f"    [FAIL] Error reading contract JSON: {e}")
        return False

    # 2. Check Database
    db_path = os.path.join("backend", "agrotrace.db")
    if not os.path.exists(db_path):
        print(f"    [FAIL] Database file not found at: {db_path}")
        print("           Did the reset_and_populate_db.py script run?")
        return False
    
    # Optional: Check size > 0
    if os.path.getsize(db_path) == 0:
        print("    [WARN] Database file is empty (0 bytes).")
    else:
        print("    [PASS] Database exists and is populated.")

    return True

if __name__ == "__main__":
    if verify_config():
        print("    [SUCCESS] System Configuration Verified.")
        sys.exit(0)
    else:
        print("    [FAILURE] System Configuration Incomplete.")
        sys.exit(1)
