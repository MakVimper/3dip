import Header from '../components/Header';
import './Help.css';

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
        answer: 'Удалять можно только заказы со статусом «Ожидает». Если статус изменился — удаление недоступно.',
      },
      {
        question: 'Как отменить заказ?',
        answer: 'Свяжитесь с исполнителем/заказчиком в чате и согласуйте отмену. При необходимости обратитесь в поддержку.',
      },
    ],
  },
  {
    title: 'Чаты и файлы',
    items: [
      {
        question: 'Почему я не вижу чат?',
        answer: 'Чат доступен после отклика на заказ или принятия исполнителя. Обновите страницу и проверьте вкладку «Чаты».',
      },
      {
        question: 'Как отправить файл в чате?',
        answer: 'В чате нажмите «Прикрепить» и выберите файл (до 1 МБ). После этого отправьте сообщение.',
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
        answer: 'Нажмите «Стать исполнителем» в шапке, заполните анкету и подтвердите номер телефона.',
      },
    ],
  },
];

const Help = () => {
  return (
    <main className="help-page">
      <Header />
      <section className="help-hero">
        <div>
          <h1>Помощь и FAQ</h1>
          <p>Ответы на самые частые вопросы по заказам, чатам и файлам.</p>
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
          <form className="help-support-form" onSubmit={(event) => event.preventDefault()}>
            <label className="help-support-field">
              <span>Тема обращения</span>
              <input type="text" placeholder="Например: проблема с отправкой файла" />
            </label>
            <label className="help-support-field">
              <span>Номер заказа (необязательно)</span>
              <input type="text" placeholder="Например: #1245" />
            </label>
            <label className="help-support-field">
              <span>Сообщение</span>
              <textarea rows="5" placeholder="Опишите, что произошло и что вы пытались сделать." />
            </label>
            <button type="submit" className="help-support-btn">Отправить</button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default Help;
