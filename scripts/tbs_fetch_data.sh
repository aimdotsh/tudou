#!/bin/bash

# ========================================
# 表空间数据定时采集脚本
# ========================================

# 配置区域
API_BASE_URL="https://c001.6ps.org/api/v1beta/app/dataapp-tiTAMIaa/endpoint/tbsinfo"
PUBLIC_KEY="C1TN7NQ0"
PRIVATE_KEY="358e8056-c853-434d-a2d3-548a208c6934"

# 文件路径配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "${SCRIPT_DIR}")"
DATA_DIR="${PROJECT_DIR}/public/tbs"
LOG_DIR="${DATA_DIR}/logs"
CURRENT_DATA="${DATA_DIR}/tablespace_data.json"
RAW_RESPONSE="${DATA_DIR}/raw_response.json"
LOG_FILE="${LOG_DIR}/fetch_$(date +%Y%m%d).log"

# 创建必要的目录
mkdir -p "${DATA_DIR}" "${LOG_DIR}"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "${LOG_FILE}" >&2
}

# 检查依赖
check_dependencies() {
    local missing_deps=()
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "缺少必要的依赖: ${missing_deps[*]}"
        log_error "请安装: sudo yum install -y ${missing_deps[*]} 或 sudo apt-get install -y ${missing_deps[*]}"
        exit 1
    fi
}

# 获取API数据
fetch_data() {
    local host="${1:-%25}"
    local api_url="${API_BASE_URL}?id=131&host=${host}"
    
    log "开始获取数据: ${api_url}"
    
    # 使用 Basic Auth 认证方式
    local auth_header="Authorization: Basic $(printf "%s:%s" "${PUBLIC_KEY}" "${PRIVATE_KEY}" | base64)"
    
    # 发起请求，设置30秒超时
    local temp_response="${RAW_RESPONSE}.tmp"
    local http_code=$(curl -s -w "%{http_code}" \
        --max-time 30 \
        --connect-timeout 10 \
        -o "${temp_response}" \
        -H "${auth_header}" \
        -H "Content-Type: application/json" \
        "${api_url}")
    
    # 读取响应体
    local body
    body=$(cat "${temp_response}" 2>/dev/null)
    
    # 检查HTTP状态码
    if [ "${http_code}" != "200" ]; then
        log_error "API请求失败，HTTP状态码: ${http_code}"
        log_error "响应内容前500字符:"
        echo "${body}" | head -c 500 >> "${LOG_FILE}"
        rm -f "${temp_response}"
        return 1
    fi
    
    # 检查响应是否为空
    if [ -z "${body}" ]; then
        log_error "API返回空响应"
        rm -f "${temp_response}"
        return 1
    fi
    
    # 保存原始响应用于调试
    echo "${body}" > "${RAW_RESPONSE}"
    log "原始响应已保存到: ${RAW_RESPONSE}"
    log "原始响应大小: $(wc -c < "${RAW_RESPONSE}") 字节"
    
    # 验证JSON格式
    if ! echo "${body}" | jq empty 2>/dev/null; then
        log_error "API返回无效的JSON格式"
        log "尝试显示响应内容的前1000字符:"
        echo "${body}" | head -c 1000 >> "${LOG_FILE}"
        rm -f "${temp_response}"
        return 1
    fi
    
    log "✓ JSON格式验证通过"
    
    # 清理临时文件
    rm -f "${temp_response}"
    
    # 函数成功执行
    return 0
}

# 解析API响应并提取数据
parse_response() {
    # 从文件读取数据
    local raw_data
    raw_data=$(cat "${RAW_RESPONSE}" 2>/dev/null)
    
    # 检查输入数据
    if [ -z "${raw_data}" ]; then
        return 1
    fi
    
    # 验证输入数据的JSON格式
    if ! echo "${raw_data}" | jq empty 2>/dev/null; then
        return 1
    fi
    
    # TiCloud API 标准格式: {"type":"sql_endpoint","data":{"columns":[...],"rows":[...]}}
    if echo "${raw_data}" | jq -e '.type == "sql_endpoint"' &>/dev/null && echo "${raw_data}" | jq -e '.data.rows | type == "array"' &>/dev/null; then
        # 数据已经是对象格式，直接提取
        echo "${raw_data}" | jq -c '.data.rows' 2>/dev/null || echo "[]"
        return 0
    else
        return 1
    fi
}

# 保存数据到本地JSON文件
save_data() {
    local data="$1"
    
    # 检查数据
    if [ -z "${data}" ] || [ "${data}" = "null" ]; then
        log_error "数据为空(null)，跳过保存"
        return 1
    fi
    
    # 验证数据的JSON格式
    if ! echo "${data}" | jq empty 2>/dev/null; then
        log_error "要保存的数据不是有效的JSON格式"
        log "数据前500字符:"
        echo "${data}" | head -c 500
        return 1
    fi
    
    local temp_file="${CURRENT_DATA}.tmp"
    local temp_data_file="${temp_file}.data"
    
    # 将数据保存到临时文件，避免参数过长问题
    echo "${data}" > "${temp_data_file}"
    
    # 创建包含元数据的JSON，使用更可靠的方式处理大数据
    {
        echo "{"
        echo "  \"last_update\": \"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\","
        echo "  \"total_records\": $(jq 'length' "${temp_data_file}" 2>/dev/null || echo 0),"
        echo "  \"data\": "
        cat "${temp_data_file}"
        echo "}"
    } > "${temp_file}"
    
    # 验证生成的JSON
    if ! jq empty "${temp_file}" 2>/dev/null; then
        log_error "生成的JSON文件格式错误"
        log "临时文件大小: $(wc -c < "${temp_file}") 字节"
        rm -f "${temp_file}" "${temp_data_file}"
        return 1
    fi
    
    # 清理临时数据文件
    rm -f "${temp_data_file}"
    
    # 原子性替换
    mv "${temp_file}" "${CURRENT_DATA}"
    
    log "数据已保存: ${CURRENT_DATA}"
    log "文件大小: $(du -h "${CURRENT_DATA}" 2>/dev/null | cut -f1 || echo '0B')"
    return 0
}

# 主函数
main() {
    log "=========================================="
    log "表空间数据采集任务开始"
    log "=========================================="
    
    # 检查依赖
    check_dependencies
    
    # 获取数据
    if ! fetch_data; then
        log_error "数据获取失败"
        exit 1
    fi
    
    # 解析数据
    local parsed_data
    parsed_data=$(parse_response 2>/dev/null)
    if [ $? -ne 0 ] || [ -z "${parsed_data}" ]; then
        log_error "数据解析失败"
        log_error "请检查原始响应: ${RAW_RESPONSE}"
        exit 1
    fi
    
    # 保存数据
    if ! save_data "${parsed_data}"; then
        log_error "保存数据失败"
        exit 1
    fi
    
    log "数据已保存: ${CURRENT_DATA}"
    log "文件大小: $(du -h "${CURRENT_DATA}" 2>/dev/null | cut -f1 || echo '0B')"
    
    log "=========================================="
    log "表空间数据采集任务完成"
    log "=========================================="
}

# 执行主函数
main "$@"