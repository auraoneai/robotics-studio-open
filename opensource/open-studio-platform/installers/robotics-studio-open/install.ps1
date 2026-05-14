param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$Repo = "auraoneai/robotics-studio-open"
$Binary = "robostudio.exe"
$DisplayName = "Robotics Studio Open"

if (-not [Environment]::Is64BitOperatingSystem) {
  throw "$DisplayName supports Windows x64 at GA."
}

if ($DryRun) {
  Write-Output "flagship=robotics-studio-open"
  Write-Output "platform=windows"
  Write-Output "arch=x64"
  Write-Output "artifact=Robotics-Studio-Open_<version>_x64_en-US.msi"
  Write-Output "install_path=$env:LOCALAPPDATA\Programs\Robotics Studio Open\$Binary"
  Write-Output "repo=$Repo"
  exit 0
}

$Latest = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
$Version = $Latest.tag_name.TrimStart("v")
$Asset = "Robotics-Studio-Open_${Version}_x64_en-US.msi"
$BaseUrl = "https://github.com/$Repo/releases/download/$($Latest.tag_name)"
$Temp = New-Item -ItemType Directory -Path ([System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), [System.Guid]::NewGuid().ToString()))
$Msi = Join-Path $Temp.FullName $Asset
$Sha = Join-Path $Temp.FullName "SHA256SUMS"

Invoke-WebRequest -Uri "$BaseUrl/$Asset" -OutFile $Msi
Invoke-WebRequest -Uri "$BaseUrl/SHA256SUMS" -OutFile $Sha

$ChecksumLine = Get-Content $Sha | Select-String "  $Asset$" | Select-Object -First 1
if (-not $ChecksumLine) {
  throw "Checksum entry missing for $Asset"
}

$Expected = $ChecksumLine.ToString().Split(" ")[0].ToUpperInvariant()
$Actual = (Get-FileHash -Algorithm SHA256 $Msi).Hash.ToUpperInvariant()
if ($Expected -ne $Actual) {
  throw "Checksum mismatch for $Asset"
}

Start-Process msiexec.exe -Wait -ArgumentList "/i", "`"$Msi`""
