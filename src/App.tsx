import { Route, Switch } from 'wouter';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SetupPage from './pages/SetupPage';
import UnlockPage from './pages/UnlockPage';
import HomePage from './pages/HomePage';
import AddCardPage from './pages/AddCardPage';
import CardDetailPage from './pages/CardDetailPage';
import CodePage from './pages/CodePage';

function AppRoutes() {
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
      {isFirstTime && (
        <Route
          path="/setup"
          component={SetupPage}
        />
      )}
      {!isFirstTime && !isUnlocked && (
        <Route
          path="/unlock"
          component={UnlockPage}
        />
      )}
      {isFirstTime && (
        <Route
          path="/unlock"
          component={SetupPage}
        />
      )}
      {isFirstTime && (
        <Route path="/">
          <SetupPage />
        </Route>
      )}

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
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
