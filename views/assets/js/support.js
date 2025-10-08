async function loadFAQ() {
    const container = document.getElementById("faqList");
    try {
        const res = await fetch("/faq");
        if (!res.ok) throw new Error("API 오류: " + res.status);
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            container.innerHTML = "<p class='faq-empty'>등록된 FAQ가 없습니다.</p>";
            return;
        }

        container.innerHTML = data.map(it => `
      <div class="faq-item">
        <div class="faq-question">
          ${it.question}
          <span class="faq-toggle">▼</span>
        </div>
        <div class="faq-answer">
          ${it.answer}
        </div>
      </div>
    `).join("");

    } catch (err) {
        console.error("FAQ 로딩 실패:", err);
        container.innerHTML = "<p class='faq-error'>FAQ를 불러오지 못했습니다.</p>";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadFAQ();

    // 이벤트 위임으로 FAQ 토글
    const container = document.getElementById("faqList");
    container.addEventListener("click", (e) => {
        const q = e.target.closest(".faq-question");
        if (!q) return;

        const item = q.closest(".faq-item");
        item.classList.toggle("open"); // CSS와 일치하게 open 클래스 토글

        const arrow = q.querySelector(".faq-toggle");
        if (arrow) arrow.style.transform =
            item.classList.contains("open") ? "rotate(180deg)" : "rotate(0deg)";
    });
});