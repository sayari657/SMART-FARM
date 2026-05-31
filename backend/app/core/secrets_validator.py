"""Startup secrets validation — prevents running with default/insecure values."""
import os
import sys
import logging

logger = logging.getLogger(__name__)

WEAK_SECRETS = {
    "changeme", "secret", "password", "admin", "dev",
    "dev-secret-key-not-for-production-use-only",
    "smartfarm_dev_secret_key_change_in_prod_32ch",
    "GENERATE_WITH__python_-c__import_secrets_print_secrets.token_hex_32__",
}


def validate_production_secrets() -> None:
    """Call at startup in production — exits if secrets are insecure."""
    debug = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")
    if debug:
        logger.info("Skipping secrets validation (DEBUG=true)")
        return

    errors = []

    secret_key = os.getenv("SECRET_KEY", "")
    if not secret_key or secret_key.lower() in WEAK_SECRETS or len(secret_key) < 32:
        errors.append("SECRET_KEY is missing or too weak (min 32 chars, no defaults)")

    groq_key = os.getenv("GROQ_API_KEY", "")
    if groq_key and not groq_key.startswith("gsk_"):
        errors.append("GROQ_API_KEY format looks invalid (should start with gsk_)")

    db_url = os.getenv("DATABASE_URL", "")
    if "sqlite" in db_url and not debug:
        errors.append("SQLite is not recommended for production — use PostgreSQL")

    cors = os.getenv("CORS_ORIGINS", "")
    if "*" in cors:
        errors.append("CORS_ORIGINS contains wildcard '*' — restrict to specific domains in production")

    if errors:
        logger.critical("PRODUCTION SECRETS VALIDATION FAILED:")
        for err in errors:
            logger.critical(f"  • {err}")
        logger.critical("Fix the above issues before deploying to production.")
        sys.exit(1)

    logger.info("Secrets validation passed.")
