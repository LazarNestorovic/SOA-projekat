import React, { useCallback, useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import ToastStack from '../components/layout/ToastStack';
import SectionNav from '../components/navigation/SectionNav';
import ProfilePanel from '../components/profile/ProfilePanel';
import BlogEditorPanel from '../components/blog/BlogEditorPanel';
import BlogFeedPanel from '../components/blog/BlogFeedPanel';
import TourEditorPanel from '../components/tour/TourEditorPanel';
import TourBrowsePanel from '../components/tour/TourBrowsePanel';
import ShoppingCartPanel from '../components/tour/ShoppingCartPanel';
import PurchasedToursPanel from '../components/tour/PurchasedToursPanel';
import AdminPanel from '../components/admin/AdminPanel';
import { getMe } from '../services/authService';
import { getCart } from '../services/tourService';

function HomePage({ token, user, setUser, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const sectionFromPathname = (pathname) => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] !== 'home') return 'profile';
    const section = parts[1] || 'profile';
    const valid = ['profile', 'blog-editor', 'blog-feed', 'tour-editor', 'tour-browse', 'tour-cart', 'tour-purchased', 'admin'];
    return valid.includes(section) ? section : 'profile';
  };

  const [toasts, setToasts] = useState([]);
  const [activeSection, setActiveSection] = useState(() => sectionFromPathname(location.pathname));
  const [cartCount, setCartCount] = useState(0);
  const toastTimeoutIds = React.useRef([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showNotice = useCallback((text, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);

    const timeoutId = window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      toastTimeoutIds.current = toastTimeoutIds.current.filter((item) => item !== timeoutId);
    }, 4200);

    toastTimeoutIds.current.push(timeoutId);
  }, []);

  const showError = useCallback((error) => {
    const apiError = error?.response?.data?.error;
    showNotice(apiError || 'An error occurred.', 'error');
  }, [showNotice]);

  useEffect(() => {
    return () => {
      toastTimeoutIds.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const refreshCartCount = useCallback(async () => {
    if (!token) return;
    try {
      const cart = await getCart(token);
      setCartCount(cart?.items?.length || 0);
    } catch {
      // korpa se tiho ignorise ako nije dostupna
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const refreshSession = async () => {
      try {
        const me = await getMe(token);
        setUser(me);
        localStorage.setItem('soa_user', JSON.stringify(me));
      } catch {
        onLogout(false);
        navigate('/login');
      }
    };

    refreshSession();
    refreshCartCount();
  }, [token, setUser, onLogout, navigate, refreshCartCount]);

  useEffect(() => {
    setActiveSection(sectionFromPathname(location.pathname));
  }, [location.pathname]);

  const handleNavigation = (section) => {
    setActiveSection(section);
    const routeMap = {
      profile: '/home/profile',
      'blog-editor': '/home/blog-editor',
      'blog-feed': '/home/blog-feed',
      'tour-editor': '/home/tour-editor',
      'tour-browse': '/home/tour-browse',
      'tour-cart': '/home/tour-cart',
      'tour-purchased': '/home/tour-purchased',
      admin: '/home/admin',
    };
    navigate(routeMap[section] || '/home');
  };

  const handleHeaderLogout = () => {
    onLogout(true);
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="page">
      <AppHeader user={user} onLogout={handleHeaderLogout} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <SectionNav activeSection={activeSection} onChange={handleNavigation} cartCount={cartCount} />

      <Routes>
        <Route
          path="profile"
          element={<ProfilePanel token={token} user={user} active onNotice={showNotice} onError={showError} />}
        />
        <Route
          path="blog-editor"
          element={<BlogEditorPanel token={token} onNotice={showNotice} onError={showError} />}
        />
        <Route
          path="blog-feed"
          element={<BlogFeedPanel token={token} user={user} active onNotice={showNotice} onError={showError} />}
        />
        <Route
          path="tour-editor"
          element={<TourEditorPanel token={token} user={user} onNotice={showNotice} onError={showError} />}
        />
        <Route
          path="tour-browse"
          element={
            <TourBrowsePanel
              token={token}
              onCartUpdate={refreshCartCount}
              onNotice={showNotice}
              onError={showError}
              active={activeSection === 'tour-browse'}
            />
          }
        />
        <Route
          path="tour-cart"
          element={
            <ShoppingCartPanel
              token={token}
              onNotice={showNotice}
              onError={showError}
              active={activeSection === 'tour-cart'}
              onPurchased={refreshCartCount}
            />
          }
        />
        <Route
          path="tour-purchased"
          element={
            <PurchasedToursPanel
              token={token}
              onError={showError}
              active={activeSection === 'tour-purchased'}
            />
          }
        />
        <Route
          path="admin"
          element={<AdminPanel token={token} active isAdmin={isAdmin} onNotice={showNotice} onError={showError} />}
        />
        <Route
          path="/"
          element={<ProfilePanel token={token} user={user} active onNotice={showNotice} onError={showError} />}
        />
      </Routes>
    </div>
  );
}

export default HomePage;
