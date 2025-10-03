// hash.js
const bcrypt = require("bcrypt");

(async () => {
  const plain = "soon615!!";       // 평문 비번
  const hashed = await bcrypt.hash(plain, 10);
  console.log("저장할 해시:", hashed);
})();

