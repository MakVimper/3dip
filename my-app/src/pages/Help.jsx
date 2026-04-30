import { useMemo, useState } from 'react';
import Header from '../components/Header';
import './Help.css';
import { showToast } from '../components/Toast';

const faqGroups = [
  {
    title: 'Заказы',
    items: [
      {
        question: 'Как создать заказ?',
        answer: 'Перейдите в раздел «Мои заказы» и нажмите «Создать заказ». Заполните данные и подтвердите.',
      },
      {
        question: 'Как откликнуться на заказ?',
        answer: 'В разделе «Найти заказ» откройте интересующий заказ и нажмите «Откликнуться».',
      },
      {
        question: 'Как узнать статус заказа?',
        answer: 'Статус отображается в карточке заказа и обновляется автоматически по мере выполнения.',
      },
      {
        question: 'Как завершить заказ?',
        answer: 'Когда работа выполнена, в карточке заказа нажмите «Подтвердить работу».',
      },
      {
        question: 'Как посмотреть отклики на заказ?',
        answer: 'В «Моих заказах» нажмите «Посмотреть отклики» в карточке нужного заказа.',
      },
      {
        question: 'Можно ли редактировать заказ после публикации?',
        answer: 'Пока редактирование недоступно. Если нужно изменить детали, напишите исполнителю в чате.',
      },
      {
        question: 'Почему заказ нельзя удалить?',
        answer: 'Удалять можно только заказы со статусом «Ожидает». Если статус изменился, удаление недоступно.',
      },
      {
        question: 'Как отменить заказ?',
        answer: 'Свяжитесь с исполнителем или заказчиком в чате и согласуйте отмену. При необходимости обратитесь в поддержку.',
      },
    ],
  },
  {
    title: 'Чаты и файлы',
    items: [
      {
        question: 'Почему я не вижу чат?',
        answer: 'Чат доступен после отклика на заказ или после выбора исполнителя заказчиком.',
      },
      {
        question: 'Как отправить файл?',
        answer: 'В чате нажмите «Прикрепить», выберите файл и отправьте сообщение.',
      },
      {
        question: 'Как прикрепить несколько файлов?',
        answer: 'Сейчас можно отправлять файлы по одному. При необходимости отправьте несколько сообщений подряд.',
      },
      {
        question: 'Почему не отправляется сообщение?',
        answer: 'Проверьте подключение к интернету и размер файла. Попробуйте обновить страницу и отправить снова.',
      },
    ],
  },
  {
    title: 'Исполнители',
    items: [
      {
        question: 'Как стать исполнителем?',
        answer: 'Нажмите «Стать исполнителем» в хедере, заполните анкету и подтвердите данные.',
      },
      {
        question: 'Как оформить рабочий кабинет?',
        answer: 'Во вкладке «Рабочий кабинет» заполните описание, услуги, цены и добавьте примеры работ.',
      },
      {
        question: 'Как заказчик выбирает исполнителя?',
        answer: 'Заказчик просматривает отклики и принимает одного исполнителя, после чего продолжает общение в чате.',
      },
      {
        question: 'Как повысить шанс на выбор?',
        answer: 'Заполните профиль подробно, добавьте реальные работы и отвечайте на сообщения быстро и по делу.',
      },
      {
        question: 'Что делать, если не получается откликнуться?',
        answer: 'Проверьте, что вы авторизованы, и обновите страницу. Если проблема сохраняется, напишите в поддержку.',
      },
      {
        question: 'Где посмотреть отзывы?',
        answer: 'Отзывы отображаются в вашем профиле и помогают заказчикам оценить ваш опыт.',
      },
    ],
  },
];

const Help = () => {
  const user = useMemo(() => {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const [form, setForm] = useState({ subject: '', orderNumber: '', message: '' });
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState('');
  const [isSending, setIsSending] = useState(false);

  const sendSupport = async (event) => {
    event.preventDefault();
    if (!user?.id) {
      showToast('Войдите в аккаунт, чтобы отправить обращение', 'error');
      return;
    }

    try {
      if (!form.message.trim() && !fileData) {
        throw new Error('Введите сообщение или прикрепите файл');
      }
      if (!form.subject.trim()) {
        throw new Error('Укажите тему обращения');
      }

      setIsSending(true);
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          subject: form.subject,
          content: form.orderNumber
            ? `${form.message}\n\nНомер заказа: ${form.orderNumber}`
            : form.message,
          fileName,
          fileData,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Ошибка отправки обращения');

      showToast('Обращение отправлено в поддержку', 'success');
      setForm({ subject: '', orderNumber: '', message: '' });
      setFileName('');
      setFileData('');
    } catch (error) {
      showToast(error.message || 'Ошибка отправки обращения', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="help-page">
      <Header />
      <section className="help-hero">
        <div>
          <h1>Помощь и FAQ</h1>
          <p>Ответы на частые вопросы по заказам, чатам и файлам.</p>
        </div>
      </section>

      <section className="help-content">
        <div className="help-card">
          <h2>Частые вопросы</h2>
          <div className="help-faq">
            {faqGroups.map((group) => (
              <div key={group.title} className="help-faq__group">
                <h3>{group.title}</h3>
                {group.items.map((item) => (
                  <details key={item.question} className="help-faq__item">
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="help-card help-card--support">
          <h2>Обратиться в поддержку</h2>
          <p className="help-support-text">
            Опишите проблему, укажите номер заказа (если есть) и приложите файлы при необходимости.
          </p>
          <form className="help-support-form" onSubmit={sendSupport}>
            <label className="help-support-field">
              <span>Тема обращения</span>
              <input
                type="text"
                placeholder="Например: проблема с отправкой файла"
                value={form.subject}
                onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
              />
            </label>
            <label className="help-support-field">
              <span>Номер заказа (необязательно)</span>
              <input
                type="text"
                placeholder="Например: #1245"
                value={form.orderNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, orderNumber: event.target.value }))}
              />
            </label>
            <label className="help-support-field">
              <span>Сообщение</span>
              <textarea
                rows="5"
                placeholder="Опишите, что произошло и что вы пытались сделать."
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              />
            </label>
            <label className="help-support-field">
              <span>Файл (необязательно)</span>
              <div className="help-file-picker">
                <input
                  id="help-support-file"
                  type="file"
                  className="help-file-picker__input"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      setFileName('');
                      setFileData('');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = typeof reader.result === 'string' ? reader.result : '';
                      setFileName(file.name);
                      setFileData(result);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <label htmlFor="help-support-file" className="help-file-picker__button">Прикрепить файл</label>
              </div>
            </label>
            {fileName && <p className="help-support-note">Файл: {fileName}</p>}
            <button type="submit" className="help-support-btn" disabled={isSending}>
              {isSending ? 'Отправка...' : 'Отправить'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default Help;


