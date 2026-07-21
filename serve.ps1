# Simple PowerShell HTTP Server for serving local static files with proper MIME types.
# Useful for running ES modules without Node or Python.

$port = 8080
$localPath = Resolve-Path "."
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "Local server successfully started at http://localhost:$port/"
    Write-Host "Press Ctrl+C to stop the server."

    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $urlPath = $request.Url.LocalPath
            if ($urlPath -eq "/") {
                $urlPath = "/index.html"
            }

            # Map to physical file path safely
            $safePath = $urlPath.Replace("/", "\")
            if ($safePath.StartsWith("\")) {
                $safePath = $safePath.Substring(1)
            }
            $filePath = Join-Path $localPath $safePath

            if (Test-Path $filePath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                
                # Setup proper MIME content type headers
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                switch ($ext) {
                    ".html" { $response.ContentType = "text/html; charset=utf-8" }
                    ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                    ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                    ".json" { $response.ContentType = "application/json; charset=utf-8" }
                    ".png"  { $response.ContentType = "image/png" }
                    ".jpg"  { $response.ContentType = "image/jpeg" }
                    ".jpeg" { $response.ContentType = "image/jpeg" }
                    ".svg"  { $response.ContentType = "image/svg+xml" }
                    ".gif"  { $response.ContentType = "image/gif" }
                    default { $response.ContentType = "application/octet-stream" }
                }

                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                # 404 Not Found
                $response.StatusCode = 404
                $errorMsg = [System.Text.Encoding]::UTF8.GetBytes("404 File Not Found: $urlPath")
                $response.ContentType = "text/plain"
                $response.ContentLength64 = $errorMsg.Length
                $response.OutputStream.Write($errorMsg, 0, $errorMsg.Length)
            }
        } catch {
            Write-Warning "Error processing request: $_"
        } finally {
            if ($response) {
                $response.Close()
            }
        }
    }
} catch {
    Write-Error "Failed to start listener: $_"
} finally {
    if ($listener) {
        $listener.Stop()
        Write-Host "Server stopped."
    }
}
