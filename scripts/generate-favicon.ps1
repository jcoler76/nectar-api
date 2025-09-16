param(
  [string]$OutPath = "public\\favicon.ico",
  [int]$Size = 32
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
  Add-Type -AssemblyName System.Drawing -ErrorAction Stop
} catch {
  Write-Error "System.Drawing is not available in this environment. Cannot generate favicon."; exit 1
}

# Ensure output directory exists
$dir = [System.IO.Path]::GetDirectoryName($OutPath)
if (-not [string]::IsNullOrWhiteSpace($dir) -and -not (Test-Path $dir)) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

$bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# Colors
$bg = [System.Drawing.Color]::FromArgb(255, 11, 16, 33)   # #0B1021
$honey1 = [System.Drawing.Color]::FromArgb(255, 255, 213, 79)  # #FFD54F
$honey2 = [System.Drawing.Color]::FromArgb(255, 255, 143, 0)   # #FF8F00
$stroke = [System.Drawing.Color]::FromArgb(255, 255, 143, 0)
$white = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)

# Background
$g.Clear($bg)

function New-PointF([float]$x, [float]$y) {
  return [System.Drawing.PointF]::new($x, $y)
}

function Get-HexPoints([float]$cx, [float]$cy, [float]$r) {
  $pts = New-Object 'System.Collections.Generic.List[System.Drawing.PointF]'
  for ($i = 0; $i -lt 6; $i++) {
    $deg = 30 + 60 * $i
    $rad = $deg * [Math]::PI / 180.0
    $x = $cx + $r * [Math]::Cos($rad)
    $y = $cy + $r * [Math]::Sin($rad)
    $pts.Add((New-PointF $x $y)) | Out-Null
  }
  return $pts.ToArray()
}

# Draw honey hexagon mark
$cx = [float]($Size / 2)
$cy = [float]($Size / 2)
$r  = [float]($Size * 0.38)
$rect = New-Object System.Drawing.RectangleF ($cx - $r), ($cy - $r), (2*$r), (2*$r)
$lg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $honey1, $honey2, 60
$pen = New-Object System.Drawing.Pen $stroke, ( [float]($Size * 0.06) )

$hexPts = Get-HexPoints $cx $cy $r
$g.FillPolygon($lg, $hexPts)
$g.DrawPolygon($pen, $hexPts)

# Draw a crisp "N" in the center
$fontSize = [float]($Size * 0.56)
try {
  $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
} catch {
  $font = New-Object System.Drawing.Font([System.Drawing.FontFamily]::GenericSansSerif, $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
}
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$brushWhite = New-Object System.Drawing.SolidBrush $white

$g.DrawString('N', $font, $brushWhite, (New-Object System.Drawing.RectangleF 0,0,$Size,$Size), $sf)

# Convert to .ico and save
$hicon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hicon)
$fs = [System.IO.File]::Open($OutPath, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Dispose()

# Cleanup
$g.Dispose(); $bmp.Dispose(); $lg.Dispose(); $pen.Dispose(); $brushWhite.Dispose(); $font.Dispose(); $sf.Dispose()

Write-Output "Favicon generated: $OutPath"

