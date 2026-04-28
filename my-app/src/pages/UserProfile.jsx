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
  const [worksSlideIndex, setWorksSlideIndex] = useState(0);
  const [worksMosaicOpen, setWorksMosaicOpen] = useState(false);

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
    try { return JSON.parse(raw); } catch { return null; }
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
        if (!response.ok) throw new Error(data.message || `Ошибка загрузки профиля (HTTP ${response.status})`);
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
    const loadReviews = async () => {
      setIsReviewsLoading(true);
      setReviewsMessage('');
      try {
        const response = await fetch(`/api/reviews?userId=${userId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Ошибка загрузки отзывов');
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      } catch (err) {
        setReviewsMessage(err.message || 'Ошибка загрузки отзывов');
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
      if (!response.ok) throw new Error(data.message || `Ошибка отправки отзыва (HTTP ${response.status})`);
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
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length).toFixed(1)
    : null;
  const works = cabinet?.works || [];

  return (
    <div className="profile-page">
      <Header />
      <main className="uprofile-main">

        {/* Навигация */}
        <div className="uprofile-nav">
          <button type="button" className="uprofile-nav__back"
            onClick={() => window.history.length > 1 ? window.history.back() : goTo('/find-executors')}>
            ← Назад
          </button>
        </div>

        {error && <p className="orders-message">{error}</p>}

        {isLoading ? (
          <p className="orders-empty">Загрузка профиля...</p>
        ) : user ? (
          <>
            {/* ══ Основной блок: галерея + инфо ══ */}
            <div className="uprofile-page">

              {/* Заголовок внутри блока */}
              <div className="uprofile-page__header">
                <h2 className="uprofile-page__title">
                  {executor ? 'О исполнителе' : 'О пользователе'}
                </h2>
              </div>

              {/* Левая колонка — галерея */}
              <div className="uprofile-gallery">
                {works.length > 0 && (
                  <div className="uprofile-gallery__thumbs">
                    {works.map((work, i) => (
                      <button key={i}
                        className={`uprofile-gallery__thumb ${worksSlideIndex === i ? 'uprofile-gallery__thumb--active' : ''}`}
                        onClick={() => setWorksSlideIndex(i)} aria-label={`Фото ${i + 1}`}>
                        <img src={work.data} alt={work.name || `Работа ${i + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
                <div className="uprofile-gallery__main">
                  {works.length > 0 ? (
                    <>
                      {works.length > 1 && (
                        <button className="uprofile-gallery__arrow uprofile-gallery__arrow--prev"
                          onClick={() => setWorksSlideIndex((i) => (i - 1 + works.length) % works.length)}
                          aria-label="Предыдущее">‹</button>
                      )}
                      <img className="uprofile-gallery__img"
                        src={works[worksSlideIndex]?.data}
                        alt={works[worksSlideIndex]?.name || 'Работа'}
                        onClick={() => setLightbox({ src: works[worksSlideIndex].data, alt: works[worksSlideIndex].name || 'Работа', index: worksSlideIndex, works })} />
                      {works.length > 1 && (
                        <button className="uprofile-gallery__arrow uprofile-gallery__arrow--next"
                          onClick={() => setWorksSlideIndex((i) => (i + 1) % works.length)}
                          aria-label="Следующее">›</button>
                      )}
                      <div className="uprofile-gallery__footer">
                        <span className="uprofile-gallery__counter">{worksSlideIndex + 1} / {works.length}</span>
                        <button className="uprofile-gallery__all-btn" onClick={() => setWorksMosaicOpen(true)}>Все фото</button>
                      </div>
                    </>
                  ) : (
                    <div className="uprofile-gallery__empty">
                      {cabinet?.companyAvatar
                        ? <img src={cabinet.companyAvatar} alt="Логотип" className="uprofile-gallery__logo" />
                        : <div className="uprofile-gallery__placeholder">{user.name?.charAt(0)?.toUpperCase() || '?'}</div>}
                    </div>
                  )}
                </div>
              </div>

              {/* Правая колонка — информация */}
              <div className="uprofile-info">
                <div className="uprofile-info__head">
                  <div className="uprofile-info__head-left">
                    <div className="uprofile-info__badges">
                      {executor && <span className="uprofile-badge uprofile-badge--exec">Исполнитель</span>}
                      {executor?.executor_type === 'organization' && (
                        <span className="uprofile-badge uprofile-badge--org">Организация</span>
                      )}
                    </div>
                    <h1 className="uprofile-info__name">{user.name}</h1>
                    {executor?.executor_type === 'organization' && executor.organization_name && (
                      <p className="uprofile-info__org">Компания: {executor.organization_name}</p>
                    )}
                    {avgRating && (
                      <div className="uprofile-info__rating">
                        <span className="uprofile-rating__star">★</span>
                        <span className="uprofile-rating__value">{avgRating}</span>
                        <span className="uprofile-rating__count">
                          · {reviews.length} {reviews.length === 1 ? 'отзыв' : reviews.length < 5 ? 'отзыва' : 'отзывов'}
                        </span>
                      </div>
                    )}
                    {cabinet?.priceRange && (
                      <div className="uprofile-info__price">
                        {(() => {
                          const [from, to] = cabinet.priceRange.split('-');
                          const fmt = (v) => v ? Number(v).toLocaleString('ru-RU') + ' тг' : '';
                          if (from && to) return <>от <strong>{fmt(from)}</strong> до <strong>{fmt(to)}</strong></>;
                          if (from) return <>от <strong>{fmt(from)}</strong></>;
                          if (to) return <>до <strong>{fmt(to)}</strong></>;
                          return <strong>{cabinet.priceRange}</strong>;
                        })()}
                      </div>
                    )}
                    {executor && currentUser?.id && Number(currentUser.id) !== Number(userId) && (
                      <button type="button" className="uprofile-order-btn"
                        onClick={() => {
                          setOrderModal(true);
                          setOrderForm({ service: '', details: '', budget: '', deadline: '' });
                          setOrderErrors({});
                          setOrderMessage('');
                          setOrderFileName('');
                          setOrderFileData('');
                        }}>
                        Сделать заказ
                      </button>
                    )}
                  </div>
                  {cabinet?.companyAvatar && (
                    <div className="uprofile-info__company-avatar">
                      <img src={cabinet.companyAvatar} alt="Логотип компании" />
                    </div>
                  )}
                </div>
                <div className="uprofile-info__specs">
                  <div className="uprofile-spec-row">
                    <span className="uprofile-spec-row__label">Контакт</span>
                    <span className="uprofile-spec-row__dots" />
                    <span className="uprofile-spec-row__value">
                      {executor ? `${executor.first_name} ${executor.last_name}` : user.name}
                    </span>
                  </div>
                  {executor?.phone && (
                    <div className="uprofile-spec-row">
                      <span className="uprofile-spec-row__label">Телефон</span>
                      <span className="uprofile-spec-row__dots" />
                      <span className="uprofile-spec-row__value">{executor.phone}</span>
                    </div>
                  )}
                  {executor?.executor_type === 'organization' && executor.organization_address && (
                    <div className="uprofile-spec-row">
                      <span className="uprofile-spec-row__label">Адрес</span>
                      <span className="uprofile-spec-row__dots" />
                      <span className="uprofile-spec-row__value">{executor.organization_address}</span>
                    </div>
                  )}
                  <div className="uprofile-spec-row">
                    <span className="uprofile-spec-row__label">Тип</span>
                    <span className="uprofile-spec-row__dots" />
                    <span className="uprofile-spec-row__value">
                      {executor
                        ? (executor.executor_type === 'organization' ? 'Организация' : 'Частный исполнитель')
                        : 'Пользователь'}
                    </span>
                  </div>
                </div>

                {cabinet?.about && (
                  <div className="uprofile-info__about">
                    <div className="uprofile-info__section-title">О себе</div>
                    <p className="uprofile-about-text">{cabinet.about}</p>
                  </div>
                )}

                {cabinet?.services?.length > 0 && (
                  <div className="uprofile-info__services">
                    <div className="uprofile-info__section-title">Услуги каталога</div>
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
                  </div>
                )}
              </div>
            </div>

            {/* ── Отзывы ── */}
            <div className="uprofile-reviews">
              <div className="uprofile-reviews__header">
                <h2>Отзывы {avgRating && <span className="uprofile-reviews__avg">★ {avgRating}</span>}</h2>
              </div>
              {canReview && (
                <form className="review-form" onSubmit={submitReview}>
                  <div className="review-form__field">
                    <span>Оценка</span>
                    <div className="rating-stars" role="radiogroup" aria-label="Оценка">
                      {[1,2,3,4,5].map((value) => (
                        <button key={value} type="button"
                          className={`rating-star ${Number(reviewForm.rating) >= value ? 'rating-star--active' : ''}`}
                          onClick={() => setReviewForm((prev) => ({ ...prev, rating: String(value) }))}
                          aria-pressed={Number(reviewForm.rating) >= value}>★</button>
                      ))}
                    </div>
                  </div>
                  <label className="review-form__field">
                    <span>Отзыв</span>
                    <textarea rows="3" placeholder="Напишите отзыв..." value={reviewForm.text}
                      onChange={(e) => setReviewForm((prev) => ({ ...prev, text: e.target.value }))} required />
                  </label>
                  <button type="submit" className="orders-view-btn" disabled={isReviewSending}>
                    {isReviewSending ? 'Отправка...' : 'Отправить отзыв'}
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
                        <span className="review-item__name">{review.reviewer_name || 'Пользователь'}</span>
                        <span className="review-item__rating">
                          {[1,2,3,4,5].map((s) => (
                            <span key={s} className={s <= Number(review.rating) ? 'review-item__star--filled' : 'review-item__star--empty'}>★</span>
                          ))}
                        </span>
                      </div>
                      <p className="review-item__text">{review.text}</p>
                      <span className="review-item__date">{new Date(review.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="orders-empty">Профиль не найден.</p>
        )}
      </main>

      {/* Мозаика */}
      {worksMosaicOpen && works.length > 0 && (
        <div className="works-mosaic-overlay" onClick={() => setWorksMosaicOpen(false)}>
          <div className="works-mosaic" onClick={(e) => e.stopPropagation()}>
            <div className="works-mosaic__header">
              <span>Все фото ({works.length})</span>
              <button className="lightbox-close" onClick={() => setWorksMosaicOpen(false)} aria-label="Закрыть">✕</button>
            </div>
            <div className="works-mosaic__grid">
              {works.map((work, index) => (
                <div key={index} className="works-mosaic__item"
                  onClick={() => { setWorksMosaicOpen(false); setWorksSlideIndex(index); setLightbox({ src: work.data, alt: work.name || 'Работа', index, works }); }}>
                  <img src={work.data} alt={work.name || 'Работа'} />
                  <div className="works-mosaic__zoom">⤢</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)} role="dialog" aria-modal="true" aria-label="Просмотр фото">
          <button className="lightbox-close" onClick={() => setLightbox(null)} aria-label="Закрыть">✕</button>
          {lightbox.works?.length > 1 && (
            <button className="works-slider__arrow works-slider__arrow--prev works-slider__arrow--lightbox"
              onClick={(e) => { e.stopPropagation(); const next = (lightbox.index - 1 + lightbox.works.length) % lightbox.works.length; setWorksSlideIndex(next); setLightbox({ ...lightbox, src: lightbox.works[next].data, alt: lightbox.works[next].name || 'Работа', index: next }); }}
              aria-label="Предыдущее">‹</button>
          )}
          <img className="lightbox-img" src={lightbox.src} alt={lightbox.alt} onClick={(e) => e.stopPropagation()} />
          {lightbox.works?.length > 1 && (
            <button className="works-slider__arrow works-slider__arrow--next works-slider__arrow--lightbox"
              onClick={(e) => { e.stopPropagation(); const next = (lightbox.index + 1) % lightbox.works.length; setWorksSlideIndex(next); setLightbox({ ...lightbox, src: lightbox.works[next].data, alt: lightbox.works[next].name || 'Работа', index: next }); }}
              aria-label="Следующее">›</button>
          )}
          {lightbox.works && <span className="lightbox-counter">{lightbox.index + 1} / {lightbox.works.length}</span>}
        </div>
      )}

      {/* Модалка заказа */}
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
                <select value={orderForm.service} onChange={(e) => setOrderForm((p) => ({ ...p, service: e.target.value }))}>
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
                <textarea rows="4" placeholder="Опишите что нужно сделать..." value={orderForm.details}
                  onChange={(e) => setOrderForm((p) => ({ ...p, details: e.target.value }))} />
                {orderErrors.details && <p className="order-form__error">{orderErrors.details}</p>}
              </label>
              <div className="order-form__field">
                <span>Прикрепить файл или изображение</span>
                <div className="order-file">
                  <input id="uprofile-order-file" type="file" className="order-file__input"
                    accept="image/*,.pdf,.doc,.docx,.stl,.obj,.3ds"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) { setOrderFileName(''); setOrderFileData(''); return; }
                      if (file.size > 5 * 1024 * 1024) { alert('Файл слишком большой. Максимум 5 МБ'); e.target.value = ''; return; }
                      setOrderFileName(file.name);
                      const reader = new FileReader();
                      reader.onload = () => setOrderFileData(typeof reader.result === 'string' ? reader.result : '');
                      reader.readAsDataURL(file);
                    }} />
                  <label htmlFor="uprofile-order-file" className="order-file__button">Выберите файл</label>
                  <p className="order-file__name">{orderFileName || 'Файл не выбран (необязательно)'}</p>
                </div>
                {orderFileData && orderFileName && /\.(jpg|jpeg|png|gif|webp)$/i.test(orderFileName) && (
                  <div className="order-file__preview">
                    <img src={orderFileData} alt="Превью" />
                    <button type="button" className="order-file__remove"
                      onClick={() => { setOrderFileName(''); setOrderFileData(''); const inp = document.getElementById('uprofile-order-file'); if (inp) inp.value = ''; }}>
                      ✕ Удалить
                    </button>
                  </div>
                )}
              </div>
              <div className="order-form__row">
                <label className="order-form__field">
                  <span>Бюджет (тг)</span>
                  <input type="number" min="0" placeholder="50000" value={orderForm.budget}
                    onChange={(e) => setOrderForm((p) => ({ ...p, budget: e.target.value }))} />
                  {orderErrors.budget && <p className="order-form__error">{orderErrors.budget}</p>}
                </label>
                <label className="order-form__field">
                  <span>Срок выполнения</span>
                  <input type="date" value={orderForm.deadline}
                    onChange={(e) => setOrderForm((p) => ({ ...p, deadline: e.target.value }))} />
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
