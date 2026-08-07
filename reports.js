
// ── Auth guard ───────────────────────────────────────────
db.auth.getSession().then(({ data }) => {
	if (!data.session) window.location.href = 'login.html';
});

// ── State ────────────────────────────────────────────────
let activeRange = 'today';
let fromDate	= '';
let toDate		= '';
let allRooms	= [];
let summaryData = []; // [{room, bookings[]}]

// ── Helpers ──────────────────────────────────────────────
function todayStr() { return new Date().toLocaleDateString('en-CA'); }

function monthRange() {
	const now	= new Date();
	const year	= now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const last	= new Date(year, now.getMonth() + 1, 0).getDate();
	return { from: `${year}-${month}-01`, to: `${year}-${month}-${last}` };
}

function formatDate(d) {
	return new Date(d + 'T12:00:00').toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
}

function nightsBetween(a, b) {
	const nights = Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
	return nights < 1 ? 1 : nights;
}

// ── Fetch bookings in range ──────────────────────────────
async function fetchBookingsInRange(from, to) {
	const { data, error } = await db
		.from('bookings')
		.select(`*, rooms ( id, room_number, room_type ), guests ( id, full_name, email, phone )`)
		.gte('check_in', from)
		.lte('check_in', to)
		.not('status', 'in', '("cancelled")');
	if (error) { console.error(error); return []; }
	return data;
}

// ── Fetch today's occupied rooms ─────────────────────────
async function fetchOccupiedToday() {
	const today = todayStr();
	const { data, error } = await db
		.from('bookings')
		.select('room_id')
		.lte('check_in', today)
		.gte('check_out', today)
		.not('status', 'in', '("cancelled","checked-out")');
	if (error) return new Set();
	return new Set(data.map(b => b.room_id));
}

// ── Build summary table ──────────────────────────────────
async function buildReport(from, to, label) {
	document.getElementById('report-label').textContent = label;
	document.getElementById('summary-body').innerHTML =
		'<tr><td colspan="5" class="empty-msg">Loading…</td></tr>';
	document.getElementById('revenue-total').style.display = 'none';
	closeDetail();

	const [bookings, occupiedSet] = await Promise.all([
		fetchBookingsInRange(from, to),
		fetchOccupiedToday()
	]);

	// Group by room
	const byRoom = {};
	allRooms.forEach(r => { byRoom[r.id] = { room: r, bookings: [] }; });
	bookings.forEach(b => {
		if (byRoom[b.room_id]) byRoom[b.room_id].bookings.push(b);
	});

	summaryData = Object.values(byRoom);

	const tbody = document.getElementById('summary-body');
	tbody.innerHTML = '';

	let grandTotal = 0;

	summaryData.forEach(({ room, bookings: rBookings }, idx) => {
		const revenue = rBookings.reduce((s, b) => s + Number(b.total_price || 0), 0);
		grandTotal += revenue;
		const occupied = occupiedSet.has(room.id);

		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td><strong>Room ${room.room_number}</strong></td>
			<td>${room.room_type}</td>
			<td>
				<button class="times-sold-btn" data-idx="${idx}" ${rBookings.length === 0 ? 'disabled' : ''}>
					${rBookings.length}
				</button>
			</td>
			<td>
				<span class="status-pill ${occupied ? 'pill-occupied' : 'pill-available'}">
					${occupied ? 'Occupied' : 'Available'}
				</span>
			</td>
			<td style="color:var(--accent); font-weight:600;">$${revenue.toFixed(2)}</td>
		`;
		tbody.appendChild(tr);
	});

	if (summaryData.length === 0) {
		tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">No data found for this range.</td></tr>';
	}

	document.getElementById('total-revenue-val').textContent = `$${grandTotal.toFixed(2)}`;
	document.getElementById('revenue-total').style.display = 'block';

	// Click handler for times-sold buttons
	tbody.querySelectorAll('.times-sold-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			const idx = parseInt(btn.dataset.idx);
			showDetail(summaryData[idx], from, to);
		});
	});
}

// ── Detail panel ─────────────────────────────────────────
function showDetail({ room, bookings: rBookings }, from, to) {
	document.getElementById('detail-title').textContent =
		`Room ${room.room_number} — Guest History (${formatDate(from)} → ${formatDate(to)})`;

	const tbody = document.getElementById('detail-body');
	tbody.innerHTML = '';

	if (rBookings.length === 0) {
		tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">No bookings in this range.</td></tr>';
	} else {
		rBookings.forEach(b => {
			const nights = nightsBetween(b.check_in, b.check_out);
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td><strong>${b.guests ? b.guests.full_name : '—'}</strong><br>
					<span style="font-size:.75rem;color:var(--text-muted)">${b.guests?.phone || ''}</span>
				</td>
				<td>${formatDate(b.check_in)}</td>
				<td>${formatDate(b.check_out)}</td>
				<td>${nights} night${nights !== 1 ? 's' : ''}</td>
				<td style="color:var(--accent);font-weight:600;">$${Number(b.total_price || 0).toFixed(2)}</td>
				<td style="color:var(--text-muted);font-size:.8rem;">${b.notes || '—'}</td>
			`;
			tbody.appendChild(tr);
		});
	}

	document.getElementById('detail-panel').classList.add('open');
	document.getElementById('detail-panel').scrollIntoView({ behavior: 'smooth' });
}

function closeDetail() {
	document.getElementById('detail-panel').classList.remove('open');
}
document.getElementById('close-detail').addEventListener('click', closeDetail);

// ── Tab switching ────────────────────────────────────────
document.querySelectorAll('.range-tab').forEach(tab => {
	tab.addEventListener('click', () => {
		document.querySelectorAll('.range-tab').forEach(t => t.classList.remove('active'));
		tab.classList.add('active');
		activeRange = tab.dataset.range;

		const customBar = document.getElementById('custom-range-bar');
		if (activeRange === 'custom') {
			customBar.style.display = 'flex';
		} else {
			customBar.style.display = 'none';
			loadRange();
		}
	});
});

document.getElementById('apply-range').addEventListener('click', () => {
	fromDate = document.getElementById('range-from').value;
	toDate	= document.getElementById('range-to').value;
	if (!fromDate || !toDate) { alert('Please select both dates.'); return; }
	if (fromDate > toDate)	{ alert('From date must be before To date.'); return; }
	loadRange();
});

function loadRange() {
	const today = todayStr();
	if (activeRange === 'today') {
		buildReport(today, today, `Sales — Today (${formatDate(today)})`);
	} else if (activeRange === 'month') {
		const { from, to } = monthRange();
		buildReport(from, to, `Sales — ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`);
	} else if (activeRange === 'custom' && fromDate && toDate) {
		buildReport(fromDate, toDate, `Sales — ${formatDate(fromDate)} to ${formatDate(toDate)}`);
	}
}

// ── Init ─────────────────────────────────────────────────
async function init() {
	const { data, error } = await db.from('rooms').select('*').order('room_number', { ascending: true });
	if (error) { console.error(error); return; }
	allRooms = data;

	// Read the range from the URL e.g. reports.html?range=month
	const params = new URLSearchParams(window.location.search);
	const rangeParam = params.get('range');

	if (rangeParam === 'month' || rangeParam === 'custom') {
		activeRange = rangeParam;
		document.querySelectorAll('.range-tab').forEach(t => {
			t.classList.toggle('active', t.dataset.range === rangeParam);
		});
		if (rangeParam === 'custom') {
			document.getElementById('custom-range-bar').style.display = 'flex';
			return; // Wait for user to pick dates and click Apply
		}
	}

	loadRange();
}

init();