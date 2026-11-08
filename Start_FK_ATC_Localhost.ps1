$ErrorActionPreference = "Stop"
$Port = 8787
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Prefix = "http://127.0.0.1:$Port/"

function Get-ContentType([string]$Path) {
    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        ".html" { "text/html; charset=utf-8" }
        ".webmanifest" { "application/manifest+json; charset=utf-8" }
        ".js" { "application/javascript; charset=utf-8" }
        ".css" { "text/css; charset=utf-8" }
        ".png" { "image/png" }
        ".json" { "application/json; charset=utf-8" }
        default { "application/octet-stream" }
    }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($Prefix)

try {
    $listener.Start()
} catch {
    Write-Host ""
    Write-Host "Unable to start FK ATC COM on $Prefix" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host ""
Write-Host "FK ATC COM Trainer localhost server is running." -ForegroundColor Green
Write-Host "Open: $Prefix"
Write-Host "Keep this window open while using FK ATC COM."
Write-Host "Press Ctrl+C to stop."
Write-Host ""

Start-Process $Prefix

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $requestPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
        if ([string]::IsNullOrWhiteSpace($requestPath)) { $requestPath = "index.html" }

        $fullPath = [System.IO.Path]::GetFullPath((Join-Path $Root $requestPath))
        $rootPath = [System.IO.Path]::GetFullPath($Root)

        if (-not $fullPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
            $context.Response.StatusCode = 403
            $context.Response.Close()
            continue
        }

        if (-not (Test-Path $fullPath -PathType Leaf)) {
            $fullPath = Join-Path $Root "404.html"
            $context.Response.StatusCode = 404
        } else {
            $context.Response.StatusCode = 200
        }

        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        $context.Response.ContentType = Get-ContentType $fullPath
        $context.Response.ContentLength64 = $bytes.Length
        $context.Response.Headers["Cache-Control"] = "no-cache"
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $context.Response.OutputStream.Close()
    } catch {
        if ($listener.IsListening) {
            Write-Host $_.Exception.Message -ForegroundColor Yellow
        }
    }
}
