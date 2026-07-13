# Staged metadata only. Do not submit this cask until the signed 0.2.0 DMG
# exists and PENDING_SIGNED_ARTIFACT_SHA256 is replaced with verified evidence.
cask "robotics-studio-open" do
  version "0.2.0"
  sha256 "PENDING_SIGNED_ARTIFACT_SHA256"

  url "https://github.com/auraoneai/robotics-studio-open/releases/download/v#{version}/Robotics.Studio.Open_#{version}_aarch64.dmg",
      verified: "github.com/auraoneai/robotics-studio-open/"
  name "Robotics Studio Open"
  desc "Local-first robotics dataset review IDE"
  homepage "https://auraone.ai/open/robotics-studio"
  depends_on arch: :arm64

  app "Robotics Studio Open.app"
  binary "#{appdir}/Robotics Studio Open.app/Contents/MacOS/robotics-studio-open", target: "robostudio"

  zap trash: [
    "~/Library/Application Support/ai.auraone.roboticsstudio",
    "~/Library/Preferences/ai.auraone.roboticsstudio.plist",
    "~/Library/Saved Application State/ai.auraone.roboticsstudio.savedState"
  ]
end
