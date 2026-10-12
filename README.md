# 90s Turf — Admin Mobile App

Expo SDK 57 (React Native 0.86) + Expo Router + TanStack Query. Runs in **Expo Go** on Android/iOS and in the **browser**. Uses the NestJS API in `../Backend`; only **admin** accounts can sign in.

## Run

The backend must be running first (`cd ../Backend && npm run start:dev`).

```bash
npm install
npx expo start --port 8082   # QR code for Expo Go;  press  w  to open the web version
```

Port 8082 is used because 8081 is often taken by another project. The backend allows the web version on 8081 and 8082 (`CORS_ORIGINS` in `Backend/.env`).

### On your phone (Expo Go)

1. Install/update **Expo Go** from the Play Store / App Store (it must support SDK 57).
2. Connect the phone to the **same Wi-Fi** as this computer.
3. Scan the QR code from `npx expo start` (Android: in Expo Go; iPhone: with the Camera app), or in Expo Go choose **Enter URL manually** and type `exp://<your-PC-IP>:8082`.

The app finds the API automatically: it uses the computer that served the app (`http://<your-PC-IP>:4000/api`). The login screen shows the server it is using. To point at a different server, set `EXPO_PUBLIC_API_URL` (e.g. in `.env.local`: `EXPO_PUBLIC_API_URL=http://192.168.1.20:4000/api`).

If the phone shows *Can't reach the server*: check the backend is running, both devices are on the same Wi-Fi, and Windows Firewall allows Node.js on that network.

### In the browser

Press **w** in the Expo terminal, or open http://localhost:8082. Best viewed at phone width.

## Screens

| Screen | What it does |
|---|---|
| **Login** | Admin sign-in; stays signed in for 7 days after last use. Refresh token in the phone's secure storage (httpOnly cookie on web), access token in memory and renewed automatically |
| **Home** | Payments collected (All time / Today / This week / This month), court bookings, playing now, outstanding, booked value, payments-per-month chart (tap a bar), upcoming appointments |
| **Bookings** | Search, Upcoming / Ongoing / Completed / Cancelled tabs with counts, date filters, infinite scroll, pull to refresh, **+** to add |
| **Booking detail** | Every booking field, payment history, record payment / advance / refund (bottom sheet), booking-confirmation & invoice PDFs (open, email, WhatsApp), call customer, edit, cancel, delete |
| **New / edit booking** | Customer, date strip, time in/out, extra guests, live price estimate, optional first payment |
| **Payments** | All payments and refunds, filter by method, search |
| **Invoices** | Status filters, search, invoice detail with line items, balance and PDF (open, email, WhatsApp) |
| **More** | Profile, Customers (call/email), Enquiries (mark contacted/closed), edit profile, change password, sign out |

## Checks

```bash
npx tsc --noEmit     # types
npx expo lint        # lint (React Compiler rules on)
npx expo-doctor      # dependency/config health
```

## Structure

```
src/
  app/            routes (Expo Router): login, (tabs)/…, booking/[id], booking/form, invoice/[id], customers, enquiries, account
  components/     UI kit (ui.tsx), gradient header, booking card, revenue chart, toast
  hooks/          TanStack Query hooks for every endpoint, debounce
  lib/            API client (auto LAN address), auth, secure storage, types, formatting, price estimate
  theme.ts        colours, fonts, spacing — same palette as the website
```
