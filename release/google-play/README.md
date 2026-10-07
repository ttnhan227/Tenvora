# Tenvora Google Play upload packet

These files are prepared for the owner to upload in Play Console. They do not publish the app or grant production access.

- `title.txt`, `short-description.txt`, `full-description.txt`: English listing copy.
- `release-notes.txt`: first testing release notes.
- `app-icon.png`: existing Tenvora vector branding on a full-square background, 512 × 512 RGBA PNG; Play applies its own mask.
- `feature-graphic.png`: 1024 × 500 opaque PNG. Editable vector source is beside it. Alt text: “Tenvora brings sales, stock, expenses and balances together.”
- `vi-VN/`: Vietnamese listing copy, release notes and feature graphic.
- `screenshots/en-US/`: actual Android release captures, with fictional reviewer-shop records. The owner requested English-only screenshots; the same images can accompany translated listing text.
- `question-for-google.txt`: draft for Google support about personal-account financial-feature eligibility; not sent.

Use `docs/PLAY_SUBMISSION_PACKET.md` for Data safety guidance and reviewer navigation. Reviewer credentials are in the ignored local `.audit/play-reviewer-credentials.json`; never upload that file as a public asset. Recheck the reviewer login before each submission.

The signed bundle is retained at `mobile/build/play-release-ci/tenvora-1.0.0.aab`, with checksum and verification receipt in the same directory. Version name stays 1.0.0. Use version code 1 only if it has not already been uploaded.

Owner steps remain: create the Play app, answer declarations accurately, resolve personal-account eligibility, register the Play signing certificate for Google sign-in, install through a Play test track, review pre-launch results, and complete any required closed testing. Screenshots captured by an Android emulator do not establish physical-device or Play-installed acceptance.

Asset requirements checked against [Google Play preview asset guidance](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).

The retained release directory also contains `tenvora-mobile.apk` and `tenvora-play-listing.zip`. The ZIP contains public listing assets and submission/acceptance documents only; credentials and signing keys are excluded. Capture provenance is recorded in `screenshots/capture-provenance.json`.
