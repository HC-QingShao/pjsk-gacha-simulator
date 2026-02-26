// 全局配置
const config = {
  isUpPool: false,          // 是否为UP池
  isPaidCrystal: false,     // 是否使用付费水晶
  up4Rate: 0.0054,          // 当期4★概率（非UP池）
  normal4Rate: 2.9946,      // 普通4★概率（非UP池，总4★=3%）
  threeStarRate: 0.0538,    // 3★概率
  twoStarRate: 0.4425,      // 2★概率
  paidCost: 100,            // 付费水晶单抽消耗
  normalCost: 300,          // 免费水晶单抽消耗
  paidPoints: 2,            // 付费抽卡积分/次
  normalPoints: 1           // 免费抽卡积分/次
};

// 全局统计数据
let stats = {
  simCount: 0,              // 模拟次数
  drawCounts: [],           // 每次抽到当期4★的抽数
  total4Up: 0,              // 累计当期4★
  total4Normal: 0,          // 累计普通4★
  total3: 0,                // 累计3★
  total2: 0,                // 累计2★
  avgDraws: 0,              // 平均抽数
  maxDraws: 0,              // 最高抽数
  minDraws: Infinity,       // 最低抽数
  avgCost: 0,               // 平均消耗水晶
  fullRecords: []           // 完整抽卡记录
};

// DOM元素
const elUpPool = document.getElementById('upPool');
const elPaidCrystal = document.getElementById('paidCrystal');
const elSimCount = document.getElementById('simCount');
const elStartSim = document.getElementById('startSim');
const elResultPanel = document.getElementById('resultPanel');
const elActualSimCount = document.getElementById('actualSimCount');
const elAvgDraws = document.getElementById('avgDraws');
const elMaxDraws = document.getElementById('maxDraws');
const elMinDraws = document.getElementById('minDraws');
const elAvgCost = document.getElementById('avgCost');
const elCrystalType = document.getElementById('crystalType');
const elTotal4Up = document.getElementById('total4Up');
const elTotal4Normal = document.getElementById('total4Normal');
const elTotal3 = document.getElementById('total3');
const elTotal2 = document.getElementById('total2');
const elFullRecordList = document.getElementById('fullRecordList');
const elCopyRecords = document.getElementById('copyRecords');
const elTipsText = document.querySelector('.tips-text');

// 初始化事件监听
function initEvents() {
  // 开始模拟按钮
  elStartSim.addEventListener('click', startSimulation);
  // 复制记录按钮
  elCopyRecords.addEventListener('click', copyAllRecords);
  // 复选框变化时更新提示
  elUpPool.addEventListener('change', updateTips);
  elPaidCrystal.addEventListener('change', updateTips);
  // 输入框变化时更新提示
  elSimCount.addEventListener('input', updateTips);
  
  // 初始更新提示
  updateTips();
}

// 更新提示文本
function updateTips() {
  const poolType = elUpPool.checked ? 'UP池' : '非UP池';
  const crystalType = elPaidCrystal.checked ? '付费水晶' : '免费水晶';
  const simCount = elSimCount.value || 100;
  
  elTipsText.textContent = `📌 当前配置：${poolType} | ${crystalType} | 模拟次数${simCount}次`;
}

// 复制全部记录到剪贴板
function copyAllRecords() {
  const recordText = elFullRecordList.textContent;
  navigator.clipboard.writeText(recordText).then(() => {
    alert('✅ 全部抽卡记录已复制到剪贴板！');
  }).catch(() => {
    alert('❌ 复制失败，请手动复制');
  });
}

// 开始批量模拟
function startSimulation() {
  // 1. 验证输入
  const inputCount = parseInt(elSimCount.value);
  if (isNaN(inputCount) || inputCount < 100) {
    alert('请输入≥100的有效数字！');
    elSimCount.value = 100;
    updateTips();
    return;
  }

  // 2. 更新配置
  updateConfig();

  // 3. 重置统计数据
  resetStats(inputCount);

  // 4. 执行批量模拟
  runBatchSimulation();

  // 5. 计算统计结果
  calculateStats();

  // 6. 展示结果
  showResults();
}

// 更新配置
function updateConfig() {
  config.isUpPool = elUpPool.checked;
  config.isPaidCrystal = elPaidCrystal.checked;
  
  // 调整UP池概率（当期4★=0.4%，普通4★=2.6%）
  if (config.isUpPool) {
    config.up4Rate = 0.4;
    config.normal4Rate = 2.6;
  } else {
    config.up4Rate = 0.0054;
    config.normal4Rate = 2.9946;
  }
}

// 重置统计数据
function resetStats(simCount) {
  stats = {
    simCount: simCount,
    drawCounts: [],
    total4Up: 0,
    total4Normal: 0,
    total3: 0,
    total2: 0,
    avgDraws: 0,
    maxDraws: 0,
    minDraws: Infinity,
    avgCost: 0,
    fullRecords: []
  };
}

// 执行批量模拟
function runBatchSimulation() {
  for (let i = 0; i < stats.simCount; i++) {
    // 单次模拟：抽到当期4★为止
    const singleResult = simulateSingleDraw();
    
    // 记录单次抽数
    stats.drawCounts.push(singleResult.draws);
    
    // 累计星级数量
    stats.total4Up += singleResult.counts.up4;
    stats.total4Normal += singleResult.counts.normal4;
    stats.total3 += singleResult.counts.three;
    stats.total2 += singleResult.counts.two;
    
    // 记录完整信息
    const singleCost = config.isPaidCrystal ? config.paidCost : config.normalCost;
    const totalCost = singleResult.draws * singleCost;
    stats.fullRecords.push(`第${i+1}次模拟：${singleResult.draws}抽（消耗${totalCost}水晶）抽到当期4★`);
  }
}

// 单次模拟（抽到当期4★为止）
function simulateSingleDraw() {
  let draws = 0;            // 单次抽数
  let points = 0;           // 积分
  let tenPullCount = 0;     // 10抽计数
  let gotLimited = false;   // 是否抽到当期4★
  
  // 单次星级计数
  const counts = {
    up4: 0,
    normal4: 0,
    three: 0,
    two: 0
  };

  // 抽卡循环
  while (!gotLimited) {
    draws++;
    tenPullCount++;
    
    // 增加积分
    points += config.isPaidCrystal ? config.paidPoints : config.normalPoints;
    
    let rarity = 2;
    let isLimited = false;

    // 保底规则判断
    // 100积分保底：必出当期4★
    if (points % 100 === 0) {
      rarity = 4;
      isLimited = true;
    }
    // 50积分保底：必出普通4★
    else if (points % 50 === 0) {
      rarity = 4;
      isLimited = false;
    }
    // 每10抽保底：必出3★及以上
    else if (tenPullCount === 10) {
      rarity = Math.random() < 0.1 ? 4 : 3; // 10%概率4★，90%概率3★
      isLimited = false;
      tenPullCount = 0;
    }
    // 正常概率抽卡
    else {
      const rand = Math.random() * 100;
      if (rand < config.up4Rate) {
        // 当期4★
        rarity = 4;
        isLimited = true;
      } else if (rand < config.up4Rate + config.normal4Rate) {
        // 普通4★
        rarity = 4;
        isLimited = false;
      } else if (rand < config.up4Rate + config.normal4Rate + config.threeStarRate) {
        // 3★
        rarity = 3;
        tenPullCount = 0;
      } else {
        // 2★
        rarity = 2;
      }
    }

    // 计数更新
    if (rarity === 4 && isLimited) {
      counts.up4++;
      gotLimited = true;
    } else if (rarity === 4) {
      counts.normal4++;
    } else if (rarity === 3) {
      counts.three++;
    } else {
      counts.two++;
    }
  }

  return {
    draws: draws,
    counts: counts
  };
}

// 计算统计结果
function calculateStats() {
  // 计算平均抽数
  const totalDraws = stats.drawCounts.reduce((sum, val) => sum + val, 0);
  stats.avgDraws = (totalDraws / stats.simCount).toFixed(2);
  
  // 最高/最低抽数
  stats.maxDraws = Math.max(...stats.drawCounts);
  stats.minDraws = Math.min(...stats.drawCounts);
  
  // 平均消耗水晶
  const singleCost = config.isPaidCrystal ? config.paidCost : config.normalCost;
  stats.avgCost = (stats.avgDraws * singleCost).toFixed(0);
}

// 展示结果
function showResults() {
  // 显示结果面板
  elResultPanel.style.display = 'block';
  
  // 更新核心统计
  elActualSimCount.textContent = stats.simCount;
  elAvgDraws.textContent = stats.avgDraws;
  elMaxDraws.textContent = stats.maxDraws;
  elMinDraws.textContent = stats.minDraws;
  elAvgCost.textContent = stats.avgCost;
  elCrystalType.textContent = config.isPaidCrystal ? '付费水晶' : '免费水晶';
  
  // 更新星级总数
  elTotal4Up.textContent = stats.total4Up;
  elTotal4Normal.textContent = stats.total4Normal;
  elTotal3.textContent = stats.total3;
  elTotal2.textContent = stats.total2;
  
  // 渲染完整抽卡记录
  renderFullRecords();
}

// 渲染完整抽卡记录
function renderFullRecords() {
  // 拼接所有记录
  const fullText = stats.fullRecords.join('\n');
  elFullRecordList.textContent = fullText;
  
  // 滚动到记录底部
  elFullRecordList.scrollTop = elFullRecordList.scrollHeight;
}

// 初始化
window.onload = function() {
  initEvents();
};