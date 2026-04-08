import { useEffect, useMemo, useState } from 'react';
import './ExecutorCabinet.css';

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

const ExecutorCabinet = () => {
  const user = useMemo(() => {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const [executor, setExecutor] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadExecutor = async () => {
      try {
        const response = await fetch(`/api/executors/status?userId=${user.id}`);
        const data = await parseResponseBody(response);

        if (response.ok && data.isExecutor) {
          setExecutor(data.executor);
        }
      } catch {
      } finally {
        setIsChecking(false);
      }
    };

    loadExecutor();
  }, [user]);

  if (!user) {
    return (
      <main className="executor-page">
        <section className="executor-card">
          <h1>Рабочий кабинет</h1>
          <p>Вы не авторизованы.</p>
          <button type="button" className="executor-btn" onClick={() => goTo('/login')}>
            Войти
          </button>
        </section>
      </main>
    );
  }

  if (isChecking) {
    return (
      <main className="executor-page">
        <section className="executor-card">
          <h1>Рабочий кабинет</h1>
          <p>Проверяем статус исполнителя...</p>
        </section>
      </main>
    );
  }

  if (!executor) {
    return (
      <main className="executor-page">
        <section className="executor-card">
          <h1>Рабочий кабинет</h1>
          <p>Вы еще не зарегистрированы как исполнитель.</p>
          <button type="button" className="executor-btn" onClick={() => goTo('/become-executor')}>
            Стать исполнителем
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="executor-page">
      <section className="executor-card">
        <h1>Рабочий кабинет</h1>
        <p><strong>Имя:</strong> {executor.first_name}</p>
        <p><strong>Фамилия:</strong> {executor.last_name}</p>
        <p><strong>Телефон:</strong> {executor.phone}</p>
        {executor.executor_type === 'organization' && (
          <>
            <p><strong>Организация:</strong> {executor.organization_name}</p>
            <p><strong>Адрес:</strong> {executor.organization_address}</p>
          </>
        )}
        <div className="executor-actions">
          <button type="button" className="executor-btn" onClick={() => goTo('/')}>
            На главную
          </button>
        </div>
      </section>
    </main>
  );
};

export default ExecutorCabinet;
