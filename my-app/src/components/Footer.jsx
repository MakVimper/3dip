import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">

      {}
      <div className="footer__logo">
        <span className="footer__logo-yellow">3D</span>
        <span className="footer__logo-black">ip</span>
      </div>

      <hr className="footer__divider" />

      {}
      <nav className="footer__nav">
        <a href="#">О нас</a>
        <a href="#">Услуги</a>
        <a href="#">Контакты</a>
        <a href="#">Политика конфиденциальности</a>
        <a href="#">Правила сайта</a>
      </nav>

      <hr className="footer__divider" />

      <p className="footer__copy">3Dip 2026 </p>

    </footer>
  );
};

export default Footer;