"""
GraphQL endpoint — Smart Farm AI v3.0 (Strawberry)
Provides a flexible query interface for dashboard aggregations.
Install: pip install strawberry-graphql[fastapi]
"""
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

try:
    import strawberry
    from strawberry.fastapi import GraphQLRouter

    @strawberry.type
    class CVEventType:
        id:           int
        camera_id:    str
        object_class: str
        confidence:   Optional[float]
        severity:     Optional[str]
        timestamp:    Optional[str]

    @strawberry.type
    class AnimalType:
        id:      int
        name:    str
        species: str

    @strawberry.type
    class DriftSummary:
        category: str
        psi:      Optional[float]
        severity: str

    @strawberry.type
    class Query:
        @strawberry.field
        def cv_events(
            self,
            info,
            limit: int = 20,
            category: Optional[str] = None,
        ) -> List[CVEventType]:
            from app.core.database import SessionLocal
            from app.models.domain import CVEvent
            db = SessionLocal()
            try:
                q = db.query(CVEvent)
                if category:
                    q = q.filter(CVEvent.camera_id == category)
                rows = q.order_by(CVEvent.timestamp.desc()).limit(limit).all()
                return [CVEventType(
                    id=r.id, camera_id=r.camera_id or "",
                    object_class=r.object_class or "",
                    confidence=r.confidence,
                    severity=r.severity,
                    timestamp=r.timestamp.isoformat() if r.timestamp else None,
                ) for r in rows]
            finally:
                db.close()

        @strawberry.field
        def animals(
            self,
            info,
            species: Optional[str] = None,
            limit: int = 50,
        ) -> List[AnimalType]:
            from app.core.database import SessionLocal
            from app.models.domain import AnimalUnit
            db = SessionLocal()
            try:
                q = db.query(AnimalUnit)
                if species:
                    q = q.filter(AnimalUnit.species == species)
                rows = q.limit(limit).all()
                return [AnimalType(id=r.id, name=r.name or "", species=r.species or "") for r in rows]
            finally:
                db.close()

        @strawberry.field
        def drift_audit(self, info) -> List[DriftSummary]:
            from app.core.database import SessionLocal
            from app.services.drift_detection_service import DriftDetectionService
            db = SessionLocal()
            try:
                svc = DriftDetectionService(db)
                audit = svc.run_full_audit()
                return [
                    DriftSummary(
                        category=r["category"],
                        psi=r.get("label_drift", {}).get("psi"),
                        severity=r.get("label_drift", {}).get("severity", "ok"),
                    )
                    for r in audit.get("results", [])
                ]
            finally:
                db.close()

    schema = strawberry.Schema(query=Query)
    graphql_router = GraphQLRouter(schema, path="/graphql")
    HAS_GRAPHQL = True

except ImportError:
    graphql_router = None
    HAS_GRAPHQL = False
    logger.info("strawberry-graphql not installed — GraphQL disabled. pip install 'strawberry-graphql[fastapi]'")
