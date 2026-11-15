import HealthKit
import SwiftUI
import UIKit

@main
struct SOLZeroPhoneApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    init() {
        // Doit être actif dès le lancement : la montre peut réveiller l'iPhone en arrière-plan
        PhoneRelay.shared.start()
    }

    var body: some Scene {
        WindowGroup {
            PhoneHomeView()
                .preferredColorScheme(.dark)
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    private let healthStore = HKHealthStore()

    /// La montre peut demander l'autorisation Santé à afficher sur l'iPhone
    func applicationShouldRequestHealthAuthorization(_ application: UIApplication) {
        healthStore.handleAuthorizationForExtension { _, _ in }
    }
}
