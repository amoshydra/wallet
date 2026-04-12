import { Route, Router, Switch } from 'wouter';
import { navigate, useHashLocation } from 'wouter/use-hash-location';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider, useMaskedNavigation } from './contexts/NavigationContext';
import AboutPage from './pages/AboutPage';
import AddCardPage from './pages/AddCardPage';
import CardDetailPage from './pages/CardDetailPage';
import CodePage from './pages/CodePage';
import HomePage from './pages/HomePage';
import SecurityPage from './pages/SecurityPage';
import SetupPage from './pages/SetupPage';
import UnlockPage from './pages/UnlockPage';

function AppContent() {
  const { isFirstTime, isLoading, isUnlocked, isHidden } = useAuth();
  const { showMask } = useMaskedNavigation();

  if (isLoading) {
    return (
      <div className="page">
        <p>Loading...</p>
      </div>
    );
  }

  const shouldMask = showMask || isHidden;

  return (
    <div className={`app-container ${shouldMask ? 'mask-sensitive' : ''}`}>
      <Switch>
        {/* Setup route - available when first time OR unlocked (for passkey setup flow) */}
        {(isFirstTime || isUnlocked) && (
          <Route
            path="/setup"
            component={SetupPage}
          />
        )}

        {/* Unlock route - only when not first time and locked */}
        {!isFirstTime && !isUnlocked && (
          <Route
            path="/unlock"
            component={UnlockPage}
          />
        )}

        {/* First time - redirect unlock to setup */}
        {isFirstTime && (
          <Route
            path="/unlock"
            component={SetupPage}
          />
        )}

        {/* First time - default to setup */}
        {isFirstTime && (
          <Route path="/">
            <SetupPage />
          </Route>
        )}

        {/* Unlocked routes */}
        {isUnlocked && (
          <Route
            path="/"
            component={HomePage}
          />
        )}
        {isUnlocked && (
          <Route
            path="/add"
            component={AddCardPage}
          />
        )}
        {isUnlocked && <Route path="/edit/:id">{() => <AddCardPage />}</Route>}
        {isUnlocked && (
          <Route
            path="/card/:id"
            component={CardDetailPage}
          />
        )}
        {isUnlocked && (
          <Route
            path="/card/:id/code"
            component={CodePage}
          />
        )}
        {isUnlocked && (
          <Route
            path="/security"
            component={SecurityPage}
          />
        )}
        {isUnlocked && (
          <Route
            path="/security/success"
            component={SecurityPage}
          />
        )}

        {/* About - public route available to all */}
        <Route
          path="/about"
          component={AboutPage}
        />

        <Route>
          {/* When locked and not first time, redirect any unknown route to unlock */}
          {!isFirstTime && !isUnlocked ? (
            <UnlockPage />
          ) : (
            <div className="page">
              <p>Page not found</p>
            </div>
          )}
        </Route>
      </Switch>

      <div className="footer-link-container">
        <button
          onClick={() => navigate('/about')}
          className="footer-link"
        >
          About
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <AuthProvider>
        <NavigationProvider>
          <AppContent />
        </NavigationProvider>
      </AuthProvider>
    </Router>
  );
}
