/*
スケジュール・日報　登録・編集画面
*/

// console.log(dataArr); (*DBG)

// 日付、社員ID、スケジュール・日報IDのセット
document.getElementById("dt").value = dataArr[0]["DT"];
document.getElementById("emp").value = dataArr[0]["EMPLOYEE_ID"];
document.getElementById("id").value = dataArr[0]["ID"];

// スケジュール・日報それぞれの表示
document.getElementById("schedule_1").value = dataArr[0]["NAIYO"];
document.getElementById("schedule_2").value = dataArr[0]["NAIYO2"];

// ログインしているユーザー以外のスケジュール・日報は、内容編集と送信を不可にする
if (
    document.getElementById("login_userid").title !=
    document.getElementById("emp").value
) {
    document.getElementById("send").disabled = true;
    document.getElementById("schedule_1").disabled = true;
    document.getElementById("schedule_2").disabled = true;
}

// スケジュール・日報のIDが0以上(既に存在する)場合は更新、0以下(-999)の場合は新規登録
if (dataArr[0]["ID"] < 0) {
    document.getElementById("update_status").value = "insert";
} else {
    document.getElementById("update_status").value = "update";
}