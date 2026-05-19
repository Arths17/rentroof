"""Firebase integration for RentProof backend"""
import os
import logging
from typing import Optional, Dict, Any
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Firebase project config
FIREBASE_PROJECT_ID = "rentroof-bcfaf"
FIREBASE_API_KEY = "AIzaSyAr3P9nn0gBmFegU-SVBqSv2tqx68f6ALQ"
FIRESTORE_URL = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents"


class FirebaseClient:
    """Client for Firestore operations"""
    
    def __init__(self):
        self.project_id = FIREBASE_PROJECT_ID
        self.api_key = FIREBASE_API_KEY
        self.firestore_url = FIRESTORE_URL

    def write_unit(self, property_id: str, unit_id: str, unit_data: Dict[str, Any]) -> bool:
        """Write unit to Firestore units collection"""
        try:
            doc_url = f"{self.firestore_url}/units/{unit_id}"
            
            # Convert unit data to Firestore format
            firestore_data = {
                "fields": {
                    "id": {"stringValue": unit_data.get("id", "")},
                    "name": {"stringValue": unit_data.get("name", "")},
                    "tenant": {"stringValue": unit_data.get("tenant", "")},
                    "email": {"stringValue": unit_data.get("email", "")},
                    "rentAmount": {"doubleValue": float(unit_data.get("rentAmount", 0))},
                    "status": {"stringValue": unit_data.get("status", "vacant")},
                    "propertyId": {"stringValue": property_id},
                    "dueDate": {"stringValue": unit_data.get("dueDate", "") or ""},
                    "tenantUid": {"nullValue": True},
                    "tenantEmail": {"stringValue": unit_data.get("email", "") or ""},
                    "createdAt": {"timestampValue": self._get_timestamp()},
                }
            }
            
            params = {"key": self.api_key}
            response = requests.patch(doc_url, json=firestore_data, params=params, timeout=10)
            
            if response.status_code in [200, 201]:
                logger.info(f"Unit {unit_id} written to Firestore")
                return True
            else:
                logger.error(f"Failed to write unit to Firestore: {response.status_code} {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error writing unit to Firestore: {str(e)}")
            return False

    def update_unit(self, unit_id: str, unit_data: Dict[str, Any]) -> bool:
        """Update unit in Firestore"""
        try:
            doc_url = f"{self.firestore_url}/units/{unit_id}"
            
            firestore_data = {
                "fields": {
                    "name": {"stringValue": unit_data.get("name", "")},
                    "tenant": {"stringValue": unit_data.get("tenant", "")},
                    "email": {"stringValue": unit_data.get("email", "")},
                    "rentAmount": {"doubleValue": float(unit_data.get("rentAmount", 0))},
                    "status": {"stringValue": unit_data.get("status", "vacant")},
                    "dueDate": {"stringValue": unit_data.get("dueDate", "") or ""},
                    "updatedAt": {"timestampValue": self._get_timestamp()},
                }
            }
            
            params = {"key": self.api_key}
            response = requests.patch(doc_url, json=firestore_data, params=params, timeout=10)
            
            if response.status_code in [200, 201]:
                logger.info(f"Unit {unit_id} updated in Firestore")
                return True
            else:
                logger.error(f"Failed to update unit in Firestore: {response.status_code} {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating unit in Firestore: {str(e)}")
            return False

    def delete_unit(self, unit_id: str) -> bool:
        """Delete unit from Firestore"""
        try:
            doc_url = f"{self.firestore_url}/units/{unit_id}"
            params = {"key": self.api_key}
            response = requests.delete(doc_url, params=params, timeout=10)
            
            if response.status_code in [200, 204]:
                logger.info(f"Unit {unit_id} deleted from Firestore")
                return True
            else:
                logger.error(f"Failed to delete unit from Firestore: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting unit from Firestore: {str(e)}")
            return False

    @staticmethod
    def _get_timestamp() -> str:
        """Get current timestamp in RFC 3339 format"""
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# Global Firebase client instance
firebase_client = FirebaseClient()
