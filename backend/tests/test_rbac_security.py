import pytest
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.dependencies import RoleChecker
from app.models.all_models import User
from fastapi import HTTPException

def test_password_hashing_and_verification():
    raw = "SecretPassword123!"
    hashed = get_password_hash(raw)
    assert verify_password(raw, hashed)
    assert not verify_password("WrongPassword", hashed)

def test_access_token_creation():
    token = create_access_token(subject="user_123", role="TECHNICIAN")
    assert isinstance(token, str)
    assert len(token) > 20

def test_role_checker_enforcement():
    viewer_user = User(username="v1", role="VIEWER", is_active=True)
    admin_user = User(username="a1", role="ADMIN", is_active=True)

    require_admin = RoleChecker(["ADMIN"])
    
    # Admin passes
    assert require_admin(admin_user) == admin_user

    # Viewer fails with HTTP 403
    with pytest.raises(HTTPException) as exc_info:
        require_admin(viewer_user)
    assert exc_info.value.status_code == 403
