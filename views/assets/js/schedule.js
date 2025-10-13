document.addEventListener('DOMContentLoaded', function(){

document.getElementById('prev-btn').addEventListener('click', prevMonth);
document.getElementById('next-btn').addEventListener('click', nextMonth);

const months = [
            "1월 ", "2월 ", "3월 ", "4월 ", "5월 ", "6월 ",
            "7월 ", "8월 ", "9월 ", "10월 ", "11월 ", "12월 "
        ];

        const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
        const scheduleDates = {
            // db에서 받아오는거로 구현해보기
        };
        let date = new Date();

        function getCurrentDate(element, asString) {
            if (element) {
                if (asString) {
                    return element.textContent =date.getFullYear() + "년 "+ months[date.getMonth() ] + + date.getDate()+"일 "+weekdays[date.getDay()] ;
                }
                return element.value = date.toISOString().substr(0, 10);
            }
            return date;
        }

        function generateCalendar() {
            const calendar = document.getElementById('calendar');
            if (calendar) {
                calendar.remove();
            }

            const table = document.createElement("table");
            table.id = "calendar";

            const trHeader = document.createElement('tr');
            trHeader.className = 'weekends';
            weekdays.map(week => {
                const th = document.createElement('th');
                const w = document.createTextNode(week.substring(0, 1));
                th.appendChild(w);
                trHeader.appendChild(th);
            });
            table.appendChild(trHeader);

            const weekDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

            let tr = document.createElement("tr");
            let td = '';
            let empty = '';
            let btn = document.createElement('button');
            let week = 0;

            while (week < weekDay) {
                td = document.createElement("td");
                empty = document.createTextNode(' ');
                td.appendChild(empty);
                tr.appendChild(td);
                week++;
            }

            for (let i = 1; i <= lastDay;) {
                while (week < 7) {
                    td = document.createElement('td');
                    let text = document.createTextNode(i);
                    btn = document.createElement('button');
                    btn.className = "btn-day";
                    btn.addEventListener('click', function () { changeDate(this) });
                    week++;

                    if (i <= lastDay) {
                        i++;
                        btn.appendChild(text);
                        
                        //일정 괸련
                        let targetDate = new Date(date.getFullYear(), date.getMonth(), i ,1);
                        let targetDateStr = targetDate.toISOString().substr(0, 10);
                        if (scheduleDates.hasOwnProperty(targetDateStr)) {
                            btn.classList.add('schedule-day'); // 색상 클래스 추가
                            btn.setAttribute('data-tooltip', scheduleDates[targetDateStr]);

                            btn.addEventListener('mouseover', showTooltip);
                            btn.addEventListener('mouseout', hideTooltip);
                            btn.addEventListener('mousemove', moveTooltip);
                        }
                        td.appendChild(btn);
                    } else {
                        text = document.createTextNode(' ');
                        td.appendChild(text);
                    }
                    tr.appendChild(td);
                }
                table.appendChild(tr);
                tr = document.createElement("tr");
                week = 0;
            }

            const content = document.getElementById('table');
            content.appendChild(table);
            changeActive();
            changeHeader(date);
            document.getElementById('date').textContent = date;
            getCurrentDate(document.getElementById("currentDate"), true);
            getCurrentDate(document.getElementById("date"), false);
        }

        function setDate(form) {
            let newDate = new Date(form.date.value);
            date = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate() + 1);
            generateCalendar();
            return false;
        }

        function changeHeader(dateHeader) {
            const month = document.getElementById("month-header");
            if (month.childNodes[0]) {
                month.removeChild(month.childNodes[0]);
            }
            const headerMonth = document.createElement("h3");
            const textMonth = document.createTextNode(dateHeader.getFullYear()+ "년 "+months[dateHeader.getMonth()]  );
            headerMonth.appendChild(textMonth);
            month.appendChild(headerMonth);
        }

        function changeActive() {
            let btnList = document.querySelectorAll('button.active');
            btnList.forEach(btn => {
                btn.classList.remove('active');
            });
            btnList = document.getElementsByClassName('btn-day');
            for (let i = 0; i < btnList.length; i++) {
                const btn = btnList[i];
                if (btn.textContent === (date.getDate()).toString()) {
                    btn.classList.add('active');
                }
            }
        }

        function resetDate() {
            date = new Date();
            generateCalendar();
        }

        function changeDate(button) {
            let newDay = parseInt(button.textContent);
            date = new Date(date.getFullYear(), date.getMonth(), newDay);
            generateCalendar();
        }

        function nextMonth() {
            date = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            generateCalendar(date);
        }

        function prevMonth() {
            date = new Date(date.getFullYear(), date.getMonth() - 1, 1);
            generateCalendar(date);
        }

        function prevDay() {
            date = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
            generateCalendar();
        }

        function nextDay() {
            date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
            generateCalendar();
        }
        function showTooltip(e) {
            const tooltip = document.getElementById('tooltip');
            tooltip.style.display = 'block';
            tooltip.textContent = e.target.getAttribute('data-tooltip');
        }

        function hideTooltip() {
            const tooltip = document.getElementById('tooltip');
            tooltip.style.display = 'none';
        }

        function moveTooltip(e) {
            const tooltip = document.getElementById('tooltip');
            tooltip.style.left = (e.pageX + 10) + 'px'; // 마우스 오른쪽 약간 띄우기
            tooltip.style.top = (e.pageY + 10) + 'px';
        }
        

       document.querySelectorAll('input[name="date"]').forEach(radio => {
            radio.addEventListener('change', function () {
                const selectedDate = this.value; // 선택한 날짜
                const descriptionDiv = document.getElementById('scheduleDescription'); // 출력할 요소
                descriptionDiv.textContent = scheduleDates[selectedDate]; // 객체에서 바로 설명 가져오기

                // 📌 달력 자동 이동
                date = new Date(selectedDate);
                generateCalendar();
            });
        });
        
    window.onload = function () {
        generateCalendar();
    };

    });

        