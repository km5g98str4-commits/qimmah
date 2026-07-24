import AVFoundation
import Capacitor
import UIKit

/// Native barcode scanner built directly on AVFoundation's `AVCaptureMetadataOutput`
/// (first-party, zero external dependencies — chosen because this project's iOS build is
/// SPM-managed and `@capacitor-mlkit/barcode-scanning` ships CocoaPods-only; see
/// docs/data/NATIVE-BARCODE.md). Decoding happens entirely inside the OS: no camera frame
/// ever reaches JS or the network — JS receives only the decoded string and format.
///
/// Supported symbologies: EAN-13, EAN-8, UPC-E. UPC-A is delivered by iOS as EAN-13 with a
/// leading zero (documented AVFoundation behavior) — the JS layer treats it as ean_13.
@objc(BarcodeScanPlugin)
public class BarcodeScanPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BarcodeScanPlugin"
    public let jsName = "BarcodeScan"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scanOnce", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setTorch", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelScan", returnType: CAPPluginReturnPromise)
    ]

    private weak var activeScanner: BarcodeScanViewController?

    @objc func isSupported(_ call: CAPPluginCall) {
        let hasCamera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) != nil
        call.resolve(["supported": hasCamera])
    }

    /// Presents a full-screen native scanning view and resolves once with either the first
    /// decoded barcode or a terminal status (`cancelled` / `permission-denied` / `no-camera` / `error`).
    @objc func scanOnce(_ call: CAPPluginCall) {
        guard activeScanner == nil else {
            call.reject("scan-already-active")
            return
        }
        let cancelLabel = call.getString("cancel") ?? "Cancel"
        let torchLabel = call.getString("torch") ?? "Torch"
        let hintLabel = call.getString("hint") ?? ""

        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
            DispatchQueue.main.async {
                guard let self = self else { return }
                guard granted else {
                    call.resolve(["hit": NSNull(), "status": "permission-denied"])
                    return
                }
                let scanner = BarcodeScanViewController(
                    cancelLabel: cancelLabel,
                    torchLabel: torchLabel,
                    hintLabel: hintLabel
                )
                scanner.onFinish = { [weak self] outcome in
                    self?.activeScanner = nil
                    switch outcome {
                    case let .detected(value, format, width, height):
                        call.resolve([
                            "hit": ["value": value, "format": format],
                            "status": "detected",
                            "resolution": ["width": width, "height": height]
                        ])
                    case .cancelled:
                        call.resolve(["hit": NSNull(), "status": "cancelled"])
                    case .noCamera:
                        call.resolve(["hit": NSNull(), "status": "no-camera"])
                    case let .failed(message):
                        call.resolve(["hit": NSNull(), "status": "error", "message": message])
                    }
                }
                scanner.modalPresentationStyle = .fullScreen
                self.activeScanner = scanner
                guard let host = self.bridge?.viewController else {
                    call.resolve(["hit": NSNull(), "status": "error", "message": "no-view-controller"])
                    return
                }
                host.present(scanner, animated: true)
            }
        }
    }

    /// Torch passthrough for the active scan session. Resolves the applied state honestly:
    /// `on: false` when there is no active scan or the device torch is unavailable.
    @objc func setTorch(_ call: CAPPluginCall) {
        let on = call.getBool("on") ?? false
        DispatchQueue.main.async { [weak self] in
            let applied = self?.activeScanner?.setTorch(on) ?? false
            call.resolve(["on": applied && on])
        }
    }

    @objc func cancelScan(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.activeScanner?.cancel()
            call.resolve()
        }
    }
}

/// Full-screen camera preview with a centered region-of-interest reticle, cancel and torch
/// buttons (labels injected from the bilingual JS dictionary — no hardcoded copy).
final class BarcodeScanViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    enum Outcome {
        case detected(value: String, format: String, width: Int, height: Int)
        case cancelled
        case noCamera
        case failed(String)
    }

    var onFinish: ((Outcome) -> Void)?

    private let cancelLabel: String
    private let torchLabel: String
    private let hintLabel: String

    private let session = AVCaptureSession()
    private let sessionQueue = DispatchQueue(label: "com.qimmah.barcode.session")
    private let metadataOutput = AVCaptureMetadataOutput()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var device: AVCaptureDevice?
    private var finished = false
    private var sessionObserver: NSObjectProtocol?

    private let reticleView = UIView()
    private let torchButton = UIButton(type: .system)

    /// Fraction of the screen occupied by the scan region of interest (width x height, centered).
    private let roiWidthFraction: CGFloat = 0.86
    private let roiHeightFraction: CGFloat = 0.32

    init(cancelLabel: String, torchLabel: String, hintLabel: String) {
        self.cancelLabel = cancelLabel
        self.torchLabel = torchLabel
        self.hintLabel = hintLabel
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not supported")
    }

    deinit {
        if let observer = sessionObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        configureSession()
        configureOverlay()
    }

    private func configureSession() {
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: camera) else {
            finish(.noCamera)
            return
        }
        device = camera

        session.beginConfiguration()
        if session.canSetSessionPreset(.hd1920x1080) {
            session.sessionPreset = .hd1920x1080
        } else {
            session.sessionPreset = .high
        }
        guard session.canAddInput(input) else {
            session.commitConfiguration()
            finish(.failed("cannot-add-input"))
            return
        }
        session.addInput(input)
        guard session.canAddOutput(metadataOutput) else {
            session.commitConfiguration()
            finish(.failed("cannot-add-output"))
            return
        }
        session.addOutput(metadataOutput)
        metadataOutput.setMetadataObjectsDelegate(self, queue: .main)
        // Retail symbologies only — quicker, fewer false positives. UPC-A arrives as .ean13.
        let wanted: [AVMetadataObject.ObjectType] = [.ean13, .ean8, .upce]
        metadataOutput.metadataObjectTypes = wanted.filter { metadataOutput.availableMetadataObjectTypes.contains($0) }
        session.commitConfiguration()

        // Barcode-friendly focus: continuous autofocus restricted to near range when supported.
        do {
            try camera.lockForConfiguration()
            if camera.isFocusModeSupported(.continuousAutoFocus) {
                camera.focusMode = .continuousAutoFocus
            }
            if camera.isAutoFocusRangeRestrictionSupported {
                camera.autoFocusRangeRestriction = .near
            }
            camera.unlockForConfiguration()
        } catch {
            // Focus tuning is best-effort; scanning continues with defaults.
        }

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        preview.frame = view.bounds
        view.layer.insertSublayer(preview, at: 0)
        previewLayer = preview

        // rectOfInterest must be set after the session is running and the layer laid out.
        sessionObserver = NotificationCenter.default.addObserver(
            forName: .AVCaptureSessionDidStartRunning,
            object: session,
            queue: .main
        ) { [weak self] _ in
            self?.applyRectOfInterest()
        }

        sessionQueue.async { [weak self] in
            self?.session.startRunning()
        }
    }

    private func configureOverlay() {
        // Dimmed surround + clear centered reticle matching the metadata region of interest.
        reticleView.backgroundColor = .clear
        reticleView.layer.borderColor = UIColor(red: 0.07, green: 0.65, blue: 0.58, alpha: 1).cgColor
        reticleView.layer.borderWidth = 2
        reticleView.layer.cornerRadius = 16
        reticleView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(reticleView)

        let cancelButton = UIButton(type: .system)
        cancelButton.setTitle(cancelLabel, for: .normal)
        cancelButton.setTitleColor(.white, for: .normal)
        cancelButton.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
        cancelButton.backgroundColor = UIColor.black.withAlphaComponent(0.5)
        cancelButton.layer.cornerRadius = 22
        cancelButton.contentEdgeInsets = UIEdgeInsets(top: 10, left: 20, bottom: 10, right: 20)
        cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        cancelButton.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(cancelButton)

        torchButton.setTitle(torchLabel, for: .normal)
        torchButton.setTitleColor(.white, for: .normal)
        torchButton.titleLabel?.font = .systemFont(ofSize: 15, weight: .medium)
        torchButton.backgroundColor = UIColor.black.withAlphaComponent(0.5)
        torchButton.layer.cornerRadius = 22
        torchButton.contentEdgeInsets = UIEdgeInsets(top: 10, left: 20, bottom: 10, right: 20)
        torchButton.addTarget(self, action: #selector(torchTapped), for: .touchUpInside)
        torchButton.translatesAutoresizingMaskIntoConstraints = false
        torchButton.isHidden = !(device?.hasTorch ?? false)
        view.addSubview(torchButton)

        let hint = UILabel()
        hint.text = hintLabel
        hint.textColor = .white
        hint.font = .systemFont(ofSize: 14)
        hint.textAlignment = .center
        hint.numberOfLines = 0
        hint.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(hint)

        let guide = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            reticleView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            reticleView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            reticleView.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: roiWidthFraction),
            reticleView.heightAnchor.constraint(equalTo: view.heightAnchor, multiplier: roiHeightFraction),

            cancelButton.topAnchor.constraint(equalTo: guide.topAnchor, constant: 12),
            cancelButton.leadingAnchor.constraint(equalTo: guide.leadingAnchor, constant: 16),
            cancelButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 44),

            torchButton.bottomAnchor.constraint(equalTo: guide.bottomAnchor, constant: -24),
            torchButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            torchButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 44),

            hint.bottomAnchor.constraint(equalTo: torchButton.topAnchor, constant: -16),
            hint.leadingAnchor.constraint(equalTo: guide.leadingAnchor, constant: 24),
            hint.trailingAnchor.constraint(equalTo: guide.trailingAnchor, constant: -24)
        ])
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
        applyRectOfInterest()
    }

    /// Restricts metadata detection to the visible reticle — faster and fewer stray reads.
    private func applyRectOfInterest() {
        guard session.isRunning, let preview = previewLayer, view.bounds.width > 0 else { return }
        let roi = CGRect(
            x: view.bounds.midX - view.bounds.width * roiWidthFraction / 2,
            y: view.bounds.midY - view.bounds.height * roiHeightFraction / 2,
            width: view.bounds.width * roiWidthFraction,
            height: view.bounds.height * roiHeightFraction
        )
        metadataOutput.rectOfInterest = preview.metadataOutputRectConverted(fromLayerRect: roi)
    }

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard !finished else { return }
        for object in metadataObjects {
            guard let readable = object as? AVMetadataMachineReadableCodeObject,
                  let value = readable.stringValue, !value.isEmpty else { continue }
            let format: String
            switch readable.type {
            case .ean13: format = "ean_13"
            case .ean8: format = "ean_8"
            case .upce: format = "upc_e"
            default: continue
            }
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            var width = 0
            var height = 0
            if let activeFormat = device?.activeFormat {
                let dims = CMVideoFormatDescriptionGetDimensions(activeFormat.formatDescription)
                width = Int(dims.width)
                height = Int(dims.height)
            }
            finish(.detected(value: value, format: format, width: width, height: height))
            return
        }
    }

    /// Applies torch state; returns whether it was actually applied (honest capability report).
    func setTorch(_ on: Bool) -> Bool {
        guard let camera = device, camera.hasTorch, camera.isTorchAvailable else { return false }
        do {
            try camera.lockForConfiguration()
            camera.torchMode = on ? .on : .off
            camera.unlockForConfiguration()
            return true
        } catch {
            return false
        }
    }

    func cancel() {
        finish(.cancelled)
    }

    @objc private func cancelTapped() {
        finish(.cancelled)
    }

    @objc private func torchTapped() {
        let isOn = device?.torchMode == .on
        _ = setTorch(!isOn)
    }

    private func finish(_ outcome: Outcome) {
        guard !finished else { return }
        finished = true
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            if self.session.isRunning {
                self.session.stopRunning()
            }
        }
        if presentingViewController != nil {
            dismiss(animated: true) { [weak self] in
                self?.onFinish?(outcome)
            }
        } else {
            onFinish?(outcome)
        }
    }
}
