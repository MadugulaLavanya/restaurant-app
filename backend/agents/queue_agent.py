"""
Queue Agent - Manages customer queue intelligently
"""
from agents.base_agent import BaseAgent
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class QueueAgent(BaseAgent):
    """
    Autonomous agent responsible for:
    - Managing customer queue
    - Matching party sizes to available tables
    - Auto-reordering queue based on table availability
    """
    
    def __init__(self):
        super().__init__("QueueAgent")

    def sense(self, environment: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sense: Gather queue and table information
        """
        queue = environment.get("queue", [])
        available_tables = environment.get("available_tables", [])
        
        perception = {
            "queue_length": len(queue),
            "queue_entries": sorted(queue, key=lambda x: x.position),
            "available_tables": available_tables,
            "table_capacities": [t.capacity for t in available_tables]
        }
        
        logger.info(f"QueueAgent sensed: {perception['queue_length']} in queue, "
                   f"{len(available_tables)} tables available")
        
        return perception

    def decide(self, perception: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decide: Match customers to tables and reorder queue
        """
        decisions = {
            "matches": [],
            "queue_updates": [],
            "notifications": []
        }
        
        queue_entries = perception["queue_entries"]
        available_tables = perception["available_tables"]
        
        # Match customers to tables
        for entry in queue_entries:
            # Find best fitting table (smallest table that fits party size)
            suitable_tables = [
                t for t in available_tables 
                if t.capacity >= entry.party_size
            ]
            
            if suitable_tables:
                # Sort by capacity to get best fit
                best_table = min(suitable_tables, key=lambda t: t.capacity)
                
                decisions["matches"].append({
                    "queue_entry_id": entry.id,
                    "customer_name": entry.name,
                    "party_size": entry.party_size,
                    "table_id": best_table.id,
                    "table_number": best_table.number,
                    "table_capacity": best_table.capacity
                })
                
                decisions["notifications"].append({
                    "type": "table_ready",
                    "customer_name": entry.name,
                    "table_number": best_table.number,
                    "phone": entry.phone
                })
                
                # Remove matched table from available list
                available_tables.remove(best_table)
        
        # Reorder remaining queue
        remaining_queue = [
            e for e in queue_entries 
            if e.id not in [m["queue_entry_id"] for m in decisions["matches"]]
        ]
        
        for idx, entry in enumerate(remaining_queue, start=1):
            if entry.position != idx:
                decisions["queue_updates"].append({
                    "queue_entry_id": entry.id,
                    "new_position": idx
                })
        
        logger.info(f"QueueAgent decided: {len(decisions['matches'])} matches, "
                   f"{len(decisions['notifications'])} notifications")
        
        return decisions

    def act(self, decision: Dict[str, Any], **kwargs) -> Any:
        """
        Act: Return queue management actions
        """
        return {
            "agent": self.name,
            "matches": decision["matches"],
            "queue_updates": decision["queue_updates"],
            "notifications": decision["notifications"]
        }
