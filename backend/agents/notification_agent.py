"""
Notification Agent - Handles communications with customers and staff
"""
from agents.base_agent import BaseAgent
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class NotificationAgent(BaseAgent):
    """
    Autonomous agent responsible for:
    - Sending table-ready notifications to customers
    - Alerting staff about stale tables
    - Sending queue status updates
    """
    
    def __init__(self):
        super().__init__("NotificationAgent")
        self.sent_notifications: List[Dict[str, Any]] = []

    def sense(self, environment: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sense: Gather notification needs from other agents' results
        """
        # The environment for this agent includes the results of previous agents
        perception = {
            "queue_matches": environment.get("queue_matches", []),
            "table_alerts": environment.get("table_alerts", []),
            "queue_updates": environment.get("queue_updates", [])
        }
        
        return perception

    def decide(self, perception: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decide: Determine what notifications need to be sent
        """
        decisions = {
            "to_send": []
        }
        
        # 1. Table Ready Notifications (from Queue Agent matches)
        for match in perception["queue_matches"]:
            decisions["to_send"].append({
                "type": "customer_seated",
                "recipient": match.get("customer_name"),
                "contact": match.get("phone", "N/A"),
                "message": f"Hello {match.get('customer_name')}, your Table {match.get('table_number')} is ready! Please proceed to the host stand.",
                "priority": "high"
            })
            
        # 2. Stale Table Alerts (from Table Agent alerts)
        for alert in perception["table_alerts"]:
            decisions["to_send"].append({
                "type": "staff_alert",
                "recipient": "Floor Manager",
                "message": f"ALERT: Table {alert.get('table_number')} has been occupied for {alert.get('duration'):.0f} minutes. Please check on the guests.",
                "priority": "medium"
            })
            
        return decisions

    def act(self, decision: Dict[str, Any], **kwargs) -> Any:
        """
        Act: "Send" the notifications (log them and store in state)
        """
        dry_run = kwargs.get("dry_run", False)
        notifications_sent = []
        
        for item in decision["to_send"]:
            # Simulate sending
            log_msg = f"[NOTIFICATION {'(DRY RUN)' if dry_run else 'SENT'}] To: {item.get('recipient')} | Msg: {item.get('message')}"
            logger.info(log_msg)
            
            # Store in state for frontend to see
            notification_record = {
                "id": len(self.sent_notifications) + 1,
                "type": item["type"],
                "recipient": item["recipient"],
                "message": item["message"],
                "timestamp": "now" # In real app, use datetime
            }
            
            if not dry_run:
                self.sent_notifications.append(notification_record)
            
            notifications_sent.append(notification_record)
            
        return {
            "agent": self.name,
            "status": "success",
            "notifications_sent": notifications_sent if dry_run else self.sent_notifications[-len(decision["to_send"]):]
        }

    def get_history(self) -> List[Dict[str, Any]]:
        """Return all sent notifications"""
        return self.sent_notifications
