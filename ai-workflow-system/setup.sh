#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# 🛠️  AI MULTI-AGENT SYSTEM - SETUP SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🤖 AI Multi-Agent Development System - Setup"
echo "============================================="
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# CHECK PREREQUISITES
# ═══════════════════════════════════════════════════════════════════════════════

echo "📋 Checking prerequisites..."

# Check OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  ✅ macOS detected"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "  ✅ Linux detected"
else
    echo "  ⚠️  Unsupported OS: $OSTYPE"
    echo "     This system is optimized for macOS/Linux"
fi

# Check Bash version
BASH_VERSION_NUM=$(echo "${BASH_VERSION}" | cut -d'.' -f1)
if [[ $BASH_VERSION_NUM -ge 4 ]]; then
    echo "  ✅ Bash version: ${BASH_VERSION}"
else
    echo "  ⚠️  Bash version ${BASH_VERSION} detected"
    echo "     Version 4+ recommended for full functionality"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# INSTALL DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "📦 Checking dependencies..."

install_with_brew() {
    local pkg=$1
    if command -v brew &> /dev/null; then
        echo "  Installing $pkg with Homebrew..."
        brew install "$pkg"
    else
        echo "  ❌ Homebrew not found. Please install $pkg manually."
        return 1
    fi
}

# Check jq
if command -v jq &> /dev/null; then
    echo "  ✅ jq $(jq --version)"
else
    echo "  ❌ jq not found"
    read -p "     Install jq? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_with_brew jq
    fi
fi

# Check yq (optional)
if command -v yq &> /dev/null; then
    echo "  ✅ yq $(yq --version 2>/dev/null | head -1)"
else
    echo "  ⚠️  yq not found (optional, for YAML processing)"
fi

# Check Claude Code
if command -v claude &> /dev/null; then
    echo "  ✅ Claude Code CLI found"
else
    echo "  ⚠️  Claude Code CLI not found"
    echo "     The system will save prompts for manual execution"
    echo "     Install Claude Code from: https://claude.ai/code"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# CREATE DIRECTORY STRUCTURE
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "📁 Creating directory structure..."

mkdir -p "${SCRIPT_DIR}/.ai-workflow/state"
mkdir -p "${SCRIPT_DIR}/.ai-workflow/logs"
mkdir -p "${SCRIPT_DIR}/.ai-workflow/checkpoints"
mkdir -p "${SCRIPT_DIR}/.ai-workflow/cache"
mkdir -p "${SCRIPT_DIR}/src"
mkdir -p "${SCRIPT_DIR}/tests"
mkdir -p "${SCRIPT_DIR}/docs"

echo "  ✅ Directories created"

# ═══════════════════════════════════════════════════════════════════════════════
# VERIFY SETUP
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "🔍 Verifying setup..."

# Check orchestrator script
if [[ -x "${SCRIPT_DIR}/orchestrator.sh" ]]; then
    echo "  ✅ orchestrator.sh is executable"
else
    chmod +x "${SCRIPT_DIR}/orchestrator.sh"
    echo "  ✅ orchestrator.sh made executable"
fi

# Check config file
if [[ -f "${SCRIPT_DIR}/.ai-workflow/config.yaml" ]]; then
    echo "  ✅ config.yaml exists"
else
    echo "  ❌ config.yaml not found"
fi

# Check prompts
PROMPT_COUNT=$(ls -1 "${SCRIPT_DIR}/.ai-workflow/prompts/"*.md 2>/dev/null | wc -l | tr -d ' ')
echo "  ✅ ${PROMPT_COUNT} agent prompts found"

# ═══════════════════════════════════════════════════════════════════════════════
# DISPLAY SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "✅ Setup Complete!"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Directory structure:"
echo "  ${SCRIPT_DIR}/"
echo "  ├── orchestrator.sh          # Main orchestration script"
echo "  ├── setup.sh                  # This setup script"
echo "  ├── .ai-workflow/"
echo "  │   ├── config.yaml           # System configuration"
echo "  │   ├── prompts/              # Agent system prompts"
echo "  │   ├── state/                # Workflow state files"
echo "  │   ├── logs/                 # Execution logs"
echo "  │   ├── checkpoints/          # Recovery checkpoints"
echo "  │   └── cache/                # Response cache"
echo "  ├── src/                      # Generated source code"
echo "  ├── tests/                    # Generated tests"
echo "  └── docs/                     # Generated documentation"
echo ""
echo "Quick Start:"
echo "  1. Run the full workflow:"
echo "     ./orchestrator.sh \"Your project description\""
echo ""
echo "  2. Run in interactive mode:"
echo "     ./orchestrator.sh -i"
echo ""
echo "  3. Run a specific agent:"
echo "     ./orchestrator.sh -a product_manager"
echo ""
echo "  4. Get help:"
echo "     ./orchestrator.sh --help"
echo ""
echo "Available agents:"
echo "  📋 product_manager    - Creates specifications and user stories"
echo "  🏗️  architect          - Designs system architecture"
echo "  🎨 frontend_developer - Implements React UI"
echo "  ⚙️  backend_developer  - Implements API and database"
echo "  🚀 devops             - Configures CI/CD and deployment"
echo "  🧪 qa_tester          - Creates automated tests"
echo "  🔍 code_reviewer      - Reviews code quality"
echo "  🔗 integration        - Final assembly and validation"
echo ""
