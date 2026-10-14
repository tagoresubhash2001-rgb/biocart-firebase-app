$ErrorActionPreference = 'Stop'
$srcDir = (Get-Location).Path
$parentDir = Split-Path $srcDir -Parent
$zipPath = Join-Path $parentDir "biocart-clean-release.zip"

if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipFile = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

$excludeDirs = @(
    '\.git',
    'node_modules',
    'dist',
    '\.firebase',
    '\.vscode',
    '\.idea',
    'coverage'
)

$files = Get-ChildItem -Path $srcDir -Recurse -File
$addedCount = 0

foreach ($file in $files) {
    $fullName = $file.FullName
    $rel = $fullName.Substring($srcDir.Length).TrimStart('\', '/')
    
    $skip = $false
    foreach ($d in $excludeDirs) {
        if ($rel -match "(^|[\\/])$d([\\/]|$)") {
            $skip = $true
            break
        }
    }
    
    if ($file.Name -match "^\.env" -and $file.Name -ne ".env.example") { $skip = $true }
    if ($file.Name -match "\.local$") { $skip = $true }
    if ($file.Extension -eq ".zip") { $skip = $true }
    if ($file.Name -match "service-account.*\.json$") { $skip = $true }
    if ($file.Name -eq "package-release.cjs" -or $file.Name -eq "package-release.ps1" -or $file.Name -eq "verify-zip.ps1") { $skip = $true }
    # Exclude root patch/fix scripts
    if ($file.DirectoryName -eq $srcDir -and ($file.Name -match "^(patch|fix|repair|rewrite|disable|check|update).*(\.cjs|\.js|\.py)$" -or $file.Name -eq "organize.cjs" -or $file.Name -eq "generate-cms.js" -or $file.Name -eq "apply-fixes.cjs" -or $file.Name -eq "remove-guards.cjs" -or $file.Name -eq "wrap-error-boundary.cjs")) { $skip = $true }

    if (-not $skip) {
        # POSIX relative path for ZIP archive
        $entryName = $rel -replace '\\', '/'
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipFile, $fullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        $addedCount++
    }
}

$zipFile.Dispose()
Write-Host "Successfully archived $addedCount files cleanly into: $zipPath"
