# Signing Journal Today

The release workflow already accepts optional signing credentials. With no credentials, Windows builds are unsigned and macOS builds use an ad-hoc signature. Neither establishes a verified publisher identity. Linux AppImages do not use these certificates.

Start with a manual **Actions → Build installers → Run workflow** run. It produces artifacts without publishing a release. Only enable signing for code and workflow changes you have reviewed and trust.

## Keep credentials private

- Keep certificate exports and backups outside this repository, preferably in encrypted storage. Never put private keys, passwords, Apple app-specific passwords, or base64 certificate data in this guide, chat, an issue, a screenshot, or a committed file.
- Base64 is an encoding, not encryption. Treat the encoded value exactly like the private-key file.
- Add the values below through **Settings → Secrets and variables → Actions → New repository secret**. Use **Secrets**, not Variables. GitHub CLI's interactive `gh secret set NAME --repo robertiagar/journal-today` is also supported; do not use a literal secret in `--body` or a command line.
- Do not run `env`, `printenv`, `set -x`, shell transcription, debug logging, or commands that print encoded certificates while preparing credentials. Keep clipboard history and screen sharing in mind if using the web form.
- `.gitignore` ignores common certificate/private-key formats and `.secrets/`. Packaging also excludes these formats, `.env*`, and `.secrets/`. These guards do not protect an already tracked file or a private key renamed to an ordinary text file. Inspect `git status` and the staged diff before every signing-related commit. Do not use `git add -f` for credentials.
- Build artifacts include only installer/update assets. Test diagnostics exclude journal profiles. Signing secrets are passed explicitly to the packaging workflow and exist in the packaging step's environment, not in the renderer or updater feed. Official setup/artifact actions are pinned to immutable commits; review changes to those pins. Keep that separation if editing the workflow.
- GitHub's masking is a fallback, not a guarantee: transformed, partial, or multiline secrets may not be masked. Never deliberately print them to test masking.

Your certificate's publisher name, organization, and public certificate details are **public in a signed app**. Apple notarization also submits the application to Apple. Choose the publisher identity accordingly; private keys and passwords are never meant to ship.

## macOS: Developer ID and notarization

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/). You need access to a Mac with Xcode or its command-line tools for initial certificate preparation and verification.
2. Create a **Developer ID Application** certificate for direct distribution. Install it with its matching private key in Keychain Access. A development or Mac App Store certificate is not the right identity for these DMG/ZIP downloads. Keep the existing app ID `com.journaltoday.desktop` stable.
3. In Keychain Access, select the certificate with its private key and export it as a password-protected `.p12`. Store it outside the checkout and choose a strong export password. A certificate without its private key cannot sign the app.
4. Find your Apple Developer Team ID. Create an **app-specific password** for notarization in your Apple Account. Do not use your normal Apple Account password.
5. Add all five repository secrets:

| Secret | Value |
| --- | --- |
| `MAC_CSC_LINK` | Base64 of the password-protected `.p12` |
| `MAC_CSC_KEY_PASSWORD` | The `.p12` export password |
| `APPLE_ID` | The Apple Account email used for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | An app-specific password for notarization |
| `APPLE_TEAM_ID` | Your Apple Developer Team ID |

The workflow maps `MAC_CSC_LINK`/`MAC_CSC_KEY_PASSWORD` to electron-builder's `CSC_LINK`/`CSC_KEY_PASSWORD` on macOS only. With a certificate configured, it requires all notarization secrets, enables signing enforcement and notarization, and uses hardened runtime with `electron/entitlements.mac.plist`. Without one, it explicitly selects ad-hoc signing and disables hardened runtime for the test build.

To encode and upload the certificate without displaying it, run this in a normal local PowerShell session with GitHub CLI already authenticated. Do not run it in CI, a recorded session, or this chat. The prompt asks for a local file path, not its contents:

```powershell
$signingCertPath = Read-Host 'Full path to the exported .p12 outside the repository'
[Convert]::ToBase64String([IO.File]::ReadAllBytes($signingCertPath)) | gh secret set MAC_CSC_LINK --repo robertiagar/journal-today
Remove-Variable signingCertPath
```

Enter each remaining value using GitHub's secret form or the CLI's interactive secret prompt. Keep an encrypted backup of the private key; do not delete your only copy. Both Intel and Apple Silicon builds use the same Developer ID identity.

After a successful manual build, download the DMG and ZIP artifacts. On a Mac, mount the DMG, copy the app into Applications, and verify:

```sh
codesign --verify --deep --strict --verbose=2 '/Applications/Journal Today.app'
spctl --assess --type execute --verbose=2 '/Applications/Journal Today.app'
xcrun stapler validate '/Applications/Journal Today.app'
```

Confirm a Developer ID identity and accepted notarization, then launch a browser-downloaded copy on a separate Mac. A locally copied app may not have the same quarantine checks. In-app macOS installation is enabled only when the running app has a Developer ID Application signature; ad-hoc builds offer the release download page instead.

See [Electron's signing overview](https://www.electronjs.org/docs/latest/tutorial/code-signing) and [electron-builder v26 macOS signing](https://www.electron.build/v26/docs/features/code-signing/code-signing-mac/).

## Windows: choose a CI-compatible signing method

The configured path accepts an existing, valid **exportable Authenticode code-signing certificate with its private key**, stored in a password-protected `.pfx`/`.p12`. Add:

| Secret | Value |
| --- | --- |
| `WIN_CSC_LINK` | Base64 of the password-protected certificate/private-key export |
| `WIN_CSC_KEY_PASSWORD` | Its export password |

Use the same PowerShell pipeline shown above, selecting the Windows certificate file and changing `MAC_CSC_LINK` to `WIN_CSC_LINK`. Do not place the encoded output in a temporary text file or print it. The workflow gives these secrets only to Windows packaging and requires successful signing when a certificate is configured.

**Check with the certificate provider before purchasing anything.** Many current code-signing offerings keep private keys in a hardware token, HSM, or managed signing service and cannot export them as a `.pfx`. A public `.cer` download is not a private-key export. Do not attempt to extract a hardware-protected key.

For a non-exportable certificate, use the provider's supported remote-signing integration, a suitably secured self-hosted signing runner, or Microsoft's managed signing service. Those methods need a change to this workflow and electron-builder's signing configuration; the two PFX secrets alone will not enable them. Prefer short-lived GitHub OIDC authentication when the service supports it. No cloud account, hardware integration, or long-lived service credential is configured here. See [electron-builder v26 Windows signing](https://www.electron.build/v26/docs/features/code-signing/code-signing-win/).

After a manual signed build, verify the installer and installed application on Windows:

```powershell
Get-AuthenticodeSignature -LiteralPath '.\journal-today-0.1.0-win-x64.exe' | Select-Object Status, StatusMessage, SignerCertificate
Get-AuthenticodeSignature -LiteralPath 'C:\path\to\installed\Journal Today.exe' | Select-Object Status, StatusMessage, SignerCertificate
```

Use the actual version and installed path. Require `Valid` and the expected publisher. Test the ARM64 installer on an ARM64 machine too. Signing establishes publisher identity; it does not guarantee that SmartScreen or every antivirus product will immediately trust a new release.

## Before publishing and testing updates

1. Keep GitHub account two-factor authentication enabled and restrict repository write access. Protect the release branch/tags so unreviewed workflow code cannot read signing secrets. Ordinary CI/pull requests do not receive signing secrets; manual installer builds do, so choose only trusted branches for them.
2. After adding the secrets, run **Build installers** manually. Check the signatures and installation on each platform before creating a version tag. The workflows use GitHub's built-in token for uploading; no personal access token belongs in the application.
3. Publish releases from a **public repository** if you want the app's unauthenticated GitHub update checks to work. Do not embed a private-repository access token in the app. If the source needs to stay private, design a separate public release repository/feed first.
4. Publish a first version, then a higher matching version/tag. Install the first and use **Help → Check for Updates…**. Check download, Later, and Restart and install. macOS needs its signed ZIP, Windows needs NSIS, and Linux needs to run as an AppImage. Keep every update metadata `.yml` file and `.blockmap` alongside the release downloads; the workflow includes them automatically.
5. Back up the journal with the app closed before a real upgrade test. Automated tests disable network updates and use disposable profiles. A live cross-version installation test still needs real signed releases and target machines.

If a credential may have leaked, revoke/rotate it with Apple or the certificate/signing provider and replace the GitHub secret. Also remove exposed logs/artifacts and address repository history if necessary. Deleting a file, commit, or secret alone does not revoke the key. Avoid pasting the suspected credential into an issue while reporting the incident.

GitHub references: [adding and using secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).
