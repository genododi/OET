import {
  coursologyPortalUrl,
  coursologySignInUrl,
  coursologyTelegramUrl,
  coursologyUpdatesUrl,
  groupUsmleQBanks,
  usmleCatalogMeta,
  usmleQBanks,
} from '../data/usmleCourses';

const stepLabels: Record<string, string> = {
  step1: 'Step 1',
  step2: 'Step 2 CK',
  step3: 'Step 3',
  all: 'All steps',
};

export function UsmlePage() {
  const groups = groupUsmleQBanks();

  return (
    <div className="usmle-page">
      <section className="card usmle-hero">
        <span className="hero-eyebrow">External resource · USMLE</span>
        <h2>{usmleCatalogMeta.title}</h2>
        <p>{usmleCatalogMeta.subtitle}</p>
        <p className="meta">{usmleCatalogMeta.portalNote}</p>
        <div className="hero-actions">
          <a
            href={coursologyPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Open Coursology Q-Bank ↗
          </a>
          <a
            href={coursologySignInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Sign in ↗
          </a>
        </div>
      </section>

      <section className="card usmle-stats">
        <p>
          <strong>{usmleQBanks.length}</strong> publicly announced Q-banks and libraries cataloged from
          Coursology&apos;s Telegram channel — content access requires a subscription at{' '}
          <a href={coursologyPortalUrl} target="_blank" rel="noopener noreferrer">
            coursology-qbank.com
          </a>
          .
        </p>
        <div className="usmle-meta-links">
          <a href={coursologyUpdatesUrl} target="_blank" rel="noopener noreferrer" className="link-btn">
            Platform updates (Telegram) ↗
          </a>
          <a href={coursologyTelegramUrl} target="_blank" rel="noopener noreferrer" className="link-btn">
            Subscribe via Telegram ↗
          </a>
        </div>
      </section>

      {groups.map((group) => (
        <section key={group.category} className="card usmle-category">
          <h3>{group.label}</h3>
          <ul className="usmle-qbank-list">
            {group.items.map((item) => (
              <li key={item.id} className="usmle-qbank-item">
                <div className="usmle-qbank-head">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="usmle-qbank-link">
                    {item.name} ↗
                  </a>
                  <span className="usmle-step-tags">
                    {item.steps.map((s) => (
                      <span key={s} className="tag">
                        {stepLabels[s]}
                      </span>
                    ))}
                  </span>
                </div>
                <p className="meta">{item.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
