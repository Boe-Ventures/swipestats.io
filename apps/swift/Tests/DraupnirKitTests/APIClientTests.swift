import Foundation
import XCTest
@testable import DraupnirKit

final class APIClientTests: XCTestCase {
    func testGreetingRequestMatchesPublicOpenAPIOperation() throws {
        let client = APIClient(baseURL: try XCTUnwrap(URL(string: "https://example.com")))
        let request = try client.greetingRequest(text: "Swift")
        XCTAssertEqual(request.url?.absoluteString, "https://example.com/api/rpc/post/hello")
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
        let body = try JSONDecoder().decode([String: String].self, from: XCTUnwrap(request.httpBody))
        XCTAssertEqual(body, ["text": "Swift"])
    }

    func testGreetingDecodesBackendResponse() throws {
        let data = Data(#"{"greeting":"Hello Swift"}"#.utf8)
        XCTAssertEqual(try JSONDecoder().decode(Greeting.self, from: data).greeting, "Hello Swift")
    }
}
