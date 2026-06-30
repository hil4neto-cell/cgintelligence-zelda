const header = document.querySelector('.site-header');
const pageDeck = document.querySelector('.page-deck');
const pageViewport = document.querySelector('.page-viewport');
const pageTrack = document.querySelector('.page-track');
const stageLinks = Array.from(document.querySelectorAll('.nav-links [data-stage-target]'));
const moduleLinks = Array.from(document.querySelectorAll('[data-module-target]'));
const signalLinks = Array.from(document.querySelectorAll('[data-scroll-signal]'));
const panels = Array.from(document.querySelectorAll('.stage-page'));
const revealTargets = Array.from(document.querySelectorAll('.metrics, .module-detail, .module-signal'));
const canvas = document.querySelector('.system-field');
const ctx = canvas ? canvas.getContext('2d') : null;
const moduleHeroVideos = Array.from(document.querySelectorAll('.module-hero-video'));
const reducedMotion = false;
const hashToPanel = { '#orchestration': 0, '#layers': 1, '#systems': 2 };
const panelToHash = ['#orchestration', '#layers', '#systems'];
const zoomOutDuration = 1000;
const slideStartDelay = 120;
const slideDuration = zoomOutDuration - slideStartDelay;
const settleDelay = zoomOutDuration;
const cleanupDelay = settleDelay + 520;
const headerFadeOutDuration = 360;
const headerFastFadeOutDuration = 280;
const headerFastScrollDelta = 96;
const headerFastHideDuration = headerFastFadeOutDuration;
const headerPrepDuration = 0;
const headerTraceDuration = 1180;
const headerMorphDuration = 320;
let activePanel = 0;
let transitionTimers = [];
let headerTimers = [];
let transitionToken = 0;
let resizeTimer = null;
let headerRaf = null;
let headerTargetVisible = true;
let headerTargetElevated = header ? header.dataset.elevated === 'true' : false;
let lastScrollY = window.scrollY;
let lastScrollDelta = 0;
let headerScrollDirection = 'down';
let lastHeadlineTop = null;
let lastHeadlineBottom = null;
let forcedHeaderHiddenUntil = 0;
let headerFastHideConsumed = false;
let headerRecoveryTimer = null;
let width = 0;
let height = 0;
let particles = [];
let mouse = { x: 0.5, y: 0.5 };
let rafId = null;
let revealObserver = null;

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

function clampPanel(index) {
  const max = Math.max(0, panels.length - 1);
  const parsed = Number.parseInt(index, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(max, parsed));
}

function headerOffset() {
  return header ? header.getBoundingClientRect().height + 18 : 18;
}

function syncDeckHeight() {
  if (!pageViewport || !panels[activePanel]) return;
  pageViewport.style.height = panels[activePanel].offsetHeight + 'px';
}

function updateStageLinks(panel) {
  stageLinks.forEach((link) => {
    const active = Number(link.dataset.stageTarget) === panel;
    link.setAttribute('aria-current', active ? 'true' : 'false');
  });
}

function scrollDeckTop(instant = false) {
  if (!pageDeck) return;
  const top = pageDeck.getBoundingClientRect().top + window.scrollY - headerOffset();
  const behavior = instant || reducedMotion ? 'auto' : 'smooth';
  window.scrollTo({ top: Math.max(0, top), left: 0, behavior });
}

function lockDocumentX() {
  const scroller = document.scrollingElement || document.documentElement;
  if (scroller && scroller.scrollLeft !== 0) scroller.scrollLeft = 0;
  if (document.body && document.body.scrollLeft !== 0) document.body.scrollLeft = 0;
}

function getActiveHeroVideo() {
  return panels[activePanel] ? panels[activePanel].querySelector('.module-hero-video') : null;
}

function getActiveMediaFrame() {
  return panels[activePanel] ? panels[activePanel].querySelector('.media-hero-frame') : null;
}

function heroVideoHasDuration(video) {
  return video && Number.isFinite(video.duration) && video.duration > 0;
}

function seekHeroVideoToLastFrame(video) {
  if (!heroVideoHasDuration(video)) return;
  try {
    video.currentTime = Math.max(0, video.duration - 0.06);
  } catch (error) {
    // Some browsers defer seeking until the video metadata is ready.
  }
}

function playHeroVideo(video) {
  if (!video || reducedMotion) return;
  if (video.dataset.frozen === 'true' || video.ended) {
    freezeHeroVideoOnLastFrame(video);
    return;
  }
  video.dataset.frozen = 'false';
  const playRequest = video.play();
  if (playRequest && typeof playRequest.catch === 'function') {
    playRequest.catch(() => {});
  }
}

function freezeHeroVideoOnLastFrame(video) {
  if (!video || video.dataset.frozen === 'true') return;
  video.dataset.frozen = 'true';
  video.pause();
  if (heroVideoHasDuration(video)) {
    seekHeroVideoToLastFrame(video);
    return;
  }
  video.addEventListener('loadedmetadata', () => seekHeroVideoToLastFrame(video), { once: true });
}

function syncHeroVideosForPanel() {
  const activeVideo = getActiveHeroVideo();
  moduleHeroVideos.forEach((video) => {
    if (video === activeVideo) {
      playHeroVideo(video);
      return;
    }
    if (video.dataset.frozen !== 'true') video.pause();
  });
}

function handleHeroVideoEnded(video) {
  freezeHeroVideoOnLastFrame(video);
}

function updateHeroVideoOnScroll() {
  const activeVideo = getActiveHeroVideo();
  if (activeVideo && activeVideo.ended) freezeHeroVideoOnLastFrame(activeVideo);
}

function preventHorizontalWheel(event) {
  const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
  if (!horizontalIntent) return;
  event.preventDefault();
  lockDocumentX();
}

function clearTransitionTimers() {
  transitionTimers.forEach((timer) => window.clearTimeout(timer));
  transitionTimers = [];
}

function queueTransitionStep(callback, delay) {
  const timer = window.setTimeout(callback, delay);
  transitionTimers.push(timer);
}

function clearHeaderTimers() {
  headerTimers.forEach((timer) => window.clearTimeout(timer));
  headerTimers = [];
}

function queueHeaderStep(callback, delay) {
  const timer = window.setTimeout(callback, Math.max(0, delay));
  headerTimers.push(timer);
}

function setHeaderVisibility(visibility) {
  if (!header) return;
  header.dataset.visibility = visibility;
  if (visibility === 'hidden') {
    setHeaderContentVisible(false);
  }
  if (visibility !== 'hidden') {
    header.dataset.fastHide = 'false';
  }
}

function setHeaderContentVisible(visible) {
  if (!header) return;
  header.dataset.content = visible ? 'visible' : 'hidden';
}

function setHeaderElevated(elevated) {
  if (!header) return;
  const next = elevated ? 'true' : 'false';
  if (header.dataset.elevated === next) return;
  header.dataset.elevated = next;
}

function setHeaderFastHide(fastHide) {
  if (!header) return;
  header.dataset.fastHide = fastHide ? 'true' : 'false';
}

function queueHeaderRecovery() {
  if (headerRecoveryTimer) window.clearTimeout(headerRecoveryTimer);
  headerRecoveryTimer = window.setTimeout(() => {
    headerRecoveryTimer = null;
    requestHeaderUpdate();
  }, headerFastHideDuration + 8);
}

function keepHeaderHiddenWhileForced() {
  if (Date.now() >= forcedHeaderHiddenUntil) return false;
  setHeaderFastHide(true);
  setHeaderVisibility('hidden');
  queueHeaderRecovery();
  return true;
}

function revealHeaderWithTrace(elevated) {
  const nextElevated = elevated ? 'true' : 'false';
  const needsPrep = header && header.dataset.elevated !== nextElevated;
  setHeaderElevated(elevated);
  queueHeaderStep(() => {
    if (keepHeaderHiddenWhileForced()) return;
    setHeaderVisibility('tracing');
    setHeaderContentVisible(true);
    queueHeaderStep(() => {
      if (keepHeaderHiddenWhileForced()) return;
      setHeaderVisibility('morphing');
      queueHeaderStep(() => {
        if (keepHeaderHiddenWhileForced()) return;
        setHeaderVisibility('visible');
      }, headerMorphDuration);
    }, headerTraceDuration);
  }, needsPrep ? headerPrepDuration : 0);
}

function revealHeaderWithFade(elevated) {
  const nextElevated = elevated ? 'true' : 'false';
  const needsPrep = header && header.dataset.elevated !== nextElevated;
  setHeaderElevated(elevated);
  queueHeaderStep(() => {
    if (keepHeaderHiddenWhileForced()) return;
    setHeaderVisibility('visible');
    setHeaderContentVisible(true);
  }, needsPrep ? headerPrepDuration : 0);
}

function shouldTraceHeader(target) {
  return target.elevated && headerScrollDirection !== 'up';
}

function getActiveHeadline() {
  return panels[activePanel] ? panels[activePanel].querySelector('.hero h1') : null;
}

function resetHeadlineTracking() {
  lastHeadlineTop = null;
  lastHeadlineBottom = null;
  headerFastHideConsumed = false;
}

function syncFastHideGuard(headlineRect, headerRect) {
  if (window.scrollY <= 42 || headlineRect.top > headerRect.bottom + 220) {
    headerFastHideConsumed = false;
  }
}

function forceHeaderHideForFastScroll() {
  if (!header || headerScrollDirection !== 'down' || window.scrollY <= 42) return false;
  const headline = getActiveHeadline();
  if (!headline) return false;

  const headerRect = header.getBoundingClientRect();
  const headlineRect = headline.getBoundingClientRect();
  const currentVisibility = header.dataset.visibility || 'visible';
  const headlineNearHeader = headlineRect.top < headerRect.bottom + 220;
  const headlineStillRelevant = headlineRect.bottom > headerRect.top - 240;
  const headlineCrossedOrConflicts = headlineRect.bottom < headerRect.top + 64 || headlineRect.top < headerRect.bottom + 34;
  const fastEnough = lastScrollDelta > headerFastScrollDelta || headlineCrossedOrConflicts;

  syncFastHideGuard(headlineRect, headerRect);

  if (headerFastHideConsumed || !fastEnough || !headlineNearHeader || !headlineStillRelevant || currentVisibility === 'hidden') return false;

  clearHeaderTimers();
  headerFastHideConsumed = true;
  forcedHeaderHiddenUntil = Date.now() + headerFastHideDuration;
  headerTargetVisible = false;
  headerTargetElevated = true;
  setHeaderFastHide(true);
  setHeaderElevated(true);
  setHeaderVisibility('hidden');
  queueHeaderRecovery();
  return true;
}

function getHeaderTarget() {
  if (!header) return { visible: true, elevated: false, fastHide: false };
  const headline = getActiveHeadline();
  if (!headline) {
    resetHeadlineTracking();
    return { visible: true, elevated: window.scrollY > 42, fastHide: false };
  }

  const headerRect = header.getBoundingClientRect();
  const headlineRect = headline.getBoundingClientRect();
  syncFastHideGuard(headlineRect, headerRect);
  const headlineNearHeader = headlineRect.top < headerRect.bottom + 34;
  const headlinePastHeader = headlineRect.bottom < headerRect.top + 44;
  const headlineActivelyConflicts = headlineNearHeader && !headlinePastHeader;
  const fastDownScroll = headerScrollDirection === 'down' && lastScrollDelta > headerFastScrollDelta;
  const currentHeaderVisibility = header.dataset.visibility || 'visible';
  const visibleHeaderEnteredConflict =
    headerScrollDirection === 'down' &&
    headlineActivelyConflicts &&
    currentHeaderVisibility !== 'hidden';
  const headlineRecentlyPassedHeader =
    headlineNearHeader &&
    headlinePastHeader &&
    headlineRect.bottom > headerRect.top - 220;
  const visibleHeaderSkippedConflict =
    headlineRecentlyPassedHeader &&
    currentHeaderVisibility !== 'hidden';
  const headlineJumpedThroughHeader =
    headerScrollDirection === 'down' &&
    lastHeadlineTop !== null &&
    lastHeadlineBottom !== null &&
    lastHeadlineTop >= headerRect.bottom + 34 &&
    headlineRect.bottom < headerRect.top + 44 &&
    headlineRect.bottom > headerRect.top - 220;
  const headlineCrossedFastZone =
    (fastDownScroll || headlineJumpedThroughHeader || visibleHeaderSkippedConflict) &&
    window.scrollY > 42 &&
    headlineRect.top < headerRect.bottom + 180 &&
    headlineRect.bottom > headerRect.top - 180;

  lastHeadlineTop = headlineRect.top;
  lastHeadlineBottom = headlineRect.bottom;

  if (!headerFastHideConsumed && (headlineCrossedFastZone || visibleHeaderEnteredConflict)) {
    headerFastHideConsumed = true;
    forcedHeaderHiddenUntil = Date.now() + headerFastHideDuration;
    queueHeaderRecovery();
  }

  const fastHideActive = Date.now() < forcedHeaderHiddenUntil;
  const headlineConflicts = headlineActivelyConflicts || fastHideActive;
  const elevated = window.scrollY > 42 && (headlineNearHeader || headlinePastHeader);

  return {
    visible: !headlineConflicts,
    elevated,
    fastHide: fastHideActive,
  };
}

function applyHeaderTarget(target) {
  if (!header) return;
  if (target.visible === headerTargetVisible && target.elevated === headerTargetElevated) return;

  clearHeaderTimers();
  headerTargetVisible = target.visible;
  headerTargetElevated = target.elevated;

  if (!target.visible) {
    setHeaderFastHide(target.fastHide);
    setHeaderVisibility('hidden');
    queueHeaderStep(() => {
      setHeaderElevated(target.elevated);
    }, target.fastHide ? headerFastFadeOutDuration : headerFadeOutDuration);
    return;
  }

  const currentVisibility = header.dataset.visibility || 'visible';
  const currentElevated = header.dataset.elevated === 'true';

  if (currentVisibility !== 'visible') {
    if (shouldTraceHeader(target)) {
      revealHeaderWithTrace(target.elevated);
      return;
    }
    revealHeaderWithFade(target.elevated);
    return;
  }

  if (currentElevated !== target.elevated) {
    setHeaderVisibility('hidden');
    queueHeaderStep(() => {
      setHeaderElevated(target.elevated);
      queueHeaderStep(() => {
        if (shouldTraceHeader(target)) {
          revealHeaderWithTrace(target.elevated);
          return;
        }
        revealHeaderWithFade(target.elevated);
      }, headerPrepDuration);
    }, headerFadeOutDuration);
    return;
  }

  setHeaderVisibility('visible');
}

function updateHeaderState() {
  if (!header) return;
  applyHeaderTarget(getHeaderTarget());
}

function requestHeaderUpdate() {
  if (headerRaf) return;
  headerRaf = window.requestAnimationFrame(() => {
    headerRaf = null;
    updateHeaderState();
  });
}

function setDeckPhase(phase) {
  if (!pageDeck) return;
  if (!phase) {
    pageDeck.classList.remove('is-transitioning');
    pageDeck.style.removeProperty('--track-panel');
    delete pageDeck.dataset.motionPhase;
    delete pageDeck.dataset.fromPanel;
    delete pageDeck.dataset.toPanel;
    panels.forEach((panel) => {
      panel.classList.remove('is-exiting', 'is-entering');
    });
    return;
  }
  pageDeck.classList.add('is-transitioning');
  pageDeck.dataset.motionPhase = phase;
}

function commitActivePanel(panel, options = {}) {
  activePanel = panel;
  resetHeadlineTracking();
  pageTrack.dataset.activePanel = String(activePanel);
  pageDeck.dataset.activePanel = String(activePanel);
  panels.forEach((stagePanel) => {
    stagePanel.classList.toggle('is-active', Number(stagePanel.dataset.panel) === activePanel);
  });
  updateStageLinks(activePanel);
  syncDeckHeight();
  requestHeaderUpdate();
  syncHeroVideosForPanel();

  if (options.updateHash && panelToHash[activePanel] && window.location.hash !== panelToHash[activePanel]) {
    history.replaceState(null, '', panelToHash[activePanel]);
  }
}

function scrollToActiveSignal() {
  const signal = panels[activePanel] ? panels[activePanel].querySelector('.module-signal') : null;
  if (!signal) return;
  const top = signal.getBoundingClientRect().top + window.scrollY - headerOffset();
  window.scrollTo({ top: Math.max(0, top), left: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
}

function setActivePanel(index, options = {}) {
  if (!pageTrack || !pageDeck) return;
  const nextPanel = clampPanel(index);
  const changed = nextPanel !== activePanel;
  const shouldScroll = Boolean(options.scroll);
  const shouldUpdateHash = options.updateHash !== false;
  const instant = Boolean(options.instant);

  if (!changed || instant) {
    clearTransitionTimers();
    setDeckPhase(null);
    commitActivePanel(nextPanel, { updateHash: shouldUpdateHash });
    if (shouldScroll) scrollDeckTop(instant);
    return;
  }

  clearTransitionTimers();
  const token = ++transitionToken;
  const fromPanel = activePanel;
  const direction = nextPanel > fromPanel ? 1 : -1;

  pageDeck.style.setProperty('--motion-direction', String(direction));
  pageDeck.style.setProperty('--motion-drift', direction > 0 ? '-5vw' : '5vw');
  pageDeck.dataset.fromPanel = String(fromPanel);
  pageDeck.dataset.toPanel = String(nextPanel);
  panels.forEach((panel) => {
    const panelIndex = Number(panel.dataset.panel);
    panel.classList.toggle('is-exiting', panelIndex === fromPanel);
    panel.classList.toggle('is-entering', panelIndex === nextPanel);
  });

  setDeckPhase('exit');
  syncDeckHeight();
  if (shouldUpdateHash && panelToHash[nextPanel] && window.location.hash !== panelToHash[nextPanel]) {
    history.replaceState(null, '', panelToHash[nextPanel]);
  }
  if (shouldScroll) scrollDeckTop(false);

  queueTransitionStep(() => {
    if (token !== transitionToken) return;
    pageDeck.style.setProperty('--track-panel', String(nextPanel));
    setDeckPhase('travel');
  }, slideStartDelay);

  queueTransitionStep(() => {
    if (token !== transitionToken) return;
    setDeckPhase('settle');
    commitActivePanel(nextPanel, { updateHash: false });
    syncDeckHeight();
  }, settleDelay);

  queueTransitionStep(() => {
    if (token !== transitionToken) return;
    setDeckPhase(null);
    syncDeckHeight();
  }, cleanupDelay);
}

stageLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    setActivePanel(link.dataset.stageTarget, { updateHash: true });
  });
});

moduleLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    setActivePanel(link.dataset.moduleTarget, { updateHash: true });
  });
});

signalLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    scrollToActiveSignal();
  });
});

window.addEventListener('hashchange', () => {
  if (hashToPanel[window.location.hash] === undefined) return;
  setActivePanel(hashToPanel[window.location.hash], { updateHash: false });
});

window.addEventListener('wheel', preventHorizontalWheel, { passive: false });

window.addEventListener('scroll', () => {
  const currentScrollY = window.scrollY;
  if (currentScrollY !== lastScrollY) {
    lastScrollDelta = currentScrollY - lastScrollY;
    headerScrollDirection = lastScrollDelta < 0 ? 'up' : 'down';
    lastScrollY = currentScrollY;
  }
  forceHeaderHideForFastScroll();
  updateHeroVideoOnScroll();
  lockDocumentX();
  requestHeaderUpdate();
}, { passive: true });

function prepareRevealChildren(target) {
  const children = target.matches('.metrics')
    ? Array.from(target.children)
    : Array.from(target.querySelectorAll('.detail-copy, .orchestration-panel article, .layer-card, .systems-grid span, :scope > *'));

  children.forEach((child, index) => {
    child.style.setProperty('--child-order', String(Math.min(index, 5)));
  });
}

function setupScrollReveals() {
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((target) => target.classList.add('is-revealed'));
    return;
  }

  revealTargets.forEach((target, index) => {
    target.classList.add('reveal-on-scroll');
    target.style.setProperty('--reveal-order', String(index % 3));
    prepareRevealChildren(target);
  });

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('is-revealed', entry.isIntersecting);
    });
  }, {
    threshold: 0.05,
    rootMargin: '-4% 0px -10% 0px',
  });

  revealTargets.forEach((target) => revealObserver.observe(target));
}

window.addEventListener('keydown', (event) => {
  if (!pageDeck || event.altKey || event.metaKey || event.ctrlKey) return;
  const tag = document.activeElement ? document.activeElement.tagName : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const rect = pageDeck.getBoundingClientRect();
  const visible = rect.top < window.innerHeight * 0.75 && rect.bottom > window.innerHeight * 0.25;
  if (!visible) return;
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    setActivePanel(activePanel + 1, { updateHash: true });
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    setActivePanel(activePanel - 1, { updateHash: true });
  }
});

function resizeCanvas() {
  if (!ctx || !canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.min(86, Math.max(36, Math.floor(width / 20)));
  particles = Array.from({ length: count }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.22,
    vy: (Math.random() - 0.5) * 0.22,
    r: index % 7 === 0 ? 1.8 : 1.1,
  }));
}

function drawField() {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(242,242,242,0.14)';
  ctx.fillStyle = 'rgba(242,242,242,0.54)';

  for (const p of particles) {
    p.x += p.vx + (mouse.x - 0.5) * 0.06;
    p.y += p.vy + (mouse.y - 0.5) * 0.04;
    if (p.x < -20) p.x = width + 20;
    if (p.x > width + 20) p.x = -20;
    if (p.y < -20) p.y = height + 20;
    if (p.y > height + 20) p.y = -20;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < particles.length; i += 1) {
    for (let j = i + 1; j < particles.length; j += 1) {
      const a = particles[i];
      const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 128) {
        ctx.globalAlpha = (1 - dist / 128) * 0.46;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  ctx.globalAlpha = 1;
  rafId = requestAnimationFrame(drawField);
}

window.addEventListener('pointermove', (event) => {
  mouse = { x: event.clientX / window.innerWidth, y: event.clientY / window.innerHeight };
}, { passive: true });

window.addEventListener('resize', () => {
  resizeCanvas();
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    syncDeckHeight();
    requestHeaderUpdate();
  }, 120);
});

window.addEventListener('load', () => {
  syncDeckHeight();
  requestHeaderUpdate();
});
window.addEventListener('pagehide', () => {
  if (rafId) cancelAnimationFrame(rafId);
  if (headerRaf) cancelAnimationFrame(headerRaf);
  clearHeaderTimers();
  if (revealObserver) revealObserver.disconnect();
});

moduleHeroVideos.forEach((video) => {
  video.loop = false;
  video.addEventListener('ended', () => handleHeroVideoEnded(video));
});

setupScrollReveals();
resizeCanvas();
if (!reducedMotion) {
  drawField();
}

window.requestAnimationFrame(() => {
  lockDocumentX();
  const hashPanel = hashToPanel[window.location.hash];
  if (hashPanel !== undefined) {
    setActivePanel(hashPanel, { scroll: false, updateHash: false, instant: true });
  } else {
    setActivePanel(0, { scroll: false, updateHash: false, instant: true });
  }
  requestHeaderUpdate();
});
