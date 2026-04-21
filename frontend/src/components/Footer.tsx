import { Link } from 'react-router-dom';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Home,
  ArrowUp
} from 'lucide-react';

const QUICK_LINKS = [
  { label: 'About Us', href: '/about' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Find a Room', href: '/search' },
  { label: 'List Your Property', href: '/landlord/properties/new' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '/blog' },
];

const SUPPORT_LINKS = [
  { label: 'Help Center', href: '/help' },
  { label: 'FAQs', href: '/faqs' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Safety Guidelines', href: '/safety' },
];

const SOCIAL_LINKS = [
  { icon: Facebook, href: 'https://facebook.com/irenttz', label: 'Facebook' },
  { icon: Twitter, href: 'https://twitter.com/irenttz', label: 'Twitter' },
  { icon: Instagram, href: 'https://instagram.com/irenttz', label: 'Instagram' },
  { icon: Linkedin, href: 'https://linkedin.com/company/irenttz', label: 'LinkedIn' },
  { icon: Youtube, href: 'https://youtube.com/irenttz', label: 'YouTube' },
];

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer">
      {/* Main Footer Content */}
      <div className="footer__main">
        <div className="footer__main-inner">
          {/* Brand Column */}
          <div className="footer__brand">
            <Link to="/" className="footer__logo">
              <Home size={28} style={{ color: '#166534' }} />
              <span>
                i<span style={{ color: '#166534' }}>Rent</span>
              </span>
            </Link>
            <p className="footer__tagline">
              Your trusted partner in finding the perfect home across Tanzania.
            </p>
            
            <div className="footer__contact">
              <div className="footer__contact-item">
                <Mail size={16} />
                <span>support@irent.co.tz</span>
              </div>
              <div className="footer__contact-item">
                <Phone size={16} />
                <span>+255 712 345 678</span>
              </div>
              <div className="footer__contact-item">
                <MapPin size={16} />
                <span>Dar es Salaam, Tanzania</span>
              </div>
            </div>

            <div className="footer__social">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer__social-link"
                    aria-label={social.label}
                  >
                    <Icon size={20} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer__column">
            <h4 className="footer__column-title">Quick Links</h4>
            <ul className="footer__links">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="footer__link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="footer__column">
            <h4 className="footer__column-title">Support</h4>
            <ul className="footer__links">
              {SUPPORT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="footer__link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer__bottom">
        <div className="footer__bottom-inner">
          <p className="footer__copyright">
            © {new Date().getFullYear()} iRent Tanzania. All rights reserved.
          </p>
          <div className="footer__bottom-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/cookies">Cookies</Link>
            <button
              onClick={scrollToTop}
              className="footer__back-to-top"
              aria-label="Back to top"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
