import { lazy, Suspense, useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import type { NavSection } from './types';
import { buildHash, isPracticeFilter, parseRoute } from './lib/routing';
import { initPreferredProfession } from './lib/preferredProfession';

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const MentorPage = lazy(() => import('./pages/MentorPage').then((module) => ({ default: module.MentorPage })));
const MistakeNotebookPage = lazy(() => import('./pages/MistakeNotebookPage').then((module) => ({ default: module.MistakeNotebookPage })));
const StudyPlannerPage = lazy(() => import('./pages/StudyPlannerPage').then((module) => ({ default: module.StudyPlannerPage })));
const ResourcesPage = lazy(() => import('./pages/ResourcesPage').then((module) => ({ default: module.ResourcesPage })));
const MockExamsPage = lazy(() => import('./pages/MockExamsPage').then((module) => ({ default: module.MockExamsPage })));
const PracticePage = lazy(() => import('./pages/PracticePage').then((module) => ({ default: module.PracticePage })));
const GuidePage = lazy(() => import('./pages/GuidePage').then((module) => ({ default: module.GuidePage })));
const TipsPage = lazy(() => import('./pages/TipsPage').then((module) => ({ default: module.TipsPage })));
const PearlsPitfallsPage = lazy(() => import('./pages/PearlsPitfallsPage').then((module) => ({ default: module.PearlsPitfallsPage })));
const BooksPage = lazy(() => import('./pages/BooksPage').then((module) => ({ default: module.BooksPage })));
const UsmlePage = lazy(() => import('./pages/UsmlePage').then((module) => ({ default: module.UsmlePage })));

const pageMeta: Record<NavSection, { title: string; subtitle?: string }> = {
  mentor: { title: 'Your OET Mentor', subtitle: 'Interactive lessons, guided answers, and patient conversations' },
  mistakes: {
    title: 'Mistake Notebook',
    subtitle: 'Learn from feedback and make corrections stick',
  },
  home: {
    title: 'Dashboard',
    subtitle: 'Medicine-focused OET preparation for physicians',
  },
  planner: {
    title: 'Grade A Study Plan',
    subtitle: 'Diagnostic-led Medicine preparation toward 450+',
  },
  resources: {
    title: 'Medicine Resources',
    subtitle: 'Curated, traceable, and rights-aware preparation material',
  },
  mock: {
    title: 'Mock Exams',
    subtitle: 'Full-length and mini mock tests under timed conditions',
  },
  practice: {
    title: 'Practice Modules',
    subtitle: 'Focused drills for each sub-test',
  },
  guide: {
    title: 'Study Guide',
    subtitle: 'Format, scoring, and profession-specific guidance',
  },
  tips: {
    title: 'Tips & Tricks',
    subtitle: 'Source-governed strategies aligned with official OET criteria',
  },
  pearls: {
    title: 'Pearls & Pitfalls',
    subtitle: 'What to do — and what to avoid',
  },
  experiences: {
    title: 'Medicine Resources',
    subtitle: 'Curated, traceable, and rights-aware preparation material',
  },
  books: {
    title: 'Book PDFs',
    subtitle: 'Study books and compilations',
  },
  'experience-pdfs': {
    title: 'Medicine Resources',
    subtitle: 'Curated, traceable, and rights-aware preparation material',
  },
  usmle: {
    title: 'USMLE Q-Bank',
    subtitle: 'Practice questions for Step 1, Step 2 CK, and Step 3',
  },
};

function App() {
  const [route, setRoute] = useState(parseRoute);
  const [preferredProfession] = useState(() => initPreferredProfession());
  const meta = pageMeta[route.section];

  useEffect(() => {
    const onRouteChange = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onRouteChange);
    window.addEventListener('popstate', onRouteChange);
    return () => {
      window.removeEventListener('hashchange', onRouteChange);
      window.removeEventListener('popstate', onRouteChange);
    };
  }, []);

  const navigate = (section: NavSection, itemId?: string) => {
    setRoute({ section, itemId });
    const hash = buildHash(section, itemId);
    if (hash) {
      window.history.pushState(null, '', hash);
    } else {
      window.history.pushState(null, '', window.location.pathname);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const practiceFilter = route.section === 'practice' && isPracticeFilter(route.itemId)
    ? route.itemId
    : undefined;

  const renderPage = () => {
    switch (route.section) {
      case 'mentor':
        return <MentorPage onNavigate={navigate} />;
      case 'mistakes':
        return <MistakeNotebookPage onNavigate={navigate} />;
      case 'home':
        return <HomePage onNavigate={navigate} preferredProfession={preferredProfession} />;
      case 'planner':
        return <StudyPlannerPage onNavigate={navigate} />;
      case 'resources':
        return <ResourcesPage onNavigate={navigate} />;
      case 'mock':
        return <MockExamsPage defaultProfession={preferredProfession} />;
      case 'practice':
        return (
          <PracticePage
            initialFilter={practiceFilter}
            defaultProfession={preferredProfession}
            onFilterChange={(f) => navigate('practice', f === 'all' ? undefined : f)}
          />
        );
      case 'guide':
        return (
          <GuidePage
            defaultExpandedId="guide-medicine"
            focusAshgan={route.itemId === 'ashgan'}
          />
        );
      case 'tips':
        return <TipsPage />;
      case 'pearls':
        return <PearlsPitfallsPage />;
      case 'books':
        return (
          <BooksPage
            initialItemId={route.itemId}
            defaultProfession={preferredProfession}
            onItemChange={(id) => navigate('books', id)}
          />
        );
      case 'experiences':
      case 'experience-pdfs':
        return <ResourcesPage onNavigate={navigate} />;
      case 'usmle':
        return <UsmlePage />;
    }
  };

  return (
    <Layout active={route.section} onNavigate={navigate} title={meta.title} subtitle={meta.subtitle}>
      <Suspense fallback={<div className="card loading-card">Loading study tools…</div>}>
        {renderPage()}
      </Suspense>
    </Layout>
  );
}

export default App;
