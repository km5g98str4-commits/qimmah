import Capacitor
import HealthKit

@objc(HealthKitStepsPlugin)
public class HealthKitStepsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthKitStepsPlugin"
    public let jsName = "HealthKitSteps"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "supportedMetrics", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDailySteps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLatestBodyMass", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLatestHeartRate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getQuantitySamples", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSleepSamples", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWorkouts", returnType: CAPPluginReturnPromise)
    ]

    private let healthStore = HKHealthStore()

    /// Every metric id the wide health layer may request. READ-ONLY: Qimmah currently
    /// creates no HealthKit data, so the write (`toShare`) set is intentionally EMPTY —
    /// see docs/data/HEALTHKIT-FOUNDATION.md before ever adding a write type.
    static let allMetricIds: [String] = [
        // Body measurements
        "height", "bodyMass", "bodyFatPercentage", "leanBodyMass",
        // Activity
        "steps", "distanceWalkingRunning", "flightsClimbed",
        "activeEnergyBurned", "basalEnergyBurned",
        "appleExerciseTime", "appleStandTime", "workouts",
        // Heart
        "heartRate", "restingHeartRate", "walkingHeartRateAverage",
        "heartRateVariabilitySDNN", "vo2Max", "heartRateRecoveryOneMinute",
        // Sleep
        "sleepAnalysis",
        // Vitals
        "respiratoryRate", "oxygenSaturation", "appleSleepingWristTemperature",
        // Nutrition (read what other apps logged; Qimmah never writes)
        "dietaryWater", "dietaryEnergyConsumed", "dietaryProtein",
        "dietaryCarbohydrates", "dietaryFatTotal"
    ]

    /// Maps a JS metric name to its HealthKit quantity type + the unit samples are
    /// returned in (SI / conventional base units, matching src/lib/health/metrics.ts).
    /// Unknown names and OS-unavailable types are ignored so the web layer never
    /// widens permission scope by accident. `weight` stays as a legacy alias of bodyMass.
    private func quantitySpec(for metric: String) -> (type: HKQuantityType, unit: HKUnit, unitLabel: String)? {
        func spec(_ id: HKQuantityTypeIdentifier, _ unit: HKUnit, _ label: String) -> (HKQuantityType, HKUnit, String)? {
            guard let type = HKObjectType.quantityType(forIdentifier: id) else { return nil }
            return (type, unit, label)
        }
        let bpm = HKUnit.count().unitDivided(by: HKUnit.minute())
        switch metric {
        case "steps": return spec(.stepCount, HKUnit.count(), "count")
        case "weight", "bodyMass": return spec(.bodyMass, HKUnit.gramUnit(with: .kilo), "kg")
        case "height": return spec(.height, HKUnit.meter(), "m")
        case "bodyFatPercentage": return spec(.bodyFatPercentage, HKUnit.percent(), "fraction")
        case "leanBodyMass": return spec(.leanBodyMass, HKUnit.gramUnit(with: .kilo), "kg")
        case "distanceWalkingRunning": return spec(.distanceWalkingRunning, HKUnit.meter(), "m")
        case "flightsClimbed": return spec(.flightsClimbed, HKUnit.count(), "count")
        case "activeEnergyBurned": return spec(.activeEnergyBurned, HKUnit.kilocalorie(), "kcal")
        case "basalEnergyBurned": return spec(.basalEnergyBurned, HKUnit.kilocalorie(), "kcal")
        case "appleExerciseTime": return spec(.appleExerciseTime, HKUnit.minute(), "min")
        case "appleStandTime": return spec(.appleStandTime, HKUnit.minute(), "min")
        case "heartRate": return spec(.heartRate, bpm, "bpm")
        case "restingHeartRate": return spec(.restingHeartRate, bpm, "bpm")
        case "walkingHeartRateAverage": return spec(.walkingHeartRateAverage, bpm, "bpm")
        case "heartRateVariabilitySDNN": return spec(.heartRateVariabilitySDNN, HKUnit.secondUnit(with: .milli), "ms")
        case "vo2Max":
            let vo2 = HKUnit.literUnit(with: .milli)
                .unitDivided(by: HKUnit.gramUnit(with: .kilo).unitMultiplied(by: HKUnit.minute()))
            return spec(.vo2Max, vo2, "ml/kg/min")
        case "respiratoryRate": return spec(.respiratoryRate, bpm, "breaths/min")
        case "oxygenSaturation": return spec(.oxygenSaturation, HKUnit.percent(), "fraction")
        case "dietaryWater": return spec(.dietaryWater, HKUnit.literUnit(with: .milli), "mL")
        case "dietaryEnergyConsumed": return spec(.dietaryEnergyConsumed, HKUnit.kilocalorie(), "kcal")
        case "dietaryProtein": return spec(.dietaryProtein, HKUnit.gram(), "g")
        case "dietaryCarbohydrates": return spec(.dietaryCarbohydrates, HKUnit.gram(), "g")
        case "dietaryFatTotal": return spec(.dietaryFatTotal, HKUnit.gram(), "g")
        case "heartRateRecoveryOneMinute":
            // Availability-guarded: HK type exists from iOS 16.
            if #available(iOS 16.0, *) { return spec(.heartRateRecoveryOneMinute, bpm, "bpm") }
            return nil
        case "appleSleepingWristTemperature":
            // Availability-guarded: HK type exists from iOS 16.
            if #available(iOS 16.0, *) { return spec(.appleSleepingWristTemperature, HKUnit.degreeCelsius(), "degC") }
            return nil
        default: return nil
        }
    }

    /// Read type for authorization (covers quantity, category (sleep) and workouts).
    private func readType(for metric: String) -> HKObjectType? {
        switch metric {
        case "sleepAnalysis": return HKObjectType.categoryType(forIdentifier: .sleepAnalysis)
        case "workouts": return HKObjectType.workoutType()
        default: return quantitySpec(for: metric)?.type
        }
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    /// Which of the known metric ids resolve to a HealthKit type on THIS device/OS.
    /// Lets the web layer availability-guard iOS-16-only types (wrist temperature, HRR).
    @objc func supportedMetrics(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["available": false, "metrics": []])
            return
        }
        let supported = Self.allMetricIds.filter { readType(for: $0) != nil }
        call.resolve(["available": true, "metrics": supported])
    }

    /// Authorization request. The web layer passes the metric(s) the visible screen has
    /// explained; the owner-approved all-upfront flow passes ALL metrics in ONE call so
    /// iOS shows a single aggregated Health sheet after the benefit screen.
    /// Defaults to steps for backward compatibility with the original bridge.
    ///
    /// HONESTY NOTE (tightened in P14): for READ types iOS never reveals what the user
    /// granted — `requestAuthorization` succeeds even when the user denies every type.
    /// So `authorized` here means ONLY "the request flow completed", and a failure
    /// resolves `"unknown"` (the flow could not run) — **never `"denied"`**, because this
    /// bridge has no way to learn a read denial. Per-metric truth is only
    /// "data" vs "no data (unknown-or-denied)".
    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["permission": "unavailable"])
            return
        }
        let metrics = call.getArray("metrics", String.self) ?? ["steps"]
        let readTypes = Set(metrics.compactMap { readType(for: $0) })
        guard !readTypes.isEmpty else {
            call.resolve(["permission": "unavailable"])
            return
        }
        // WRITE SET IS EMPTY BY DESIGN: Qimmah reads only. Do not add share types here
        // unless Qimmah itself creates that data (currently: none).
        healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
            DispatchQueue.main.async {
                if success && error == nil {
                    call.resolve(["permission": "authorized"])
                } else {
                    // The REQUEST failed to run (no entitlement, HealthKit off, OS error).
                    // This is not a user denial — iOS never tells us that for read types.
                    call.resolve(["permission": "unknown"])
                }
            }
        }
    }

    @objc func getDailySteps(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) else {
            call.resolve(["permission": "unavailable", "days": []])
            return
        }

        let requestedDays = min(max(call.getInt("days") ?? 14, 1), 14)
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        guard let start = calendar.date(byAdding: .day, value: -(requestedDays - 1), to: today),
              let end = calendar.date(byAdding: .day, value: 1, to: today) else {
            call.reject("Unable to create HealthKit date range")
            return
        }

        var interval = DateComponents()
        interval.day = 1
        let query = HKStatisticsCollectionQuery(
            quantityType: stepType,
            quantitySamplePredicate: HKQuery.predicateForSamples(withStart: start, end: end),
            options: .cumulativeSum,
            anchorDate: today,
            intervalComponents: interval
        )
        query.initialResultsHandler = { _, results, error in
            if error != nil {
                // A failed read query is NOT a denial (HealthKit hides read denial by
                // returning empty results, not by erroring) — resolve "unknown".
                DispatchQueue.main.async { call.resolve(["permission": "unknown", "days": []]) }
                return
            }
            var output: [[String: Any]] = []
            let formatter = DateFormatter()
            formatter.calendar = calendar
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.dateFormat = "yyyy-MM-dd"
            results?.enumerateStatistics(from: start, to: end) { statistics, _ in
                let steps = statistics.sumQuantity()?.doubleValue(for: HKUnit.count()) ?? 0
                output.append(["date": formatter.string(from: statistics.startDate), "steps": Int(steps.rounded())])
            }
            DispatchQueue.main.async { call.resolve(["permission": "authorized", "days": output]) }
        }
        healthStore.execute(query)
    }

    /// Latest recorded body mass. Resolves `sample: null` when nothing is stored, so the web
    /// layer keeps the manual default instead of inventing a weight.
    @objc func getLatestBodyMass(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let massType = HKObjectType.quantityType(forIdentifier: .bodyMass) else {
            call.resolve(["permission": "unavailable", "sample": NSNull()])
            return
        }
        fetchLatest(quantityType: massType, unit: HKUnit.gramUnit(with: .kilo), valueKey: "kg", call: call)
    }

    /// Latest heart-rate sample from the last 24h. Resolves `sample: null` when no paired
    /// device has written one — the UI then shows "unavailable", never a fabricated number.
    @objc func getLatestHeartRate(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let hrType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
            call.resolve(["permission": "unavailable", "sample": NSNull()])
            return
        }
        let unit = HKUnit.count().unitDivided(by: HKUnit.minute())
        let since = Calendar.current.date(byAdding: .hour, value: -24, to: Date())
        fetchLatest(quantityType: hrType, unit: unit, valueKey: "bpm", call: call, notEarlierThan: since)
    }

    // ── Wide read layer (P9): anchored/paged sample queries ─────────────────
    //
    // HONESTY CONTRACT: read queries NEVER report "denied" — HealthKit hides read
    // denial by returning empty results. Every method below resolves
    //   { status: 'ok' | 'unavailable' | 'error', samples: [...] }
    // and an empty `samples` with status 'ok' means "no data OR denied" — the web
    // layer models it exactly that way and never claims the user denied access.

    private static let iso8601: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private func isoString(_ date: Date) -> String {
        return Self.iso8601.string(from: date)
    }

    /// Clamped limited-history window: default 90 days, max 365, min 1.
    private func historyStart(_ call: CAPPluginCall) -> Date {
        let days = min(max(call.getInt("days") ?? 90, 1), 365)
        return Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
    }

    private func pageLimit(_ call: CAPPluginCall) -> Int {
        return min(max(call.getInt("limit") ?? 500, 1), 1000)
    }

    private func decodeAnchor(_ call: CAPPluginCall) -> HKQueryAnchor? {
        guard let b64 = call.getString("anchor"), let data = Data(base64Encoded: b64) else { return nil }
        return try? NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: data)
    }

    private func encodeAnchor(_ anchor: HKQueryAnchor?) -> String? {
        guard let anchor = anchor,
              let data = try? NSKeyedArchiver.archivedData(withRootObject: anchor, requiringSecureCoding: true)
        else { return nil }
        return data.base64EncodedString()
    }

    private func sourceFields(_ sample: HKSample) -> [String: Any] {
        return [
            "sourceName": sample.sourceRevision.source.name,
            "sourceBundleId": sample.sourceRevision.source.bundleIdentifier
        ]
    }

    /// Anchored + paged quantity-sample reader for every quantity metric in the catalog.
    /// Options: metric (required) · days (default 90, max 365) · limit (default 500,
    /// max 1000) · anchor (base64 from a previous page). Resolves samples with the
    /// HealthKit UUID + source app/device name preserved for dedup + purge-by-source.
    @objc func getQuantitySamples(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["status": "unavailable", "samples": []])
            return
        }
        guard let metric = call.getString("metric"), let spec = quantitySpec(for: metric) else {
            // Unknown metric OR type not available on this OS version (e.g. wrist temp < iOS 16).
            call.resolve(["status": "unavailable", "samples": []])
            return
        }
        let predicate = HKQuery.predicateForSamples(withStart: historyStart(call), end: Date(), options: [])
        let limit = pageLimit(call)
        let query = HKAnchoredObjectQuery(
            type: spec.type,
            predicate: predicate,
            anchor: decodeAnchor(call),
            limit: limit
        ) { [weak self] _, samples, _, newAnchor, error in
            guard let self = self else { return }
            if error != nil {
                // Query failure ≠ denial. Surface an honest transient error.
                DispatchQueue.main.async { call.resolve(["status": "error", "samples": []]) }
                return
            }
            // `hasMore` must reflect how many samples HealthKit RETURNED, not how many
            // survived the cast — otherwise a single non-quantity sample would end paging
            // early and silently truncate history.
            let returned = (samples ?? []).count
            var out: [[String: Any]] = []
            for case let sample as HKQuantitySample in (samples ?? []) {
                var row: [String: Any] = [
                    "uuid": sample.uuid.uuidString,
                    "start": self.isoString(sample.startDate),
                    "end": self.isoString(sample.endDate),
                    "value": sample.quantity.doubleValue(for: spec.unit),
                    "unit": spec.unitLabel
                ]
                row.merge(self.sourceFields(sample)) { a, _ in a }
                out.append(row)
            }
            var payload: [String: Any] = ["status": "ok", "samples": out, "hasMore": returned >= limit]
            if let encoded = self.encodeAnchor(newAnchor) { payload["anchor"] = encoded }
            DispatchQueue.main.async { call.resolve(payload) }
        }
        healthStore.execute(query)
    }

    /// Stable HealthKit raw values for sleep stages (iOS 16 adds core/deep/rem).
    private func sleepStageName(_ rawValue: Int) -> String {
        switch rawValue {
        case 0: return "inBed"
        case 1: return "asleep" // unspecified
        case 2: return "awake"
        case 3: return "core"
        case 4: return "deep"
        case 5: return "rem"
        default: return "unknown"
        }
    }

    /// Sleep analysis with stages. Same anchored/paged contract as getQuantitySamples.
    @objc func getSleepSamples(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            call.resolve(["status": "unavailable", "samples": []])
            return
        }
        let predicate = HKQuery.predicateForSamples(withStart: historyStart(call), end: Date(), options: [])
        let limit = pageLimit(call)
        let query = HKAnchoredObjectQuery(
            type: sleepType,
            predicate: predicate,
            anchor: decodeAnchor(call),
            limit: limit
        ) { [weak self] _, samples, _, newAnchor, error in
            guard let self = self else { return }
            if error != nil {
                DispatchQueue.main.async { call.resolve(["status": "error", "samples": []]) }
                return
            }
            let returned = (samples ?? []).count
            var out: [[String: Any]] = []
            for case let sample as HKCategorySample in (samples ?? []) {
                var row: [String: Any] = [
                    "uuid": sample.uuid.uuidString,
                    "start": self.isoString(sample.startDate),
                    "end": self.isoString(sample.endDate),
                    "stage": self.sleepStageName(sample.value),
                    "durationMin": sample.endDate.timeIntervalSince(sample.startDate) / 60.0
                ]
                row.merge(self.sourceFields(sample)) { a, _ in a }
                out.append(row)
            }
            var payload: [String: Any] = ["status": "ok", "samples": out, "hasMore": returned >= limit]
            if let encoded = self.encodeAnchor(newAnchor) { payload["anchor"] = encoded }
            DispatchQueue.main.async { call.resolve(payload) }
        }
        healthStore.execute(query)
    }

    private func workoutActivityName(_ type: HKWorkoutActivityType) -> String {
        switch type {
        case .traditionalStrengthTraining: return "strengthTraining"
        case .functionalStrengthTraining: return "functionalStrength"
        case .highIntensityIntervalTraining: return "hiit"
        case .coreTraining: return "coreTraining"
        case .crossTraining: return "crossTraining"
        case .running: return "running"
        case .walking: return "walking"
        case .cycling: return "cycling"
        case .swimming: return "swimming"
        case .rowing: return "rowing"
        case .elliptical: return "elliptical"
        case .stairClimbing: return "stairClimbing"
        case .yoga: return "yoga"
        case .pilates: return "pilates"
        case .hiking: return "hiking"
        case .soccer: return "soccer"
        case .basketball: return "basketball"
        case .martialArts: return "martialArts"
        case .boxing: return "boxing"
        case .dance: return "dance"
        default: return "other"
        }
    }

    /// Logged workouts (most recent first). Same window/limit contract; energy and
    /// distance resolve to null when the workout carries none — never fabricated.
    ///
    /// SINGLE PAGE BY DESIGN: this uses `HKSampleQuery` (not anchored), so no `anchor`
    /// is returned and the JS layer does not loop. `hasMore = true` therefore means
    /// "the newest `limit` workouts were returned and older ones were not read" —
    /// with limit 500 over a 90-day window that is not reachable in practice.
    @objc func getWorkouts(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["status": "unavailable", "samples": []])
            return
        }
        let predicate = HKQuery.predicateForSamples(withStart: historyStart(call), end: Date(), options: [])
        let limit = pageLimit(call)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(
            sampleType: HKObjectType.workoutType(),
            predicate: predicate,
            limit: limit,
            sortDescriptors: [sort]
        ) { [weak self] _, samples, error in
            guard let self = self else { return }
            if error != nil {
                DispatchQueue.main.async { call.resolve(["status": "error", "samples": []]) }
                return
            }
            let returned = (samples ?? []).count
            var out: [[String: Any]] = []
            for case let workout as HKWorkout in (samples ?? []) {
                var row: [String: Any] = [
                    "uuid": workout.uuid.uuidString,
                    "start": self.isoString(workout.startDate),
                    "end": self.isoString(workout.endDate),
                    "activity": self.workoutActivityName(workout.workoutActivityType),
                    "rawType": Int(workout.workoutActivityType.rawValue),
                    "durationMin": workout.duration / 60.0
                ]
                if let kcal = workout.totalEnergyBurned?.doubleValue(for: HKUnit.kilocalorie()) {
                    row["kcal"] = kcal
                } else {
                    row["kcal"] = NSNull()
                }
                if let distance = workout.totalDistance?.doubleValue(for: HKUnit.meter()) {
                    row["distanceM"] = distance
                } else {
                    row["distanceM"] = NSNull()
                }
                row.merge(self.sourceFields(workout)) { a, _ in a }
                out.append(row)
            }
            DispatchQueue.main.async {
                call.resolve(["status": "ok", "samples": out, "hasMore": returned >= limit])
            }
        }
        healthStore.execute(query)
    }

    /// Shared "most recent single sample" reader for point-value metrics (weight, heart rate).
    private func fetchLatest(quantityType: HKQuantityType, unit: HKUnit, valueKey: String, call: CAPPluginCall, notEarlierThan: Date? = nil) {
        var predicate: NSPredicate?
        if let since = notEarlierThan {
            predicate = HKQuery.predicateForSamples(withStart: since, end: Date(), options: .strictEndDate)
        }
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: quantityType, predicate: predicate, limit: 1, sortDescriptors: [sort]) { _, samples, error in
            if error != nil {
                // Read-query failure ≠ user denial (see the honesty note above).
                DispatchQueue.main.async { call.resolve(["permission": "unknown", "sample": NSNull()]) }
                return
            }
            guard let sample = samples?.first as? HKQuantitySample else {
                DispatchQueue.main.async { call.resolve(["permission": "authorized", "sample": NSNull()]) }
                return
            }
            let formatter = ISO8601DateFormatter()
            let payload: [String: Any] = [
                valueKey: sample.quantity.doubleValue(for: unit),
                "date": formatter.string(from: sample.endDate)
            ]
            DispatchQueue.main.async { call.resolve(["permission": "authorized", "sample": payload]) }
        }
        healthStore.execute(query)
    }
}

final class QimmahBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(HealthKitStepsPlugin())
        bridge?.registerPluginInstance(BarcodeScanPlugin())
    }
}
