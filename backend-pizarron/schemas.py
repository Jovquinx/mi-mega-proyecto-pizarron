from pydantic import BaseModel

# --- MOLDES DE USUARIO ---
class UsuarioCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# --- NUEVOS: MOLDES DE VENTANA (NOTA) ---
class VentanaBase(BaseModel):
    titulo: str
    contenido: str
    x: float
    y: float

class VentanaCreate(VentanaBase):
    pass

class Ventana(VentanaBase):
    id: int
    tipo: str
    usuario_id: int

    # Esto le dice a Pydantic que está leyendo datos de una base de datos real
    class Config:
        from_attributes = True