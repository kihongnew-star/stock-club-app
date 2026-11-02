// Google AI Studio에서 발급받은 API 키를 입력합니다.
const GEMINI_API_KEY = "";

let currentUser = "익명투자자";
let stockData = [];

// DOM 요소 참조
const mainView = document.getElementById("mainView");
const userStatsView = document.getElementById("userStatsView");
const goUserStatsBtn = document.getElementById("goUserStatsBtn");
const backToMainBtn = document.getElementById("backToMainBtn");
const stockList = document.getElementById("stockList");
const userRankingList = document.getElementById("userRankingList");
const recentStockDisplay = document.getElementById("recentStockDisplay");

// 회원 설정
document.getElementById("setUserBtn").addEventListener("click", () => {
  const nameInput = document.getElementById("userNameInput").value.trim();
  if (nameInput) {
    currentUser = nameInput;
    alert(`[${currentUser}] 님으로 로그인되었습니다.`);
  }
});

// 화면 전환 (메인 <-> 입력자별 수익률)
goUserStatsBtn.addEventListener("click", () => {
  renderUserRankings();
  mainView.classList.remove("active");
  userStatsView.classList.add("active");
});

backToMainBtn.addEventListener("click", () => {
  userStatsView.classList.remove("active");
  mainView.classList.add("active");
});

// 종목 등록
document.getElementById("addStockBtn").addEventListener("click", () => {
  const name = document.getElementById("stockName").value.trim();
  const buyPrice = parseFloat(document.getElementById("buyPrice").value);
  const currentPrice = parseFloat(document.getElementById("currentPrice").value);
  const reason = document.getElementById("stockReason").value.trim();

  if (!name || isNaN(buyPrice) || isNaN(currentPrice)) {
    alert("종목명과 가격 정보를 올바르게 입력해주세요.");
    return;
  }

  // 실시간 기본 수익률 계산 ((현재가 - 매수가) / 매수가 * 100)
  const returnRate = (((currentPrice - buyPrice) / buyPrice) * 100).toFixed(2);

  const newEntry = {
    id: Date.now(),
    user: currentUser,
    name,
    buyPrice,
    currentPrice,
    reason,
    returnRate: parseFloat(returnRate),
    date: new Date()
  };

  stockData.unshift(newEntry);
  updateRecentBanner(newEntry);
  renderStockList(stockData);

  // 폼 초기화
  document.getElementById("stockName").value = "";
  document.getElementById("buyPrice").value = "";
  document.getElementById("currentPrice").value = "";
  document.getElementById("stockReason").value = "";
});

// 상단 최근 등록 종목 배너 갱신
function updateRecentBanner(item) {
  const sign = item.returnRate >= 0 ? "+" : "";
  recentStockDisplay.innerText = `${item.name} (${sign}${item.returnRate}%) - 등록자: ${item.user}`;
}

// 종목 렌더링
function renderStockList(data) {
  stockList.innerHTML = "";
  data.forEach(item => {
    const isUp = item.returnRate >= 0;
    const sign = isUp ? "+" : "";
    const colorClass = isUp ? "up" : "down";

    const li = document.createElement("li");
    li.className = "stock-item";
    li.innerHTML = `
      <div class="stock-header">
        <span>${item.name}</span>
        <span class="return-rate ${colorClass}">${sign}${item.returnRate}%</span>
      </div>
      <div class="stock-meta">매수가: ${item.buyPrice.toLocaleString()}원 | 현재가: ${item.currentPrice.toLocaleString()}원 | 작성자: ${item.user}</div>
      ${item.reason ? `<div class="stock-reason-text">💡 ${item.reason}</div>` : ""}
    `;
    stockList.appendChild(li);
  });
}

// 수익률 정렬 필터
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    
    // 단순 데모용 가중치 소팅 (실시간 / 일간 / 주간 / 월별)
    const sorted = [...stockData].sort((a, b) => b.returnRate - a.returnRate);
    renderStockList(sorted);
  });
});

// 입력자별 수익률 순위 계산 및 렌더링
function renderUserRankings() {
  userRankingList.innerHTML = "";
  const userMap = {};

  stockData.forEach(item => {
    if (!userMap[item.user]) {
      userMap[item.user] = { totalReturn: 0, count: 0 };
    }
    userMap[item.user].totalReturn += item.returnRate;
    userMap[item.user].count += 1;
  });

  const rankings = Object.keys(userMap).map(user => {
    const avg = (userMap[user].totalReturn / userMap[user].count).toFixed(2);
    return { user, avgReturn: parseFloat(avg), count: userMap[user].count };
  }).sort((a, b) => b.avgReturn - a.avgReturn);

  rankings.forEach((u, idx) => {
    const isUp = u.avgReturn >= 0;
    const li = document.createElement("li");
    li.className = "user-item";
    li.innerHTML = `
      <div class="stock-header">
        <span>${idx + 1}위: ${u.user} (${u.count}건)</span>
        <span class="return-rate ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${u.avgReturn}%</span>
      </div>
    `;
    userRankingList.appendChild(li);
  });

  if (rankings.length === 0) {
    userRankingList.innerHTML = "<p style='font-size:13px; color:#64748b;'>등록된 데이터가 없습니다.</p>";
  }
}

// 인공지능 API 연동 (Gemini API를 이용한 투자 근거 요약)
document.getElementById("aiAnalyzeBtn").addEventListener("click", async () => {
  const stockName = document.getElementById("stockName").value.trim();
  const reasonText = document.getElementById("stockReason").value.trim();

  if (!stockName) {
    alert("종목명을 먼저 입력해주세요.");
    return;
  }

  const prompt = `주식 종목: ${stockName}\n작성된 메모: ${reasonText || "특별한 메모 없음"}\n이 종목의 핵심 투자 포인트와 리스크 요인을 동호회 회원들이 읽기 쉽게 2문장으로 명확히 요약해줘.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    const aiText = data.candidates[0].content.parts[0].text;
    document.getElementById("stockReason").value = aiText;
  } catch (err) {
    alert("AI 요약 호출 실패: API 키를 확인해주세요.");
  }
});