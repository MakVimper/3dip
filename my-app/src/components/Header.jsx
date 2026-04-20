import React, { useEffect, useState } from 'react';
import userIcon from '../assets/images/User_03.png';
import './Header.css';

const goTo = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('app:navigate'));
};

const catalogServices = [
  'Прототипирование изделий',
  '3D-моделирование с нуля',
  'Мелкосерийное производство',
  'Функциональные детали',
  'Печать высокоточных моделей',
  'Крупногабаритная печать',
];

const Header = () => {
  const [isOrderMenuOpen, setIsOrderMenuOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('Файл не выбран (необязательно)');
  const [selectedFileData, setSelectedFileData] = useState('');
  const [orderForm, setOrderForm] = useState({
    service: '',
    details: '',
    budget: '',
    deadline: '',
  });
  const [orderErrors, setOrderErrors] = useState({});
  const [isAuthorized, setIsAuthorized] = useState(Boolean(localStorage.getItem('auth_user')));
  const [isExecutor, setIsExecutor] = useState(false);

  const loadExecutorStatus = async () => {
    if (!localStorage.getItem('auth_user')) {
      setIsExecutor(false);
      return;
    }

    try {
      const raw = localStorage.getItem('auth_user');
      const user = raw ? JSON.parse(raw) : null;

      if (!user?.id) {
        setIsExecutor(false);
        return;
      }

      const response = await fetch(`/api/executors/status?userId=${user.id}`);
      const data = await response.json();

      if (response.ok) {
        setIsExecutor(Boolean(data.isExecutor));
      }
    } catch {
      setIsExecutor(false);
    }
  };

  useEffect(() => {
    const onAuthChanged = () => {
      setIsAuthorized(Boolean(localStorage.getItem('auth_user')));
    };

    window.addEventListener('auth:changed', onAuthChanged);
    return () => window.removeEventListener('auth:changed', onAuthChanged);
  }, []);

  useEffect(() => {
    const onExecutorChanged = () => {
      loadExecutorStatus();
    };

    window.addEventListener('executor:changed', onExecutorChanged);
    return () => window.removeEventListener('executor:changed', onExecutorChanged);
  }, []);

  useEffect(() => {
    loadExecutorStatus();
  }, [isAuthorized]);

  const validateOrderForm = () => {
    const errors = {};

    if (!orderForm.service) {
      errors.service = 'Выберите услугу из каталога';
    }
    if (!orderForm.details.trim()) {
      errors.details = 'Заполните описание задачи';
    }
    if (!orderForm.budget || Number(orderForm.budget) <= 0) {
      errors.budget = 'Укажите корректный бюджет';
    }
    if (!orderForm.deadline) {
      errors.deadline = 'Выберите срок выполнения';
    }

    return errors;
  };

  const handleOrderSubmit = async (event) => {
    event.preventDefault();
    const errors = validateOrderForm();
    setOrderErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const raw = localStorage.getItem('auth_user');
    const user = raw ? JSON.parse(raw) : null;

    if (!user?.id) {
      window.alert('Для создания заказа зарегистрируйтесь!');
      return;
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          service: orderForm.service,
          details: orderForm.details,
          budget: orderForm.budget,
          deadline: orderForm.deadline,
          fileName:
            selectedFileName && selectedFileName !== 'Файл не выбран (необязательно)'
              ? selectedFileName
              : '',
          fileData: selectedFileData,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Ошибка создания заказа (HTTP ${response.status})`);
      }

      setOrderForm({ service: '', details: '', budget: '', deadline: '' });
      setSelectedFileName('Файл не выбран (необязательно)');
      setSelectedFileData('');
      setIsOrderMenuOpen(false);
    } catch (error) {
      window.alert(error.message || 'Ошибка создания заказа');
    }
  };

  const handleFieldChange = (field, value) => {
    setOrderForm((prev) => ({ ...prev, [field]: value }));
    setOrderErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <>
      <header className="header">
        <div className="header-container">
          <button
            type="button"
            className="logo"
            onClick={() => goTo('/')}
            aria-label="На главную"
          >
            <span className="logo-3d">3D</span>
            <span className="logo-ip">ip</span>
          </button>

          <nav className="nav">
            <button
              type="button"
              className="nav-link nav-link-button"
              onClick={() => {
                if (!isAuthorized) {
                  window.alert('Для создания заказа зарегистрируйтесь!');
                  return;
                }

                setIsOrderMenuOpen(true);
                setOrderErrors({});
              }}
            >
              Создать заказ
            </button>
            <a href="#find" className="nav-link" onClick={(e) => { e.preventDefault(); goTo('/find-executors'); }}>Найти специалиста</a>
            <a
              href="/profile?tab=orders"
              className="nav-link"
              onClick={(event) => {
                event.preventDefault();
                goTo('/profile?tab=orders');
              }}
            >
              Мои заказы
            </a>
            <button
              type="button"
              className="nav-link nav-link-button"
              onClick={() => {
                goTo('/become-executor');
              }}
            >
              {isExecutor ? 'Рабочий кабинет' : 'Стать исполнителем'}
            </button>
            <a
              href="/help"
              className="nav-link"
              onClick={(event) => {
                event.preventDefault();
                goTo('/help');
              }}
            >
              Помощь
            </a>
          </nav>

          <div className="auth">
            {isAuthorized ? (
              <button
                type="button"
                className="user-btn"
                onClick={() => goTo('/profile')}
                aria-label="Профиль пользователя"
              >
                <img src={userIcon} alt="User" className="user-btn__img" />
              </button>
            ) : (
              <a
                href="/login"
                className="login-btn"
                onClick={(event) => {
                  event.preventDefault();
                  goTo('/login');
                }}
              >
                Войти
              </a>
            )}
          </div>
        </div>
      </header>

      {isOrderMenuOpen && (
        <div className="order-modal" onClick={() => setIsOrderMenuOpen(false)}>
          <div className="order-modal__card" onClick={(event) => event.stopPropagation()}>
            <div className="order-modal__header">
              <h2>Новый заказ</h2>
              <button
                type="button"
                className="order-modal__close"
                onClick={() => setIsOrderMenuOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="order-form" onSubmit={handleOrderSubmit} noValidate>
              <label className="order-form__field">
                <span>Выберите услугу из каталога</span>
                <select
                  value={orderForm.service}
                  onChange={(event) => handleFieldChange('service', event.target.value)}
                  required
                >
                  <option value="" disabled>Выберите услугу</option>
                  {catalogServices.map((service) => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
                {orderErrors.service && <p className="order-form__error">{orderErrors.service}</p>}
              </label>

              <label className="order-form__field">
                <span>Рассказать о модели и подобностях, которые стоит знать</span>
                <textarea
                  rows="4"
                  placeholder="Опишите материал, размеры, цвет, требования к качеству и т.д."
                  value={orderForm.details}
                  onChange={(event) => handleFieldChange('details', event.target.value)}
                  required
                />
                {orderErrors.details && <p className="order-form__error">{orderErrors.details}</p>}
              </label>

              <div className="order-form__field">
                <span>Прикрепить файл</span>
                <div className="order-file">
                  <input
                    id="order-file"
                    type="file"
                    className="order-file__input"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      const fileName = file?.name;
                      setSelectedFileName(fileName || 'Файл не выбран (необязательно)');
                      if (!file) {
                        setSelectedFileData('');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = typeof reader.result === 'string' ? reader.result : '';
                        setSelectedFileData(result);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label htmlFor="order-file" className="order-file__button">
                    Выберите файл
                  </label>
                  <p className="order-file__name">{selectedFileName}</p>
                </div>
              </div>

              <div className="order-form__row">
                <label className="order-form__field">
                  <span>Бюджет (тенге)</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    list="budget-options"
                    placeholder="Например: 50000"
                    value={orderForm.budget}
                    onChange={(event) => handleFieldChange('budget', event.target.value)}
                    required
                  />
                  {orderErrors.budget && <p className="order-form__error">{orderErrors.budget}</p>}
                  <datalist id="budget-options">
                    <option value="20000" />
                    <option value="50000" />
                    <option value="100000" />
                    <option value="200000" />
                    <option value="500000" />
                  </datalist>
                </label>

                <label className="order-form__field">
                  <span>Срок выполнения</span>
                  <input
                    type="date"
                    className="order-date-input"
                    value={orderForm.deadline}
                    onChange={(event) => handleFieldChange('deadline', event.target.value)}
                    required
                  />
                  {orderErrors.deadline && <p className="order-form__error">{orderErrors.deadline}</p>}
                </label>
              </div>

              <button type="submit" className="order-form__submit">
                Опубликовать заказ
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
