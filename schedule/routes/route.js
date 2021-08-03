/*
ルーティングモジュールの設定
暫定処理として全URLを一つにまとめた
*/

// モジュールの呼び出し
const express = require("express");
const passport = require("passport");
const url = require("url");
const dayjs = require("dayjs");
dayjs.extend(require("dayjs/plugin/timezone"));
dayjs.extend(require("dayjs/plugin/utc"));
dayjs.tz.setDefault("Asia/Tokyo");

const connect = require("../config/connect2");

const router = express.Router();

// ログイン画面
router.get("/", function(req, res, next) {
    const errorMessage = req.flash("error").join("<br>");
    // req(リクエスト)に含まれるエラーメッセージ（フラッシュメッセージ）を login.ejs に埋め込む
    res.render("login", { errorMessage: errorMessage });
});

// passport 認証処理
router.post(
    "/",
    (req, res, next) => {
        if ("passport" in req.session && "user" in req.session.passport) {
            req.flash("error", "現在、同じセッションでログイン中です");
            res.redirect("/");
        } else {
            next();
        }
    },
    passport.authenticate("local", {
        successRedirect: "/home",
        failureRedirect: "/",
        failureFlash: true,
        badRequestMessage: "未入力の項目があります", // フィールド欠落(未入力)時のフラッシュメッセージ
    })
);

// 認証成功＝ログイン後のホーム画面
// ログイン当日の登録ユーザー全員のスケジュールを表示する
router.get("/home", async function(req, res) {
    req.session.inputId = null;
    req.session.inputPW = null;
    if ("passport" in req.session && "user" in req.session.passport) {
        const date = dayjs();
        const date1 = date.format("YYYY-MM-DD");
        const date2 = date.add(1, "day").format("YYYY-MM-DD");
        const sql =
            "SELECT EMPLOYEE_ID, NAME, NAIYO FROM TRN_SCHEDULE INNER JOIN MST_EMPLOYEE ON TRN_SCHEDULE.EMPLOYEE_ID = MST_EMPLOYEE.ID WHERE DT >= '" +
            date1 +
            "' AND DT < '" +
            date2 +
            "' AND DATALENGTH(NAIYO)! = 0;";
        const dayScheduleDataRows = await connect.test(sql);
        // console.log(dayScheduleDataRows); // DBG
        req.session.dateData = date.format("YYYY-MM");
        const yearStringJP = date.year() + "年";
        const monthStringJP = date.month() + 1 + "月";
        const dateStringJP = date.date() + "日";
        req.session.dateString = yearStringJP + monthStringJP + dateStringJP;
        req.session.selectedUserId = req.session.passport.user.LoginUserID;
        res.render("home", {
            loginUserName: req.session.passport.user.LoginUserName,
            loginUserId: req.session.passport.user.LoginUserID,
            date: req.session.dateString,
            dayScheduleDatas: dayScheduleDataRows,
        });
    } else {
        res.redirect("/");
    }
});

// 未使用
router.get("/calendar", async function(req, res, next) {
    res.redirect("/");
});

/*
スケジュールカレンダー表示画面
日付情報をもとにデータベースからスケジュール情報を取得する
*/
router.post("/calendar", async function(req, res, next) {
    if ("passport" in req.session && "user" in req.session.passport) {
        // req.session.text の初期化
        req.session.text1 = null;
        req.session.text2 = null;

        // ホーム画面からの遷移時は今日の日付を取得する
        // スケジュールカレンダー画面からの遷移時はreq(リクエスト)に含まれる日付情報を取得する
        if (req.body.request_date_data_pn) {
            req.session.dateData = req.body.request_date_data_pn;
        } else if (req.body.request_date_data_g) {
            req.session.dateData = req.body.request_date_data_g;
        }
        // console.log("req.session.dateData:" + req.session.dateData);// *DBG

        if (req.body.selectUserData) {
            req.session.selectedUserId = parseInt(req.body.selectUserData);
        }
        //console.log("req.session.selectedUserId:" + req.session.selectedUserId); // *DBG

        // SQL発行のために、取得した日付情報(Date)を文字列(string)に変換する必要がある
        const fromDateString = dayjs(req.session.dateData).format("YYYY-MM-DD");
        const toDateString = dayjs(req.session.dateData)
            .add(1, "month")
            .format("YYYY-MM-DD");
        // console.log("fromDateString:" + fromDateString); // *DBG
        // console.log("toDateString:" + toDateString); // *DBG

        // スケジュールデータ取得
        let sql = generateSQL(
            req.session.selectedUserId,
            fromDateString,
            toDateString
        );
        let scheduleDataRows;
        try {
            scheduleDataRows = await connect.test(sql);
            if (scheduleDataRows == 0) {
                scheduleDataRows = req.session.selectedUserId;
            }
        } catch (e) {
            console.log("ERROR:" + e);
            req.flash("failure", "スケジュール情報の取得に失敗しました。");
        }
        // console.log("scheduleDataRows:")
        // console.log(scheduleDataRows); // 取得データ確認(*DBG)

        // ユーザーデータ取得
        sql = "SELECT ID, NAME FROM MST_EMPLOYEE ORDER BY ORDER_NO ASC;";
        let userDataRows;
        try {
            userDataRows = await connect.test(sql);
        } catch (e) {
            console.log("ERROR:" + e);
            req.flash("failure", "ユーザー情報の取得に失敗しました。");
        }
        // console.log(userDataRows); // *DBG

        res.render("calendar01", {
            currentDate: req.session.dateData,
            loginUserName: req.session.passport.user.LoginUserName,
            scheduleDatas: scheduleDataRows,
            userDatas: userDataRows,
            message: req.flash("failure"),
        });
    } else {
        res.redirect("/");
    }
});

/*
当日スケジュール一覧表示画面
URLパラメータに含まれる情報を元に、その日の全社員のスケジュールを取得する
レコードが空文字 or NULLの場合は表示しない
*/
router.get("/today_schedule", async function(req, res, next) {
    if ("passport" in req.session && "user" in req.session.passport) {
        const urlParse = url.parse(req.url, true);
        const date1 = urlParse.query.dt;
        const date2 = dayjs(urlParse.query.dt)
            .add(1, "day")
            .format("YYYY-MM-DD");
        const sql =
            "SELECT EMPLOYEE_ID, NAME, NAIYO FROM TRN_SCHEDULE INNER JOIN MST_EMPLOYEE ON TRN_SCHEDULE.EMPLOYEE_ID = MST_EMPLOYEE.ID WHERE DT >= '" +
            date1 +
            "' AND DT < '" +
            date2 +
            "' AND DATALENGTH(NAIYO)! = 0;";
        const dayScheduleDataRows = await connect.test(sql);
        // console.log(dayScheduleDataRows);// *DBG
        const date = dayjs(urlParse.query.dt);
        const yearStringJP = date.year() + "年";
        const monthStringJP = date.month() + 1 + "月";
        const dateStringJP = date.date() + "日";
        req.session.dateString = yearStringJP + monthStringJP + dateStringJP;
        res.render("today_schedule", {
            loginUserName: req.session.passport.user.LoginUserName,
            loginUserId: req.session.passport.user.LoginUserID,
            date: req.session.dateString,
            dayScheduleDatas: dayScheduleDataRows,
        });
    } else {
        res.redirect("/");
    }
});

/*
スケジュール詳細表示画面
URLパラメータに含まれる情報を元にスケジュールの詳細(NAIYO2)を取得する
該当レコードが存在しない場合は、レコードの雛型を生成する
*/
router.get("/schedule", async function(req, res, next) {
    if ("passport" in req.session && "user" in req.session.passport) {
        let urlParse = url.parse(req.url, true);
        let scheduleDataRows;
        try {
            if (parseInt(urlParse.query.id) < 0) {
                // レコードの雛型を生成
                // console.log('id = -999');// *DBG
                scheduleDataRows = [{
                    DT: urlParse.query.dt,
                    EMPLOYEE_ID: parseInt(urlParse.query.emp),
                    ID: parseInt(urlParse.query.id),
                    NAIYO: "",
                    NAIYO2: "",
                }, ];
            } else {
                const sql =
                    "SELECT ID, EMPLOYEE_ID, DT, NAIYO, NAIYO2 FROM TRN_SCHEDULE WHERE ID = '" +
                    urlParse.query.id +
                    "' AND EMPLOYEE_ID = '" +
                    urlParse.query.emp +
                    "' AND DT = '" +
                    urlParse.query.dt +
                    "';";
                scheduleDataRows = await connect.test(sql);
                // console.log(scheduleDataRows);// *DBG
                if (!Array.isArray(scheduleDataRows)) {
                    console.log("error!!!");
                    throw new Error();
                }
            }
            console.log(scheduleDataRows);
            if (req.session.text1 || req.session.text2) {
                scheduleDataRows[0]["NAIYO"] = req.session.text1;
                scheduleDataRows[0]["NAIYO2"] = req.session.text2;
            }
        } catch (e) {
            req.flash("getFailure", "スケジュール情報の取得に失敗しました。");
        }
        if (urlParse.query.dt) {
            const date = dayjs(urlParse.query.dt);
            const yearStringJP = date.year() + "年";
            const monthStringJP = date.month() + 1 + "月";
            const dateStringJP = date.date() + "日";
            req.session.dateString =
                yearStringJP + monthStringJP + dateStringJP;
        }
        res.render("schedule", {
            loginUserName: req.session.passport.user.LoginUserName,
            loginUserId: req.session.passport.user.LoginUserID,
            date: req.session.dateString,
            scheduleData: scheduleDataRows,
            errormessage: req.flash("getFailure"),
            message: req.flash("sendFailure"),
        });
    } else {
        res.redirect("/");
    }
});

/*
スケジュール更新
更新失敗時に詳細画面へ戻る時に、入力データをセッション変数に保存して返す
*/
router.post("/update", async function(req, res, next) {
    if ("passport" in req.session && "user" in req.session.passport) {
        let sql =
            "SELECT COUNT(*) COUNT FROM TRN_SCHEDULE WHERE DT = '" +
            req.body.dt +
            "' AND ID = " +
            req.body.id +
            " AND EMPLOYEE_ID = " +
            req.body.emp +
            ";";
        const countResult = await connect.test(sql);
        console.log(countResult[0]["COUNT"]);
        if (countResult[0]["COUNT"] == 0) {
            sql =
                "INSERT INTO TRN_SCHEDULE (DT, EMPLOYEE_ID, NAIYO, NAIYO2) SELECT '" +
                req.body.dt +
                "', " +
                req.body.emp +
                ", '" +
                req.body.schedule_text1 +
                "', '" +
                req.body.schedule_text2 +
                "';";
            // console.log(sql);// *DBG
        } else {
            sql =
                "UPDATE TRN_SCHEDULE SET NAIYO = '" +
                req.body.schedule_text1 +
                "', NAIYO2 = '" +
                req.body.schedule_text2 +
                "' WHERE DT = '" +
                req.body.dt +
                "' AND ID = " +
                req.body.id +
                " AND EMPLOYEE_ID = " +
                req.body.emp +
                ";";
            // console.log(sql); //*DBG
        }
        try {
            const result = await connect.test(sql);
            console.log(result); // *DBG
            if (!Array.isArray(result)) {
                console.log("error!!!");
                throw new Error();
            }
            // req.flash('sucsess', 'データの送信に成功しました。');
            res.redirect(307, "/calendar"); // リダイレクトをPOSTで行う
        } catch (e) {
            // ERROR発生/rowCount:0 は入力画面へ戻る
            req.flash("sendFailure", "データの送信に失敗しました。");
            req.session.text1 = req.body.schedule_text1;
            req.session.text2 = req.body.schedule_text2;
            let url =
                "/schedule?dt=" +
                req.body.dt +
                "&id=" +
                req.body.id +
                "&emp=" +
                req.body.emp;
            res.redirect(url);
        }
    } else {
        res.redirect("/");
    }
});

// ログアウト時の処理
// セッション情報を破棄し、成功すればログイン画面へ遷移する
router.post("/logout", function(req, res, next) {
    req.session.destroy(function(err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });
});

/*
関数概要：一定期間(ひと月分)のスケジュールを取得するSQL文を生成する
引数：ID(社員ID)、fromDate(期間ここから)、toDate(期間ここまで)
戻り値：sql(SQL文)
 */
function generateSQL(ID, fromDate, toDate) {
    let sql =
        "SELECT SC.ID, SC.EMPLOYEE_ID, DT, ISNULL(NAIYO, '') AS NAIYO FROM TRN_SCHEDULE SC INNER JOIN MST_EMPLOYEE EM ON SC.EMPLOYEE_ID = EM.ID WHERE SC.DT >= '" +
        fromDate +
        "' AND SC.DT < '" +
        toDate +
        "' AND SC.EMPLOYEE_ID = " +
        ID +
        ";";
    return sql;
}

module.exports = router;