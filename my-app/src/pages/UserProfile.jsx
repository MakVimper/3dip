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

  const currentUser = useMemo(() => {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

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
            services: Array.isArray(data.cabinet.services) ? data.cabinet.services : [],
            companyAvatar: data.cabinet.companyAvatar || '',
            works: Array.isArray(data.cabinet.works) ? data.cabinet.works : [],
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
          <div className="orders-header">
            <div>
              <h2>Профиль пользователя</h2>
              <p>Информация о выбранном пользователе.</p>
            </div>
            <button
              type="button"
              className="orders-view-btn"
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
          </div>

          {error && <p className="orders-message">{error}</p>}

          {isLoading ? (
            <p className="orders-empty">Загрузка профиля...</p>
          ) : user ? (
            <div className="profile-table">
              <div className="profile-row">
                <span className="profile-row__label">Имя:</span>
                <span className="profile-row__field">{user.name || '-'}</span>
              </div>
              <div className="profile-row">
                <span className="profile-row__label">Email:</span>
                <span className="profile-row__field">{user.email || '-'}</span>
              </div>
              <div className="profile-row">
                <span className="profile-row__label">Роль:</span>
                <span className="profile-row__field">{getRoleLabel(profileData)}</span>
              </div>
              {executor && (
                <>
                  <div className="profile-row">
                    <span className="profile-row__label">Тип:</span>
                    <span className="profile-row__field">
                      {executor.executor_type === 'organization' ? 'Организация' : 'Частный исполнитель'}
                    </span>
                  </div>
                  <div className="profile-row">
                    <span className="profile-row__label">Контакт:</span>
                    <span className="profile-row__field">
                      {executor.first_name} {executor.last_name}
                    </span>
                  </div>
                  {executor.phone && (
                    <div className="profile-row">
                      <span className="profile-row__label">Телефон:</span>
                      <span className="profile-row__field">{executor.phone}</span>
                    </div>
                  )}
                  {executor.executor_type === 'organization' && (
                    <>
                      <div className="profile-row">
                        <span className="profile-row__label">Организация:</span>
                        <span className="profile-row__field">{executor.organization_name || '-'}</span>
                      </div>
                      <div className="profile-row">
                        <span className="profile-row__label">Адрес:</span>
                        <span className="profile-row__field">{executor.organization_address || '-'}</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="orders-empty">Профиль не найден.</p>
          )}
        </section>

        {executor && (
          <section className="profile-card profile-card--info">
            <div className="orders-header">
              <div>
                <h2>Рабочий кабинет</h2>
                <p>Информация о видах работ и сервисах.</p>
              </div>
            </div>

            {!cabinet ? (
              <p className="orders-empty">Пока нет данных о кабинете.</p>
            ) : (
              <div className="cabinet-grid">
                <div className="cabinet-column">
                  <div className="cabinet-field">
                    <span>О себе</span>
                    <p className="orders-item__details">
                      {cabinet.about ? cabinet.about : 'Нет описания.'}
                    </p>
                  </div>

                  <div className="cabinet-field">
                    <span>Услуги каталога</span>
                    {cabinet.services.length === 0 ? (
                      <p className="orders-empty">Услуги не выбраны.</p>
                    ) : (
                      <div className="cabinet-tags">
                        {cabinet.services.map((service) => (
                          <span key={service} className="cabinet-tag">
                            {service}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="cabinet-column">
                  <div className="cabinet-field">
                    <span>Аватар компании</span>
                    <div className="cabinet-avatar">
                      {cabinet.companyAvatar ? (
                        <img src={cabinet.companyAvatar} alt="Компания" />
                      ) : (
                        <div className="cabinet-avatar__placeholder">Логотип не загружен</div>
                      )}
                    </div>
                  </div>

                  <div className="cabinet-field">
                    <span>Фото выполненных работ</span>
                    {cabinet.works.length === 0 ? (
                      <p className="orders-empty">Пока нет фото.</p>
                    ) : (
                      <div className="cabinet-works-grid">
                        {cabinet.works.map((work, index) => (
                          <div key={`${work.name || 'work'}-${index}`} className="cabinet-work">
                            <img src={work.data} alt={work.name || 'Работа'} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="profile-card profile-card--info">
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
                      {'\u2605'}
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
                    <span className="review-item__rating">Оценка: {review.rating}/5</span>
                  </div>
                  <p className="review-item__text">{review.text}</p>
                  <span className="review-item__date">
                    {new Date(review.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default UserProfile;
