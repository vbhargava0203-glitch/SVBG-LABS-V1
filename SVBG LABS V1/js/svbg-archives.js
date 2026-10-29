/* ==========================================================================
   SVBG ARCHIVES — additive module, loaded after app.js and extensions.js.
   Reuses Views/ViewMount/ViewUnmount from app.js rather than redefining it.

   The previous comics/visual-stories system (and the old archives/ data
   folder) was removed at the product owner's request and replaced with a
   "Coming Soon" placeholder, then later given its first real title
   ("Phantom Hacker"). That title has since been swapped out for two SVBG
   Originals pieces — "The Architect of His Own Destiny" and "The Comeback"
   — each shipped as a PDF inside archives/, opened in a full-screen in-app
   reader (a plain <iframe> onto the local PDF file, so it uses the
   browser's own PDF viewer — no external requests, no new dependency,
   works offline like the rest of the app).
   ========================================================================== */
'use strict';

(function () {
  Object.assign(ICONS, {
    library: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  });

  const BOOKS = [
    {
      id: 'architect-of-his-own-destiny',
      title: 'The Architect of His Own Destiny',
      author: 'SVBG Originals',
      genre: 'Drama',
      chapters: '23 pages',
      blurb: 'A story about ambition, failure, discipline, and a young builder who refuses to remain ordinary. He was not given a finished story \u2014 he was given the opportunity to build one.',
      file: 'archives/architect-of-his-own-destiny.pdf',
    },
    {
      id: 'the-comeback',
      title: 'The Comeback: A Cinematic Life Story',
      author: 'Bhargava Vagathuri',
      genre: 'Life Story',
      chapters: '39 pages',
      blurb: 'Some people are not defeated by failure. They are defeated by the version of themselves they keep postponing. A fictionalized life story inspired by the journey of a young dreamer, builder, and future founder.',
      file: 'archives/the-comeback.pdf',
    },
  ];

  Views.archives = function () {
    return `
      <div class="view-header"><div><div class="view-title">SVBG Archives</div><div class="view-sub">Original stories from the SVBG universe</div></div></div>
      <div class="archives-grid">
        ${BOOKS.map(b => `
          <button class="archives-book-card" data-book="${b.id}">
            <div class="archives-book-cover">
              <span class="nav-icon" data-icon="book-open"></span>
              <div class="archives-book-cover-title">${escapeHtml(b.title.split(':')[0])}</div>
              ${b.title.includes(':') ? `<div class="archives-book-cover-sub">${escapeHtml(b.title.split(':')[1].trim())}</div>` : ''}
            </div>
            <div class="archives-book-info">
              <div class="archives-book-title">${escapeHtml(b.title)}</div>
              <div class="archives-book-author">by ${escapeHtml(b.author)}</div>
              <div class="archives-book-blurb">${escapeHtml(b.blurb)}</div>
              <div class="archives-book-meta"><span class="chip">${escapeHtml(b.genre)}</span><span class="chip">${escapeHtml(b.chapters)}</span></div>
              <div class="archives-book-cta">Read <span class="nav-icon" data-icon="chevron-left" style="transform:rotate(180deg);width:14px;height:14px;"></span></div>
            </div>
          </button>`).join('')}
      </div>
      <p class="archives-soon-note">More stories coming soon.</p>
    `;
  };

  function openReader(book) {
    const overlay = document.createElement('div');
    overlay.className = 'archives-reader-overlay';
    overlay.innerHTML = `
      <div class="archives-reader-top">
        <button class="archives-reader-close" id="archives-reader-close" aria-label="Close reader"><span class="nav-icon" data-icon="x"></span></button>
        <div class="archives-reader-title">${escapeHtml(book.title)}</div>
        <a class="archives-reader-download" href="${book.file}" download title="Download PDF"><span class="nav-icon" data-icon="download"></span></a>
      </div>
      <iframe class="archives-reader-frame" src="${book.file}" title="${escapeHtml(book.title)}"></iframe>
    `;
    document.body.appendChild(overlay);
    paintIcons(overlay);
    function close() { overlay.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    overlay.querySelector('#archives-reader-close').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
  }

  ViewMount.archives = function (root) {
    root.querySelectorAll('.archives-book-card').forEach(card => card.addEventListener('click', () => {
      const book = BOOKS.find(b => b.id === card.dataset.book);
      if (book) openReader(book);
    }));
  };
  ViewUnmount.archives = function () {};
})();
