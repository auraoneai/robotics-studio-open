param(
  [string]$ArtifactDirectory = "dist"
)

$ErrorActionPreference = "Stop"

if (-not $env:WINDOWS_EV_CERT_THUMBPRINT) {
  throw "WINDOWS_EV_CERT_THUMBPRINT secret is required for Windows signing"
}

Get-ChildItem -Path $ArtifactDirectory -Filter *.msi -Recurse | ForEach-Object {
  signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /sha1 $env:WINDOWS_EV_CERT_THUMBPRINT $_.FullName
}
