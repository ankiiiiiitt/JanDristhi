import bcrypt
import logging

logger = logging.getLogger("jandrishti.security")

def hash_password(password: str) -> str:
    """Hashes a password using standard bcrypt with salt."""
    if isinstance(password, str):
        # Truncate to 72 bytes per bcrypt spec
        pwd_bytes = password.encode('utf-8')[:72]
    else:
        pwd_bytes = b""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against stored bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception as e:
        logger.warning(f"Bcrypt verification error: {e}")
        return False

