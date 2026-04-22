import { useCallback, useEffect, useState } from 'react';
import Header from '../components/Header';
import './FindExecutors.css';

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

const EMPTY_FILTERS = {
  services: [],
  priceFrom: '',
  priceTo: '',
  executorType: '',
};

const getInitialFilters = () => {
  const params = new URLSearchParams(window.location.search);
  const service = params.get('service');
  return {
    ...EMPTY_FILTERS,
    services: service ? [service] : [],
  };
};

const formatPrice = (priceRange) => {
  if (!priceRange) return null;
  const [from, to] = priceRange.split('-');
  const fmt = (v) => (v ? Number(v).toLocaleString('ru-RU') : '');
  if (from && to) return { from: fmt(from), to: fmt(to) };
  if (from) return { from: fmt(from), to: null };
  if (to) return { from: null, to: fmt(to) };
  return null;
};

const FindExecutors = () => {
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch { return null; }
  })();

  const [executors, setExecutors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState(getInitialFilters);

  const [orderModal, setOrderModal] = useState(null);
  const [orderForm, setOrderForm] = useState({ service: '', details: '', budget: '', deadline: '' });
  const [orderErrors, setOrderErrors] = useState({});
  const [orderMessage, setOrderMessage] = useState('');
  const [isOrderSending, setIsOrderSending] = useState(false);

  const loadExecutors = useCallback(async (activeFilters) => {
    setIsLoading(true);
    setMessage('');
    try {
      const params = new URLSearchParams();
      if (activeFilters.services?.length) {
        activeFilters.services.forEach((s) => params.append('service', s));
      }
      if (activeFilters.priceFrom) params.append('priceFrom', activeFilters.priceFrom);
      if (activeFilters.priceTo) params.append('priceTo', activeFilters.priceTo);
      if (activeFilters.executorType) params.append('executorType', activeFilters.executorType);
      if (currentUser?.id) params.append('excludeUserId', currentUser.id);

      const response = await fetch(`/api/executors/list?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Ошибка (HTTP ${response.status})`);
      setExecutors(Array.isArray(data.executors) ? data.executors : []);
    } catch (error) {
      setMessage(error.message || 'Ошибка загрузки специалистов');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = getInitialFilters();
    loadExecutors(initial);
  }, [loadExecutors]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const toggleService = (service) => {
    setFilters((prev) => {
      const has = prev.services.includes(service);
      return {
        ...prev,
        services: has ? prev.services.filter((s) => s !== service) : [...prev.services, service],
      };
    });
  };

  const applyFilters = () => loadExecutors(filters);

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    loadExecutors(EMPTY_FILTERS);
  };

  const openOrderModal = (executor) => {
    if (!currentUser?.id) { goTo('/login'); return; }
    setOrderModal({ executor });
    setOrderForm({ service: '', details: '', budget: '', deadline: '' });
    setOrderErrors({});
    setOrderMessage('');
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!orderForm.service) errors.service = 'Выберите услугу';
    if (!orderForm.details.trim()) errors.details = 'Опишите задачу';
    if (!orderForm.budget || Number(orderForm.budget) <= 0) errors.budget = 'Укажите бюджет';
    if (!orderForm.deadline) errors.deadline = 'Укажите срок';
    setOrderErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsOrderSending(true);
    setOrderMessage('');
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          service: orderForm.service,
          details: orderForm.details,
          budget: orderForm.budget,
          deadline: orderForm.deadline,
          directExecutorUserId: orderModal.executor.user_id,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Ошибка создания заказа');
      setOrderMessage('Заказ успешно создан!');
      setTimeout(() => setOrderModal(null), 1500);
    } catch (err) {
      setOrderMessage(err.message || 'Ошибка');
    } finally {
      setIsOrderSending(false);
    }
  };

  return (
    <div className="fe-page">
      <Header />
      <main className="fe-main">

        {}
        <div className="fe-hero">
          <h1>Найти специалистов</h1>
          <p>Каталог исполнителей 3D-печати — выберите подходящего мастера для вашего проекта</p>
        </div>

        <div className="fe-layout">

          {}
          <aside className="fe-sidebar">
            <div className="fe-sidebar__title">Фильтры</div>

            <div className="fe-filter-group">
              <label className="fe-filter-label">Услуги</label>
              <div className="fe-checkbox-group">
                {catalogServices.map((s) => (
                  <label
                    key={s}
                    className={`fe-checkbox ${filters.services.includes(s) ? 'fe-checkbox--active' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={filters.services.includes(s)}
                      onChange={() => toggleService(s)}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div className="fe-filter-group">
              <label className="fe-filter-label">Тип исполнителя</label>
              <div className="fe-radio-group">
                {[
                  { value: '', label: 'Все' },
                  { value: 'individual', label: 'Частный' },
                  { value: 'organization', label: 'Организация' },
                ].map(({ value, label }) => (
                  <label key={value} className={`fe-radio ${filters.executorType === value ? 'fe-radio--active' : ''}`}>
                    <input
                      type="radio"
                      name="executorType"
                      value={value}
                      checked={filters.executorType === value}
                      onChange={() => handleFilterChange('executorType', value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="fe-filter-group">
              <label className="fe-filter-label">Стоимость (тг)</label>
              <div className="fe-price-row">
                <input
                  className="fe-filter-input"
                  type="number"
                  min="0"
                  placeholder="От"
                  value={filters.priceFrom}
                  onChange={(e) => handleFilterChange('priceFrom', e.target.value)}
                />
                <span className="fe-price-sep">—</span>
                <input
                  className="fe-filter-input"
                  type="number"
                  min="0"
                  placeholder="До"
                  value={filters.priceTo}
                  onChange={(e) => handleFilterChange('priceTo', e.target.value)}
                />
              </div>
            </div>

            <button className="fe-btn fe-btn--apply" onClick={applyFilters}>
              Применить
            </button>
            <button className="fe-btn fe-btn--reset" onClick={resetFilters}>
              Сбросить
            </button>
          </aside>

          {}
          <div className="fe-content">
            {message && <p className="fe-message">{message}</p>}

            {isLoading ? (
              <div className="fe-empty">Загрузка специалистов...</div>
            ) : executors.length === 0 ? (
              <div className="fe-empty">Специалисты не найдены. Попробуйте изменить фильтры.</div>
            ) : (
              <div className="fe-list">
                {executors.map((executor) => {
                  const price = formatPrice(executor.price_range);
                  const works = Array.isArray(executor.works) ? executor.works : [];
                  return (
                    <article key={executor.user_id} className="fe-card">
                      {}
                      <div className="fe-card__head">
                        <div className="fe-card__avatar">
                          {executor.company_avatar ? (
                            <img src={executor.company_avatar} alt={executor.name} />
                          ) : (
                            <div className="fe-card__avatar-placeholder">
                              {executor.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                        <div className="fe-card__info">
                          <h3 className="fe-card__name">{executor.name || 'Исполнитель'}</h3>
                          <span className="fe-card__type">
                            {executor.executor_type === 'organization'
                              ? executor.organization_name || 'Организация'
                              : 'Частный исполнитель'}
                          </span>
                          <div className="fe-card__rating">
                            {executor.review_count > 0 ? (
                              <>
                                <span className="fe-card__rating-stars">
                                  {'★'.repeat(Math.round(executor.avg_rating))}{'☆'.repeat(5 - Math.round(executor.avg_rating))}
                                </span>
                                <span className="fe-card__rating-value">{executor.avg_rating.toFixed(1)}</span>
                                <span className="fe-card__rating-count">({executor.review_count})</span>
                              </>
                            ) : (
                              <span className="fe-card__rating-none">Нет отзывов</span>
                            )}
                          </div>
                          {executor.about && (
                            <p className="fe-card__about">{executor.about}</p>
                          )}
                        </div>
                      </div>

                      {}
                      {works.length > 0 && (
                        <div className="fe-card__works-strip">
                          {works.map((work, i) => (
                            <div key={i} className="fe-card__work-thumb">
                              <img src={work.data} alt={work.name || 'Работа'} />
                            </div>
                          ))}
                        </div>
                      )}

                      {}
                      {executor.services?.length > 0 && (
                        <div className="fe-card__services">
                          {executor.services.map((s) => {
                            const name = typeof s === 'string' ? s : s.name;
                            const svcPrice = typeof s === 'string' ? '' : s.price;
                            return (
                              <div key={name} className="fe-card__service-row">
                                <span className="fe-card__service-name">{name}</span>
                                <span className="fe-card__service-dots" />
                                <span className="fe-card__service-price">
                                  {svcPrice ? `${Number(svcPrice).toLocaleString('ru-RU')} тг` : 'по договорённости'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {}
                      <div className="fe-card__actions">
                        <button
                          className="fe-card__action-btn"
                          onClick={() => goTo(`/user-profile?userId=${executor.user_id}`)}
                        >
                          Посмотреть профиль
                        </button>
                        <button
                          className="fe-card__action-btn fe-card__action-btn--write"
                          onClick={() => openOrderModal(executor)}
                        >
                          Сделать заказ
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {}
      {orderModal && (
        <div className="order-modal" onClick={() => setOrderModal(null)}>
          <div className="order-modal__card" onClick={(e) => e.stopPropagation()}>
            <div className="order-modal__header">
              <h2>Заказ для {orderModal.executor.name}</h2>
              <button type="button" className="order-modal__close" onClick={() => setOrderModal(null)}>×</button>
            </div>

            <form className="order-form" onSubmit={submitOrder} noValidate>
              <label className="order-form__field">
                <span>Услуга</span>
                <select
                  value={orderForm.service}
                  onChange={(e) => setOrderForm((p) => ({ ...p, service: e.target.value }))}
                >
                  <option value="" disabled>Выберите услугу</option>
                  {(orderModal.executor.services || []).map((s) => {
                    const name = typeof s === 'string' ? s : s.name;
                    return <option key={name} value={name}>{name}</option>;
                  })}
                </select>
                {orderErrors.service && <p className="order-form__error">{orderErrors.service}</p>}
              </label>

              <label className="order-form__field">
                <span>Описание задачи</span>
                <textarea
                  rows="4"
                  placeholder="Опишите что нужно сделать..."
                  value={orderForm.details}
                  onChange={(e) => setOrderForm((p) => ({ ...p, details: e.target.value }))}
                />
                {orderErrors.details && <p className="order-form__error">{orderErrors.details}</p>}
              </label>

              <div className="order-form__row">
                <label className="order-form__field">
                  <span>Бюджет (тг)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="50000"
                    value={orderForm.budget}
                    onChange={(e) => setOrderForm((p) => ({ ...p, budget: e.target.value }))}
                  />
                  {orderErrors.budget && <p className="order-form__error">{orderErrors.budget}</p>}
                </label>
                <label className="order-form__field">
                  <span>Срок выполнения</span>
                  <input
                    type="date"
                    value={orderForm.deadline}
                    onChange={(e) => setOrderForm((p) => ({ ...p, deadline: e.target.value }))}
                  />
                  {orderErrors.deadline && <p className="order-form__error">{orderErrors.deadline}</p>}
                </label>
              </div>

              {orderMessage && (
                <p style={{ color: orderMessage.includes('успешно') ? '#166534' : '#b91c1c', fontSize: 14 }}>
                  {orderMessage}
                </p>
              )}

              <button type="submit" className="order-form__submit" disabled={isOrderSending}>
                {isOrderSending ? 'Отправка...' : 'Создать заказ'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindExecutors;
