"""
Base Agent Class
All agents follow the Sense → Decide → Act loop
"""
from abc import ABC, abstractmethod
from typing import Any, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """
    Abstract base class for all autonomous agents
    """
    def __init__(self, name: str):
        self.name = name
        self.state: Dict[str, Any] = {}
        logger.info(f"Agent '{self.name}' initialized")

    @abstractmethod
    def sense(self, environment: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sense: Gather information from the environment
        """
        pass

    @abstractmethod
    def decide(self, perception: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decide: Make decisions based on perceived information
        """
        pass

    @abstractmethod
    def act(self, decision: Dict[str, Any], **kwargs) -> Any:
        """
        Act: Execute actions based on decisions
        """
        pass

    def run(self, environment: Dict[str, Any], **kwargs) -> Any:
        """
        Execute the full Sense → Decide → Act loop
        """
        logger.info(f"Agent '{self.name}' starting execution cycle")
        perception = self.sense(environment)
        decision = self.decide(perception)
        result = self.act(decision, **kwargs)
        logger.info(f"Agent '{self.name}' completed execution cycle")
        return result
