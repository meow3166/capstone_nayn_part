const hamburger = document.querySelector('.hamburger');
const mainmenu = document.querySelector('.mainmenu');

if (hamburger && mainmenu) {
    // 햄버거 클릭 시 메뉴 열기/닫기
    hamburger.addEventListener('click', () => {
        mainmenu.classList.toggle('active');
        document.body.classList.toggle('menu-open', m.classList.contains('active'));
    });

    // 모바일에서 서브 메뉴 클릭 시 한 메뉴만 펼치기
    document.querySelectorAll('.mainmenu > li > a').forEach(item => {
        // 각 메뉴마다 클릭 시간 저장용
        let lastClicked = 0;

        item.addEventListener('click', e => {
            if (window.innerWidth <= 768) { // 모바일만
                const now = Date.now();
                const parentLi = item.parentElement;
                const isOpen = parentLi.classList.contains('open');

                // 서브메뉴 닫힌 상태에서 첫 클릭이면 펼치기
                if (!isOpen) {
                    e.preventDefault();
                    // 다른 메뉴 닫기
                    document.querySelectorAll('.mainmenu > li').forEach(li => {
                        if (li !== parentLi) li.classList.remove('open');
                    });
                    parentLi.classList.add('open');
                    lastClicked = now;
                }
                // 이미 열려 있고, 1초 이내 두 번째 클릭 → 이동 허용
                else if (now - lastClicked < 1000) {
                    // do nothing → href로 이동
                }
                // 열려 있고, 1초 이상 지난 후 클릭 → 다시 닫기
                else {
                    e.preventDefault();
                    parentLi.classList.toggle('open');
                    lastClicked = now;
                }
            }
        });
    });
}      