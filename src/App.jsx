import { useEffect, useRef } from "react";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const mapRange = (value, start, end) => {
  if (value <= start) return 0;
  if (value >= end) return 1;
  return (value - start) / (end - start);
};

const smoothstep = (value) => value * value * (3 - 2 * value);

const storyMoments = [
  {
    text: "the quiet place in town",
    enterStart: 0.08,
    enterEnd: 0.16,
    exitStart: 0.3,
    exitEnd: 0.38,
  },
  {
    text: "find your quality",
    enterStart: 0.4,
    enterEnd: 0.48,
    exitStart: 0.62,
    exitEnd: 0.7,
  },
  {
    text: "stay for one more",
    enterStart: 0.72,
    enterEnd: 0.8,
    exitStart: 1.2,
    exitEnd: 1.28,
  },
];

function App() {
  const videoRef = useRef(null);
  const blackoutRef = useRef(null);
  const logoWrapRef = useRef(null);
  const chromeRef = useRef(null);
  const storyRef = useRef(null);
  const reducedMotionRef = useRef(false);
  const mobileRef = useRef(false);
  const rafRef = useRef(0);
  const animationStartRef = useRef(null);
  const holdTimeoutRef = useRef(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    reducedMotionRef.current = mediaQuery.matches;
    mobileRef.current = mobileQuery.matches;

    const video = videoRef.current;
    const blackout = blackoutRef.current;
    const logoWrap = logoWrapRef.current;
    const chrome = chromeRef.current;
    const story = storyRef.current;

    if (!video || !blackout || !logoWrap || !chrome || !story) {
      return undefined;
    }

    const getMoments = () =>
      mobileRef.current
        ? [
            {
              text: storyMoments[0].text,
              enterStart: 0.12,
              enterEnd: 0.22,
              exitStart: 0.34,
              exitEnd: 0.44,
            },
            {
              text: storyMoments[1].text,
              enterStart: 0.5,
              enterEnd: 0.6,
              exitStart: 0.72,
              exitEnd: 0.8,
            },
            {
              text: storyMoments[2].text,
              enterStart: 0.84,
              enterEnd: 0.92,
              exitStart: 1.2,
              exitEnd: 1.28,
            },
          ]
        : storyMoments;

    const setScene = (progress) => {
      const easedProgress = clamp(progress, 0, 1);
      const videoScale = 1.04 - smoothstep(mapRange(easedProgress, 0, 0.74)) * 0.04;
      const videoContrast = 1.02 + smoothstep(mapRange(easedProgress, 0.08, 0.68)) * 0.08;
      const videoBrightness = 0.88 - smoothstep(mapRange(easedProgress, 0.64, 1)) * 0.08;

      video.style.transform = `scale(${videoScale.toFixed(4)})`;
      video.style.filter = `saturate(0.9) contrast(${videoContrast.toFixed(3)}) brightness(${videoBrightness.toFixed(3)})`;

      const blackoutStart = mobileRef.current ? 0.74 : 0.7;
      const blackoutEnd = mobileRef.current ? 0.96 : 0.94;
      const blackoutProgress = smoothstep(mapRange(easedProgress, blackoutStart, blackoutEnd));
      blackout.style.opacity = blackoutProgress.toFixed(3);

      const logoStart = mobileRef.current ? 0.86 : 0.82;
      const logoOpacity = smoothstep(mapRange(easedProgress, logoStart, 0.985));
      const logoTranslate = 18 - logoOpacity * 18;
      logoWrap.style.opacity = logoOpacity.toFixed(3);
      logoWrap.style.transform = `translate3d(-50%, calc(-50% + ${logoTranslate.toFixed(2)}px), 0)`;

      const activeMoments = getMoments();
      const activeMoment =
        activeMoments.find(
          (moment) =>
            easedProgress >= moment.enterStart && easedProgress <= moment.exitEnd,
        ) ?? activeMoments[activeMoments.length - 1];
      const lineIn = smoothstep(
        mapRange(easedProgress, activeMoment.enterStart, activeMoment.enterEnd),
      );
      const lineOut = 1 - smoothstep(
        mapRange(easedProgress, activeMoment.exitStart, activeMoment.exitEnd),
      );
      const storyOpacity = clamp(Math.min(lineIn, lineOut), 0, 1);
      const storyLift = 14 - storyOpacity * 14;
      story.textContent = activeMoment.text;
      story.style.opacity = storyOpacity.toFixed(3);
      story.style.transform = `translate3d(0, ${storyLift.toFixed(2)}px, 0)`;

      const chromeOpacity = 1 - smoothstep(mapRange(easedProgress, 0.66, 0.82));
      chrome.style.opacity = chromeOpacity.toFixed(3);
    };

    const finishAtLogo = () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }

      video.pause();
      setScene(1);
    };

    const runTimeline = (timestamp) => {
      if (animationStartRef.current === null) {
        animationStartRef.current = timestamp;
      }

      const duration = Math.max((video.duration || 6) * 1000, 1);
      const progress = clamp((timestamp - animationStartRef.current) / duration, 0, 1);

      setScene(progress);

      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(runTimeline);
      } else {
        rafRef.current = 0;
        holdTimeoutRef.current = window.setTimeout(finishAtLogo, 120);
      }
    };

    const startPlayback = async () => {
      animationStartRef.current = null;
      setScene(0);

      if (reducedMotionRef.current) {
        finishAtLogo();
        return;
      }

      video.currentTime = 0;
      video.muted = true;
      video.playsInline = true;

      try {
        await video.play();
      } catch (_error) {
        // Ignore autoplay rejection; visual timeline still runs.
      }

      rafRef.current = window.requestAnimationFrame(runTimeline);
    };

    const onMotionChange = (event) => {
      reducedMotionRef.current = event.matches;
      window.clearTimeout(holdTimeoutRef.current);

      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }

      if (event.matches) {
        finishAtLogo();
        return;
      }

      startPlayback();
    };

    const onMobileChange = (event) => {
      mobileRef.current = event.matches;
      setScene(1);
    };

    const onMetadata = () => {
      startPlayback();
    };

    video.pause();
    video.muted = true;
    video.playsInline = true;

    mediaQuery.addEventListener("change", onMotionChange);
    mobileQuery.addEventListener("change", onMobileChange);

    if (video.readyState >= 1) {
      onMetadata();
    } else {
      video.addEventListener("loadedmetadata", onMetadata, { once: true });
    }

    return () => {
      window.clearTimeout(holdTimeoutRef.current);

      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }

      mediaQuery.removeEventListener("change", onMotionChange);
      mobileQuery.removeEventListener("change", onMobileChange);
    };
  }, []);

  return (
    <main className="page-shell">
      <section className="scroll-stage autoplay-stage" aria-label="Shushu Mushu intro">
        <div className="hero-pin">
          <div className="hero-media">
            <video
              ref={videoRef}
              className="hero-video"
              src="/media/shushumushu.mp4"
              preload="auto"
              muted
              playsInline
            />
            <div className="hero-vignette" />
            <div className="hero-beam" />
            <div className="hero-grid" />
            <div className="hero-grain" />
            <div ref={blackoutRef} className="hero-blackout" />
          </div>

          <div className="hero-overlay">
            <div ref={chromeRef} className="hero-chrome">
              <p className="hero-label">Shushu Mushu</p>
              <p className="hero-meta">Bar / Cafe / Late Hours</p>
            </div>

            <p ref={storyRef} className="hero-storyline" aria-live="polite">
              {storyMoments[0].text}
            </p>

            <div ref={logoWrapRef} className="final-logo-lockup">
              <img
                className="final-logo"
                src="/brand/shushu-mushu-no-back.png"
                alt="Shushu Mushu"
              />
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
