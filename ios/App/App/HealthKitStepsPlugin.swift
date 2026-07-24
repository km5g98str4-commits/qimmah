import Capacitor
import HealthKit

@objc(HealthKitStepsPlugin)
public class HealthKitStepsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthKitStepsPlugin"
    public let jsName = "HealthKitSteps"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDailySteps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLatestBodyMass", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLatestHeartRate", returnType: CAPPluginReturnPromise)
    ]

    private let healthStore = HKHealthStore()

    /// Maps a JS metric name to its HealthKit quantity type. Unknown names are ignored
    /// so the web layer never widens permission scope by accident.
    private func quantityType(for metric: String) -> HKQuantityType? {
        switch metric {
        case "steps": return HKObjectType.quantityType(forIdentifier: .stepCount)
        case "weight": return HKObjectType.quantityType(forIdentifier: .bodyMass)
        case "heartRate": return HKObjectType.quantityType(forIdentifier: .heartRate)
        default: return nil
        }
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    /// Point-of-use authorization. The web layer passes the exact metric(s) the visible
    /// screen needs, so we never request read scope the user hasn't been shown a benefit for.
    /// Defaults to steps for backward compatibility with the original bridge.
    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["permission": "unavailable"])
            return
        }
        let metrics = call.getArray("metrics", String.self) ?? ["steps"]
        let readTypes = Set(metrics.compactMap { quantityType(for: $0) })
        guard !readTypes.isEmpty else {
            call.resolve(["permission": "unavailable"])
            return
        }
        healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
            DispatchQueue.main.async {
                if success && error == nil {
                    call.resolve(["permission": "authorized"])
                } else {
                    call.resolve(["permission": "denied"])
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
                DispatchQueue.main.async { call.resolve(["permission": "denied", "days": []]) }
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

    /// Shared "most recent single sample" reader for point-value metrics (weight, heart rate).
    private func fetchLatest(quantityType: HKQuantityType, unit: HKUnit, valueKey: String, call: CAPPluginCall, notEarlierThan: Date? = nil) {
        var predicate: NSPredicate?
        if let since = notEarlierThan {
            predicate = HKQuery.predicateForSamples(withStart: since, end: Date(), options: .strictEndDate)
        }
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: quantityType, predicate: predicate, limit: 1, sortDescriptors: [sort]) { _, samples, error in
            if error != nil {
                DispatchQueue.main.async { call.resolve(["permission": "denied", "sample": NSNull()]) }
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
