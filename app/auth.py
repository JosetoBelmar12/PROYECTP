import os
from datetime import datetime, timedelta
from typing import Optional
import hashlib

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlmodel import Session, select

from .models import User
from .database import engine

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-key-12345")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def hash_password(password: str) -> str:
    """Hash una contraseña usando SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password, hashed_password):
    """Verifica una contraseña contra su hash"""
    return hash_password(plain_password) == hashed_password


def get_password_hash(password):
    """Genera hash de la contraseña"""
    return hash_password(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def authenticate_user(username: str, password: str):
    with Session(engine) as session:
        statement = select(User).where(User.username == username)
        user = session.exec(statement).first()
        if not user:
            return False
        if not verify_password(password, user.hashed_password):
            return False
        return user


def get_current_user(request: Request):
    """Extrae y valida el token del header Authorization"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Obtener el header Authorization
    auth_header = request.headers.get("Authorization")
    print(f"[AUTH] Authorization header: {auth_header}")
    
    if not auth_header:
        print("[AUTH] No Authorization header found")
        raise credentials_exception
    
    # Extraer el token del header "Bearer <token>"
    parts = auth_header.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        print(f"[AUTH] Invalid Authorization header format: {auth_header}")
        raise credentials_exception
    
    token = parts[1]
    print(f"[AUTH] Token extracted: {token[:30]}...")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            print("[AUTH] Username not found in token payload")
            raise credentials_exception
    except JWTError as e:
        print(f"[AUTH] JWTError: {e}")
        raise credentials_exception
    
    with Session(engine) as session:
        statement = select(User).where(User.username == username)
        user = session.exec(statement).first()
        if user is None:
            print(f"[AUTH] User not found: {username}")
            raise credentials_exception
        
        print(f"[AUTH] User authenticated: {username}")
        return user
