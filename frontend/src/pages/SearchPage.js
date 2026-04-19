import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchField } from '../components/ui';
import { ZOOM_IN_THRESHOLD } from '../zoomConstants';

const FEEDS = ['New', 'Top', 'Followed'];
const GRID_SCROLL_TOP_TOLERANCE = 8;
const NO_SCROLL_SAMPLE_MS = 250;

const CARD_COUNT_BY_VERSION = { v1: 15, v2: 18, v3: 15 };

function SearchPage({ gridVersion = 'v1', onTrack }) {
  const [feed, setFeed] = useState('New');
  const onTrackRef = useRef(onTrack);
  const gridScrollRef = useRef(null);
  const noScrollDwellRef = useRef(0);
  const lastNoScrollSampleMsRef = useRef(Date.now());
  const maxZoomRef = useRef(window.visualViewport?.scale ?? 1);
  const zoomedInSinceRef = useRef(null);

  useEffect(() => {
    onTrackRef.current = onTrack;
  }, [onTrack]);

  const cardCount = CARD_COUNT_BY_VERSION[gridVersion] ?? CARD_COUNT_BY_VERSION.v1;

  const cards = useMemo(
    () =>
      Array.from({ length: cardCount }, (_, i) => ({
        id: `${feed}-${i + 1}`,
        title: `${feed} project ${i + 1}`,
        summary: `Placeholder profile for ${feed.toLowerCase()} listing #${i + 1}.`,
      })),
    [feed, cardCount],
  );

  useEffect(() => {
    noScrollDwellRef.current = 0;
    lastNoScrollSampleMsRef.current = Date.now();

    function isGridScrolledDown() {
      const grid = gridScrollRef.current;
      if (!grid) return false;
      if (grid.scrollHeight > grid.clientHeight + 2) {
        return grid.scrollTop > GRID_SCROLL_TOP_TOLERANCE;
      }
      const main = grid.closest('main');
      return main != null && main.scrollTop > GRID_SCROLL_TOP_TOLERANCE;
    }

    function sampleNoScrollDwell() {
      const now = Date.now();
      const elapsed = (now - lastNoScrollSampleMsRef.current) / 1000;
      lastNoScrollSampleMsRef.current = now;
      if (!isGridScrolledDown()) {
        noScrollDwellRef.current += elapsed;
      }
    }

    const emitTracking = () => {
      if (!onTrackRef.current) return;
      sampleNoScrollDwell();
      const zoomHeldFor2Seconds =
        zoomedInSinceRef.current !== null && Date.now() - zoomedInSinceRef.current >= 2000;
      onTrackRef.current({
        dwell_time_seconds: noScrollDwellRef.current,
        zoom_level: zoomHeldFor2Seconds ? maxZoomRef.current : 1,
      });
    };

    const handleZoom = () => {
      const current = window.visualViewport?.scale ?? 1;
      if (current > maxZoomRef.current) maxZoomRef.current = current;
      if (current >= ZOOM_IN_THRESHOLD) {
        if (zoomedInSinceRef.current === null) zoomedInSinceRef.current = Date.now();
      } else {
        zoomedInSinceRef.current = null;
      }
      emitTracking();
    };

    const handleKeyZoomIn = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (event.key !== '+' && event.key !== '=' && event.code !== 'NumpadAdd') return;
      maxZoomRef.current = Math.max(maxZoomRef.current, ZOOM_IN_THRESHOLD);
      if (zoomedInSinceRef.current === null) zoomedInSinceRef.current = Date.now();
      emitTracking();
    };

    const gridEl = gridScrollRef.current;
    const mainEl = gridEl?.closest('main') ?? null;
    const onScroll = () => {
      sampleNoScrollDwell();
    };

    window.addEventListener('resize', handleZoom);
    window.visualViewport?.addEventListener('resize', handleZoom);
    window.addEventListener('keydown', handleKeyZoomIn);
    gridEl?.addEventListener('scroll', onScroll, { passive: true });
    mainEl?.addEventListener('scroll', onScroll, { passive: true });
    const sampleIntervalId = window.setInterval(sampleNoScrollDwell, NO_SCROLL_SAMPLE_MS);
    const emitIntervalId = window.setInterval(emitTracking, 4000);

    return () => {
      window.clearInterval(sampleIntervalId);
      window.clearInterval(emitIntervalId);
      gridEl?.removeEventListener('scroll', onScroll);
      mainEl?.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', handleZoom);
      window.visualViewport?.removeEventListener('resize', handleZoom);
      window.removeEventListener('keydown', handleKeyZoomIn);
      emitTracking();
    };
  }, [cards]);

  return (
    <main className="home-main">
      <div className="search-page">
        <SearchField
          inputId="project-search"
          name="project-search"
          placeholder="Search projects…"
          label="Search projects"
        />

        <div
          className="search-feed-tabs"
          role="tablist"
          aria-label="Project listing type"
          data-ui-element-id="Community_Feed_Tabs"
        >
          {FEEDS.map((option) => {
            const on = feed === option;
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={on}
                className={on ? 'search-feed-tab search-feed-tab--active' : 'search-feed-tab'}
                onClick={() => setFeed(option)}
              >
                {option}
              </button>
            );
          })}
        </div>

        <section
          ref={gridScrollRef}
          className="project-grid-scroll"
          aria-label={`${feed} project profiles`}
          data-ui-element-id="Community_Project_Grid"
        >
          <div className={`project-grid project-grid--${gridVersion}`}>
            {cards.map((item) => (
              <article key={item.id} className={`project-card project-card--${gridVersion}`}>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default SearchPage;
