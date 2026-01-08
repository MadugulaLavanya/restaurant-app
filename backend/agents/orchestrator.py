"""
Agent Orchestrator - Coordinates all autonomous agents
"""
from agents.table_agent import TableAgent
from agents.queue_agent import QueueAgent
from agents.eta_agent import ETAAgent
from agents.notification_agent import NotificationAgent
from agents.analytics_agent import AnalyticsAgent
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from models.models import Table, QueueEntry
import logging

logger = logging.getLogger(__name__)

class AgentOrchestrator:
    """
    Orchestrates multiple agents to work together
    Implements the multi-agent coordination pattern
    """
    
    def __init__(self):
        self.table_agent = TableAgent()
        self.queue_agent = QueueAgent()
        self.eta_agent = ETAAgent()
        self.notification_agent = NotificationAgent()
        self.analytics_agent = AnalyticsAgent()
        logger.info("AgentOrchestrator initialized with all agents")

    def prepare_environment(self, db: Session) -> Dict[str, Any]:
        """
        Prepare the environment state for agents
        """
        tables = db.query(Table).all()
        queue = db.query(QueueEntry).order_by(QueueEntry.position).all()
        
        available_tables = [t for t in tables if t.status == "available"]
        occupied_tables = [t for t in tables if t.status == "occupied"]
        
        return {
            "tables": tables,
            "queue": queue,
            "available_tables": available_tables,
            "occupied_tables": occupied_tables
        }

    def run_cycle(self, db: Session) -> Dict[str, Any]:
        """
        Run a complete orchestration cycle with all agents
        """
        logger.info("Starting agent orchestration cycle")
        
        # Prepare environment
        environment = self.prepare_environment(db)
        
        # Run Table Agent
        table_result = self.table_agent.run(environment, db=db)
        
        # Run Queue Agent
        queue_result = self.queue_agent.run(environment, db=db)
        
        # Run ETA Agent
        eta_result = self.eta_agent.run(environment, db=db)
        
        # Run Notification Agent (needs results from previous agents)
        notification_environment = environment.copy()
        notification_environment.update({
            "queue_matches": queue_result.get("matches", []),
            "table_alerts": table_result.get("alerts", []),
            "queue_updates": queue_result.get("queue_updates", [])
        })
        notification_result = self.notification_agent.run(notification_environment, db=db)
        
        # Run Analytics Agent
        analytics_result = self.analytics_agent.run(environment, db=db)
        
        # Apply ETA updates to database
        for eta_update in eta_result.get("eta_updates", []):
            queue_entry = db.query(QueueEntry).filter(
                QueueEntry.id == eta_update["queue_entry_id"]
            ).first()
            if queue_entry:
                queue_entry.estimated_wait_time = eta_update["estimated_wait_time"]
        
        # Apply queue position updates
        for queue_update in queue_result.get("queue_updates", []):
            queue_entry = db.query(QueueEntry).filter(
                QueueEntry.id == queue_update["queue_entry_id"]
            ).first()
            if queue_entry:
                queue_entry.position = queue_update["new_position"]
        
        db.commit()
        
        # Compile results
        orchestration_result = {
            "timestamp": environment.get("current_time"),
            "table_agent": table_result,
            "queue_agent": queue_result,
            "eta_agent": eta_result,
            "notification_agent": notification_result,
            "analytics_agent": analytics_result,
            "summary": {
                "total_tables": len(environment["tables"]),
                "available_tables": len(environment["available_tables"]),
                "queue_length": len(environment["queue"]),
                "matches_found": len(queue_result.get("matches", [])),
                "alerts": len(table_result.get("alerts", []))
            }
        }
        
        logger.info(f"Orchestration cycle complete: {orchestration_result['summary']}")
        
        return orchestration_result

# Global orchestrator instance
orchestrator = AgentOrchestrator()
