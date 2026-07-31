// === Cost Rental Ireland - Main Application ===

let listings = [];
let providers = [];
let eligibility = {};
let marketComparison = {};
let savedListings = JSON.parse(localStorage.getItem('savedListings') || '[]');

// Load data and initialize
async function init() {
  try {
    const res = await fetch('data/listings.json');
    const data = await res.json();
    listings = data.listings;
    providers = data.providers;
    eligibility = data.eligibility;
    marketComparison = data.market_comparison;

    // Sort: open first, then coming_soon, then closed
    listings.sort((a, b) => {
      const order = { open: 0, coming_soon: 1, closed: 2 };
      return (order[a.status] || 3) - (order[b.status] || 3);
    });

    populateFilters();
    renderListings(listings);
    renderEligibility();
    renderProviders();
    renderComparison();
    updateStats();
    startCountdowns();
  } catch (err) {
    console.error('Failed to load data:', err);
  }
}

// Property type icon helper
function getPropertyTypeIcon(type) {
  const icons = { apartment: '🏢', house: '🏡', duplex: '🏘️' };
  return icons[type] || '🏢';
}

// Populate filter dropdowns
function populateFilters() {
  const locations = [...new Set(listings.map(l => l.county))].sort();
  const locationSelect = document.getElementById('filter-location');
  locations.forEach(loc => {
    const opt = document.createElement('option');
    opt.value = loc;
    opt.textContent = loc;
    locationSelect.appendChild(opt);
  });
}

// Filter listings
function filterListings() {
  const status = document.getElementById('filter-status').value;
  const location = document.getElementById('filter-location').value;
  const bedrooms = document.getElementById('filter-bedrooms').value;
  const price = document.getElementById('filter-price').value;

  let filtered = listings.filter(l => {
    if (status !== 'all') {
      if (status === 'saved') {
        if (!savedListings.includes(l.id)) return false;
      } else if (l.status !== status) return false;
    }
    if (location !== 'all' && l.county !== location) return false;
    if (bedrooms !== 'all') {
      if (!l.bedrooms.toLowerCase().includes(bedrooms.toLowerCase())) return false;
    }
    if (price !== 'all' && l.rent && l.rent > parseInt(price)) return false;
    return true;
  });

  // Maintain sort order
  filtered.sort((a, b) => {
    const order = { open: 0, coming_soon: 1, closed: 2 };
    return (order[a.status] || 3) - (order[b.status] || 3);
  });

  renderListings(filtered);
  document.getElementById('visible-count').textContent = filtered.length;
}

// Render listing cards
function renderListings(items) {
  const grid = document.getElementById('listings-grid');
  grid.innerHTML = items.map(listing => {
    const isSaved = savedListings.includes(listing.id);
    const countdown = getCountdownHTML(listing);
    const savings = listing.market_rent && listing.rent
      ? `<div class="card-savings">Save €${(listing.market_rent - listing.rent).toLocaleString()}/mo vs market</div>`
      : '';

    return `
    <div class="listing-card status-${listing.status}">
      <a href="pages/listing.html?id=${listing.id}" class="card-link">
        <div class="card-image">
          <img src="${listing.images[0]}" alt="${listing.name}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('no-image')">
          <span class="card-badge badge-${listing.status}">${listing.status_text}</span>
        </div>
        <div class="card-body">
          <div class="card-provider">${listing.provider}</div>
          <div class="card-name">${listing.name}</div>
          <div class="card-location">📍 ${listing.location}</div>
          ${countdown}
          <div class="card-details">
            <div class="card-rent">
              ${listing.rent ? '€' + listing.rent.toLocaleString() : 'TBC'}
              <span>/month</span>
            </div>
            <div class="card-beds">🛏️ ${listing.bedrooms}</div>
            <div class="card-type">${getPropertyTypeIcon(listing.property_type)} ${listing.property_type || ''}</div>
            ${listing.ber_rating ? '<span class="ber-badge ' + listing.ber_rating.toLowerCase() + '">' + listing.ber_rating + '</span>' : ''}
          </div>
          ${savings}
        </div>
      </a>
      <div class="card-actions">
        <button class="btn-save ${isSaved ? 'saved' : ''}" onclick="toggleSave(event, '${listing.id}')" title="${isSaved ? 'Remove from saved' : 'Save this listing'}">
          ${isSaved ? '❤️' : '🤍'}
        </button>
        <button class="btn-share" onclick="shareListing(event, '${listing.id}')" title="Share this listing">
          📤
        </button>
        ${getCalendarButton(listing)}
      </div>
    </div>
    `;
  }).join('');
}

// Countdown timer HTML
function getCountdownHTML(listing) {
  if (listing.status !== 'open' || !listing.date_closes) return '';

  const closes = new Date(listing.date_closes + 'T12:30:00');
  const now = new Date();
  const diff = closes - now;

  if (diff <= 0) return '<div class="card-countdown expired">⚠️ Applications may have closed</div>';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  let urgency = '';
  if (days <= 2) urgency = 'urgent';
  else if (days <= 7) urgency = 'soon';

  return `<div class="card-countdown ${urgency}" data-closes="${listing.date_closes}">
    ⏰ Closes in <strong>${days}d ${hours}h</strong>
  </div>`;
}

// Update countdowns every minute
function startCountdowns() {
  setInterval(() => {
    document.querySelectorAll('.card-countdown[data-closes]').forEach(el => {
      const closes = new Date(el.dataset.closes + 'T12:30:00');
      const diff = closes - new Date();
      if (diff <= 0) {
        el.innerHTML = '⚠️ Applications may have closed';
        el.className = 'card-countdown expired';
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        el.querySelector('strong').textContent = `${days}d ${hours}h`;
      }
    });
  }, 60000);
}

// Save/Favourite toggle
function toggleSave(event, listingId) {
  event.preventDefault();
  event.stopPropagation();
  const idx = savedListings.indexOf(listingId);
  if (idx > -1) {
    savedListings.splice(idx, 1);
  } else {
    savedListings.push(listingId);
  }
  localStorage.setItem('savedListings', JSON.stringify(savedListings));
  // Re-render to update the button state
  filterListings();
}

// Share listing
function shareListing(event, listingId) {
  event.preventDefault();
  event.stopPropagation();

  const listing = listings.find(l => l.id === listingId);
  if (!listing) return;

  const url = window.location.origin + '/pages/listing.html?id=' + listingId;
  const rentText = listing.rent ? '€' + listing.rent.toLocaleString() : 'TBC';
  const text = '🏠 ' + listing.name + ' — ' + rentText + '/mo cost rental\n' + url;

  if (navigator.share) {
    navigator.share({ title: listing.name, text: text, url: url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      const btn = event.currentTarget;
      btn.textContent = '✅';
      setTimeout(() => { btn.textContent = '📤'; }, 2000);
    }).catch(() => {
      // Fallback: prompt
      window.prompt('Copy this link:', text);
    });
  }
}

// Render eligibility requirements
function renderEligibility() {
  const list = document.getElementById('eligibility-list');
  if (!list) return;
  list.innerHTML = eligibility.requirements.map(r => `<li>${r}</li>`).join('');
}

// Render providers
function renderProviders() {
  const grid = document.getElementById('providers-grid');
  if (!grid) return;
  grid.innerHTML = providers.map(p => `
    <a href="${p.url}" target="_blank" class="provider-card">
      <div class="provider-icon">${p.name.charAt(0)}</div>
      <h4>${p.name}</h4>
      <p>${p.description || ''}</p>
    </a>
  `).join('');
}

// Render comparison chart
function renderComparison() {
  const grid = document.getElementById('chart-grid');
  if (!grid) return;

  const items = [
    { label: 'Studio', cr: marketComparison.studio.cost_rental, mk: marketComparison.studio.market },
    { label: '1 Bed', cr: marketComparison.one_bed.cost_rental, mk: marketComparison.one_bed.market },
    { label: '2 Bed', cr: marketComparison.two_bed.cost_rental, mk: marketComparison.two_bed.market },
    { label: '3 Bed', cr: marketComparison.three_bed.cost_rental, mk: marketComparison.three_bed.market },
  ];

  grid.innerHTML = items.map(item => {
    const maxVal = item.mk;
    const crPct = (item.cr / maxVal) * 100;
    const mkPct = 100;
    const savings = item.mk - item.cr;
    const savingsPct = Math.round((savings / item.mk) * 100);

    return `
      <div class="chart-item">
        <h4>${item.label} Apartment</h4>
        <div class="bar-container">
          <div class="bar-row">
            <span class="bar-label">Cost Rental</span>
            <div class="bar-track">
              <div class="bar-fill cost-rental" style="width: ${crPct}%">€${item.cr.toLocaleString()}</div>
            </div>
          </div>
          <div class="bar-row">
            <span class="bar-label">Market Rent</span>
            <div class="bar-track">
              <div class="bar-fill market" style="width: ${mkPct}%">€${item.mk.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div class="savings-badge">Save €${savings.toLocaleString()}/month (${savingsPct}% less)</div>
      </div>
    `;
  }).join('');
}

// Update hero stats
function updateStats() {
  const open = listings.filter(l => l.status === 'open').length;
  document.getElementById('stat-listings').textContent = listings.length;
  document.getElementById('stat-open').textContent = open;

  // Calculate average savings
  const withRent = listings.filter(l => l.rent && l.market_rent);
  if (withRent.length > 0) {
    const avgSavings = Math.round(
      withRent.reduce((sum, l) => sum + (l.market_rent - l.rent), 0) / withRent.length
    );
    document.getElementById('stat-savings').textContent = '€' + avgSavings.toLocaleString();
  }
}

// Event listeners for filters
document.addEventListener('DOMContentLoaded', () => {
  init();
  document.getElementById('filter-status').addEventListener('change', filterListings);
  document.getElementById('filter-location').addEventListener('change', filterListings);
  document.getElementById('filter-bedrooms').addEventListener('change', filterListings);
  document.getElementById('filter-price').addEventListener('change', filterListings);
});


// === AFFORDABILITY CALCULATOR ===
function calculateAffordability() {
  const income = parseInt(document.getElementById('calc-income').value);
  const location = document.getElementById('calc-location').value;

  if (!income || income <= 0) {
    alert('Please enter your net annual household income');
    return;
  }

  const maxIncome = location === 'dublin' ? 66000 : 59000;
  const maxRent = Math.round((income * 0.35) / 12);
  const eligible = income <= maxIncome;

  // Average market rent in Dublin is ~€2,200, elsewhere ~€1,500
  const avgMarket = location === 'dublin' ? 2200 : 1500;
  const avgCostRental = location === 'dublin' ? 1300 : 1000;
  const monthlySaving = avgMarket - avgCostRental;
  const yearlySaving = monthlySaving * 12;

  // Show results
  const results = document.getElementById('calc-results');
  results.style.display = 'block';

  document.getElementById('calc-max-rent').textContent = '€' + maxRent.toLocaleString() + '/mo';
  document.getElementById('calc-eligible').textContent = eligible ? '✅ Yes' : '❌ Over limit';
  document.getElementById('calc-eligible').style.color = eligible ? '#16a34a' : '#dc2626';
  document.getElementById('calc-eligible-note').textContent = eligible
    ? 'Income below €' + maxIncome.toLocaleString() + ' threshold'
    : 'Income exceeds €' + maxIncome.toLocaleString() + ' limit for ' + (location === 'dublin' ? 'Dublin' : 'outside Dublin');
  document.getElementById('calc-saving').textContent = '€' + yearlySaving.toLocaleString();

  // Show matching listings
  const matching = listings.filter(l => l.rent && l.rent <= maxRent && l.status !== 'closed');
  const matchingDiv = document.getElementById('calc-matching');
  if (matching.length > 0) {
    matchingDiv.innerHTML = '<h4>Properties you could afford:</h4>' +
      matching.map(l => `<div class="calc-match">🏠 <strong>${l.name}</strong> — €${l.rent.toLocaleString()}/mo (${l.status_text})</div>`).join('');
  } else if (eligible) {
    matchingDiv.innerHTML = '<p>No currently open listings within your budget, but new ones launch regularly. <a href="#notify">Get notified</a> when they do.</p>';
  } else {
    matchingDiv.innerHTML = '<p>Unfortunately your income exceeds the eligibility threshold for cost rental.</p>';
  }
}


// === STUDENT ACCOMMODATION TAB ===
let studentListings = [];
let currentTab = 'cost-rental';

// Load student data
async function loadStudentData() {
  try {
    const res = await fetch('data/students.json');
    const data = await res.json();
    studentListings = data.listings;
    // Sort: open first
    studentListings.sort((a, b) => {
      const order = { open: 0, closed: 1 };
      return (order[a.status] || 2) - (order[b.status] || 2);
    });
  } catch (err) {
    console.error('Failed to load student data:', err);
  }
}

// Tab switching
function switchTab(tab) {
  currentTab = tab;

  // Toggle active button
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');

  // Update hero stats based on tab
  if (tab === 'student') {
    const openStudent = studentListings.filter(l => l.status === 'open').length;
    document.getElementById('stat-listings').textContent = studentListings.length;
    document.getElementById('stat-open').textContent = openStudent;
    document.getElementById('stat-savings').textContent = '€95-€370';
    document.getElementById('stat-listings-label').textContent = 'Accommodations';
    document.getElementById('stat-open-label').textContent = 'Available Now';
    document.getElementById('stat-savings-label').textContent = 'Per Week Range';
  } else {
    document.getElementById('stat-listings-label').textContent = 'Total Listings';
    document.getElementById('stat-open-label').textContent = 'Open Now';
    document.getElementById('stat-savings-label').textContent = 'Avg. Monthly Savings';
    updateStats();
  }

  // Show/hide sections
  const costRentalSections = ['filter-bar', 'listings', 'map-section', 'comparison', 'daft-comparison', 'hap-limits', 'calculator', 'compare-rent', 'checklist-section', 'eligibility', 'how-it-works', 'providers'];
  const studentSections = ['student-filter-bar', 'student-listings', 'student-checklist-section'];

  if (tab === 'cost-rental') {
    costRentalSections.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = '';
    });
    studentSections.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  } else {
    costRentalSections.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    studentSections.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = '';
    });
    // Render student listings if not yet done
    if (studentListings.length === 0) {
      loadStudentData().then(() => {
        renderStudentListings(studentListings);
      });
    } else {
      renderStudentListings(studentListings);
    }
  }
}

// Render student cards
function renderStudentListings(items) {
  const grid = document.getElementById('student-grid');
  if (!grid) return;

  grid.innerHTML = items.map(listing => {
    const badgeClass = listing.status === 'open' ? 'badge-open' : 'badge-closed';
    const priceDisplay = listing.price_per_week
      ? '€' + listing.price_per_week + '/week'
      : 'TBC';
    const annualDisplay = listing.total_annual
      ? '€' + listing.total_annual.toLocaleString() + '/year'
      : '';
    const roomTypes = (listing.room_types || []).join(', ');
    const amenitiesHtml = (listing.amenities || []).slice(0, 4)
      .map(a => '<span class="student-amenity">' + a + '</span>').join('');
    const countdown = listing.date_closes && listing.status === 'open'
      ? getStudentCountdown(listing.date_closes)
      : '';
    const isSaved = savedListings.includes(listing.id);

    return '<div class="listing-card student-card status-' + listing.status + '">' +
      '<a href="' + listing.url + '" target="_blank" class="card-link">' +
        '<div class="card-image">' +
          '<img src="' + listing.image + '" alt="' + listing.name + '" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'no-image\')">' +
          '<span class="card-badge ' + badgeClass + '">' + listing.status_text + '</span>' +
          '<span class="card-type-badge">' + listing.type + '</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="card-provider">🎓 ' + listing.college + '</div>' +
          '<div class="card-name">' + listing.name + '</div>' +
          '<div class="card-location">📍 ' + listing.location + '</div>' +
          countdown +
          '<div class="card-details">' +
            '<div class="card-rent">' + priceDisplay + '</div>' +
            '<div class="card-beds">🛏️ ' + roomTypes + '</div>' +
          '</div>' +
          (annualDisplay ? '<div class="card-annual">' + annualDisplay + ' total (' + listing.term_weeks + ' weeks)</div>' : '') +
          '<div class="student-amenities">' + amenitiesHtml + '</div>' +
          (listing.notes ? '<div class="card-notes">💡 ' + listing.notes + '</div>' : '') +
        '</div>' +
      '</a>' +
      '<div class="card-actions">' +
        '<button class="btn-save ' + (isSaved ? 'saved' : '') + '" onclick="toggleSaveStudent(event, \'' + listing.id + '\')" title="' + (isSaved ? 'Remove from saved' : 'Save this listing') + '">' +
          (isSaved ? '❤️' : '🤍') +
        '</button>' +
        '<button class="btn-share" onclick="shareStudent(event, \'' + listing.id + '\')" title="Share this listing">' +
          '📤' +
        '</button>' +
      '</div>' +
    '</div>';
  }).join('');

  document.getElementById('student-visible-count').textContent = items.length;
}

// Save toggle for student listings
function toggleSaveStudent(event, listingId) {
  event.preventDefault();
  event.stopPropagation();
  const idx = savedListings.indexOf(listingId);
  if (idx > -1) {
    savedListings.splice(idx, 1);
  } else {
    savedListings.push(listingId);
  }
  localStorage.setItem('savedListings', JSON.stringify(savedListings));
  filterStudentListings();
}

// Share student listing
function shareStudent(event, listingId) {
  event.preventDefault();
  event.stopPropagation();
  const listing = studentListings.find(l => l.id === listingId);
  if (!listing) return;
  const priceText = listing.price_per_week ? listing.price_per_week + '/week' : 'TBC';
  const text = '🎓 ' + listing.name + ' (' + listing.college + ') — €' + priceText + '\n' + listing.url;

  if (navigator.share) {
    navigator.share({ title: listing.name, text: text, url: listing.url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      const btn = event.currentTarget;
      btn.textContent = '✅';
      setTimeout(() => { btn.textContent = '📤'; }, 2000);
    }).catch(() => {
      window.prompt('Copy this link:', text);
    });
  }
}

function getStudentCountdown(dateCloses) {
  const closes = new Date(dateCloses + 'T23:59:00');
  const now = new Date();
  const diff = closes - now;
  if (diff <= 0) return '<div class="card-countdown expired">⚠️ May have closed</div>';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const urgency = days <= 3 ? 'urgent' : days <= 7 ? 'soon' : '';
  return '<div class="card-countdown ' + urgency + '">⏰ Closes in <strong>' + days + 'd ' + hours + 'h</strong></div>';
}

// Student filters
function filterStudentListings() {
  const type = document.getElementById('student-filter-type').value;
  const city = document.getElementById('student-filter-city').value;
  const price = document.getElementById('student-filter-price').value;
  const status = document.getElementById('student-filter-status').value;
  const sort = document.getElementById('student-filter-sort').value;

  let filtered = studentListings.filter(l => {
    if (type !== 'all' && l.type !== type) return false;
    if (city !== 'all' && l.city !== city) return false;
    if (price !== 'all' && l.price_per_week && l.price_per_week > parseInt(price)) return false;
    if (status !== 'all') {
      if (status === 'open' && l.status !== 'open') return false;
      if (status === 'closed' && l.status === 'open') return false;
    }
    return true;
  });

  // Sort
  switch (sort) {
    case 'price-asc':
      filtered.sort((a, b) => (a.price_per_week || 9999) - (b.price_per_week || 9999));
      break;
    case 'price-desc':
      filtered.sort((a, b) => (b.price_per_week || 0) - (a.price_per_week || 0));
      break;
    case 'name':
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      filtered.sort((a, b) => {
        const order = { open: 0, closed: 1 };
        return (order[a.status] || 2) - (order[b.status] || 2);
      });
  }

  renderStudentListings(filtered);
}

// Add student filter event listeners on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  // Preload student data
  loadStudentData();

  // Student filter listeners
  ['student-filter-type', 'student-filter-city', 'student-filter-price', 'student-filter-status', 'student-filter-sort'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', filterStudentListings);
  });
});


// === SAVED PROPERTIES SECTION ===
function renderSavedSection() {
  const grid = document.getElementById('saved-grid');
  const empty = document.getElementById('empty-saved');
  if (!grid) return;

  if (savedListings.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  // Find saved items from both cost rental and student listings
  const savedCostRental = listings.filter(l => savedListings.includes(l.id));
  const savedStudent = studentListings.filter(l => savedListings.includes(l.id));

  let html = '';

  savedCostRental.forEach(listing => {
    html += '<div class="listing-card status-' + listing.status + '">' +
      '<a href="pages/listing.html?id=' + listing.id + '" class="card-link">' +
        '<div class="card-image">' +
          '<img src="' + listing.images[0] + '" alt="' + listing.name + '" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'no-image\')">' +
          '<span class="card-badge badge-' + listing.status + '">' + listing.status_text + '</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="card-provider">' + listing.provider + '</div>' +
          '<div class="card-name">' + listing.name + '</div>' +
          '<div class="card-location">📍 ' + listing.location + '</div>' +
          '<div class="card-details">' +
            '<div class="card-rent">' + (listing.rent ? '€' + listing.rent.toLocaleString() : 'TBC') + '<span>/month</span></div>' +
            '<div class="card-beds">🛏️ ' + listing.bedrooms + '</div>' +
          '</div>' +
        '</div>' +
      '</a>' +
      '<div class="card-actions">' +
        '<button class="btn-save saved" onclick="removeSaved(event, \'' + listing.id + '\')" title="Remove">❤️</button>' +
      '</div>' +
    '</div>';
  });

  savedStudent.forEach(listing => {
    const priceDisplay = listing.price_per_week ? '€' + listing.price_per_week + '/week' : 'TBC';
    html += '<div class="listing-card student-card status-' + listing.status + '">' +
      '<a href="' + listing.url + '" target="_blank" class="card-link">' +
        '<div class="card-image">' +
          '<img src="' + listing.image + '" alt="' + listing.name + '" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'no-image\')">' +
          '<span class="card-badge badge-' + listing.status + '">' + listing.status_text + '</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="card-provider">🎓 ' + listing.college + '</div>' +
          '<div class="card-name">' + listing.name + '</div>' +
          '<div class="card-location">📍 ' + listing.location + '</div>' +
          '<div class="card-details">' +
            '<div class="card-rent">' + priceDisplay + '</div>' +
            '<div class="card-beds">🛏️ ' + (listing.room_types || []).join(', ') + '</div>' +
          '</div>' +
        '</div>' +
      '</a>' +
      '<div class="card-actions">' +
        '<button class="btn-save saved" onclick="removeSaved(event, \'' + listing.id + '\')" title="Remove">❤️</button>' +
      '</div>' +
    '</div>';
  });

  if (html === '') {
    if (empty) empty.style.display = 'block';
  } else {
    grid.innerHTML = html;
  }
}

function removeSaved(event, listingId) {
  event.preventDefault();
  event.stopPropagation();
  const idx = savedListings.indexOf(listingId);
  if (idx > -1) savedListings.splice(idx, 1);
  localStorage.setItem('savedListings', JSON.stringify(savedListings));
  renderSavedSection();
  // Also refresh current view
  if (currentTab === 'cost-rental') filterListings();
  else filterStudentListings();
}

// Refresh saved section whenever save changes
const origToggleSave = toggleSave;
toggleSave = function(event, listingId) {
  origToggleSave(event, listingId);
  renderSavedSection();
};

const origToggleSaveStudent = toggleSaveStudent;
toggleSaveStudent = function(event, listingId) {
  origToggleSaveStudent(event, listingId);
  renderSavedSection();
};

// Render saved section on load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(renderSavedSection, 500);
});


// === DARK MODE ===
function toggleDarkMode() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  document.querySelector('.dark-toggle').textContent = next === 'dark' ? '☀️' : '🌙';
}
// Set button state on load
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('theme') === 'dark') {
    document.querySelector('.dark-toggle').textContent = '☀️';
  }
});


// === DAFT COMPARISON & HAP LIMITS ===
async function loadComparisonData() {
  try {
    const res = await fetch('data/comparison.json');
    const data = await res.json();
    renderAreaComparison(data.areas);
    renderHapTable(data.hap_limits);
  } catch (err) {
    console.error('Failed to load comparison data:', err);
  }
}

function renderAreaComparison(areas) {
  const grid = document.getElementById('area-comparison-grid');
  if (!grid) return;

  grid.innerHTML = areas.map(a => {
    const saving1bed = a.market_1bed - a.cost_rental_1bed;
    const savingPct = Math.round((saving1bed / a.market_1bed) * 100);
    const yearSaving = saving1bed * 12;
    return '<div class="area-card">' +
      '<h4>' + a.area + '</h4>' +
      '<div class="area-prices">' +
        '<div class="area-price market"><span>Daft.ie</span><strong>€' + a.market_1bed.toLocaleString() + '</strong>/mo</div>' +
        '<div class="area-price costrental"><span>Cost Rental</span><strong>€' + a.cost_rental_1bed.toLocaleString() + '</strong>/mo</div>' +
      '</div>' +
      '<div class="area-saving">Save <strong>€' + saving1bed.toLocaleString() + '/mo</strong> (' + savingPct + '% less) = <strong>€' + yearSaving.toLocaleString() + '/year</strong></div>' +
    '</div>';
  }).join('');
}

function renderHapTable(limits) {
  const tbody = document.getElementById('hap-tbody');
  if (!tbody) return;
  tbody.innerHTML = limits.map(l =>
    '<tr><td><strong>' + l.county + '</strong></td><td>€' + l.single + '</td><td>€' + l.couple + '</td><td>€' + l.couple_1child + '</td><td>€' + l.couple_2children + '</td></tr>'
  ).join('');
}

document.addEventListener('DOMContentLoaded', loadComparisonData);


// === COMPARE MY RENT ===
function compareMyRent() {
  const myRent = parseInt(document.getElementById('my-rent').value);
  const area = document.getElementById('my-area').value;
  if (!myRent || myRent <= 0) { alert('Please enter your current monthly rent'); return; }

  const avgCostRental = { dublin: 1250, cork: 1100, galway: 1000, limerick: 990, kildare: 1350, other: 1100 };
  const cr = avgCostRental[area] || 1100;
  const saving = myRent - cr;
  const annual = saving * 12;

  document.getElementById('compare-results').style.display = 'block';
  document.getElementById('compare-current').textContent = '€' + myRent.toLocaleString();
  document.getElementById('compare-costrental').textContent = '€' + cr.toLocaleString();

  if (saving > 0) {
    document.getElementById('compare-saving').textContent = '€' + saving.toLocaleString() + '/mo';
    document.getElementById('compare-saving').style.color = '#16a34a';
    document.getElementById('compare-annual').textContent = '€' + annual.toLocaleString() + ' per year!';
    document.getElementById('compare-context').innerHTML = 'That\'s <strong>€' + annual.toLocaleString() + ' per year</strong> back in your pocket. Over 5 years: <strong>€' + (annual * 5).toLocaleString() + '</strong>. <a href="#notify">Get notified</a> when schemes open in your area.';
  } else {
    document.getElementById('compare-saving').textContent = '€0';
    document.getElementById('compare-saving').style.color = '#6b7280';
    document.getElementById('compare-annual').textContent = 'You already pay below cost rental average!';
    document.getElementById('compare-context').textContent = 'Your rent is already competitive. Cost rental might not save you money, but it offers long-term security of tenure.';
  }
}

// === .ICS CALENDAR DOWNLOAD ===
function downloadCalendar(listing) {
  if (!listing.date_closes) return;
  const closes = new Date(listing.date_closes + 'T12:30:00');
  const remind = new Date(closes.getTime() - 24 * 60 * 60 * 1000); // 1 day before

  const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CostRental.ie//EN',
    'BEGIN:VEVENT',
    'DTSTART:' + formatDate(remind),
    'DTEND:' + formatDate(closes),
    'SUMMARY:⚠️ Cost Rental Deadline: ' + listing.name,
    'DESCRIPTION:Applications for ' + listing.name + ' close tomorrow at 12:30.\\nApply: ' + listing.url,
    'LOCATION:' + listing.location,
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Cost rental deadline tomorrow!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = listing.name.replace(/\s+/g, '-').toLowerCase() + '-deadline.ics';
  a.click();
  URL.revokeObjectURL(url);
}

// Add calendar button to open listing cards (called from render)
function getCalendarButton(listing) {
  if (listing.status !== 'open' || !listing.date_closes) return '';
  return '<button class="btn-calendar" onclick="event.preventDefault();event.stopPropagation();downloadCalendarById(\'' + listing.id + '\')" title="Add deadline to calendar">📅</button>';
}

function downloadCalendarById(id) {
  const listing = listings.find(l => l.id === id);
  if (listing) downloadCalendar(listing);
}

// === DOCUMENT CHECKLIST ===
const CHECKLIST_ITEMS = [
  { id: 'doc-id', label: 'Proof of ID (Passport or Driving Licence)' },
  { id: 'doc-address', label: 'Proof of Address (Utility bill, dated within 2 months)' },
  { id: 'doc-residency', label: 'Proof of Residency (P60, employer letter, or tenancy agreement)' },
  { id: 'doc-payslips', label: 'Last 3 months payslips' },
  { id: 'doc-p60', label: 'Employment Detail Summary (P60)' },
  { id: 'doc-statement', label: 'Statement of Liability (P21)' },
  { id: 'doc-landlord', label: 'Landlord Reference (dated within 6 weeks)' },
  { id: 'doc-bank', label: '6 months bank statements' },
  { id: 'doc-cover', label: 'Cover letter explaining income calculation' },
];

function initChecklist() {
  const container = document.getElementById('checklist-items');
  if (!container) return;

  const saved = JSON.parse(localStorage.getItem('docChecklist') || '{}');

  container.innerHTML = CHECKLIST_ITEMS.map(item => {
    const checked = saved[item.id] ? 'checked' : '';
    return '<label class="checklist-item ' + (checked ? 'done' : '') + '">' +
      '<input type="checkbox" ' + checked + ' onchange="toggleCheckItem(\'' + item.id + '\', this)">' +
      '<span>' + item.label + '</span>' +
    '</label>';
  }).join('');

  updateChecklistProgress();
}

function toggleCheckItem(id, el) {
  const saved = JSON.parse(localStorage.getItem('docChecklist') || '{}');
  saved[id] = el.checked;
  localStorage.setItem('docChecklist', JSON.stringify(saved));
  el.parentElement.classList.toggle('done', el.checked);
  updateChecklistProgress();
}

function updateChecklistProgress() {
  const saved = JSON.parse(localStorage.getItem('docChecklist') || '{}');
  const done = Object.values(saved).filter(v => v).length;
  const total = CHECKLIST_ITEMS.length;
  const pct = Math.round((done / total) * 100);

  const fill = document.getElementById('checklist-bar-fill');
  const count = document.getElementById('checklist-count');
  if (fill) fill.style.width = pct + '%';
  if (count) count.textContent = done + '/' + total + ' ready';
}

function resetChecklist() {
  localStorage.removeItem('docChecklist');
  initChecklist();
}

document.addEventListener('DOMContentLoaded', initChecklist);


// === BACK TO TOP ===
window.addEventListener('scroll', () => {
  const btn = document.getElementById('back-to-top');
  if (btn) btn.classList.toggle('visible', window.scrollY > 500);
});

// === COOKIE CONSENT ===
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('cookieConsent')) {
    setTimeout(() => {
      const banner = document.getElementById('cookie-banner');
      if (banner) banner.style.display = 'flex';
    }, 2000);
  }
});
function acceptCookies() {
  localStorage.setItem('cookieConsent', 'accepted');
  document.getElementById('cookie-banner').style.display = 'none';
}
function dismissCookies() {
  localStorage.setItem('cookieConsent', 'dismissed');
  document.getElementById('cookie-banner').style.display = 'none';
}

// === NEWSLETTER POPUP (30s delay) ===
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('newsletterDismissed')) return;
  setTimeout(() => {
    const popup = document.getElementById('newsletter-popup');
    if (popup) popup.style.display = 'flex';
  }, 30000);
});
function closeNewsletter() {
  document.getElementById('newsletter-popup').style.display = 'none';
  localStorage.setItem('newsletterDismissed', 'true');
}


// === LOADING SKELETON ===
function showSkeletons(gridId, count) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = Array(count).fill('<div class="skeleton skeleton-card"></div>').join('');
}

// === SCROLL ANIMATIONS (fade-in on scroll) ===
document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(section);
  });

  // Make hero and filter bar always visible (no animation)
  document.querySelectorAll('.hero, .filter-bar, .trust-bar').forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
});

// === STUDENT CHECKLIST ===
const STUDENT_CHECKLIST_ITEMS = [
  { id: 'sdoc-id', label: 'Student ID or college offer letter' },
  { id: 'sdoc-passport', label: 'Passport or national ID' },
  { id: 'sdoc-deposit', label: 'Deposit payment ready (varies: €300-€750)' },
  { id: 'sdoc-susi', label: 'SUSI grant confirmation (if applicable)' },
  { id: 'sdoc-visa', label: 'Visa/immigration stamp (international students)' },
  { id: 'sdoc-insurance', label: 'Health insurance proof (international students)' },
];

function initStudentChecklist() {
  const section = document.getElementById('student-checklist-section');
  if (!section) return;
  const container = document.getElementById('student-checklist-items');
  if (!container) return;

  const saved = JSON.parse(localStorage.getItem('studentDocChecklist') || '{}');
  container.innerHTML = STUDENT_CHECKLIST_ITEMS.map(item => {
    const checked = saved[item.id] ? 'checked' : '';
    return '<label class="checklist-item ' + (checked ? 'done' : '') + '">' +
      '<input type="checkbox" ' + checked + ' onchange="toggleStudentCheckItem(\'' + item.id + '\', this)">' +
      '<span>' + item.label + '</span>' +
    '</label>';
  }).join('');
  updateStudentChecklistProgress();
}

function toggleStudentCheckItem(id, el) {
  const saved = JSON.parse(localStorage.getItem('studentDocChecklist') || '{}');
  saved[id] = el.checked;
  localStorage.setItem('studentDocChecklist', JSON.stringify(saved));
  el.parentElement.classList.toggle('done', el.checked);
  updateStudentChecklistProgress();
}

function updateStudentChecklistProgress() {
  const saved = JSON.parse(localStorage.getItem('studentDocChecklist') || '{}');
  const done = Object.values(saved).filter(v => v).length;
  const total = STUDENT_CHECKLIST_ITEMS.length;
  const fill = document.getElementById('student-checklist-bar-fill');
  const count = document.getElementById('student-checklist-count');
  if (fill) fill.style.width = Math.round((done / total) * 100) + '%';
  if (count) count.textContent = done + '/' + total + ' ready';
}

document.addEventListener('DOMContentLoaded', initStudentChecklist);
