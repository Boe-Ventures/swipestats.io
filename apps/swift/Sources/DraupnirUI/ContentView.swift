import SwiftUI
import DraupnirKit

public struct ContentView: View {
    @State private var name = "Draupnir"
    @State private var server = "http://localhost:3000"
    @State private var message = "Connect to your running Draupnir backend."
    @State private var loading = false

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Draupnir Swift").font(.largeTitle.bold())
            Text("Native SwiftUI for iOS and macOS")
            TextField("Server URL", text: $server).textFieldStyle(.roundedBorder)
            TextField("Name", text: $name).textFieldStyle(.roundedBorder)
            Button(loading ? "Connecting…" : "Call public greeting API") {
                Task { await greet() }
            }.disabled(loading)
            Text(message).accessibilityLabel("API status: " + message)
        }.padding(24)
    }

    @MainActor private func greet() async {
        guard let url = URL(string: server),
              let scheme = url.scheme, ["http", "https"].contains(scheme), url.host != nil else {
            message = "Enter a valid HTTP or HTTPS server URL."
            return
        }
        loading = true
        defer { loading = false }
        do { message = try await APIClient(baseURL: url).hello(text: name).greeting }
        catch { message = "Could not connect: " + error.localizedDescription }
    }
}
