from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    ventanas = relationship("Ventana", back_populates="propietario")

class Ventana(Base):
    __tablename__ = "ventanas"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String, default="nota")
    titulo = Column(String)
    contenido = Column(String)
    x = Column(Float)
    y = Column(Float)
    
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    propietario = relationship("Usuario", back_populates="ventanas")