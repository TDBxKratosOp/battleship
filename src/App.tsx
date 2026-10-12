import React, { useEffect, useState, Suspense, lazy } from 'react';
import { ensureAnonymousAuth } from './firebase/auth';
import { useGameStore } from './store/gameStore';
import { Header } from './components/Header';
import { ToastContainer } from './components/ToastContainer';
import { SettingsModal } from './components/SettingsModal';
import { Home } from './pages/Home';
import { soundManager } from './audio/AudioManager';

// Lazy loaded page components for optimal initial bundle performance
const Room = lazy(() => import('./pages/Room').then((m) => ({ default: m.Room })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

export function App() {
  const { uid, setUid, setRoomCode, roomCode } = useGameStore();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentPage, setCurrentPage] = useState<'home' | 'room' | '404'>('home');

  // Handle URL routing (?room=CODE or #/room/CODE or pathname /room/CODE)
  useEffect(() => {
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const queryRoom = urlParams.get('room');

      let targetCode: string | null = queryRoom;

      if (!targetCode && window.location.hash) {
        const hashMatch = window.location.hash.match(/room\/([A-Z0-9]{6})/i);
        if (hashMatch) {
          targetCode = hashMatch[1];
        }
      }

      if (!targetCode && window.location.pathname.startsWith('/room/')) {
        const pathCode = window.location.pathname.replace('/room/', '').trim();
        if (pathCode.length === 6) {
          targetCode = pathCode;
        }
      }

      if (targetCode && targetCode.length === 6) {
        const upper = targetCode.toUpperCase();
        setRoomCode(upper);
        setCurrentPage('room');
      } else if (window.location.pathname !== '/' && window.location.pathname !== '') {
        // Only set 404 if not root
        if (window.location.pathname.length > 1 && !targetCode) {
          setCurrentPage('404');
        } else {
          setCurrentPage('home');
        }
      } else {
        setCurrentPage('home');
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [setRoomCode]);

  // Bootstrap Anonymous Auth on app start
  useEffect(() => {
    ensureAnonymousAuth()
      .then(({ uid }) => {
        setUid(uid);
        setIsAuthReady(true);
      })
      .catch((err) => {
        console.warn('Anonymous auth initial note:', err);
        // Fallback to local session ID for instant gameplay
        setIsAuthReady(true);
      });
  }, [setUid]);

  const handleEnterRoom = (code: string) => {
    setRoomCode(code);
    setCurrentPage('room');
    const newUrl = `${window.location.pathname}?room=${code}`;
    window.history.pushState({ room: code }, '', newUrl);
  };

  const handleLeaveRoom = () => {
    setRoomCode(null);
    setCurrentPage('home');
    const newUrl = window.location.pathname;
    window.history.pushState({}, '', newUrl);
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-[#050b14] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200"
      onClick={() => soundManager.unlock()}
    >
      <Header onBackToHome={roomCode ? handleLeaveRoom : undefined} />

      <main className="flex-1 flex flex-col">
        {!isAuthReady ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <div className="mt-4 font-tactical text-xs text-cyan-300 tracking-wider">
              ESTABLISHING SECURE PROTOCOL...
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <div className="mt-3 font-tactical text-xs text-cyan-400 tracking-wider">
                  LOADING SECTOR DATA...
                </div>
              </div>
            }
          >
            {currentPage === 'room' && roomCode ? (
              <Room roomCode={roomCode} onLeaveRoom={handleLeaveRoom} />
            ) : currentPage === '404' ? (
              <NotFound onGoHome={handleLeaveRoom} />
            ) : (
              <Home onEnterRoom={handleEnterRoom} />
            )}
          </Suspense>
        )}
      </main>

      <ToastContainer />
      <SettingsModal />
    </div>
  );
}

export default App;
