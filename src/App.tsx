import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { MockExamsPage } from './pages/MockExamsPage';
import { PracticePage } from './pages/PracticePage';
import { GuidePage } from './pages/GuidePage';
import { TipsPage } from './pages/TipsPage';
import { PearlsPitfallsPage } from './pages/PearlsPitfallsPage';
import { ExperiencesPage } from './pages/ExperiencesPage';
import { BooksPage } from './pages/BooksPage';
import { ExperiencePdfsPage } from './pages/ExperiencePdfsPage';
import { UsmlePage } from './pages/UsmlePage';
import type { NavSection } from './types';
import { buildHash, isPracticeFilter, parseRoute } from './lib/routing';
import { initPreferredProfession } from './lib/preferredProfession';

const pageMeta: Record<NavSection, { title: string; subtitle?: string }> = {
  home: {
    title: 'Dashboard',
    subtitle: 'Medicine-focused OET preparation for physicians',
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
    subtitle: 'Proven strategies from educators and successful candidates',
  },
  pearls: {
    title: 'Pearls & Pitfalls',
    subtitle: 'What to do — and what to avoid',
  },
  experiences: {
    title: 'Exam Experiences',
    subtitle: 'Recaps from Telegram study groups worldwide',
  },
  books: {
    title: 'Book PDFs',
    subtitle: 'Study books and compilations',
  },
  'experience-pdfs': {
    title: 'Experience PDFs',
    subtitle: 'Detailed write-ups and debrief documents',
  },
  usmle: {
    title: 'USMLE (Coursology Q-Bank)',
    subtitle: 'Question banks for physicians preparing USMLE Step 1, 2 CK, and Step 3',
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
      case 'home':
        return <HomePage onNavigate={navigate} preferredProfession={preferredProfession} />;
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
      case 'experiences':
        return <ExperiencesPage onNavigate={navigate} defaultProfession={preferredProfession} />;
      case 'books':
        return (
          <BooksPage
            initialItemId={route.itemId}
            defaultProfession={preferredProfession}
            onItemChange={(id) => navigate('books', id)}
          />
        );
      case 'experience-pdfs':
        return (
          <ExperiencePdfsPage
            initialItemId={route.itemId}
            onItemChange={(id) => navigate('experience-pdfs', id)}
          />
        );
      case 'usmle':
        return <UsmlePage />;
    }
  };

  return (
    <Layout active={route.section} onNavigate={navigate} title={meta.title} subtitle={meta.subtitle}>
      {renderPage()}
    </Layout>
  );
}

export default App;
