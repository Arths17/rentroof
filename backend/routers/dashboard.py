from fastapi import APIRouter, HTTPException, status
from backend.models import (
    Property, PropertyCreateRequest, RentStatus, RentStatusUnit,
    MaintenanceRequest, MaintenanceCreateRequest, Deposit, DepositCreateRequest,
    Unit, UnitCreateRequest
)
from typing import List
from datetime import datetime
from pathlib import Path
import json
import hashlib
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Mock data storage (replace with real database)
PROPERTIES_DB = []
MAINTENANCE_DB = []
DEPOSITS_DB = []

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / ".data"
PROPERTIES_FILE = DATA_DIR / "properties.json"
DEPOSITS_FILE = DATA_DIR / "deposits.json"


def read_deposits() -> list[Deposit]:
    try:
        if not DEPOSITS_FILE.exists():
            return []
        with DEPOSITS_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Error reading deposits: {e}")
        return []


def write_deposits(deposits: list[Deposit]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    # convert pydantic models or dicts
    serializable = []
    for d in deposits:
        if hasattr(d, 'model_dump'):
            serializable.append(d.model_dump())
        else:
            serializable.append(d)
    with DEPOSITS_FILE.open("w", encoding="utf-8") as f:
        json.dump(serializable, f, indent=2)


def map_tenant_id_to_name(tenant_id: str) -> str:
    """Attempt to map a tenantId (md5 hash of the tenant name) to the tenant's name
    by scanning properties and units."""
    try:
        props = read_properties()
        for prop in props:
            for unit in prop.units:
                name = getattr(unit, 'tenant', '')
                if not name:
                    continue
                if hashlib.md5(name.encode()).hexdigest() == tenant_id:
                    return name
    except Exception:
        pass
    return ""


def read_properties() -> list[Property]:
    try:
        if not PROPERTIES_FILE.exists():
            return []
        with PROPERTIES_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)

        def normalize_due_date(value):
            if value is None:
                return None
            if isinstance(value, int):
                return value
            if isinstance(value, str):
                if value.isdigit():
                    return int(value)
                try:
                    return datetime.fromisoformat(value).day
                except ValueError:
                    return None
            return None

        normalized_properties = []
        for item in data:
            units = []
            for unit in item.get("units", []):
                normalized = normalize_due_date(unit.get("dueDate"))
                unit["dueDate"] = str(normalized) if normalized is not None else None
                units.append(unit)
            item["units"] = units
            normalized_properties.append(Property(**item))

        return normalized_properties
    except Exception as e:
        print(f"Error reading properties: {e}")
        import traceback
        traceback.print_exc()
        return []


def write_properties(properties: list[Property]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with PROPERTIES_FILE.open("w", encoding="utf-8") as file:
        json.dump([property_item.model_dump() for property_item in properties], file, indent=2)


# ==================== Properties ====================

@router.get("/properties", response_model=List[Property])
async def get_properties():
    """Get all properties for authenticated user"""
    # TODO: Filter by user ID from auth token
    return read_properties()


@router.post("/properties", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_property(request: PropertyCreateRequest):
    """Create a new property"""
    try:
        properties = read_properties()
        new_property = Property(
            id=f"prop_{datetime.now().timestamp()}",
            address=request.address,
            city=request.city,
            state=request.state,
            zipCode=request.zipCode,
            units=[]
        )

        properties.append(new_property)
        write_properties(properties)
        
        return {
            "success": True,
            "property": new_property.model_dump()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create property"
        )


@router.post("/properties/{property_id}/units", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_property_unit(property_id: str, request: UnitCreateRequest):
    """Add a unit to an existing property"""
    try:
        properties = read_properties()

        for index, property_item in enumerate(properties):
            if property_item.id != property_id:
                continue

            new_unit = Unit(
                id=f"unit_{datetime.now().timestamp()}",
                name=request.name,
                tenant=request.tenant or "",
                email=request.email,
                rentAmount=request.rentAmount,
                status=request.status,
                dueDate=str(request.dueDate) if request.dueDate is not None else None,
            )

            updated_property = Property(
                id=property_item.id,
                address=property_item.address,
                city=property_item.city,
                state=property_item.state,
                zipCode=property_item.zipCode,
                units=[*property_item.units, new_unit],
            )

            properties[index] = updated_property
            write_properties(properties)

            return {
                "success": True,
                "property": updated_property.model_dump(),
                "unit": new_unit.model_dump(),
            }

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create unit"
        )


@router.put("/properties/{property_id}", response_model=dict)
async def update_property(property_id: str, request: PropertyCreateRequest):
    """Update property details"""
    try:
        properties = read_properties()

        for index, property_item in enumerate(properties):
            if property_item.id != property_id:
                continue

            updated_property = Property(
                id=property_item.id,
                address=request.address,
                city=request.city,
                state=request.state,
                zipCode=request.zipCode,
                units=property_item.units,
            )

            properties[index] = updated_property
            write_properties(properties)

            return {
                "success": True,
                "property": updated_property.model_dump(),
            }

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update property"
        )


@router.put("/properties/{property_id}/units/{unit_id}", response_model=dict)
async def update_property_unit(property_id: str, unit_id: str, request: UnitCreateRequest):
    """Update a unit in a property"""
    try:
        properties = read_properties()

        for prop_index, property_item in enumerate(properties):
            if property_item.id != property_id:
                continue

            for unit_index, unit in enumerate(property_item.units):
                if unit.id != unit_id:
                    continue

                updated_unit = Unit(
                    id=unit.id,
                    name=request.name,
                    tenant=request.tenant or "",
                    email=request.email,
                    rentAmount=request.rentAmount,
                    status=request.status,
                    dueDate=str(request.dueDate) if request.dueDate is not None else None,
                    paidDate=unit.paidDate if hasattr(unit, 'paidDate') else None,
                )

                updated_units = property_item.units.copy()
                updated_units[unit_index] = updated_unit

                updated_property = Property(
                    id=property_item.id,
                    address=property_item.address,
                    city=property_item.city,
                    state=property_item.state,
                    zipCode=property_item.zipCode,
                    units=updated_units,
                )

                properties[prop_index] = updated_property
                write_properties(properties)

                return {
                    "success": True,
                    "property": updated_property.model_dump(),
                    "unit": updated_unit.model_dump(),
                }

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit or property not found"
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update unit"
        )


# ==================== Rent Status ====================

@router.get("/rent-status", response_model=RentStatus)
async def get_rent_status():
    """Get current rent collection status"""
    from datetime import datetime as dt
    
    current_month = dt.now().strftime("%B %Y")
    
    # Read properties and calculate expected rent
    properties = read_properties()
    total_units = 0
    total_rent_expected = 0
    collected_units = 0
    units_list = []
    
    for prop in properties:
        for unit in prop.units:
            if unit.status != "vacant":
                total_units += 1
                total_rent_expected += unit.rentAmount
                
                if unit.status == "paid":
                    collected_units += 1
                
                units_list.append(RentStatusUnit(
                    id=unit.id,
                    unit=unit.name,
                    tenant=unit.tenant,
                    amount=unit.rentAmount,
                    status=unit.status,
                    dueDate=unit.dueDate,
                    paidDate=unit.paidDate if hasattr(unit, 'paidDate') else None
                ))
    
    # Read payments and calculate collected amount
    payments_file = DATA_DIR / "payments.json"
    total_rent_collected = 0
    
    if payments_file.exists():
        try:
            with payments_file.open("r", encoding="utf-8") as file:
                payments = json.load(file)
            total_rent_collected = sum(p.get("amount", 0) for p in payments)
        except:
            total_rent_collected = 0
    
    percentage_collected = 0
    if total_rent_expected > 0:
        percentage_collected = int((total_rent_collected / total_rent_expected) * 100)
    
    return RentStatus(
        month=current_month,
        totalUnits=total_units,
        collectedUnits=collected_units,
        percentageCollected=percentage_collected,
        totalRentExpected=total_rent_expected,
        totalRentCollected=total_rent_collected,
        units=units_list
    )


@router.get("/payments", response_model=list[dict])
async def get_payments():
    """Get all payments with property and tenant information"""
    try:
        payments_file = DATA_DIR / "payments.json"
        if not payments_file.exists():
            return []
        
        with payments_file.open("r", encoding="utf-8") as file:
            payments = json.load(file)
        
        # Enhance payments with property and tenant info
        properties = read_properties()
        enhanced_payments = []
        
        for payment in payments:
            unit_id = payment.get("unitId")
            # Find property and unit to get tenant and property info
            property_info = None
            tenant_name = None
            unit_number = None
            
            for prop in properties:
                for unit in prop.units:
                    if unit.id == unit_id:
                        property_info = {
                            "id": prop.id,
                            "address": f"{prop.address}, {prop.city}, {prop.state} {prop.zipCode}"
                        }
                        tenant_name = unit.tenant
                        unit_number = unit.name
                        break
            
            enhanced_payments.append({
                **payment,
                "propertyInfo": property_info,
                "tenantName": tenant_name,
                "unitNumber": unit_number
            })
        
        return enhanced_payments
    
    except Exception as e:
        print(f"Error retrieving payments: {e}")
        return []


# ==================== Maintenance ====================

@router.get("/maintenance", response_model=List[MaintenanceRequest])
async def get_maintenance():
    """Get all maintenance requests"""
    from backend.routers.tenant import read_maintenance
    from backend.models import MaintenanceRequest as MaintModel
    
    tenant_requests = read_maintenance()
    properties = read_properties()
    
    # Convert tenant requests to landlord format
    maintenance_list = []
    for req in tenant_requests:
        # Find unit and tenant info from properties
        unit_name = ""
        tenant_name = ""
        
        for prop in properties:
            for unit in prop.units:
                if unit.id == req.get("unitId"):
                    unit_name = unit.name
                    tenant_name = unit.tenant
                    break
        
        maint_req = MaintModel(
            id=req.get("id", ""),
            unit=unit_name,
            tenant=tenant_name,
            title=req.get("title", ""),
            description=req.get("description", ""),
            status=req.get("status", "open"),
            priority=req.get("priority", "medium"),
            submittedDate=req.get("submittedDate", ""),
            images=req.get("images", [])
        )
        maintenance_list.append(maint_req)
    
    return maintenance_list


@router.post("/maintenance", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_maintenance(request: MaintenanceCreateRequest):
    """Create a new maintenance request"""
    try:
        if not request.unitId or not request.title:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unit ID and title are required"
            )
        
        maintenance = MaintenanceRequest(
            id=f"maint_{datetime.now().timestamp()}",
            unit=request.unitId,
            tenant="",  # TODO: Get tenant from database
            title=request.title,
            description=request.description,
            status="open",
            priority=request.priority,
            submittedDate=datetime.now().isoformat(),
            images=request.images,
        )
        
        MAINTENANCE_DB.append(maintenance)
        
        return {
            "success": True,
            "request": maintenance.model_dump()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create maintenance request"
        )


@router.put("/maintenance/{request_id}", response_model=dict)
async def update_maintenance_status(request_id: str, request: dict):
    """Update maintenance request status"""
    try:
        from backend.routers.tenant import read_maintenance, write_maintenance
        
        if "status" not in request:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status is required"
            )
        
        new_status = request.get("status")
        if new_status not in ["open", "in-progress", "completed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status. Must be 'open', 'in-progress', or 'completed'"
            )
        
        # Read maintenance requests
        maintenance_requests = read_maintenance()
        
        # Find and update the request
        updated = False
        for maint_req in maintenance_requests:
            if maint_req.get("id") == request_id:
                maint_req["status"] = new_status
                if new_status == "completed":
                    maint_req["completedDate"] = datetime.now().isoformat()
                updated = True
                break
        
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Maintenance request not found"
            )
        
        # Save updated requests
        write_maintenance(maintenance_requests)
        
        return {
            "success": True,
            "message": f"Maintenance request status updated to {new_status}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating maintenance status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update maintenance status"
        )


# ==================== Deposits ====================

@router.get("/deposits", response_model=List[Deposit])
async def get_deposits():
    """Get all deposit records"""
    # TODO: Fetch from database filtered by user
    try:
        deposits = read_deposits()
        return deposits
    except Exception as e:
        print(f"Error fetching deposits: {e}")
        return []


@router.post("/deposits", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_deposit(request: DepositCreateRequest):
    """Record a security deposit"""
    try:
        if not request.unitId or not request.amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unit ID and amount are required"
            )
        
        tenant_name = ""
        if hasattr(request, 'tenantId') and request.tenantId:
            tenant_name = map_tenant_id_to_name(request.tenantId)

        deposit = Deposit(
            id=f"dep_{datetime.now().timestamp()}",
            unit=request.unitId,
            tenant=tenant_name or "",
            amount=request.amount,
            dateReceived=request.dateReceived,
            moveInDate=request.dateReceived,
            status="held",
        )
        
        deposits = read_deposits()
        deposits.append(deposit.model_dump())
        write_deposits(deposits)

        return {
            "success": True,
            "deposit": deposit.model_dump()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create deposit"
        )
