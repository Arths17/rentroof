from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from backend.AI.gemini import GeminiService
from backend.firebase_client import firebase_client
from backend.security import get_authenticated_user

router = APIRouter()


class ChatMessage(BaseModel):
    content: str


class ChatResponse(BaseModel):
    response: str
    error: str | None = None


@router.post('/message')
async def chat_message(message: ChatMessage, request: Request) -> ChatResponse:
    """Send a message to RentProof Assistant and get a response."""
    try:
        # Get authenticated user
        user, _ = get_authenticated_user(request)
        user_id = user.id
        
        # Fetch user's data from Firebase
        properties = firebase_client.get_user_properties(user_id)
        units = firebase_client.get_user_units(user_id)
        maintenance = firebase_client.get_maintenance_requests(user_id)
        
        # Build context
        context = {
            "user_id": user_id,
            "user_name": user.name,
            "user_plan": user.plan,
            "properties": properties,
            "units": units,
            "maintenance_requests": maintenance,
        }
        
        service = GeminiService()
        result = service.ask(message.content, context=context)
        return ChatResponse(response=result)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        return ChatResponse(
            response='',
            error=f'Failed to generate response: {str(exc)}',
        )


@router.get('/health')
async def chatbot_health():
    """Check chatbot service health."""
    return {'status': 'healthy', 'service': 'chatbot'}
