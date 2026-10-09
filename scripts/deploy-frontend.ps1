
param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$bucket = "cloudy-joe-frontend-prod"
$distPath = Join-Path $PSScriptRoot "..\dist"

if (-not (Test-Path $distPath)) {
    throw "dist directory not found. Run build-frontend.ps1 first."
}

# Verify AWS access before uploading
aws sts get-caller-identity --query Account --output text

if ($LASTEXITCODE -ne 0) {
    throw "AWS authentication failed."
}

Write-Host "Uploading HTML pages..." -ForegroundColor Cyan

Get-ChildItem -Path $distPath -Filter "*.html" -File | ForEach-Object {
    $file = $_

$uploadArgs = @(
    "s3", "cp",
    $file.FullName,
    "s3://$bucket/$($file.Name)",
    "--content-type", "text/html",
    "--cache-control", "no-store"
)

if ($DryRun) {
    $uploadArgs += "--dryrun"
}

& aws @uploadArgs

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to upload $($file.Name)"
    }
}

Write-Host "Uploading public assets..." -ForegroundColor Cyan

$assetsPath = Join-Path $distPath "assets"

if (Test-Path $assetsPath) {
$syncArgs = @(
    "s3", "sync",
    $assetsPath,
    "s3://$bucket/assets/",
    "--cache-control", "public, max-age=3600"
)

if ($DryRun) {
    $syncArgs += "--dryrun"
}

& aws @syncArgs

    if ($LASTEXITCODE -ne 0) {
        throw "Asset upload failed."
    }
}

Write-Host "Deployment completed." -ForegroundColor Green
