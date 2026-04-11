from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.services.agent_service import agent_service

router = APIRouter()

@router.post("/chat")
async def chat_with_agent(
    query: str, 
    species: Optional[str] = Query(None, description="Species context for the query")
):
    """
    Sovereign Agri-Agent Endpoint.
    Connects the farmer to local agricultural wisdom via Labess-7B.
    """
    try:
        result = await agent_service.chat(query, species)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
