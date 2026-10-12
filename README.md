# ⚓ BATTLESHIP // Tactical Naval Operations

A production-ready, real-time multiplayer **Battleship** web game built with **React 19**, **TypeScript**, **Tailwind CSS**, **Framer Motion**, **Zustand**, and **Firebase** (Spark Free Plan — no Cloud Functions required).

Featuring **cryptographic commit-reveal anti-cheat**, fully **procedurally synthesized Web Audio** (zero external sound files), and a **PWA** manifest for installation on iOS and Android devices.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

> 💡 **Instant Local Testing**: Even before adding Firebase credentials, the game includes a local mesh broadcaster (`BroadcastChannel`). You can open two browser tabs on `localhost:5173`, create a room in tab 1, copy the 6-character sector code, and join in tab 2!

---

## 🌐 Full Firebase Setup & Deployment Guide (Step-by-Step for Beginners)

This game runs entirely on the **Firebase Spark Plan (100% Free)**:
- **Authentication**: Anonymous Sign-in (Unlimited & Free)
- **Database**: Cloud Firestore (1 GB storage, 50k reads/day, 20k writes/day)
- **Hosting**: Firebase Hosting (10 GB storage, 360 MB/day transfer)
- **Zero Cloud Functions or server code required!**

---

### Step A: Create a Firebase Project & Enable Services

1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **"Add project"**.
2. Name your project (e.g. `battleship-naval-command`). You can disable Google Analytics or leave it on.
3. Once created, enable **Anonymous Authentication**:
   - In the left sidebar, click **Build** ➜ **Authentication**.
   - Click **Get Started**.
   - Under the **Sign-in method** tab, click **Anonymous**.
   - Toggle **Enable** to ON and click **Save**.
4. Enable **Cloud Firestore**:
   - In the left sidebar, click **Build** ➜ **Firestore Database**.
   - Click **Create database**.
   - Select your preferred database location (e.g., `nam5 (us-central)` or closest to your players).
   - Choose **Start in production mode** (our strict security rules will configure all access).
   - Click **Create**.

---

### Step B: Register Web App & Create `.env`

1. In your Firebase Console, click the **Project Overview gear icon ⚙️** (top left) ➜ **Project settings**.
2. Under **General**, scroll down to **Your apps** and click the **Web icon `</>`**.
3. Register app nickname (e.g., `Battleship Web`). Do NOT check "Also set up Firebase Hosting for this app" yet. Click **Register app**.
4. Firebase will display `firebaseConfig` object with values like:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "your-project-id.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef123456"
   };
   ```
5. In your project root, create a file named `.env` (or copy `.env.example`):
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
   ```

---

### Step C: Test Locally with Firebase

Run:
```bash
npm run dev
```
Open `http://localhost:5173`. You are now talking directly to live Firestore!

---

### Step D: Build & Deploy to Firebase Hosting

1. Install Firebase CLI globally (if you haven't already):
   ```bash
   npm install -g firebase-tools
   ```
2. Log in to Firebase:
   ```bash
   firebase login
   ```
3. Associate your project:
   Open `.firebaserc` and replace `"your-firebase-project-id"` with your actual project ID, or run:
   ```bash
   firebase use --add
   ```
   (select your project from the list).
4. Build the production bundle:
   ```bash
   npm run build
   ```
5. Deploy everything (Hosting + Firestore Rules):
   ```bash
   firebase deploy
   ```
6. Your terminal will print your live URL:
   ```
   Hosting URL: https://your-project-id.web.app
   ```

---

### Step E: Add Firebase Authorized Domain

By default, Firebase allows `localhost` and `your-project-id.firebaseapp.com`. If you use a custom domain or alternate hosting URL:
1. Go to **Firebase Console** ➜ **Authentication** ➜ **Settings** tab.
2. Click **Authorized domains**.
3. Verify that your hosting domain (`your-project-id.web.app` and `your-project-id.firebaseapp.com`) is in the list. If not, click **Add domain** and paste it.

---

### Step F: How to Test with Two Devices (Phone & Laptop)

1. Open the live URL (or your local IP `http://192.168.x.x:5173`) on **Device 1** (e.g., your laptop).
2. Enter callsign `Commander Alpha` and click **Create Sector** (choose Classic or Salvo).
3. Click the **Copy Code** button or note the 6-character sector code (e.g., `8K2P9X`).
4. On **Device 2** (e.g., your phone), open the same URL.
5. Enter callsign `Admiral Bravo`, click **Infiltrate Code**, type `8K2P9X`, and tap **Join Match**.
6. Both devices will transition to the **Ship Placement** screen!
   - Drag or tap to place ships.
   - Tap to rotate ships.
   - Or click **Randomize** for instant deployment.
   - Tap **Lock Formation & Ready**.
7. Once both lock in, the battle begins in real-time with synchronized turn timers, synthesized sound effects, haptic vibration, and live telemetry!

---

## 🛡️ Anti-Cheat Protocol (Commit-Reveal)

Because the game runs without server code on the free Spark plan, client-side peer-to-peer integrity is enforced mathematically:

1. **Local Secrecy**: Ship coordinates are **never** uploaded to Firestore during play. Ships remain only in the client's local memory and `sessionStorage` (for refresh recovery).
2. **Cryptographic Commitment**: When clicking **Ready**, each client calculates:
   $$\text{SHA-256}(\text{normalizedBoardJSON} + \text{cryptographicSalt})$$
   Only the 64-character hash is stored in Firestore.
3. **Defending Resolution**: When Player A shoots, the shot is written to Firestore. The **defending** client (Player B) resolves the shot against their local secret board and publishes the outcome (`miss`, `hit`, `sunk`).
4. **Endgame Reveal & Audit**: When the match finishes, both players reveal their raw board and salt. Each client automatically executes `verifyOpponentFairPlay`:
   - Verifies that $\text{SHA-256}(\text{revealedBoard} + \text{salt}) == \text{committedHash}$.
   - Verifies that the revealed board has 5 valid ships within the 10x10 boundary with no illegal overlaps.
   - Replays every shot from combat telemetry against the revealed board to verify that every hit, miss, and sunk declaration was 100% truthful.
   - If an opponent altered coordinates or lied about hits, the honest player is alerted with `"Opponent Cheated"` and awarded the victory!

---

## 🧹 Firestore Room TTL & Cleanup Note

Cloud Firestore documents persist until deleted.
- **In-Game Rematch**: When players click **Rematch**, all old shot documents and player states in the room are automatically wiped clean for the next round.
- **Old Room Cleanup**: On the free Spark tier (no Cloud Functions), room documents consume negligible storage (< 4 KB per match). If you wish to prune rooms older than 7 days, you can enable Firestore TTL:
  1. In Firebase Console, go to **Firestore Database** ➜ **Data**.
  2. Select the `rooms` collection ➜ click **More actions ⋮** ➜ **Manage TTL**.
  3. Select the timestamp field `updatedAt` and set your desired retention period (e.g., 7 days).

---

## 🎧 Procedural Web Audio Engine

All audio is procedurally synthesized using the native **Web Audio API** in `/src/audio`:
- **Cannon blast**: Low-frequency triangle wave impulse + filtered noise transient
- **Water splash**: Bandpass-filtered resonant bubble noise
- **Explosion**: Multi-oscillator sawtooth + sub-bass rumble
- **Ship sunk**: Dual-oscillator mournful descending glide
- **Ambient soundtrack**: Submarine hull drone (55Hz) with distant 940Hz sonar pings
- Complies with browser autoplay policies: starts smoothly on the first user interaction.
- Global mute and individual SFX/Music volume sliders in Settings.

---

## 📱 Mobile PWA Installation

- **iOS Safari**: Tap the **Share** button ➜ select **"Add to Home Screen"**.
- **Android Chrome**: Tap the menu (three dots) ➜ select **"Install App"**.
- Safe-area insets, pull-to-refresh prevention, and touch zoom protection are configured for a native app feel.
