/*
カレンダーを表示し、スケジュールを表示する
*/

// ejsから取得したJSONを配列に戻さなければならないはずだが、何故かしなくてもうまく動く
// var parsedDataArr = JSON.parse(dataArr);

// user セレクトボックスを表示するためのコードを生成し、id="cal_user"に埋め込む
const userListStringHTML = generateUserList(userDataArr);
document.getElementById("cal_user").innerHTML = userListStringHTML;

// year セレクトボックスを表示するためのHTMLコードを生成し、id="year"に埋め込む
const MAX_YEAR_RANGE = new Date().getFullYear() + 3;
const yearListStringHTML = generate_year_range(2004, MAX_YEAR_RANGE);
document.getElementById("year").innerHTML = yearListStringHTML;

// テーブルヘッダーを生成するためのHTMLコードを生成し、id="thead-month"に埋め込む
const days = ["日", "月", "火", "水", "木", "金", "土"];
let dayHeaderStringHTML = "<tr>";
for (day in days) {
    dayHeaderStringHTML +=
        "<th data-days='" + days[day] + "'>" + days[day] + "</th>";
}
dayHeaderStringHTML += "</tr>";
document.getElementById("thead-month").innerHTML = dayHeaderStringHTML;

// calendar.ejsに埋め込まれた日付情報を取得し、カレンダーを表示する月と年を設定
const currentDate = document.getElementById("currentDate").title;
const currentDay = new Date(currentDate);
let currentMonth = currentDay.getMonth();
let currentYear = currentDay.getFullYear();

const selectYear = document.getElementById("year");
const selectMonth = document.getElementById("month");

// カレンダー生成
showCalendar(currentMonth, currentYear);
// スケジュール挿入
insertSchedule(currentMonth, currentYear, scheduleDataArr);

function generateUserList(rows) {
    let stringHTML = "";
    for (let i = 0; i < rows.length; i++) {
        stringHTML +=
            "<option value='" +
            rows[i]["ID"] +
            "'>" +
            rows[i]["NAME"] +
            "</option>";
    }
    return stringHTML;
}

/*
関数概要：セレクトボックスに表示する年の範囲を決め、HTMLコード文字列を生成する
引数：start(範囲ここから)、end(範囲ここまで)
戻り値：years(HTMLコード文字列)
*/
function generate_year_range(start, end) {
    var years = "";
    for (var year = start; year <= end; year++) {
        years += "<option value='" + year + "'>" + year + "</option>";
    }
    return years;
}

/*
関数概要：スケジュールカレンダーを生成して表示する
引数：month(月)、year(年)
戻り値：なし(カレンダー表示)
*/
function showCalendar(month, year) {
    const months = [
        "1月",
        "2月",
        "3月",
        "4月",
        "5月",
        "6月",
        "7月",
        "8月",
        "9月",
        "10月",
        "11月",
        "12月",
    ];

    // ページ上部に 月 と 年 を表示する
    const monthAndYear = document.getElementById("monthAndYear");
    monthAndYear.innerHTML = year + "年 " + months[month];

    // セレクトボックス内に 月 と 年 を表示する
    selectYear.value = year;
    selectMonth.value = month;

    // カレンダーを生成するための要素(1日の曜日、テーブルのHTML要素)を取得
    const firstDay = new Date(year, month).getDay();
    const tbl = document.getElementById("calendar-body");

    let dateCount1 = 1; // 日付セル表示用
    let dateCount2 = 1; // スケジュールセル表示用
    let cell_count; // 生成したセルの数

    // forループ開始：行
    for (let row_count = 0; row_count < 6; row_count++) {
        // 日付を表示するセルを生成し、できた行をテーブルに追加する
        const row1 = document.createElement("tr");
        // forループ開始：セル
        for (cell_count = 0; cell_count < 7; cell_count++) {
            if (row_count === 0 && cell_count < firstDay) {
                // 1日までの空白のセルを生成する
                let cell = document.createElement("td");
                cellText = document.createTextNode("");
                cell.appendChild(cellText);
                row1.appendChild(cell);
            } else if (dateCount1 > daysInMonth(month, year)) {
                // 日付がその月の最終日を超えるとループ終了
                break;
            } else {
                // 日付を埋め込んだセルを生成する
                let reqParam =
                    "?dt=" +
                    year +
                    "-" +
                    ("00" + (month + 1).toString()).slice(-2) +
                    "-" +
                    ("00" + dateCount1.toString()).slice(-2);
                let cell = document.createElement("td");
                cell.setAttribute("data-date", dateCount1);
                cell.setAttribute("data-month", month + 1);
                cell.setAttribute("data-year", year);
                cell.setAttribute("data-month_name", months[month]);
                cell.setAttribute("id", dateCount1);
                cell.className = "date-picker";
                cell.innerHTML =
                    '<li><span><a href="/today_schedule' +
                    reqParam +
                    '">' +
                    dateCount1 +
                    "</a></span></li>";

                // 今日の日付のセルにのみ class="date-picker selected" を設定する
                var today = new Date();
                if (
                    dateCount1 === today.getDate() &&
                    year === today.getFullYear() &&
                    month === today.getMonth()
                ) {
                    cell.className = "date-picker selected";
                }

                row1.appendChild(cell);
                dateCount1++;
            }
        }
        tbl.appendChild(row1);

        // スケジュールを表示するセルを生成し、できた行をテーブルに追加する
        const row2 = document.createElement("tr");
        // forループ開始：セル(日付のセルと表示する数を合わせる)
        for (k = 0; k < cell_count; k++) {
            if (row_count === 0 && k < firstDay) {
                // 1日までのセルは空白にする
                let cell = document.createElement("td");
                cellText = document.createTextNode("");
                cell.appendChild(cellText);
                row2.appendChild(cell);
            } else {
                let cell = document.createElement("td");
                const schedule_content_x = "schedule_content_" + dateCount2;
                cell.setAttribute("id", schedule_content_x);
                cell.className = "schedule_of_day";
                row2.appendChild(cell);
                dateCount2++;
            }
        }
        tbl.appendChild(row2);
    }
}

/*
関数概要：その月の日数を算出する
引数：iMonth(月)、iYear(年)
戻り値：日数
*/
function daysInMonth(iMonth, iYear) {
    return 32 - new Date(iYear, iMonth, 32).getDate();
}

/*
関数概要：指定したセルにその日のスケジュールを入れて表示する
引数：rows(スケジュールデータの配列)
戻り値：なし
*/
function insertSchedule(month, year, rows) {
    const MAX_DAYS = daysInMonth(month, year);
    if (rows[0]) {
        empId = rows[0]["EMPLOYEE_ID"];
    } else {
        empId = rows;
    }
    for (let date = 1; date <= MAX_DAYS; date++) {
        let idString = "schedule_content_" + date;
        let dateString =
            currentDay.getFullYear() +
            "-" +
            ("00" + (currentDay.getMonth() + 1).toString()).slice(-2) +
            "-" +
            ("00" + date.toString()).slice(-2);
        let reqParam = "?dt=" + dateString + "&id=" + -999 + "&emp=" + empId;
        document.getElementById(idString).innerHTML =
            '<li><span><a href="/schedule' +
            reqParam +
            '">' +
            "_" +
            "</a></span></li>";
    }
    console.log(rows); //確認用(*DBG)
    console.log(empId);
    if (isNaN(rows)) {
        rows.forEach((row) => {
            if (row["NAIYO"] == "") {
                row["NAIYO"] = "_";
            }
            let convertedDate = convertDate(row["DT"]);
            let reqParam =
                "?dt=" +
                row["DT"] +
                "&id=" +
                row["ID"] +
                "&emp=" +
                row["EMPLOYEE_ID"];
            document.getElementById(convertedDate).innerHTML =
                '<li><span><a href="/schedule' +
                reqParam +
                '">' +
                row["NAIYO"].replace(/\n/g, "<br>") +
                "</a></span></li>";
        });
    }
    document.getElementById("cal_user").value = empId;
}

/*
関数概要：スケジュールを表示するセルを指定するためのid(文字列)を生成する
引数：date(スケジュールと紐づいている日付)
戻り値：keyString(スケジュール表示セルの id である文字列)
*/
function convertDate(date) {
    const date_test = new Date(date);
    const convertedDate = date_test.getDate();
    const keyString = "schedule_content_" + convertedDate;
    return keyString;
}

function selectUser() {
    document.getElementById("selectUserData").value =
        document.getElementById("cal_user").value;
    document.selectUserForm.submit();
}

/*
関数概要：
    ・現在表示している月の次の月か前の月の日付の文字列を取得する
    ・calendar.ejs の onclick で呼ばれる
引数：i(1＝次の月、-1＝前の月)
戻り値：なし(req(リクエスト)に移動先の日付の文字列を埋め込む)
*/
function addMonthRequest(i) {
    if (i > 0) {
        currentYear = currentMonth === 11 ? currentYear + i : currentYear;
        currentMonth = (currentMonth + i) % 12;
    } else {
        currentYear = currentMonth === 0 ? currentYear + i : currentYear;
        currentMonth = currentMonth === 0 ? 11 : currentMonth + i;
    }
    const dateString =
        currentYear.toString() +
        "-" +
        ("00" + (currentMonth + 1).toString()).slice(-2);
    const date = new Date(dateString);
    document.getElementById("request_date_data_pn").value = date;
}

/*
関数概要：セレクトボックスで選択された月/年の日付の文字列を取得して送信する
引数：なし
戻り値：なし(req(リクエスト)に選択した月/年の日付の文字列を埋め込み、submit する)
*/
function generateRequestDate() {
    currentYear = parseInt(selectYear.value);
    currentMonth = parseInt(selectMonth.value);
    document.getElementById("request_date_data_g").value =
        currentYear.toString() +
        "-" +
        ("00" + (currentMonth + 1).toString()).slice(-2);
    document.select_form.submit();
}