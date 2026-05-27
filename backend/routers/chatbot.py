from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.AI.gemini import GeminiService

router = APIRouter()


class ChatMessage(BaseModel):
    content: str


class ChatResponse(BaseModel):
    response: str
    error: str | None = None


@router.post('/message')
async def chat_message(message: ChatMessage) -> ChatResponse:
    """Send a message to RentProof Assistant and get a response."""
    try:
        service = GeminiService()
        result = service.ask(message.content)
        return ChatResponse(response=result)
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
