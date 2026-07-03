#!/usr/bin/env bash
set -Eeuo pipefail

# EDUA Linux/Fedora launcher.
# Starts backend + frontend, using cloud PostgreSQL when reachable and
# Docker Compose PostgreSQL as a local fallback.

SKIP_BE=0
SKIP_FE=0

usage() {
  cat <<'EOF'
Usage: scripts/start-fedora.sh [--skip-be] [--skip-fe]

Options:
  --skip-be, -SkipBe   Skip starting the Spring Boot backend.
  --skip-fe, -SkipFe   Skip starting the Next.js frontend.
  -h, --help           Show this help.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --skip-be|-SkipBe)
      SKIP_BE=1
      ;;
    --skip-fe|-SkipFe)
      SKIP_FE=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage
      exit 2
      ;;
  esac
done

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
BE_DIR="$ROOT_DIR/be"
FE_DIR="$ROOT_DIR/fe"

BE_PORT=8080
FE_PORT=3000
BE_URL="http://localhost:$BE_PORT"
FE_URL="http://localhost:$FE_PORT"

LOG_DIR="${TMPDIR:-/tmp}/edua-start-fedora-$$"
mkdir -p "$LOG_DIR"

BG_PIDS=()
BG_NAMES=()
TAIL_PIDS=()
TEARDOWN_DONE=0

write_step() {
  printf '\n\033[36m>>> %s\033[0m\n' "$1"
}

write_ok() {
  printf '\033[32m  [OK] %s\033[0m\n' "$1"
}

write_warn() {
  printf '\033[33m  [WARN] %s\033[0m\n' "$1"
}

write_err() {
  printf '\n\033[31m  [ERROR] %s\033[0m\n' "$1" >&2
}

write_info() {
  printf '\033[90m    %s\033[0m\n' "$1"
}

require_command() {
  local cmd="$1"
  local hint="${2:-Install it and retry.}"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    write_err "$cmd is not installed or not in PATH. $hint"
    exit 1
  fi
}

trim() {
  local s="$1"
  s="${s%$'\r'}"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

load_env_file() {
  local env_file="$ROOT_DIR/.env"

  if [[ ! -f "$env_file" ]]; then
    write_warn ".env file not found at $ROOT_DIR"
    write_warn "Copy .env.example to .env and fill in your secrets."
    write_warn "Backend will use defaults from application.properties unless local DB fallback is used."
    return
  fi

  write_info "Loading environment from .env"

  local line key val
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" != *"="* ]] && continue

    key="$(trim "${line%%=*}")"
    val="$(trim "${line#*=}")"

    if [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      write_warn "Skipping invalid env key: $key"
      continue
    fi

    if [[ "$val" == \"*\" && "$val" == *\" && ${#val} -ge 2 ]]; then
      val="${val:1:${#val}-2}"
    elif [[ "$val" == \'*\' && "$val" == *\' && ${#val} -ge 2 ]]; then
      val="${val:1:${#val}-2}"
    fi

    export "$key=$val"
  done < "$env_file"

  if [[ -n "${DB_URL:-}" ]]; then
    write_info "Cloud DB configured: $DB_URL"
  else
    write_warn "DB_URL not set in .env - backend will use defaults from application.properties unless local DB fallback is used."
  fi
}

port_lines() {
  local port="$1"
  ss -ltnpH 2>/dev/null | awk -v p=":$port" '$4 ~ p "$" { print }'
}

port_in_use() {
  local port="$1"
  [[ -n "$(port_lines "$port")" ]]
}

port_pids() {
  local port="$1"
  port_lines "$port" | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | sort -u
}

port_process_info() {
  local port="$1"
  local pids=()
  mapfile -t pids < <(port_pids "$port")

  if [[ ${#pids[@]} -eq 0 ]]; then
    port_lines "$port"
    return
  fi

  local pid
  for pid in "${pids[@]}"; do
    ps -p "$pid" -o pid=,comm=,args= 2>/dev/null || printf 'PID %s (process info unavailable)\n' "$pid"
  done
}

confirm_kill_port() {
  local port="$1"
  local name="$2"
  local pids=()
  mapfile -t pids < <(port_pids "$port")

  [[ ${#pids[@]} -eq 0 ]] && return 1
  [[ -t 0 ]] || return 1

  printf '\n'
  write_warn "Port $port ($name) is in use by:"
  port_process_info "$port" | sed 's/^/      /'

  local answer
  read -r -p "  Kill the process(es) above to free port $port? [y/N] " answer
  [[ "$answer" =~ ^[Yy]([Ee][Ss])?$ ]] || return 1

  local pid
  for pid in "${pids[@]}"; do
    if kill "$pid" 2>/dev/null; then
      write_ok "Sent SIGTERM to PID $pid"
    else
      write_warn "Could not terminate PID $pid"
    fi
  done

  sleep 1

  if port_in_use "$port"; then
    for pid in "${pids[@]}"; do
      kill -KILL "$pid" 2>/dev/null || true
    done
    sleep 1
  fi

  ! port_in_use "$port"
}

check_required_ports() {
  write_step "Checking required ports"
  require_command ss "On Fedora: sudo dnf install iproute"

  local errors=()

  if [[ "$SKIP_BE" -eq 0 ]]; then
    if port_in_use "$BE_PORT"; then
      if confirm_kill_port "$BE_PORT" "Backend (Spring Boot)"; then
        write_ok "Port $BE_PORT (Backend) is now free"
      else
        errors+=("Port $BE_PORT (Backend) is already in use: $(port_process_info "$BE_PORT" | tr '\n' '; ')")
      fi
    fi
  fi

  if [[ "$SKIP_FE" -eq 0 ]]; then
    if port_in_use "$FE_PORT"; then
      if confirm_kill_port "$FE_PORT" "Frontend (Next.js)"; then
        write_ok "Port $FE_PORT (Frontend) is now free"
      else
        errors+=("Port $FE_PORT (Frontend) is already in use: $(port_process_info "$FE_PORT" | tr '\n' '; ')")
      fi
    fi
  fi

  if [[ ${#errors[@]} -gt 0 ]]; then
    write_err "The following ports are blocked:"
    local error
    for error in "${errors[@]}"; do
      printf '\033[31m  %s\033[0m\n' "$error" >&2
    done
    printf '\n\033[33m  Fix: close the conflicting process or rerun and allow this script to kill it.\033[0m\n' >&2
    exit 1
  fi

  local checked=()
  [[ "$SKIP_BE" -eq 0 ]] && checked+=("$BE_PORT")
  [[ "$SKIP_FE" -eq 0 ]] && checked+=("$FE_PORT")
  write_ok "All ports are free (${checked[*]})"
}

get_jdbc_host_port() {
  local url="$1"
  JDBC_HOST=""
  JDBC_PORT=""

  if [[ "$url" =~ ^jdbc:postgresql://([^/:?]+):([0-9]+)(/|$|\?) ]]; then
    JDBC_HOST="${BASH_REMATCH[1]}"
    JDBC_PORT="${BASH_REMATCH[2]}"
    return 0
  fi

  if [[ "$url" =~ ^jdbc:postgresql://([^/:?]+)(/|$|\?) ]]; then
    JDBC_HOST="${BASH_REMATCH[1]}"
    JDBC_PORT="5432"
    return 0
  fi

  return 1
}

tcp_port_open() {
  local host="$1"
  local port="$2"
  timeout 3 bash -c ':</dev/tcp/$1/$2' _ "$host" "$port" >/dev/null 2>&1
}

docker_running() {
  docker info >/dev/null 2>&1
}

start_local_postgres() {
  write_info "Starting local PostgreSQL via Docker Compose ..."
  (
    cd "$ROOT_DIR"
    docker compose up -d
  )

  local status
  for _ in {1..30}; do
    status="$(docker inspect -f '{{.State.Health.Status}}' edua-postgres 2>/dev/null || true)"
    if [[ "$status" == "healthy" ]]; then
      return 0
    fi
    sleep 2
  done

  return 1
}

resolve_database() {
  [[ "$SKIP_BE" -eq 1 ]] && return

  write_step "Resolving database"

  local use_local=0
  local cloud_url="${DB_URL:-}"
  local cloud_configured=0

  if [[ -n "$cloud_url" && "$cloud_url" != *"<host>"* && "$cloud_url" != *"<port>"* ]]; then
    cloud_configured=1
  fi

  if [[ "$cloud_configured" -eq 1 ]]; then
    if get_jdbc_host_port "$cloud_url" && tcp_port_open "$JDBC_HOST" "$JDBC_PORT"; then
      write_ok "Cloud DB reachable ($JDBC_HOST:$JDBC_PORT) - using cloud."
    else
      local target="DB_URL"
      [[ -n "${JDBC_HOST:-}" && -n "${JDBC_PORT:-}" ]] && target="$JDBC_HOST:$JDBC_PORT"
      write_warn "Cloud DB not reachable ($target) - falling back to local Docker."
      use_local=1
    fi
  else
    write_info "No cloud DB_URL configured - using local Docker."
    use_local=1
  fi

  if [[ "$use_local" -eq 1 ]]; then
    require_command docker "Install Docker Engine / Docker Desktop and start the daemon."

    if ! docker_running; then
      write_err "Docker daemon is not running. Start Docker and retry."
      exit 1
    fi

    if ! start_local_postgres; then
      write_err "Local PostgreSQL did not become healthy within 60s. Check: docker compose logs postgres"
      exit 1
    fi

    local pg_port="${POSTGRES_PORT:-5432}"
    local pg_db="${POSTGRES_DB:-edua_system}"
    local pg_user="${POSTGRES_USER:-postgres}"
    local pg_pass="${POSTGRES_PASSWORD:-postgres}"

    export DB_URL="jdbc:postgresql://localhost:$pg_port/$pg_db"
    export DB_USERNAME="$pg_user"
    export DB_PASSWORD="$pg_pass"

    write_ok "Local PostgreSQL ready - $DB_URL"
  fi
}

tail_with_prefix() {
  local label="$1"
  local file="$2"

  tail -n +1 -F "$file" 2>/dev/null | while IFS= read -r line; do
    printf '  [%s] %s\n' "$label" "$line"
  done &

  TAIL_PIDS+=("$!")
}

cleanup() {
  [[ "$TEARDOWN_DONE" -eq 1 ]] && return
  TEARDOWN_DONE=1

  local pid

  for pid in "${TAIL_PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done

  for pid in "${BG_PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    fi
  done

  sleep 1

  for pid in "${BG_PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
    fi
  done
}

stop_all() {
  local reason="${1:-}"
  printf '\n\033[33m-------------------------------------------------------\033[0m\n'
  if [[ -n "$reason" ]]; then
    printf '\033[33m  Aborting: %s\033[0m\n' "$reason"
  else
    printf '\033[33m  Shutting down ...\033[0m\n'
  fi
  cleanup
  write_ok "All stopped."
  write_info "Logs: $LOG_DIR"
  exit 1
}

on_interrupt() {
  printf '\n'
  stop_all "Interrupted"
}

trap on_interrupt INT TERM
trap cleanup EXIT

wait_for_url() {
  local url="$1"
  local label="$2"
  local timeout_sec="$3"
  local start now elapsed

  write_info "Waiting for $label ($url) ..."
  start="$(date +%s)"

  while true; do
    if curl -fsS --max-time 3 "$url" >/dev/null 2>&1; then
      now="$(date +%s)"
      elapsed=$((now - start))
      write_ok "$label is ready (${elapsed}s)"
      return 0
    fi

    now="$(date +%s)"
    elapsed=$((now - start))
    [[ "$elapsed" -ge "$timeout_sec" ]] && return 1
    sleep 2
  done
}

start_backend() {
  [[ "$SKIP_BE" -eq 1 ]] && return

  write_step "Starting Backend - Spring Boot (port $BE_PORT)"
  require_command java "Install JDK 21."
  require_command setsid "On Fedora: sudo dnf install util-linux"
  require_command curl "On Fedora: sudo dnf install curl"

  if [[ ! -f "$BE_DIR/mvnw" ]]; then
    write_err "Maven wrapper not found at $BE_DIR/mvnw"
    stop_all "mvnw not found"
  fi

  local java_version
  java_version="$(java -version 2>&1 | awk 'NR == 1 { print }')"
  write_info "$java_version"

  local log_file="$LOG_DIR/backend.log"
  : > "$log_file"

  setsid bash -c 'cd "$1" && exec bash ./mvnw spring-boot:run' _ "$BE_DIR" >>"$log_file" 2>&1 &
  local pid="$!"
  BG_PIDS+=("$pid")
  BG_NAMES+=("Backend (Spring Boot)")
  tail_with_prefix "BE" "$log_file"

  if ! wait_for_url "$BE_URL/api/health" "Backend" 180; then
    write_err "Backend did not start within 180 seconds."
    write_info "Check backend log: $log_file"
    stop_all "Backend failed to start"
  fi
}

start_frontend() {
  [[ "$SKIP_FE" -eq 1 ]] && return

  write_step "Starting Frontend - Next.js dev (port $FE_PORT)"
  require_command npm "Install Node.js/npm first."
  require_command setsid "On Fedora: sudo dnf install util-linux"
  require_command curl "On Fedora: sudo dnf install curl"

  if [[ ! -d "$FE_DIR/node_modules" ]]; then
    write_info "Installing frontend dependencies ..."
    (
      cd "$FE_DIR"
      npm install
    )
    write_ok "Frontend dependencies installed"
  fi

  local log_file="$LOG_DIR/frontend.log"
  : > "$log_file"

  setsid bash -c 'cd "$1" && exec npm run dev' _ "$FE_DIR" >>"$log_file" 2>&1 &
  local pid="$!"
  BG_PIDS+=("$pid")
  BG_NAMES+=("Frontend (Next.js)")
  tail_with_prefix "FE" "$log_file"

  if ! wait_for_url "$FE_URL" "Frontend" 60; then
    write_err "Frontend did not start within 60 seconds."
    write_info "Check frontend log: $log_file"
    stop_all "Frontend failed to start"
  fi
}

monitor_processes() {
  write_info "Logs: $LOG_DIR"

  while true; do
    sleep 3

    local idx pid name code
    for idx in "${!BG_PIDS[@]}"; do
      pid="${BG_PIDS[$idx]}"
      name="${BG_NAMES[$idx]}"

      if ! kill -0 "$pid" 2>/dev/null; then
        set +e
        wait "$pid"
        code="$?"
        set -e
        write_err "$name crashed (exit code $code)."
        stop_all "$name crashed"
      fi
    done
  done
}

main() {
  load_env_file
  check_required_ports
  resolve_database
  start_backend
  start_frontend

  printf '\n\033[32m========================================================\033[0m\n'
  printf '\033[32m  All services are running!\033[0m\n'
  printf '\033[32m========================================================\033[0m\n'
  [[ -n "${DB_URL:-}" ]] && printf '  Database:     %s\n' "$DB_URL"
  [[ "$SKIP_BE" -eq 0 ]] && printf '  Backend:      %s\n' "$BE_URL"
  [[ "$SKIP_FE" -eq 0 ]] && printf '  Frontend:     %s\n' "$FE_URL"
  printf '\n\033[33m  Press Ctrl+C to stop all services.\033[0m\n\n'

  monitor_processes
}

main
