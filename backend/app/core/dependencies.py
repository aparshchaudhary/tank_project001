from typing import List, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.all_models import User, AuditLogEntry
from app.schemas.schemas import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(sub=user_id, role=payload.get("role"))
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == token_data.sub).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")
    return current_user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {self.allowed_roles} roles. Your role is {current_user.role}."
            )
        return current_user

require_viewer = RoleChecker(["VIEWER", "TECHNICIAN", "ADMIN"])
require_technician = RoleChecker(["TECHNICIAN", "ADMIN"])
require_admin = RoleChecker(["ADMIN"])

def log_audit(
    db: Session,
    user: Optional[User],
    action: str,
    entity: str,
    entity_id: Optional[str],
    description: str,
    request: Optional[Request] = None
):
    ip_address = request.client.host if request and request.client else None
    user_id = user.id if user else None
    username = user.username if user else "SYSTEM"
    role = user.role if user else "SYSTEM"
    
    audit_entry = AuditLogEntry(
        user_id=user_id,
        username=username,
        role=role,
        action=action,
        entity=entity,
        entity_id=str(entity_id) if entity_id else None,
        description=description,
        ip_address=ip_address
    )
    db.add(audit_entry)
    db.commit()
