// === Cost Rental Ireland - Map Module ===

let map;
let markers = [];

function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  // Initialize map centered on Dublin
  map = L.map('map').setView([53.32, -6.30], 10);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);

  // Wait for listings data to be available
  const checkData = setInterval(() => {
    if (typeof listings !== 'undefined' && listings.length > 0) {
      clearInterval(checkData);
      addMarkers();
    }
  }, 200);
}

function addMarkers() {
  const statusColors = {
    open: '#169B62',
    coming_soon: '#FF883E',
    closed: '#9ca3af'
  };

  listings.forEach(listing => {
    if (!listing.coordinates) return;

    const color = statusColors[listing.status] || '#9ca3af';

    // Zillow/Daft-style price pin: show the rent right on the map.
    const priceLabel = listing.rent ? '€' + Math.round(listing.rent / 1) : 'TBC';
    const pinText = listing.rent ? '€' + (listing.rent >= 1000 ? (listing.rent/1000).toFixed(listing.rent % 1000 === 0 ? 0 : 1) + 'k' : listing.rent) : 'TBC';
    const icon = L.divIcon({
      className: 'custom-marker price-pin',
      html: `<div style="
        background: ${color};
        border: 2px solid white;
        border-radius: 14px;
        padding: 3px 9px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        color: white;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      ">${pinText}</div>`,
      iconSize: [48, 24],
      iconAnchor: [24, 12],
    });

    const marker = L.marker(
      [listing.coordinates.lat, listing.coordinates.lng],
      { icon }
    ).addTo(map);

    const popupContent = `
      <div style="min-width: 200px; font-family: Inter, sans-serif;">
        <img src="${(typeof getListingImage === 'function' ? getListingImage(listing) : (listing.images && listing.images[0]) || listing.image || '')}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" onerror="this.style.display='none'">
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">${listing.provider}</div>
        <div style="font-size: 14px; font-weight: 700; margin: 4px 0;">${listing.name}</div>
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">📍 ${listing.location}</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 16px; font-weight: 700; color: #169B62;">
            ${listing.rent ? '€' + listing.rent.toLocaleString() + '/mo' : 'TBC'}
          </span>
          <span style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: ${color}; color: white;">
            ${listing.status_text}
          </span>
        </div>
        <a href="https://www.google.com/maps/search/?api=1&query=${listing.coordinates.lat},${listing.coordinates.lng}" target="_blank" style="
          display: block;
          text-align: center;
          margin-top: 8px;
          padding: 6px;
          background: #4285F4;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        ">📍 Open in Google Maps</a>
        <a href="pages/listing.html?id=${listing.id}" style="
          display: block;
          text-align: center;
          margin-top: 10px;
          padding: 8px;
          background: #169B62;
          color: white;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
        ">View Details →</a>
        <a href="https://www.google.com/maps?q=${listing.coordinates.lat},${listing.coordinates.lng}" target="_blank" style="
          display: block;
          text-align: center;
          margin-top: 6px;
          padding: 8px;
          background: #4285f4;
          color: white;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
        ">📍 Open in Google Maps</a>
      </div>
    `;

    marker.bindPopup(popupContent);
    markers.push(marker);
  });

  // Fit bounds to show all markers
  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

// Initialize map when DOM is ready
document.addEventListener('DOMContentLoaded', initMap);
