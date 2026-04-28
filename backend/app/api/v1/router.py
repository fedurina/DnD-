from fastapi import APIRouter

from app.api.v1 import auth, campaigns, characters, health, references, users

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(references.router)
api_router.include_router(characters.router)
api_router.include_router(campaigns.router)
