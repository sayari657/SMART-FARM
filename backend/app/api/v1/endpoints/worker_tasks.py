"""
Worker Tasks — REST API
Allows owners to create/assign tasks and workers to update their status.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import WorkerTask, User

router = APIRouter(prefix="/worker/tasks", tags=["Worker Tasks"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    farm_id: int
    worker_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str = "normal"

class TaskStatusUpdate(BaseModel):
    status: str
    done_at: Optional[datetime] = None

class TaskOut(BaseModel):
    id: int
    farm_id: int
    worker_id: Optional[int]
    title: str
    description: Optional[str]
    due_date: Optional[datetime]
    status: str
    priority: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=List[TaskOut])
def list_my_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Workers: list tasks assigned to me. Owners: list all tasks across their farms."""
    if current_user.role == "worker":
        tasks = db.query(WorkerTask).filter(WorkerTask.worker_id == current_user.id).all()
    else:
        tasks = db.query(WorkerTask).all()
    return tasks


@router.get("/farm/{farm_id}", response_model=List[TaskOut])
def list_farm_tasks(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all tasks for a specific farm (owner access)."""
    return db.query(WorkerTask).filter(WorkerTask.farm_id == farm_id).all()


@router.post("", response_model=TaskOut, status_code=201)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new worker task (owner only)."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Seul le propriétaire peut créer des tâches.")
    task = WorkerTask(**task_in.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.put("/{task_id}", response_model=TaskOut)
def update_task_status(
    task_id: int,
    update: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Worker updates their task status (done/blocked/pending)."""
    task = db.get(WorkerTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable.")
    if current_user.role == "worker" and task.worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cette tâche ne vous est pas assignée.")
    task.status = update.status
    if update.done_at:
        task.done_at = update.done_at
    elif update.status == "done":
        task.done_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a task (owner only)."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Seul le propriétaire peut supprimer des tâches.")
    task = db.get(WorkerTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable.")
    db.delete(task)
    db.commit()
