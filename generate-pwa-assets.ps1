Add-Type -AssemblyName System.Drawing

$publicDir = "c:\jogopawon\frontend\public"
$logoPath = Join-Path $publicDir "logo.png"

# Read source image
$srcImg = [System.Drawing.Image]::FromFile($logoPath)

function Create-Square-Icon {
    param(
        [int]$size,
        [string]$outputPath,
        [int]$padding = 0,
        [string]$bgColor = "white"
    )

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($bgColor -eq "emerald") {
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 5, 150, 105)) # #059669
        $g.FillRectangle($brush, 0, 0, $size, $size)
        $brush.Dispose()
    } elseif ($bgColor -eq "white") {
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $g.FillRectangle($brush, 0, 0, $size, $size)
        $brush.Dispose()
    }

    # Calculate aspect ratio
    $targetWidth = $size - (2 * $padding)
    $targetHeight = $size - (2 * $padding)
    $ratio = [Math]::Min($targetWidth / $srcImg.Width, $targetHeight / $srcImg.Height)
    $newWidth = [int]($srcImg.Width * $ratio)
    $newHeight = [int]($srcImg.Height * $ratio)

    $x = [int](($size - $newWidth) / 2)
    $y = [int](($size - $newHeight) / 2)

    $g.DrawImage($srcImg, $x, $y, $newWidth, $newHeight)
    $g.Dispose()

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Saved: $outputPath ($($size)x$($size))"
}

# 1. pwa-192x192.png
Create-Square-Icon -size 192 -outputPath (Join-Path $publicDir "pwa-192x192.png") -padding 16 -bgColor "white"

# 2. pwa-512x512.png
Create-Square-Icon -size 512 -outputPath (Join-Path $publicDir "pwa-512x512.png") -padding 40 -bgColor "white"

# 3. pwa-maskable-512x512.png (Needs safe area padding ~15-20% and solid background)
Create-Square-Icon -size 512 -outputPath (Join-Path $publicDir "pwa-maskable-512x512.png") -padding 90 -bgColor "white"

# 4. apple-touch-icon.png (180x180)
Create-Square-Icon -size 180 -outputPath (Join-Path $publicDir "apple-touch-icon.png") -padding 14 -bgColor "white"

$srcImg.Dispose()
Write-Output "All PWA icons generated successfully!"
