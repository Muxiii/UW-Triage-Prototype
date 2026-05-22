function MaterialRow({ mat, onUpdate, onDelete }) {
  const [attachOpen, setAttachOpen] = React.useState(false);
  const [attachTab, setAttachTab] = React.useState(mat.attachKind === 'pdf' ? 'pdf' : 'url');
  const popRef = React.useRef(null);
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    if (!attachOpen) return;
    const onDoc = (e) => { if (!popRef.current?.contains(e.target)) setAttachOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [attachOpen]);

  const hasUrl = mat.attachKind === 'url' && mat.attachValue;
  const hasPdf = mat.attachKind === 'pdf' && mat.attachValue;
  const hasAny = hasUrl || hasPdf;

  const LinkIc = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
  const FileIc = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  );
  const UpIc = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );

  return (
    <div className="material-row">
      <span className="mat-bullet" style={hasAny ? { background: 'var(--purple-500)', borderRadius: '50%' } : {}} />
      <input
        className="mat-label-input"
        value={mat.label}
        onChange={e => onUpdate({ label: e.target.value })}
        onPointerDown={e => e.stopPropagation()}
        placeholder="Material name…"
      />
      {/* Attachment toggle */}
      <div style={{ position: 'relative', flexShrink: 0 }} ref={popRef}>
        <button
          className={`mat-attach-btn ${hasUrl ? 'has-url' : ''} ${hasPdf ? 'has-pdf' : ''}`}
          title={hasAny ? mat.attachValue : 'Attach URL or PDF'}
          onClick={e => { e.stopPropagation(); setAttachOpen(o => !o); }}
          onPointerDown={e => e.stopPropagation()}
        >
          {hasPdf ? <FileIc /> : <LinkIc />}
        </button>
        {attachOpen && (
          <div className="mat-attach-popover" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <div className="mat-attach-tabs">
              <div className={`mat-attach-tab ${attachTab === 'url' ? 'active' : ''}`} onClick={() => setAttachTab('url')}>URL</div>
              <div className={`mat-attach-tab ${attachTab === 'pdf' ? 'active' : ''}`} onClick={() => setAttachTab('pdf')}>PDF</div>
              {hasAny && (
                <div className="mat-attach-tab remove-tab"
                  onClick={() => { onUpdate({ attachKind: null, attachValue: '' }); setAttachOpen(false); }}>
                  Remove
                </div>
              )}
            </div>
            <div className="mat-attach-body">
              {attachTab === 'url' && (
                <input
                  className="mat-attach-input"
                  placeholder="https://…"
                  value={mat.attachKind === 'url' ? (mat.attachValue || '') : ''}
                  onChange={e => onUpdate({ attachKind: 'url', attachValue: e.target.value })}
                  onPointerDown={e => e.stopPropagation()}
                  autoFocus
                />
              )}
              {attachTab === 'pdf' && (
                <>
                  {mat.attachKind === 'pdf' && mat.attachValue ? (
                    <div className="mat-pdf-chip">
                      <FileIc />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mat.attachValue}</span>
                      <button style={{ color: 'inherit', opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}
                        onClick={() => onUpdate({ attachKind: null, attachValue: '' })}>×</button>
                    </div>
                  ) : (
                    <div className="mat-pdf-drop" onClick={() => fileRef.current?.click()}>
                      <UpIc /> Upload PDF / DOC / DOCX
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" hidden
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { onUpdate({ attachKind: 'pdf', attachValue: f.name }); setAttachOpen(false); }
                    }}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Remove row */}
      <button className="mat-remove" onClick={e => { e.stopPropagation(); onDelete(); }} onPointerDown={e => e.stopPropagation()} title="Remove">
        <Icon.X />
      </button>
    </div>
  );
}

function AssigneeField({ node, onUpdate }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);
  const kind = node.assigneeKind || 'name';
  const value = node.assignee || '';

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const kinds = [
    { id: 'name', label: 'Name', prefix: null, placeholder: 'e.g. IRB Office' },
    { id: 'email', label: 'Email', prefix: '✉', placeholder: 'reviewer@u.edu' },
    { id: 'link', label: 'Link', prefix: '↗', placeholder: 'https://…' },
    { id: 'text', label: 'Text', prefix: null, placeholder: 'Free text…' },
  ];
  const cur = kinds.find(k => k.id === kind) || kinds[0];

  const display = () => {
    if (!value) return 'Unassigned';
    if (kind === 'link') { try { return new URL(value).host; } catch { return value; } }
    return value;
  };

  return (
    <div className="action-assign" ref={wrapRef}>
      <span>Assigned to</span>
      <span className="action-assign-pill" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} onPointerDown={(e) => e.stopPropagation()} title={value || 'Click to edit'}>
        <span>{display()}</span>
      </span>
      {open && (
        <div className="assign-popover" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <div className="assign-kinds">
            {kinds.map(k => (
              <div key={k.id} className={`assign-kind ${kind === k.id ? 'active' : ''}`} onClick={() => onUpdate({ assigneeKind: k.id })}>{k.label}</div>
            ))}
          </div>
          <div className="assign-input-wrap">
            {cur.prefix && <span className="prefix">{cur.prefix}</span>}
            <input className="assign-input-field" type={kind === 'email' ? 'email' : kind === 'link' ? 'url' : 'text'} value={value} placeholder={cur.placeholder} onChange={(e) => onUpdate({ assignee: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(false); }} autoFocus />
          </div>
        </div>
      )}
    </div>
  );
}

function NodeView({ node, selected, onPointerDown, onUpdate, onDelete, onDuplicate, onStartConn, onFinishConn, onOpenMenu, hoverPort, setHoverPort, pendingConn, edges, readOnly, registerPort, onNodeMount }) {
  const isConnectedAsSource = (portId) => edges.some(e => e.from === node.id && e.fromPort === portId);
  const isConnectedAsTarget = (portId) => edges.some(e => e.to === node.id && e.toPort === portId);

  const Port = ({ id, className }) => readOnly ? null : (
    <div
      ref={(el) => registerPort && registerPort(node.id, id, el)}
      className={`port ${className} ${isConnectedAsSource(id) || isConnectedAsTarget(id) ? 'connected' : ''} ${hoverPort?.node === node.id && hoverPort?.port === id ? 'hot' : ''}`}
      onPointerDown={(e) => { if (className === 'output') onStartConn(e, node, id); }}
      onPointerUp={(e) => { if (pendingConn && className === 'input') onFinishConn(e, node, id); }}
      onPointerEnter={() => setHoverPort({ node: node.id, port: id })}
      onPointerLeave={() => setHoverPort(null)}
    />
  );

  /* ── Definition node: editable reference card ── */
  if (node.type === 'definition') {
    return (
      <div
        ref={(el) => onNodeMount?.(node.id, el)}
        className={`node ${selected ? 'selected' : ''}`}
        style={{ left: node.x, top: node.y, width: NODE_W, borderLeft: '3px solid oklch(0.52 0.12 200)' }}
        onPointerDown={onPointerDown}
      >
        <div className="node-head">
          <span className="node-badge definition">Definition</span>
          <span className="node-id">#{node.id.slice(-4)}</span>
          <span className="node-menu" style={{ cursor: 'default', color: 'var(--ink-300)' }} title="This node is locked and cannot be deleted"><Icon.Lock /></span>
        </div>
        <div style={{ padding: '10px 12px 14px' }}>
          <input
            className="node-title-input"
            style={{ fontFamily: 'var(--font-headline)', fontSize: 17, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.01em', display: 'block', width: '100%' }}
            value={node.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Term…"
            readOnly={readOnly}
          />
          <textarea
            className="node-title-input"
            style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-700)', display: 'block', width: '100%', resize: 'none', minHeight: 200 }}
            value={node.body || ''}
            onChange={(e) => onUpdate({ body: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Definition text…"
            rows={10}
            readOnly={readOnly}
          />
        </div>
        <Port id="out" className="output" />
        {readOnly && <div style={{ position: 'absolute', inset: 0, zIndex: 50, borderRadius: 'inherit', cursor: 'default' }} />}
      </div>
    );
  }

  /* ── Handler node ── */
  if (node.type === 'handler') {
    const initials = (node.name || 'N').split(' ').map(w => w[0]).join('').slice(0, 2);
    const isHidden = node.hiddenFromResearchers;
    const fieldStyle = (base) => ({ width: '100%', background: 'none', border: 'none', outline: 'none', padding: 0, fontFamily: 'inherit', ...base });
    return (
      <div
        ref={(el) => onNodeMount?.(node.id, el)}
        className={`node ${selected ? 'selected' : ''}`}
        style={{ left: node.x, top: node.y, width: NODE_W, ...(isHidden ? { border: '1.5px dashed var(--ink-300)', boxShadow: 'none' } : {}) }}
        onPointerDown={onPointerDown}
        onContextMenu={(e) => onOpenMenu(e, node.id)}
      >
        <div className="node-head">
          <span className="node-badge handler">Handler</span>
          <span className="node-id">#{node.id.slice(-4)}</span>
          {!readOnly && <button className="node-menu" onClick={(e) => onOpenMenu(e, node.id)}><Icon.Dots /></button>}
        </div>
        {/* Person card body */}
        <div style={{ padding: '11px 12px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: colorFor(node.name || 'N'), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {readOnly
              ? <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name || 'Unnamed'}</div>
              : <input value={node.name || ''} onChange={(e) => onUpdate({ name: e.target.value })} onPointerDown={(e) => e.stopPropagation()} placeholder="Full name…" style={fieldStyle({ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-900)' })} />
            }
            {readOnly
              ? <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.role || 'Role'}</div>
              : <input value={node.role || ''} onChange={(e) => onUpdate({ role: e.target.value })} onPointerDown={(e) => e.stopPropagation()} placeholder="Role or department…" style={fieldStyle({ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 2 })} />
            }
          </div>
        </div>
        {/* Email row */}
        <div style={{ padding: '3px 12px 0 58px' }}>
          {readOnly
            ? (node.email ? <div style={{ fontSize: 11, color: 'var(--ink-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.email}</div> : null)
            : <input value={node.email || ''} onChange={(e) => onUpdate({ email: e.target.value })} onPointerDown={(e) => e.stopPropagation()} placeholder="email@uw.edu" type="email" style={fieldStyle({ fontSize: 11, color: 'var(--ink-400)' })} />
          }
        </div>
        {/* Visibility status bar */}
        <div
          style={{ margin: '8px 12px 10px', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 5, background: isHidden ? 'var(--ink-100)' : 'var(--purple-50)', border: `1px solid ${isHidden ? 'var(--ink-200)' : 'var(--purple-200)'}`, cursor: readOnly ? 'default' : 'pointer' }}
          onClick={() => !readOnly && onUpdate({ hiddenFromResearchers: !isHidden })}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: isHidden ? 'var(--ink-400)' : 'var(--purple-600)', flexShrink: 0 }} />
          <span style={{ fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", color: isHidden ? 'var(--ink-500)' : 'var(--purple-700)', letterSpacing: 0.3, flex: 1 }}>
            {isHidden ? 'Hidden from researchers' : 'Visible to researchers'}
          </span>
        </div>
        <Port id="in" className="input" />
        <Port id="out" className="output" />
        {readOnly && <div style={{ position: 'absolute', inset: 0, zIndex: 50, borderRadius: 'inherit', cursor: 'default' }} />}
      </div>
    );
  }

  return (
    <div
      ref={(el) => onNodeMount?.(node.id, el)}
      className={`node ${selected ? 'selected' : ''}`}
      style={{ left: node.x, top: node.y, width: NODE_W }}
      onPointerDown={onPointerDown}
      onContextMenu={(e) => onOpenMenu(e, node.id)}
    >
      <div className="node-head">
        <span className={`node-badge ${node.type}`}>
          {node.type === 'start' && 'Trigger'}
          {node.type === 'decision' && 'Decision'}
          {node.type === 'action' && 'Action'}
          {node.type === 'publish' && 'Publish'}
        </span>
        <span className="node-id">#{node.id.slice(-4)}</span>
        {!readOnly && <button className="node-menu" onClick={(e) => onOpenMenu(e, node.id)}><Icon.Dots /></button>}
      </div>
      <div className="node-title">
        <textarea
          className="node-title-input"
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder={node.type === 'decision' ? 'Enter a question…' : 'Enter a title…'}
          rows={1}
        />
      </div>

      {node.type === 'start' && (
        <div className="node-action-body" style={{ paddingTop: 0, color: 'var(--ink-500)', fontSize: 12 }}>{node.subtitle}</div>
      )}

      {node.type === 'decision' && (
        <div className="node-answers">
          {node.answers.map((a, i) => (
            <div key={a.id} className="node-answer">
              {/* Port dot inside the answer section — CSS top:50% tracks the section's rendered center */}
              {!readOnly && (
                <div
                  ref={(el) => registerPort && registerPort(node.id, a.id, el)}
                  className={`port output ${isConnectedAsSource(a.id) ? 'connected' : ''} ${hoverPort?.node === node.id && hoverPort?.port === a.id ? 'hot' : ''}`}
                  style={{ position: 'absolute', right: '-7px', top: '50%', transform: 'translateY(-50%)' }}
                  onPointerDown={(e) => onStartConn(e, node, a.id)}
                  onPointerEnter={() => setHoverPort({ node: node.id, port: a.id })}
                  onPointerLeave={() => setHoverPort(null)}
                />
              )}
              <div className="node-answer-main">
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: 'var(--purple-700)', background: 'var(--purple-100)', borderRadius: 3, padding: '1px 4px', flexShrink: 0, lineHeight: 1.4 }}>{i + 1}</span>
                <textarea className="answer-input" readOnly={readOnly} value={a.label} onChange={(e) => onUpdate({ answers: node.answers.map(x => x.id === a.id ? { ...x, label: e.target.value } : x) })} onPointerDown={(e) => e.stopPropagation()} placeholder="Answer label" rows={1} />
                {!readOnly && <button className="answer-remove" type="button" onClick={() => onUpdate({ answers: node.answers.filter(x => x.id !== a.id) })}><Icon.X /></button>}
              </div>
              {!readOnly && (
                a.rationaleExpanded ? (
                  <div className="answer-rationale-editor">
                    <textarea
                      className="answer-rationale-textarea"
                      value={a.rationale || ''}
                      onChange={(e) => onUpdate({ answers: node.answers.map(x => x.id === a.id ? { ...x, rationale: e.target.value } : x) })}
                      onPointerDown={(e) => e.stopPropagation()}
                      placeholder="Rationale: how the document supports this branch…"
                      rows={3}
                    />
                    <button type="button" className="answer-rationale-collapse" onPointerDown={(e) => e.stopPropagation()} onClick={() => onUpdate({ answers: node.answers.map(x => x.id === a.id ? { ...x, rationaleExpanded: false } : x) })}>Collapse</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="answer-rationale-preview"
                    title={(a.rationale || '').trim() ? (a.rationale.length > 200 ? `${(a.rationale || '').slice(0, 200)}…` : a.rationale) : ''}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onUpdate({ answers: node.answers.map(x => x.id === a.id ? { ...x, rationaleExpanded: true } : x) })}
                  >
                    {(a.rationale || '').trim() || 'Rationale (click to expand)…'}
                  </button>
                )
              )}
              {readOnly && (a.rationale || '').trim() && (
                <div className="answer-rationale-preview readonly" title={a.rationale}>{a.rationale}</div>
              )}
            </div>
          ))}
          {!readOnly && <button className="node-add-answer" onClick={() => onUpdate({ answers: [...node.answers, { id: 'a' + Math.random(), label: 'New answer', rationale: '' }] })} onPointerDown={(e) => e.stopPropagation()}>
            <Icon.Plus /> Add answer
          </button>}
        </div>
      )}

      {node.type === 'action' && (
        <div className="node-action-body" style={{ paddingBottom: 0 }}>
          <textarea className="answer-input" style={{ width: '100%', resize: 'none', minHeight: 36, padding: '2px 4px', fontSize: 12.5, lineHeight: 1.4 }} value={node.description || ''} onChange={(e) => onUpdate({ description: e.target.value })} onPointerDown={(e) => e.stopPropagation()} placeholder="What should happen?" rows={2} />
          <AssigneeField node={node} onUpdate={onUpdate} />
          {/* Materials prepared */}
          <div className="materials-section">
            <div className="mat-section-head">
              Materials prepared
            </div>
            {(node.materials || []).map(mat => (
              <MaterialRow
                key={mat.id}
                mat={mat}
                onUpdate={patch => onUpdate({ materials: (node.materials || []).map(m => m.id === mat.id ? { ...m, ...patch } : m) })}
                onDelete={() => onUpdate({ materials: (node.materials || []).filter(m => m.id !== mat.id) })}
              />
            ))}
            {!readOnly && <button className="mat-add-btn"
              onClick={() => onUpdate({ materials: [...(node.materials || []), { id: 'mat' + Date.now(), label: '', attachKind: null, attachValue: '' }] })}
              onPointerDown={e => e.stopPropagation()}>
              <Icon.Plus /> Add material
            </button>}
          </div>
        </div>
      )}

      {node.type === 'publish' && (
        <div className="node-action-body" style={{ color: 'var(--ink-500)', fontSize: 12 }}>Publishes the document + trail to the department portal.</div>
      )}

      {node.type !== 'start' && <Port id="in" className="input" />}
      {(node.type === 'start' || node.type === 'publish' || node.type === 'action') && <Port id="out" className="output" />}
      {readOnly && <div style={{ position: 'absolute', inset: 0, zIndex: 50, borderRadius: 'inherit', cursor: 'default' }} />}
    </div>
  );
}

function ManagePeopleRow({ node, onUpdate, onDelete, isLast }) {
  const [editing, setEditing] = React.useState(false);
  const initials = (node.name || 'N').split(' ').map(w => w[0]).join('').slice(0, 2);
  const isHidden = node.hiddenFromResearchers;

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--ink-200)' }}>
      {/* Main row */}
      <div style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: colorFor(node.name || 'N'), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name || 'Unnamed'}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.role || '—'}{node.email ? ` · ${node.email}` : ''}</div>
        </div>
        {/* Quick actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {/* Visibility toggle */}
          <button
            onClick={() => onUpdate({ hiddenFromResearchers: !isHidden })}
            title={isHidden ? 'Click to make visible to researchers' : 'Click to hide from researchers'}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, fontSize: 11, background: isHidden ? 'var(--ink-200)' : 'var(--purple-100)', color: isHidden ? 'var(--ink-600)' : 'var(--purple-700)' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isHidden ? 'var(--ink-400)' : 'var(--purple-600)', display: 'inline-block' }} />
            {isHidden ? 'Hidden' : 'Visible'}
          </button>
          {/* Edit toggle */}
          <button
            onClick={() => setEditing(e => !e)}
            title="Edit info"
            style={{ width: 28, height: 28, borderRadius: 5, border: '1px solid var(--ink-200)', background: editing ? 'var(--purple-50)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: editing ? 'var(--purple-700)' : 'var(--ink-500)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          {/* Delete */}
          <button
            onClick={onDelete}
            title="Delete reviewer"
            style={{ width: 28, height: 28, borderRadius: 5, border: '1px solid var(--ink-200)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-400)', transition: 'all 0.12s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'oklch(0.97 0.02 25)'; e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.borderColor = 'var(--accent-red)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--ink-400)'; e.currentTarget.style.borderColor = 'var(--ink-200)'; }}
          >
            <Icon.Trash />
          </button>
        </div>
      </div>

      {/* Inline edit form */}
      {editing && (
        <div style={{ padding: '0 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'Name', field: 'name', placeholder: 'Full name' },
            { label: 'Role', field: 'role', placeholder: 'e.g. IRB Coordinator' },
            { label: 'Email', field: 'email', placeholder: 'email@uw.edu' },
          ].map(({ label, field, placeholder }) => (
            <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 500, width: 36, flexShrink: 0 }}>{label}</span>
              <input
                value={node[field] || ''}
                onChange={(e) => onUpdate({ [field]: e.target.value })}
                placeholder={placeholder}
                style={{ flex: 1, padding: '5px 9px', fontSize: 12.5, border: '1px solid var(--ink-200)', borderRadius: 5, fontFamily: 'inherit', color: 'var(--ink-900)', outline: 'none', background: 'white' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--purple-600)'; e.target.style.boxShadow = '0 0 0 3px var(--purple-100)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--ink-200)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlowCanvas({ onSelectionChange, onIssuesChange, toast, registerAdders, onNodesChange, onGraphChange, readOnly, graph }) {
  const [nodes, setNodes] = useState(ensureDefinitionNode(graph?.nodes || SEED_NODES));
  const [edges, setEdges] = useState(graph?.edges || SEED_EDGES);
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(() => panForDefinition(ensureDefinitionNode(graph?.nodes || SEED_NODES)));
  const [pendingConn, setPendingConn] = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [hoverPort, setHoverPort] = useState(null);
  const wrapRef = useRef(null);
  const panRef = useRef({ active: false, sx: 0, sy: 0, px: 0, py: 0 });
  const dragRef = useRef(null);
  const zoomRef = useRef(zoom);
  const panValRef = useRef(pan);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panValRef.current = pan; }, [pan]);
  const nodesRef = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  const savedViewportRef = useRef(null);
  const portElsRef = useRef({});
  const portPosCacheRef = useRef({});
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const registerPort = useCallback((nodeId, portId, el) => {
    const key = nodeId + ':' + portId;
    if (el) portElsRef.current[key] = el;
    else delete portElsRef.current[key];
  }, []);

  // After each render, measure actual port positions from the DOM and cache canvas-space coords.
  // useLayoutEffect runs before the browser paints, so forceUpdate() causes a synchronous
  // re-render with correct positions — users never see the formula-based positions.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const newCache = {};
    let changed = false;
    Object.entries(portElsRef.current).forEach(function(entry) {
      const key = entry[0], el = entry[1];
      if (!el || !el.isConnected) return;
      const r = el.getBoundingClientRect();
      const x = (r.left + r.width / 2 - wrapRect.left - pan.x) / zoom;
      const y = (r.top + r.height / 2 - wrapRect.top - pan.y) / zoom;
      newCache[key] = { x: x, y: y };
      const prev = portPosCacheRef.current[key];
      if (!prev || Math.abs(prev.x - x) > 0.5 || Math.abs(prev.y - y) > 0.5) changed = true;
    });
    if (changed) { portPosCacheRef.current = newCache; forceUpdate(); }
  }, [nodes]);  // re-measure whenever node content / positions change

  // Returns measured canvas-space center of a port dot; falls back to formula if not yet measured.
  const getDomPortPos = useCallback(function(node, portId) {
    return portPosCacheRef.current[node.id + ':' + portId] || portPos(node, portId);
  }, []);

  // ── DOM-measured layout normalization ────────────────────────────────────────
  // nodeElsRef stores the .node DOM element for each node so we can read el.offsetHeight.
  const nodeElsRef = useRef({});
  const hasNormalizedRef = useRef(false);

  // Reset the "has normalized" flag whenever a new graph loads, so each AI-generated
  // flow gets its own normalization pass.
  useEffect(() => { hasNormalizedRef.current = false; }, [graph]);

  const registerNodeEl = useCallback(function(nodeId, el) {
    if (el) nodeElsRef.current[nodeId] = el;
    else delete nodeElsRef.current[nodeId];
  }, []);

  // After every render, attempt a single normalization pass using ONLY el.offsetHeight.
  // No formulas, no constants, no per-type values.
  useLayoutEffect(function() {
    if (hasNormalizedRef.current) return;    // run once per graph load
    if (readOnly) return;                    // skip in preview mode
    if (!nodes.length) return;

    const heightsById = {};
    let allMeasured = true;
    nodes.forEach(function(n) {
      const el = nodeElsRef.current[n.id];
      if (el && el.isConnected && el.offsetHeight > 0) {
        heightsById[n.id] = el.offsetHeight;
      } else {
        allMeasured = false;
      }
    });

    // Diagnostic — visible in browser console; shows the raw rendered heights.
    console.log('[DIAGNOSTIC] node heights after render:', nodes.map(function(n) {
      return { id: n.id.slice(-6), type: n.type, offsetHeight: heightsById[n.id] ?? 'NOT MEASURED' };
    }));

    if (!allMeasured) return;  // wait for all nodes to be in the DOM

    hasNormalizedRef.current = true;
    const normalized = normalizeNodesWithMeasuredHeights(nodes, heightsById);
    setNodes(normalized);
  }, [nodes, readOnly]);  // re-runs until allMeasured, then hasNormalizedRef gates it

  const [animating, setAnimating] = useState(false);
  const [history, setHistory] = useState({ past: [], future: [] });
  const [showManagePeople, setShowManagePeople] = useState(false);
  const [toolbarGroup, setToolbarGroup] = useState('edit');
  const regenRef = useRef(null);

  useEffect(() => {
    if (!graph) return;
    const nextNodes = ensureDefinitionNode(graph.nodes || []);
    setNodes(nextNodes);
    setEdges(graph.edges || []);
    setSelected(null);
    setHistory({ past: [], future: [] });
    setPan(panForDefinition(nextNodes));
    setZoom(1);
  }, [graph]);

  // Smooth preview enter/exit transition
  useEffect(() => {
    if (readOnly) {
      savedViewportRef.current = { zoom: zoomRef.current, pan: panValRef.current };
      const fit = computeFitViewport(nodesRef.current, wrapRef.current);
      if (fit) { setAnimating(true); setZoom(fit.zoom); setPan(fit.pan); }
    } else if (savedViewportRef.current) {
      const saved = savedViewportRef.current;
      savedViewportRef.current = null;
      setAnimating(true);
      setZoom(saved.zoom);
      setPan(saved.pan);
    }
  }, [readOnly]);

  useEffect(() => {
    if (!animating) return;
    const t = setTimeout(() => setAnimating(false), 520);
    return () => clearTimeout(t);
  }, [animating]);

  const snapshot = useCallback(() => {
    setHistory(h => ({ past: [...h.past.slice(-30), { nodes, edges }], future: [] }));
  }, [nodes, edges]);

  const undo = useCallback(() => {
    setHistory(h => {
      if (!h.past.length) return h;
      const prev = h.past[h.past.length - 1];
      setNodes(prev.nodes); setEdges(prev.edges);
      return { past: h.past.slice(0, -1), future: [{ nodes, edges }, ...h.future] };
    });
  }, [nodes, edges]);

  const redo = useCallback(() => {
    setHistory(h => {
      if (!h.future.length) return h;
      const next = h.future[0];
      setNodes(next.nodes); setEdges(next.edges);
      return { past: [...h.past, { nodes, edges }], future: h.future.slice(1) };
    });
  }, [nodes, edges]);

  useEffect(() => {
    const issues = [];
    nodes.forEach(n => {
      if (n.type === 'decision') {
        const portIds = n.answers?.map(a => a.id) || [];
        const connected = new Set(edges.filter(e => e.from === n.id).map(e => e.fromPort));
        const missing = portIds.filter(p => !connected.has(p));
        if (missing.length) {
          issues.push({ id: `iss-${n.id}-paths`, level: missing.length === portIds.length ? 'err' : 'warn', nodeId: n.id, title: missing.length === portIds.length ? `Decision node has no paths` : `Decision has ${missing.length} unconnected branch${missing.length > 1 ? 'es' : ''}`, body: `"${n.title}" — ${missing.map(p => n.answers.find(a => a.id === p)?.label || p).join(', ')}`, fix: 'connect' });
        }
        if (!n.title || n.title === 'New Decision?') {
          issues.push({ id: `iss-${n.id}-title`, level: 'warn', nodeId: n.id, title: 'Decision needs a clear question', body: `Node "${n.title}" still has placeholder text.` });
        }
      }
      if (n.type === 'action' && !edges.some(e => e.to === n.id)) {
        issues.push({ id: `iss-${n.id}-orphan`, level: 'warn', nodeId: n.id, title: 'Action node has no incoming path', body: `"${n.title}" is not wired from upstream (allowed for parallel or draft paths).` });
      }
      if (n.type === 'decision' && !edges.some(e => e.to === n.id)) {
        issues.push({ id: `iss-${n.id}-orphan-in`, level: 'warn', nodeId: n.id, title: 'Decision node has no incoming path', body: `"${n.title}" is not wired from upstream (allowed for parallel or draft paths).` });
      }
    });

    // Node-order path traversal: DEFINITION → DECISION(s) → ACTION(s) → PEOPLE(s)
    // Runs on every graph change to surface ordering errors in real time.
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const defNode = nodes.find(n => n.type === 'definition');
    if (defNode) {
      const defOutEdge = edges.find(e => e.from === defNode.id);
      if (defOutEdge) {
        const rootNode = nodeMap.get(defOutEdge.to);
        const emitted = new Set(); // dedup: nodeId:violationCode
        const checkOrderPath = (node, seenDecision, seenAction, visited) => {
          if (!node || visited.has(node.id)) return;
          const nv = new Set(visited);
          nv.add(node.id);
          const label = node.title || node.name || node.id;
          const key = (k) => `${node.id}:${k}`;

          if (node.type === 'decision' && seenAction && !emitted.has(key('daa'))) {
            emitted.add(key('daa'));
            issues.push({ id: `iss-order-${node.id}-daa`, level: 'err', nodeId: node.id,
              title: 'Decision after Action',
              body: `"${label}" — a DECISION node appears after an ACTION on this branch. Move this decision upstream or restructure as a separate branch.` });
            return; // stop traversal on this invalid path
          }

          if (node.type === 'action' && !seenDecision && !emitted.has(key('and'))) {
            emitted.add(key('and'));
            issues.push({ id: `iss-order-${node.id}-and`, level: 'err', nodeId: node.id,
              title: 'Action without Decision gate',
              body: `"${label}" — this ACTION node is reached with no DECISION node preceding it on this branch. Add a decision question upstream.` });
          }

          if (node.type === 'handler' && !node.hiddenFromResearchers && !seenAction && !emitted.has(key('pba'))) {
            emitted.add(key('pba'));
            issues.push({ id: `iss-order-${node.id}-pba`, level: 'err', nodeId: node.id,
              title: 'Contact before Action',
              body: `"${label}" — a HANDLER node appears before any ACTION on this branch. Handler nodes must come after at least one ACTION.` });
          }

          const outs = edges.filter(e => e.from === node.id);
          const nextSeenDecision = seenDecision || node.type === 'decision';
          const nextSeenAction = seenAction || node.type === 'action';

          if (!outs.length && !nextSeenAction && !['handler', 'definition'].includes(node.type)) {
            if (!emitted.has(key('bat'))) {
              emitted.add(key('bat'));
              issues.push({ id: `iss-order-${node.id}-bat`, level: 'err', nodeId: node.id,
                title: 'Branch has no Action',
                body: `"${label}" — this branch terminates without reaching any ACTION node.` });
            }
            return;
          }

          for (const edge of outs) {
            const next = nodeMap.get(edge.to);
            if (next) checkOrderPath(next, nextSeenDecision, nextSeenAction, nv);
          }
        };
        if (rootNode) checkOrderPath(rootNode, false, false, new Set());
      }
    }

    const suggestions = [
      { id: 'sug-1', level: 'tip', title: 'Use plain language for decisions', body: 'Consider rephrasing "What document type?" as "What kind of document are we reviewing?" for non-expert users.' },
      { id: 'sug-2', level: 'tip', title: 'Add a Handler node for reviewers', body: 'Assign review teams to action steps using a Handler node so routing is always up to date.' },
    ];
    onIssuesChange({ issues, suggestions });
  }, [nodes, edges, onIssuesChange]);

  useEffect(() => {
    if (!selected) { onSelectionChange(null); return; }
    if (selected.type === 'node') {
      const n = nodes.find(x => x.id === selected.id);
      onSelectionChange(n ? { type: 'node', data: n } : null);
    } else {
      onSelectionChange(selected);
    }
  }, [selected, nodes, onSelectionChange]);

  const onWrapPointerDown = (e) => {
    if (!readOnly && (e.target.closest('.node') || e.target.closest('.port') || e.target.closest('.edge-hit'))) return;
    if (e.button !== 0 && e.button !== 1) return;
    if (pendingConn) return;
    if (!readOnly) { setSelected(null); setCtxMenu(null); }
    panRef.current = { active: true, sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
    wrapRef.current.classList.add('panning');
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e) => {
      if (panRef.current.active) {
        setPan({ x: panRef.current.px + (e.clientX - panRef.current.sx), y: panRef.current.py + (e.clientY - panRef.current.sy) });
      }
      if (dragRef.current) {
        const dx = (e.clientX - dragRef.current.sx) / zoom;
        const dy = (e.clientY - dragRef.current.sy) / zoom;
        setNodes(ns => ns.map(n => n.id === dragRef.current.id ? { ...n, x: dragRef.current.nx + dx, y: dragRef.current.ny + dy } : n));
      }
      if (pendingConn) {
        const r = wrapRef.current.getBoundingClientRect();
        const cursor = { x: (e.clientX - r.left - pan.x) / zoom, y: (e.clientY - r.top - pan.y) / zoom };
        setPendingConn(pc => pc ? { ...pc, cursor } : pc);
      }
    };
    const onUp = () => {
      if (panRef.current.active) { panRef.current.active = false; wrapRef.current?.classList.remove('panning'); }
      if (dragRef.current) { dragRef.current = null; snapshot(); }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [zoom, pan, pendingConn, snapshot]);

  /** Wheel: pinch (ctrl+wheel) or mouse wheel → zoom; trackpad two-finger scroll → pan. Uses non-passive listener so preventDefault works. */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const LINE = WheelEvent.DOM_DELTA_LINE;
    const PAGE = WheelEvent.DOM_DELTA_PAGE;
    const PIXEL = WheelEvent.DOM_DELTA_PIXEL;
    const onWheel = (e) => {
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);

      // Chromium / Safari: trackpad pinch-to-zoom is delivered as wheel + ctrlKey
      if (e.ctrlKey) {
        e.preventDefault();
        // Zoom toward cursor position
        const r = el.getBoundingClientRect();
        const cx = e.clientX - r.left;
        const cy = e.clientY - r.top;
        const prevZoom = zoomRef.current;
        const prevPan = panValRef.current;
        const nextZoom = Math.min(2, Math.max(0.35, prevZoom + -e.deltaY * 0.002));
        const ratio = nextZoom / prevZoom;
        setZoom(nextZoom);
        setPan({ x: cx - (cx - prevPan.x) * ratio, y: cy - (cy - prevPan.y) * ratio });
        return;
      }

      // Mouse wheel (line/page steps, or one large pixel “notch”) → zoom
      const mouseLikeZoom =
        e.deltaMode === LINE ||
        e.deltaMode === PAGE ||
        (e.deltaMode === PIXEL && absY >= 32 && absY > absX * 1.4);

      if (mouseLikeZoom && absY >= absX) {
        e.preventDefault();
        let dz;
        if (e.deltaMode === LINE) dz = -Math.sign(e.deltaY || 1) * 0.09;
        else if (e.deltaMode === PAGE) dz = -Math.sign(e.deltaY || 1) * 0.22;
        else dz = Math.max(-0.22, Math.min(0.22, -e.deltaY * 0.0022));
        setZoom((z) => Math.min(2, Math.max(0.35, z + dz)));
        return;
      }

      // Trackpad scroll (mostly small pixel deltas) → pan canvas
      e.preventDefault();
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onNodePointerDown = (e, node) => {
    if (readOnly) return;
    if (node.type === 'definition') return;
    if (e.target.closest('.port') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('button.answer-remove') || e.target.closest('button.node-add-answer') || e.target.closest('.node-menu')) return;
    e.stopPropagation();
    setSelected({ type: 'node', id: node.id });
    dragRef.current = { id: node.id, sx: e.clientX, sy: e.clientY, nx: node.x, ny: node.y };
    setHistory(h => ({ past: [...h.past.slice(-30), { nodes, edges }], future: [] }));
  };

  const startConn = (e, node, portId) => {
    if (readOnly) return;
    e.stopPropagation();
    const p = getDomPortPos(node, portId);
    setPendingConn({ fromNode: node.id, fromPort: portId, cursor: p });
    wrapRef.current.classList.add('connecting');
  };

  const finishConn = (e, toNode, toPortId) => {
    e.stopPropagation();
    if (!pendingConn) return;
    if (pendingConn.fromNode === toNode.id) { setPendingConn(null); wrapRef.current.classList.remove('connecting'); return; }
    snapshot();
    setEdges(es => {
      const filtered = es.filter(e => !(e.from === pendingConn.fromNode && e.fromPort === pendingConn.fromPort));
      return [...filtered, { id: 'e' + Date.now(), from: pendingConn.fromNode, fromPort: pendingConn.fromPort, to: toNode.id, toPort: toPortId }];
    });
    setPendingConn(null);
    wrapRef.current.classList.remove('connecting');
    toast('Connection created');
  };

  const deleteNode = useCallback((id) => {
    const target = nodes.find(n => n.id === id);
    if (target?.type === 'definition') return;
    snapshot();
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.from !== id && e.to !== id));
    setSelected(null);
    toast('Node deleted');
  }, [snapshot, toast, nodes]);

  const deleteEdge = useCallback((id) => {
    snapshot();
    setEdges(es => es.filter(e => e.id !== id));
    setSelected(null);
  }, [snapshot]);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') { setPendingConn(null); setCtxMenu(null); wrapRef.current?.classList.remove('connecting'); } };
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !e.target.matches('input,textarea')) {
        if (selected.type === 'node') deleteNode(selected.id);
        else if (selected.type === 'edge') deleteEdge(selected.id);
      }
    };
    window.addEventListener('keydown', onEsc);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onEsc); window.removeEventListener('keydown', onKey); };
  }, [selected, undo, redo, deleteNode, deleteEdge]);

  const updateNode = useCallback((id, patch) => setNodes(ns => ns.map(n => n.id === id ? { ...n, ...patch } : n)), []);

  useEffect(() => { onNodesChange?.(nodes); }, [nodes, onNodesChange]);
  useEffect(() => { onGraphChange?.({ nodes, edges }); }, [nodes, edges, onGraphChange]);

  const addNode = useCallback((type) => {
    snapshot();
    const cx = -pan.x / zoom + (wrapRef.current?.clientWidth || 800) / (2 * zoom) - NODE_W / 2;
    const cy = -pan.y / zoom + (wrapRef.current?.clientHeight || 600) / (2 * zoom) - 60;
    const base = { id: 'n' + Date.now(), x: cx, y: cy };
    if (type === 'decision') setNodes(ns => [...ns, { ...base, type, title: 'New decision?', answers: [{ id: 'a' + Math.random(), label: 'Yes', rationale: '' }, { id: 'a' + Math.random(), label: 'No', rationale: '' }] }]);
    else if (type === 'action') setNodes(ns => [...ns, { ...base, type, title: 'New action', description: 'Describe what happens here.', assignee: 'Unassigned', materials: [] }]);
    else if (type === 'publish') setNodes(ns => [...ns, { ...base, type, title: 'Publish to Portal' }]);
    else if (type === 'handler') setNodes(ns => [...ns, { ...base, type, name: 'New Handler', role: 'Role', email: '', hiddenFromResearchers: true }]);
    toast(`${type[0].toUpperCase() + type.slice(1)} node added`);
  }, [pan, zoom, snapshot, toast]);

  const jumpToNode = useCallback((nodeId) => {
    const n = nodes.find(x => x.id === nodeId);
    if (!n) return;
    const w = wrapRef.current;
    setZoom(1);
    setPan({ x: w.clientWidth / 2 - (n.x + NODE_W / 2), y: w.clientHeight / 2 - (n.y + nodeHeight(n) / 2) });
    setSelected({ type: 'node', id: nodeId });
  }, [nodes]);

  const applyAssistantOperations = useCallback((operations) => {
    if (!Array.isArray(operations) || !operations.length) {
      return { applied: 0, skipped: [], nodes, edges };
    }
    snapshot();
    const result = applyAssistantOperationsToGraph(nodes, edges, operations);
    setNodes(result.nodes);
    setEdges(result.edges);
    return result;
  }, [nodes, edges, snapshot]);

  useEffect(() => {
    registerAdders({
      addNode,
      fixIssue: (iss) => jumpToNode(iss.nodeId),
      updateNode,
      applyAssistantOperations,
      undo,
    });
  }, [addNode, jumpToNode, updateNode, applyAssistantOperations, undo, registerAdders]);

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);

  const edgeEls = edges.map(e => {
    const a = nodeMap[e.from], b = nodeMap[e.to];
    if (!a || !b) return null;
    const p1 = getDomPortPos(a, e.fromPort), p2 = getDomPortPos(b, e.toPort);
    const d = bezier(p1, p2);
    const isSel = selected?.type === 'edge' && selected.id === e.id;
    let label = '';
    if (a.type === 'decision' && e.fromPort !== 'out') {
      const idx = a.answers?.findIndex(ans => ans.id === e.fromPort);
      if (idx >= 0) label = String(idx + 1);
    }
    const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
    return (
      <g key={e.id}>
        <path className="edge-hit" d={d} onClick={(ev) => { if (readOnly) return; ev.stopPropagation(); setSelected({ type: 'edge', id: e.id }); }} />
        <path className={`edge-path ${isSel ? 'selected' : ''}`} d={d} markerEnd="url(#arrowhead)" />
        {label && (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={midX} cy={midY} r={9} fill="white" stroke="var(--purple-600)" strokeWidth="1.2" />
            <text x={midX} y={midY + 3.5} textAnchor="middle" fontSize="9" fontFamily="'JetBrains Mono', monospace" fill="var(--purple-700)" fontWeight="700">{label}</text>
          </g>
        )}
      </g>
    );
  });

  return (
    <div ref={wrapRef} className="canvas-wrap" onPointerDown={onWrapPointerDown} onClick={() => { setCtxMenu(null); setShowManagePeople(false); }}>
      <div className={`canvas${animating ? ' preview-transitioning' : ''}`} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        <svg className="edges-svg">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3.5" orient="auto">
              <polygon points="0 0, 8 3.5, 0 7" fill="var(--ink-400)" />
            </marker>
          </defs>
          {edgeEls}
          {pendingConn && (() => {
            const fn = nodeMap[pendingConn.fromNode];
            if (!fn) return null;
            const p1 = getDomPortPos(fn, pendingConn.fromPort);
            return <path className="edge-preview" d={bezier(p1, pendingConn.cursor)} />;
          })()}
        </svg>
        {/* ── Dashed "hidden from researchers" bounding box ── */}
        {(() => {
          const hiddenPeople = nodes.filter(n => n.type === 'handler' && n.hiddenFromResearchers);
          if (hiddenPeople.length === 0) return null;
          const pad = 32;
          const minX = Math.min(...hiddenPeople.map(n => n.x)) - pad;
          const minY = Math.min(...hiddenPeople.map(n => n.y)) - pad;
          const maxX = Math.max(...hiddenPeople.map(n => n.x + NODE_W)) + pad;
          const maxY = Math.max(...hiddenPeople.map(n => n.y + nodeHeight(n))) + pad;
          return (
            <div key="hidden-bbox" style={{
              position: 'absolute', left: minX, top: minY,
              width: maxX - minX, height: maxY - minY,
              border: '2px dashed var(--ink-300)', borderRadius: 14,
              pointerEvents: 'none', zIndex: 0,
            }}>
              <div style={{
                position: 'absolute', top: -11, right: 16,
                background: 'var(--canvas-bg)', padding: '1px 10px',
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                color: 'var(--ink-400)', letterSpacing: 0.5,
                border: '1.5px dashed var(--ink-300)', borderRadius: 4,
              }}>Hidden from researchers</div>
            </div>
          );
        })()}

        {nodes.map(n => (
          <NodeView
            key={n.id} node={n}
            selected={!readOnly && selected?.type === 'node' && selected.id === n.id}
            onPointerDown={(e) => onNodePointerDown(e, n)}
            onUpdate={(patch) => updateNode(n.id, patch)}
            onDelete={() => deleteNode(n.id)}
            onDuplicate={() => { snapshot(); const copy = { ...n, id: 'n' + Date.now(), x: n.x + 40, y: n.y + 40, answers: n.answers?.map(a => ({ ...a, id: 'a' + Math.random(), rationaleExpanded: false })) }; setNodes(ns => [...ns, copy]); toast('Node duplicated'); }}
            onStartConn={startConn}
            onFinishConn={finishConn}
            onOpenMenu={(e, nodeId) => { if (readOnly) return; e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, nodeId }); }}
            hoverPort={hoverPort}
            setHoverPort={setHoverPort}
            pendingConn={pendingConn}
            edges={edges}
            readOnly={readOnly}
            registerPort={registerPort}
            onNodeMount={registerNodeEl}
          />
        ))}
      </div>

      {!readOnly && <div className="canvas-toolbar">
        {/* ── Mode toggle ── */}
        <div className="tb-segment">
          <button
            className={`tb-mode-btn ${toolbarGroup === 'edit' ? 'active' : ''}`}
            onClick={() => setToolbarGroup('edit')}
            title="Design mode"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
          </button>
          <button
            className={`tb-mode-btn ${toolbarGroup === 'ai' ? 'active ai' : ''}`}
            onClick={() => setToolbarGroup('ai')}
            title="AI mode"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.8 4.5L18.5 9.2l-4.7 1.8L12 16l-1.8-4.5L5.5 9.8l4.7-1.8z"/>
              <path d="M19 14.5l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z"/>
            </svg>
          </button>
        </div>

        <div className="tool-divider" />

        {/* ── Design-mode tools ── */}
        {toolbarGroup === 'edit' && (<>
          <button className="tool-btn" onClick={() => addNode('decision')}><Icon.Plus /> Decision</button>
          <button className="tool-btn" onClick={() => addNode('action')}><Icon.Plus /> Action</button>
          <button className="tool-btn" onClick={() => addNode('handler')}><Icon.Plus /> Handler</button>
          <div className="tool-divider" />
        </>)}

        {/* ── AI-mode tools ── */}
        {toolbarGroup === 'ai' && (<>
          <button className="tool-btn tool-btn-ai" onClick={() => regenRef.current?.click()} title="Re-upload a file and regenerate the flow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Regenerate
          </button>
          <input ref={regenRef} type="file" hidden accept=".pdf,.doc,.docx,.txt" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { toast(`Re-analyzing "${f.name}"…`); e.target.value = ''; }
          }} />
          <button className="tool-btn tool-btn-ai" onClick={() => {
            snapshot();
            const result = autoLayoutBuilderGraph({ nodes, edges });
            setNodes(result.nodes);
            // Re-run the post-render normalize pass against fresh DOM heights.
            hasNormalizedRef.current = false;
            toast('Auto-layout applied');
          }} title="Re-run tidy-tree auto-layout">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="10" rx="1"/><rect x="14" y="16" width="7" height="5" rx="1"/>
            </svg>
            Auto-layout
          </button>
          <div className="tool-divider" />
        </>)}

        {/* ── Common tools ── */}
        <button className="tool-btn tool-btn-icon" onClick={undo} title="Undo (⌘Z)"><Icon.Undo /></button>
        <button className="tool-btn tool-btn-icon" onClick={redo} title="Redo (⌘⇧Z)"><Icon.Redo /></button>

        {/* ── Design-mode: Manage contacts ── */}
        {toolbarGroup === 'edit' && (<>
          <div className="tool-divider" />
          <div style={{ position: 'relative' }}>
            <button
              className="tool-btn tool-btn-icon"
              onClick={(e) => { e.stopPropagation(); setShowManagePeople(v => !v); }}
              title="Manage contacts"
              style={{ background: showManagePeople ? 'var(--purple-50)' : undefined, color: showManagePeople ? 'var(--purple-800)' : undefined }}
            ><Icon.People /></button>
            {showManagePeople && (() => {
              const peopleNodes = nodes.filter(n => n.type === 'handler');
              return (
                <div className="manage-people-panel" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} style={{ width: 360 }}>
                  <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--ink-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon.People style={{ color: 'var(--purple-700)' }} />
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-900)' }}>Manage Contacts</span>
                      <span style={{ fontSize: 11, background: 'var(--purple-100)', color: 'var(--purple-700)', borderRadius: 8, padding: '1px 7px', fontWeight: 600 }}>{peopleNodes.length}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => addNode('handler')} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 5, background: 'var(--purple-700)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Icon.Plus /> Add</button>
                      <button onClick={() => setShowManagePeople(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-400)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
                    </div>
                  </div>
                  <div style={{ padding: '8px 16px', background: 'var(--ink-50)', borderBottom: '1px solid var(--ink-200)', display: 'flex', gap: 16, fontSize: 10.5, color: 'var(--ink-500)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--purple-600)', display: 'inline-block' }} /> Visible to researchers</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ink-400)', display: 'inline-block' }} /> Hidden from researchers</span>
                  </div>
                  <div style={{ maxHeight: 440, overflowY: 'auto' }}>
                    {peopleNodes.length === 0 ? (
                      <div style={{ padding: '32px 16px', color: 'var(--ink-500)', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
                        No reviewer nodes yet.<br/>
                        <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>Click <strong>+ Add</strong> above or use <strong>+ Handler</strong> on the canvas.</span>
                      </div>
                    ) : peopleNodes.map((n, i) => (
                      <ManagePeopleRow key={n.id} node={n} isLast={i === peopleNodes.length - 1}
                        onUpdate={(patch) => updateNode(n.id, patch)}
                        onDelete={() => deleteNode(n.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </>)}
      </div>}

      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => setZoom(z => Math.min(2, z + 0.1))}><Icon.ZoomIn /></button>
        <div className="zoom-label">{Math.round(zoom * 100)}%</div>
        <button className="zoom-btn" onClick={() => setZoom(z => Math.max(0.35, z - 0.1))}><Icon.ZoomOut /></button>
        <button className="zoom-btn" onClick={() => { setZoom(1); setPan({ x: 40, y: 40 }); }}><Icon.Fit /></button>
      </div>

      {ctxMenu && nodes.find(x => x.id === ctxMenu.nodeId)?.type !== 'definition' && (
        <div className="ctx-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <div className="ctx-item" onClick={() => { const n = nodes.find(x => x.id === ctxMenu.nodeId); if (n) { snapshot(); const copy = { ...n, id: 'n' + Date.now(), x: n.x + 40, y: n.y + 40, answers: n.answers?.map(a => ({ ...a, id: 'a' + Math.random(), rationaleExpanded: false })) }; setNodes(ns => [...ns, copy]); } setCtxMenu(null); }}><Icon.Copy /> Duplicate <kbd>⌘D</kbd></div>
          <div className="ctx-divider" />
          <div className="ctx-item danger" onClick={() => { deleteNode(ctxMenu.nodeId); setCtxMenu(null); }}><Icon.Trash /> Delete <kbd>⌫</kbd></div>
        </div>
      )}
    </div>
  );
}

// ── Preview Panel ────────────────────────────────────────────
function PreviewPanel({ allNodes, flowTitle }) {
  const defNode = allNodes.find(n => n.type === 'definition');
  const people = allNodes.filter(n => n.type === 'handler');
  const materials = allNodes
    .filter(n => n.type === 'action')
    .flatMap(n => (n.materials || []).filter(m => m.attachKind && m.attachValue));

  const SectionLabel = ({ children }) => (
    <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-400)', fontFamily: 'var(--font-subheading)', marginBottom: 10 }}>{children}</div>
  );

  return (
    <aside className="rightpanel">
      <div className="rp-tabs">
        <div className="rp-tab active">
          <Icon.Eye /> Flow Summary
        </div>
      </div>
      <div className="rp-body" style={{ gap: 0, padding: 0 }}>

        <div style={{ padding: '18px 16px 16px' }}>
          <SectionLabel>Definition</SectionLabel>
          {defNode ? (
            <>
              <div style={{ fontFamily: 'var(--font-headline)', fontSize: 14, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 6 }}>{defNode.title}</div>
              <p style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--ink-700)', margin: 0 }}>{defNode.body}</p>
            </>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--ink-400)', margin: 0, fontStyle: 'italic' }}>No definition node on canvas.</p>
          )}
        </div>

        <div style={{ height: 1, background: 'var(--ink-200)', margin: '0 16px' }} />

        <div style={{ padding: '16px 16px 16px' }}>
          <SectionLabel>Offices &amp; Contacts</SectionLabel>
          {people.length === 0
            ? <p style={{ fontSize: 12, color: 'var(--ink-400)', margin: 0, fontStyle: 'italic' }}>No contacts added.</p>
            : people.map((n, i) => {
                const initials = (n.name || 'N').split(' ').map(w => w[0]).join('').slice(0, 2);
                return (
                  <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: i === 0 ? 0 : 9, marginTop: i === 0 ? 0 : 9 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: colorFor(n.name || 'N'), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{n.role}{n.email ? ` · ${n.email}` : ''}</div>
                    </div>
                    {n.hiddenFromResearchers && (
                      <span style={{ fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace", background: 'var(--ink-100)', color: 'var(--ink-500)', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>Internal</span>
                    )}
                  </div>
                );
              })
          }
        </div>

        <div style={{ height: 1, background: 'var(--ink-200)', margin: '0 16px' }} />

        <div style={{ padding: '16px 16px 16px' }}>
          <SectionLabel>Templates &amp; Resources</SectionLabel>
          {materials.length === 0
            ? <p style={{ fontSize: 12, color: 'var(--ink-400)', margin: 0, fontStyle: 'italic' }}>No resources attached.</p>
            : materials.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 9, paddingTop: i === 0 ? 0 : 9, marginTop: i === 0 ? 0 : 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.attachKind === 'pdf' ? 'oklch(0.95 0.04 25)' : 'var(--purple-50)' }}>
                    {m.attachKind === 'pdf'
                      ? <Icon.File style={{ width: 13, height: 13, color: 'oklch(0.52 0.14 25)' }} />
                      : <Icon.Link style={{ width: 13, height: 13, color: 'var(--purple-700)' }} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label || m.attachValue}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.attachValue}</div>
                  </div>
                  <span style={{ fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace", padding: '2px 6px', borderRadius: 4, flexShrink: 0, textTransform: 'uppercase', background: m.attachKind === 'pdf' ? 'oklch(0.93 0.04 25)' : 'var(--purple-100)', color: m.attachKind === 'pdf' ? 'oklch(0.45 0.14 25)' : 'var(--purple-700)' }}>{m.attachKind}</span>
                </div>
              ))
          }
        </div>

      </div>
    </aside>
  );
}

// ── Right Panel ──────────────────────────────────────────────

function InspectSettings({ selection, allNodes, flowDescription, setFlowDescription, onUpdateNode }) {
  // Hooks must be at the top, before any conditional returns
  const matFileRef = useRef(null);
  const [pendingMatId, setPendingMatId] = useState(null);

  const handleMatFile = (e) => {
    const f = e.target.files?.[0];
    if (!f || !pendingMatId || !selection?.data) return;
    const n = selection.data;
    onUpdateNode(n.id, {
      materials: (n.materials || []).map(m =>
        m.id === pendingMatId ? { ...m, attachKind: 'pdf', attachValue: f.name } : m
      ),
    });
    e.target.value = '';
    setPendingMatId(null);
  };

  // ── Flow-level view (nothing selected, or edge selected) ──
  if (!selection || selection.type === 'edge') {
    const peopleNodes = (allNodes || []).filter(n => n.type === 'handler');
    const actionNodes = (allNodes || []).filter(n => n.type === 'action');
    const allMaterials = actionNodes.flatMap(n =>
      (n.materials || []).map(m => ({ ...m, fromAction: n.title }))
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="inspect-section">
          <div className="rp-section-label">Flow Description</div>
          <textarea
            className="inspect-textarea"
            placeholder="Describe this flow or paste AI-extracted summary…"
            value={flowDescription || ''}
            onChange={(e) => setFlowDescription(e.target.value)}
            rows={4}
          />
        </div>
        <div className="inspect-section">
          <div className="rp-section-label">Related Offices & Contacts · {peopleNodes.length}</div>
          {peopleNodes.length === 0
            ? <div className="inspect-empty">No Handler nodes yet. Add handlers on the canvas.</div>
            : peopleNodes.map(n => (
              <div key={n.id} className="inspect-contact-card">
                <div className="inspect-avatar" style={{ background: colorFor(n.name) }}>
                  {(n.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{n.role}</div>
                  {n.email && <div style={{ fontSize: 11, color: 'var(--purple-700)', marginTop: 1 }}>{n.email}</div>}
                </div>
                {n.hiddenFromResearchers && (
                  <span className="inspect-badge" style={{ background: 'var(--ink-100)', color: 'var(--ink-500)' }}>Hidden</span>
                )}
              </div>
            ))
          }
        </div>
        <div className="inspect-section">
          <div className="rp-section-label">Templates & Resources · {allMaterials.length}</div>
          {allMaterials.length === 0
            ? <div className="inspect-empty">No materials added to Action nodes yet.</div>
            : allMaterials.map((m, i) => (
              <div key={m.id || i} className="inspect-material-item">
                <span className="inspect-badge" style={
                  m.attachKind === 'url'
                    ? { background: 'var(--purple-50)', color: 'var(--purple-700)' }
                    : { background: 'oklch(0.94 0.04 155)', color: 'oklch(0.32 0.12 155)' }
                }>{m.attachKind === 'url' ? 'URL' : m.attachKind === 'pdf' ? 'PDF' : '—'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label || 'Untitled'}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>from {m.fromAction}</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    );
  }

  // ── Node-level view ──
  if (selection.type === 'node') {
    const n = selection.data;
    if (!n) return <div className="inspect-empty">Node not found.</div>;

    // ── Decision node ──
    if (n.type === 'decision') {
      const updateAnswer = (aid, label) =>
        onUpdateNode(n.id, { answers: n.answers.map(a => a.id === aid ? { ...a, label } : a) });
      const updateAnswerRationale = (aid, rationale) =>
        onUpdateNode(n.id, { answers: n.answers.map(a => a.id === aid ? { ...a, rationale } : a) });
      const deleteAnswer = (aid) =>
        onUpdateNode(n.id, { answers: n.answers.filter(a => a.id !== aid) });
      const addAnswer = () =>
        onUpdateNode(n.id, { answers: [...(n.answers || []), { id: 'a' + Math.random().toString(36).slice(2), label: 'New option', rationale: '' }] });

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="inspect-section">
            <div className="rp-section-label">Decision Question</div>
            <input className="inspect-input" value={n.title || ''} onChange={(e) => onUpdateNode(n.id, { title: e.target.value })} placeholder="Enter question…" />
          </div>
          <div className="inspect-section">
            <div className="rp-section-label">Branches · {n.answers?.length || 0}</div>
            {(n.answers || []).map((ans, i) => (
              <div key={ans.id} className="inspect-answer-block">
                <div className="inspect-answer-row">
                  <span className="inspect-answer-num">{i + 1}</span>
                  <input
                    className="inspect-input"
                    style={{ flex: 1 }}
                    value={ans.label}
                    onChange={(e) => updateAnswer(ans.id, e.target.value)}
                  />
                  <button
                    className="inspect-delete-btn"
                    onClick={() => deleteAnswer(ans.id)}
                    title="Delete branch"
                    disabled={(n.answers?.length || 0) <= 1}
                  >×</button>
                </div>
                <div className="inspect-sublabel">Rationale</div>
                <textarea
                  className="inspect-textarea inspect-rationale-ta"
                  rows={2}
                  value={ans.rationale || ''}
                  onChange={(e) => updateAnswerRationale(ans.id, e.target.value)}
                  placeholder="How the document supports this branch (one-line preview on canvas; click to expand)"
                />
              </div>
            ))}
            <button className="inspect-add-btn" onClick={addAnswer}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
              Add Branch
            </button>
          </div>
        </div>
      );
    }

    // ── Action node ──
    if (n.type === 'action') {
      const mats = n.materials || [];
      const updateMat = (mid, patch) =>
        onUpdateNode(n.id, { materials: mats.map(m => m.id === mid ? { ...m, ...patch } : m) });
      const deleteMat = (mid) =>
        onUpdateNode(n.id, { materials: mats.filter(m => m.id !== mid) });
      const addMat = () =>
        onUpdateNode(n.id, { materials: [...mats, { id: 'mat-' + Date.now(), label: 'New material', attachKind: null, attachValue: '' }] });

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="inspect-section">
            <div className="rp-section-label">Action Title</div>
            <input className="inspect-input" value={n.title || ''} onChange={(e) => onUpdateNode(n.id, { title: e.target.value })} placeholder="Title…" />
          </div>
          <div className="inspect-section">
            <div className="rp-section-label">Description</div>
            <textarea className="inspect-textarea" rows={3} value={n.description || ''} onChange={(e) => onUpdateNode(n.id, { description: e.target.value })} placeholder="Describe what happens…" />
          </div>
          <div className="inspect-section">
            <div className="rp-section-label">Assigned To</div>
            <input className="inspect-input" value={n.assignee || ''} onChange={(e) => onUpdateNode(n.id, { assignee: e.target.value })} placeholder="Office or person…" />
          </div>
          <div className="inspect-section">
            <div className="rp-section-label">Materials Prepared · {mats.length}</div>
            {mats.map((m) => (
              <div key={m.id} className="inspect-mat-card">
                {/* Label row */}
                <div className="inspect-mat-header">
                  <input
                    className="inspect-input"
                    style={{ flex: 1, fontSize: 12 }}
                    value={m.label}
                    onChange={(e) => updateMat(m.id, { label: e.target.value })}
                    placeholder="Material name…"
                  />
                  <button className="inspect-delete-btn" onClick={() => deleteMat(m.id)} title="Remove material">×</button>
                </div>
                {/* Attach type toggle */}
                <div className="inspect-attach-row">
                  <button
                    className={`inspect-attach-btn ${m.attachKind === 'url' ? 'active url' : ''}`}
                    onClick={() => updateMat(m.id, m.attachKind === 'url' ? { attachKind: null, attachValue: '' } : { attachKind: 'url', attachValue: '' })}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    Link
                  </button>
                  <button
                    className={`inspect-attach-btn ${m.attachKind === 'pdf' ? 'active pdf' : ''}`}
                    onClick={() => { setPendingMatId(m.id); matFileRef.current?.click(); }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    {m.attachKind === 'pdf' && m.attachValue ? m.attachValue : 'Upload PDF'}
                  </button>
                </div>
                {/* URL input */}
                {m.attachKind === 'url' && (
                  <input
                    className="inspect-input"
                    style={{ fontSize: 11.5, marginTop: 4 }}
                    placeholder="https://…"
                    value={m.attachValue || ''}
                    onChange={(e) => updateMat(m.id, { attachValue: e.target.value })}
                  />
                )}
              </div>
            ))}
            <input ref={matFileRef} type="file" hidden accept=".pdf,.doc,.docx" onChange={handleMatFile} />
            <button className="inspect-add-btn" onClick={addMat}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
              Add Material
            </button>
          </div>
        </div>
      );
    }

    // ── People node ──
    if (n.type === 'handler') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="inspect-section">
          <div className="rp-section-label">Name</div>
          <input className="inspect-input" value={n.name || ''} onChange={(e) => onUpdateNode(n.id, { name: e.target.value })} placeholder="Full name…" />
        </div>
        <div className="inspect-section">
          <div className="rp-section-label">Role / Office</div>
          <input className="inspect-input" value={n.role || ''} onChange={(e) => onUpdateNode(n.id, { role: e.target.value })} placeholder="Role or department…" />
        </div>
        <div className="inspect-section">
          <div className="rp-section-label">Email</div>
          <input className="inspect-input" type="email" value={n.email || ''} onChange={(e) => onUpdateNode(n.id, { email: e.target.value })} placeholder="email@uw.edu" />
        </div>
        <div className="inspect-section">
          <div className="rp-section-label">Researcher Visibility</div>
          <div className="inspect-vis-toggle" onClick={() => onUpdateNode(n.id, { hiddenFromResearchers: !n.hiddenFromResearchers })}>
            <div className="inspect-vis-track" style={{ background: n.hiddenFromResearchers ? 'var(--ink-300)' : 'var(--purple-700)' }}>
              <div className="inspect-vis-thumb" style={{ transform: n.hiddenFromResearchers ? 'translateX(0)' : 'translateX(14px)' }} />
            </div>
            <span style={{ fontSize: 12.5, color: 'var(--ink-700)' }}>
              {n.hiddenFromResearchers ? 'Hidden from researchers' : 'Visible to researchers'}
            </span>
          </div>
        </div>
      </div>
    );

    // ── Publish / other ──
    return (
      <div className="inspect-section">
        <div className="rp-section-label">Title</div>
        <input className="inspect-input" value={n.title || ''} onChange={(e) => onUpdateNode(n.id, { title: e.target.value })} placeholder="Title…" />
      </div>
    );
  }

  return null;
}

function AiSourceInputs({ url, setUrl, file, setFile, desc, setDesc, compact = false }) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = React.useRef(null);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };
  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };
  const GlobeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18"/>
    </svg>
  );
  const UploadIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
  const optLabel = compact ? ' — optional' : (
    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--ink-400)' }}> — optional</span>
  );
  return (
    <div className={'ai-source-fields' + (compact ? ' ai-source-fields--compact' : '')}>
      <div>
        <div className="nf-field-label">Import from URL{optLabel}</div>
        <div className="nf-url-wrap">
          <GlobeIcon style={{ color: 'var(--ink-400)', flexShrink: 0 }} />
          <input className="nf-url-input" placeholder="https://policy.uw.edu/…" value={url} onChange={(e) => setUrl(e.target.value)} />
          {url ? (
            <button type="button" style={{ color: 'var(--ink-400)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
              onClick={() => setUrl('')} aria-label="Clear URL"><Icon.X /></button>
          ) : null}
        </div>
      </div>
      <div>
        <div className="nf-field-label">Upload a document{optLabel}</div>
        {file ? (
          <div className="nf-file-chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
            <span style={{ color: 'var(--purple-500)', fontSize: 11 }}>{Math.round(file.size / 1024)} KB</span>
            <button type="button" style={{ color: 'var(--ink-400)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
              onClick={() => setFile(null)} aria-label="Remove file"><Icon.X /></button>
          </div>
        ) : (
          <div className={'nf-drop' + (dragOver ? ' drag-over' : '') + (compact ? ' nf-drop--compact' : '')}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}>
            <div className="nf-drop-icon"><UploadIcon /></div>
            <div className="nf-drop-title">{compact ? 'Drop or browse' : 'Drag a file here'}</div>
            {!compact && (
              <div className="nf-drop-sub">Drop a PDF, DOC, DOCX, or TXT — or <span className="nf-drop-link">browse to upload</span></div>
            )}
            <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>PDF · DOC · DOCX · TXT</div>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" hidden onChange={handleFile} />
      </div>
      <div>
        <div className="nf-field-label">Instructions or text{optLabel}</div>
        <textarea className="nf-desc" placeholder="Describe what to change in this flow, or paste policy text…"
          value={desc} onChange={(e) => setDesc(e.target.value)} rows={compact ? 3 : 3} />
      </div>
    </div>
  );
}

function AiAssistantPanel({ graph, flowTitle, onApplyAssistantOperations, onUndo, toast }) {
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState('');
  const [lastResult, setLastResult] = useState(null);

  const buildSourceText = async () => buildFile2flowSourceText({ desc, file, url });

  const runAssistant = async () => {
    setBusy(true);
    setError('');
    setPlan('');
    setLastResult(null);
    try {
      const sourceText = await buildSourceText();
      if (!sourceText && !url.trim()) throw new Error('Add instructions, upload a file, or paste text.');
      const ctx = graphToAssistantContext(graph);
      const res = await fetch(`${API_BASE}/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText: sourceText || 'Apply updates based on the linked source.',
          sourceUrl: url.trim() || null,
          flowName: flowTitle || 'Current flow',
          graph: ctx,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assistant request failed');
      setPlan(data.plan || '');
      if (!data.operations?.length) {
        toast(data.plan || 'No changes suggested.');
        setLastResult({ applied: 0, skipped: [] });
        return;
      }
      if (!onApplyAssistantOperations) throw new Error('Canvas is not ready.');
      const result = onApplyAssistantOperations(data.operations);
      setLastResult(result);
      const skippedN = result.skipped?.length || 0;
      toast(
        skippedN
          ? `Applied ${result.applied} change(s); ${skippedN} skipped. Undo with ⌘Z.`
          : `Applied ${result.applied} change(s). Undo with ⌘Z.`,
        { duration: 4500 },
      );
    } catch (e) {
      const msg = e.message || 'Assistant failed';
      setError(msg);
      toast(msg, { duration: 5000 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rp-assistant">
      <AiSourceInputs url={url} setUrl={setUrl} file={file} setFile={setFile} desc={desc} setDesc={setDesc} compact />
      {busy && (
        <div className="rp-assistant-status">
          <span className="nf-ai-spinner" style={{ width: 14, height: 14 }} />
          Analyzing workflow and planning edits…
        </div>
      )}
      {error && (
        <div className="nf-ai-error">
          <div className="nf-ai-error-title">Request failed</div>
          <div className="nf-ai-error-body">{error}</div>
        </div>
      )}
      {plan && !busy && (
        <div className="rp-assistant-plan">
          <div className="rp-section-label" style={{ marginBottom: 6 }}>Plan</div>
          <p>{plan}</p>
          {lastResult && lastResult.applied > 0 && (
            <p className="rp-assistant-hint">Changes are on the canvas. Press <kbd>⌘Z</kbd> or Undo to revert.</p>
          )}
        </div>
      )}
      <div className="rp-assistant-actions">
        <button type="button" className="btn-ai rp-assistant-run" onClick={runAssistant} disabled={busy}>
          <Icon.Sparkles style={{ width: 14, height: 14 }} />
          {busy ? 'Working…' : 'Apply AI edits'}
        </button>
        {onUndo && (
          <button type="button" className="btn btn-secondary rp-assistant-undo" onClick={onUndo} title="Undo (⌘Z)">
            <Icon.Undo style={{ width: 14, height: 14 }} /> Undo
          </button>
        )}
      </div>
    </div>
  );
}

function RightPanel({
  issues,
  suggestions,
  onGoToNode,
  onApplySuggestion,
  toast,
  graph,
  flowTitle,
  onApplyAssistantOperations,
  onUndo,
}) {
  const [rpTab, setRpTab] = useState('inspection');
  const [dismissed, setDismissed] = useState(new Set());

  const dismiss = (id) => setDismissed(d => new Set([...d, id]));
  const handleRecheck = () => { setDismissed(new Set()); toast('Re-checked flow ✓'); };

  const visibleIssues = issues.filter(i => !dismissed.has(i.id));
  const visibleSuggestions = suggestions.filter(s => !dismissed.has(s.id));

  return (
    <aside className="rightpanel">
      <div className="rp-tabs">
        <button
          type="button"
          className={'rp-tab' + (rpTab === 'inspection' ? ' active' : '')}
          onClick={() => setRpTab('inspection')}
        >
          <Icon.Sparkles /> AI Inspection
          {visibleIssues.length > 0 && <span className="rp-badge">{visibleIssues.length}</span>}
        </button>
        <button
          type="button"
          className={'rp-tab' + (rpTab === 'assistant' ? ' active' : '')}
          onClick={() => setRpTab('assistant')}
        >
          <Icon.Msg /> AI Assistant
        </button>
      </div>

      {rpTab === 'assistant' ? (
        <div className="rp-body rp-body--assistant">
          <AiAssistantPanel
            graph={graph}
            flowTitle={flowTitle}
            onApplyAssistantOperations={onApplyAssistantOperations}
            onUndo={onUndo}
            toast={toast}
          />
        </div>
      ) : (
      <div className="rp-body">
        <div className="rp-section-label rp-issues-head">
          <span className="rp-issues-head-title">
            <Icon.Alert style={{ color: 'var(--accent-red)' }} /> Issues · {visibleIssues.length}
          </span>
          <button
            type="button"
            className="icon-btn rp-recheck-icon"
            onClick={handleRecheck}
            title="Re-check flow"
            aria-label="Re-check flow"
          >
            <Icon.RefreshCw style={{ width: 15, height: 15 }} />
          </button>
        </div>
        {visibleIssues.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-500)', padding: '6px 0 2px' }}>No issues. Your flow is valid. ✓</div>}
        {visibleIssues.map(iss => (
          <div key={iss.id} className={`issue-card ${iss.level === 'warn' ? 'warn' : ''}`}>
            <div className={`issue-head ${iss.level === 'warn' ? 'warn' : 'err'}`}><span className="dot" /> {iss.title}</div>
            <div className="issue-body">{iss.body}</div>
            <div className="issue-actions">
              {iss.nodeId && <button className="mini-btn" onClick={() => onGoToNode(iss)}>Go to node</button>}
              <button className="mini-btn" onClick={() => dismiss(iss.id)}>Dismiss</button>
            </div>
          </div>
        ))}

        <div className="rp-section-label rp-suggestions-head"><Icon.Sparkles style={{ color: 'var(--purple-700)' }} /> Suggestions</div>
        {visibleSuggestions.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-500)', padding: '6px 0 2px' }}>No suggestions.</div>}
        {visibleSuggestions.map(s => (
          <div key={s.id} className="suggest-card">
            <div className="issue-head tip"><span className="dot" /> {s.title}</div>
            <div className="issue-body">{s.body}</div>
            <div className="issue-actions">
              <button className="mini-btn primary" onClick={() => { onApplySuggestion(s); dismiss(s.id); }}>Apply</button>
              <button className="mini-btn" onClick={() => dismiss(s.id)}>Dismiss</button>
            </div>
          </div>
        ))}
      </div>
      )}
    </aside>
  );
}

// ── Modals ───────────────────────────────────────────────────
function InviteModal({ open, onClose, collaborators, setCollaborators, toast }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Editor');
  if (!open) return null;

  const add = () => {
    if (!email.includes('@')) { toast('Enter a valid email'); return; }
    const initials = email.split('@')[0].split(/[._-]/).map(s => s[0]?.toUpperCase() || '').join('').slice(0, 2);
    setCollaborators(cs => [...cs, { id: 'c' + Date.now(), email, name: email.split('@')[0], initials, role }]);
    setEmail('');
    toast(`Invited ${email}`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Invite collaborators</h3>
          <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={onClose}><Icon.X /></button>
        </div>
        <div className="modal-body">
          <div className="invite-row">
            <input className="invite-input" placeholder="colleague@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
            <select className="role-select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option>Editor</option><option>Reviewer</option><option>Viewer</option>
            </select>
            <button className="btn btn-primary" onClick={add}>Invite</button>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-500)', margin: '4px 0 8px' }}>Who has access · {collaborators.length}</div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {collaborators.map(c => (
              <div className="collab-list-item" key={c.id}>
                <div className="avatar-lg" style={{ background: colorFor(c.email) }}>{c.initials}</div>
                <div><div className="collab-name">{c.name}</div><div className="collab-email">{c.email}</div></div>
                <span className="collab-role">{c.role}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: 10, background: 'var(--purple-50)', borderRadius: 6, border: '1px solid var(--purple-200)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <Icon.Link style={{ color: 'var(--purple-700)', flexShrink: 0 }} />
            <div style={{ flex: 1, color: 'var(--ink-700)' }}>
              <div style={{ fontWeight: 500 }}>General access · Department only</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>People in your department can view with the link.</div>
            </div>
            <button className="mini-btn" onClick={() => toast('Link copied')}>Copy link</button>
          </div>
        </div>
        <div className="modal-foot"><button className="btn btn-secondary" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}

function PublishModal({ open, onClose, issues, onPublish, isPublished, onUnpublish }) {
  if (!open) return null;
  const errs = issues.filter(i => i.level === 'err');
  const warns = issues.filter(i => i.level === 'warn');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Publish triage flow</h3>
          <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={onClose}><Icon.X /></button>
        </div>
        <div className="modal-body">
          <p style={{ margin: '0 0 8px', color: 'var(--ink-700)', fontSize: 13 }}>Once published, this flow will go live for all department intake. Documents arriving after publish will use this version.</p>
          <div>
            <div className="publish-step">
              <div className={`check-ic ${errs.length ? 'err' : 'ok'}`}>{errs.length ? <Icon.Alert /> : <Icon.Check />}</div>
              <div><div className="ps-title">Validation checks</div><div className="ps-sub">{errs.length === 0 ? 'All paths are connected and reachable.' : `${errs.length} blocking issue${errs.length > 1 ? 's' : ''} found — resolve before publishing.`}</div></div>
            </div>
            <div className="publish-step">
              <div className={`check-ic ${warns.length ? 'warn' : 'ok'}`}>{warns.length ? <Icon.Alert /> : <Icon.Check />}</div>
              <div><div className="ps-title">Review suggestions</div><div className="ps-sub">{warns.length === 0 ? 'No suggestions pending.' : `${warns.length} suggestion${warns.length > 1 ? 's' : ''} to consider (non-blocking).`}</div></div>
            </div>
            <div className="publish-step">
              <div className="check-ic ok"><Icon.Check /></div>
              <div><div className="ps-title">Approver signed off</div><div className="ps-sub">Dept. Director approval recorded on Apr 14.</div></div>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={errs.length > 0} style={errs.length ? { opacity: 0.5, cursor: 'not-allowed' } : {}} onClick={() => { onPublish(); onClose(); }}>
            <Icon.Globe /> Publish to production
          </button>
        </div>
        {isPublished && onUnpublish && (
          <div style={{ padding: '10px 20px 14px', borderTop: '1px solid var(--ink-200)', borderRadius: '0 0 12px 12px', background: 'oklch(0.99 0.005 25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-700)', marginBottom: 2 }}>Currently live on researcher portal</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>Unpublishing hides this flow from researchers but keeps all draft data.</div>
              </div>
              <button className="btn btn-danger" style={{ flexShrink: 0 }} onClick={() => { onUnpublish(); onClose(); }}>
                <Icon.EyeOff /> Unpublish
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Flowchart Library ─────────────────────────────────────────

const FLOW_CARDS = [];

function MiniFlowPreview({ nodes, edges, small = false }) {
  if (!nodes || !nodes.length) {
    // Generic placeholder skeleton
    return (
      <svg width="100%" height="100%" viewBox="0 0 120 60" preserveAspectRatio="xMidYMid meet"
        style={{ position: 'absolute', inset: 0, display: 'block' }}>
        <rect x="8" y="20" width="28" height="16" rx="3" fill="oklch(0.96 0.025 300)" stroke="oklch(0.75 0.10 300)" strokeWidth="0.8" />
        <path d="M36 28 C44 28 48 22 56 22" fill="none" stroke="oklch(0.75 0.008 280)" strokeWidth="1" />
        <path d="M36 28 C44 28 48 34 56 34" fill="none" stroke="oklch(0.75 0.008 280)" strokeWidth="1" />
        <rect x="56" y="16" width="28" height="14" rx="3" fill="oklch(0.94 0.04 155)" stroke="oklch(0.65 0.12 155)" strokeWidth="0.8" />
        <rect x="56" y="28" width="28" height="14" rx="3" fill="oklch(0.94 0.04 155)" stroke="oklch(0.65 0.12 155)" strokeWidth="0.8" />
        <path d="M84 23 L92 23" fill="none" stroke="oklch(0.75 0.008 280)" strokeWidth="1" />
        <path d="M84 35 L92 35" fill="none" stroke="oklch(0.75 0.008 280)" strokeWidth="1" />
        <rect x="92" y="19" width="22" height="10" rx="2" fill="oklch(0.91 0.06 220)" stroke="oklch(0.65 0.12 220)" strokeWidth="0.8" />
        <rect x="92" y="31" width="22" height="10" rx="2" fill="oklch(0.91 0.06 220)" stroke="oklch(0.65 0.12 220)" strokeWidth="0.8" />
      </svg>
    );
  }

  const svgW = small ? 88 : 280;
  const svgH = small ? 56 : 130;
  const pad = small ? 5 : 12;

  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs) + 240;
  const minY = Math.min(...ys), maxY = Math.max(...ys) + 100;
  const scale = Math.min((svgW - pad * 2) / (maxX - minX || 1), (svgH - pad * 2) / (maxY - minY || 1));
  const nW = 240 * scale;
  const nH = 60 * scale;
  const tx = x => pad + (x - minX) * scale;
  const ty = y => pad + (y - minY) * scale;

  const typeColor = {
    decision:   { fill: 'oklch(0.96 0.025 300)', stroke: 'oklch(0.72 0.10 300)' },
    action:     { fill: 'oklch(0.94 0.04 155)',  stroke: 'oklch(0.62 0.12 155)' },
    handler:    { fill: 'oklch(0.91 0.06 220)',  stroke: 'oklch(0.62 0.12 220)' },
    start:      { fill: 'var(--ink-200)',         stroke: 'var(--ink-400)'       },
    definition: { fill: 'oklch(0.95 0.04 200)',  stroke: 'oklch(0.52 0.12 200)' },
  };

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${svgW} ${svgH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', position: 'absolute', inset: 0 }}>
      {(edges || []).map(e => {
        const fn = nodes.find(n => n.id === e.from);
        const tn = nodes.find(n => n.id === e.to);
        if (!fn || !tn) return null;
        const x1 = tx(fn.x) + nW, y1 = ty(fn.y) + nH / 2;
        const x2 = tx(tn.x),      y2 = ty(tn.y) + nH / 2;
        const dx = Math.max(6, Math.abs(x2 - x1) * 0.45);
        return <path key={e.id} d={`M ${x1},${y1} C ${x1+dx},${y1} ${x2-dx},${y2} ${x2},${y2}`}
          fill="none" stroke="oklch(0.72 0.008 280)" strokeWidth={small ? 0.6 : 1.1} />;
      })}
      {nodes.map(n => {
        const c = typeColor[n.type] || typeColor.action;
        const x = tx(n.x), y = ty(n.y);
        const h = n.type === 'decision' ? nH * 1.35 : nH;
        const label = small ? '' : (n.title || n.name || '').slice(0, 22);
        const fs = Math.max(5.5, nW * 0.073);
        return (
          <g key={n.id}>
            <rect x={x} y={y} width={nW} height={h} rx={small ? 1.5 : 3}
              fill={c.fill} stroke={c.stroke} strokeWidth={small ? 0.6 : 0.9} />
            {label && (
              <text x={x + nW / 2} y={y + h / 2 + fs * 0.38}
                textAnchor="middle" fontSize={fs} fill="oklch(0.35 0.01 280)"
                fontFamily="Inter, sans-serif" style={{ userSelect: 'none' }}>
                {label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const FILE2FLOW_AI_PIPELINE_STEPS = [
  { id: 'restate', label: 'Restate signing workflow' },
  { id: 'nodes', label: 'Extract node candidates' },
  { id: 'complete', label: 'Complete predecessor links' },
  { id: 'graph', label: 'Build workflow graph' },
  { id: 'reorder', label: 'Reorder decisions before actions' },
  { id: 'validate', label: 'Validate workflow structure' },
];

function NewFlowModal({ open, onClose, onScratch, toast, onGenerated }) {
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [desc, setDesc] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  /** -1 = prep only; 0..4 = pipeline step index */
  const [aiPipelineIndex, setAiPipelineIndex] = useState(-1);
  const [aiPrepMessage, setAiPrepMessage] = useState('');
  const fileRef = React.useRef(null);
  const pipelineTimerRef = React.useRef(null);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const clearPipelineTimer = () => {
    if (pipelineTimerRef.current) {
      clearInterval(pipelineTimerRef.current);
      pipelineTimerRef.current = null;
    }
  };

  const setPrepStep = (msg) => {
    setAiPrepMessage(msg);
    setAiPipelineIndex(-1);
  };

  const setPipelineStep = (index) => {
    setAiPrepMessage('');
    setAiPipelineIndex(Math.max(0, Math.min(index, FILE2FLOW_AI_PIPELINE_STEPS.length - 1)));
  };

  const startPipelineProgressTimer = () => {
    clearPipelineTimer();
    setPipelineStep(0);
    let idx = 0;
    pipelineTimerRef.current = setInterval(() => {
      idx = Math.min(idx + 1, FILE2FLOW_AI_PIPELINE_STEPS.length - 1);
      setPipelineStep(idx);
    }, 2800);
  };

  if (!open) return null;

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const startAnalysis = async () => {
    const PREP_MS = 900;

    setAnalyzing(true);
    setAnalysisError('');
    setAiPrepMessage('');
    setAiPipelineIndex(-1);
    clearPipelineTimer();
    try {
      setPrepStep('Detecting file type and input source…');
      await sleep(PREP_MS);

      if (file && url.trim()) {
        setPrepStep('Extracting text from document and URL…');
      } else if (file) {
        setPrepStep('Extracting text from document…');
      } else if (url.trim()) {
        setPrepStep('Fetching text from URL…');
      } else {
        setPrepStep('Preparing materials (description, body text)…');
      }

      const sourceText = await buildFile2flowSourceText({ desc, file, url });
      await sleep(PREP_MS);
      if (!sourceText) {
        throw new Error('Please upload a file, add a URL, add a description, or paste policy text (at least one).');
      }

      startPipelineProgressTimer();
      const file2flowDebug =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('file2flowDebug') === '1';
      const res = await fetch(`${API_BASE}/flows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: desc.split('\n')[0]?.slice(0, 70) || file?.name?.replace(/\.[^.]+$/, '') || 'Generated Triage Flow',
          sourceUrl: url || null,
          sourceFile: file?.name || null,
          sourceText,
          ...(file2flowDebug ? { debugFile2flow: true } : {}),
        }),
      });
      clearPipelineTimer();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI analysis failed');
      if (!data.flow) throw new Error('AI analysis finished but no flow was returned');

      setPipelineStep(FILE2FLOW_AI_PIPELINE_STEPS.length - 1);
      setPrepStep('Applying workflow to canvas…');
      await sleep(PREP_MS);

      if (data.file2flowDebugPath) {
        setPrepStep(`Debug snapshot written: ${data.file2flowDebugPath}`);
        await sleep(1200);
      }

      onGenerated?.(data.flow);
      onClose();
    } catch (error) {
      const message = error.message || 'AI analysis failed';
      setAnalysisError(message);
      setPrepStep('');
      setAiPipelineIndex(-1);
    } finally {
      clearPipelineTimer();
      setAnalyzing(false);
      setAiPrepMessage('');
      setAiPipelineIndex(-1);
    }
  };

  const AISparkle = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 4.7L18.5 9.5l-4.6 1.8L12 16l-1.9-4.7L5.5 9.5l4.6-1.8z"/>
      <path d="M19 14l.7 1.7 1.8.7-1.8.7-.7 1.7-.7-1.7-1.8-.7 1.8-.7z"/>
    </svg>
  );
  const GlobeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18"/>
    </svg>
  );
  const UploadIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
  const PenIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="nf-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="nf-head">
          <h3>Create New Flow</h3>
          <button className="icon-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="nf-body">
          {/* URL input */}
          <div>
            <div className="nf-field-label">Import from URL <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--ink-400)' }}>— optional</span></div>
            <div className="nf-url-wrap">
              <GlobeIcon style={{ color: 'var(--ink-400)', flexShrink: 0 }} />
              <input
                className="nf-url-input"
                placeholder="https://policy.uw.edu/agreement-guide…"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
              {url && (
                <button style={{ color: 'var(--ink-400)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                  onClick={() => setUrl('')}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* File drop zone */}
          <div>
            <div className="nf-field-label">Upload a document <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--ink-400)' }}>— optional</span></div>
            {file ? (
              <div className="nf-file-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <span style={{ color: 'var(--purple-500)', fontSize: 11 }}>{Math.round(file.size / 1024)} KB</span>
                <button style={{ color: 'var(--ink-400)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                  onClick={() => setFile(null)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div
                className={`nf-drop ${dragOver ? 'drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div className="nf-drop-icon"><UploadIcon /></div>
                <div className="nf-drop-title">Drag a file here</div>
                <div className="nf-drop-sub">
                  Drop a PDF, DOC, DOCX, or TXT — or{' '}
                  <span className="nf-drop-link">browse to upload</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>PDF · DOC · DOCX · TXT · up to ~18 MB</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" hidden onChange={handleFile} />
          </div>

          {/* Description / definition */}
          <div>
            <div className="nf-field-label">Description or definition <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--ink-400)' }}>— optional</span></div>
            <textarea
              className="nf-desc"
              placeholder="Describe the agreement type, scope, or paste the policy definition you want to triage…"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
            />
          </div>
          {analyzing && !analysisError && (
            <div className="nf-ai-panel">
              <div className="nf-ai-panel-head">
                <span className="nf-ai-panel-title">Analysis progress</span>
                <span className="nf-ai-live-dot" aria-hidden />
              </div>
              {aiPrepMessage ? (
                <p className="nf-ai-prep">{aiPrepMessage}</p>
              ) : null}
              <div className={'nf-ai-bar-track' + (aiPipelineIndex < 0 ? ' nf-ai-bar-track--indet' : '')}>
                <div
                  className={'nf-ai-bar-fill' + (aiPipelineIndex < 0 ? ' nf-ai-bar-fill--indet' : '')}
                  style={
                    aiPipelineIndex < 0
                      ? undefined
                      : {
                          width: `${Math.min(
                            100,
                            ((aiPipelineIndex + 1) / FILE2FLOW_AI_PIPELINE_STEPS.length) * 100
                          )}%`,
                        }
                  }
                />
              </div>
              <ul className="nf-ai-steps" role="list">
                {FILE2FLOW_AI_PIPELINE_STEPS.map((step, i) => {
                  const prePipeline = aiPipelineIndex < 0;
                  const done = aiPipelineIndex >= 0 && i < aiPipelineIndex;
                  const active = aiPipelineIndex >= 0 && i === aiPipelineIndex;
                  const pending = aiPipelineIndex >= 0 && i > aiPipelineIndex;
                  return (
                    <li
                      key={step.id}
                      className={
                        'nf-ai-step' +
                        (prePipeline ? ' nf-ai-step--upcoming' : '') +
                        (done ? ' nf-ai-step--done' : '') +
                        (active ? ' nf-ai-step--active' : '') +
                        (pending ? ' nf-ai-step--pending' : '')
                      }
                    >
                      <div className="nf-ai-step-rail">
                        <span className="nf-ai-step-icon" aria-hidden>
                          {done ? (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path
                                d="M2.5 6L5 8.5L9.5 3.5"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : active ? (
                            <span className="nf-ai-spinner" />
                          ) : (
                            <span className="nf-ai-step-dot" />
                          )}
                        </span>
                      </div>
                      <div className="nf-ai-step-text">
                        <span className="nf-ai-step-label">{step.label}</span>
                        {!prePipeline && active ? (
                          <span className="nf-ai-step-meta">In progress</span>
                        ) : null}
                        {!prePipeline && done ? (
                          <span className="nf-ai-step-meta nf-ai-step-meta--done">Done</span>
                        ) : null}
                        {!prePipeline && pending ? (
                          <span className="nf-ai-step-meta nf-ai-step-meta--wait">Queued</span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {analysisError && (
            <div className="nf-ai-error">
              <div className="nf-ai-error-title">Analysis failed</div>
              <div className="nf-ai-error-body">{analysisError}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="nf-foot">
          <button className="btn-ai" onClick={startAnalysis} disabled={analyzing}>
            <AISparkle /> {analyzing ? 'Analyzing…' : 'Start AI Analysis'}
          </button>
          <button className="btn-scratch" onClick={() => { onScratch(); onClose(); }}>
            <PenIcon /> Build from Scratch
          </button>
        </div>
      </div>
    </div>
  );
}

function FlowLibrary({ onOpen, onScratch, toast, onGenerated, onMoveToTrash, onRenameFlow, flows = FLOW_CARDS }) {
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('modified');
  const [searchQuery, setSearchQuery] = useState('');
  const [newFlowOpen, setNewFlowOpen] = useState(false);
  const [cardMenu, setCardMenu] = useState(null);

  const flowCardTimestamp = useCallback((card, mode) => {
    const bf = card.backendFlow;
    if (!bf) return 0;
    const raw = mode === 'created' ? bf.createdAt : (bf.updatedAt || bf.createdAt);
    const t = raw ? new Date(raw).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
  }, []);

  const displayedFlows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = !q
      ? [...flows]
      : flows.filter((f) => {
        const name = (f.name || '').toLowerCase();
        const desc = (f.backendFlow?.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    if (sortBy === 'name') {
      base.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    } else if (sortBy === 'created') {
      base.sort((a, b) => flowCardTimestamp(b, 'created') - flowCardTimestamp(a, 'created'));
    } else {
      base.sort((a, b) => flowCardTimestamp(b, 'modified') - flowCardTimestamp(a, 'modified'));
    }
    return base;
  }, [flows, searchQuery, sortBy, flowCardTimestamp]);

  const searchActive = Boolean(searchQuery.trim());
  const GridIcon = () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="0" y="0" width="5.5" height="5.5" rx="1" fill="currentColor"/>
      <rect x="7.5" y="0" width="5.5" height="5.5" rx="1" fill="currentColor"/>
      <rect x="0" y="7.5" width="5.5" height="5.5" rx="1" fill="currentColor"/>
      <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1" fill="currentColor"/>
    </svg>
  );
  const ListIcon = () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="0" y="1" width="13" height="2.5" rx="1" fill="currentColor"/>
      <rect x="0" y="5.25" width="13" height="2.5" rx="1" fill="currentColor"/>
      <rect x="0" y="9.5" width="13" height="2.5" rx="1" fill="currentColor"/>
    </svg>
  );
  const ChevL = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M6.5 2L3.5 5L6.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const ChevR = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  useEffect(() => {
    if (!cardMenu) return;
    const close = () => setCardMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [cardMenu]);

  const openCardMenu = (event, flow) => {
    event.preventDefault();
    setCardMenu({ flow, x: event.clientX, y: event.clientY });
  };

  return (
    <div className="library-page">
      <NewFlowModal
        open={newFlowOpen}
        onClose={() => setNewFlowOpen(false)}
        onScratch={onScratch}
        toast={toast}
        onGenerated={onGenerated}
      />

      {/* ── Toolbar ── */}
      <div className="library-toolbar">
        <div className="library-cta-row">
          <h2>Flowchart Library</h2>
          <button className="btn btn-primary" onClick={() => setNewFlowOpen(true)}>
            <Icon.Plus /> Create New Flow
          </button>
        </div>

        <div className="library-controls">
          <div className="lib-search">
            <Icon.Search />
            <input
              placeholder="Search flows…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search flows"
            />
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>Sort by</span>
          <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="modified">Last modified</option>
            <option value="name">Name</option>
            <option value="created">Date created</option>
          </select>
          <div style={{ width: 1, height: 20, background: 'var(--ink-200)', margin: '0 2px' }} />
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')} title="Grid view"><GridIcon /></button>
            <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')} title="List view"><ListIcon /></button>
          </div>
        </div>
      </div>

      {/* ── Card area ── */}
      <div className="library-scroll">
        <div className="lib-section-label">
          {searchActive ? (
            <>
              Results · {displayedFlows.length}
              {displayedFlows.length !== flows.length ? (
                <span className="lib-section-subcount"> of {flows.length}</span>
              ) : null}
            </>
          ) : (
            <>All Flows · {displayedFlows.length}</>
          )}
        </div>

        {displayedFlows.length === 0 ? (
          <div className="lib-empty">
            {searchActive
              ? `没有与「${searchQuery.trim()}」匹配的流程，请尝试其他关键词。`
              : flows.length === 0
                ? '暂无流程，可用上方按钮创建。'
                : '当前列表为空。'}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="flows-grid">
            {displayedFlows.map((f) => (
              <div key={f.id} className="flow-card" onClick={() => onOpen(f)} onContextMenu={(e) => openCardMenu(e, f)}>
                <div className="flow-card-preview">
                  <MiniFlowPreview nodes={f.nodes} edges={f.edges} />
                </div>
                <div className="flow-card-body">
                  <div className="flow-card-name">{f.name}</div>
                  <div className="flow-card-meta">
                    <span className="creator-chip">
                      <span className="creator-avatar" style={{ background: colorFor(f.creator) }}>{f.creatorInitials}</span>
                      {f.creator}
                    </span>
                    <span className="meta-sep">·</span>
                    <span>Modified {f.modified}</span>
                  </div>
                </div>
                <div className="flow-card-footer">
                  <span className={`status-pill ${f.status}`}>
                    <span className={f.status === 'published' ? 'status-dot-pub' : 'status-dot-draft'} />
                    {f.status === 'published' ? 'Published' : 'Not published'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>{f.created}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flows-list">
            {displayedFlows.map(f => (
              <div key={f.id} className="flow-card-list" onClick={() => onOpen(f)} onContextMenu={(e) => openCardMenu(e, f)}>
                <div className="flow-card-list-preview">
                  <MiniFlowPreview nodes={f.nodes} edges={f.edges} small />
                </div>
                <div className="flow-card-list-body">
                  <div className="flow-card-list-name">{f.name}</div>
                  <div className="flow-card-list-meta">
                    <span className="creator-chip">
                      <span className="creator-avatar" style={{ background: colorFor(f.creator) }}>{f.creatorInitials}</span>
                      {f.creator}
                    </span>
                    <span>Modified {f.modified}</span>
                    <span>Created {f.created}</span>
                  </div>
                  <span className={`status-pill ${f.status}`}>
                    <span className={f.status === 'published' ? 'status-dot-pub' : 'status-dot-draft'} />
                    {f.status === 'published' ? 'Published' : 'Not published'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination — sticky bottom, only when > 8 cards */}
      {displayedFlows.length > 8 && (
        <div className="pagination-row">
          <span>
            {searchActive
              ? `Showing ${displayedFlows.length} matching flows`
              : `Showing 1–${displayedFlows.length} of ${displayedFlows.length} flows`}
          </span>
          <div className="page-btns">
            <button type="button" className="page-btn" disabled title="Previous page"><ChevL /></button>
            <button type="button" className="page-btn active">1</button>
            <button type="button" className="page-btn" disabled title="Next page"><ChevR /></button>
          </div>
        </div>
      )}
      {cardMenu && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', left: cardMenu.x, top: cardMenu.y, zIndex: 1000, width: 154, padding: 5, background: 'white', border: '1px solid var(--ink-200)', borderRadius: 8, boxShadow: 'var(--shadow-lg)' }}>
          {[
            { label: 'Open', action: () => onOpen(cardMenu.flow) },
            { label: 'Share', action: () => toast('Share link copied') },
            { label: 'Rename', action: () => onRenameFlow?.(cardMenu.flow) },
            { label: 'Move to Trash', danger: true, action: () => onMoveToTrash?.(cardMenu.flow) },
          ].map((item) => (
            <button key={item.label} onClick={() => { setCardMenu(null); item.action(); }} style={{ width: '100%', display: 'block', textAlign: 'left', padding: '7px 9px', borderRadius: 5, color: item.danger ? 'var(--accent-red)' : 'var(--ink-700)', fontSize: 12.5, fontWeight: 500 }}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={onClose}><Icon.X /></button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, color: 'var(--ink-700)', fontSize: 13, lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose(); }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrashPage({ flows = [], onRestore, onPermanentlyDelete }) {
  const [ctxMenu, setCtxMenu] = useState(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    document.addEventListener('click', close);
    document.addEventListener('contextmenu', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('contextmenu', close);
    };
  }, [ctxMenu]);

  return (
    <div className="library-page">
      <div className="library-toolbar">
        <div className="library-cta-row">
          <h2>Trash</h2>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>
          Flows moved here are removed from the researcher portal. Right-click a flow to restore or permanently delete it.
        </div>
      </div>
      <div className="library-scroll">
        <div className="lib-section-label">Trashed Flows · {flows.length}</div>
        <div className="flows-list">
          {flows.map((f) => (
            <div
              key={f.id}
              className="flow-card-list"
              style={{ cursor: 'context-menu', userSelect: 'none' }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCtxMenu({ x: e.clientX, y: e.clientY, flow: f });
              }}
            >
              <div className="flow-card-list-preview">
                <MiniFlowPreview nodes={f.nodes} edges={f.edges} small />
              </div>
              <div className="flow-card-list-body">
                <div className="flow-card-list-name">{f.name}</div>
                <div className="flow-card-list-meta">
                  <span>Moved to trash {f.modified}</span>
                  <span>Created {f.created}</span>
                </div>
                <span className="status-pill draft">
                  <span className="status-dot-draft" />
                  In Trash
                </span>
              </div>
            </div>
          ))}
          {flows.length === 0 && (
            <div style={{ padding: 28, color: 'var(--ink-500)', fontSize: 13 }}>
              Trash is empty.
            </div>
          )}
        </div>
      </div>

      {ctxMenu && (
        <div
          className="ctx-menu"
          style={{ position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 9999 }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="ctx-item" onClick={() => { onRestore?.(ctxMenu.flow); setCtxMenu(null); }}>
            <Icon.RefreshCw /> Restore
          </div>
          <div className="ctx-item danger" onClick={() => { onPermanentlyDelete?.(ctxMenu.flow); setCtxMenu(null); }}>
            <Icon.Trash /> Permanently Delete
          </div>
        </div>
      )}
    </div>
  );
}

