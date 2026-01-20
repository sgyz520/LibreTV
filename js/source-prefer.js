// 优选最佳播放源功能

// 优选策略类型
export const PreferStrategy = {
    SCORE: 'score', // 按评分排序
    HOT: 'hot',     // 按热度排序
    NEW: 'new',     // 按更新时间排序
    SUPPORT_M3U8: 'supportM3u8' // 支持M3u8优先
};

// 获取当前优选策略
function getPreferStrategy() {
    return localStorage.getItem('preferStrategy') || PreferStrategy.SCORE;
}

// 保存优选策略
function savePreferStrategy(strategy) {
    localStorage.setItem('preferStrategy', strategy);
}

// 按策略排序播放源
function sortResults(results, strategy, searchTitle) {
    if (!results || !Array.isArray(results) || results.length === 0) {
        return [];
    }

    // 热门优先：根据评分 + 播放次数综合打分
    if (strategy === PreferStrategy.HOT) {
        const validResults = results.filter((r) => {
            const score = parseFloat(r.score || '0');
            const playCount = r.play_count || 0;
            return score > 0 && playCount > 0;
        });
        if (validResults.length === 0) {
            console.log('没有满足“热度优选”的播放源，回退到按评分排序');
            return sortResults(results, PreferStrategy.SCORE, searchTitle);
        }
        return validResults.sort((a, b) => {
            const scoreA = parseFloat(a.score || '0');
            const playCountA = a.play_count || 0;
            const scoreB = parseFloat(b.score || '0');
            const playCountB = b.play_count || 0;
            return (scoreB + playCountB / 10) - (scoreA + playCountA / 10);
        });
    }

    // 新源优先：根据最近更新时间排序
    if (strategy === PreferStrategy.NEW) {
        const validResults = results.filter((r) => r.last_updated_time);
        if (validResults.length === 0) {
            console.log('没有满足“新源优先”的播放源，回退到按评分排序');
            return sortResults(results, PreferStrategy.SCORE, searchTitle);
        }
        return validResults.sort(
            (a, b) =>
                new Date(b.last_updated_time).getTime() - new Date(a.last_updated_time).getTime()
        );
    }

    // 支持 M3u8 优先：只保留支持 M3u8 的源
    if (strategy === PreferStrategy.SUPPORT_M3U8) {
        return results.filter((r) => r.m3u8 === 1);
    }

    // 默认按评分降序排序
    const preferential = results.filter((r) => {
        if (r.title && r.title.includes(searchTitle)) {
            return true;
        }
        if (r.directors?.some((d) => d.includes(searchTitle))) {
            return true;
        }
        if (r.actors?.some((a) => a.includes(searchTitle))) {
            return true;
        }
        return false;
    });
    const others = results.filter((r) => !preferential.includes(r));
    const sorted = preferential.sort(
        (a, b) => parseFloat(b.score || '0') - parseFloat(a.score || '0')
    );
    return sorted.concat(others);
}

// 优选最佳播放源
export function preferBestSource(results, currentSource, currentId, searchTitle = '') {
    if (!results || results.length === 0) return null;

    // 如果结果只有一条，直接返回
    if (results.length === 1) {
        return results[0];
    }

    // 只有当前源不匹配时才需要优选
    if (results.some(r => r.source_code === currentSource && r.id === currentId)) {
        return null;
    }

    const strategy = getPreferStrategy();
    const sortedResults = sortResults(results, strategy, searchTitle);
    
    return sortedResults[0] || null;
}

// 初始化优选源UI
export function initSourcePreferUI() {
    // 检查是否需要显示优选源设置
    const hasSourcePreferSetting = document.getElementById('sourcePreferSetting');
    if (hasSourcePreferSetting) return;

    // 在设置面板中添加优选源选项
    const settingsPanel = document.getElementById('settingsPanel');
    if (!settingsPanel) return;

    // 添加优选策略设置
    const sourcePreferDiv = document.createElement('div');
    sourcePreferDiv.className = 'setting-item';
    sourcePreferDiv.id = 'sourcePreferSetting';
    sourcePreferDiv.innerHTML = `
        <div class="setting-label">
            <span>优选播放源策略</span>
        </div>
        <div class="setting-content">
            <select id="preferStrategySelect" class="form-select">
                <option value="${PreferStrategy.SCORE}">按评分排序</option>
                <option value="${PreferStrategy.HOT}">按热度排序</option>
                <option value="${PreferStrategy.NEW}">按更新时间排序</option>
                <option value="${PreferStrategy.SUPPORT_M3U8}">支持M3u8优先</option>
            </select>
        </div>
    `;

    settingsPanel.appendChild(sourcePreferDiv);

    // 设置当前选中的策略
    const preferStrategySelect = document.getElementById('preferStrategySelect');
    preferStrategySelect.value = getPreferStrategy();

    // 监听策略变化
    preferStrategySelect.addEventListener('change', (e) => {
        savePreferStrategy(e.target.value);
    });
}

// 在搜索结果中应用优选源
export function applySourcePreferInSearch(results, searchQuery) {
    const strategy = getPreferStrategy();
    return sortResults(results, strategy, searchQuery);
}
