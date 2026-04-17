import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';

function RegisterPage({ user, token, onLogin }) {
  const navigate = useNavigate();

  if (user && token) {
    return <Navigate to="/" replace />;
  }

  const handleAuthSuccess = (nextUser, nextToken) => {
    onLogin(nextUser, nextToken);
    navigate('/', { replace: true });
  };

  return <AuthForm mode="register" onAuthSuccess={handleAuthSuccess} />;
}

export default RegisterPage;
