import AppKit

let colors: [(String, NSColor)] = [
  ("Red", NSColor(srgbRed: 1, green: 0, blue: 0, alpha: 1)),
  ("Orange", NSColor(srgbRed: 1, green: 0.498, blue: 0, alpha: 1)),
  ("Yellow", NSColor(srgbRed: 1, green: 0.843, blue: 0, alpha: 1)),
  ("Green", NSColor(srgbRed: 0, green: 0.667, blue: 0, alpha: 1)),
  ("Blue", NSColor(srgbRed: 0, green: 0.4, blue: 1, alpha: 1)),
  ("Violet", NSColor(srgbRed: 0.545, green: 0, blue: 1, alpha: 1))
]

let list = NSColorList(name: "Sample")
for (name, color) in colors {
  list.setColor(color, forKey: name)
}

let output = CommandLine.arguments[1]
try list.write(to: URL(fileURLWithPath: output))
