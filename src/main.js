/* ============================================
   LiplnwZa — Main JavaScript
   Scroll animations, nav behavior, counters
   ============================================ */

// --- Scroll Reveal (IntersectionObserver) ---
function initScrollReveal() {
  const elements = document.querySelectorAll('.animate-on-scroll');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

// --- Nav scroll behavior ---
function initNav() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  const links = document.querySelectorAll('.nav__link');

  if (!nav || !toggle || !menu) return;

  // Scroll shadow
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    
    if (scrollY > 10) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }

    lastScroll = scrollY;
  }, { passive: true });

  // Mobile toggle
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('is-active');
    menu.classList.toggle('is-open');
    document.body.style.overflow = menu.classList.contains('is-open') ? 'hidden' : '';
  });

  // Close menu on link click
  links.forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('is-active');
      menu.classList.remove('is-open');
      document.body.style.overflow = '';
    });
  });

  // Active section highlighting
  const sections = document.querySelectorAll('section[id]');
  
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        links.forEach(link => {
          link.classList.remove('nav__link--active');
          if (link.dataset.section === id) {
            link.classList.add('nav__link--active');
          }
        });
      }
    });
  }, {
    threshold: 0.3,
    rootMargin: `-${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'))}px 0px -50% 0px`
  });

  sections.forEach(section => sectionObserver.observe(section));
}

// --- Animated counters ---
function initCounters() {
  const counters = document.querySelectorAll('.stat__number[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        animateCounter(el, target);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(el, target) {
  const duration = 1200;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    
    el.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      // Add "+" suffix for certain stats
      el.textContent = target + (target >= 10 ? '+' : '');
    }
  }

  requestAnimationFrame(update);
}

// --- Smooth scroll for CTA buttons ---
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = anchor.getAttribute('href').slice(1);
      const targetEl = document.getElementById(targetId);
      
      if (targetEl) {
        const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'));
        const targetPos = targetEl.offsetTop - navHeight;
        
        window.scrollTo({
          top: targetPos,
          behavior: 'smooth'
        });
      }
    });
  });
}

// --- Contact Form AJAX submit (Formspree) ---
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const status = document.getElementById('form-status');
  const submitBtn = document.getElementById('form-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset status (base class is display:none; modifier class re-shows it)
    status.className = 'form__status';
    status.textContent = '';

    // Disable button & show sending state
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';

    const formData = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        // Success UX
        form.reset();
        status.classList.add('form__status--success');
        status.textContent = 'Thank you! Your message has been sent successfully. The AI team will get back to you shortly.';
        
        // Hide form fields slowly
        submitBtn.style.display = 'none';
        form.querySelectorAll('.form__group').forEach(group => group.style.display = 'none');
      } else {
        const data = await response.json();
        throw new Error(data.errors ? data.errors.map(err => err.message).join(', ') : 'Server error');
      }
    } catch (error) {
      // Error UX
      status.classList.add('form__status--error');
      status.textContent = `Oops! There was a problem submitting your form: ${error.message}`;
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initNav();
  initCounters();
  initSmoothScroll();
  initContactForm();
});
