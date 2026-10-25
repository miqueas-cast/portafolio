'use strict';

// Keep the footer current; the page remains fully usable without JavaScript.
const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
