/* Model Utility: section outline and quiet entrances. No dependencies. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* the film: a play button over the poster, until it starts */
  const film = document.querySelector('.film video'), play = document.querySelector('.film-play');
  if (film && play) {
    film.controls = false;
    play.hidden = false;
    play.addEventListener('click', () => film.play());
    film.addEventListener('play', () => { play.hidden = true; film.controls = true; });
  }

  /* request a pilot: posted to a form service when the form names one,
     otherwise handed to the visitor's email app with the request written out */
  const form = document.querySelector('.pilot-form');
  if (form) {
    const status = form.querySelector('.pilot-status');
    const to = 'contact@modelutility.com';
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      const endpoint = form.dataset.endpoint;
      if (endpoint) {
        status.textContent = 'Sending…';
        try {
          const r = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
          if (!r.ok) throw new Error(String(r.status));
          form.reset();
          status.textContent = 'Thank you. We will be in touch soon.';
        } catch (err) {
          status.textContent = `That did not go through. Please write to ${to}.`;
        }
        return;
      }
      const subject = `Pilot request: ${d.company}`;
      const body = [`Name: ${d.name}`, `Company: ${d.company}`, `Work email: ${d.email}`, '', d.more || ''].join('\n');
      location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.textContent = `Your email app should now open with the request written out: press send there. If nothing opened, write to ${to}.`;
    });
  }
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
  const items = $$('.brand, .hero h1, .lede, .hero .cta, .film, .trust h2, .backers, .kicker, .band h2, .sub, .vs, .take, .note, .trio li, .pipe li, .panel, .tag-note, .who, .close h2, .pilot');
  const show = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); show.unobserve(e.target); }
  }, { rootMargin: '0px 0px -6% 0px' });
  items.forEach(el => {
    el.classList.add('rv');
    const sib = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
    if (el.matches('.trio li, .pipe li, .panel, .who')) el.style.transitionDelay = (sib * 90) + 'ms';
    show.observe(el);
  });
})();
