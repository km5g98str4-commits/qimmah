# Versioning

Release 1.0 uses `MARKETING_VERSION = 1.0.0` and monotonically increasing
`CURRENT_PROJECT_VERSION = 2`. Marketing version changes only for a user-visible App Store
version; build number increments for every archive uploaded to App Store Connect, including
rebuilds of the same marketing version. Never reuse a submitted build number.

Universal Links remain **OWNER** until the Apple Team ID and owned domain replace
`OWNER-TO-CONFIRM` in `App.entitlements` and the AASA `appIDs` entry.
