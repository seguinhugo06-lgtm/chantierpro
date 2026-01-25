#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# 🤖 AI MULTI-AGENT ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════════
# Description: Coordonne plusieurs instances de Claude Code pour créer des
#              applications complètes de manière automatisée
# Usage: ./orchestrator.sh "Votre description de projet"
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKFLOW_DIR="${SCRIPT_DIR}/.ai-workflow"
STATE_DIR="${WORKFLOW_DIR}/state"
LOGS_DIR="${WORKFLOW_DIR}/logs"
CHECKPOINTS_DIR="${WORKFLOW_DIR}/checkpoints"
PROMPTS_DIR="${WORKFLOW_DIR}/prompts"
CONFIG_FILE="${WORKFLOW_DIR}/config.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emojis for agents
declare -A AGENT_EMOJIS=(
    [product_manager]="📋"
    [architect]="🏗️"
    [frontend_developer]="🎨"
    [backend_developer]="⚙️"
    [devops]="🚀"
    [qa_tester]="🧪"
    [code_reviewer]="🔍"
    [integration]="🔗"
)

# Agent execution order
AGENT_ORDER=(
    "product_manager"
    "architect"
    "frontend_developer"
    "backend_developer"
    "devops"
    "qa_tester"
    "code_reviewer"
    "integration"
)

# ═══════════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${BLUE}[${timestamp}]${NC} ${GREEN}[INFO]${NC} $message"
            ;;
        "WARN")
            echo -e "${BLUE}[${timestamp}]${NC} ${YELLOW}[WARN]${NC} $message"
            ;;
        "ERROR")
            echo -e "${BLUE}[${timestamp}]${NC} ${RED}[ERROR]${NC} $message"
            ;;
        "AGENT")
            echo -e "${BLUE}[${timestamp}]${NC} ${PURPLE}[AGENT]${NC} $message"
            ;;
        *)
            echo -e "${BLUE}[${timestamp}]${NC} $message"
            ;;
    esac
    
    # Also log to file
    mkdir -p "${LOGS_DIR}"
    echo "[${timestamp}] [$level] $message" >> "${LOGS_DIR}/orchestrator.log"
}

print_banner() {
    echo -e "${CYAN}"
    cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🤖  AI MULTI-AGENT DEVELOPMENT SYSTEM                                       ║
║                                                                               ║
║   Orchestrating: Product Manager → Architect → Developers → QA → Integration ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

print_phase() {
    local phase_name=$1
    local phase_num=$2
    echo ""
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}  PHASE ${phase_num}: ${phase_name}${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# INITIALIZATION
# ═══════════════════════════════════════════════════════════════════════════════

init_workspace() {
    log "INFO" "Initializing workspace..."
    
    # Create directories
    mkdir -p "$STATE_DIR"
    mkdir -p "$LOGS_DIR"
    mkdir -p "$CHECKPOINTS_DIR"
    mkdir -p "${SCRIPT_DIR}/src"
    mkdir -p "${SCRIPT_DIR}/tests"
    mkdir -p "${SCRIPT_DIR}/docs"
    
    # Generate workflow ID
    local workflow_id="wf-$(date +%s)-$$"
    
    # Initialize state
    cat > "${STATE_DIR}/workflow_state.json" << EOF
{
  "workflow_id": "${workflow_id}",
  "started_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "current_phase": "init",
  "current_agent": null,
  "completed_agents": [],
  "failed_agents": [],
  "status": "running",
  "user_request": ""
}
EOF
    
    log "INFO" "Workspace initialized with ID: ${workflow_id}"
}

check_dependencies() {
    log "INFO" "Checking dependencies..."
    
    local missing_deps=()
    
    # Check for jq (JSON processing)
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    # Check if Claude Code is available
    # Adjust this based on your Claude Code installation
    if ! command -v claude &> /dev/null; then
        log "WARN" "Claude Code CLI 'claude' not found in PATH"
        log "INFO" "Will use alternative invocation method"
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log "ERROR" "Missing dependencies: ${missing_deps[*]}"
        log "INFO" "Install with: brew install ${missing_deps[*]}"
        exit 1
    fi
    
    log "INFO" "All dependencies satisfied"
}

# ═══════════════════════════════════════════════════════════════════════════════
# AGENT EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

build_agent_context() {
    local agent_name=$1
    local context=""
    
    case $agent_name in
        "product_manager")
            context="USER REQUEST:\n${USER_REQUEST}\n"
            ;;
        "architect")
            if [[ -f "${STATE_DIR}/specs.json" ]]; then
                context+="SPECIFICATIONS:\n$(cat "${STATE_DIR}/specs.json")\n\n"
            fi
            if [[ -f "${STATE_DIR}/user_stories.json" ]]; then
                context+="USER STORIES:\n$(cat "${STATE_DIR}/user_stories.json")\n"
            fi
            ;;
        "frontend_developer"|"backend_developer"|"devops")
            if [[ -f "${STATE_DIR}/architecture.json" ]]; then
                context+="ARCHITECTURE:\n$(cat "${STATE_DIR}/architecture.json")\n\n"
            fi
            if [[ -f "${STATE_DIR}/tech_stack.json" ]]; then
                context+="TECH STACK:\n$(cat "${STATE_DIR}/tech_stack.json")\n\n"
            fi
            if [[ -f "${STATE_DIR}/api_design.json" ]]; then
                context+="API DESIGN:\n$(cat "${STATE_DIR}/api_design.json")\n"
            fi
            ;;
        "qa_tester")
            if [[ -f "${STATE_DIR}/user_stories.json" ]]; then
                context+="USER STORIES:\n$(cat "${STATE_DIR}/user_stories.json")\n\n"
            fi
            if [[ -f "${STATE_DIR}/acceptance_criteria.json" ]]; then
                context+="ACCEPTANCE CRITERIA:\n$(cat "${STATE_DIR}/acceptance_criteria.json")\n"
            fi
            ;;
        "code_reviewer")
            context="Review all code in src/ and tests/ directories.\n"
            if [[ -f "${STATE_DIR}/test_report.json" ]]; then
                context+="TEST REPORT:\n$(cat "${STATE_DIR}/test_report.json")\n"
            fi
            ;;
        "integration")
            context="Integrate all modules and prepare for deployment.\n"
            if [[ -f "${STATE_DIR}/review_report.json" ]]; then
                context+="REVIEW REPORT:\n$(cat "${STATE_DIR}/review_report.json")\n"
            fi
            ;;
    esac
    
    echo -e "$context"
}

run_agent() {
    local agent_name=$1
    local emoji="${AGENT_EMOJIS[$agent_name]:-🤖}"
    local prompt_file="${PROMPTS_DIR}/${agent_name}.md"
    local start_time=$(date +%s)
    local max_retries=3
    local retry_count=0
    
    log "AGENT" "${emoji} Starting ${agent_name}..."
    
    # Update state
    jq --arg agent "$agent_name" '.current_agent = $agent' \
        "${STATE_DIR}/workflow_state.json" > "${STATE_DIR}/tmp.json" && \
        mv "${STATE_DIR}/tmp.json" "${STATE_DIR}/workflow_state.json"
    
    # Check if prompt file exists
    if [[ ! -f "$prompt_file" ]]; then
        log "ERROR" "Prompt file not found: $prompt_file"
        return 1
    fi
    
    # Read the system prompt
    local system_prompt=$(cat "$prompt_file")
    
    # Build context
    local context=$(build_agent_context "$agent_name")
    
    # Create the full prompt
    local full_prompt="${system_prompt}

═══════════════════════════════════════════════════════════════════════════════
CURRENT CONTEXT
═══════════════════════════════════════════════════════════════════════════════

${context}

═══════════════════════════════════════════════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

Execute your role as defined above.
- Create all necessary files in the appropriate directories
- Output your results in the format specified in your prompt
- Save any JSON outputs to the ${STATE_DIR}/ directory
- Report any issues or blockers immediately

Working directory: ${SCRIPT_DIR}
State directory: ${STATE_DIR}

Begin your work now."

    # Save the prompt for debugging
    echo "$full_prompt" > "${LOGS_DIR}/${agent_name}_prompt.md"
    
    # Execute with retries
    while [[ $retry_count -lt $max_retries ]]; do
        log "INFO" "Executing ${agent_name} (attempt $((retry_count + 1))/${max_retries})..."
        
        # Execute Claude Code
        # Option 1: Using claude CLI if available
        if command -v claude &> /dev/null; then
            if claude --print "$full_prompt" > "${LOGS_DIR}/${agent_name}_output.log" 2>&1; then
                break
            fi
        # Option 2: Using alternative method (edit based on your setup)
        else
            # Save prompt for manual execution
            log "INFO" "Claude CLI not found. Saving prompt for manual execution."
            echo "$full_prompt" > "${LOGS_DIR}/${agent_name}_execute_me.md"
            log "INFO" "Execute the prompt in: ${LOGS_DIR}/${agent_name}_execute_me.md"
            
            # For demo purposes, simulate success
            echo "Agent ${agent_name} prompt saved. Manual execution required." > "${LOGS_DIR}/${agent_name}_output.log"
            break
        fi
        
        retry_count=$((retry_count + 1))
        if [[ $retry_count -lt $max_retries ]]; then
            log "WARN" "Retry in 5 seconds..."
            sleep 5
        fi
    done
    
    if [[ $retry_count -eq $max_retries ]]; then
        log "ERROR" "${emoji} ${agent_name} failed after ${max_retries} attempts"
        
        # Update state with failure
        jq --arg agent "$agent_name" '.failed_agents += [$agent]' \
            "${STATE_DIR}/workflow_state.json" > "${STATE_DIR}/tmp.json" && \
            mv "${STATE_DIR}/tmp.json" "${STATE_DIR}/workflow_state.json"
        
        return 1
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "AGENT" "${emoji} ${agent_name} completed in ${duration}s"
    
    # Update state - mark agent as completed
    jq --arg agent "$agent_name" '.completed_agents += [$agent]' \
        "${STATE_DIR}/workflow_state.json" > "${STATE_DIR}/tmp.json" && \
        mv "${STATE_DIR}/tmp.json" "${STATE_DIR}/workflow_state.json"
    
    # Create checkpoint
    create_checkpoint "$agent_name"
    
    return 0
}

# ═══════════════════════════════════════════════════════════════════════════════
# CHECKPOINT MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

create_checkpoint() {
    local agent_name=$1
    local checkpoint_id="chk-${agent_name}-$(date +%s)"
    local checkpoint_dir="${CHECKPOINTS_DIR}/${checkpoint_id}"
    
    log "INFO" "Creating checkpoint: ${checkpoint_id}"
    
    mkdir -p "$checkpoint_dir"
    
    # Copy current state
    cp -r "${STATE_DIR}"/* "${checkpoint_dir}/" 2>/dev/null || true
    
    # Copy source files if they exist
    if [[ -d "${SCRIPT_DIR}/src" ]] && [[ "$(ls -A ${SCRIPT_DIR}/src 2>/dev/null)" ]]; then
        cp -r "${SCRIPT_DIR}/src" "${checkpoint_dir}/"
    fi
    
    # Create checkpoint metadata
    cat > "${checkpoint_dir}/checkpoint.json" << EOF
{
  "checkpoint_id": "${checkpoint_id}",
  "agent": "${agent_name}",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    
    log "INFO" "Checkpoint created: ${checkpoint_id}"
}

restore_checkpoint() {
    local checkpoint_id=$1
    local checkpoint_dir="${CHECKPOINTS_DIR}/${checkpoint_id}"
    
    if [[ ! -d "$checkpoint_dir" ]]; then
        log "ERROR" "Checkpoint not found: ${checkpoint_id}"
        return 1
    fi
    
    log "INFO" "Restoring checkpoint: ${checkpoint_id}"
    
    # Restore state
    cp "${checkpoint_dir}"/*.json "${STATE_DIR}/" 2>/dev/null || true
    
    # Restore source files
    if [[ -d "${checkpoint_dir}/src" ]]; then
        cp -r "${checkpoint_dir}/src" "${SCRIPT_DIR}/"
    fi
    
    log "INFO" "Checkpoint restored: ${checkpoint_id}"
}

list_checkpoints() {
    echo -e "${CYAN}Available checkpoints:${NC}"
    echo ""
    
    if [[ ! -d "${CHECKPOINTS_DIR}" ]] || [[ -z "$(ls -A ${CHECKPOINTS_DIR} 2>/dev/null)" ]]; then
        echo "  No checkpoints found."
        return
    fi
    
    for checkpoint_dir in "${CHECKPOINTS_DIR}"/chk-*; do
        if [[ -d "$checkpoint_dir" ]]; then
            local checkpoint_id=$(basename "$checkpoint_dir")
            local metadata="${checkpoint_dir}/checkpoint.json"
            
            if [[ -f "$metadata" ]]; then
                local agent=$(jq -r '.agent' "$metadata" 2>/dev/null || echo "unknown")
                local created=$(jq -r '.created_at' "$metadata" 2>/dev/null || echo "unknown")
                echo "  - ${checkpoint_id} (${agent}) - ${created}"
            fi
        fi
    done
}

# ═══════════════════════════════════════════════════════════════════════════════
# WORKFLOW PHASES
# ═══════════════════════════════════════════════════════════════════════════════

run_phase_analysis() {
    print_phase "ANALYSIS" "1"
    run_agent "product_manager"
}

run_phase_design() {
    print_phase "DESIGN" "2"
    run_agent "architect"
}

run_phase_development() {
    print_phase "DEVELOPMENT" "3"
    
    # Run development agents sequentially
    # (Can be parallelized in advanced version)
    run_agent "frontend_developer"
    run_agent "backend_developer"
    run_agent "devops"
}

run_phase_quality() {
    print_phase "QUALITY" "4"
    run_agent "qa_tester"
    run_agent "code_reviewer"
}

run_phase_integration() {
    print_phase "INTEGRATION" "5"
    run_agent "integration"
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN WORKFLOW
# ═══════════════════════════════════════════════════════════════════════════════

run_full_workflow() {
    local start_time=$(date +%s)
    
    print_banner
    
    log "INFO" "Starting full workflow..."
    log "INFO" "User request: ${USER_REQUEST}"
    
    # Save user request to state
    jq --arg req "$USER_REQUEST" '.user_request = $req' \
        "${STATE_DIR}/workflow_state.json" > "${STATE_DIR}/tmp.json" && \
        mv "${STATE_DIR}/tmp.json" "${STATE_DIR}/workflow_state.json"
    
    # Run all phases
    run_phase_analysis || { log "ERROR" "Analysis phase failed"; return 1; }
    run_phase_design || { log "ERROR" "Design phase failed"; return 1; }
    run_phase_development || { log "ERROR" "Development phase failed"; return 1; }
    run_phase_quality || { log "ERROR" "Quality phase failed"; return 1; }
    run_phase_integration || { log "ERROR" "Integration phase failed"; return 1; }
    
    # Update final state
    jq '.status = "completed" | .current_phase = "done"' \
        "${STATE_DIR}/workflow_state.json" > "${STATE_DIR}/tmp.json" && \
        mv "${STATE_DIR}/tmp.json" "${STATE_DIR}/workflow_state.json"
    
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                               ║${NC}"
    echo -e "${GREEN}║   ✅  WORKFLOW COMPLETED SUCCESSFULLY                                         ║${NC}"
    echo -e "${GREEN}║                                                                               ║${NC}"
    printf "${GREEN}║   Total time: %-60s ║${NC}\n" "${total_duration} seconds"
    echo -e "${GREEN}║                                                                               ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log "INFO" "Workflow completed in ${total_duration} seconds"
}

# ═══════════════════════════════════════════════════════════════════════════════
# INTERACTIVE MODE
# ═══════════════════════════════════════════════════════════════════════════════

run_interactive() {
    print_banner
    
    echo -e "${CYAN}Interactive Mode - Run agents step by step${NC}"
    echo ""
    echo "Available commands:"
    echo "  run <agent>     - Run a specific agent"
    echo "  list agents     - List all agents"
    echo "  status          - Show current workflow status"
    echo "  checkpoints     - List available checkpoints"
    echo "  restore <id>    - Restore a checkpoint"
    echo "  full            - Run full workflow"
    echo "  help            - Show this help"
    echo "  exit            - Exit interactive mode"
    echo ""
    
    while true; do
        echo -n -e "${YELLOW}orchestrator> ${NC}"
        read -r cmd args
        
        case $cmd in
            "run")
                if [[ -n "$args" ]]; then
                    run_agent "$args"
                else
                    echo "Usage: run <agent_name>"
                    echo "Use 'list agents' to see available agents"
                fi
                ;;
            "list")
                if [[ "$args" == "agents" ]]; then
                    echo -e "${CYAN}Available agents:${NC}"
                    for agent in "${AGENT_ORDER[@]}"; do
                        echo "  ${AGENT_EMOJIS[$agent]} $agent"
                    done
                else
                    echo "Usage: list agents"
                fi
                ;;
            "status")
                echo ""
                if [[ -f "${STATE_DIR}/workflow_state.json" ]]; then
                    cat "${STATE_DIR}/workflow_state.json" | jq '.'
                else
                    echo "No workflow state found"
                fi
                echo ""
                ;;
            "checkpoints")
                list_checkpoints
                ;;
            "restore")
                if [[ -n "$args" ]]; then
                    restore_checkpoint "$args"
                else
                    echo "Usage: restore <checkpoint_id>"
                fi
                ;;
            "full")
                run_full_workflow
                ;;
            "help")
                echo ""
                echo "Commands:"
                echo "  run <agent>     - Run a specific agent"
                echo "  list agents     - List all agents"
                echo "  status          - Show current workflow status"
                echo "  checkpoints     - List available checkpoints"
                echo "  restore <id>    - Restore a checkpoint"
                echo "  full            - Run full workflow"
                echo "  exit            - Exit interactive mode"
                echo ""
                ;;
            "exit"|"quit"|"q")
                log "INFO" "Exiting interactive mode"
                exit 0
                ;;
            "")
                # Empty input, just continue
                ;;
            *)
                echo "Unknown command: $cmd"
                echo "Type 'help' for available commands"
                ;;
        esac
    done
}

# ═══════════════════════════════════════════════════════════════════════════════
# HELP
# ═══════════════════════════════════════════════════════════════════════════════

show_help() {
    cat << 'EOF'
AI Multi-Agent Orchestrator
============================

Usage: ./orchestrator.sh [OPTIONS] [USER_REQUEST]

Options:
  -h, --help          Show this help message
  -i, --interactive   Run in interactive mode
  -a, --agent NAME    Run a specific agent only
  -r, --restore ID    Restore from checkpoint
  -s, --status        Show current workflow status
  -l, --list          List available checkpoints

Examples:
  ./orchestrator.sh "Create a todo app with authentication"
  ./orchestrator.sh -i
  ./orchestrator.sh -a frontend_developer
  ./orchestrator.sh -r chk-architect-1234567890

Agents (in execution order):
  📋 product_manager    - Analyzes requirements, creates specs
  🏗️  architect          - Designs architecture, tech stack
  🎨 frontend_developer - Implements UI/UX
  ⚙️  backend_developer  - Implements API, database
  🚀 devops             - Configures CI/CD, deployment
  🧪 qa_tester          - Creates tests
  🔍 code_reviewer      - Reviews code quality
  🔗 integration        - Assembles and validates

Workflow Phases:
  1. Analysis     - Product Manager creates specs
  2. Design       - Architect designs architecture
  3. Development  - Frontend, Backend, DevOps work in parallel
  4. Quality      - QA creates tests, Code Review validates
  5. Integration  - Final assembly and validation

EOF
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

main() {
    # Parse arguments
    local INTERACTIVE=false
    local SINGLE_AGENT=""
    local RESTORE_CHECKPOINT=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -i|--interactive)
                INTERACTIVE=true
                shift
                ;;
            -a|--agent)
                SINGLE_AGENT="$2"
                shift 2
                ;;
            -r|--restore)
                RESTORE_CHECKPOINT="$2"
                shift 2
                ;;
            -s|--status)
                if [[ -f "${STATE_DIR}/workflow_state.json" ]]; then
                    cat "${STATE_DIR}/workflow_state.json" | jq '.'
                else
                    echo "No workflow state found"
                fi
                exit 0
                ;;
            -l|--list)
                list_checkpoints
                exit 0
                ;;
            -*)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
            *)
                USER_REQUEST="$1"
                shift
                ;;
        esac
    done
    
    # Export USER_REQUEST for use in functions
    export USER_REQUEST
    
    # Check dependencies
    check_dependencies
    
    # Initialize workspace
    init_workspace
    
    # Handle restore
    if [[ -n "$RESTORE_CHECKPOINT" ]]; then
        restore_checkpoint "$RESTORE_CHECKPOINT"
    fi
    
    # Handle modes
    if [[ "$INTERACTIVE" == true ]]; then
        run_interactive
    elif [[ -n "$SINGLE_AGENT" ]]; then
        if [[ -z "$USER_REQUEST" ]] && [[ -f "${STATE_DIR}/workflow_state.json" ]]; then
            USER_REQUEST=$(jq -r '.user_request // ""' "${STATE_DIR}/workflow_state.json")
            export USER_REQUEST
        fi
        run_agent "$SINGLE_AGENT"
    elif [[ -n "$USER_REQUEST" ]]; then
        run_full_workflow
    else
        show_help
        exit 1
    fi
}

# Run main
main "$@"
