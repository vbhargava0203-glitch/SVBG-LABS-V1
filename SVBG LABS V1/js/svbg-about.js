/* ==========================================================================
   SVBG ABOUT US — additive module, loaded after app.js, extensions.js and
   svbg-advanced.js. Reuses Store/Views/ViewMount/ViewUnmount/escapeHtml
   from app.js rather than redefining any of it.

   Renders the "About Us" page (the SVBG Labs mission/vision/principles
   copy provided by the founder) and, at the bottom of that page, a
   "Founder's Message" button that opens a modal with the founder's
   personal note. Both pieces of copy are the product owner's own
   original text, not third-party material.
   ========================================================================== */
'use strict';

(function () {
  Object.assign(ICONS, {
    'info-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="11"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    'heart-message': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  });

  const PRINCIPLES = [
    { title: 'Intelligence', icon: 'brain', desc: 'We build intelligent systems that help users organize knowledge, improve decision-making, strengthen focus, build meaningful habits, and unlock their full potential through thoughtfully designed digital experiences.' },
    { title: 'Privacy', icon: 'shield', desc: 'Privacy is a fundamental principle behind everything we create. Wherever practical, SVBG Labs follows an offline-first approach, prioritizing local data storage and transparent design so users remain in control of their own information.' },
    { title: 'Innovation', icon: 'sparkles', desc: 'Innovation is at the heart of SVBG Labs. We combine modern engineering, immersive user experiences, elegant interfaces, and forward-thinking technologies to build software that feels years ahead of its time.' },
    { title: 'Accessibility', icon: 'compass', desc: 'Technology should be simple, fast, and accessible. Every product is designed to provide a seamless experience across desktop, Android, iOS, and modern web platforms.' },
  ];

  const WHAT_WE_BUILD = [
    'Productivity Systems', 'Knowledge Management', 'Cybersecurity Tools & Simulations',
    'Brain Training & Logic Games', 'Data Analytics & Visualization', 'Interactive Digital Experiences',
    'Modern Web & Mobile Applications', 'Offline-First Technologies', 'AI-Inspired Productivity Tools',
    'Digital Wellness Solutions', 'Experimental User Interfaces', 'Intelligent Personal Operating Systems',
  ];

  const PHILOSOPHY = [
    'Exceptional User Experience', 'Elegant Design', 'Privacy by Design', 'Offline-First Architecture',
    'High Performance', 'Modern Engineering', 'Scalability', 'Security', 'Reliability', 'Long-Term Maintainability',
  ];

  const FOUNDERS_MESSAGE = `When I started building SVBG Labs, I wasn't trying to create just another application.

I was trying to answer a simple question:
"What if technology could genuinely help people become a better version of themselves?"

Every day, we switch between dozens of apps to organize our work, remember ideas, manage our time, learn new skills, solve problems, and stay productive. I believed there had to be a better way—a place where everything works together seamlessly.

That belief became SVBG Labs.

At the heart of this journey is a simple vision:
SVBG — Synaptic Vector Brain Grid
A vision of connecting human intelligence, digital memory, productivity, creativity, and secure technology into one unified ecosystem.

Every feature inside SVBG Labs has been designed with intention. Not to keep you endlessly scrolling, but to help you focus. Not to overwhelm you with complexity, but to make your digital life simpler, smarter, and more meaningful.

This project began with curiosity, countless late nights, continuous learning, and an unwavering passion for building something that could make a real difference. It continues to evolve with every improvement, every idea, and every challenge overcome.

Whether you're a student chasing your dreams, a developer building the future, a professional striving for excellence, or simply someone looking for a better way to organize life, I hope SVBG Labs becomes a tool that supports your journey.

This is more than software.
It is a vision.
A commitment to innovation.
A belief that technology should work with people—not against them.

Thank you for being part of this journey.

The future of SVBG Labs is being built one idea, one feature, and one user at a time—and I'm grateful you've chosen to be part of it.

Welcome to SVBG Labs.
Let's build a smarter future, together.

— Bhargava Vagathuri
Founder & Creator, SVBG Labs`;

  Views.about = function () {
    return `
      <div class="about-hero">
        <div class="about-hero-title">About SVBG Labs</div>
        <div class="about-hero-tagline">Technology should empower people, not distract them.</div>
        <div class="about-hero-body">
          <strong>SVBG Labs</strong> is an independent technology initiative dedicated to building intelligent,
          privacy-first, and future-ready digital experiences that empower people to think, create, learn, and grow.
          At its core, <strong>SVBG</strong> stands for <strong>Synaptic Vector Brain Grid</strong>—a vision of
          connecting human intelligence, digital memory, productivity, and secure technology into one unified
          ecosystem, designed to simplify everyday life while respecting user privacy.
        </div>
      </div>

      <div class="about-section-label">🧠 Our Core Principles</div>
      <div class="about-principles-grid">
        ${PRINCIPLES.map(p => `
          <div class="about-principle-card">
            <div class="about-principle-icon"><span class="nav-icon" data-icon="${p.icon}" style="width:22px;height:22px;"></span></div>
            <div class="about-principle-title">${escapeHtml(p.title)}</div>
            <div class="about-principle-desc">${escapeHtml(p.desc)}</div>
          </div>`).join('')}
      </div>

      <div class="about-two-col">
        <div class="about-text-card">
          <div class="about-section-label">🚀 Our Vision</div>
          <p>To build a unified ecosystem where productivity, creativity, cybersecurity, digital memory, learning, and intelligent experiences work together within a single platform.</p>
          <p>We envision software that evolves alongside its users—helping them organize, create, learn, protect, and achieve more while maintaining complete respect for privacy and user control.</p>
        </div>
        <div class="about-text-card">
          <div class="about-section-label">🎯 Our Mission</div>
          <p>To engineer world-class digital experiences that inspire innovation, simplify complexity, strengthen security, and empower individuals through beautifully crafted technology.</p>
        </div>
      </div>

      <div class="about-section-label">🌌 What We Build</div>
      <div class="about-chip-row">
        ${WHAT_WE_BUILD.map(c => `<span class="about-chip">${escapeHtml(c)}</span>`).join('')}
      </div>

      <div class="about-section-label">⚙️ Our Engineering Philosophy</div>
      <div class="about-chip-row">
        ${PHILOSOPHY.map(c => `<span class="about-chip about-chip-alt">${escapeHtml(c)}</span>`).join('')}
      </div>
      <p class="about-philosophy-note">Every animation, every interaction, every component, and every line of code is designed with precision to create an experience that feels intuitive, immersive, and future-ready.</p>

      <div class="about-closing-card">
        <div class="about-section-label">🌍 Looking Ahead</div>
        <p>SVBG Labs is only beginning its journey. Our ambition is to redefine how people interact with technology by creating a growing ecosystem of intelligent applications that seamlessly combine productivity, security, creativity, and innovation.</p>
        <p class="about-closing-lines">We are not simply building applications.<br>We are building experiences.<br>We are building intelligent ecosystems.<br>We are building the future of digital interaction.</p>
        <p><strong>SVBG Labs</strong> represents a vision where human potential and technology work together to create something greater than either could achieve alone.</p>
        <p class="about-tagline-strong">Engineering the Future of Human Intelligence.</p>
      </div>

      <div class="about-copyright">
        © 2026 SVBG Labs — Designed, Engineered &amp; Developed by Bhargava Vagathuri. All Rights Reserved.
      </div>

      <button class="about-founder-btn" id="about-founder-btn">
        <span class="nav-icon" data-icon="heart-message" style="width:18px;height:18px;"></span>
        Founder's Message
      </button>
    `;
  };

  ViewMount.about = function (root) {
    const btn = root.querySelector('#about-founder-btn');
    if (btn) btn.addEventListener('click', showFoundersMessage);
  };
  ViewUnmount.about = function () {};

  function showFoundersMessage() {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop about-founder-backdrop';
    backdrop.innerHTML = `
      <div class="about-founder-modal">
        <button class="about-founder-close" id="about-founder-close" aria-label="Close">✕</button>
        <div class="about-founder-modal-title">💙 Founder's Message</div>
        <div class="about-founder-modal-body">${escapeHtml(FOUNDERS_MESSAGE).replace(/\n/g, '<br>')}</div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop || e.target.id === 'about-founder-close') backdrop.remove();
    });
    const escHandler = e => { if (e.key === 'Escape') { backdrop.remove(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  }
})();
