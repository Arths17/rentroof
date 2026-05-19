from fastapi import APIRouter, HTTPException, status
from backend.models import (
    TenantPortal, PaymentRequest, PaymentResponse, Payment,
    TenantMaintenanceRequest, MoveInWalkthrough, WalkthroughRoom,
    WalkthroughSubmitRequest, WalkthroughSubmitResponse, Certificate
)
from datetime import datetime
import hashlib
from pathlib import Path
import json

router = APIRouter()

# Mock data storage
PAYMENTS_DB = []
WALKTHROUGH_DB = []

# Setup maintenance file storage
BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / ".data"
MAINTENANCE_FILE = DATA_DIR / "maintenance.json"
PAYMENTS_FILE = DATA_DIR / "payments.json"


def read_maintenance() -> list[dict]:
    """Read maintenance requests from file"""
    try:
        if not MAINTENANCE_FILE.exists():
            return []
        with MAINTENANCE_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Error reading maintenance requests: {e}")
        return []


def write_maintenance(requests: list[dict]) -> None:
    """Write maintenance requests to file"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with MAINTENANCE_FILE.open("w", encoding="utf-8") as file:
        json.dump(requests, file, indent=2)


def read_payments() -> list[dict]:
    """Read payments from file"""
    try:
        if not PAYMENTS_FILE.exists():
            return []
        with PAYMENTS_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Error reading payments: {e}")
        return []


def write_payments(payments: list[dict]) -> None:
    """Write payments to file"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with PAYMENTS_FILE.open("w", encoding="utf-8") as file:
        json.dump(payments, file, indent=2)


# ==================== Tenant Portal ====================

@router.get("/portal", response_model=dict)
async def get_tenant_portal():
    """Get tenant dashboard data"""
    # TODO: Fetch from database filtered by tenant ID
    # For now, return demo tenant data
    from datetime import datetime, timedelta
    from backend.routers.dashboard import read_properties
    
    # Try to get real data from properties
    properties = read_properties()
    
    # Find a property with a tenant
    for prop in properties:
        if prop.units and len(prop.units) > 0:
            unit = prop.units[0]
            if unit.tenant:
                # Calculate lease dates
                today = datetime.now()
                lease_start = today - timedelta(days=90)
                lease_end = today + timedelta(days=275)
                
                # Calculate next rent due date
                due_day = int(unit.dueDate) if isinstance(unit.dueDate, str) and unit.dueDate.isdigit() else 1
                next_month = today.replace(day=1) + timedelta(days=32)
                next_due = next_month.replace(day=min(due_day, 28))
                
                return {
                    "tenant": {
                        "id": f"tenant_{hashlib.md5(unit.tenant.encode()).hexdigest()}",
                        "name": unit.tenant,
                        "email": f"{unit.tenant.lower().replace(' ', '.')}@example.com",
                        "role": "tenant"
                    },
                    "property": {
                        "id": prop.id,
                        "address": f"{prop.address}, {prop.city}, {prop.state} {prop.zipCode}"
                    },
                    "unit": {
                        "id": unit.id,
                        "number": unit.name,
                        "status": unit.status,
                        "paidDate": unit.paidDate,
                        "lease": {
                            "id": f"lease_{unit.id}",
                            "startDate": lease_start.isoformat(),
                            "endDate": lease_end.isoformat(),
                            "rentAmount": unit.rentAmount,
                            "dueDate": due_day
                        }
                    },
                    "currentRent": {
                        "dueDate": next_due.isoformat(),
                        "amount": unit.rentAmount,
                        "status": unit.status if unit.status in ['paid', 'pending', 'late'] else 'pending',
                        "paymentMethods": [
                            {"type": "bank", "label": "Bank Transfer"},
                            {"type": "card", "label": "Credit Card"}
                        ]
                    },
                    "documents": [
                        {
                            "id": "doc_1",
                            "name": "Lease Agreement",
                            "type": "pdf",
                            "uploadedDate": lease_start.isoformat()
                        }
                    ],
                    "maintenanceRequests": read_maintenance()
                }
    
    # Return empty portal if no tenants found
    return {
        "tenant": None,
        "property": None,
        "unit": None,
        "currentRent": None,
        "documents": [],
        "maintenanceRequests": [],
    }


# ==================== Rent Payment ====================

@router.post("/pay-rent", response_model=dict, status_code=status.HTTP_201_CREATED)
async def pay_rent(request: PaymentRequest):
    """Submit rent payment from tenant portal"""
    try:
        if not request.tenantId or not request.amount or not request.paymentMethod:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant ID, amount, and payment method are required"
            )
        
        if request.amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be greater than 0"
            )
        
        # Create payment record
        payment_dict = {
            "id": f"payment_{datetime.now().timestamp()}",
            "tenantId": request.tenantId,
            "unitId": request.unitId,
            "amount": float(request.amount),
            "paymentMethod": request.paymentMethod,
            "status": "completed",
            "timestamp": datetime.now().isoformat()
        }
        
        # Save payment to file
        payments = read_payments()
        payments.append(payment_dict)
        write_payments(payments)
        
        # Update unit status to paid in properties
        from backend.routers.dashboard import read_properties, write_properties
        properties = read_properties()
        
        updated = False
        for prop in properties:
            for unit in prop.units:
                if unit.id == request.unitId:
                    unit.status = "paid"
                    unit.paidDate = datetime.now().isoformat()
                    updated = True
        
        if updated:
            write_properties(properties)
        
        return {
            "success": True,
            "payment": payment_dict,
            "message": "Payment submitted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Payment error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==================== Maintenance Requests ====================

@router.get("/maintenance", response_model=list[dict])
async def get_maintenance():
    """Get all maintenance requests"""
    return read_maintenance()


@router.post("/maintenance", response_model=dict, status_code=status.HTTP_201_CREATED)
async def submit_maintenance(request: TenantMaintenanceRequest):
    """Tenant submits a maintenance request"""
    try:
        if not request.tenantId or not request.unitId or not request.title:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant ID, unit ID, and title are required"
            )
        
        maintenance = {
            "id": f"maint_req_{datetime.now().timestamp()}",
            "tenantId": request.tenantId,
            "unitId": request.unitId,
            "title": request.title,
            "description": request.description,
            "priority": request.priority,
            "status": "open",
            "submittedDate": datetime.now().isoformat(),
            "images": request.images,
        }
        
        # Save to file
        maintenance_list = read_maintenance()
        maintenance_list.append(maintenance)
        write_maintenance(maintenance_list)
        
        return {
            "success": True,
            "request": maintenance,
            "message": "Maintenance request submitted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error submitting maintenance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit maintenance request"
        )


# ==================== Move-In Walkthrough ====================

@router.get("/move-in-walkthrough", response_model=MoveInWalkthrough)
async def get_move_in_walkthrough():
    """Get move-in photo walkthrough details"""
    # TODO: Fetch from database filtered by tenant
    rooms = [
        WalkthroughRoom(id="room1", name="Living Room", status="pending"),
        WalkthroughRoom(id="room2", name="Kitchen", status="pending"),
        WalkthroughRoom(id="room3", name="Bedroom 1", status="pending"),
        WalkthroughRoom(id="room4", name="Bedroom 2", status="pending"),
        WalkthroughRoom(id="room5", name="Bathroom", status="pending"),
    ]
    
    return MoveInWalkthrough(
        id="walkthrough123",
        tenantId="tenant123",
        unitId="unit2a",
        status="not-started",
        rooms=rooms,
        instructions="Take clear photos of the condition of each room. Capture any existing damage, stains, or wear."
    )


@router.post("/move-in-walkthrough", response_model=WalkthroughSubmitResponse, status_code=status.HTTP_201_CREATED)
async def submit_move_in_walkthrough(request: WalkthroughSubmitRequest):
    """Submit timestamped, locked photos for move-in walkthrough"""
    try:
        if not request.tenantId or not request.unitId or not request.roomId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant ID, unit ID, and room ID are required"
            )
        
        # Generate cryptographic hash for immutability
        photo_data = f"{request.tenantId}{request.unitId}{request.roomId}{''.join(request.photos)}{datetime.now().isoformat()}"
        content_hash = hashlib.sha256(photo_data.encode()).hexdigest()
        
        # Create certificate of authenticity
        certificate = Certificate(
            timestamp=datetime.now().isoformat(),
            hash=content_hash,
            status="verified"
        )
        
        room_data = {
            "id": request.roomId,
            "tenantId": request.tenantId,
            "unitId": request.unitId,
            "photoCount": len(request.photos),
            "uploadedDate": datetime.now().isoformat(),
            "locked": True,
            "certificate": certificate.model_dump()
        }
        
        # TODO: Store photos in cloud storage (Firebase Storage, AWS S3, etc.)
        # TODO: Make sure photos cannot be deleted or modified
        
        return WalkthroughSubmitResponse(
            success=True,
            room=room_data,
            message="Room photos submitted and locked successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit walkthrough photos"
        )
