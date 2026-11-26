import Foundation

public struct Greeting: Codable, Sendable, Equatable {
    public let greeting: String
}

public enum APIError: Error {
    case invalidResponse
    case httpStatus(Int)
}

public struct APIClient: Sendable {
    public let baseURL: URL
    private let session: URLSession

    public init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    public func greetingRequest(text: String) throws -> URLRequest {
        var request = URLRequest(url: baseURL.appendingPathComponent("api/rpc/post/hello"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONEncoder().encode(["text": text])
        return request
    }

    public func hello(text: String) async throws -> Greeting {
        let (data, response) = try await session.data(for: greetingRequest(text: text))
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else { throw APIError.httpStatus(http.statusCode) }
        return try JSONDecoder().decode(Greeting.self, from: data)
    }
}
