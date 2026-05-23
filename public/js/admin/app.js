function App() {
  const [flowTitle, setFlowTitle] = useState('');
  const [selection, setSelection] = useState(null);
  const [issuesData, setIssuesData] = useState({ issues: [], suggestions: [] });
  const [adders, setAdders] = useState({});
  const [inviteOpen, setInviteOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [activeNav, setActiveNav] = useState('builder');
  const [page, setPage] = useState('library'); // 'library' | 'canvas'
  const [allNodes, setAllNodes] = useState([]);
  const [flowDescription, setFlowDescription] = useState('');
  const [activeBackendFlow, setActiveBackendFlow] = useState(null);
  const [activeGraph, setActiveGraph] = useState(null);
  const [currentGraph, setCurrentGraph] = useState({ nodes: [], edges: [] });
  const [generatedFlowCards, setGeneratedFlowCards] = useState([]);
  const [trashedFlowCards, setTrashedFlowCards] = useState([]);
  const [preview, setPreview] = useState(false);
  const [trashConfirmCard, setTrashConfirmCard] = useState(null);
  const [permDeleteConfirmCard, setPermDeleteConfirmCard] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarDragging, setSidebarDragging] = useState(false);
  const [sidebarDragWidth, setSidebarDragWidth] = useState(null);
  const scratchIdRef = useRef(null);
  const sidebarResizeStart = useRef(null);
  const sidebarDragWidthRef = useRef(null);
  const toastTimerRef = useRef(null);

  const TOAST_DEFAULT_MS = 3000;

  /** Replaces any existing toast. Each toast stays at least `duration` ms (default 3000) unless replaced sooner. */
  const pushToast = useCallback((text, opts = {}) => {
    const duration = opts.duration !== undefined ? opts.duration : TOAST_DEFAULT_MS;
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    const id = 't' + Date.now() + Math.random();
    setToasts([{ id, text }]);
    if (duration > 0) {
      toastTimerRef.current = setTimeout(() => {
        setToasts((ts) => (ts.length === 1 && ts[0]?.id === id ? [] : ts));
        toastTimerRef.current = null;
      }, duration);
    }
  }, []);

  const registerAdders = useCallback((a) => setAdders(a), []);
  const handleIssues = useCallback((d) => setIssuesData(d), []);
  const handleSelection = useCallback((s) => setSelection(s), []);
  const handleFixIssue = useCallback((iss) => adders.fixIssue?.(iss), [adders]);
  const flowToCard = useCallback((flow, modified = 'saved') => {
    const graph = backendFlowToBuilderGraph(flow);
    return {
      id: flow.id,
      name: flow.name || 'Generated Triage Flow',
      creator: 'AI analysis',
      creatorInitials: 'AI',
      modified,
      created: flow.createdAt ? new Date(flow.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      status: flow.status === 'PUBLISHED' && flow.publishScope === 'PUBLIC' ? 'published' : 'draft',
      nodes: graph.nodes,
      edges: graph.edges,
      backendFlow: flow,
    };
  }, []);
  useEffect(() => {
    let alive = true;
    async function loadBackendFlows() {
      try {
        const [res, trashRes] = await Promise.all([
          fetch(`${API_BASE}/flows`),
          fetch(`${API_BASE}/flows?trash=1`),
        ]);
        const data = await res.json();
        const trashData = await trashRes.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load flows');
        if (!trashRes.ok) throw new Error(trashData.error || 'Failed to load trash');
        if (alive) {
          const rawBackendCards = (data.flows || []).map((flow) => flowToCard(flow));
          const localResult = await storageAdapter.loadAllFlows();
          const localDataById = {};
          for (const f of (localResult.data || [])) { if (f?.id) localDataById[f.id] = f; }
          // Attach any existing localStorage draft to each backend card so onOpen can load it.
          const backendCards = rawBackendCards.map(card =>
            localDataById[card.id] ? { ...card, localDraft: localDataById[card.id] } : card
          );
          const backendIds = new Set(backendCards.map(c => c.id));
          // Rehydrate local-only scratch drafts from localStorage.
          const localCards = (localResult.data || [])
            .filter(f => f.isLocal && !backendIds.has(f.id))
            .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
            .map(f => ({
              id: f.id,
              name: f.name || 'Untitled Flow',
              creator: 'You',
              creatorInitials: 'ME',
              modified: 'local draft',
              created: f.savedAt ? new Date(f.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
              status: 'draft',
              nodes: f.graph?.nodes || [],
              edges: f.graph?.edges || [],
              backendFlow: null,
              isLocal: true,
              localDraft: f,
            }));
          setGeneratedFlowCards([...backendCards, ...localCards]);
          setTrashedFlowCards((trashData.flows || []).map((flow) => flowToCard(flow)));
        }
      } catch (error) {
        pushToast(error.message || 'Failed to load saved flows');
      }
    }
    loadBackendFlows();
    return () => { alive = false; };
  }, [flowToCard, pushToast]);
  const handleGeneratedFlow = useCallback((flow) => {
    scratchIdRef.current = null;
    const graph = backendFlowToBuilderGraph(flow);
    setActiveBackendFlow(flow);
    setActiveGraph(graph);
    setCurrentGraph(graph);
    setGeneratedFlowCards((cards) => [
      flowToCard(flow, 'just now'),
      ...cards.filter((card) => card.id !== flow.id),
    ]);
    setFlowTitle(flow.name || 'Generated Triage Flow');
    setFlowDescription(flow.description || '');
    setPage('canvas');
    setActiveNav('builder');
    pushToast('Loaded generated flow into canvas');
  }, [flowToCard, pushToast]);
  const handlePublishFlow = useCallback(async () => {
    if (!activeBackendFlow) {
      pushToast('This demo flow is not connected to backend publish yet');
      return;
    }
    try {
      const updatedFlow = builderGraphToBackendFlow(activeBackendFlow, currentGraph.nodes?.length ? currentGraph.nodes : activeGraph?.nodes || [], currentGraph.edges?.length ? currentGraph.edges : activeGraph?.edges || []);
      const saveRes = await fetch(`${API_BASE}/flows/${activeBackendFlow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: flowTitle,
          description: flowDescription,
          nodes: updatedFlow.nodes,
          edges: updatedFlow.edges,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || 'Save before publish failed');

      const res = await fetch(`${API_BASE}/flows/${activeBackendFlow.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishScope: 'PUBLIC' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      setActiveBackendFlow(data.flow);
      // Do NOT call backendFlowToBuilderGraph here — it runs autoLayoutBuilderGraph which
      // discards user positions. The canvas already has the correct layout in its internal
      // state; only activeBackendFlow needs updating to reflect the new publishScope.
      setGeneratedFlowCards((cards) => [
        flowToCard(data.flow, 'just now'),
        ...cards.filter((card) => card.id !== data.flow.id),
      ]);
      pushToast('Flow published to researcher portal');
    } catch (error) {
      pushToast(error.message || 'Publish failed');
    }
  }, [activeBackendFlow, activeGraph, currentGraph, flowDescription, flowTitle, flowToCard, pushToast]);

  const handleUnpublishFlow = useCallback(async () => {
    if (!activeBackendFlow) return;
    try {
      // Use the existing /publish endpoint with INTERNAL scope — hides the flow from the
      // researcher portal (knowledge-base only serves PUBLIC snapshots) without a new route.
      const res = await fetch(`${API_BASE}/flows/${activeBackendFlow.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishScope: 'INTERNAL' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unpublish failed');
      setActiveBackendFlow(data.flow);
      setGeneratedFlowCards((cards) => [
        flowToCard(data.flow, 'just now'),
        ...cards.filter((card) => card.id !== data.flow.id),
      ]);
      pushToast('Flow removed from researcher portal');
    } catch (error) {
      pushToast(error.message || 'Unpublish failed');
    }
  }, [activeBackendFlow, flowToCard, pushToast]);

  const executeTrashCard = useCallback(async (card) => {
    try {
      if (card.backendFlow) {
        const res = await fetch(`${API_BASE}/flows/${card.backendFlow.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Move to trash failed');
        setGeneratedFlowCards((cards) => cards.filter((item) => item.id !== card.id));
        if (data.flow) {
          setTrashedFlowCards((cards) => [
            flowToCard(data.flow, 'just now'),
            ...cards.filter((item) => item.id !== card.id),
          ]);
        }
        if (activeBackendFlow?.id === card.backendFlow.id) {
          setActiveBackendFlow(null);
          setActiveGraph(null);
          setCurrentGraph({ nodes: [], edges: [] });
          setSelection(null);
          setPage('library');
        }
      } else {
        setGeneratedFlowCards((cards) => cards.filter((item) => item.id !== card.id));
        if (scratchIdRef.current === card.id) {
          scratchIdRef.current = null;
          setActiveBackendFlow(null);
          setActiveGraph(null);
          setCurrentGraph({ nodes: [], edges: [] });
          setSelection(null);
          setPage('library');
        }
      }
      await storageAdapter.remove(resolveFlowStorageKey(card.id));
      pushToast('Moved to Trash');
    } catch (error) {
      pushToast(error.message || 'Move to trash failed');
    }
  }, [activeBackendFlow, flowToCard, pushToast]);

  const handleMoveToTrash = useCallback((card) => {
    setTrashConfirmCard(card);
  }, []);

  const handleRestoreFlow = useCallback(async (card) => {
    if (!card.backendFlow) return;
    try {
      const res = await fetch(`${API_BASE}/flows/${card.backendFlow.id}/restore`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      setTrashedFlowCards((cards) => cards.filter((item) => item.id !== card.id));
      setGeneratedFlowCards((cards) => [flowToCard(data.flow, 'just now'), ...cards]);
      pushToast('Flow restored to library');
    } catch (error) {
      pushToast(error.message || 'Restore failed');
    }
  }, [flowToCard, pushToast]);

  const executePermanentDelete = useCallback(async (card) => {
    try {
      if (card.backendFlow) {
        const res = await fetch(`${API_BASE}/flows/${card.backendFlow.id}/permanent`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Permanent delete failed');
      }
      setTrashedFlowCards((cards) => cards.filter((item) => item.id !== card.id));
      await storageAdapter.remove(resolveFlowStorageKey(card.id));
      pushToast('Flow permanently deleted');
    } catch (error) {
      pushToast(error.message || 'Permanent delete failed');
    }
  }, [pushToast]);
  const handleRenameFlow = useCallback(async (card) => {
    if (!card?.backendFlow) {
      pushToast('Sample flows cannot be renamed');
      return;
    }
    const nextName = window.prompt('Rename flow', card.name);
    if (!nextName || nextName.trim() === card.name) return;
    try {
      const res = await fetch(`${API_BASE}/flows/${card.backendFlow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rename failed');
      setGeneratedFlowCards((cards) => cards.map((item) => item.id === card.id ? flowToCard(data.flow, 'just now') : item));
      if (activeBackendFlow?.id === card.backendFlow.id) {
        setActiveBackendFlow(data.flow);
        setFlowTitle(data.flow.name);
      }
      pushToast('Flow renamed');
    } catch (error) {
      pushToast(error.message || 'Rename failed');
    }
  }, [activeBackendFlow, flowToCard, pushToast]);

  /** Keep library card preview (nodes/edges) in sync with the canvas graph. */
  const syncFlowCardPreview = useCallback((flowId, graph) => {
    if (!flowId || !graph?.nodes) return;
    setGeneratedFlowCards((cards) =>
      cards.map((card) => {
        if (card.id !== flowId) return card;
        const draft = card.localDraft || {};
        return {
          ...card,
          nodes: graph.nodes,
          edges: graph.edges || [],
          localDraft: {
            ...draft,
            id: flowId,
            name: draft.name ?? card.name,
            description: draft.description ?? '',
            graph,
            isLocal: draft.isLocal ?? card.isLocal ?? !card.backendFlow,
            savedAt: draft.savedAt,
          },
        };
      }),
    );
  }, []);

  // ── Autosave ────────────────────────────────────────────────
  const activeFlowId = activeBackendFlow?.id || scratchIdRef.current;
  const isLocalFlow = !activeBackendFlow && !!scratchIdRef.current;
  const { saveStatus, flushSave } = useSaveManager({
    flowId: activeFlowId,
    flowTitle,
    flowDescription,
    graph: currentGraph,
    isLocal: isLocalFlow,
  });
  const SAVE_STATUS_LABEL = {
    saving: 'Saving…',
    saved: 'Saved · just now',
    error: 'Save failed',
    quota: 'Storage full — export your work',
  };

  // Update library thumbnail whenever the open flow's graph changes on canvas.
  useEffect(() => {
    if (!activeFlowId || page !== 'canvas') return;
    syncFlowCardPreview(activeFlowId, currentGraph);
  }, [activeFlowId, currentGraph, page, syncFlowCardPreview]);

  // Bug 2 fix: reload card metadata from storage every time the library view mounts.
  // Works together with Bug 1: flushSave() on Back ensures the write lands before this read.
  useEffect(() => {
    if (page !== 'library' || activeNav !== 'builder') return;
    async function refreshLibrary() {
      const result = await storageAdapter.loadAllFlows();
      if (!result.ok || !result.data?.length) return;
      const savedById = {};
      for (const f of result.data) { if (f?.id) savedById[f.id] = f; }
      setGeneratedFlowCards(cards => cards.map(card => {
        const saved = savedById[card.id];
        if (!saved) return card;
        const timeStr = saved.savedAt
          ? new Date(saved.savedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
          : null;
        const graph = saved.graph;
        return {
          ...card,
          name: saved.name || card.name,
          modified: timeStr ? `saved · ${timeStr}` : card.modified,
          localDraft: saved,
          ...(graph?.nodes
            ? { nodes: graph.nodes, edges: graph.edges || [] }
            : {}),
        };
      }));
    }
    refreshLibrary();
  }, [page, activeNav]);

  const isPublished = activeBackendFlow?.publishScope === 'PUBLIC';
  const showCanvas = activeNav === 'builder' && page === 'canvas';
  const sidebarExpandedWidth = 220;
  const sidebarCollapsedWidth = 56;
  const sidebarWidth = sidebarDragWidth ?? (sidebarCollapsed ? sidebarCollapsedWidth : sidebarExpandedWidth);
  const primaryNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Icon.Dashboard />, count: null },
    { id: 'requests', label: 'Requests', icon: <Icon.Inbox />, count: 24 },
    { id: 'builder', label: 'Triage Builder', icon: <Icon.Flow />, count: generatedFlowCards.length },
    { id: 'messages', label: 'Messages', icon: <Icon.Msg />, count: 5 },
  ];
  const footerNavItems = [
    { id: 'settings', label: 'Settings', icon: <Icon.Settings /> },
    { id: 'help', label: 'Help', icon: <Icon.Help /> },
    { id: 'trash', label: 'Trash', icon: <Icon.Trash />, danger: true },
    { id: 'logout', label: 'Log Out', icon: <Icon.LogOut /> },
  ];

  const handleSidebarResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    sidebarResizeStart.current = { x: e.clientX, width: sidebarWidth, collapsed: sidebarCollapsed };
    setSidebarDragging(true);
    sidebarDragWidthRef.current = sidebarWidth;
    setSidebarDragWidth(sidebarWidth);
    document.body.style.cursor = 'col-resize';

    const handlePointerMove = (moveEvent) => {
      const start = sidebarResizeStart.current;
      if (!start) return;
      const delta = moveEvent.clientX - start.x;
      const nextWidth = Math.max(sidebarCollapsedWidth, Math.min(sidebarExpandedWidth, start.width + delta));
      sidebarDragWidthRef.current = nextWidth;
      setSidebarDragWidth(nextWidth);
    };

    const handlePointerUp = (upEvent) => {
      const start = sidebarResizeStart.current;
      const finalWidth = sidebarDragWidthRef.current ?? (start ? start.width : sidebarWidth);
      if (start && Math.abs(upEvent.clientX - start.x) < 8) {
        setSidebarCollapsed(!start.collapsed);
      } else {
        const midpoint = (sidebarExpandedWidth + sidebarCollapsedWidth) / 2;
        setSidebarCollapsed(finalWidth < midpoint);
      }

      sidebarResizeStart.current = null;
      sidebarDragWidthRef.current = null;
      setSidebarDragging(false);
      setSidebarDragWidth(null);
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }, [sidebarCollapsed, sidebarWidth]);

  useEffect(() => () => {
    document.body.style.cursor = '';
  }, []);

  const BackIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 2.5L4.5 7L9 11.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div className={`app ${!showCanvas ? 'library-mode' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} style={{ '--sidebar-w': `${sidebarWidth}px` }}>
      {/* TOPBAR */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">UW</div>
          <span>Document Triage</span>
          <span className="brand-sub">Office of Research Admin</span>
        </div>
        <div className="topbar-right">
          <div className="top-search"><Icon.Search /><span>Search flows, documents…</span><kbd>⌘K</kbd></div>
          <button className="icon-btn" title="Notifications"><Icon.Bell /></button>
          <button className="icon-btn" title="Help"><Icon.Help /></button>
          <div className="avatar" title="Admin"></div>
        </div>
      </header>

      {/* LEFT NAV */}
      <nav className="leftnav" data-collapsed={sidebarCollapsed}>
        <div className={`nav-resize-handle ${sidebarDragging ? 'dragging' : ''}`} onPointerDown={handleSidebarResizeStart} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} />
        <div className="nav-section-label">Workspace</div>
        {primaryNavItems.map(item => (
          <div key={item.id} className={`nav-item ${activeNav === item.id ? 'active' : ''}`} data-tooltip={item.label} title={sidebarCollapsed ? item.label : ''}
            onClick={() => { setActiveNav(item.id); if (item.id === 'builder') setPage('library'); }}>
            {item.icon}<span className="nav-label">{item.label}</span>
            {item.count !== null && <span className="nav-count">{item.count}</span>}
          </div>
        ))}

        <div className="nav-flows-group">
          <div className="nav-section-label">Recent Flows</div>
          <div className="nav-flows-list">
            {generatedFlowCards.slice(0, 4).map((f, i) => {
              const openThis = () => {
                setActiveNav('builder');
                if (f.backendFlow) {
                  scratchIdRef.current = null;
                  setActiveBackendFlow(f.backendFlow);
                  const graph = f.localDraft?.graph || backendFlowToBuilderGraph(f.backendFlow);
                  setActiveGraph(graph);
                  setCurrentGraph(graph);
                  setFlowDescription(f.localDraft?.description ?? f.backendFlow.description ?? '');
                } else if (f.isLocal) {
                  scratchIdRef.current = f.id;
                  setActiveBackendFlow(null);
                  const graph = f.localDraft?.graph || { nodes: [], edges: [] };
                  setActiveGraph(graph);
                  setCurrentGraph(graph);
                  setFlowDescription(f.localDraft?.description || '');
                } else {
                  scratchIdRef.current = null;
                  setActiveBackendFlow(null);
                  setActiveGraph(null);
                  setCurrentGraph({ nodes: [], edges: [] });
                  setFlowDescription('');
                }
                setFlowTitle(f.localDraft?.name || f.name);
                setPage('canvas');
              };
              return (
              <div key={f.id || i} className="nav-item nav-flow-item" data-tooltip={f.name}
                title={sidebarCollapsed ? f.name : ''} role="button" tabIndex={0}
                onClick={openThis} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openThis(); } }}>
                <span className="nav-flow-dot" style={{ background: f.status === 'PUBLISHED' ? 'var(--accent-green)' : 'var(--ink-400)' }} />
                <span className="nav-label" style={{ color: 'var(--ink-700)' }}>{f.name}</span>
              </div>
              ); })}
          </div>
        </div>

        <div className="nav-spacer" />

        <div className="sidebar-actions">
          {footerNavItems.map(action => (
            <button key={action.id} className={`sidebar-action ${action.danger ? 'danger' : ''}`} data-tooltip={action.label} title={sidebarCollapsed ? action.label : ''}
              onClick={() => {
                if (action.id === 'trash') {
                  setActiveNav('trash');
                  setPage('library');
                }
              }}>
              {action.icon}<span className="nav-label">{action.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* MAIN */}
      <main className="main">
        {/* ── Library page ── */}
        {activeNav === 'builder' && page === 'library' && (
          <FlowLibrary
            flows={generatedFlowCards}
            onOpen={(f) => {
              if (f.backendFlow) {
                scratchIdRef.current = null;
                setActiveBackendFlow(f.backendFlow);
                const graph = f.localDraft?.graph || backendFlowToBuilderGraph(f.backendFlow);
                setActiveGraph(graph);
                setCurrentGraph(graph);
                setFlowDescription(f.localDraft?.description ?? f.backendFlow.description ?? '');
              } else if (f.isLocal) {
                scratchIdRef.current = f.id;
                setActiveBackendFlow(null);
                const graph = f.localDraft?.graph || { nodes: [], edges: [] };
                setActiveGraph(graph);
                setCurrentGraph(graph);
                setFlowDescription(f.localDraft?.description || '');
              } else {
                scratchIdRef.current = null;
                setActiveBackendFlow(null);
                setActiveGraph(null);
                setCurrentGraph({ nodes: [], edges: [] });
                setFlowDescription('');
              }
              setFlowTitle(f.localDraft?.name || f.name);
              setPage('canvas');
            }}
            onScratch={() => {
              const scratchId = 'local_' + Date.now();
              scratchIdRef.current = scratchId;
              const scratchCard = {
                id: scratchId, name: 'Untitled Flow', creator: 'You', creatorInitials: 'ME',
                modified: 'just now',
                created: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
                status: 'draft', nodes: [], edges: [], backendFlow: null, isLocal: true, localDraft: null,
              };
              setGeneratedFlowCards(cards => [scratchCard, ...cards.filter(c => c.id !== scratchId)]);
              setActiveBackendFlow(null); setActiveGraph(null);
              setCurrentGraph({ nodes: [], edges: [] });
              setFlowTitle('Untitled Flow'); setFlowDescription('');
              setPage('canvas'); setActiveNav('builder');
            }}
            toast={pushToast}
            onGenerated={handleGeneratedFlow}
            onMoveToTrash={handleMoveToTrash}
            onRenameFlow={handleRenameFlow}
          />
        )}

        {activeNav === 'trash' && (
          <TrashPage
            flows={trashedFlowCards}
            onRestore={handleRestoreFlow}
            onPermanentlyDelete={(card) => setPermDeleteConfirmCard(card)}
          />
        )}

        {/* ── Canvas editor ── */}
        {showCanvas && (
          <>
            <div className="canvas-header">
              <button className="back-btn" onClick={() => { flushSave(); setPage('library'); }} title="Back to library">
                <BackIcon />
              </button>
              <div className="flow-title">
                <input className="flow-title-input" value={flowTitle} onChange={(e) => { if (!preview) setFlowTitle(e.target.value); }} readOnly={preview} />
              </div>
              <div className="flow-meta">
                {SAVE_STATUS_LABEL[saveStatus] && (
                  <div className={`save-status ${saveStatus}`}>
                    <span className="save-dot" />
                    {SAVE_STATUS_LABEL[saveStatus]}
                  </div>
                )}
              </div>
              <div className="header-right">
                {preview ? (
                  <>
                    <span style={{ fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", background: 'oklch(0.92 0.05 155)', color: 'oklch(0.32 0.14 155)', padding: '3px 10px', borderRadius: 10, fontWeight: 600, letterSpacing: '0.06em' }}>PREVIEW</span>
                    <button className="btn btn-secondary" onClick={() => setPreview(false)} title="Exit preview"><Icon.X /> <span className="btn-label">Exit Preview</span></button>
                  </>
                ) : (
                  <>
                    <div className="collabs">
                      {collaborators.slice(0, 3).map(c => (
                        <div key={c.id} className="collab" style={{ background: colorFor(c.email) }} title={c.name}>{c.initials}</div>
                      ))}
                      {collaborators.length > 3 && <div className="collab" style={{ background: 'var(--ink-300)', color: 'var(--ink-700)' }}>+{collaborators.length - 3}</div>}
                    </div>
                    <button className="btn btn-secondary" onClick={() => setInviteOpen(true)} title="Share flow"><Icon.Share /> <span className="btn-label">Share</span></button>
                    <button className="btn btn-secondary" style={{ gap: 6 }} onClick={() => setPreview(true)} title="Preview flow"><Icon.Play /> <span className="btn-label">Preview</span></button>
                    <button className="btn btn-primary" onClick={() => setPublishOpen(true)} title={isPublished ? 'Re-publish to update researcher portal' : 'Publish to researcher portal'}>
                      <Icon.Globe /> <span className="btn-label">{isPublished ? 'Republish' : (<>Publish<span className="btn-label-suffix"> to Production</span></>)}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
            <FlowCanvas key={activeBackendFlow?.id || 'seed-flow'} onSelectionChange={handleSelection} onIssuesChange={handleIssues} toast={pushToast} registerAdders={registerAdders} onNodesChange={setAllNodes} onGraphChange={setCurrentGraph} readOnly={preview} graph={activeGraph} />
          </>
        )}

        {/* ── Other nav placeholders ── */}
        {activeNav !== 'builder' && activeNav !== 'trash' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--ink-500)' }}>
            <Icon.Flow style={{ width: 32, height: 32, opacity: 0.25 }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-400)' }}>
              {activeNav.charAt(0).toUpperCase() + activeNav.slice(1)} — coming soon
            </span>
          </div>
        )}
      </main>

      {/* RIGHT PANEL — only in canvas mode */}
      {showCanvas && (
        preview
          ? <PreviewPanel allNodes={allNodes} flowTitle={flowTitle} />
          : <RightPanel
            issues={issuesData.issues}
            suggestions={issuesData.suggestions}
            onGoToNode={handleFixIssue}
            onApplySuggestion={(s) => pushToast(`Applied: ${s.title}`)}
            toast={pushToast}
            graph={currentGraph}
            flowTitle={flowTitle}
            onApplyAssistantOperations={adders.applyAssistantOperations}
            onUndo={adders.undo}
          />
      )}

      {/* Modals */}
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} collaborators={collaborators} setCollaborators={setCollaborators} toast={pushToast} />
      <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} issues={issuesData.issues} onPublish={handlePublishFlow} isPublished={isPublished} onUnpublish={handleUnpublishFlow} />
      <ConfirmModal
        open={!!trashConfirmCard}
        title="Move to Trash"
        message={`Move "${trashConfirmCard?.name}" to Trash?${trashConfirmCard?.status === 'published' ? ' It will be removed from the researcher portal.' : ''}`}
        confirmLabel="Move to Trash"
        onConfirm={() => executeTrashCard(trashConfirmCard)}
        onClose={() => setTrashConfirmCard(null)}
      />
      <ConfirmModal
        open={!!permDeleteConfirmCard}
        title="Permanently Delete"
        message={`"${permDeleteConfirmCard?.name}" will be permanently deleted and cannot be recovered. Are you sure?`}
        confirmLabel="Permanently Delete"
        danger
        onConfirm={() => executePermanentDelete(permDeleteConfirmCard)}
        onClose={() => setPermDeleteConfirmCard(null)}
      />

      {/* Toasts */}
      <div className="toast-wrap">
        {toasts.map(t => <div key={t.id} className="toast"><span className="toast-dot" />{t.text}</div>)}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
