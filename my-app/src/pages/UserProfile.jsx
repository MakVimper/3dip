import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import './Profile.css';

const goTo = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('app:navigate'));
};

const getUserIdFromLocation = () => {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('userId');
  return value && value.trim() ? value.trim() : '';
};

const getRoleLabel = (profileData) => (profileData?.isExecutor ? 'Исполнитель' : 'Пользователь');

const catalogServices = [
  'Прототипирование изделий',
  '3D-моделирование с нуля',
  'Мелкосерийное производство',
  'Функциональные детали',
  'Печать высокоточных моделей',
  'Крупногабаритная печать',
];

const UserProfile = () => {
  const userId = useMemo(getUserIdFromLocation, []);
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [reviewsMessage, setReviewsMessage] = useState('');
  const [cabinet, setCabinet] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: '5', text: '' });
  const [reviewMessage, setReviewMessage] = useState('');
  const [isReviewSending, setIsReviewSending] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const [orderModal, setOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({ service: '', details: '', budget: '', deadline: '' });
  const [orderErrors, setOrderErrors] = useState({});
  const [orderMessage, setOrderMessage] = useState('');
  const [isOrderSending, setIsOrderSending] = useState(false);
  const [orderFileName, setOrderFileName] = useState('');
  const [orderFileData, setOrderFileData] = useState('');

  const currentUser = useMemo(() => {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

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
          directExecutorUserId: userId,
          fileName: orderFileName || '',
          fileData: orderFileData || '',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Ошибка создания заказа');
      setOrderMessage('Заказ успешно создан!');
      setTimeout(() => {
        setOrderModal(false);
        setOrderForm({ service: '', details: '', budget: '', deadline: '' });
        setOrderFileName('');
        setOrderFileData('');
        setOrderMessage('');
      }, 1500);
    } catch (err) {
      setOrderMessage(err.message || 'Ошибка');
    } finally {
      setIsOrderSending(false);
    }
  };

  useEffect(() => {
    if (!userId || !/^\d+$/.test(userId)) {
      setError('Некорректный идентификатор пользователя.');
      return;
    }

    const loadProfile = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `Ошибка загрузки профиля (HTTP ${response.status})`);
        }

        setProfileData(data);
      } catch (err) {
        setError(err.message || 'Ошибка загрузки профиля');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  useEffect(() => {
    if (!userId || !/^\d+$/.test(userId)) return;

    const loadCabinet = async () => {
      try {
        const response = await fetch(`/api/executors/cabinet?userId=${userId}`);
        const data = await response.json();

        if (response.ok && data.cabinet) {
          setCabinet({
            about: data.cabinet.about || '',
            services: Array.isArray(data.cabinet.services)
              ? data.cabinet.services.map((s) => typeof s === 'string' ? { name: s, price: '' } : s)
              : [],
            companyAvatar: data.cabinet.companyAvatar || '',
            works: Array.isArray(data.cabinet.works) ? data.cabinet.works : [],
            priceRange: data.cabinet.priceRange || '',
          });
        } else {
          setCabinet(null);
        }
      } catch {
        setCabinet(null);
      }
    };

    loadCabinet();
  }, [userId]);

  useEffect(() => {
    if (!userId || !/^\d+$/.test(userId)) return;
    const raw = localStorage.getItem(`executor_cabinet_${userId}`);
    if (!raw) {
      setCabinet(null);
      return;
    }
    try {
      const data = JSON.parse(raw);
      setCabinet({
        about: data?.about || '',
        services: Array.isArray(data?.services) ? data.services : [],
        companyAvatar: data?.companyAvatar || '',
        works: Array.isArray(data?.works) ? data.works : [],
      });
    } catch {
      setCabinet(null);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !/^\d+$/.test(userId)) return;

    const loadReviews = async () => {
      setIsReviewsLoading(true);
      setReviewsMessage('');

      try {
        const response = await fetch(`/api/reviews?userId=${userId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || `РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РѕС‚Р·С‹РІРѕРІ (HTTP ${response.status})`,
          );
        }

        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      } catch (err) {
        setReviewsMessage(err.message || 'РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РѕС‚Р·С‹РІРѕРІ');
      } finally {
        setIsReviewsLoading(false);
      }
    };

    loadReviews();
  }, [userId]);

  const submitReview = async (event) => {
    event.preventDefault();
    if (!currentUser?.id) return;

    setIsReviewSending(true);
    setReviewMessage('');

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerUserId: currentUser.id,
          targetUserId: userId,
          rating: reviewForm.rating,
          text: reviewForm.text,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка отправки отзыва (HTTP ${response.status})`);
      }

      setReviewForm({ rating: '5', text: '' });
      setReviews((prev) => [data.review, ...prev]);
      setReviewMessage('Отзыв отправлен.');
    } catch (err) {
      setReviewMessage(err.message || 'Ошибка отправки отзыва');
    } finally {
      setIsReviewSending(false);
    }
  };

  const user = profileData?.user;
  const executor = profileData?.executor;
  const canReview = currentUser?.id && Number(currentUser.id) !== Number(userId);

  return (
    <div className="profile-page">
      <Header />
      <main className="profile-main">
        <section className="profile-card profile-card--info">
          <div className="profile-block profile-block--merged">
            <div className="orders-header">
              <div>
                <h2>{executor ? 'О исполнителе' : 'О пользователе'}</h2>
                <p>{executor ? 'Информация и услуги исполнителя.' : 'Информация о пользователе.'}</p>
              </div>
              <div className="orders-item__actions">
                <button
                  type="button"
                  className="orders-view-btn orders-view-btn--active"
                  onClick={() => {
                    if (window.history.length > 1) {
                      window.history.back();
                    } else {
                      goTo('/profile?tab=orders');
                    }
                  }}
                >
                  Назад
                </button>
                {executor && currentUser?.id && Number(currentUser.id) !== Number(userId) && (
                  <button
                    type="button"
                    className="orders-view-btn"
                    onClick={() => {
                      if (!currentUser?.id) { goTo('/login'); return; }
                      setOrderModal(true);
                      setOrderForm({ service: '', details: '', budget: '', deadline: '' });
                      setOrderErrors({});
                      setOrderMessage('');
                      setOrderFileName('');
                      setOrderFileData('');
                    }}
                  >
                    Сделать заказ
                  </button>
                )}
              </div>
            </div>

            {error && <p className="orders-message">{error}</p>}

            {isLoading ? (
              <p className="orders-empty">{'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043f\u0440\u043e\u0444\u0438\u043b\u044f...'} </p>
            ) : user ? (
              <div className={`profile-merge-grid ${executor ? 'profile-merge-grid--two' : ''}`}>
                <div className="profile-merge-section">
                  <div className="profile-merge-title">{'\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f'}</div>
                  <div className="profile-table">
                    <div className="profile-row">
                      <span className="profile-row__label">{'\u0418\u043c\u044f:'}</span>
                      <span className="profile-row__field">{user.name || '-'}</span>
                    </div>
                    <div className="profile-row">
                      <span className="profile-row__label">Email:</span>
                      <span className="profile-row__field">{user.email || '-'}</span>
                    </div>
                    <div className="profile-row">
                      <span className="profile-row__label">{'\u0420\u043e\u043b\u044c:'}</span>
                      <span className="profile-row__field">{getRoleLabel(profileData)}</span>
                    </div>
                    {executor && (
                      <>
                        <div className="profile-row">
                          <span className="profile-row__label">{'\u0422\u0438\u043f:'}</span>
                          <span className="profile-row__field">
                            {executor.executor_type === 'organization' ? '\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f' : '\u0427\u0430\u0441\u0442\u043d\u044b\u0439 \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c'}
                          </span>
                        </div>
                        <div className="profile-row">
                          <span className="profile-row__label">{'\u041a\u043e\u043d\u0442\u0430\u043a\u0442:'}</span>
                          <span className="profile-row__field">
                            {executor.first_name} {executor.last_name}
                          </span>
                        </div>
                        {executor.phone && (
                          <div className="profile-row">
                            <span className="profile-row__label">{'\u0422\u0435\u043b\u0435\u0444\u043e\u043d:'}</span>
                            <span className="profile-row__field">{executor.phone}</span>
                          </div>
                        )}
                        {executor.executor_type === 'organization' && (
                          <>
                            <div className="profile-row">
                              <span className="profile-row__label">{'\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f:'}</span>
                              <span className="profile-row__field">{executor.organization_name || '-'}</span>
                            </div>
                            <div className="profile-row">
                              <span className="profile-row__label">{'\u0410\u0434\u0440\u0435\u0441:'}</span>
                              <span className="profile-row__field">{executor.organization_address || '-'}</span>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {executor && (
                  <div className="profile-merge-section">
                    <div className="profile-merge-title">{'\u0420\u0430\u0431\u043e\u0447\u0438\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442'}</div>
                    {!cabinet ? (
                      <p className="orders-empty">{'\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u043e \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0435.'}</p>
                    ) : (
                      <div className="uprofile-cabinet-view">
                        {}
                        <div className="cabinet-field">
                          <span>{'О себе'}</span>
                          <p className="uprofile-about-text">
                            {cabinet.about ? cabinet.about : 'Нет описания.'}
                          </p>
                        </div>

                        {}
                        {cabinet.priceRange && (
                          <div className="cabinet-field">
                            <span>{'Примерная стоимость'}</span>
                            <div className="uprofile-price-badge">
                              {(() => {
                                const [from, to] = cabinet.priceRange.split('-');
                                const fmt = (v) => v ? Number(v).toLocaleString('ru-RU') + ' тг' : '';
                                if (from && to) return `💰 от ${fmt(from)} до ${fmt(to)}`;
                                if (from) return `💰 от ${fmt(from)}`;
                                if (to) return `💰 до ${fmt(to)}`;
                                return `💰 ${cabinet.priceRange}`;
                              })()}
                            </div>
                          </div>
                        )}

                        {}
                        <div className="cabinet-field">
                          <span>{'Услуги каталога'}</span>
                          {cabinet.services.length === 0 ? (
                            <p className="orders-empty">{'Услуги не выбраны.'}</p>
                          ) : (
                            <div className="uprofile-services">
                              {cabinet.services.map((s, i) => (
                                <div key={s.name} className="uprofile-service-item">
                                  <div className="uprofile-service-item__left">
                                    <span className="uprofile-service-item__num">{i + 1}</span>
                                    <span className="uprofile-service-item__name">{s.name}</span>
                                  </div>
                                  <span className={`uprofile-service-item__price ${!s.price ? 'uprofile-service-item__price--negotiable' : ''}`}>
                                    {s.price ? `${Number(s.price).toLocaleString('ru-RU')} тг` : 'по договорённости'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {}
                        <div className="cabinet-grid">
                          <div className="cabinet-column">
                            <div className="cabinet-field">
                              <span>{'Аватар компании'}</span>
                              <div className="cabinet-avatar">
                                {cabinet.companyAvatar ? (
                                  <img src={cabinet.companyAvatar} alt={'Компания'} />
                                ) : (
                                  <div className="cabinet-avatar__placeholder">{'Логотип не загружен'}</div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="cabinet-column">
                            <div className="cabinet-field">
                              <span>{'Фото выполненных работ'}</span>
                              {cabinet.works.length === 0 ? (
                                <p className="orders-empty">{'Пока нет фото.'}</p>
                              ) : (
                                <div className="cabinet-works-grid">
                                  {cabinet.works.map((work, index) => (
                                    <div
                                      key={`${work.name || 'work'}-${index}`}
                                      className="cabinet-work cabinet-work--clickable"
                                      onClick={() => setLightbox({ src: work.data, alt: work.name || 'Работа' })}
                                      title="Открыть на весь экран"
                                    >
                                      <img src={work.data} alt={work.name || 'Работа'} />
                                      <div className="cabinet-work__zoom">⤢</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="orders-empty">{'\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.'}</p>
            )}
          </div>

<div className="profile-block">
            <div className="orders-header">
              <div>
                <h2>Отзывы</h2>
                <p>Что говорят о пользователе.</p>
              </div>
            </div>

            {canReview && (
              <form className="review-form" onSubmit={submitReview}>
                <div className="review-form__field">
                  <span>Оценка</span>
                  <div className="rating-stars" role="radiogroup" aria-label="Оценка">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`rating-star ${Number(reviewForm.rating) >= value ? 'rating-star--active' : ''}`}
                        onClick={() => setReviewForm((prev) => ({ ...prev, rating: String(value) }))}
                        aria-pressed={Number(reviewForm.rating) >= value}
                      >
                        {'★'}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="review-form__field">
                  <span>Отзыв</span>
                  <textarea
                    rows="3"
                    placeholder="Напишите отзыв..."
                    value={reviewForm.text}
                    onChange={(event) => setReviewForm((prev) => ({ ...prev, text: event.target.value }))}
                    required
                  />
                </label>
                <button type="submit" className="orders-view-btn" disabled={isReviewSending}>
                  {isReviewSending ? '\u041e\u0442\u043f\u0440\u0430\u0432\u043a\u0430...' : '\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u0437\u044b\u0432'}
                </button>
                {reviewMessage && <p className="orders-message">{reviewMessage}</p>}
              </form>
            )}

            {reviewsMessage && <p className="orders-message">{reviewsMessage}</p>}

            {isReviewsLoading ? (
              <p className="orders-empty">Загрузка отзывов...</p>
            ) : reviews.length === 0 ? (
              <p className="orders-empty">Пока нет отзывов.</p>
            ) : (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review.id} className="review-item">
                    <div className="review-item__head">
                      <span className="review-item__name">{review.reviewer_name || '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c'}</span>
                      <span className="review-item__rating">Оценка: {review.rating}/5</span>
                    </div>
                    <p className="review-item__text">{review.text}</p>
                    <span className="review-item__date">
                      {new Date(review.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {}
      {lightbox && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фото"
        >
          <button
            className="lightbox-close"
            onClick={() => setLightbox(null)}
            aria-label="Закрыть"
          >
            ✕
          </button>
          <img
            className="lightbox-img"
            src={lightbox.src}
            alt={lightbox.alt}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {}
      {orderModal && (
        <div className="order-modal" onClick={() => setOrderModal(false)}>
          <div className="order-modal__card" onClick={(e) => e.stopPropagation()}>
            <div className="order-modal__header">
              <h2>Заказ для {profileData?.user?.name || 'исполнителя'}</h2>
              <button type="button" className="order-modal__close" onClick={() => setOrderModal(false)}>×</button>
            </div>
            <form className="order-form" onSubmit={submitOrder} noValidate>
              <label className="order-form__field">
                <span>Услуга</span>
                <select
                  value={orderForm.service}
                  onChange={(e) => setOrderForm((p) => ({ ...p, service: e.target.value }))}
                >
                  <option value="" disabled>Выберите услугу</option>
                  {(cabinet?.services?.length
                    ? cabinet.services.map((s) => (typeof s === 'string' ? s : s.name))
                    : catalogServices
                  ).map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
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

              <div className="order-form__field">
                <span>Прикрепить файл</span>
                <div className="order-file">
                  <input
                    id="uprofile-order-file"
                    type="file"
                    className="order-file__input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) { setOrderFileName(''); setOrderFileData(''); return; }
                      setOrderFileName(file.name);
                      const reader = new FileReader();
                      reader.onload = () => setOrderFileData(typeof reader.result === 'string' ? reader.result : '');
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label htmlFor="uprofile-order-file" className="order-file__button">
                    Выберите файл
                  </label>
                  <p className="order-file__name">
                    {orderFileName || 'Файл не выбран (необязательно)'}
                  </p>
                </div>
              </div>

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

export default UserProfile;
