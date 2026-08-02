# Native minimum-functionality defense

Qimmah is not a repackaged website. Its iOS build uses native camera barcode scanning, local
notifications, an offline bundled shell, password-reset deep links, HealthKit step totals, and
haptic feedback for workout moments. Manual steps remain available when HealthKit is unavailable
or denied, and no permission is requested on launch.

## OWNER device checks

1. On a physical iPhone, open Settings in Qimmah and tap **ربط صحة Apple**; confirm the Arabic
   read-purpose prompt and allow Steps only.
2. Add a step sample in Health, return to Qimmah, refresh, and capture the value in Today’s حركة
   pillar. HealthKit authorization and real Health data cannot be proven by the generic Xcode
   simulator build used in CI; App Review behavior must be confirmed on a signed device archive.
3. Confirm light feedback on a saved set, success feedback on a new PR, and medium feedback when
   rest ends. Disable the toggle and enable Reduce Motion separately; both must suppress feedback.
