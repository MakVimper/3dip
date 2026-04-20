import { useEffect, useMemo, useState } from 'react';
import './BecomeExecutor.css';

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

const BecomeExecutor = () => {
  const user = useMemo(() => {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const [executorType, setExecutorType] = useState('individual');
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    organizationName: '',
    organizationAddress: '',
  });
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      goTo('/register');
      return;
    }

    const checkExecutorStatus = async () => {
      try {
        const response = await fetch(`/api/executors/status?userId=${user.id}`);
        const data = await parseResponseBody(response);

        if (response.ok && data.isExecutor) {
          goTo('/profile?tab=executor');
        }
      } catch {

      }
    };

    checkExecutorStatus();
  }, [user]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const onPhoneChange = (event) => {
    const raw = event.target.value;
    const digitsOnly = raw.replace(/\D/g, '');
    let rest = digitsOnly;

    if (rest.startsWith('7')) {
      rest = rest.slice(1);
    }

    rest = rest.slice(0, 10);
    const withPrefix = `+7${rest}`;
    setForm((prev) => ({ ...prev, phone: withPrefix }));
    setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.firstName.trim()) nextErrors.firstName = 'Введите имя';
    if (!form.lastName.trim()) nextErrors.lastName = 'Введите фамилию';
    if (!form.phone.trim()) nextErrors.phone = 'Введите номер телефона';

    if (executorType === 'organization') {
      if (!form.organizationName.trim()) nextErrors.organizationName = 'Введите наименование организации';
      if (!form.organizationAddress.trim()) nextErrors.organizationAddress = 'Введите адрес организации';
    }

    return nextErrors;
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    setMessage('');

    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setStep('verify');
  };

  const handleVerifySubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/executors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          executorType,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          organizationName: form.organizationName,
          organizationAddress: form.organizationAddress,
          code,
        }),
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        throw new Error(data.message || `Ошибка отправки (HTTP ${response.status})`);
      }

      setIsError(false);
      setMessage('Вы успешно стали исполнителем.');
      window.dispatchEvent(new Event('executor:changed'));

      setTimeout(() => {
        goTo('/profile?tab=executor');
      }, 300);
    } catch (error) {
      setIsError(true);
      setMessage(error.message || 'Ошибка подтверждения');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <main className="become-page">
      <section className="become-card">
        <div className="become-header">
          <h1>Стать исполнителем</h1>
          <p>Заполните анкету и подтвердите номер телефона.</p>
        </div>

        {step === 'form' && (
          <form className="become-form" onSubmit={handleFormSubmit}>
            <div className="become-toggle">
              <p className="become-toggle__label">Формат исполнителя</p>
              <div className="become-toggle__segmented" role="tablist" aria-label="Формат исполнителя">
                <button
                  type="button"
                  className={`segment ${executorType === 'individual' ? 'segment--active' : ''}`}
                  onClick={() => setExecutorType('individual')}
                  role="tab"
                  aria-selected={executorType === 'individual'}
                >
                  Частное лицо
                </button>
                <button
                  type="button"
                  className={`segment ${executorType === 'organization' ? 'segment--active' : ''}`}
                  onClick={() => setExecutorType('organization')}
                  role="tab"
                  aria-selected={executorType === 'organization'}
                >
                  Организация
                </button>
                <span
                  className={`segment-indicator ${
                    executorType === 'organization' ? 'segment-indicator--right' : ''
                  }`}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="become-field">
              <label htmlFor="executor-first-name">Имя</label>
              <input
                id="executor-first-name"
                name="firstName"
                type="text"
                placeholder="например: Айдана"
                value={form.firstName}
                onChange={onChange}
                required
              />
              {errors.firstName && <p className="become-error">{errors.firstName}</p>}
            </div>

            <div className="become-field">
              <label htmlFor="executor-last-name">Фамилия</label>
              <input
                id="executor-last-name"
                name="lastName"
                type="text"
                placeholder="например: Сейдахмет"
                value={form.lastName}
                onChange={onChange}
                required
              />
              {errors.lastName && <p className="become-error">{errors.lastName}</p>}
            </div>

            <div className="become-field">
              <label htmlFor="executor-phone">Номер телефона</label>
              <input
                id="executor-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                maxLength={12}
                placeholder="+7 777 123 45 67"
                value={form.phone || '+7'}
                onChange={onPhoneChange}
                required
              />
              {errors.phone && <p className="become-error">{errors.phone}</p>}
            </div>

            {executorType === 'organization' && (
              <>
                <div className="become-field">
                  <label htmlFor="executor-org-name">Наименование организации</label>
                  <input
                    id="executor-org-name"
                    name="organizationName"
                    type="text"
                    placeholder="например: ТОО PrintLab"
                    value={form.organizationName}
                    onChange={onChange}
                    required
                  />
                  {errors.organizationName && <p className="become-error">{errors.organizationName}</p>}
                </div>

                <div className="become-field">
                  <label htmlFor="executor-org-address">Адрес организации</label>
                  <input
                    id="executor-org-address"
                    name="organizationAddress"
                    type="text"
                    placeholder="например: Алматы, Абая 10"
                    value={form.organizationAddress}
                    onChange={onChange}
                    required
                  />
                  {errors.organizationAddress && (
                    <p className="become-error">{errors.organizationAddress}</p>
                  )}
                </div>
              </>
            )}

            <div className="become-actions">
              <button type="submit" className="become-primary">
                Продолжить
              </button>
            </div>
          </form>
        )}

        {step === 'verify' && (
          <form className="become-form" onSubmit={handleVerifySubmit}>
            <div className="become-field">
              <label htmlFor="executor-code">Код подтверждения</label>
              <input
                id="executor-code"
                name="code"
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="например: 1234"
                required
              />
              <p className="become-hint">Временно используйте код 1234.</p>
            </div>

            {message && (
              <p className={`become-message ${isError ? 'become-message--error' : 'become-message--success'}`}>
                {message}
              </p>
            )}

            <div className="become-actions">
              <button type="button" className="become-secondary" onClick={() => setStep('form')}>
                Назад
              </button>
              <button type="submit" className="become-primary" disabled={isLoading}>
                {isLoading ? 'Проверка...' : 'Подтвердить'}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
};

export default BecomeExecutor;