/*
カレンダーの日付押下時、選択日の全員のスケジュールを表示する
基本ロジックはログイン後のホーム画面に表示するものと同じ
*/

const tb = document.getElementById("schedule_table_body");

const loginUserId = document.getElementById("login_userid").title;

console.log(dayScheduleDataArr);
showScheduleTable();

function showScheduleTable() {
    for (let rowCount = 0; rowCount < dayScheduleDataArr.length; rowCount++) {
        const row = document.createElement("tr");
        const nameCell = document.createElement("td");
        nameCell.innerHTML =
            "<span>" + dayScheduleDataArr[rowCount]["NAME"] + "</span>";
        if (loginUserId == dayScheduleDataArr[rowCount]["EMPLOYEE_ID"]) {
            nameCell.className = "name-loginUser";
        } else {
            nameCell.className = "name";
        }
        row.appendChild(nameCell);
        const scheduleCell = document.createElement("td");
        scheduleCell.innerHTML =
            "<span>" +
            dayScheduleDataArr[rowCount]["NAIYO"].replace(/\n/g, "<br>") +
            "</span>";
        if (loginUserId == dayScheduleDataArr[rowCount]["EMPLOYEE_ID"]) {
            scheduleCell.className = "schedule-loginUser";
        } else {
            scheduleCell.className = "schedule";
        }
        row.appendChild(scheduleCell);
        tb.appendChild(row);
    }
}