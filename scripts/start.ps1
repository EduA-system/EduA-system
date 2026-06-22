#Requires -Version 5.1
<#
.SYNOPSIS
    All-in-one startup: PostgreSQL (Docker) + Backend + Frontend

.DESCRIPTION
    1. Checks required ports (9118, 8080, 3000) -- aborts if any is in use.
    2. Starts PostgreSQL via docker-compose (waits until healthy).
    3. Installs npm deps for frontend (if needed).
    4. Starts backend (Spring Boot) in background.
    5. Waits for backend to be ready (HTTP /api/health).
    6. Starts frontend dev server (Next.js) in foreground.

.PARAMETER SkipDb
    Skip starting PostgreSQL (assumes it's already running).

.PARAMETER SkipBe
    Skip starting the backend.

.PARAMETER SkipFe
    Skip starting the frontend (only DB + BE).

.EXAMPLE
    pwsh scripts\start.ps1
    pwsh scripts\start.ps1 -SkipDb
    pwsh scripts\start.ps1 -SkipFe
#>

param(
    [switch]$SkipDb,
    [switch]$SkipBe,
    [switch]$SkipFe
)

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# -- Config ---------------------------------------------------------------
$dbPort    = 9118
$bePort    = 8080
$fePort    = 3000

$dbUrl     = "localhost:$dbPort"
$beUrl     = "http://localhost:$bePort"
$feUrl     = "http://localhost:$fePort"

$beDir     = Join-Path $rootDir "be"
$feDir     = Join-Path $rootDir "fe"

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
            # Set the original key as env var (used by docker-compose)
            Set-Item "env:$key" $val
            # Map POSTGRES_* -> DB_* for Spring Boot
            if ($key -eq "POSTGRES_USER")     { $env:DB_USERNAME = $val }
            elseif ($key -eq "POSTGRES_PASSWORD") { $env:DB_PASSWORD = $val }
            elseif ($key -eq "POSTGRES_DB")    { $script:_envDbName = $val }
            elseif ($key -eq "POSTGRES_PORT")  { $script:_envDbPort = $val }
        }
    }
    # Build DB_URL if port/dbname were overridden
    $dbName  = if ($script:_envDbName) { $script:_envDbName } else { "edua_system" }
    $dbPort  = if ($script:_envDbPort) { [int]$script:_envDbPort } else { $dbPort }
    $env:DB_URL = "jdbc:postgresql://localhost:$dbPort/$dbName"
} else {
    Write-Host "  [WARN] .env file not found at $rootDir" -ForegroundColor Yellow
    Write-Host "    Copy .env.example to .env and fill in your secrets." -ForegroundColor Yellow
    Write-Host "    Backend will use default credentials from application.properties." -ForegroundColor Yellow
}

# -- State -----------------------------------------------------------------
$script:bgJobs      = @()
$script:dockerStarted = $false
$script:teardownDone  = $false

# Ctrl+C is handled via the try/finally around the main body: PowerShell runs
# finally blocks on Ctrl+C, which is far more reliable than a .NET
# CancelKeyPress handler (that runs on a runspace-less thread and silently
# fails). Make sure Ctrl+C breaks rather than being read as input.
try { [Console]::TreatControlCAsInput = $false } catch { }

# -- Helpers ---------------------------------------------------------------
# Kills the background BE/FE processes and tears down Docker. Guarded so it
# runs at most once (abort path + finally must not double-teardown).
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
    if ($script:dockerStarted) {
        Write-Info "Stopping Docker containers ..."
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        docker compose -f (Join-Path $rootDir "docker-compose.yml") down 2>$null
        $ErrorActionPreference = $prevEAP
    }
}

function Stop-All {
    param([array]$Jobs, [bool]$DockerWasUp, [string]$Reason)
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

# -- 1. Check ports --------------------------------------------------------
Write-Step "Checking required ports"

$ports = @()
if (-not $SkipDb) { $ports += @{Port=$dbPort; Name="PostgreSQL (Docker)"} }
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

try {

    # -- 2. Start PostgreSQL (Docker) --------------------------------------
    if (-not $SkipDb) {
        Write-Step "Starting PostgreSQL via Docker (port $dbPort)"
        $composeFile = Join-Path $rootDir "docker-compose.yml"

        if (-not (Test-Path $composeFile)) {
            Write-Err "docker-compose.yml not found at $rootDir"
            exit 1
        }

        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
            Write-Err "Docker is not installed or not in PATH. Install Docker Desktop first."
            exit 1
        }

        # Check Docker daemon is running
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Docker daemon is not running. Start Docker Desktop first."
            exit 1
        }

        # Docker outputs pull progress to stderr; use Continue so it
        # doesn't trigger $ErrorActionPreference = "Stop".
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        docker compose -f $composeFile up -d 2>&1 | ForEach-Object { Write-Info "$_" }
        $ErrorActionPreference = $prevEAP

        if ($LASTEXITCODE -ne 0) {
            Write-Err "docker compose up failed (exit code $LASTEXITCODE)"
            exit 1
        }
        $script:dockerStarted = $true
        Write-Ok "Docker containers started"

        # Wait for healthy
        Write-Info "Waiting for PostgreSQL to be healthy ..."
        $dbTimeout = [System.Diagnostics.Stopwatch]::StartNew()
        $dbReady = $false
        while ($dbTimeout.Elapsed.TotalSeconds -lt 60 -and -not $dbReady) {
            Start-Sleep -Seconds 3
            try {
                $status = docker compose -f $composeFile ps --format json 2>$null | ConvertFrom-Json | Where-Object {
                    $_.Service -eq "postgres"
                }
                if ($status -and $status.Health -eq "healthy") {
                    $dbReady = $true
                }
                # Fallback: if no healthcheck support, check if container is running
                if (-not $dbReady -and $status -and $status.State -eq "running" -and $dbTimeout.Elapsed.TotalSeconds -gt 15) {
                    Write-Info "Container is running, checking port connectivity ..."
                    try {
                        $tcp = New-Object System.Net.Sockets.TcpClient("localhost", $dbPort)
                        $tcp.Close()
                        $dbReady = $true
                    } catch {
                        # port not yet open
                    }
                }
            } catch {
                # docker ps parse error -- ignore, retry
            }
        }
        if (-not $dbReady) {
            Write-Err "PostgreSQL did not become healthy within 60 seconds."
            Write-Info "Check logs: docker compose logs postgres"
            Stop-All -Jobs $script:bgJobs -DockerWasUp $script:dockerStarted -Reason "PostgreSQL failed to start"
        }
        Write-Ok "PostgreSQL is healthy on port $dbPort"
    }

    # -- 3. Start Backend ---------------------------------------------------
    $beProc = $null
    if (-not $SkipBe) {
        Write-Step "Starting Backend -- Spring Boot (port $bePort)"

        if (-not (Test-Path (Join-Path $beDir $beMvw))) {
            Write-Err "Maven wrapper not found at $beDir/$beMvw"
            Stop-All -Jobs $script:bgJobs -DockerWasUp $script:dockerStarted -Reason "mvnw not found"
        }

        if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
            Write-Err "Java is not installed or not in PATH. Install JDK 21."
            Stop-All -Jobs $script:bgJobs -DockerWasUp $script:dockerStarted -Reason "Java not found"
        }
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $javaVer = (java -version 2>&1 | Select-String 'version').ToString()
        $ErrorActionPreference = $prevEAP
        Write-Info "$javaVer"

        $bePsi = New-Object System.Diagnostics.ProcessStartInfo
        $bePsi.FileName               = "cmd.exe"
        $bePsi.Arguments             = "/c cd /d `"$beDir`" & $beMvw spring-boot:run"
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
            Stop-All -Jobs $script:bgJobs -DockerWasUp $script:dockerStarted -Reason "Backend failed to start"
        }
    }

    # -- 4. Start Frontend -------------------------------------------------
    $feProc = $null
    if (-not $SkipFe) {
        Write-Step "Starting Frontend -- Next.js dev (port $fePort)"

        if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
            Write-Err "npm is not installed or not in PATH. Install Node.js first."
            Stop-All -Jobs $script:bgJobs -DockerWasUp $script:dockerStarted -Reason "npm not found"
        }

        # Install deps if needed
        $nodeModules = Join-Path $feDir "node_modules"
        if (-not (Test-Path $nodeModules)) {
            Write-Info "Installing frontend dependencies ..."
            Push-Location $feDir
            try {
                npm install 2>&1 | ForEach-Object { Write-Info $_ }
                if ($LASTEXITCODE -ne 0) {
                    Write-Err "npm install failed (exit code $LASTEXITCODE)"
                    Stop-All -Jobs $script:bgJobs -DockerWasUp $script:dockerStarted -Reason "npm install failed"
                }
                Write-Ok "Frontend dependencies installed"
            } finally {
                Pop-Location
            }
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
            Stop-All -Jobs $script:bgJobs -DockerWasUp $script:dockerStarted -Reason "Frontend failed to start"
        }
    }

    # -- 5. Summary ---------------------------------------------------------
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  All services are running!" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green

    if (-not $SkipDb) { Write-Host "  PostgreSQL:   $dbUrl" -ForegroundColor White }
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
                Stop-All -Jobs $script:bgJobs -DockerWasUp $script:dockerStarted -Reason "$name crashed"
            }
        }
    }

} catch {
    Write-Err $_.Exception.Message
    Stop-All -Jobs $script:bgJobs -DockerWasUp $script:dockerStarted -Reason "Unexpected error"
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
