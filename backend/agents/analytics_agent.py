"""
Analytics Agent - Tracks performance and generates operational insights
"""
from agents.base_agent import BaseAgent
from typing import Dict, Any, List
from datetime import datetime
import logging
from models.models import PerformanceMetric
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class AnalyticsAgent(BaseAgent):
    """
    Autonomous agent responsible for:
    - Calculating average wait times
    - Tracking table turnover rates
    - Identifying peak demand hours
    - Storing historical performance metrics
    """
    
    def __init__(self):
        super().__init__("AnalyticsAgent")

    def sense(self, environment: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sense: Gather current operational state
        """
        perception = {
            "queue": environment.get("queue", []),
            "tables": environment.get("tables", []),
            "occupied_tables": environment.get("occupied_tables", []),
            "available_tables": environment.get("available_tables", []),
            "current_time": datetime.utcnow()
        }
        return perception

    def decide(self, perception: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decide: Calculate current metrics
        """
        queue = perception["queue"]
        tables = perception["tables"]
        
        # 1. Average Wait Time
        avg_wait = 0
        if queue:
            avg_wait = sum(q.estimated_wait_time for q in queue) / len(queue)
            
        # 2. Table Turnover (Occupancy Rate)
        occupancy_rate = 0
        if tables:
            occupied = len(perception["occupied_tables"])
            occupancy_rate = (occupied / len(tables)) * 100
            
        # 3. Peak Hour Analysis (Simple version)
        is_peak = len(queue) >= 5 or occupancy_rate > 80

        decisions = {
            "metrics": [
                {"type": "avg_wait_time", "value": int(avg_wait)},
                {"type": "occupancy_rate", "value": int(occupancy_rate)},
                {"type": "queue_length", "value": len(queue)}
            ],
            "insights": []
        }
        
        if is_peak:
            decisions["insights"].append({
                "type": "peak_warning",
                "message": f"High Demand Detected: {len(queue)} groups waiting. Consider optimization."
            })
        elif occupancy_rate < 50:
            decisions["insights"].append({
                "type": "efficiency_tip",
                "message": "Low occupancy period. Good time for staff breaks or marketing pushes."
            })
        else:
             decisions["insights"].append({
                "type": "efficiency_tip",
                "message": "Healthy flow. System is maintaining optimal turnover rates."
            })
            
        if occupancy_rate > 90:
             decisions["insights"].append({
                "type": "efficiency_alert",
                "message": "Near full capacity. Table turnover is critical now."
            })

        return decisions

    def act(self, decision: Dict[str, Any], **kwargs) -> Any:
        """
        Act: Return metrics and store them if not a dry run
        """
        db: Session = kwargs.get("db")
        dry_run = kwargs.get("dry_run", False)
        
        if db and not dry_run:
            try:
                for m in decision["metrics"]:
                    metric = PerformanceMetric(
                        metric_type=m["type"],
                        value=m["value"]
                    )
                    db.add(metric)
                # Note: db.commit() is usually handled by the orchestrator in run_cycle
                logger.info(f"AnalyticsAgent stored {len(decision['metrics'])} metrics to DB")
            except Exception as e:
                logger.error(f"Error storing metrics: {e}")
        
        return {
            "agent": self.name,
            "metrics": decision["metrics"],
            "insights": decision["insights"],
            "status": "success"
        }
