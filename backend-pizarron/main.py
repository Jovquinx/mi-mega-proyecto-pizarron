from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt, JWTError # <--- Agregamos JWTError aquí
from datetime import datetime, timedelta

import models, schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API de Mi Pizarrón")

# --- CONFIGURACIÓN DE CORS ---
# Aquí le damos permiso a tu frontend (React) para hablar con este backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción aquí va la URL de tu React, por ahora dejamos "*" para que acepte todo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. CONFIGURACIÓN DE SEGURIDAD ---
SECRET_KEY = "mi_clave_secreta_super_segura_para_el_pizarron" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# --- 2. FUNCIONES DE SEGURIDAD ---
def encriptar_password(password: str):
    return pwd_context.hash(password)

def verificar_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def crear_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ¡NUEVO!: Nuestro guardia de seguridad que revisa el Token
def get_usuario_actual(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credenciales_excepcion = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Intentamos descifrar la pulsera VIP
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credenciales_excepcion
    except JWTError:
        raise credenciales_excepcion
        
    usuario = db.query(models.Usuario).filter(models.Usuario.username == username).first()
    if usuario is None:
        raise credenciales_excepcion
    return usuario


# --- 3. ENDPOINTS DE AUTENTICACIÓN ---
@app.get("/")
def leer_raiz():
    return {"mensaje": "¡El backend de Mi Pizarrón está vivo y conectado a la nube! 🚀"}

@app.post("/registro")
def registrar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    usuario_existe = db.query(models.Usuario).filter(models.Usuario.username == usuario.username).first()
    if usuario_existe:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")
    
    pwd_encriptada = encriptar_password(usuario.password)
    nuevo_usuario = models.Usuario(username=usuario.username, hashed_password=pwd_encriptada)
    db.add(nuevo_usuario)
    db.commit()
    return {"mensaje": f"¡Usuario {usuario.username} creado exitosamente!"}

@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.username == form_data.username).first()
    if not user or not verificar_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    
    token = crear_token(data={"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}


# --- 4. ¡NUEVO!: ENDPOINTS DEL PIZARRÓN (Protegidos) ---

# Obtener todas las notas del usuario actual
@app.get("/notas", response_model=list[schemas.Ventana])
def obtener_notas(db: Session = Depends(get_db), usuario_actual: models.Usuario = Depends(get_usuario_actual)):
    notas = db.query(models.Ventana).filter(models.Ventana.usuario_id == usuario_actual.id).all()
    return notas

# Guardar una nota nueva
@app.post("/notas", response_model=schemas.Ventana)
def crear_nota(nota: schemas.VentanaCreate, db: Session = Depends(get_db), usuario_actual: models.Usuario = Depends(get_usuario_actual)):
    nueva_nota = models.Ventana(
        titulo=nota.titulo, 
        contenido=nota.contenido, 
        x=nota.x, 
        y=nota.y, 
        usuario_id=usuario_actual.id
    )
    db.add(nueva_nota)
    db.commit()
    db.refresh(nueva_nota)
    return nueva_nota

# Actualizar el texto o la posición de una nota
@app.put("/notas/{nota_id}", response_model=schemas.Ventana)
def actualizar_nota(nota_id: int, nota_actualizada: schemas.VentanaCreate, db: Session = Depends(get_db), usuario_actual: models.Usuario = Depends(get_usuario_actual)):
    # Buscamos la nota (asegurándonos de que le pertenezca a este usuario)
    nota_db = db.query(models.Ventana).filter(models.Ventana.id == nota_id, models.Ventana.usuario_id == usuario_actual.id).first()
    if not nota_db:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    
    nota_db.titulo = nota_actualizada.titulo
    nota_db.contenido = nota_actualizada.contenido
    nota_db.x = nota_actualizada.x
    nota_db.y = nota_actualizada.y
    
    db.commit()
    db.refresh(nota_db)
    return nota_db

# Eliminar una nota
@app.delete("/notas/{nota_id}")
def eliminar_nota(nota_id: int, db: Session = Depends(get_db), usuario_actual: models.Usuario = Depends(get_usuario_actual)):
    nota_db = db.query(models.Ventana).filter(models.Ventana.id == nota_id, models.Ventana.usuario_id == usuario_actual.id).first()
    if not nota_db:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    
    db.delete(nota_db)
    db.commit()
    return {"mensaje": "Nota eliminada"}