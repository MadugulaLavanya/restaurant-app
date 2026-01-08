from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
import json
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database.db import engine, get_db, Base
from models.models import Table, QueueEntry, TableStatus
from models.schemas import (
    TableResponse, TableCreate, TableUpdate,
    QueueEntryResponse, QueueEntryCreate
)
from agents.orchestrator import orchestrator

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Antigravity Restaurant App",
    description="Autonomous agent-driven restaurant management system"
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= WEBSOCKET MANAGER =============

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                disconnected.append(connection)
        
        for connection in disconnected:
            if connection in self.active_connections:
                self.active_connections.remove(connection)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ============= HEALTH & INFO =============

@app.get("/")
async def read_root():
    return {
        "message": "Welcome to Antigravity Restaurant App API",
        "version": "1.0.0",
        "agents": ["TableAgent", "QueueAgent", "ETAAgent"]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# ============= TABLE ENDPOINTS =============

@app.get("/api/tables", response_model=List[TableResponse])
async def get_tables(db: Session = Depends(get_db)):
    """Get all tables"""
    tables = db.query(Table).all()
    return tables

@app.post("/api/tables", response_model=TableResponse)
async def create_table(table: TableCreate, db: Session = Depends(get_db)):
    """Create a new table"""
    db_table = Table(**table.dict())
    db.add(db_table)
    db.commit()
    db.refresh(db_table)
    return db_table

@app.put("/api/tables/{table_id}", response_model=TableResponse)
async def update_table(table_id: int, table_update: TableUpdate, db: Session = Depends(get_db)):
    """Update table status"""
    db_table = db.query(Table).filter(Table.id == table_id).first()
    if not db_table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    db_table.status = table_update.status
    if table_update.status == "occupied":
        db_table.occupied_since = datetime.utcnow()
    else:
        db_table.occupied_since = None
    
    db.commit()
    db.refresh(db_table)
    
    # Trigger agent orchestration after table update
    orchestrator.run_cycle(db)
    
    # Notify via WebSocket
    await manager.broadcast({"type": "TABLE_UPDATE", "data": {"id": table_id, "status": db_table.status}})
    
    return db_table

# ============= QUEUE ENDPOINTS =============

@app.get("/api/queue", response_model=List[QueueEntryResponse])
async def get_queue(db: Session = Depends(get_db)):
    """Get current queue"""
    queue = db.query(QueueEntry).order_by(QueueEntry.position).all()
    return queue

@app.post("/api/queue", response_model=QueueEntryResponse)
async def join_queue(entry: QueueEntryCreate, db: Session = Depends(get_db)):
    """Add customer to queue"""
    # Get next position
    max_position = db.query(QueueEntry).count()
    
    db_entry = QueueEntry(
        **entry.dict(),
        position=max_position + 1,
        estimated_wait_time=15  # Will be updated by ETA agent
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    
    # Trigger agent orchestration
    orchestrator.run_cycle(db)
    
    # Notify via WebSocket
    await manager.broadcast({"type": "QUEUE_UPDATE", "action": "ADD", "data": {"id": db_entry.id, "name": db_entry.name}})
    
    return db_entry

@app.delete("/api/queue/{entry_id}")
async def remove_from_queue(entry_id: int, db: Session = Depends(get_db)):
    """Remove customer from queue (when seated or cancelled)"""
    db_entry = db.query(QueueEntry).filter(QueueEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    
    db.delete(db_entry)
    db.commit()
    
    # Reorder queue
    orchestrator.run_cycle(db)
    
    # Notify via WebSocket
    await manager.broadcast({"type": "QUEUE_UPDATE", "action": "REMOVE", "data": {"id": entry_id}})
    
    return {"message": "Removed from queue"}

@app.get("/api/queue/status/{phone}", response_model=QueueEntryResponse)
async def get_customer_status(phone: str, db: Session = Depends(get_db)):
    """Get status for a specific customer by phone number"""
    entry = db.query(QueueEntry).filter(QueueEntry.phone == phone).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Customer not found in queue")
    return entry

# ============= AGENT ENDPOINTS =============

@app.post("/api/agents/run")
async def run_agents(db: Session = Depends(get_db)):
    """Manually trigger agent orchestration cycle"""
    result = orchestrator.run_cycle(db)
    return result

@app.get("/api/agents/status")
async def get_agent_status(db: Session = Depends(get_db)):
    """Get current agent analysis without making changes"""
    environment = orchestrator.prepare_environment(db)
    
    # Run agents in read-only mode with DB access for sense-upgrades
    table_result = orchestrator.table_agent.run(environment, dry_run=True, db=db)
    queue_result = orchestrator.queue_agent.run(environment, dry_run=True, db=db)
    eta_result = orchestrator.eta_agent.run(environment, dry_run=True, db=db)
    
    notification_env = environment.copy()
    notification_env.update({
        "queue_matches": queue_result.get("matches", []),
        "table_alerts": table_result.get("alerts", []),
        "queue_updates": queue_result.get("queue_updates", [])
    })
    notification_result = orchestrator.notification_agent.run(notification_env, dry_run=True, db=db)
    
    # Run Analytics Agent in read-only mode
    analytics_result = orchestrator.analytics_agent.run(environment, dry_run=True, db=db)
    
    return {
        "table_analysis": table_result,
        "queue_analysis": queue_result,
        "eta_analysis": eta_result,
        "notification_analysis": notification_result,
        "analytics_analysis": analytics_result,
        "environment_summary": {
            "total_tables": len(environment["tables"]),
            "available_tables": len(environment["available_tables"]),
            "occupied_tables": len(environment["occupied_tables"]),
            "queue_length": len(environment["queue"])
        }
    }

# ============= INITIALIZATION =============

@app.on_event("startup")
async def startup_event():
    """Initialize database with sample data if empty"""
    db = next(get_db())
    
    # Check if tables exist
    if db.query(Table).count() == 0:
        # Create sample tables
        sample_tables = [
            Table(number="T1", capacity=2, status=TableStatus.AVAILABLE),
            Table(number="T2", capacity=4, status=TableStatus.OCCUPIED, occupied_since=datetime.utcnow()),
            Table(number="T3", capacity=4, status=TableStatus.AVAILABLE),
            Table(number="T4", capacity=6, status=TableStatus.RESERVED),
            Table(number="T5", capacity=2, status=TableStatus.AVAILABLE),
            Table(number="T6", capacity=8, status=TableStatus.OCCUPIED, occupied_since=datetime.utcnow()),
            Table(number="T7", capacity=4, status=TableStatus.AVAILABLE),
            Table(number="T8", capacity=2, status=TableStatus.OCCUPIED, occupied_since=datetime.utcnow()),
        ]
        db.add_all(sample_tables)
        db.commit()
        
        # Create sample queue
        sample_queue = [
            QueueEntry(name="John Doe", party_size=4, phone="555-0001", position=1, estimated_wait_time=15),
            QueueEntry(name="Jane Smith", party_size=2, phone="555-0002", position=2, estimated_wait_time=25),
            QueueEntry(name="Bob Johnson", party_size=6, phone="555-0003", position=3, estimated_wait_time=35),
        ]
        db.add_all(sample_queue)
        db.commit()
        
        print("✅ Database initialized with sample data")
    
    db.close()
