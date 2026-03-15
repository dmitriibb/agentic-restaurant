param(
  [string]$UsersBaseUrl = "http://localhost:8081",
  [string]$MenuBaseUrl = "http://localhost:8082",
  [string]$OrdersBaseUrl = "http://localhost:8083",
  [string]$ProductionBaseUrl = "http://localhost:8084",
  [string]$StaffClientUrl = "http://localhost:8085",
  [string]$RabbitApiBaseUrl = "http://localhost:15672",
  [string]$CustomerLogin = "admin",
  [string]$CustomerPassword = "admin",
  [string]$StaffLogin = "staff1",
  [string]$StaffPassword = "staff1",
  [int]$MaxWaitSeconds = 60
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "==> $Message"
}

function Assert-OkResponse([string]$Name, [scriptblock]$Action) {
  try {
    & $Action | Out-Null
  }
  catch {
    throw "${Name} failed: $($_.Exception.Message)"
  }
}

function Invoke-Json([string]$Method, [string]$Uri, [hashtable]$Headers = @{}, $Body = $null) {
  $params = @{
    Method = $Method
    Uri = $Uri
    Headers = $Headers
    ContentType = "application/json"
  }
  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 8)
  }
  return Invoke-RestMethod @params
}

function Wait-Until([string]$Name, [scriptblock]$Condition, [int]$TimeoutSeconds) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      if (& $Condition) {
        return
      }
    }
    catch {
      Start-Sleep -Seconds 2
      continue
    }
    Start-Sleep -Seconds 2
  }
  throw "Timed out waiting for $Name within ${TimeoutSeconds}s"
}

Write-Step "Checking service readiness endpoints"
Assert-OkResponse "users-service readiness" { Invoke-WebRequest -UseBasicParsing "$UsersBaseUrl/actuator/health/readiness" }
Assert-OkResponse "menu-service readiness" { Invoke-WebRequest -UseBasicParsing "$MenuBaseUrl/actuator/health/readiness" }
Assert-OkResponse "orders-service readiness" { Invoke-WebRequest -UseBasicParsing "$OrdersBaseUrl/actuator/health/readiness" }
Assert-OkResponse "production-service readiness" { Invoke-WebRequest -UseBasicParsing "$ProductionBaseUrl/health/ready" }
Assert-OkResponse "staff-client availability" { Invoke-WebRequest -UseBasicParsing $StaffClientUrl }

Write-Step "Verifying RabbitMQ topology"
$rabbitCred = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("guest:guest"))
$rabbitHeaders = @{ Authorization = "Basic $rabbitCred" }
$queue = Invoke-RestMethod -Method Get -Uri "$RabbitApiBaseUrl/api/queues/%2F/production-service.item-requested.v1" -Headers $rabbitHeaders
if (-not $queue.name) {
  throw "Queue production-service.item-requested.v1 not found"
}

Write-Step "Logging in customer user for order submission"
$customerLoginResponse = Invoke-Json -Method Post -Uri "$UsersBaseUrl/api/v1/auth/login" -Body @{ login = $CustomerLogin; password = $CustomerPassword }
$customerToken = $customerLoginResponse.accessToken
$customerId = [int64]$customerLoginResponse.user.id
if (-not $customerToken) {
  throw "Customer login did not return access token"
}

Write-Step "Loading menu item id"
$authHeaders = @{ Authorization = "Bearer $customerToken" }
$menuItems = Invoke-Json -Method Get -Uri "$MenuBaseUrl/api/v1/menu-items" -Headers $authHeaders
if (-not $menuItems -or $menuItems.Count -eq 0) {
  throw "No menu items returned from menu-service"
}
$menuItemId = [int64]$menuItems[0].id

Write-Step "Submitting order to orders-service"
$requestId = [Guid]::NewGuid().ToString()
$orderResponse = Invoke-Json -Method Put -Uri "$OrdersBaseUrl/api/v1/orders/$requestId" -Headers $authHeaders -Body @{
  userId = $customerId
  items = @(
    @{ itemId = $menuItemId; quantity = 1 }
  )
}
if ($orderResponse.status -ne "ACCEPTED") {
  throw "Expected ACCEPTED order status, got $($orderResponse.status)"
}
$orderId = [int64]$orderResponse.orderId

Write-Step "Logging in staff user for production commands"
$staffLoginResponse = Invoke-Json -Method Post -Uri "$UsersBaseUrl/api/v1/auth/login" -Body @{ login = $StaffLogin; password = $StaffPassword }
$staffToken = $staffLoginResponse.accessToken
if (-not $staffToken) {
  throw "Staff login did not return access token"
}
$staffHeaders = @{ Authorization = "Bearer $staffToken" }

Write-Step "Waiting for production order to be materialized from RabbitMQ handoff"
$orderDetail = $null
Wait-Until -Name "production order materialization" -TimeoutSeconds $MaxWaitSeconds -Condition {
  try {
    $orderDetail = Invoke-Json -Method Get -Uri "$ProductionBaseUrl/api/v1/production/orders/$orderId" -Headers $staffHeaders
    return $null -ne $orderDetail.order
  }
  catch {
    return $false
  }
}

$item = $orderDetail.items | Select-Object -First 1
if (-not $item) {
  throw "No production items found for order $orderId"
}

if ($item.Status -eq "QUEUED") {
  Write-Step "Sending pickup command"
  Invoke-Json -Method Post -Uri "$ProductionBaseUrl/api/v1/production/items/$($item.ID)/pickup" -Headers $staffHeaders -Body @{}
}

Write-Step "Sending ready command"
Invoke-Json -Method Post -Uri "$ProductionBaseUrl/api/v1/production/items/$($item.ID)/ready" -Headers $staffHeaders -Body @{}

Write-Step "Waiting for order to become READY"
Wait-Until -Name "production order READY" -TimeoutSeconds $MaxWaitSeconds -Condition {
  $latest = Invoke-Json -Method Get -Uri "$ProductionBaseUrl/api/v1/production/orders/$orderId" -Headers $staffHeaders
  return $latest.order.Status -eq "READY"
}

Write-Host "Cross-service smoke check passed for order $orderId"
Write-Host "NOTE: full browser e2e automation is still out of scope for this task."
