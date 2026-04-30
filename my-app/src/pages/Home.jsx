import { useMemo, useState } from 'react';
import Header from '../components/Header';
import heroImage from '../assets/images/Group 1.png';
import './Home.css';
import Footer from '../components/Footer';
import img1 from '../assets/images/image 1.png';
import img2 from '../assets/images/image 2.png';
import img3 from '../assets/images/image 3.png';
import img4 from '../assets/images/image 4.png';
import img5 from '../assets/images/image 5.png';
import img6 from '../assets/images/image 6.png';

const services = [
  { id: 1, title: 'Прототипирование изделий', note: 'Быстрый запуск идеи', img: img1 },
  { id: 2, title: '3D-моделирование с нуля', note: 'От эскиза до модели', img: img2 },
  { id: 3, title: 'Мелкосерийное производство', note: 'Партии для малого бизнеса', img: img3 },
  { id: 4, title: 'Функциональные детали', note: 'Детали для долговременной эксплуатации', img: img4 },
  { id: 5, title: 'Печать высокоточных моделей', note: 'Высокая точность и качество', img: img5 },
  { id: 6, title: 'Крупногабаритная печать', note: 'Для нестандартных размеров', img: img6 },
];

const allFaqs = [
  { question: 'Как создать заказ?', answer: 'Перейдите в раздел «Мои заказы» и нажмите «Создать заказ». Заполните данные и подтвердите.' },
  { question: 'Как откликнуться на заказ?', answer: 'В разделе «Найти заказ» откройте интересующий заказ и нажмите «Откликнуться».' },
  { question: 'Как узнать статус заказа?', answer: 'Статус отображается в карточке заказа и обновляется автоматически по мере выполнения.' },
  { question: 'Как завершить заказ?', answer: 'Когда работа выполнена, в карточке заказа нажмите «Подтвердить работу».' },
  { question: 'Как посмотреть отклики на заказ?', answer: 'В «Моих заказах» нажмите «Посмотреть отклики» в карточке нужного заказа.' },
  { question: 'Можно ли редактировать заказ после публикации?', answer: 'Пока редактирование недоступно. Если нужно изменить детали, напишите исполнителю в чате.' },
  { question: 'Почему заказ нельзя удалить?', answer: 'Удалять можно только заказы со статусом «Ожидает». Если статус изменился — удаление недоступно.' },
  { question: 'Как отменить заказ?', answer: 'Свяжитесь с исполнителем/заказчиком в чате и согласуйте отмену. При необходимости обратитесь в поддержку.' },
  { question: 'Почему я не вижу чат?', answer: 'Чат доступен после отклика на заказ или принятия исполнителя. Обновите страницу и проверьте вкладку «Чаты».' },
  { question: 'Как отправить файл в чате?', answer: 'В чате нажмите «Прикрепить» и выберите файл (до 1 МБ). После этого отправьте сообщение.' },
  { question: 'Как прикрепить несколько файлов?', answer: 'Сейчас можно отправлять файлы по одному. При необходимости отправьте несколько сообщений подряд.' },
  { question: 'Почему не отправляется сообщение?', answer: 'Проверьте подключение к интернету и размер файла. Попробуйте обновить страницу и отправить снова.' },
  { question: 'Как стать исполнителем?', answer: 'Нажмите «Стать исполнителем» в шапке, заполните анкету и подтвердите номер телефона.' },
];

const FaqItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`faq-item ${open ? 'faq-item--open' : ''}`}>
      <button className="faq-question" onClick={() => setOpen(!open)}>
        <span>{question}</span>
        <svg
          className="faq-chevron"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path d="M5 7.5L10 12.5L15 7.5" stroke="#555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="faq-answer">
        <p>{answer}</p>
      </div>
    </div>
  );
};

const Home = () => {
  const faqs = useMemo(() => {
    const shuffled = [...allFaqs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  }, []);

  return (
    <div className="home">
      <Header />

      <main className="home-hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">Печать нужных вам деталей!</h1>
              <button
                className="hero-button"
                onClick={() => {
                  window.history.pushState({}, '', '/find-executors');
                  window.dispatchEvent(new Event('app:navigate'));
                }}
              >
                Найти специалиста
              </button>
            </div>
          </div>
        </div>
      </main>

      <section className="services-section">
        <div className="services-head">
          <h2 className="services-title">Каталог услуг</h2>
          <p className="services-subtitle">Выберите направление, и мы подберем исполнителя под ваш проект.</p>
        </div>

        <div className="services-catalog">
          {services.map((s) => (
            <button
              key={s.id}
              className="service-card"
              onClick={() => {
                const params = new URLSearchParams({ service: s.title });
                window.history.pushState({}, '', `/find-executors?${params.toString()}`);
                window.dispatchEvent(new Event('app:navigate'));
              }}
            >
              <div className="service-card__top">
                <span className="service-card__note">{s.note}</span>
              </div>
              <span className="service-card__title">{s.title}</span>
              <div className="service-card__img-wrap">
                <img src={s.img} alt={s.title} className="service-card__img" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="faq-section">
        <div className="faq-header">
          <h2 className="faq-title">Популярные вопросы</h2>
          <a href="/help" className="faq-link" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/help'); window.dispatchEvent(new Event('app:navigate')); }}>Ответы на вопросы</a>
        </div>
        <div className="faq-list">
          {faqs.map((f) => (
            <FaqItem key={f.question} question={f.question} answer={f.answer} />
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Home;


