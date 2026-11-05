# Atelier

Atelier is a browser-first virtual fitting room. Your wardrobe is stored in this browser with IndexedDB. Camera frames, selected photos, and pose inference are processed locally; the app does not upload personal images or require an account or API key.

The try-on is a pose-guided **2D overlay**, not photorealistic garment replacement or a sizing/fit guarantee. Transparent garment images generally produce the cleanest overlay. The add-clothing editor includes a manual eraser for rough background cleanup; it is not automatic background removal.

## Run locally

Requirements: Node.js 20.19+ (or 22.12+) and npm.

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite. Camera access is available on localhost; deployed camera access requires HTTPS and the user's permission. Photo-based try-on and wardrobe management do not require camera access.

## Production build

```sh
npm run build
npm run preview
```

The static production site is written to `dist/`. No environment variables or server-side services are required.

## Deploy to GitHub Pages (free static hosting)

The included GitHub Actions workflow builds and publishes the app to GitHub Pages whenever a commit is pushed to `main`.

1. Create a GitHub repository named `ClothiingTryOn` under your account and push this project to its `main` branch.
2. In the repository, open **Settings → Pages** and select **GitHub Actions** under **Build and deployment**.
3. Wait for the **Deploy to GitHub Pages** workflow to complete successfully in the **Actions** tab.
4. Open `https://<your-github-username>.github.io/ClothiingTryOn/`. GitHub Pages serves the app over HTTPS, so camera access can be granted on supported mobile browsers.

No secrets, environment variables, or backend services are required. The Vite base path is configured for this repository name. The included `public/_headers` applies additional security headers on hosts that support the Pages `_headers` convention; GitHub Pages itself may ignore that file.

## Local processing and model download

The MediaPipe Pose Landmarker package's WASM runtime and its open-source pose model are downloaded from jsDelivr and Google Cloud Storage when the Studio is opened. They run in the browser; this downloads model assets, not user images. The first model load needs an internet connection. If those assets are unavailable, manual fitting adjustments and photo export remain usable, but automatic pose alignment does not.

Garments are resized in the browser and saved to IndexedDB on the current browser/device. They are not synchronized or backed up. Clearing browser site data, using private browsing, or switching devices may remove or hide them. Captured results are not kept by the app unless you download or share them.

## Scripts

- `npm run dev` — local development server
- `npm run build` — TypeScript checks and production build
- `npm run preview` — preview the production build locally
- `npm run lint` — Oxlint
