import React from 'react';

const sections = [
  { key: 'profile', label: 'Profile' },
  { key: 'blog-editor', label: 'Create Blog' },
  { key: 'blog-feed', label: 'Blog Feed' },
  { key: 'admin', label: 'Admin' },
];

function SectionNav({ activeSection, onChange }) {
  return (
    <nav className="section-nav">
      {sections.map((section) => (
        <button
          key={section.key}
          type="button"
          className={activeSection === section.key ? 'active' : ''}
          onClick={() => onChange(section.key)}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}

export default SectionNav;
