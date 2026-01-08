"""
Table Agent - Monitors and manages table states autonomously
"""
from agents.base_agent import BaseAgent
from typing import Dict, Any, List
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class TableAgent(BaseAgent):
    """
    Autonomous agent responsible for:
    - Monitoring table states
    - Detecting stale occupancies
    - Suggesting table availability updates
    """
    
    def __init__(self):
        super().__init__("TableAgent")
        self.avg_dining_time = 45  # Average dining time in minutes
        self.warning_threshold = 60  # Warn if occupied > 60 minutes

    def sense(self, environment: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sense: Gather current table states from database
        """
        tables = environment.get("tables", [])
        current_time = datetime.utcnow()
        
        perception = {
            "total_tables": len(tables),
            "available_tables": [],
            "occupied_tables": [],
            "reserved_tables": [],
            "stale_occupancies": [],
            "current_time": current_time
        }
        
        for table in tables:
            if table.status == "available":
                perception["available_tables"].append(table)
            elif table.status == "occupied":
                perception["occupied_tables"].append(table)
                
                # Check for stale occupancies
                if table.occupied_since:
                    duration = (current_time - table.occupied_since).total_seconds() / 60
                    if duration > self.warning_threshold:
                        perception["stale_occupancies"].append({
                            "table": table,
                            "duration": duration
                        })
            elif table.status == "reserved":
                perception["reserved_tables"].append(table)
        
        logger.info(f"TableAgent sensed: {len(perception['available_tables'])} available, "
                   f"{len(perception['occupied_tables'])} occupied, "
                   f"{len(perception['stale_occupancies'])} stale")
        
        return perception

    def decide(self, perception: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decide: Determine actions based on table states
        """
        decisions = {
            "recommendations": [],
            "alerts": []
        }
        
        # Alert on stale occupancies
        for stale in perception["stale_occupancies"]:
            decisions["alerts"].append({
                "type": "stale_occupancy",
                "table_id": stale["table"].id,
                "table_number": stale["table"].number,
                "duration": stale["duration"],
                "message": f"Table {stale['table'].number} occupied for {stale['duration']:.0f} minutes"
            })
        
        # Recommend table assignments based on availability
        available_count = len(perception["available_tables"])
        if available_count == 0:
            decisions["recommendations"].append({
                "type": "no_tables_available",
                "message": "No tables available - queue will grow"
            })
        
        return decisions

    def act(self, decision: Dict[str, Any], **kwargs) -> Any:
        """
        Act: Return recommendations and alerts
        (Actual database updates are done by API endpoints)
        """
        return {
            "agent": self.name,
            "recommendations": decision["recommendations"],
            "alerts": decision["alerts"]
        }
