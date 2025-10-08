 const chatInput = document.getElementById('chatInput');
            const body = document.body;  
            chatInput.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    body.style.backgroundImage = "none";  // 배경 제거
                }
            }); 