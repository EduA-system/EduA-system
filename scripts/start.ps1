#Requires -Version 5.1
<#
.SYNOPSIS
    All-in-one startup: Backend + Frontend (database is managed by Aiven)

.DESCRIPTION
    1. Checks required ports (8080, 3000) -- aborts if any is in use.
    2. Installs npm deps for frontend (if needed).
    3. Resolves the DB: uses the cloud DB in DB_URL if its host:port is
       reachable; otherwise falls back to a local PostgreSQL started via
       Docker Compose. Then starts backend (Spring Boot) against the chosen DB.
    4. Waits for backend to be ready (HTTP /api/health).
    5. Starts frontend dev server (Next.js) in foreground.

.PARAMETER SkipBe
    Skip starting the backend.

.PARAMETER SkipFe
    Skip starting the frontend (only BE).

.EXAMPLE
    pwsh scripts\start.ps1
    pwsh scripts\start.ps1 -SkipFe
#>

param(
    [switch]$SkipBe,
    [switch]$SkipFe
)

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# -- Config ---------------------------------------------------------------
$bePort    = 8080
$fePort    = 3000

$beUrl     = "http://localhost:$bePort"
$feUrl     = "http://localhost:$fePort"

$beDir     = Join-Path $rootDir "be"
$feDir     = Join-Path $rootDir "fe"
$loadedEnv = @{}

$beMvw     = if ($IsWindows -or ($env:OS -eq "Windows_NT")) { "mvnw.cmd" } else { "./mvnw" }

# -- Colors ---------------------------------------------------------------
function Write-Step($msg)   { Write-Host ""
                               Write-Host ">>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)     { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Err($msg)    { Write-Host ""
                               Write-Host "  [ERROR] $msg" -ForegroundColor Red }
function Write-Info($msg)   { Write-Host "    $msg" -ForegroundColor Gray }

# -- Load .env -------------------------------------------------------------
$envFile = Join-Path $rootDir ".env"
if (Test-Path $envFile) {
    Write-Info "Loading environment from .env"
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)\s*$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            # Set every key as an env var. DB_URL / DB_USERNAME / DB_PASSWORD
            # are read directly by Spring Boot (application.properties).
            Set-Item "env:$key" $val
            $loadedEnv[$key] = $val
        }
    }
    if ($env:DB_URL) {
        Write-Info "Cloud DB configured: $($env:DB_URL)"
    } else {
        Write-Host "  [WARN] DB_URL not set in .env -- backend will use defaults from application.properties." -ForegroundColor Yellow
    }
} else {
    Write-Host "  [WARN] .env file not found at $rootDir" -ForegroundColor Yellow
    Write-Host "    Copy .env.example to .env and fill in your secrets." -ForegroundColor Yellow
    Write-Host "    Backend will use default credentials from application.properties." -ForegroundColor Yellow
}

# -- State -----------------------------------------------------------------
$script:bgJobs      = @()
$script:teardownDone  = $false

# Ctrl+C is handled via the try/finally around the main body: PowerShell runs
# finally blocks on Ctrl+C, which is far more reliable than a .NET
# CancelKeyPress handler (that runs on a runspace-less thread and silently
# fails). Make sure Ctrl+C breaks rather than being read as input.
try { [Console]::TreatControlCAsInput = $false } catch { }

# -- Helpers ---------------------------------------------------------------
# Kills the background BE/FE processes. Guarded so it runs at most once
# (abort path + finally must not double-teardown).
function Invoke-Teardown {
    if ($script:teardownDone) { return }
    $script:teardownDone = $true

    foreach ($proc in $script:bgJobs) {
        if ($proc -and -not $proc.HasExited) {
            # We launch BE/FE through cmd.exe, which spawns mvn/npm -> java/node
            # grandchildren. Stop-Process only kills cmd.exe and orphans the
            # rest (a stray node keeps holding port 3000). taskkill /T kills the
            # whole tree.
            taskkill /PID $proc.Id /T /F 2>$null | Out-Null
            if (-not $proc.HasExited) {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

function Stop-All {
    param([array]$Jobs, [string]$Reason)
    Write-Host ""
    Write-Host "-------------------------------------------------------" -ForegroundColor Yellow
    if ($Reason) {
        Write-Host "  Aborting: $Reason" -ForegroundColor Yellow
    } else {
        Write-Host "  Shutting down ..." -ForegroundColor Yellow
    }

    Invoke-Teardown
    Write-Ok "All stopped."
    exit 1
}

function Test-PortInUse([int]$port) {
    # netstat is the source of truth: it sees listeners on every interface
    # (IPv4/IPv6/LAN), unlike a Loopback-only bind which gives false negatives
    # when something listens on a different interface.
    if (@(Get-PortPids $port).Count -gt 0) { return $true }
    # Fallback: try to grab the port on all interfaces.
    try {
        $conn = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
        $conn.Start()
        $conn.Stop()
        return $false   # port is free
    } catch [System.Net.Sockets.SocketException] {
        return $true    # port is occupied
    }
}

function Get-PortProcessInfo([int]$port) {
    $lines = netstat -ano | Select-String ":$port\s.*LISTENING"
    if (-not $lines) { return "unknown" }
    $results = @()
    foreach ($line in $lines) {
        $parts = $line -split '\s+'
        $pidStr = $parts[$parts.Length - 1]
        if ($pidStr -match '^\d+$') {
            $proc = Get-Process -Id ([int]$pidStr) -ErrorAction SilentlyContinue
            if ($proc) {
                $results += "PID $($proc.Id) -- $($proc.ProcessName) ($($proc.Path))"
            } else {
                $results += "PID $pidStr (process exited)"
            }
        }
    }
    if ($results.Count -gt 0) { return $results -join "; " }
    return "unknown"
}

function Get-PortPids([int]$port) {
    $lines = netstat -ano | Select-String ":$port\s.*LISTENING"
    $pids = @()
    foreach ($line in $lines) {
        $parts = ($line -split '\s+') | Where-Object { $_ -ne '' }
        $pidStr = $parts[$parts.Length - 1]
        if ($pidStr -match '^\d+$' -and [int]$pidStr -ne 0) {
            $pids += [int]$pidStr
        }
    }
    return ($pids | Select-Object -Unique)
}

# Prompts the user to kill whatever is holding $port. Returns $true if the
# port ends up free, $false otherwise (declined / non-interactive / kill failed).
function Confirm-KillPort([int]$port, [string]$name) {
    $pids = @(Get-PortPids $port)
    if ($pids.Count -eq 0) { return $false }

    # Don't prompt when there's no console to read from.
    try { if (-not [Environment]::UserInteractive) { return $false } } catch { return $false }

    Write-Host ""
    Write-Host "  Port $port ($name) is in use by:" -ForegroundColor Yellow
    foreach ($procId in $pids) {
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "      PID $procId -- $($proc.ProcessName) ($($proc.Path))" -ForegroundColor Yellow
        } else {
            Write-Host "      PID $procId (process info unavailable)" -ForegroundColor Yellow
        }
    }

    $answer = Read-Host "  Kill the process(es) above to free port $port? [y/N]"
    if ($answer -notmatch '^\s*(y|yes)\s*$') { return $false }

    foreach ($procId in $pids) {
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Ok "Killed PID $procId"
        } catch {
            Write-Err "Failed to kill PID $procId -- $($_.Exception.Message)"
        }
    }
    Start-Sleep -Milliseconds 500
    return (-not (Test-PortInUse $port))
}

function Wait-ForUrl($url, $label, $timeoutSec = 120) {
    Write-Info "Waiting for $label ($url) ..."
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
        try {
            Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop | Out-Null
            Write-Ok "$label is ready ($($sw.Elapsed.TotalSeconds.ToString('N0'))s)"
            return $true
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    return $false
}

# -- Database resolution helpers ------------------------------------------
# TcpClient async-connect with an explicit timeout. Test-NetConnection works
# but hangs ~20s on a blocked port, which is exactly the case we fall back on.
function Test-TcpPort([string]$dbHost, [int]$port, [int]$timeoutMs = 3000) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $iar = $client.BeginConnect($dbHost, $port, $null, $null)
        if (-not $iar.AsyncWaitHandle.WaitOne($timeoutMs)) { return $false }
        $client.EndConnect($iar)   # throws if the connect failed
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

# Pulls host/port out of a jdbc:postgresql://host:port/db?... URL.
function Get-JdbcHostPort([string]$url) {
    if ($url -match 'jdbc:postgresql://([^:/]+):(\d+)') {
        return @{ DbHost = $matches[1]; Port = [int]$matches[2] }
    }
    if ($url -match 'jdbc:postgresql://([^:/]+)/') {
        return @{ DbHost = $matches[1]; Port = 5432 }
    }
    return $null
}

function Test-DockerRunning {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try { docker info *> $null; return ($LASTEXITCODE -eq 0) }
    catch { return $false }
    finally { $ErrorActionPreference = $prev }
}

# Brings up the local Postgres container (compose service "postgres", container
# name "edua-postgres") and waits for its healthcheck to pass.
function Start-LocalPostgres {
    Write-Info "Starting local PostgreSQL via Docker Compose ..."
    Push-Location $rootDir
    # docker compose writes progress to stderr; with ErrorActionPreference=Stop
    # that first line would be wrapped as a terminating NativeCommandError and
    # kill the script even though the command is succeeding. Relax it locally.
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        docker compose up -d 2>&1 | ForEach-Object { Write-Info "$_" }
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prevEAP
        Pop-Location
    }
    if ($code -ne 0) { return $false }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt 60) {
        $status = (docker inspect -f '{{.State.Health.Status}}' edua-postgres 2>$null)
        if ($status -eq 'healthy') { return $true }
        Start-Sleep -Seconds 2
    }
    return $false
}

# -- 1. Check ports --------------------------------------------------------
Write-Step "Checking required ports"

$ports = @()
if (-not $SkipBe) { $ports += @{Port=$bePort; Name="Backend (Spring Boot)"} }
if (-not $SkipFe) { $ports += @{Port=$fePort; Name="Frontend (Next.js)"} }

$portErrors = @()
foreach ($p in $ports) {
    if (Test-PortInUse $p.Port) {
        if (Confirm-KillPort $p.Port $p.Name) {
            Write-Ok "Port $($p.Port) ($($p.Name)) is now free"
        } else {
            $procInfo = Get-PortProcessInfo $p.Port
            $portErrors += "  Port $($p.Port) ($($p.Name)) is already in use -- $procInfo"
        }
    }
}

if ($portErrors.Count -gt 0) {
    Write-Err "The following ports are blocked:"
    foreach ($e in $portErrors) { Write-Host $e -ForegroundColor Red }
    Write-Host ""
    Write-Host "  Fix: close the conflicting process or change the port in .env / application.properties" -ForegroundColor Yellow
    exit 1
}
Write-Ok "All ports are free ($(($ports | ForEach-Object { $_.Port }) -join ', '))"

# -- Resolve database (cloud if reachable, else local Docker) --------------
if (-not $SkipBe) {
    Write-Step "Resolving database"

    $useLocal = $false
    $cloudUrl = $env:DB_URL
    # Treat the .env.example placeholder (<host>/<port>) as "not configured".
    $cloudConfigured = $cloudUrl -and ($cloudUrl -notmatch '<host>|<port>')

    if ($cloudConfigured) {
        $hp = Get-JdbcHostPort $cloudUrl
        if ($hp -and (Test-TcpPort $hp.DbHost $hp.Port 3000)) {
            Write-Ok "Cloud DB reachable ($($hp.DbHost):$($hp.Port)) -- using cloud."
        } else {
            $target = if ($hp) { "$($hp.DbHost):$($hp.Port)" } else { "DB_URL" }
            Write-Host "  [WARN] Cloud DB not reachable ($target) -- falling back to local Docker." -ForegroundColor Yellow
            $useLocal = $true
        }
    } else {
        Write-Info "No cloud DB_URL configured -- using local Docker."
        $useLocal = $true
    }

    if ($useLocal) {
        if (-not (Test-DockerRunning)) {
            Write-Err "Docker daemon is not running. Start Docker Desktop and retry (needed for the local fallback DB)."
            exit 1
        }
        if (-not (Start-LocalPostgres)) {
            Write-Err "Local PostgreSQL did not become healthy within 60s. Check 'docker compose logs postgres'."
            exit 1
        }

        $pgPort = if ($env:POSTGRES_PORT)     { $env:POSTGRES_PORT }     else { "5432" }
        $pgDb   = if ($env:POSTGRES_DB)       { $env:POSTGRES_DB }       else { "edua_system" }
        $pgUser = if ($env:POSTGRES_USER)     { $env:POSTGRES_USER }     else { "postgres" }
        $pgPass = if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "postgres" }

        # Override the DB_* vars that Spring Boot reads (and that the BE process
        # inherits below). sslmode is omitted -- local Postgres has no TLS.
        $env:DB_URL      = "jdbc:postgresql://localhost:$pgPort/$pgDb"
        $env:DB_USERNAME = $pgUser
        $env:DB_PASSWORD = $pgPass
        Write-Ok "Local PostgreSQL ready -- $($env:DB_URL)"
    }
}

try {

    # -- 2. Start Backend ---------------------------------------------------
    $beProc = $null
    if (-not $SkipBe) {
        Write-Step "Starting Backend -- Spring Boot (port $bePort)"

        if (-not (Test-Path (Join-Path $beDir $beMvw))) {
            Write-Err "Maven wrapper not found at $beDir/$beMvw"
            Stop-All -Jobs $script:bgJobs -Reason "mvnw not found"
        }

        if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
            Write-Err "Java is not installed or not in PATH. Install JDK 21."
            Stop-All -Jobs $script:bgJobs -Reason "Java not found"
        }
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $javaVer = (java -version 2>&1 | Select-String 'version').ToString()
        $ErrorActionPreference = $prevEAP
        Write-Info "$javaVer"

        $bePsi = New-Object System.Diagnostics.ProcessStartInfo
        $bePsi.FileName               = "cmd.exe"
        # cmd.exe receives an explicit copy of every .env value as well as
        # ProcessStartInfo.EnvironmentVariables. This avoids a stale parent
        # APP_AUTH_JWT_SECRET winning when Maven launches the Java child.
        $cmdEnv = ($loadedEnv.GetEnumerator() | ForEach-Object {
            'set "' + $_.Key + '=' + $_.Value + '"'
        }) -join ' & '
        $bePsi.Arguments             = "/c cd /d `"$beDir`" & $cmdEnv & $beMvw spring-boot:run"
        $bePsi.WorkingDirectory       = $beDir
        $bePsi.UseShellExecute        = $false
        $bePsi.RedirectStandardOutput = $true
        $bePsi.RedirectStandardError  = $true
        $bePsi.CreateNoWindow         = $true

        # Inherit current env vars (includes DB_*, APP_AI_* from .env)
        foreach ($kv in [System.Environment]::GetEnvironmentVariables().GetEnumerator()) {
            if ($kv.Key -notin $bePsi.EnvironmentVariables.Keys) {
                $bePsi.EnvironmentVariables.Add($kv.Key, $kv.Value.ToString())
            }
        }
        # Values explicitly loaded from .env must win over variables inherited
        # from an existing shell (especially APP_AUTH_JWT_SECRET).
        foreach ($entry in $loadedEnv.GetEnumerator()) {
            $bePsi.EnvironmentVariables[$entry.Key] = $entry.Value
        }

        $beProc = [System.Diagnostics.Process]::Start($bePsi)

        # Stream BE output in real-time via async events
        $beOutAction = {
            if ($EventArgs.Data) { Write-Host "  [BE] $($EventArgs.Data)" -ForegroundColor DarkGray }
        }
        $beErrAction = {
            if ($EventArgs.Data) { Write-Host "  [BE] $($EventArgs.Data)" -ForegroundColor DarkRed }
        }
        $script:beOutEvent  = Register-ObjectEvent -InputObject $beProc -EventName OutputDataReceived -Action $beOutAction
        $script:beErrEvent  = Register-ObjectEvent -InputObject $beProc -EventName ErrorDataReceived -Action $beErrAction
        $beProc.BeginOutputReadLine()
        $beProc.BeginErrorReadLine()

        $script:bgJobs += $beProc

        # Wait for BE to respond
        if (-not (Wait-ForUrl "$beUrl/api/health" "Backend" 180)) {
            Write-Err "Backend did not start within 180 seconds."
            Write-Info "Check [BE] logs above for compilation/startup errors."
            Stop-All -Jobs $script:bgJobs -Reason "Backend failed to start"
        }
    }

    # -- 3. Start Frontend -------------------------------------------------
    $feProc = $null
    if (-not $SkipFe) {
        Write-Step "Starting Frontend -- Next.js dev (port $fePort)"

        if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
            Write-Err "npm is not installed or not in PATH. Install Node.js first."
            Stop-All -Jobs $script:bgJobs -Reason "npm not found"
        }

        # Install deps if needed
        $nodeModules = Join-Path $feDir "node_modules"
        if (-not (Test-Path $nodeModules)) {
            Write-Info "Installing frontend dependencies ..."
            Push-Location $feDir
            # npm prints progress/warnings to stderr; with ErrorActionPreference=Stop
            # that first line is wrapped as a terminating NativeCommandError and kills
            # the script even when install succeeds. Relax it locally.
            $prevEAP = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            try {
                npm install 2>&1 | ForEach-Object { Write-Info "$_" }
                $code = $LASTEXITCODE
            } finally {
                $ErrorActionPreference = $prevEAP
                Pop-Location
            }
            if ($code -ne 0) {
                Write-Err "npm install failed (exit code $code)"
                Stop-All -Jobs $script:bgJobs -Reason "npm install failed"
            }
            Write-Ok "Frontend dependencies installed"
        }

        $fePsi = New-Object System.Diagnostics.ProcessStartInfo
        $fePsi.FileName               = "cmd.exe"
        $fePsi.Arguments             = "/c cd /d `"$feDir`" & npm run dev"
        $fePsi.WorkingDirectory       = $feDir
        $fePsi.UseShellExecute        = $false
        $fePsi.RedirectStandardOutput = $true
        $fePsi.RedirectStandardError  = $true
        $fePsi.CreateNoWindow         = $true

        $feProc = [System.Diagnostics.Process]::Start($fePsi)

        # Stream FE output in real-time via async events
        $feOutAction = {
            if ($EventArgs.Data) { Write-Host "  [FE] $($EventArgs.Data)" -ForegroundColor DarkGray }
        }
        $feErrAction = {
            if ($EventArgs.Data) { Write-Host "  [FE] $($EventArgs.Data)" -ForegroundColor DarkRed }
        }
        $script:feOutEvent  = Register-ObjectEvent -InputObject $feProc -EventName OutputDataReceived -Action $feOutAction
        $script:feErrEvent  = Register-ObjectEvent -InputObject $feProc -EventName ErrorDataReceived -Action $feErrAction
        $feProc.BeginOutputReadLine()
        $feProc.BeginErrorReadLine()

        $script:bgJobs += $feProc

        if (-not (Wait-ForUrl $feUrl "Frontend" 60)) {
            Write-Err "Frontend did not start within 60 seconds."
            Write-Info "Check [FE] logs above for errors."
            Stop-All -Jobs $script:bgJobs -Reason "Frontend failed to start"
        }
    }

    # -- 4. Summary ---------------------------------------------------------
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  All services are running!" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green

    if ($env:DB_URL) { Write-Host "  Database:     $($env:DB_URL)" -ForegroundColor White }
    if (-not $SkipBe) { Write-Host "  Backend:      $beUrl" -ForegroundColor White }
    if (-not $SkipFe) { Write-Host "  Frontend:     $feUrl" -ForegroundColor White }

    Write-Host ""
    Write-Host "  Press Ctrl+C to stop all services." -ForegroundColor Yellow
    Write-Host ""

    # Keep script alive -- watch for crashes
    while ($true) {
        Start-Sleep -Seconds 3
        foreach ($proc in $script:bgJobs) {
            if ($proc -and $proc.HasExited) {
                $name = "unknown"
                if ($beProc -and $proc.Id -eq $beProc.Id) { $name = "Backend (Spring Boot)" }
                elseif ($feProc -and $proc.Id -eq $feProc.Id) { $name = "Frontend (Next.js)" }
                Write-Err "$name crashed (exit code $($proc.ExitCode))."
                Stop-All -Jobs $script:bgJobs -Reason "$name crashed"
            }
        }
    }

} catch {
    Write-Err $_.Exception.Message
    Stop-All -Jobs $script:bgJobs -Reason "Unexpected error"
} finally {
    # Runs on normal exit, Ctrl+C, and after Stop-All. If teardown hasn't run
    # yet, this is a Ctrl+C / interrupt -- do the shutdown here.
    if (-not $script:teardownDone) {
        Write-Host ""
        Write-Host "-------------------------------------------------------" -ForegroundColor Yellow
        Write-Host "  Shutting down ..." -ForegroundColor Yellow
        Invoke-Teardown
        Write-Ok "All stopped."
    }

    # Cleanup stream event handlers
    foreach ($evtName in @('beOutEvent','beErrEvent','feOutEvent','feErrEvent')) {
        $evt = Get-Variable -Name $evtName -Scope Script -ErrorAction SilentlyContinue
        if ($evt -and $evt.Value) {
            Unregister-Event -SourceIdentifier $evt.Value.Name -ErrorAction SilentlyContinue
            Set-Variable -Name $evtName -Value $null -Scope Script -ErrorAction SilentlyContinue
        }
    }
    Get-Job | Remove-Job -Force -ErrorAction SilentlyContinue
}
