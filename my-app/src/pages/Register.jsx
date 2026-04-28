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

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    repeatPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (form.password !== form.repeatPassword) {
      setIsError(true);
      setMessage('Пароли не совпадают');
      showToast('Пароли не совпадают', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        throw new Error(data.message || `Registration failed (HTTP ${response.status})`);
      }

      setIsError(false);
      setMessage('');
      setForm({ name: '', email: '', password: '', repeatPassword: '' });
      showToast('Регистрация успешна! Войдите в аккаунт.', 'success');
      setTimeout(() => {
        goTo('/login');
      }, 300);
    } catch (error) {
      setIsError(true);
      setMessage(error.message || 'Ошибка регистрации');
      showToast(error.message || 'Ошибка регистрации', 'error');
    } finally {
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

        <h1 className="auth-title">Регистрация</h1>
        <p className="auth-subtitle">Создайте аккаунт для размещения новых заказов.</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <div className="auth-field">
            <label htmlFor="register-name">Имя</label>
            <input
              id="register-name"
              name="name"
              type="text"
              placeholder="Например: Айдана"
              value={form.name}
              onChange={onChange}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              name="email"
              type="email"
              placeholder="например: aidana@mail.kz"
              value={form.email}
              onChange={onChange}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-password">Пароль</label>
            <input
              id="register-password"
              name="password"
              type="password"
              placeholder="например: Qazaq!2025"
              minLength={8}
              value={form.password}
              onChange={onChange}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-password-repeat">Повторите пароль</label>
            <input
              id="register-password-repeat"
              name="repeatPassword"
              type="password"
              placeholder="повторите пароль"
              minLength={8}
              value={form.repeatPassword}
              onChange={onChange}
              required
            />
          </div>

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? 'Отправка...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="auth-switch">
          Уже есть аккаунт?{' '}
          <a
            href="/login"
            className="auth-link"
            onClick={(event) => {
              event.preventDefault();
              goTo('/login');
            }}
          >
            Войти
          </a>
        </p>
      </section>
    </main>
  );
};

export default Register;
