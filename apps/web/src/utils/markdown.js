export function markdownToHtml(markdown) {
  const source = (markdown || '').replace(/\r\n/g, '\n');
  const escaped = escapeHtml(source);
  const lines = escaped.split('\n');
  const out = [];
  let inList = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      return;
    }

    if (trimmed.startsWith('- ')) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inlineMarkdown(trimmed.slice(2))}</li>`);
      return;
    }

    if (inList) {
      out.push('</ul>');
      inList = false;
    }

    if (trimmed.startsWith('### ')) {
      out.push(`<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`);
      return;
    }
    if (trimmed.startsWith('## ')) {
      out.push(`<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`);
      return;
    }
    if (trimmed.startsWith('# ')) {
      out.push(`<h1>${inlineMarkdown(trimmed.slice(2))}</h1>`);
      return;
    }

    out.push(`<p>${inlineMarkdown(trimmed)}</p>`);
  });

  if (inList) out.push('</ul>');
  return out.join('');
}

function inlineMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
      const safeUrl = /^https?:\/\//i.test(url) ? url : '#';
      return `<a href="${safeUrl}" target="_blank" rel="noreferrer">${label}</a>`;
    });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
