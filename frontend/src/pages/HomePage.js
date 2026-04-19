import { useEffect, useRef } from 'react';
import { SearchField } from '../components/ui';
import { ZOOM_IN_THRESHOLD } from '../zoomConstants';

function HomeIntro({ eyebrow, headline, lead }) {
  return (
    <>
      <p className="home-eyebrow">{eyebrow}</p>
      <h2 className="home-headline">{headline}</h2>
      <p className="home-lead">{lead}</p>
    </>
  );
}

function HomeSection({ sectionId, title, variant, children }) {
  const sectionClass = variant === 'alt' ? 'home-section home-section--alt' : 'home-section';
  return (
    <section className={sectionClass} aria-labelledby={sectionId}>
      <h2 id={sectionId}>{title}</h2>
      {children}
    </section>
  );
}

function HomePage({ textSize = 'small', onTrack }) {
  const onTrackRef = useRef(onTrack);
  const maxZoomRef = useRef(window.visualViewport?.scale ?? 1);
  const zoomedInSinceRef = useRef(null);

  useEffect(() => {
    onTrackRef.current = onTrack;
  }, [onTrack]);

  useEffect(() => {
    const startedAtMs = Date.now();
    const emitTracking = () => {
      if (!onTrackRef.current) return;
      const zoomHeldFor2Seconds =
        zoomedInSinceRef.current !== null && Date.now() - zoomedInSinceRef.current >= 2000;
      onTrackRef.current({
        dwell_time_seconds: Math.max(0, (Date.now() - startedAtMs) / 1000),
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

    window.addEventListener('resize', handleZoom);
    window.visualViewport?.addEventListener('resize', handleZoom);
    window.addEventListener('keydown', handleKeyZoomIn);
    const intervalId = window.setInterval(emitTracking, 4000);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('resize', handleZoom);
      window.visualViewport?.removeEventListener('resize', handleZoom);
      window.removeEventListener('keydown', handleKeyZoomIn);
      emitTracking();
    };
  }, []);

  return (
    <div className="home-page">
      <SearchField
        inputId="global-search"
        placeholder="Search your projects, files, and people…"
        label="Search workspace"
      />
      <div data-ui-element-id="Home_Page_Text_Content" className={`home-text-content home-text-content--${textSize}`}>
        <HomeIntro
          eyebrow="Signed in"
          headline="Welcome back"
          lead="You are in your home workspace. Jump into a project, catch up on activity, or search everything you have access to."
        />

        <HomeSection sectionId="section-activity-heading" title="Your Activity">
          <p>
            Your recent projects, edits, and progress will appear here. To start viewing your activity,
            create a new project. You can also view your contributions to other projects, and analytics.
            Analyze your progress, and see how you're doing compared to others.
          </p>
        </HomeSection>

        <HomeSection sectionId="section-projects-heading" title="Your workspace" variant="alt">
          <p>
            Organize the work that you or you team does using real tools: Workspaces for each initiative, shared
            libraries, and permissions that match how you collaborate. The projects and groups that you belong to
            and collaborate with will appear here.
          </p>
        </HomeSection>

        <HomeSection sectionId="section-next-heading" title="Suggested next steps">
          <p>
            As you create, edit, and collaborate on projects, you will see suggested next steps here.
            These will be based on your activity, and the projects you are involved in. These steps
            can help you get started, stay on track and make the right decisions.
          </p>
        </HomeSection>
      </div>
    </div>
  );
}

export default HomePage;
