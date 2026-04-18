"""
Audit logging for passport access events.
"""
import logging
from datetime import datetime

logger = logging.getLogger("curatrack.audit")

# Configure file handler for audit trail
_audit_logger = logging.getLogger("curatrack.audit.access")
_handler = logging.FileHandler("passport_access.log", mode="a")
_handler.setFormatter(logging.Formatter("%(asctime)s | %(message)s"))
_audit_logger.addHandler(_handler)
_audit_logger.setLevel(logging.INFO)


def log_passport_access(
    patient_id: str,
    scope: list[str],
    jti: str,
    ip_address: str = "unknown",
) -> None:
    """
    Log a passport access event for auditing.
    """
    entry = (
        f"ACCESS | patient_id={patient_id} | "
        f"scope={','.join(scope)} | "
        f"jti={jti} | "
        f"ip={ip_address} | "
        f"timestamp={datetime.utcnow().isoformat()}Z"
    )
    _audit_logger.info(entry)
    logger.info("Passport access logged for patient %s", patient_id)
