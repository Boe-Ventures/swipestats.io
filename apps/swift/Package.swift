// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "DraupnirSwift",
    platforms: [.macOS(.v14), .iOS(.v17)],
    products: [
        .library(name: "DraupnirKit", targets: ["DraupnirKit"]),
        .library(name: "DraupnirUI", targets: ["DraupnirUI"]),
        .executable(name: "DraupnirMac", targets: ["DraupnirMac"])
    ],
    targets: [
        .target(name: "DraupnirKit"),
        .target(name: "DraupnirUI", dependencies: ["DraupnirKit"]),
        .executableTarget(name: "DraupnirMac", dependencies: ["DraupnirUI"]),
        .testTarget(name: "DraupnirKitTests", dependencies: ["DraupnirKit"])
    ]
)
