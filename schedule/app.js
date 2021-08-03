/*
アプリケーションの全般的な設定を行う
*/

// モジュールの呼び出し
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const passport = require('passport');
const session = require('express-session');
const bodyParser = require('body-parser');
const localStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');

const connect = require('./config/connect2');
const router = require('./routes/route');

// expressの初期化
const app = express();

// EJS設定
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// passport serialize/deserialize
// 認証成功時に名前とIDを受け取り、セッション情報に保存する(serialize)
passport.serializeUser(function(user, done) {
    console.log('serializeUser done'); // serialize確認(*DBG)
    done(null, user);
});
passport.deserializeUser(function(user, done) {
    console.log('deserializeUser done'); // deserialize確認(*DBG)
    done(null, user);
});

// passport 認証処理の定義
passport.use(new localStrategy({}, async(username, password, done) => {
    // 入力された情報と一致するレコードがあるかを調べる
    const sql = "SELECT USER_ID,PASSWORD,NAME,ID FROM MST_USER INNER JOIN MST_EMPLOYEE ON EMPLOYEE_ID = ID WHERE USER_ID = '" + username + "' COLLATE Japanese_CS_AS_KS_WS AND PASSWORD = '" + password + "' COLLATE Japanese_CS_AS_KS_WS;"
    const rows = await connect.test(sql);

    // 一致するレコードがあれば認証成功、レコードに含まれる名前とIDを passport.serializeUser(シリアライズ処理)に渡す
    if (rows[0]) {
        const user = { LoginUserName: rows[0]['NAME'], LoginUserID: rows[0]['ID'] };
        return done(null, user);
    } else {
        return done(null, false, { message: 'ユーザーIDまたはパスワードが正しくありません' });
    }
}));

// セッション設定
const ses_opt = {
    secret: '123456',
    resave: false,
    saveUninitialized: false,
    coolie: {
        httpOnly: true,
        secure: false,
        maxAge: 60 * 60 * 0.5 * 1000
    }
}

// ミドルウェア関数
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(flash());
app.use(session(ses_opt));
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/', router);

// 404をキャッチし、エラーハンドラに転送する
app.use(function(req, res, next) {
    next(createError(404));
});
// エラーハンドラ
app.use(function(err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;