import { useState } from 'react';
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

const faqs = [
  {
    id: 1,
    question: 'Какие материалы используются для 3D-печати?',
    answer:
      'Мы работаем с широким спектром материалов: PLA, ABS, PETG, TPU, нейлон и другими. Выбор материала зависит от требований к прочности, гибкости и условиям эксплуатации детали.',
  },
  {
    id: 2,
    question: 'Сколько времени занимает выполнение заказа?',
    answer:
      'Сроки зависят от сложности и объема заказа. Стандартные заказы выполняются за 1-3 рабочих дня. Срочная печать возможна в течение 24 часов.',
  },
  {
    id: 3,
    question: 'Как передать файл для печати?',
    answer:
      'Вы можете загрузить файл в формате STL, OBJ или STEP через форму на сайте или отправить его специалисту напрямую. Если файла нет, поможем с 3D-моделированием.',
  },
  {
    id: 4,
    question: 'Какой максимальный размер детали вы можете напечатать?',
    answer:
      'Мы печатаем детали размером до 500x500x500 мм на стандартном оборудовании. Для крупногабаритных изделий доступна печать по частям с последующей сборкой.',
  },
  {
    id: 5,
    question: 'Возможна ли постобработка изделий?',
    answer:
      'Да, мы предлагаем шлифовку, окраску, склейку и другие виды постобработки. Готовое изделие будет выглядеть аккуратно и профессионально.',
  },
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
          <a href="/faq" className="faq-link">Ответы на вопросы</a>
        </div>
        <div className="faq-list">
          {faqs.map((f) => (
            <FaqItem key={f.id} question={f.question} answer={f.answer} />
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Home;
