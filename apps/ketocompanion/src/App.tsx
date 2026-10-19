import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { useRoute } from './lib/router';
import { AppStateProvider } from './state/AppState';
import { TodayScreen } from './screens/Today';
import { LogMealScreen } from './screens/LogMeal';
import { LogKetoneScreen } from './screens/LogKetone';
import { KetonesScreen } from './screens/Ketones';
import { RecipesScreen } from './screens/Recipes';
import { RecipeDetailScreen } from './screens/RecipeDetail';
import { ProgressScreen } from './screens/Progress';
import { SummaryScreen } from './screens/Summary';
import { SettingsScreen } from './screens/Settings';

function Screen() {
  const route = useRoute();
  let content;
  switch (route.name) {
    case 'log-meal':
      content = <LogMealScreen />;
      break;
    case 'log-ketone':
      content = <LogKetoneScreen />;
      break;
    case 'ketones':
      content = <KetonesScreen />;
      break;
    case 'recipes':
      content = <RecipesScreen />;
      break;
    case 'recipe':
      content = <RecipeDetailScreen id={route.id} />;
      break;
    case 'progress':
      content = <ProgressScreen />;
      break;
    case 'summary':
      content = <SummaryScreen />;
      break;
    case 'settings':
      content = <SettingsScreen />;
      break;
    default:
      content = <TodayScreen />;
  }
  return <Layout route={route}>{content}</Layout>;
}

export default function App() {
  return (
    <AppStateProvider>
      <ToastProvider>
        <Screen />
      </ToastProvider>
    </AppStateProvider>
  );
}
