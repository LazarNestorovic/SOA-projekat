import React from 'react';

const sections = [
  { key: 'profile', label: 'Profil' },
  { key: 'blog-editor', label: 'Kreiraj blog' },
  { key: 'blog-feed', label: 'Blog feed' },
  { key: 'tour-editor', label: 'Moje ture' },
  { key: 'tour-browse', label: 'Pretraži ture' },
  { key: 'tour-cart', label: 'Korpa' },
  { key: 'tour-purchased', label: 'Kupljene ture' },
  { key: 'tour-play', label: 'Pokreni turu' },
  { key: 'admin', label: 'Admin' },
];

function SectionNav({ activeSection, onChange, cartCount }) {
  return (
    <nav className="section-nav">
      {sections.map((section) => (
        <button
          key={section.key}
          type="button"
          className={activeSection === section.key ? 'active' : ''}
          onClick={() => onChange(section.key)}
        >
          {section.key === 'tour-cart' && cartCount > 0
            ? `Korpa (${cartCount})`
            : section.label}
        </button>
      ))}
    </nav>
  );
}

export default SectionNav;
