/*
ログイン画面入力チェック
*/

/*
関数概要：未入力かどうかをチェックする
引数：なし
戻り値：true(入力チェックOK)、false(入力チェックNG)
*/
function Check() {
    if (
        document.loginform.username.value == "" ||
        document.loginform.password.value == ""
    ) {
        document.getElementById("error-message").innerHTML =
            "<p>未入力の項目があります</p>";
        return false;
    }
    return true;
}