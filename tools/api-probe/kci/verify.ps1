# Offline qualification checks. Makes no API calls and never prints secret values.
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location $root
git check-ignore -q -- .env.local
if ($LASTEXITCODE -ne 0) { throw 'Secret file is not ignored' }
$m = [regex]::Match([IO.File]::ReadAllText((Join-Path $root '.env.local')), '(?m)^\s*KCI_API_KEY\s*=\s*(.*?)\s*$')
$secret = $m.Groups[1].Value.Trim().Trim('"').Trim("'")
if (-not $secret) { throw 'Missing local key' }
$files = @(Get-ChildItem tools/api-probe/kci,artifacts/api-qualification/kci -File -Recurse)
foreach ($file in $files) {
    $text = [IO.File]::ReadAllText($file.FullName)
    if ($text.Contains($secret) -or $text.Contains([Uri]::EscapeDataString($secret))) { throw 'Credential scan failed; content suppressed' }
    if ($text -match 'https?://[^\s"<>]+[?&](key|access_token|api_key)=') { throw 'Authenticated URL scan failed' }
}
$docs = @{}
foreach ($name in 'success-search','success-detail','zero-result','invalid-request') {
    $a = Get-Content "artifacts/api-qualification/kci/$name.redacted.json" -Raw | ConvertFrom-Json
    if ($a.http_status -ne 200 -or $a.transport_failure -or $a.root -ne 'MetaData') { throw 'Unexpected live result' }
    $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($a.response_xml))).ToLowerInvariant()
    if ($hash -ne $a.response_snapshot_sha256) { throw 'Snapshot hash mismatch' }
    [xml]$doc = $a.response_xml
    if ($doc.SelectSingleNode('/MetaData/inputData/key').InnerText -ne '[REDACTED]') { throw 'Echoed credential was not redacted' }
    $docs[$name] = $doc
}
$search = $docs['success-search']; $detail = $docs['success-detail']
if ($search.SelectNodes('//record').Count -ne 3 -or $search.SelectSingleNode('//result/total').InnerText -ne '2814') { throw 'Search fixture mismatch' }
$id = $search.SelectSingleNode('//record/articleInfo').GetAttribute('article-id')
if ($detail.SelectSingleNode('//record/articleInfo').GetAttribute('article-id') -ne $id -or $detail.SelectSingleNode('//inputData/id').InnerText -ne $id) { throw 'Identifier round trip mismatch' }
$zero = $docs['zero-result']; $invalid = $docs['invalid-request']
if ($zero.SelectNodes('//record | //result/total').Count -ne 0 -or $zero.SelectNodes('//result/resultMsg').Count -ne 1 -or $zero.SelectSingleNode('//result/resultMsg').InnerText -cne 'No Data') { throw 'Zero shape mismatch' }
if ($invalid.SelectNodes('//record | //result/total').Count -ne 0 -or $invalid.SelectNodes('//result/resultMsg').Count -ne 2 -or $invalid.SelectSingleNode('//result/resultMsg').InnerText -notmatch 'id$') { throw 'Error shape mismatch' }
if ($detail.SelectNodes('//referenceInfo/reference').Count -ne 17) { throw 'Reference count mismatch' }
$secret = $null
Write-Output 'PASS: safe artifacts, snapshot hashes, identifier round trip, valid zero vs HTTP-200 error, and 17 references.'
