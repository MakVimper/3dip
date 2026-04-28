import { useState } from 'react';
import './Auth.css';
import { showToast } from '../components/Toast';

const goTo = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('app:navigate'));
};

const parseResponseBody = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        signal: controller.signal,
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        throw new Error(data.message || `Login failed (HTTP ${response.status})`);
      }

      if (!data.user) {
        throw new Error('Сервер вернул некорректный ответ');
      }

      localStorage.setItem('auth_user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('auth:changed'));

      setIsError(false);
      setMessage('');
      setForm({ email: '', password: '' });
      showToast(`Добро пожаловать, ${data.user.name}!`, 'success');

      setTimeout(() => {
        goTo('/');
      }, 300);
    } catch (error) {
      setIsError(true);

      if (error.name === 'AbortError') {
        setMessage('Сервер долго не отвечает. Проверьте backend и PostgreSQL.');
        showToast('Сервер долго не отвечает', 'error');
      } else {
        setMessage(error.message || 'Ошибка входа');
        showToast(error.message || 'Ошибка входа', 'error');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a
          href="/"
          className="auth-logo"
          onClick={(event) => {
            event.preventDefault();
            goTo('/');
          }}
        >
          <span className="auth-logo-3d">3D</span>
          <span className="auth-logo-ip">ip</span>
        </a>

        <h1 className="auth-title">Авторизация</h1>
        <p className="auth-subtitle">Войдите в аккаунт, чтобы управлять заказами.</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <div className="auth-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              placeholder="например: aidana@mail.kz"
              value={form.email}
              onChange={onChange}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Пароль</label>
            <input
              id="login-password"
              name="password"
              type="password"
              placeholder="например: Qazaq!2025"
              value={form.password}
              onChange={onChange}
              required
            />
          </div>

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? 'Проверка...' : 'Войти'}
          </button>
        </form>

        <p className="auth-switch">
          Нет аккаунта?{' '}
          <a
            href="/register"
            className="auth-link"
            onClick={(event) => {
              event.preventDefault();
              goTo('/register');
            }}
          >
            Зарегистрироваться
          </a>
        </p>
      </section>
    </main>
  );
};

export default Login;
