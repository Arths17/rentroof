import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import backend.auth as auth
import backend.routers.content as content
import backend.routers.dashboard as dashboard
import backend.routers.tenant as tenant
import backend.routers.chatbot as chatbot


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        logger.info(">>> %s %s", request.method, request.url.path)
        try:
            response = await call_next(request)
            logger.info("<<< %s %s", response.status_code, request.url.path)
            return response
        except Exception:
            logger.exception("!!! %s %s", request.method, request.url.path)
            raise


app = FastAPI(
    title="RentProof API",
    description="Property management API for landlords and tenants",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)

app.add_middleware(LoggingMiddleware)

app.include_router(content.router, prefix="/api/content", tags=["content"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(
    dashboard.router,
    prefix="/api/dashboard",
    tags=["dashboard"],
)
app.include_router(tenant.router, prefix="/api/tenant", tags=["tenant"])
app.include_router(chatbot.router, prefix="/api/chatbot", tags=["chatbot"])


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "RentProof API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
