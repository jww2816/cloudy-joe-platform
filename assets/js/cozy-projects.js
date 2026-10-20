'use strict';
// Self-contained progressive disclosure; no backend calls or session changes.
document.querySelectorAll('.cozy-projects-page .project-toggle').forEach((button) => {
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  if (!panel) return;
  button.addEventListener('click', () => {
    const opening = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(opening));
    panel.hidden = !opening;
    const mark = button.querySelector('span');
    if (mark) mark.textContent = opening ? '−' : '+';
  });
});
