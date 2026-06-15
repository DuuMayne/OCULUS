"""
Bridge between the shared CHECKS library and OCULUS's internal registry.

This module registers CHECKS library evaluators and connectors into OCULUS's
own registries, so the scheduler can run them alongside OCULUS's native checks.

The bridge adapts between the two interfaces:
- CHECKS evaluators return checks.models.CheckResult
- OCULUS evaluators return app.evaluators.base.EvaluationResult

The adapter wraps CHECKS evaluators to speak OCULUS's protocol.

Usage:
    Import this module at app startup to register all CHECKS evaluators:
        import app.checks_bridge  # noqa: F401
"""
from __future__ import annotations

import logging

from app.evaluators.base import EvaluatorBase, EvaluationResult, FailingResource
from app.evaluators.registry import EVALUATOR_REGISTRY
from app.connectors.base import (
    ConnectorBase as OculusConnectorBase,
    register_connector,
)

logger = logging.getLogger("oculus.checks_bridge")

try:
    from checks.connectors import list_connectors as checks_list_connectors
    from checks.connectors.base import _REGISTRY as CHECKS_CONNECTOR_REGISTRY
    from checks.evaluators.base import _REGISTRY as CHECKS_EVALUATOR_REGISTRY
    from checks.models import CheckResult, Status

    CHECKS_AVAILABLE = True
except ImportError:
    logger.info("CHECKS library not installed — bridge inactive")
    CHECKS_AVAILABLE = False


def _adapt_check_result(result: CheckResult) -> EvaluationResult:
    """Convert a CHECKS CheckResult to an OCULUS EvaluationResult."""
    return EvaluationResult(
        status=result.status.value,
        summary=result.summary,
        evidence=result.evidence,
        failures=[
            FailingResource(
                resource_type=f.resource_type,
                resource_identifier=f.resource_id,
                details=f.details,
            )
            for f in result.failures
        ],
        metadata={
            "source": "checks_library",
            "evaluator_type": result.evaluator_type,
            "duration_ms": result.duration_ms,
        },
    )


def _make_evaluator_adapter(checks_evaluator_cls):
    """Create an OCULUS-compatible evaluator that wraps a CHECKS evaluator."""

    class ChecksEvaluatorAdapter(EvaluatorBase):
        """Adapter: wraps a CHECKS library evaluator for use in OCULUS."""

        def __init__(self):
            self._inner = checks_evaluator_cls()

        def evaluate(self, data: dict, config: dict) -> EvaluationResult:
            result = self._inner.evaluate(data, config)
            return _adapt_check_result(result)

    ChecksEvaluatorAdapter.__name__ = f"Adapted_{checks_evaluator_cls.__name__}"
    ChecksEvaluatorAdapter.__doc__ = checks_evaluator_cls.description
    return ChecksEvaluatorAdapter


def _make_connector_adapter(checks_connector_cls):
    """Create an OCULUS-compatible connector that wraps a CHECKS connector."""

    class ChecksConnectorAdapter(OculusConnectorBase):
        """Adapter: wraps a CHECKS library connector for use in OCULUS."""
        connector_type = f"checks_{checks_connector_cls.connector_type}"
        required_env = checks_connector_cls.required_env
        mock_data = checks_connector_cls.mock_data

        def fetch(self, config: dict) -> dict:
            if checks_connector_cls.is_configured():
                inner = checks_connector_cls()
                return inner.fetch(config)
            return self.mock_data

        def test_connection(self) -> bool:
            if checks_connector_cls.is_configured():
                inner = checks_connector_cls()
                return inner.test_connection()
            return False

    ChecksConnectorAdapter.__name__ = f"Adapted_{checks_connector_cls.__name__}"
    return ChecksConnectorAdapter


def register_checks_library():
    """Register all CHECKS library evaluators and connectors into OCULUS.

    Evaluators are registered with a 'checks_' prefix to avoid collisions
    with OCULUS's native evaluators (e.g., 'checks_mfa_enforced' vs 'mfa_enforced').

    If a CHECKS evaluator has the same name as an OCULUS one, the OCULUS
    version takes precedence (it's already in the registry).
    """
    if not CHECKS_AVAILABLE:
        return

    registered_evaluators = 0
    registered_connectors = 0

    # Register evaluators
    for eval_type, eval_cls in CHECKS_EVALUATOR_REGISTRY.items():
        # Register with prefix to avoid collisions
        prefixed_key = f"checks_{eval_type}"
        if prefixed_key not in EVALUATOR_REGISTRY:
            adapter = _make_evaluator_adapter(eval_cls)
            EVALUATOR_REGISTRY[prefixed_key] = adapter
            registered_evaluators += 1

        # Also register without prefix if OCULUS doesn't have one
        if eval_type not in EVALUATOR_REGISTRY:
            adapter = _make_evaluator_adapter(eval_cls)
            EVALUATOR_REGISTRY[eval_type] = adapter
            registered_evaluators += 1

    # Register connectors
    for conn_type, conn_cls in CHECKS_CONNECTOR_REGISTRY.items():
        adapted = _make_connector_adapter(conn_cls)
        register_connector(adapted)
        registered_connectors += 1

    logger.info(
        f"CHECKS bridge: registered {registered_evaluators} evaluators, "
        f"{registered_connectors} connectors from shared library"
    )


# Auto-register on import
register_checks_library()
