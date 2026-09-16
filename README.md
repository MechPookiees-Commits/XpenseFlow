# XpenseFlow

A local-only Android app that turns your bank's UPI debit SMS into a canteen spending ledger.
Kotlin · Jetpack Compose · Room · no network permission.

---

## A note on the brief

Your spec asked for a **native Android application**, but the technical section asked for
Swift + SwiftUI, native macOS APIs, and macOS Full Disk Access. Those cannot both be true.
Android is the binding requirement (it's the platform, and the data source is the Android
Messages app), so this is a Kotlin/Compose Android project. The macOS-specific parts were
translated, not dropped:

| Brief (macOS) | Android equivalent implemented here |
|---|---|
| Swift + SwiftUI | Kotlin + Jetpack Compose (Material 3) |
| Messages `chat.db` via SQLite | `content://sms/inbox` via `ContentResolver`, read-only |
| Full Disk Access prompt | `READ_SMS` runtime permission flow + in-app explanation |
| Local SQLite layer | Room (SQLite) in app-private storage |

---

## Getting an APK

Three routes, easiest first. All of them need Google's Maven repo, which is why the APK
cannot be produced without a network path to `dl.google.com` / `maven.google.com`.

### 1. GitHub Actions (no tools to install)

1. Create an empty GitHub repo.
2. Push this folder to it (`git init && git add . && git commit -m init && git push`).
3. Actions runs `.github/workflows/build-apk.yml` automatically: it installs the Android SDK,
   runs the parser tests, builds the APK.
4. Actions tab → latest run → **Artifacts** → `XpenseFlow-debug-apk` → download, unzip, copy the
   `.apk` to your phone, install (allow "install unknown apps" for your file manager).

The build fails loudly if the parser tests fail, so a green run means the detection logic is
actually working, not just compiling.

### 2. Android Studio

File → Open → this folder → Run. The SDK, wrapper and dependencies are handled for you.

### 3. Command line

```bash
export ANDROID_HOME=/path/to/android-sdk    # needs platform-35 + build-tools-35
./gradlew :app:testDebugUnitTest     # parser + money tests
./gradlew :app:assembleDebug         # -> app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The Gradle wrapper (8.9) is bundled, so no local Gradle install is needed.
`minSdk 26`, `targetSdk 35`.

**Debug vs release.** The CI APK is debug-signed — fine for sideloading onto your own phone,
and it will keep working indefinitely. If you later want a release build, generate a keystore
once and keep it: losing it means you can never update an installed copy in place.

---

## First run

1. Settings → **Grant permission** (READ_SMS / RECEIVE_SMS).
2. Settings → **Watched UPI IDs** → add `canteen@upi` (and `mess@upi`, `chai@upi`, …).
   Nothing is detected until at least one payee exists — by design, not a bug.
   **Also fill "Also match these names"** with the exact merchant name your bank prints
   (e.g. `CANTEEN`). SBI and HDFC frequently write *"Sent Rs.45.00 ... To CANTEEN"* and never
   include the VPA at all, so UPI-ID-only matching would miss those entirely. Matching is
   whole-word, so `chai` will not match `Chaitanya Stores`.
3. Tap **Scan** in the top bar. The first scan reads the whole inbox; every scan after that
   reads only messages newer than the stored watermark.

---

## Architecture

```
SmsReader  →  UpiParser  →  ScanEngine (dedup)  →  Room  →  ViewModel  →  Compose UI
 read-only    pure regex     3 guards             local     StateFlow
```

| Component | File |
|---|---|
| Message reader (read-only) | `data/sms/SmsReader.kt` |
| Transaction parser | `domain/parser/UpiParser.kt` |
| Dedup + orchestration | `domain/ScanEngine.kt` |
| Database | `data/db/*` |
| Aggregations | `domain/Stats.kt` |
| Export | `export/CsvExporter.kt`, `export/PdfExporter.kt` |
| UI | `ui/**` |

`SmsReader` only ever calls `ContentResolver.query`. There is no insert/update/delete path to
the Messages provider anywhere in the codebase, so the system SMS database cannot be modified.

## Privacy

- **No `INTERNET` permission in the manifest.** The app is structurally incapable of sending
  anything anywhere — this is stronger than a promise not to.
- No backend, no analytics, no external AI or API. Parsing is local regex.
- Room DB lives at `/data/data/com.xpenseflow/databases/xpenseflow.db` (shown in Settings),
  private to the app and excluded from cloud backup (`allowBackup=false`).
- Exports go only where you point the system file picker.

## Duplicate protection

Three guards, cheapest first:

1. `smsId` unique index — the same inbox row can never be ingested twice.
2. `refId` unique index — authoritative when the bank supplies a UPI reference / RRN.
3. Identical message hash, or same amount + same payee within a 3-minute window. If both
   candidates carry *different* reference IDs they are treated as two genuine payments.

Everything blocked here is counted in Settings → Diagnostics.

## Parser coverage

Handles, among others:

| Bank / form | Example |
|---|---|
| HDFC (VPA) | `Rs.45.00 debited from A/c XX4412 ... to VPA canteen@upi. UPI Ref 412398765123` |
| HDFC (name only) | `Sent Rs.45.00 From HDFC Bank A/C x4412 To CANTEEN On 12/05/25 Ref 412398765123` |
| SBI (no currency token) | `Dear UPI user A/C X1234 debited by 45.0 ... trf to CANTEEN Refno 512398765123` |
| ICICI | `ICICI Bank Acct XX123 debited for Rs 45.00 ...; canteen@upi credited. UPI:512398765121` |
| Axis (narration) | `INR 45.00 debited A/c no. XX1234 ... UPI/P2M/512398765122/canteen. Bal INR 5,430.25` |
| PSP | `UPI payment of INR 45 to canteen@upi is successful. Txn ID 998877665544` |
| Symbol / generic | `Paid ₹45 to canteen@upi` · `Your account has been debited by Rs 45 ...` |

It also rejects the things that look similar but are not payments: credits and refunds, OTPs,
collect requests, and — importantly — it does not mistake `Avl Bal Rs 15,430.25` for the
transaction amount. See `app/src/test/java/com/xpenseflow/UpiParserTest.kt`.

Anything that mentions a watched UPI ID, looks like a debit, but has no readable amount is
counted as a **parsing failure** in Diagnostics rather than silently dropped — those are the
ones to add with the **+** button and to use for tuning the regexes.

## Known Android limitations (not worked around, just stated)

- **Background scan floor is 15 minutes.** WorkManager will not run periodic work more often.
  Live capture (`SmsReceiver`) covers the gap for messages that arrive while the app is installed;
  the periodic scan is the safety net for anything missed.
- **RCS / in-app bank notifications are invisible.** Only SMS lands in the SMS provider. If your
  bank alerts you only through its own app, there is nothing to read.
- **Play Store distribution would require SMS-access review.** Sideloading onto your own phone
  does not.
- **No fake data anywhere.** With no permission or no configured UPI ID the app shows empty
  states and says why.
