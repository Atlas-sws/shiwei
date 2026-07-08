# 生成拾味应用图标：赭陶渐变底 + 白色楷体「拾」
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot '..\docs\icons'
New-Item -ItemType Directory -Force $outDir | Out-Null

function New-Icon([int]$size, [string]$path) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $c1 = [System.Drawing.Color]::FromArgb(255, 202, 88, 48)
    $c2 = [System.Drawing.Color]::FromArgb(255, 143, 50, 22)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 55)
    $g.FillRectangle($brush, $rect)

    # 右上角一枚淡淡的圆形高光，增加质感
    $hl = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(26, 255, 244, 235))
    $d = [int]($size * 1.15)
    $g.FillEllipse($hl, [int]($size * 0.28), [int](-$size * 0.52), $d, $d)

    $font = New-Object System.Drawing.Font('KaiTi', [float]($size * 0.56), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textRect = New-Object System.Drawing.RectangleF(0, [float]($size * 0.015), $size, $size)
    $g.DrawString('拾', $font, [System.Drawing.Brushes]::White, $textRect, $sf)

    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "generated $path"
}

New-Icon 512 (Join-Path $outDir 'icon-512.png')
New-Icon 192 (Join-Path $outDir 'icon-192.png')
New-Icon 180 (Join-Path $outDir 'icon-180.png')
