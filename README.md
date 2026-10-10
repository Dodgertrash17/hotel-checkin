#Hotel Check-In App

A simple web app for managing hotel room availability and guest bookings.

## Features
- Monthly calendar — click any day to view rooms
- Room cards showing guest name, stay dates, and total price
- Color-coded status badges (Available / Booked / Long Stay / Checked Out / Pending)
- Add new bookings directly from the room card
- Calendar dots on days that have bookings

## File Structure
```
hotel-checkin/
├── index.html      ← main page
├── styles.css      ← all styling
├── app.js          ← calendar + room logic
├── supabase.js     ← database helpers
├── schema.sql      ← Supabase SQL editor
└── README.md       ← this file
```
Der Ghan Motel Sunnyvale, CA 94087

This web app allows user to book and track room availability while also tracking
amount each room has made over any time period. Database stores guest's names, 
payment type and dates of check in and check out (days stayed).

