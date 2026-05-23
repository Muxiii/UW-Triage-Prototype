/**
 * Command-palette style global search (⌘K / Ctrl+K). Used by admin + researcher portals.
 * Expects React hooks on window (Babel script, no imports).
 */
function GlobalSearchPalette({
  open,
  onClose,
  query,
  setQuery,
  results,
  placeholder = 'Search…',
  emptyLabel = 'No results',
  hintLabel = 'Type to search',
}) {
  const inputRef = React.useRef(null);
  const [activeIdx, setActiveIdx] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIdx(0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open, setQuery]);

  React.useEffect(() => {
    setActiveIdx(0);
  }, [query, results.length]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && results[activeIdx]) {
        e.preventDefault();
        results[activeIdx].onSelect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, results, activeIdx]);

  if (!open) return null;

  return (
    <div className="global-search-overlay" role="presentation" onClick={onClose}>
      <div
        className="global-search-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="global-search-input-row">
          <svg width="15" height="15" viewBox="0 0 13 13" fill="none" aria-hidden>
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3" />
            <path d="M9 9L11.5 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>esc</kbd>
        </div>
        <div className="global-search-results" role="listbox">
          {!query.trim() && results.length === 0 && (
            <div className="global-search-empty">{hintLabel}</div>
          )}
          {query.trim() && results.length === 0 && (
            <div className="global-search-empty">{emptyLabel}</div>
          )}
          {results.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={i === activeIdx}
              className={`global-search-result${i === activeIdx ? ' active' : ''}`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => item.onSelect()}
            >
              <div className="global-search-result-main">
                <span className="global-search-result-title">{item.title}</span>
                {item.subtitle && (
                  <span className="global-search-result-sub">{item.subtitle}</span>
                )}
              </div>
              {item.badge && <span className="global-search-result-badge">{item.badge}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildSearchHaystack(parts) {
  return parts
    .filter((p) => p != null && String(p).trim())
    .join(' ')
    .toLowerCase();
}

function matchSearchQuery(haystack, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return q.split(/\s+/).every((tok) => haystack.includes(tok));
}
