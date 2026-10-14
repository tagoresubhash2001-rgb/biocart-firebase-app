Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("..\biocart-clean-release.zip")
Write-Host "Total entries in archive:" $zip.Entries.Count

$rootEntries = $zip.Entries | Where-Object { -not $_.FullName.Contains('/') } | Select-Object -ExpandProperty FullName
Write-Host "`nRoot files in archive:"
foreach ($r in $rootEntries) {
    Write-Host " - $r"
}

$hasNodeModules = ($zip.Entries | Where-Object { $_.FullName -like "*node_modules*" }).Count
$hasGit = ($zip.Entries | Where-Object { $_.FullName -like ".git*" }).Count
$hasDist = ($zip.Entries | Where-Object { $_.FullName -like "dist/*" }).Count
$hasEnv = ($zip.Entries | Where-Object { $_.FullName -like ".env*" -and $_.FullName -ne ".env.example" }).Count
$hasZip = ($zip.Entries | Where-Object { $_.FullName -like "*.zip" }).Count

Write-Host "`nSanity exclusions check:"
Write-Host " - node_modules entries: $hasNodeModules"
Write-Host " - .git entries: $hasGit"
Write-Host " - dist entries: $hasDist"
Write-Host " - non-example .env files: $hasEnv"
Write-Host " - nested zip files: $hasZip"

$hasSrc = ($zip.Entries | Where-Object { $_.FullName -like "src/*" }).Count
$hasFunctions = ($zip.Entries | Where-Object { $_.FullName -like "functions/*" }).Count
$hasPublic = ($zip.Entries | Where-Object { $_.FullName -like "public/*" }).Count
$hasTests = ($zip.Entries | Where-Object { $_.FullName -like "tests/*" }).Count

Write-Host "`nSanity inclusions check:"
Write-Host " - src/ files: $hasSrc"
Write-Host " - functions/ files: $hasFunctions"
Write-Host " - public/ files: $hasPublic"
Write-Host " - tests/ files: $hasTests"

$zip.Dispose()
