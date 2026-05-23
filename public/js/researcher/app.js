function KnowledgeBase({ mode, publicDocs, openDocId, onOpenDocHandled }) {
  const [docId, setDocId] = useState(null);

  useEffect(() => { setDocId(null); }, [mode]);

  useEffect(() => {
    if (!openDocId) return;
    setDocId(openDocId);
    onOpenDocHandled?.();
  }, [openDocId, onOpenDocHandled]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", background: "var(--canvas-bg)" }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {mode === "documents" && !docId && <DocumentTypesIndex onPick={setDocId} docs={publicDocs} />}
        {mode === "documents" && docId && <DocumentDetail docId={docId} docs={publicDocs} onBack={() => setDocId(null)} />}
      </div>
    </div>
  );
}

function StubTab({ name, blurb }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "var(--ink-500)", padding: 40 }}>
      <Mono style={{ fontSize: 10.5, letterSpacing: 0.6 }}>STUB</Mono>
      <div style={{ fontFamily: "var(--font-headline)", fontSize: 22, color: "var(--ink-700)", fontWeight: 700, letterSpacing: -0.3 }}>{name}</div>
      <div style={{ fontSize: 13, maxWidth: 360, textAlign: "center", lineHeight: 1.5 }}>{blurb}</div>
    </div>
  );
}

function Portal() {
  const [active, setActive] = useState("Agreement Guide");
  const [kbMode, setKbMode] = useState("documents");
  const [publicDocs, setPublicDocs] = useState([]);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [openDocId, setOpenDocId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarDragging, setSidebarDragging] = useState(false);
  const [sidebarDragWidth, setSidebarDragWidth] = useState(null);
  useEffect(() => {
    let alive = true;
    async function loadPublicDocs() {
      try {
        const listRes = await fetch(`${window.API_BASE}/knowledge-base`);
        const listData = await listRes.json();
        const items = listData.items || [];
        if (!items.length) return;
        const snapshots = await Promise.all(items.map(async (item) => {
          const detailRes = await fetch(`${window.API_BASE}/knowledge-base/${item.id}`);
          const detailData = await detailRes.json();
          return detailData.snapshot;
        }));
        if (alive) setPublicDocs(snapshots.filter(Boolean).map(snapshotToDoc));
      } catch {
        if (alive) setPublicDocs([]);
      }
    }
    loadPublicDocs();
    return () => { alive = false; };
  }, []);

  const sidebarResizeStart = useRef(null);
  const sidebarDragWidthRef = useRef(null);
  const sidebarExpandedWidth = 220;
  const sidebarCollapsedWidth = 56;
  const sidebarWidth = sidebarDragWidth ?? (sidebarCollapsed ? sidebarCollapsedWidth : sidebarExpandedWidth);

  function handleSetActive(id) {
    setActive(id);
    if (id === "Agreement Guide") setKbMode("documents");
  }


  function handleSidebarResizeStart(e) {
    e.preventDefault();
    e.stopPropagation();
    sidebarResizeStart.current = { x: e.clientX, width: sidebarWidth, collapsed: sidebarCollapsed };
    setSidebarDragging(true);
    sidebarDragWidthRef.current = sidebarWidth;
    setSidebarDragWidth(sidebarWidth);
    document.body.style.cursor = "col-resize";

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
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }

  useEffect(() => () => {
    document.body.style.cursor = "";
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setGlobalSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const globalSearchResults = React.useMemo(() => {
    const q = globalSearchQuery;
    return publicDocs
      .map((d) => {
        const hay = buildSearchHaystack([d.name, d.abbrev, d.summary, d.definition, ...(d.offices || [])]);
        if (!matchSearchQuery(hay, q)) return null;
        return {
          id: d.id,
          title: d.name,
          subtitle: (d.summary || d.definition || "").slice(0, 120),
          badge: d.abbrev,
          onSelect: () => {
            setGlobalSearchOpen(false);
            setActive("Agreement Guide");
            setKbMode("documents");
            setOpenDocId(d.id);
          },
        };
      })
      .filter(Boolean)
      .slice(0, q.trim() ? 20 : 8);
  }, [globalSearchQuery, publicDocs]);

  return (
    <React.Fragment>
      <div className="portal-shell" style={{ "--sidebar-w": `${sidebarWidth}px` }}>
        <TopBar onOpenSearch={() => setGlobalSearchOpen(true)} />
        <LeftSidebar active={active} setActive={handleSetActive} collapsed={sidebarCollapsed} dragging={sidebarDragging} onResizeStart={handleSidebarResizeStart} onNewRequest={() => setShowNewRequestModal(true)} />
        <div style={{ gridArea: "main", display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {active === "Agreement Guide" && (
            <KnowledgeBase
              mode={kbMode}
              publicDocs={publicDocs}
              openDocId={openDocId}
              onOpenDocHandled={() => setOpenDocId(null)}
            />
          )}
          {active === "My requests" && <MyRequestsView docs={publicDocs} />}
          {active === "Messages" && <StubTab name="Messages" blurb="Threaded conversations with the offices handling your requests. Out of scope for this prototype." />}
        </div>
      </div>
      {showNewRequestModal && (
        <MyRequestsSigningModal docs={publicDocs} onClose={() => setShowNewRequestModal(false)} />
      )}
      <GlobalSearchPalette
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        query={globalSearchQuery}
        setQuery={setGlobalSearchQuery}
        results={globalSearchResults}
        placeholder="Search agreement types…"
        emptyLabel="No matching documents"
        hintLabel="Published agreement guides — type to filter"
      />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Portal />);
