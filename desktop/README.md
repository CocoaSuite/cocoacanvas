# CocoaCanvas Desktop

Install Node.js 24, then run `npm ci` from the repository root.

- `npm start` launches the standalone editor in Electron.
- `npm run dist:win` builds Windows x64 installer and portable executable into `dist/`.
- The desktop workflow uploads both executables as an Actions artifact. Builds on `main` publish a GitHub Release for a new package version; a `desktop-v*` tag can also publish a release.

The app uses the existing standalone editor, not the web editor. It does not include the Cloudflare tracking script. External resources used by optional editor features may still require internet. The Windows installer registers `.ccanvas` project files; the portable version can open files using the editor's Open command.

Windows builds are unsigned, so SmartScreen may display a warning.
