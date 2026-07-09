import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage user={user} token={token} onLogin={handleLogin} />} />
      <Route path="/register" element={<RegisterPage user={user} token={token} onLogin={handleLogin} />} />
      <Route
        path="*"
        element={user && token ? <AppShell user={user} token={token} onLogout={handleLogout} onUserUpdate={handleUserUpdate} /> : <HomePage />}
      />
    </Routes>
  );
}

export default App;
