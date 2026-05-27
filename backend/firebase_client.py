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

    def get_user_properties(self, user_id: str) -> list[Dict[str, Any]]:
        """Fetch all properties for a user from Firestore"""
        try:
            # Query properties where userId matches
            query_url = f"{self.firestore_url}:runQuery"
            query_body = {
                "structuredQuery": {
                    "from": [{"collectionId": "properties"}],
                    "where": {
                        "fieldFilter": {
                            "field": {"fieldPath": "userId"},
                            "op": "EQUAL",
                            "value": {"stringValue": user_id}
                        }
                    }
                }
            }
            params = {"key": self.api_key}
            response = requests.post(query_url, json=query_body, params=params, timeout=10)
            
            if response.status_code == 200:
                results = response.json()
                properties = []
                for item in results:
                    if "document" in item:
                        doc = item["document"]
                        prop_data = self._convert_firestore_doc(doc)
                        properties.append(prop_data)
                return properties
            else:
                logger.error(f"Failed to fetch properties: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error fetching properties: {str(e)}")
            return []

    def get_user_units(self, user_id: str) -> list[Dict[str, Any]]:
        """Fetch all units for a user's properties from Firestore"""
        try:
            units = []
            properties = self.get_user_properties(user_id)
            
            for prop in properties:
                prop_id = prop.get("id", "")
                # Query units where propertyId matches
                query_url = f"{self.firestore_url}:runQuery"
                query_body = {
                    "structuredQuery": {
                        "from": [{"collectionId": "units"}],
                        "where": {
                            "fieldFilter": {
                                "field": {"fieldPath": "propertyId"},
                                "op": "EQUAL",
                                "value": {"stringValue": prop_id}
                            }
                        }
                    }
                }
                params = {"key": self.api_key}
                response = requests.post(query_url, json=query_body, params=params, timeout=10)
                
                if response.status_code == 200:
                    results = response.json()
                    for item in results:
                        if "document" in item:
                            doc = item["document"]
                            unit_data = self._convert_firestore_doc(doc)
                            units.append(unit_data)
            
            return units
        except Exception as e:
            logger.error(f"Error fetching units: {str(e)}")
            return []

    def get_maintenance_requests(self, user_id: str) -> list[Dict[str, Any]]:
        """Fetch maintenance requests for a user's properties"""
        try:
            requests_list = []
            properties = self.get_user_properties(user_id)
            
            for prop in properties:
                prop_id = prop.get("id", "")
                # Query maintenance where propertyId matches
                query_url = f"{self.firestore_url}:runQuery"
                query_body = {
                    "structuredQuery": {
                        "from": [{"collectionId": "maintenance"}],
                        "where": {
                            "fieldFilter": {
                                "field": {"fieldPath": "propertyId"},
                                "op": "EQUAL",
                                "value": {"stringValue": prop_id}
                            }
                        }
                    }
                }
                params = {"key": self.api_key}
                response = requests.post(query_url, json=query_body, params=params, timeout=10)
                
                if response.status_code == 200:
                    results = response.json()
                    for item in results:
                        if "document" in item:
                            doc = item["document"]
                            maint_data = self._convert_firestore_doc(doc)
                            requests_list.append(maint_data)
            
            return requests_list
        except Exception as e:
            logger.error(f"Error fetching maintenance requests: {str(e)}")
            return []

    @staticmethod
    def _convert_firestore_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Firestore document to Python dict"""
        fields = doc.get("fields", {})
        result = {}
        
        for key, value in fields.items():
            if "stringValue" in value:
                result[key] = value["stringValue"]
            elif "doubleValue" in value:
                result[key] = value["doubleValue"]
            elif "integerValue" in value:
                result[key] = int(value["integerValue"])
            elif "booleanValue" in value:
                result[key] = value["booleanValue"]
            elif "timestampValue" in value:
                result[key] = value["timestampValue"]
            elif "nullValue" in value:
                result[key] = None
            elif "arrayValue" in value:
                result[key] = value["arrayValue"].get("values", [])
            elif "mapValue" in value:
                result[key] = value["mapValue"].get("fields", {})
        
        return result

    @staticmethod
    def _get_timestamp() -> str:
        """Get current timestamp in RFC 3339 format"""
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# Global Firebase client instance
firebase_client = FirebaseClient()
