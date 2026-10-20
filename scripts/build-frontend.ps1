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

# Copy only approved production HTML pages
$pages = @(
    "index.html",
    "resume.html",
    "architecture.html",
    "projects.html",
    "lessons.html",
    "access.html",
    "admin.html"
)

foreach ($page in $pages) {
    $source = Join-Path $frontendDirectory $page
    $destination = Join-Path $distDirectory $page

    if (-not (Test-Path $source)) {
        throw "Required frontend page missing: $page"
    }

    Copy-Item $source $destination
}

Copy-Item `
    $assetsDirectory `
    (Join-Path $distDirectory "assets") `
    -Recurse

# Remove development-only files from the production build
$excludePaths = @(
    "assets\css\cozy-home.backup.css",
    "assets\js\architecture-calibrate.js",
    "assets\cloudy-joe-homepage-v1"
)

foreach ($relativePath in $excludePaths) {
    $target = Join-Path $distDirectory $relativePath

    if (Test-Path $target) {
        Remove-Item $target -Recurse -Force
        Write-Host "Excluded development file: $relativePath"
    }
}


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