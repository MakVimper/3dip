import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Orders.css';
import { showToast } from '../components/Toast';

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

const statusClassMap = {
  'Ожидает': 'pending',
  'Выполняется': 'progress',
  'Готов': 'done',
};

const Orders = () => {
  const user = useMemo(() => {
    const raw = localStorage.getItem('auth_user');

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const [selectedFileName, setSelectedFileName] = useState('Файл не выбран (необязательно)');
  const [selectedFileData, setSelectedFileData] = useState('');
  const [orderForm, setOrderForm] = useState({
    service: '',
    details: '',
    budget: '',
    deadline: '',
  });
  const [orderErrors, setOrderErrors] = useState({});
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadOrders = async () => {
    if (!user?.id) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`/api/orders?userId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Ошибка загрузки заказов (HTTP ${response.status})`);
      }

      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (error) {
      setMessage(error.message || 'Ошибка загрузки заказов');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [user]);

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
    if (Object.keys(errors).length > 0) return;
    if (!user?.id) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Ошибка создания заказа (HTTP ${response.status})`);
      }

      setOrderForm({ service: '', details: '', budget: '', deadline: '' });
      setSelectedFileName('Файл не выбран (необязательно)');
      setSelectedFileData('');
      setIsCreateOpen(false);
      await loadOrders();
    } catch (error) {
      setMessage(error.message || 'Ошибка создания заказа');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setOrderForm((prev) => ({ ...prev, [field]: value }));
    setOrderErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="orders-page">
      <Header />

      <main className="orders-main">
        {!user ? (
          <section className="orders-card orders-card--empty">
            <h1>Мои заказы</h1>
            <p>Вы не защли в акаунт</p>
            <button type="button" className="orders-login-btn" onClick={() => goTo('/login')}>
              Вход
            </button>
          </section>
        ) : (
          <section className="orders-card">
            <div className="orders-header">
              <div>
                <h1>Мои заказы</h1>
                <p>История ваших заказов и их текущий статус.</p>
              </div>
              <button
                type="button"
                className="orders-create-btn"
                onClick={() => setIsCreateOpen((prev) => !prev)}
              >
                {isCreateOpen ? 'Скрыть форму' : 'Создать заказ'}
              </button>
            </div>

            {message && <p className="orders-message">{message}</p>}

            {isCreateOpen && (
              <div className="orders-create">
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
                        id="order-file-orders"
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
                      <label htmlFor="order-file-orders" className="order-file__button">
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
                        list="budget-options-orders"
                        placeholder="Например: 50000"
                        value={orderForm.budget}
                        onChange={(event) => handleFieldChange('budget', event.target.value)}
                        required
                      />
                      {orderErrors.budget && <p className="order-form__error">{orderErrors.budget}</p>}
                      <datalist id="budget-options-orders">
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

                  <button type="submit" className="order-form__submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Отправка...' : 'Опубликовать заказ'}
                  </button>
                </form>
              </div>
            )}

            <div className="orders-list">
              {isLoading ? (
                <p className="orders-empty">Загрузка заказов...</p>
              ) : orders.length === 0 ? (
                <p className="orders-empty">Пока нет заказов. Создайте первый заказ.</p>
              ) : (
                orders.map((order) => (
                  <article key={order.id} className="orders-item">
                    <div className="orders-item__head">
                      <div>
                        <h3>{order.service} <span style={{fontSize:'13px',fontWeight:500,color:'#64748b'}}>#{order.id}</span></h3>
                        <p>Срок: {new Date(order.deadline).toLocaleDateString('ru-RU')}</p>
                      </div>
                      <span
                        className={`orders-status orders-status--${statusClassMap[order.status] || 'pending'}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="orders-item__details">{order.details}</p>
                    <div className="orders-item__footer">
                      <span>Бюджет: {Number(order.budget).toLocaleString()} тг</span>
                      {order.file_name && <span>Файл: {order.file_name}</span>}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}
      </main>

    </div>
  );
};

export default Orders;
