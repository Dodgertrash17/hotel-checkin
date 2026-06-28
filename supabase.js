// ============================================================
//  SUPABASE CONNECTION
//  Replace the two values below with your own from:
//  Supabase Dashboard → Project Settings → API
// ============================================================
 
const SUPABASE_URL  = 'https://pvnckvnfwvqicppemeup.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bmNrdm5md3ZxaWNwcGVtZXVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzkzNDcsImV4cCI6MjA5NjYxNTM0N30.q6RKMTjirgzBKrLE3AKrMjLyIsRd9Iv5kZTCOSpA5hk';
 
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);
 
async function getAllRooms() {
  const { data, error } = await db
    .from('rooms')
    .select('*')
    .order('room_number', { ascending: true });
  if (error) { console.error('getAllRooms:', error); return []; }
  return data;
}
 
async function getBookingsForDate(date) {
  const { data, error } = await db
    .from('bookings')
    .select(`*, rooms ( id, room_number, room_type, base_price ), guests ( id, full_name, email, phone )`)
    .lte('check_in', date)
    .gte('check_out', date)
    .neq('status', 'cancelled');
  if (error) { console.error('getBookingsForDate:', error); return []; }
  return data;
}
 
async function getBookedDatesInMonth(year, month) {
  const start = `${year}-${String(month).padStart(2,'0')}-01`;
  const end   = new Date(year, month, 0).toISOString().split('T')[0];
  const { data, error } = await db
    .from('bookings')
    .select('check_in, check_out')
    .lte('check_in', end)
    .gte('check_out', start)
    .neq('status', 'cancelled');
  if (error) { console.error('getBookedDatesInMonth:', error); return new Set(); }
  const bookedSet = new Set();
  data.forEach(b => {
    let cur = new Date(b.check_in + 'T12:00:00');
    const out = new Date(b.check_out + 'T12:00:00');
    while (cur <= out) {
      bookedSet.add(cur.toLocaleDateString('en-CA'));
      cur.setDate(cur.getDate() + 1);
    }
  });
  return bookedSet;
}
 
async function createBooking({ room_id, guest_id, check_in, check_out, total_price, status = 'confirmed', notes = '' }) {
  const { data, error } = await db
    .from('bookings')
    .insert([{ room_id, guest_id, check_in, check_out, total_price, status, notes }])
    .select();
  if (error) { console.error('createBooking:', error); return null; }
  return data[0];
}
 
async function upsertGuest({ full_name, email, phone }) {
  const { data: existing } = await db
    .from('guests')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await db
    .from('guests')
    .insert([{ full_name, email, phone }])
    .select();
  if (error) { console.error('upsertGuest:', error); return null; }
  return data[0];
}
 
async function cancelBooking(bookingId) {
  const { error } = await db
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);
  if (error) { console.error('cancelBooking:', error); return false; }
  return true;
}