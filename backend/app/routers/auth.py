from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.deps import get_db
from app.models.user import RefreshToken as RefreshTokenRow, User, UserRole
from app.models.student import Student
from app.schemas.auth import ForgotPassword, ResetPassword, TokenPair, TokenRefresh, UserLogin, UserRegister
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenPair)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenPair:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

    access = create_access_token(str(user.id), {"role": user.role.value})
    refresh = create_refresh_token(str(user.id))
    th = hash_refresh_token(refresh)
    exp_payload = decode_token(refresh)
    expires_at = datetime.fromtimestamp(exp_payload["exp"], tz=timezone.utc)
    db.add(RefreshTokenRow(user_id=user.id, token_hash=th, expires_at=expires_at))
    db.commit()
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> TokenPair:
    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if db.query(Student).filter(Student.student_id == payload.student_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student ID already in use")

    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role=UserRole.STUDENT,
    )
    db.add(user)
    db.flush()

    student = Student(
        user_id=user.id,
        student_id=payload.student_id.strip(),
        grade_year=payload.grade_year,
        enrollment_date=date.today(),
    )
    db.add(student)
    db.commit()

    access = create_access_token(str(user.id), {"role": user.role.value})
    refresh = create_refresh_token(str(user.id))
    th = hash_refresh_token(refresh)
    exp_payload = decode_token(refresh)
    expires_at = datetime.fromtimestamp(exp_payload["exp"], tz=timezone.utc)
    db.add(RefreshTokenRow(user_id=user.id, token_hash=th, expires_at=expires_at))
    db.commit()
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenPair)
def refresh_tokens(payload: TokenRefresh, db: Session = Depends(get_db)) -> TokenPair:
    try:
        data = decode_token(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    if data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    th = hash_refresh_token(payload.refresh_token)
    row = db.query(RefreshTokenRow).filter(RefreshTokenRow.token_hash == th).first()
    now = datetime.now(timezone.utc)
    if row is None or row.expires_at < now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired or revoked")

    user = db.query(User).filter(User.id == row.user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not available")

    access = create_access_token(str(user.id), {"role": user.role.value})
    new_refresh = create_refresh_token(str(user.id))
    new_hash = hash_refresh_token(new_refresh)
    new_payload = decode_token(new_refresh)
    new_exp = datetime.fromtimestamp(new_payload["exp"], tz=timezone.utc)

    db.delete(row)
    db.add(RefreshTokenRow(user_id=user.id, token_hash=new_hash, expires_at=new_exp))
    db.commit()
    return TokenPair(access_token=access, refresh_token=new_refresh)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: TokenRefresh, db: Session = Depends(get_db)) -> None:
    th = hash_refresh_token(payload.refresh_token)
    row = db.query(RefreshTokenRow).filter(RefreshTokenRow.token_hash == th).first()
    if row:
        db.delete(row)
        db.commit()


@router.post("/forgot-password")
def forgot_password(payload: ForgotPassword, db: Session = Depends(get_db)) -> dict:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user is None:
        return {"message": "If that email exists, a reset link has been generated."}
    token = create_access_token(str(user.id), {"type": "reset"})
    return {"message": "If that email exists, a reset link has been generated.", "reset_token": token}


@router.post("/reset-password")
def reset_password(payload: ResetPassword, db: Session = Depends(get_db)) -> dict:
    try:
        data = decode_token(payload.token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    sub = data.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
    user = db.query(User).filter(User.id == sub).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

