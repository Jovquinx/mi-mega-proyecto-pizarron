import { useState, useRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import Draggable from 'react-draggable';
import Login from './Login';
import './App.css';

// --- COMPONENTE VENTANA ---
const Ventana = ({ ventana, actualizarContenido, actualizarTitulo, actualizarPosicion, eliminarNota, setPanHabilitado }) => {
  const nodeRef = useRef(null);
  const [editando, setEditando] = useState(false);
  const [textoLocal, setTextoLocal] = useState(ventana.contenido);
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [tituloLocal, setTituloLocal] = useState(ventana.titulo);

  const activarEdicion = () => {
    setEditando(true);
    setPanHabilitado(false);
  };
  
  const guardarCambios = () => {
    setEditando(false);
    setPanHabilitado(true);
    actualizarContenido(ventana.id, textoLocal);
  };

  const activarEdicionTitulo = () => {
    setEditandoTitulo(true);
    setPanHabilitado(false);
  };
  
  const guardarTitulo = () => {
    setEditandoTitulo(false);
    setPanHabilitado(true);
    actualizarTitulo(ventana.id, tituloLocal);
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      defaultPosition={{ x: ventana.x, y: ventana.y }}
      handle=".barra-superior" 
      cancel=".cuerpo-ventana, .btn-cerrar, .input-titulo" 
      disabled={editando || editandoTitulo}
      onStart={() => setPanHabilitado(false)}
      // NUEVO: Al soltar la nota, le enviamos las coordenadas a la base de datos
      onStop={(e, data) => {
        setPanHabilitado(true);
        actualizarPosicion(ventana.id, data.x, data.y);
      }}
    >
      <div ref={nodeRef} className="ventana-arrastrable">
        <div className="barra-superior">
          {editandoTitulo ? (
            <input
              autoFocus
              className="input-titulo"
              value={tituloLocal}
              onChange={(e) => setTituloLocal(e.target.value)}
              onBlur={guardarTitulo}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') guardarTitulo(); }} 
            />
          ) : (
            <span onDoubleClick={activarEdicionTitulo} className="texto-titulo">
              {ventana.titulo}
            </span>
          )}

          <button 
            className="btn-cerrar" 
            onClick={() => eliminarNota(ventana.id)}
            title="Eliminar nota"
          >
            ✕
          </button>
        </div>
        
        <div className="cuerpo-ventana" onDoubleClick={activarEdicion}>
          {editando ? (
            <div className="contenedor-edicion">
              <textarea
                autoFocus
                value={textoLocal}
                onChange={(e) => setTextoLocal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') guardarCambios(); }} 
                className="textarea-edicion"
                placeholder="Escribe tu nota aquí..."
              />
              <button className="btn-guardar" onClick={guardarCambios}>
                Listo
              </button>
            </div>
          ) : (
            <pre>{ventana.contenido}</pre>
          )}
        </div>
      </div>
    </Draggable>
  );
};


// --- APLICACIÓN PRINCIPAL ---
function App() {
  const [ventanas, setVentanas] = useState([]);
  const [panHabilitado, setPanHabilitado] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 1. CARGAR NOTAS DESDE LA BASE DE DATOS
  const cargarNotas = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('https://pizarron-backend.onrender.com/notas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const notasDeLaNube = await response.json();
        setVentanas(notasDeLaNube);
      }
    } catch (error) {
      console.error("Error al cargar las notas:", error);
    }
  };

  // Revisar sesión al inicio y cargar notas si estamos logueados
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      cargarNotas();
    }
  }, []);

  // Volver a cargar notas si cambiamos de usuario
  useEffect(() => {
    if (isAuthenticated) cargarNotas();
  }, [isAuthenticated]);

  const handleCerrarSesion = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setVentanas([]); // Limpiamos el pizarrón al salir
  };

  // 2. CREAR UNA NOTA EN LA BASE DE DATOS
  const agregarNota = async () => {
    const token = localStorage.getItem('token');
    const nuevaNota = {
      titulo: 'Nueva Nota 📝', 
      contenido: 'Haz doble clic para editar...',
      x: 5000 + Math.floor(Math.random() * 100), 
      y: 5000 + Math.floor(Math.random() * 100),
    };

    try {
      const response = await fetch('https://pizarron-backend.onrender.com/notas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(nuevaNota)
      });
      
      if (response.ok) {
        const notaGuardada = await response.json();
        setVentanas([...ventanas, notaGuardada]); // Guardamos la versión oficial con su ID real
      }
    } catch (error) {
      console.error("Error al guardar la nota:", error);
    }
  };

  // 3. ACTUALIZAR NOTA (Esta función habla con Python para actualizar lo que le pidas)
  const actualizarNotaEnBD = async (id, datosNuevos) => {
    const token = localStorage.getItem('token');
    const notaActual = ventanas.find(v => v.id === id);
    if (!notaActual) return;

    // Fusionamos los datos actuales con los cambios nuevos
    const notaActualizada = { ...notaActual, ...datosNuevos };

    try {
      await fetch(`https://pizarron-backend.onrender.com/notas/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          titulo: notaActualizada.titulo,
          contenido: notaActualizada.contenido,
          x: notaActualizada.x,
          y: notaActualizada.y
        })
      });
    } catch (error) {
      console.error("Error al actualizar la nota:", error);
    }
  };

  const actualizarContenido = (id, nuevoTexto) => {
    setVentanas(ventanas.map(v => v.id === id ? { ...v, contenido: nuevoTexto } : v));
    actualizarNotaEnBD(id, { contenido: nuevoTexto });
  };

  const actualizarTitulo = (id, nuevoTitulo) => {
    setVentanas(ventanas.map(v => v.id === id ? { ...v, titulo: nuevoTitulo } : v));
    actualizarNotaEnBD(id, { titulo: nuevoTitulo });
  };

  const actualizarPosicion = (id, nuevaX, nuevaY) => {
    setVentanas(ventanas.map(v => v.id === id ? { ...v, x: nuevaX, y: nuevaY } : v));
    actualizarNotaEnBD(id, { x: nuevaX, y: nuevaY });
  };

  // 4. ELIMINAR NOTA DE LA BASE DE DATOS
  const eliminarNota = async (id) => {
    const token = localStorage.getItem('token');
    // La borramos de la pantalla inmediatamente para que se sienta rápido
    setVentanas(ventanas.filter(v => v.id !== id));

    try {
      await fetch(`https://pizarron-backend.onrender.com/notas/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Error al eliminar la nota:", error);
    }
  };


  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="contenedor-principal">
      <div className="barra-herramientas">
        <div className="logo">Mi Pizarrón</div>
        <div className="herramientas">
          <button className="btn-herramienta" onClick={agregarNota}>
            + Nueva Nota
          </button>
          <button className="btn-herramienta" onClick={handleCerrarSesion} style={{ backgroundColor: '#ff4d4f' }}>
            Cerrar Sesión
          </button>
        </div>
      </div>

      <TransformWrapper
        initialScale={1}
        initialPositionX={-4500} 
        initialPositionY={-4500}
        minScale={0.1}
        maxScale={4}
        limitToBounds={false}
        panning={{ disabled: !panHabilitado }} 
        // 👇 ESTAS SON LAS LÍNEAS NUEVAS 👇
        wheel={{ step: 0.7 }}  
        pinch={{ step: 5 }}
      >
        <TransformComponent wrapperClass="wrapper-lienzo" contentClass="contenido-lienzo">
          <div className="lienzo-infinito">
            {ventanas.map((ventana) => (
              <Ventana 
                key={ventana.id} 
                ventana={ventana} 
                actualizarContenido={actualizarContenido}
                actualizarTitulo={actualizarTitulo}
                actualizarPosicion={actualizarPosicion}
                eliminarNota={eliminarNota}
                setPanHabilitado={setPanHabilitado} 
              />
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}

export default App;