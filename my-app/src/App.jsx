import { useEffect, useState } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import BecomeExecutor from './pages/BecomeExecutor';
import Help from './pages/Help';
import UserProfile from './pages/UserProfile';
import FindExecutors from './pages/FindExecutors';
import './App.css';

const getPath = () => window.location.pathname || '/';

function App() {
  const [path, setPath] = useState(getPath());

  useEffect(() => {
    const onPopState = () => setPath(getPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const onNavigate = () => setPath(getPath());
    window.addEventListener('app:navigate', onNavigate);
    return () => window.removeEventListener('app:navigate', onNavigate);
  }, []);

  if (path === '/login') {
    return <Login />;
  }

  if (path === '/register') {
    return <Register />;
  }

  if (path === '/profile') {
    return <Profile />;
  }

  if (path === '/orders') {
    return <Orders />;
  }

  if (path === '/become-executor') {
    return <BecomeExecutor />;
  }

  if (path === '/help') {
    return <Help />;
  }

  if (path === '/user-profile') {
    return <UserProfile />;
  }

  if (path === '/find-executors') {
    return <FindExecutors />;
  }

  if (path === '/executor-cabinet') {
    window.history.replaceState({}, '', '/profile?tab=executor');
    window.dispatchEvent(new Event('app:navigate'));
    return <Profile />;
  }

  return (
    <div className="App">
      <Home />
    </div>
  );
}

export default App;


