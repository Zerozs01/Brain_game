let myRadarChart = null;
let lastLpiValuesJson = '';

function drawRadarChart(dataValues) {
  const ctx = document.getElementById('core-tracks-radar');
  if (!ctx) return;
  
  if (myRadarChart) {
    myRadarChart.destroy();
  }
  
  // Check if Chart.js is loaded
  const ChartClass = window.Chart;
  if (!ChartClass) {
    console.warn("Chart.js is not loaded.");
    return;
  }
  
  myRadarChart = new ChartClass(ctx, {
    type: 'radar',
    data: {
      labels: ['Speed', 'Memory', 'Attention', 'Flexibility', 'Problem Solving', 'Math'],
      datasets: [{
        label: 'Cognitive Domain LPI',
        data: dataValues,
        backgroundColor: 'rgba(96, 165, 250, 0.15)',
        borderColor: '#60A5FA',
        borderWidth: 1.5,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#fff',
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        r: {
          angleLines: {
            color: '#333333'
          },
          grid: {
            color: '#333333'
          },
          pointLabels: {
            color: '#D4D4D4',
            font: {
              size: 9.5,
              family: 'Inter',
              weight: 'bold'
            }
          },
          ticks: {
            display: false,
            maxTicksLimit: 5
          },
          suggestedMin: 0,
          suggestedMax: 100
        }
      }
    }
  });
}

export function updateRadarAndRank(lpiByDomain) {
  let totalLpi = 0;
  let count = 0;
  
  const lpiMap = new Map(
    (lpiByDomain || []).map(item => [
      String(item.cognitiveDomain || '').toLowerCase(),
      Number(item.lpi || 0)
    ])
  );
  
  const domains = ['speed', 'memory', 'attention', 'flexibility', 'problem_solving', 'math'];
  const lpiValues = domains.map(d => {
    const val = lpiMap.get(d);
    if (val !== undefined && val !== null && val > 0) {
      totalLpi += val;
      count++;
      return val;
    }
    return 0;
  });
  
  const lpiValuesJson = JSON.stringify(lpiValues);
  if (lpiValuesJson === lastLpiValuesJson) {
    return;
  }
  lastLpiValuesJson = lpiValuesJson;

  const avgLpi = count > 0 ? totalLpi / count : 0;
  
  let rank = 'C';
  if (avgLpi >= 90) rank = 'S';
  else if (avgLpi >= 80) rank = 'A';
  else if (avgLpi >= 70) rank = 'B';
  else if (avgLpi >= 50) rank = 'C';
  else rank = 'D';
  
  if (avgLpi === 0) rank = '--';
  
  const rankEl = document.getElementById('evalRankValue');
  if (rankEl) rankEl.textContent = rank;
  
  const lpiProgress = document.getElementById('evalRankProgress');
  if (lpiProgress) {
    lpiProgress.style.width = `${avgLpi}%`;
  }
  
  const lpiScoreLabel = document.getElementById('evalScoreLabel');
  if (lpiScoreLabel) {
    lpiScoreLabel.textContent = `${(avgLpi / 10).toFixed(1)} / 10`;
  }
  
  drawRadarChart(lpiValues);
}
