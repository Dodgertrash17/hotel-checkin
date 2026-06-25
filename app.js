// ============================================================
//  HOTEL CHECK-IN  —  app.js
// ============================================================

// ── State ────────────────────────────────────────────────────
let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;   // 1-based
//let selectedDate = new Date().toISOString().split('T')[0];
let selectedDate = new Date().toLocaleDateString('en-CA');
let bookedDates  = new Set();
let allRooms     = [];
//ngaballs
// ── DOM refs ─────────────────────────────────────────────────
const calTitle    = document.getElementById('cal-title');
const calGrid     = document.getElementById('cal-grid');
const roomsPanel  = document.getElementById('rooms-panel');
const roomsTitle  = document.getElementById('rooms-title');
const roomsGrid   = document.getElementById('rooms-grid');
const prevBtn     = document.getElementById('prev-month');
const nextBtn     = document.getElementById('next-month');
const modal       = document.getElementById('booking-modal');
const modalTitle  = document.getElementById('modal-room-title');
const bookingForm = document.getElementById('booking-form');

// ── Initialise ───────────────────────────────────────────────
async function init() {
  allRooms = await getAllRooms();
  await renderCalendar();
  await renderRooms(selectedDate);
}

// ── Calendar ─────────────────────────────────────────────────
async function renderCalendar() {
  bookedDates = await getBookedDatesInMonth(currentYear, currentMonth);

  const monthName = new Date(currentYear, currentMonth - 1, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' });
  calTitle.textContent = monthName;

  const firstDow = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  //const today = new Date().toISOString().split('T')[0];
  const today = new Date().toLocaleDateString('en-CA');

  // Keep only the day cells (first 7 children are the day-label headers)
  const existingCells = calGrid.querySelectorAll('.cal-day');
  existingCells.forEach(el => el.remove());

  // Blank cells before day 1
  for (let i = 0; i < firstDow; i++) {
    const blank = document.createElement('div');
    blank.className = 'cal-day empty';
    calGrid.appendChild(blank);
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    cell.textContent = d;

    if (dateStr === today)         cell.classList.add('today');
    if (dateStr === selectedDate)  cell.classList.add('selected');
    if (bookedDates.has(dateStr))  cell.classList.add('has-bookings');

    cell.addEventListener('click', () => selectDate(dateStr));
    calGrid.appendChild(cell);
  }
}

function selectDate(dateStr) {
  selectedDate = dateStr;
  // Update selected highlight without full re-render
  calGrid.querySelectorAll('.cal-day.selected').forEach(el => el.classList.remove('selected'));
  calGrid.querySelectorAll('.cal-day:not(.empty)').forEach(el => {
    const d = parseInt(el.textContent);
    const ds = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    if (ds === dateStr) el.classList.add('selected');
  });
  renderRooms(dateStr);
}

prevBtn.addEventListener('click', async () => {
  currentMonth--;
  if (currentMonth < 1) { currentMonth = 12; currentYear--; }
  await renderCalendar();
});

nextBtn.addEventListener('click', async () => {
  currentMonth++;
  if (currentMonth > 12) { currentMonth = 1; currentYear++; }
  await renderCalendar();
});

// ── Rooms ────────────────────────────────────────────────────
async function renderRooms(date) {
  const formatted = new Date(date + 'T12:00:00')
    .toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  roomsTitle.innerHTML = `Rooms for <span>${formatted}</span>`;
  roomsGrid.innerHTML  = '<div class="state-message"><div class="icon">⏳</div><p>Loading rooms…</p></div>';

  const bookings = await getBookingsForDate(date);

  // Map room_id → booking
  const bookingByRoom = {};
  bookings.forEach(b => { bookingByRoom[b.room_id] = b; });

  roomsGrid.innerHTML = '';

  if (allRooms.length === 0) {
    roomsGrid.innerHTML = '<div class="state-message"><div class="icon">🏨</div><p>No rooms found.<br>Add rooms in your Supabase dashboard.</p></div>';
    return;
  }

  allRooms.forEach(room => {
    const booking = bookingByRoom[room.id] || null;
    roomsGrid.appendChild(buildRoomCard(room, booking, date));
  });
}

function buildRoomCard(room, booking, date) {
  const card = document.createElement('div');
  card.className = 'room-card';

  // Determine status
  let statusKey   = 'available';
  let badgeClass  = 'badge-available';
  let badgeLabel  = 'Available';

  if (booking) {
    statusKey  = booking.status;
    badgeClass = `badge-${booking.status}`;
    badgeLabel = booking.status === 'long-stay' ? 'Long Stay'
               : booking.status === 'checked-out' ? 'Checked Out'
               : booking.status === 'pending' ? 'Pending'
               : 'Booked';
  }

  // Header
  const header = document.createElement('div');
  header.className = 'room-card-header';
  header.innerHTML = `
    <div>
      <div class="room-number">Room ${room.room_number}</div>
      <div class="room-type">${room.room_type}</div>
    </div>
    <span class="status-badge ${badgeClass}">${badgeLabel}</span>
  `;

  card.appendChild(header);

  if (booking && booking.guests) {
    // Divider
    const div = document.createElement('div');
    div.className = 'room-divider';
    card.appendChild(div);

    // Guest info
    const guestInfo = document.createElement('div');
    const nights = Math.round((new Date(booking.check_out + 'T12:00:00') - new Date(booking.check_in + 'T12:00:00')) / 86400000) + 1;
    guestInfo.innerHTML = `
      <div class="guest-name">👤 ${booking.guests.full_name}</div>
      <div class="stay-dates">
        ${formatDate(booking.check_in)} → ${formatDate(booking.check_out)}
        (${nights} night${nights !== 1 ? 's' : ''})
      </div>
    `;
    card.appendChild(guestInfo);

    // Price
    const priceRow = document.createElement('div');
    priceRow.className = 'price-row';
    priceRow.innerHTML = `
      <span class="price-label">Total stay</span>
      <span class="price-value">$${Number(booking.total_price).toFixed(2)}</span>`;
    card.appendChild(priceRow);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-clear';
    clearBtn.textContent = 'Clear Room';
    clearBtn.addEventListener('click', () => cancelBooking(booking.id));
    card.appendChild(clearBtn);

  } else if (!booking) {
    const div = document.createElement('div');
    div.className = 'room-divider';
    card.appendChild(div);

    const avail = document.createElement('div');
    avail.innerHTML = `
      <div class="available-msg">No guest — room is free</div>
      <div class="price-row" style="margin-top:.5rem">
        <span class="price-label">Base rate</span>
        <span class="price-value">$${Number(room.base_price).toFixed(2)} / night</span>
      </div>
    `;
    card.appendChild(avail);

    // Add booking button
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = '+ Book this room';
    btn.style.marginTop = '.25rem';
    btn.addEventListener('click', () => openBookingModal(room, date));
    card.appendChild(btn);
  }

  return card;
}

// ── Booking Modal ────────────────────────────────────────────
let activeRoom = null;

function openBookingModal(room, date) {
  activeRoom = room;
  modalTitle.textContent = `Book Room ${room.room_number} (${room.room_type})`;

  // Pre-fill check-in with selected date
  document.getElementById('f-checkin').value  = date;
  document.getElementById('f-checkout').value = '';
  document.getElementById('f-name').value     = '';
  document.getElementById('f-email').value    = '';
  document.getElementById('f-phone').value    = '';
  document.getElementById('f-notes').value    = '';
  document.getElementById('f-status').value   = 'confirmed';

  modal.classList.add('open');
}

document.getElementById('modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

function closeModal() {
  modal.classList.remove('open');
  activeRoom = null;
}

bookingForm.addEventListener('submit', async e => {
  e.preventDefault();
  const checkIn  = document.getElementById('f-checkin').value;
  //const checkOut = document.getElementById('f-checkout').value;
  const name     = document.getElementById('f-name').value.trim();
  const email    = document.getElementById('f-email').value.trim();
  const phone    = document.getElementById('f-phone').value.trim();
  const notes    = document.getElementById('f-notes').value.trim();
  const status   = document.getElementById('f-status').value;
  const numDays = parseInt(document.getElementById('f-checkout').value);

  if (!checkIn || !numDays || numDays < 1 || !name) {
    alert('Please fill in guest name, check-in, and check-out dates.');
    return;
  }

  

  const checkInDate = new Date(checkIn + 'T12:00:00');
  let checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + numDays - 1);

  const checkOut = checkOutDate.toLocaleDateString('en-CA');
  const nights = numDays;

  
 

 // const checkOut = checkOutDate.toLocaleDateString('en-CA');
 // const nights = Math.round((checkOutDate - checkInDate) / 86400000) || 1;
 // const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
 // const nights = 0;
 // if ()
 // if (nights <= 0) { alert('Check-out must be after check-in.'); return; }

 
  const totalPrice = (nights * Number(activeRoom.base_price)).toFixed(2);

  const submitBtn = bookingForm.querySelector('[type=submit]');
  submitBtn.textContent = 'Saving…';
  submitBtn.disabled = true;

  try {
    const guest = await upsertGuest({ full_name: name, email: email || `${Date.now()}@noemail.local`, phone });
    if (!guest) throw new Error('Could not create guest');

    const booking = await createBooking({
      room_id:     activeRoom.id,
      guest_id:    guest.id,
      check_in:    checkIn,
      check_out:   checkOut,
      total_price: totalPrice,
      status,
      notes,
    });

    if (!booking) throw new Error('Could not create booking');

    closeModal();
    // Refresh calendar dots and rooms
    bookedDates = await getBookedDatesInMonth(currentYear, currentMonth);
    renderCalendar();
    renderRooms(selectedDate);

  } catch (err) {
    alert('Error saving booking: ' + err.message);
  } finally {
    submitBtn.textContent = 'Save Booking';
    submitBtn.disabled = false;
  }
  
});

async function cancelBooking(bookingId) {
  if (!confirm('Are you sure you want to clear this guest from the room?')) return;

  const { error } = await db
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);

  if (error) { alert('Error clearing booking: ' + error.message); return; }

  bookedDates = await getBookedDatesInMonth(currentYear, currentMonth);
  renderCalendar();
  renderRooms(selectedDate);
}

// ── Utilities ────────────────────────────────────────────────
function formatDate(dateStr) {
  return new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('default', { month: 'short', day: 'numeric' });
}

// ── Boot ─────────────────────────────────────────────────────
init();
