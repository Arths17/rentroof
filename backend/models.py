from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ==================== Content Models ====================

class Feature(BaseModel):
    id: str
    tag: str
    title: str
    description: str
    icon: str


class PricingPlan(BaseModel):
    id: str
    name: str
    monthlyPrice: float
    annualPrice: float
    unitLimit: Optional[int]
    description: str
    features: List[str]
    cta: str
    link: str
    badge: Optional[str] = None
    featured: Optional[bool] = False


class Testimonial(BaseModel):
    id: int
    quote: str
    author: str
    role: str
    category: str


class Stat(BaseModel):
    id: int
    number: str
    label: str
    icon: str


# ==================== Auth Models ====================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    plan: str = "growth"


class User(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: str = "landlord"
    plan: Optional[str] = None


class AuthResponse(BaseModel):
    success: bool
    user: Optional[User] = None
    redirectUrl: Optional[str] = None
    message: Optional[str] = None
    token: Optional[str] = None


# ==================== Dashboard Models ====================

class Unit(BaseModel):
    id: str
    name: str
    tenant: str
    email: str = ""
    rentAmount: float
    status: str  # 'paid', 'pending', 'late'
    dueDate: Optional[str] = None
    paidDate: Optional[str] = None
    daysLate: Optional[int] = None


class Property(BaseModel):
    id: str
    address: str
    city: str
    state: str
    zipCode: Optional[str] = None
    units: List[Unit] = []


class PropertyCreateRequest(BaseModel):
    address: str
    city: str
    state: str
    zipCode: Optional[str] = None


class UnitCreateRequest(BaseModel):
    name: str
    tenant: Optional[str] = ""
    email: str
    rentAmount: float
    status: str = "vacant"
    dueDate: Optional[int] = None


class RentStatusUnit(BaseModel):
    id: str
    unit: str
    tenant: str
    amount: float
    status: str
    paidDate: Optional[str] = None
    dueDate: Optional[str] = None
    daysLate: Optional[int] = None


class RentStatus(BaseModel):
    month: str
    totalUnits: int
    collectedUnits: int
    percentageCollected: float
    totalRentExpected: float
    totalRentCollected: float
    units: List[RentStatusUnit]


class MaintenanceRequest(BaseModel):
    id: str
    unit: str
    tenant: str
    title: str
    description: str
    status: str  # 'open', 'in-progress', 'completed'
    priority: str  # 'low', 'medium', 'high'
    submittedDate: str
    images: List[str] = []
    assignedTo: Optional[str] = None
    completedDate: Optional[str] = None


class MaintenanceCreateRequest(BaseModel):
    unitId: str
    title: str
    description: str
    priority: str = "medium"
    images: List[str] = []


class Deposit(BaseModel):
    id: str
    unit: str
    tenant: str
    amount: float
    dateReceived: str
    moveInDate: str
    moveOutDate: Optional[str] = None
    status: str  # 'held', 'returned', 'dispute'
    returnDeadline: Optional[str] = None
    returnedDate: Optional[str] = None
    returnAmount: Optional[float] = None


class DepositCreateRequest(BaseModel):
    unitId: str
    tenantId: str
    amount: float
    dateReceived: str


# ==================== Tenant Models ====================

class Lease(BaseModel):
    id: str
    startDate: str
    endDate: str
    rentAmount: float
    dueDate: int


class CurrentRent(BaseModel):
    dueDate: str
    amount: float
    status: str
    paymentMethods: List[dict]


class Document(BaseModel):
    id: str
    name: str
    type: str
    uploadedDate: str


class TenantPortal(BaseModel):
    tenant: User
    property: dict
    unit: dict
    currentRent: CurrentRent
    documents: List[Document] = []
    maintenanceRequests: List[MaintenanceRequest] = []


class PaymentRequest(BaseModel):
    tenantId: str
    unitId: str
    amount: float
    paymentMethod: str  # 'bank', 'card'


class Payment(BaseModel):
    id: str
    tenantId: str
    unitId: str
    amount: float
    paymentMethod: str
    status: str
    timestamp: str
    receiptUrl: str


class PaymentResponse(BaseModel):
    success: bool
    payment: Optional[Payment] = None
    message: Optional[str] = None


class TenantMaintenanceRequest(BaseModel):
    tenantId: str
    unitId: str
    title: str
    description: str
    priority: str = "medium"
    images: List[str] = []


class WalkthroughRoom(BaseModel):
    id: str
    name: str
    status: str  # 'pending', 'completed'
    photos: List[str] = []


class MoveInWalkthrough(BaseModel):
    id: str
    tenantId: str
    unitId: str
    status: str
    startedDate: Optional[str] = None
    completedDate: Optional[str] = None
    rooms: List[WalkthroughRoom]
    instructions: str


class WalkthroughSubmitRequest(BaseModel):
    tenantId: str
    unitId: str
    roomId: str
    photos: List[str]


class Certificate(BaseModel):
    timestamp: str
    hash: str
    status: str


class WalkthroughSubmitResponse(BaseModel):
    success: bool
    room: dict
    message: str
