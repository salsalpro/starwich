# استارویج / Starwich menu

Mobile-first Persian menu with 77 initial items, six categories, a protected editor, image uploads, and a permanent QR endpoint. Public pages use the approved archive assets; edits are kept as JSON and WebP files in a separate private GitHub repository.

## Production setup

1. Create a **private** GitHub repository for content. Use a fine-grained token limited to that repository with **Contents: Read and write**. The app checks that the repository is private before using it.
2. Set these Vercel **Production** environment variables:
   - `CONTENT_REPO`: `owner/repository`, for example `salsalpro/starwich-content`.
   - `CONTENT_TOKEN`: the fine-grained GitHub token. Treat as a server secret.
   - `SESSION_SECRET`: at least 32 unpredictable characters.
   - `BOOTSTRAP_PHONE` and `BOOTSTRAP_PASSWORD`: the provided initial manager credentials. Set these only as server environment variables, never in code or Git.
   - `PUBLIC_ORIGIN`: the verified production origin, with `https://` and without a trailing slash. This hostname is permanently encoded in the printable QR.
3. Deploy to Vercel and visit `/admin`. Sign in with the initial credentials and set a new password of at least 12 characters before using the editor. The account is stored at `private/account.json` in the private content repository. Once rotated, the bootstrap password cannot restore access, even after a redeploy.
4. Download the print image from the admin **کد QR** screen. Keep the original hostname and `/qr` endpoint reachable after printing. If the menu moves, edit the QR destination in admin; do not change the QR's printed hostname. The endpoint sends a 307 redirect with no-store headers.

The first read of `data/content.json` uses the packaged seed only when no saved JSON exists. Later deploys never overwrite the saved file. Menu edits use the GitHub Contents API's file SHA so concurrent saves report a conflict. Uploaded WebP files live under `images/`; private account data lives under `private/`. The public server only serves images referenced by the current menu and never exposes storage credentials or private JSON. The initial photos are in `public/photos/`.

## Local development

Run `npm install`, copy `.env.example` to `.env.local`, fill server secrets, then `npm run dev`. Without `CONTENT_REPO` and `CONTENT_TOKEN`, local changes are written to ignored `.local-store/`. For production, both storage variables are required. Run `npm test` and `npm run build` before deploying. `node scripts/integration.mjs` exercises local auth, content, upload and QR flows against a running dev server; it changes the local test account and resets the public seed afterward.

Future menu updates use `/admin`; no redeploy is needed. If the GitHub token expires, replace `CONTENT_TOKEN` in Vercel and redeploy. Keep the content repository private and backed up. QR destinations are editable in the admin screen.
