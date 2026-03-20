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
  const stageRef = useRef(null);
  const videoRef = useRef(null);
  const blackoutRef = useRef(null);
  const logoWrapRef = useRef(null);
  const scrollCueRef = useRef(null);
  const chromeRef = useRef(null);
  const storyRef = useRef(null);
  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
  const durationRef = useRef(6);
  const rafRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const mobileRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    reducedMotionRef.current = mediaQuery.matches;
    mobileRef.current = mobileQuery.matches;

    const video = videoRef.current;
    const stage = stageRef.current;
    const blackout = blackoutRef.current;
    const logoWrap = logoWrapRef.current;
    const scrollCue = scrollCueRef.current;
    const chrome = chromeRef.current;
    const story = storyRef.current;

    if (!video || !stage || !blackout || !logoWrap || !scrollCue || !chrome || !story) {
      return undefined;
    }

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

      const activeMoments = mobileRef.current
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

      const cueOpacity = 1 - smoothstep(mapRange(easedProgress, 0.04, 0.18));
      scrollCue.style.opacity = cueOpacity.toFixed(3);

      const chromeOpacity = 1 - smoothstep(mapRange(easedProgress, 0.66, 0.82));
      chrome.style.opacity = chromeOpacity.toFixed(3);
    };

    const setVideoTime = (progress) => {
      const playableDuration = Math.max(durationRef.current - 0.05, 0);
      const nextTime = clamp(progress, 0, 1) * playableDuration;
      const drift = Math.abs(video.currentTime - nextTime);

      if (drift > 0.033) {
        video.currentTime = nextTime;
      }
    };

    const updateScene = () => {
      currentProgressRef.current +=
        (targetProgressRef.current - currentProgressRef.current) * 0.12;

      if (Math.abs(targetProgressRef.current - currentProgressRef.current) < 0.0005) {
        currentProgressRef.current = targetProgressRef.current;
      }

      setVideoTime(currentProgressRef.current);
      setScene(currentProgressRef.current);

      if (currentProgressRef.current !== targetProgressRef.current) {
        rafRef.current = window.requestAnimationFrame(updateScene);
      } else {
        rafRef.current = 0;
      }
    };

    const queueUpdate = () => {
      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(updateScene);
      }
    };

    const syncScrollProgress = () => {
      if (reducedMotionRef.current) {
        setScene(1);
        return;
      }

      const rect = stage.getBoundingClientRect();
      const totalScrollable = Math.max(rect.height - window.innerHeight, 1);
      const traveled = clamp(-rect.top, 0, totalScrollable);
      targetProgressRef.current = clamp(traveled / totalScrollable, 0, 1);
      queueUpdate();
    };

    const onMotionChange = (event) => {
      reducedMotionRef.current = event.matches;

      if (event.matches) {
        if (rafRef.current) {
          window.cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
        }

        currentProgressRef.current = 1;
        targetProgressRef.current = 1;
        setScene(1);
        video.removeAttribute("muted");
        return;
      }

      video.muted = true;
      syncScrollProgress();
    };

    const onMobileChange = (event) => {
      mobileRef.current = event.matches;
      syncScrollProgress();
    };

    const onMetadata = () => {
      durationRef.current = video.duration || durationRef.current;

      if (reducedMotionRef.current) {
        setScene(1);
        return;
      }

      setVideoTime(0);
      syncScrollProgress();
    };

    video.pause();
    video.muted = true;
    video.playsInline = true;

    if (video.readyState >= 1) {
      onMetadata();
    } else {
      video.addEventListener("loadedmetadata", onMetadata, { once: true });
    }

    if (!reducedMotionRef.current) {
      window.addEventListener("scroll", syncScrollProgress, { passive: true });
      window.addEventListener("resize", syncScrollProgress);
      window.addEventListener("load", syncScrollProgress);
      mediaQuery.addEventListener("change", onMotionChange);
      mobileQuery.addEventListener("change", onMobileChange);
    } else {
      setScene(1);
      mediaQuery.addEventListener("change", onMotionChange);
      mobileQuery.addEventListener("change", onMobileChange);
    }

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }

      window.removeEventListener("scroll", syncScrollProgress);
      window.removeEventListener("resize", syncScrollProgress);
      window.removeEventListener("load", syncScrollProgress);
      mediaQuery.removeEventListener("change", onMotionChange);
      mobileQuery.removeEventListener("change", onMobileChange);
    };
  }, []);

  return (
    <main className="page-shell">
      <section ref={stageRef} className="scroll-stage" aria-label="Shushu Mushu intro">
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

            <div ref={scrollCueRef} className="scroll-cue">
              <span>Scroll to enter</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
