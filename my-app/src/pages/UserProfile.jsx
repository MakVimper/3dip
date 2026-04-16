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
                <h2>{executor ? '\u041e \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u0435' : '\u041e \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435'}</h2>
                <p>{executor ? '\u0418\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f \u0438 \u0443\u0441\u043b\u0443\u0433\u0438 \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044f.' : '\u0418\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f \u043e \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435.'}</p>
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
                {'\u041d\u0430\u0437\u0430\u0434'}
              </button>
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
                      <div className="cabinet-grid">
                        <div className="cabinet-column">
                          <div className="cabinet-field">
                            <span>{'\u041e \u0441\u0435\u0431\u0435'}</span>
                            <p className="orders-item__details">
                              {cabinet.about ? cabinet.about : '\u041d\u0435\u0442 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u044f.'}
                            </p>
                          </div>

                          <div className="cabinet-field">
                            <span>{'\u0423\u0441\u043b\u0443\u0433\u0438 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430'}</span>
                            {cabinet.services.length === 0 ? (
                              <p className="orders-empty">{'\u0423\u0441\u043b\u0443\u0433\u0438 \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d\u044b.'}</p>
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
                            <span>{'\u0410\u0432\u0430\u0442\u0430\u0440 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438'}</span>
                            <div className="cabinet-avatar">
                              {cabinet.companyAvatar ? (
                                <img src={cabinet.companyAvatar} alt={'\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f'} />
                              ) : (
                                <div className="cabinet-avatar__placeholder">{'\u041b\u043e\u0433\u043e\u0442\u0438\u043f \u043d\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d'}</div>
                              )}
                            </div>
                          </div>

                          <div className="cabinet-field">
                            <span>{'\u0424\u043e\u0442\u043e \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043d\u044b\u0445 \u0440\u0430\u0431\u043e\u0442'}</span>
                            {cabinet.works.length === 0 ? (
                              <p className="orders-empty">{'\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0444\u043e\u0442\u043e.'}</p>
                            ) : (
                              <div className="cabinet-works-grid">
                                {cabinet.works.map((work, index) => (
                                  <div key={`${work.name || 'work'}-${index}`} className="cabinet-work">
                                    <img src={work.data} alt={work.name || '\u0420\u0430\u0431\u043e\u0442\u0430'} />
                                  </div>
                                ))}
                              </div>
                            )}
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
                      {new Date(review.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default UserProfile;
