import React, { useState } from 'react';
import './Login.css'; // ¡Importamos el nuevo diseño!

export default function Login({ onLoginSuccess }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isLoginMode) {
      try {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch('https://pizarron-backend.onrender.com/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData
        });

        if (!response.ok) throw new Error('Usuario o contraseña incorrectos');
        
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        onLoginSuccess(); 

      } catch (err) {
        setError(err.message);
      }
    } else {
      try {
        const response = await fetch('https://pizarron-backend.onrender.com/registro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (!response.ok) throw new Error('El usuario ya existe o hubo un problema');
        
        alert('¡Registro exitoso! Ahora por favor inicia sesión.');
        setIsLoginMode(true);
        setPassword('');

      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">
          {isLoginMode ? 'Bienvenido de vuelta' : 'Crea tu Pizarrón'}
        </h2>
        
        <form onSubmit={handleSubmit} className="login-form">
          <input 
            type="text" 
            placeholder="Nombre de usuario" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="login-input"
            autoComplete="off"
          />
          
          <input 
            type="password" 
            placeholder="Contraseña" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
          />
          
          {error && <p className="login-error">{error}</p>}
          
          <button type="submit" className="login-button">
            {isLoginMode ? 'Entrar al Pizarrón' : 'Registrarme'}
          </button>
        </form>

        <button 
          onClick={() => {
            setIsLoginMode(!isLoginMode);
            setError('');
          }}
          className="login-toggle"
        >
          {isLoginMode 
            ? '¿No tienes cuenta? Regístrate aquí' 
            : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  );
}