/* Model Utility: section outline and quiet entrances. No dependencies. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  if (!('IntersectionObserver' in window)) return;

  /* highlight the section being read */
  const links = $$('.outline a[href^="#"]');
  const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach(a => a.classList.remove('on'));
      const a = byId.get(e.target.id);
      if (a) a.classList.add('on');
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id], .close').forEach(s => spy.observe(s));

  /* let things arrive as they are reached */
  if (reduce) return;
  const items = $$('.hero-copy > *, .panel, .trust, .sec h2, .cols, .intro, .vs, .pull, .trio li, .pipe li, .aside, .use, .plate--study, .close-grid > *');
  const show = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); show.unobserve(e.target); }
  }, { rootMargin: '0px 0px -6% 0px' });
  items.forEach(el => {
    el.classList.add('rv');
    const sib = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
    if (el.matches('.trio li, .pipe li, .panel, .hero-copy > *')) el.style.transitionDelay = (sib * 90) + 'ms';
    show.observe(el);
  });
})();
