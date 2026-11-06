import Foundation
import Vision
import PDFKit
import AppKit

func tesseractRows(_ image: URL, width: Int, height: Int) throws -> [[String: Any]] {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
    process.arguments = ["tesseract", image.path, "stdout", "-l", "eng", "--psm", "3", "tsv"]
    let output = Pipe(); process.standardOutput = output; process.standardError = FileHandle.standardError
    try process.run()
    let data = output.fileHandleForReading.readDataToEndOfFile(); process.waitUntilExit()
    guard process.terminationStatus == 0, let tsv = String(data: data, encoding: .utf8) else { throw NSError(domain: "LocalOCRFallback", code: 1) }
    var groups: [String: [[String]]] = [:]
    for line in tsv.components(separatedBy: .newlines).dropFirst() {
        let columns = line.components(separatedBy: "\t")
        if columns.count >= 12 && columns[0] == "5" && !columns[11].trimmingCharacters(in: .whitespaces).isEmpty {
            groups[columns[1...4].joined(separator: ":"), default: []].append(columns)
        }
    }
    return groups.values.map { words in
        let left = words.map { Double($0[6]) ?? 0 }.min() ?? 0
        let top = words.map { Double($0[7]) ?? 0 }.min() ?? 0
        let right = words.map { (Double($0[6]) ?? 0) + (Double($0[8]) ?? 0) }.max() ?? 0
        let bottom = words.map { (Double($0[7]) ?? 0) + (Double($0[9]) ?? 0) }.max() ?? 0
        return ["text": words.map { $0[11] }.joined(separator: " "), "confidence": words.map { max(0, Double($0[10]) ?? 0) / 100 }.reduce(0, +) / Double(words.count), "x": left / Double(width), "y": 1 - bottom / Double(height), "width": (right-left) / Double(width), "height": (bottom-top) / Double(height)]
    }
}

// One process per source PDF; completed pages survive an interrupted batch.
let arguments = CommandLine.arguments
guard arguments.count >= 3, let document = PDFDocument(url: URL(fileURLWithPath: arguments[1])) else {
    fputs("Usage: recognize-usmle-pdf source.pdf cache-directory [last-page]\n", stderr)
    exit(1)
}
let output = URL(fileURLWithPath: arguments[2], isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
let last = min(document.pageCount, arguments.count > 3 ? Int(arguments[3]) ?? document.pageCount : document.pageCount)
for number in 1...last {
    try autoreleasepool {
        let stem = String(format: "page-%04d", number)
        let textURL = output.appendingPathComponent(stem + ".json")
        let imageURL = output.appendingPathComponent(stem + ".jpg")
        if FileManager.default.fileExists(atPath: textURL.path), FileManager.default.fileExists(atPath: imageURL.path) { return }
        guard let page = document.page(at: number - 1) else { throw NSError(domain: "MissingPDFPage", code: number) }
        let bounds = page.bounds(for: .mediaBox)
        let scale = 1600 / max(bounds.width, bounds.height)
        let image = page.thumbnail(of: NSSize(width: bounds.width * scale, height: bounds.height * scale), for: .mediaBox)
        guard let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { throw NSError(domain: "PDFRender", code: number) }
        let bitmap = NSBitmapImageRep(cgImage: cg)
        guard let jpeg = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.84]) else { throw NSError(domain: "JPEGRender", code: number) }
        try jpeg.write(to: imageURL, options: .atomic)
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["en-US"]
        request.usesLanguageCorrection = false
        var fallback: [[String: Any]]? = nil
        do { try VNImageRequestHandler(cgImage: cg).perform([request]) }
        catch {
            // Some macOS accelerator workloads fail transiently. Retain the
            // same local accurate recogniser and retry this page on the CPU.
            request.usesCPUOnly = true
            do { try VNImageRequestHandler(cgImage: cg).perform([request]) }
            catch { fallback = try tesseractRows(imageURL, width: cg.width, height: cg.height) }
        }
        let rows = fallback ?? (request.results ?? []).compactMap { observation -> [String: Any]? in
            guard let candidate = observation.topCandidates(1).first else { return nil }
            let rect = observation.boundingBox
            return ["text": candidate.string, "confidence": candidate.confidence, "x": rect.minX, "y": rect.minY, "width": rect.width, "height": rect.height]
        }
        let data = try JSONSerialization.data(withJSONObject: ["page": number, "pageCount": document.pageCount, "width": cg.width, "height": cg.height, "rows": rows], options: [.sortedKeys])
        try data.write(to: textURL, options: .atomic)
        if number % 10 == 0 || number == last { print("\(URL(fileURLWithPath: arguments[1]).lastPathComponent): \(number)/\(document.pageCount)"); fflush(stdout) }
    }
}
