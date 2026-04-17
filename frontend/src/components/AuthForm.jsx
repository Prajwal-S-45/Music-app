import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, Music2, Radio, UserRound } from 'lucide-react';
import { FaGithub, FaGoogle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthForm({ mode = 'login', onAuthSuccess }) {
  const isLogin = mode === 'login';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const nextErrors = {};

    if (!isLogin && !form.name.trim()) {
      nextErrors.name = 'Name is required.';
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!emailPattern.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.';
    } else if (form.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleSocialClick = (provider) => {
    setSubmitError(`${provider} login will be available soon.`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const endpoint = isLogin ? '/api/users/login' : '/api/users/signup';
      const payload = isLogin
        ? { email: form.email.trim(), password: form.password }
        : { name: form.name.trim(), email: form.email.trim(), password: form.password };

      const response = await apiClient.post(endpoint, payload);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onAuthSuccess(response.data.user, response.data.token);
    } catch (error) {
      setSubmitError(error.response?.data?.error || 'An error occurred while submitting the form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-viewport cyber-auth-shell">
      <div className="auth-bg" aria-hidden="true">
        <div className="glow-orb glow-blue" />
        <div className="glow-orb glow-purple" />
        <div className="glow-orb glow-pink" />
        <div className="cyber-grid" />

        <div className="equalizer-wrap">
          {Array.from({ length: 22 }).map((_, index) => (
            <span
              key={`eq-${index}`}
              className="eq-bar"
              style={{
                animationDelay: `${index * 0.08}s`,
                height: `${16 + (index % 6) * 7}px`,
              }}
            />
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="auth-card"
      >
        <div className="auth-card-shine" aria-hidden="true" />

        <div className="auth-header">
          <span className="auth-badge">
            <Music2 size={14} />
            Music App
          </span>
          <h1 className="auth-title">{isLogin ? 'Welcome Back 👋' : 'Create Account 👋'}</h1>
          <p className="auth-subtitle">
            {isLogin ? 'Login to continue your music experience' : 'Register to start your music experience'}
          </p>
          <p className="auth-tagline">Listen Together 🎧</p>

          <div className="auth-sync-pill">
            <span className="sync-pulse" />
            <Radio size={14} />
            Real-time room sync active
          </div>
        </div>

        {submitError && (
          <div className="auth-error">
            {submitError}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {!isLogin && (
            <div className="auth-field">
              <label className="auth-label">Full name</label>
              <div className="auth-input-wrap">
                <UserRound className="auth-input-icon" size={16} />
                <input
                  type="text"
                  value={form.name}
                  onChange={handleChange('name')}
                  className="auth-input"
                  placeholder="Your full name"
                />
              </div>
              {errors.name && <p className="auth-field-error">{errors.name}</p>}
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <div className="auth-input-wrap">
              <Mail className="auth-input-icon" size={16} />
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                className="auth-input"
                placeholder="name@example.com"
              />
            </div>
            {errors.email && <p className="auth-field-error">{errors.email}</p>}
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <Lock className="auth-input-icon" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                className="auth-input auth-password-input"
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="auth-toggle-password"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="auth-field-error">{errors.password}</p>}
            {isLogin && (
              <div className="auth-forgot-wrap">
                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={() => setSubmitError('Password recovery flow is coming soon.')}
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={isSubmitting}
            className="auth-submit"
          >
            {isSubmitting ? 'Please wait...' : isLogin ? 'Login' : 'Create account'}
          </motion.button>
        </form>

        <div className="auth-divider">
          <span className="auth-divider-line" />
          OR
          <span className="auth-divider-line" />
        </div>

        <div className="auth-social-grid">
          <button
            type="button"
            onClick={() => handleSocialClick('Google')}
            className="auth-social-btn"
          >
            <FaGoogle className="h-4 w-4" />
            Google
          </button>
          <button
            type="button"
            onClick={() => handleSocialClick('GitHub')}
            className="auth-social-btn"
          >
            <FaGithub className="h-4 w-4" />
            GitHub
          </button>
        </div>

        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <Link
            to={isLogin ? '/register' : '/login'}
            className="auth-switch-link"
          >
            {isLogin ? 'Sign up' : 'Login'}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default AuthForm;
