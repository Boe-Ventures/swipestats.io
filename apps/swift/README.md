# Draupnir Swift

SwiftUI starter for macOS and iOS, with a shared Swift Package and a small URLSession client for Draupnir's public OpenAPI greeting operation. The client is native Swift; it does not consume TypeScript types or oRPC's JavaScript wire protocol. Request/response models currently match the example endpoint manually. Backend auth, credential storage and generated clients are future work.

## macOS

```sh
bun run build:swift
bun run test:swift
bun run dev:swift
```

Or run `swift build`, `swift test` and `swift run DraupnirMac` in this folder. Bun only forwards these commands; SwiftPM manages native dependencies. Full Xcode with a Swift 6-compatible toolchain is required for SwiftUI and XCTest. Command Line Tools alone may lack SwiftUI macro plugins. To check only the Foundation client, use `swift build --target DraupnirKit`. The SwiftPM executable is a development shell; application packaging/signing is a separate step.

## iOS

Install full Xcode and XcodeGen, then run `xcodegen generate` here and open `DraupnirSwift.xcodeproj`. Choose the DraupnirIOS scheme and an iOS simulator. The target imports the same DraupnirUI package. Signing/team selection is left to the developer. XcodeGen creates the local-development Info.plist from `project.yml`.

The example defaults to a local backend; a physical device needs a reachable server URL. Use HTTPS for hosted deployments. No live backend calls occur during the tests.

Native commands are opt-in and excluded from the default Linux TypeScript build/check pipeline. Native CI and signed release builds are not configured yet.
