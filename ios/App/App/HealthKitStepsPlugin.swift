import Capacitor
import HealthKit

@objc(HealthKitStepsPlugin)
public class HealthKitStepsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthKitStepsPlugin"
    public let jsName = "HealthKitSteps"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDailySteps", returnType: CAPPluginReturnPromise)
    ]

    private let healthStore = HKHealthStore()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) else {
            call.resolve(["permission": "unavailable"])
            return
        }
        healthStore.requestAuthorization(toShare: [], read: [stepType]) { success, error in
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
}

final class QimmahBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(HealthKitStepsPlugin())
    }
}
