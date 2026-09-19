param([ValidateSet('dev', 'build', 'preview', 'typecheck', 'test', 'install')][string]$Task = 'dev')
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
$currentNodeVersion = [version]((& node -v).TrimStart('v'))
if (($currentNodeVersion.Major -eq 20 -and $currentNodeVersion.Minor -lt 19) -or $currentNodeVersion.Major -lt 20 -or $currentNodeVersion.Major -eq 21 -or ($currentNodeVersion.Major -eq 22 -and $currentNodeVersion.Minor -lt 12)) {
  if (Test-Path -LiteralPath (Join-Path $bundledNode 'node.exe')) { $env:PATH = $bundledNode + ';' + $env:PATH }
  else { throw 'Please install Node.js 24 LTS and try again.' }
}
$npmRoot = Split-Path -Parent (Get-Command npm.cmd).Source
$npmCli = Join-Path $npmRoot 'node_modules\npm\bin\npm-cli.js'
if (Test-Path -LiteralPath $npmCli) {
  if ($Task -eq 'install') { & node $npmCli install } else { & node $npmCli run $Task }
} else {
  if ($Task -eq 'install') { & npm install } else { & npm run $Task }
}
exit $LASTEXITCODE
