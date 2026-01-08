from agents.base_agent import BaseAgent
from typing import Dict, Any, List
from datetime import datetime, timedelta
import logging
from models.models import PerformanceMetric
from sqlalchemy.orm import Session
from sqlalchemy import func

logger = logging.getLogger(__name__)

class ETAAgent(BaseAgent):
    """
    Autonomous agent responsible for:
    - Calculating estimated wait times
    - Predicting table turnover
    - Updating ETAs dynamically
    """
    
    def __init__(self):
        super().__init__("ETAAgent")
        self.avg_dining_time = 45  # minutes
        self.default_wait_increment = 15  # minutes per position

    def sense(self, environment: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sense: Gather queue, table information, and historical metrics
        """
        db: Session = environment.get("db")
        queue = environment.get("queue", [])
        occupied_tables = environment.get("occupied_tables", [])
        available_tables = environment.get("available_tables", [])
        
        # Sense: Historical trend (avg occupancy in last 15 mins)
        recent_occupancy = 0
        if db:
            try:
                fifteen_mins_ago = datetime.utcnow() - timedelta(minutes=15)
                avg_val = db.query(func.avg(PerformanceMetric.value)).filter(
                    PerformanceMetric.metric_type == "occupancy_rate",
                    PerformanceMetric.timestamp >= fifteen_mins_ago
                ).scalar()
                recent_occupancy = float(avg_val) if avg_val else 0
                logger.info(f"ETAAgent sensed historical occupancy: {recent_occupancy:.1f}%")
            except Exception as e:
                logger.error(f"Error sensing historical metrics: {e}")
        
        perception = {
            "queue_entries": sorted(queue, key=lambda x: x.position),
            "occupied_tables": occupied_tables,
            "available_count": len(available_tables),
            "recent_occupancy": recent_occupancy,
            "current_time": datetime.utcnow()
        }
        
        return perception

    def decide(self, perception: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decide: Calculate ETAs for each queue entry
        """
        decisions = {
            "eta_updates": [],
            "factors": []
        }
        
        queue_entries = perception["queue_entries"]
        available_count = perception["available_count"]
        recent_occupancy = perception["recent_occupancy"]
        
        # Dynamic increment based on historical trend
        current_increment = self.default_wait_increment
        if recent_occupancy > 90:
            current_increment = 20 # Slower turnover when full
            decisions["factors"].append("High historical occupancy detected: increasing wait increment.")
        elif recent_occupancy < 50:
            current_increment = 10 # Faster turnover
            decisions["factors"].append("Low historical occupancy detected: reducing wait increment.")
        
        for entry in queue_entries:
            # Base calculation: position * dynamic increment
            base_eta = entry.position * current_increment
            
            # Adjust based on currently available tables
            if available_count > 0:
                # If tables are physically available, reduce wait time drastically
                eta = min(5, base_eta)
            else:
                eta = base_eta
                # If there are occupied tables, they will eventually turn over
                if perception["occupied_tables"]:
                    eta = max(10, eta - 5)
            
            decisions["eta_updates"].append({
                "queue_entry_id": entry.id,
                "estimated_wait_time": int(eta),
                "customer_name": entry.name
            })
        
        logger.info(f"ETAAgent calculated ETAs for {len(decisions['eta_updates'])} customers using {current_increment}m increment")
        
        return decisions

    def act(self, decision: Dict[str, Any], **kwargs) -> Any:
        """
        Act: Return ETA updates
        """
        return {
            "agent": self.name,
            "eta_updates": decision["eta_updates"],
            "factors": decision.get("factors", []),
            "status": "success"
        }
