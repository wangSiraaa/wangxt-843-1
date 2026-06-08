#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_header() {
    echo ""
    echo "======================================================================"
    echo -e "${CYAN}🚀 $1${NC}"
    echo "======================================================================"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_fail() {
    echo -e "${RED}❌ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info() {
    echo "   ℹ️  $1"
}

check_node_modules() {
    log_header "检查依赖环境"
    
    if [ ! -d "${PROJECT_ROOT}/node_modules" ]; then
        log_warn "node_modules 不存在，正在安装依赖..."
        cd "${PROJECT_ROOT}"
        npm install
        log_success "依赖安装完成"
    else
        log_success "依赖已存在"
    fi
}

check_tsx() {
    log_header "检查测试运行器"
    
    if ! npx --no-install tsx --version >/dev/null 2>&1; then
        log_warn "tsx 未安装，正在安装..."
        cd "${PROJECT_ROOT}"
        npm install --save-dev tsx
        log_success "tsx 安装完成"
    else
        log_success "tsx 已就绪"
    fi
}

run_business_assertions() {
    log_header "执行业务断言 (核心测试场景)"
    
    echo ""
    echo "📋 测试场景:"
    echo "   1️⃣  满员站点候补，余量不增加"
    echo "   2️⃣  管理员切换到司机视图，直接看到签到名单"
    echo "   3️⃣  视图切换时Tab自动重置"
    echo ""
    
    cd "${PROJECT_ROOT}"
    
    set +e
    npx tsx "${SCRIPT_DIR}/smokeAssertions.ts"
    TEST_EXIT_CODE=$?
    set -e
    
    if [ ${TEST_EXIT_CODE} -eq 0 ]; then
        log_success "所有业务断言通过！"
        return 0
    else
        log_fail "业务断言失败，请检查代码逻辑"
        return ${TEST_EXIT_CODE}
    fi
}

verify_browser_accessible() {
    log_header "验证浏览器可访问性 (可选)"
    
    local PORT=5182
    local URL="http://localhost:${PORT}"
    
    if curl -s -o /dev/null -w "%{http_code}" "${URL}" | grep -q "200"; then
        log_success "开发服务器运行正常: ${URL}"
        
        local DRIVER_URL="${URL}/?viewMode=driver"
        log_info "司机视图链接: ${DRIVER_URL}"
        
        local ADMIN_URL="${URL}/?viewMode=admin"
        log_info "管理员视图链接: ${ADMIN_URL}"
        
        return 0
    else
        log_warn "开发服务器未在端口 ${PORT} 运行"
        log_info "启动命令: cd ${PROJECT_ROOT} && npm run dev"
        return 1
    fi
}

print_summary() {
    local exit_code=$1
    
    echo ""
    echo "======================================================================"
    echo "📊 Smoke Test 总结"
    echo "======================================================================"
    
    if [ ${exit_code} -eq 0 ]; then
        echo -e "${GREEN}🎉 所有测试通过！${NC}"
        echo ""
        echo "✅ 核心业务逻辑验证:"
        echo "   1. 满员站点报名后进入候补"
        echo "   2. 站点余量保持为0，不增加"
        echo "   3. 候补不占用容量"
        echo "   4. 管理员切司机后日期重置为今天"
        echo "   5. 司机直接看到当天签到名单"
        echo "   6. 司机名单只显示已确认乘客"
    else
        echo -e "${RED}❌ 测试失败${NC}"
        echo "   请检查上面的错误信息并修复问题"
    fi
    
    echo ""
    echo "📁 测试文件位置:"
    echo "   - Shell 脚本: ${SCRIPT_DIR}/smoke.sh"
    echo "   - 业务断言: ${SCRIPT_DIR}/smokeAssertions.ts"
    echo ""
}

main() {
    echo ""
    echo "  ╔══════════════════════════════════════════════════════════════╗"
    echo "  ║         企业班车乘车名单系统 - Smoke Test 套件               ║"
    echo "  ║                                                              ║"
    echo "  ║  覆盖场景:                                                   ║"
    echo "  ║    ✨ 满员候补余量不增加                                     ║"
    echo "  ║    👨✈️  管理员切司机后直接看到签到名单                       ║"
    echo "  ║    🔄 视图切换Tab自动重置                                    ║"
    echo "  ╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    local exit_code=0
    
    check_node_modules || exit_code=$?
    check_tsx || exit_code=$?
    run_business_assertions || exit_code=$?
    verify_browser_accessible || true
    
    print_summary ${exit_code}
    
    exit ${exit_code}
}

main "$@"
