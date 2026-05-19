from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from typing import Optional
import os
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="RentProof API",
    description="Property management API for landlords and tenants",
    version="1.0.0"
)

# Configure CORS for Next.js frontend
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8000",
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)


# Add request logging middleware
from starlette.middleware.base import BaseHTTPMiddleware

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        logger.info(f">>> {request.method} {request.url.path}")
        try:
            response = await call_next(request)
            logger.info(f"<<< {response.status_code} {request.url.path}")
            return response
        except Exception as e:
            logger.error(f"!!! {request.method} {request.url.path} - {str(e)}")
            raise


# Add catch-all OPTIONS handler at app level
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """Handle all OPTIONS requests"""
    logger.info(f"Catch-all OPTIONS handler: /{full_path}")
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "600",
        }
    )

app.add_middleware(LoggingMiddleware)

# Import routers
import backend.auth as auth
import backend.routers.content as content
import backend.routers.dashboard as dashboard
import backend.routers.tenant as tenant
# Include routers
app.include_router(content.router, prefix="/api/content", tags=["content"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(tenant.router, prefix="/api/tenant", tags=["tenant"])


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "RentProof API",
        "version": "1.0.0",
        "docs": "/docs"
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
        reload=True
    )
