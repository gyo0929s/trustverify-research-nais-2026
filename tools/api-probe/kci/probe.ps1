param([ValidateSet('search','detail','zero','invalid')][string]$Case = 'search', [string]$RecordId, [switch]$RetryTransport)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location $root
if ([IO.Path]::GetFullPath((git rev-parse --show-toplevel).Trim()) -ne $root) { throw 'Git root check failed' }
git check-ignore -q -- .env.local
if ($LASTEXITCODE -ne 0) { throw 'Secret ignore check failed' }
$match = [regex]::Match([IO.File]::ReadAllText((Join-Path $root '.env.local')), '(?m)^\s*KCI_API_KEY\s*=\s*(.*?)\s*$')
$secret = $match.Groups[1].Value.Trim().Trim('"').Trim("'")
if (-not $match.Success -or -not $secret) { throw 'Credential presence check failed' }
$params = [ordered]@{ apiCode = 'articleSearch' }
$name = switch ($Case) {
    'search' { $params.title = '컴퓨터'; $params.displayCount = '3'; 'success-search' }
    'detail' { if ($RecordId -notmatch '^ART[0-9]+$') { throw 'Expected observed KCI article identifier' }; $params.apiCode = 'articleDetail'; $params.id = $RecordId; 'success-detail' }
    'zero' { $params.title = 'TrustVerifyNoSuchTitle7f924d9e6a824bcaa5c12026'; $params.displayCount = '1'; 'zero-result' }
    'invalid' { $params.apiCode = 'articleDetail'; 'invalid-request' } # Missing required id; key unchanged.
}
$output = Join-Path $root 'artifacts/api-qualification/kci'
[IO.Directory]::CreateDirectory($output) | Out-Null
$artifact = Join-Path $output "$name.redacted.json"
$previous = $null
if (Test-Path $artifact) {
    $previous = Get-Content -LiteralPath $artifact -Raw | ConvertFrom-Json
    if (-not $RetryTransport -or -not $previous.transport_failure) { throw 'Artifact already exists; only explicit transport-failure retry allowed' }
}
$result = [ordered]@{ case = $Case; retrieved_at = [DateTime]::UtcNow.ToString('o'); request_parameters = $params; http_status = $null; content_type = $null; latency_ms = $null; root = $null; response_snapshot_sha256 = $null; response_xml = $null; transport_failure = $false }
$handler = [Net.Http.HttpClientHandler]::new()
if ($previous) { $result['previous_transport_attempt'] = $previous }
$handler.AllowAutoRedirect = $false
$client = [Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(40)
$timer = [Diagnostics.Stopwatch]::StartNew()
try {
    $parts = foreach ($entry in $params.GetEnumerator()) { [Uri]::EscapeDataString($entry.Key) + '=' + [Uri]::EscapeDataString($entry.Value) }
    $uri = 'https://open.kci.go.kr/po/openapi/openApiSearch.kci?' + ($parts -join '&') + '&key=' + [Uri]::EscapeDataString($secret)
    $response = $client.GetAsync($uri, [Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
    $result.http_status = [int]$response.StatusCode
    $result.content_type = [string]$response.Content.Headers.ContentType
    $stream = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
    $memory = [IO.MemoryStream]::new()
    $buffer = [byte[]]::new(8192)
    while (($read = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
        if ($memory.Length + $read -gt 262144) { throw 'Response size guard' }
        $memory.Write($buffer, 0, $read)
    }
    $body = [Text.Encoding]::UTF8.GetString($memory.ToArray())
    $body = $body.Replace($secret, '[REDACTED]').Replace([Uri]::EscapeDataString($secret), '[REDACTED]')
    $body = [regex]::Replace($body, '(?is)https?://[^\s<>"'']*[?][^\s<>"'']*(?:key|token|authorization)[^\s<>"'']*', '[REDACTED_AUTHENTICATED_URL]')
    $settings = [Xml.XmlReaderSettings]::new(); $settings.DtdProcessing = 'Prohibit'; $settings.XmlResolver = $null
    try {
        $reader = [Xml.XmlReader]::Create([IO.StringReader]::new($body), $settings)
        $xml = [Xml.XmlDocument]::new(); $xml.XmlResolver = $null; $xml.Load($reader)
        $result.root = $xml.DocumentElement.Name
        $records = @($xml.SelectNodes('//record'))
        if ($records.Count -gt 3) { foreach ($record in $records[3..($records.Count-1)]) { $record.ParentNode.RemoveChild($record) | Out-Null } }
        $result.response_xml = $xml.OuterXml
    } catch { $result['parse_failed'] = $true; $result.response_xml = $body.Substring(0, [Math]::Min(4096, $body.Length)) }
    $result.response_snapshot_sha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($result.response_xml))).ToLowerInvariant()
} catch { $result.transport_failure = $true; $result['exception_type'] = $_.Exception.GetType().FullName } # Never serialize exception messages: they can contain the authenticated URI.
finally { $timer.Stop(); $result.latency_ms = $timer.ElapsedMilliseconds; $client.Dispose(); $handler.Dispose(); $uri = $null; $secret = $null }
$result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $artifact -Encoding utf8
Write-Output "Saved redacted artifact: $name; HTTP=$($result.http_status); root=$($result.root); transport_failure=$($result.transport_failure)"
