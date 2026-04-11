import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SetupPage from './pages/SetupPage';
import UnlockPage from './pages/UnlockPage';
import HomePage from './pages/HomePage';
import AddCardPage from './pages/AddCardPage';
import CardDetailPage from './pages/CardDetailPage';
import CodePage from './pages/CodePage';

function AppContent() {
  const { isFirstTime, isLoading, isUnlocked } = useAuth();

  if (isLoading) {
    return (
      <div className="page">
        <p>Loading...</p>
      </div>
    );
  }

  return (
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

      <Route>
        <div className="page">
          <p>Page not found</p>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
