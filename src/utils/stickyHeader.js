/**
 * 表头固定功能
 * 这个文件提供了一个可靠的方法来固定表头在地图下方
 */

/**
 * 初始化表头固定功能
 * @param {Object} options - 配置选项
 * @param {string} options.tableHeaderId - 表头元素的ID
 * @param {string} options.tableContainerId - 表格容器的ID
 * @param {string} options.mapContainerClass - 地图容器的类名
 */
export function initStickyHeader(options = {}) {
  const {
    tableHeaderId = 'run-table-header',
    tableContainerId = 'run-table-container',
    mapContainerClass = 'sticky-map-container'
  } = options;

  // 等待DOM完全加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupStickyHeader(tableHeaderId, tableContainerId, mapContainerClass));
  } else {
    // DOM已经加载完成，直接设置
    setupStickyHeader(tableHeaderId, tableContainerId, mapContainerClass);
  }
}

/**
 * 设置表头固定功能
 * @param {string} tableHeaderId - 表头元素的ID
 * @param {string} tableContainerId - 表格容器的ID
 * @param {string} mapContainerClass - 地图容器的类名
 */
function setupStickyHeader(tableHeaderId, tableContainerId, mapContainerClass) {
  // 获取必要的DOM元素
  const tableHeader = document.getElementById(tableHeaderId);
  const tableContainer = document.getElementById(tableContainerId);
  const mapContainer = document.querySelector(`.${mapContainerClass}`);
  const navBar = document.querySelector('nav');

  if (!tableHeader || !tableContainer || !mapContainer || !navBar) {
    console.warn('无法找到必要的DOM元素，表头固定功能无法初始化');
    return;
  }

  // 计算导航栏高度
  const navHeight = navBar.offsetHeight;

  // 同步表头列宽与表格列宽
  function syncColumnWidths() {
    try {
      const table = tableContainer.querySelector('table');
      if (!table) return;

      // 获取表格中的第一行（表头行）
      const headerRow = tableHeader.querySelector('tr');
      // 获取表格中的第一个数据行
      const firstDataRow = table.querySelector('tbody tr');

      if (!headerRow || !firstDataRow) return;

      // 获取表头中的所有列
      const headerCells = headerRow.querySelectorAll('th');
      // 获取数据行中的所有列
      const dataCells = firstDataRow.querySelectorAll('td');

      // 确保两者数量匹配
      if (headerCells.length !== dataCells.length) return;

      // 同步每一列的宽度
      for (let i = 0; i < headerCells.length; i++) {
        const width = dataCells[i].offsetWidth;
        headerCells[i].style.width = `${width}px`;
        headerCells[i].style.minWidth = `${width}px`;
        headerCells[i].style.maxWidth = `${width}px`;
      }
    } catch (error) {
      console.warn('同步列宽时出错:', error);
    }
  }

  // 处理滚动事件
  function handleScroll() {
    try {
      const mapRect = mapContainer.getBoundingClientRect();
      const tableRect = tableContainer.getBoundingClientRect();
      const tableLeft = tableRect.left;
      const tableWidth = tableContainer.querySelector('table')?.offsetWidth || tableRect.width;

      // 同步列宽
      syncColumnWidths();

      // 如果地图底部已经滚动到导航栏下方或更上方
      if (mapRect.bottom <= navHeight) {
        // 固定表头在导航栏下方
        tableHeader.style.position = 'fixed';
        tableHeader.style.top = `${navHeight}px`;
        tableHeader.style.left = `${tableLeft}px`;
        tableHeader.style.width = `${tableWidth}px`;
        tableHeader.style.zIndex = '5';
        tableHeader.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';

        // 添加padding-top到表格容器，防止内容跳动
        const headerHeight = tableHeader.offsetHeight;
        tableContainer.style.paddingTop = `${headerHeight - 8}px`;
      }
      // 如果地图底部在视口中
      else if (mapRect.bottom > navHeight) {
        // 固定表头在地图底部
        tableHeader.style.position = 'fixed';
        tableHeader.style.top = `${mapRect.bottom}px`;
        tableHeader.style.left = `${tableLeft}px`;
        tableHeader.style.width = `${tableWidth}px`;
        tableHeader.style.zIndex = '5';
        tableHeader.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';

        // 添加padding-top到表格容器，防止内容跳动
        const headerHeight = tableHeader.offsetHeight;
        tableContainer.style.paddingTop = `${headerHeight - 8}px`;
      }
    } catch (error) {
      console.warn('处理滚动事件时出错:', error);
    }
  }

  // 添加滚动事件监听
  window.addEventListener('scroll', handleScroll);
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleScroll);

  // 初始调用一次确保正确状态
  setTimeout(() => {
    syncColumnWidths();
    handleScroll();
  }, 500); // 延迟确保DOM已完全渲染

  // 定期检查以确保表头保持固定
  const intervalId = setInterval(() => {
    syncColumnWidths();
    handleScroll();
  }, 2000);

  // 返回清理函数
  return function cleanup() {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', handleScroll);
    clearInterval(intervalId);

    // 恢复表头和表格容器样式
    if (tableHeader) {
      tableHeader.style.position = '';
      tableHeader.style.top = '';
      tableHeader.style.left = '';
      tableHeader.style.width = '';
      tableHeader.style.zIndex = '';
      tableHeader.style.boxShadow = '';

      // 清除列宽样式
      const headerCells = tableHeader.querySelectorAll('th');
      headerCells.forEach((cell) => {
        cell.style.width = '';
        cell.style.minWidth = '';
        cell.style.maxWidth = '';
      });
    }

    if (tableContainer) {
      tableContainer.style.paddingTop = '';
    }
  };
}

/**
 * 销毁表头固定功能
 * @param {Function} cleanupFunction - 由initStickyHeader返回的清理函数
 */
export function destroyStickyHeader(cleanupFunction) {
  if (typeof cleanupFunction === 'function') {
    cleanupFunction();
  }
}