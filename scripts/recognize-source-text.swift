import Foundation
import Vision
import AppKit
for filename in CommandLine.arguments.dropFirst() {
 let url = URL(fileURLWithPath: filename)
 let request = VNRecognizeTextRequest()
 request.recognitionLevel = .accurate
 request.recognitionLanguages = ["en-US"]
 request.usesLanguageCorrection = false
 try VNImageRequestHandler(url: url).perform([request])
 let rows = (request.results ?? []).compactMap { observation -> [String: Any]? in
  guard let text = observation.topCandidates(1).first?.string else { return nil }
  return ["text": text, "x": observation.boundingBox.minX, "y": observation.boundingBox.minY, "height": observation.boundingBox.height]
 }
 let data = try JSONSerialization.data(withJSONObject: rows, options: [.prettyPrinted,.sortedKeys])
 try data.write(to: url.deletingPathExtension().appendingPathExtension("vision.json"))
 print(url.lastPathComponent)
}
