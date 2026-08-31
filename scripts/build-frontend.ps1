$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$frontendDirectory = Join-Path $repositoryRoot "frontend"
$assetsDirectory = Join-Path $repositoryRoot "assets"
$distDirectory = Join-Path $repositoryRoot "dist"

Write-Host "Building frontend deployment package..."

if (Test-Path $distDirectory) {
    Remove-Item $distDirectory -Recurse -Force
}

New-Item -ItemType Directory -Path $distDirectory | Out-Null

Copy-Item `
    (Join-Path $frontendDirectory "*.html") `
    $distDirectory

Copy-Item `
    $assetsDirectory `
    (Join-Path $distDirectory "assets") `
    -Recurse

Get-ChildItem `
    (Join-Path $distDirectory "*.html") |
ForEach-Object {

    $content = Get-Content $_.FullName -Raw

    $content = $content -replace `
        '\.\./assets/', `
        'assets/'

    Set-Content `
        $_.FullName `
        $content
}

Write-Host "Frontend build complete."
Write-Host "Output: $distDirectory"