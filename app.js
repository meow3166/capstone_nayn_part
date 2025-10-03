// app.js (깨끗한 최종본)

// 1) 모듈 ---------------------------------------------------------
const express = require("express");
const nunjucks = require("nunjucks");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const pool = require("./DB"); // ./DB.js 에서 export한 pool.promise()

// 2) app 생성 -----------------------------------------------------
const app = express();

// 3) 미들웨어 -----------------------------------------------------
app.use(express.urlencoded({ extended: true })); // <form> POST 파싱
app.use(express.json());                         // JSON 파싱
app.use(session({
  secret: "change_this_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

// 4) 뷰 엔진/정적 파일 -------------------------------------------
app.set("view engine", "html");
const VIEWS_DIR = path.join(__dirname, "views");
app.set("views", VIEWS_DIR);

nunjucks.configure(VIEWS_DIR, {
  express: app,
  watch: true,
  autoescape: true
});

// /assets/* 정적 리소스
app.use("/assets", express.static(path.join(VIEWS_DIR, "assets")));

// 템플릿에서 로그인 유저 접근용(선택)
app.use((req, res, next) => {
  res.locals.me = req.session.user || null;
  next();
});

// 5) 라우트 -------------------------------------------------------
// 메인/기본
app.get("/", (req, res) => res.render("index.html"));
app.get(["/index", "/index.html"], (req, res) => res.redirect(301, "/"));

// 위치 페이지
app.get(["/location", "/location.html"], (req, res) => {
  res.render("location/location.html");
});

// 로그인 페이지 (파일 위치가 views/login/Login.html 인 경우)
app.get(["/login", "/Login", "/login.html", "/Login.html", "/login/Login.html"], (req, res) => {
  res.render("login/Login.html");
});

// support 페이지
app.get(["/support", "/support.html", "/support/index.html"], (req, res) => {
  res.render("support/support.html");
});
app.get("/faq", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, question, answer FROM faqs ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("[/faq]", err);
    res.status(500).send("DB 오류 발생");
  }
});



// DB 테스트: poi 목록(JSON)
app.get("/poi", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM poi");
    res.json(rows);
  } catch (err) {
    console.error("[/poi]", err);
    res.status(500).send("DB 오류 발생");
  }
});

// 관리자 전체(검사용)
app.get("/admin_users", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM admin_users");
    res.json(rows);
  } catch (err) {
    console.error("[/admin_users]", err);
    res.status(500).send("DB 오류 발생");
  }
});

// 로그인: 성공 시 alert 후 메인으로 이동
app.post("/login", async (req, res) => {
  // ⚠️ 폼 input name은 username / password 여야 함!
  const { username, password } = req.body;
  if (!username || !password) {
    return res.send("<script>alert('아이디와 비밀번호를 입력하세요');history.back();</script>");
  }

  try {
    const [rows] = await pool.query(
      "SELECT admin_id, username, password, name FROM admin_users WHERE username=?",
      [username]
    );
    if (rows.length === 0) {
      return res.send("<script>alert('존재하지 않는 계정입니다');history.back();</script>");
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.send("<script>alert('비밀번호가 틀렸습니다');history.back();</script>");
    }

    // 로그인 성공 → 세션 저장
    req.session.user = { id: user.admin_id, username: user.username, name: user.name };

    // 알림 후 메인으로 이동
    return res.send("<script>alert('로그인 성공!');location.href='/';</script>");

  } catch (e) {
    console.error("[LOGIN]", e);
    return res.send("<script>alert('DB 오류 발생');history.back();</script>");
  }
});

// 6) 서버 시작 ---------------------------------------------------
app.listen(80, () => {
  console.log("80번 포트에서 express 동작중");
});
