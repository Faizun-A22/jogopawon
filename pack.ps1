# Script Packaging Aman JogoPawon Mart
# Menjamin data admin di VPS tidak akan terhapus / tertimpa saat update!

Write-Host "Menyiapkan paket deployment JogoPawon..."

Remove-Item -Path 'c:\jogopawon\jogopawon.zip', 'c:\jogopawon\jogopawon-vps.zip' -Force -ErrorAction SilentlyContinue

$tempDir = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), 'jogopawon_pack_' + [System.Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$itemsToCopy = @(
    'backend',
    'frontend',
    'docker-compose.yml',
    'deploy.sh',
    'nginx-vps.conf',
    'README.md'
)

foreach ($item in $itemsToCopy) {
    $src = Join-Path 'c:\jogopawon' $item
    $dest = Join-Path $tempDir $item
    if (Test-Path $src -PathType Container) {
        # /XD data node_modules .git .vscode dist_old mencegah folder backend/data tertimpa di VPS!
        robocopy $src $dest /E /XD node_modules .git .vscode dist_old data /XF *.log | Out-Null
    } else {
        Copy-Item -Path $src -Destination $dest -Force
    }
}

$backendDataDir = Join-Path $tempDir 'backend\data'
New-Item -ItemType Directory -Path $backendDataDir -Force | Out-Null
Set-Content -Path (Join-Path $backendDataDir '.gitkeep') -Value '' -Force

Write-Host "Mengompresi ke jogopawon.zip..."
Compress-Archive -Path (Join-Path $tempDir '*') -DestinationPath 'c:\jogopawon\jogopawon.zip' -CompressionLevel Optimal
Copy-Item -Path 'c:\jogopawon\jogopawon.zip' -Destination 'c:\jogopawon\jogopawon-vps.zip' -Force

Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Selesai! File zip berhasil dibuat:"
Get-Item 'c:\jogopawon\jogopawon.zip', 'c:\jogopawon\jogopawon-vps.zip' | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
