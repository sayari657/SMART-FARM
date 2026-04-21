from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
from app.services.agent_service import agent_service

router = APIRouter()


class DetectionItem(BaseModel):
    label: str
    confidence: float
    bbox: Optional[List[float]] = None


class ChatRequest(BaseModel):
    query: str
    species: Optional[str] = None
    detections: Optional[List[DetectionItem]] = None


@router.post("/chat")
async def chat_with_agent(
    query: str = Query(...),
    species: Optional[str] = Query(None),
):
    """
    Simple GET-style chat (backward compat for existing frontend calls).
    No detections context — pure text query.
    """
    try:
        result = await agent_service.chat(query, species=species, detections=None)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze")
async def analyze_with_detections(body: ChatRequest):
    """
    CV-aware chat: sends detections as context so the AI diagnoses
    the specific problems found by the YOLO model.
    """
    try:
        detections = [d.model_dump() for d in body.detections] if body.detections else []
        result = await agent_service.chat(
            query=body.query,
            species=body.species,
            detections=detections,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
