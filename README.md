# 🏨 Hotel Check-In App

A simple web app for managing hotel room availability and guest bookings.

---

## Quick Start

### 1. Set up Supabase
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** → **New Query**
4. Paste the contents of `schema.sql` and click **Run**
5. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon / public** key

### 2. Connect your app
Open `supabase.js` and replace these two lines at the top:

```js
const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_PUBLIC_KEY';
```

### 3. Open in VS Code
1. Open the `hotel-checkin` folder in VS Code
2. Install the **Live Server** extension (if you haven't already)
3. Right-click `index.html` → **Open with Live Server**
4. The app opens in your browser at `http://127.0.0.1:5500`

---

## Features
- 📅 Monthly calendar — click any day to view rooms
- 🏠 Room cards showing guest name, stay dates, and total price
- 🎨 Color-coded status badges (Available / Booked / Long Stay / Checked Out / Pending)
- ➕ Add new bookings directly from the room card
- 🔵 Calendar dots on days that have bookings

## Status Colours
| Colour | Meaning |
|--------|---------|
| 🟢 Green | Available |
| 🔵 Blue | Short stay booked |
| 🟠 Orange | Long stay / monthly |
| ⚪ Grey | Checked out |
| 🔴 Red | Pending |

## File Structure
```
hotel-checkin/
├── index.html      ← main page
├── styles.css      ← all styling
├── app.js          ← calendar + room logic
├── supabase.js     ← database helpers
├── schema.sql      ← paste into Supabase SQL editor
└── README.md       ← this file
```

## Next Steps (ideas to build on)
- Add a **guest search** page
- Add **check-out** button on room cards
- Send **email confirmations** via Supabase Edge Functions
- Add **staff login** with Supabase Auth
- Export a **daily report** to PDF
