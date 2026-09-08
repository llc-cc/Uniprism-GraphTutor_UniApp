[CmdletBinding()]
param(
  [ValidateRange(1, 65535)][int] $Port = 8002
)

$ErrorActionPreference = 'Stop'
$route = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' |
  Where-Object { $_.NextHop -ne '0.0.0.0' } |
  Sort-Object RouteMetric, InterfaceMetric |
  Select-Object -First 1

if (-not $route) {
  throw '未找到可用于手机联调的 IPv4 默认路由。'
}

$address = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $route.InterfaceIndex |
  Where-Object { $_.IPAddress -notlike '127.*' } |
  Select-Object -First 1 -ExpandProperty IPAddress

if (-not $address) {
  throw '未找到开发电脑的局域网 IPv4 地址。'
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $projectRoot '.env.development.local'
"VITE_API_BASE_URL=http://${address}:$Port" | Set-Content -LiteralPath $environmentFile -Encoding utf8
Write-Host "小程序本地 API 已设置为 http://${address}:$Port"
