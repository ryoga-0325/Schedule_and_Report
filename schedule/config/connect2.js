/*
データベース接続モジュールの設定
*/

// モジュールの呼び出し
const util = require("util");
const { Connection, Request } = require("tedious");

beginTransactionAsync = null;
commitTransactionAsync = null;
rollbackTransactionAsync = null;

/*
関数概要：データベースに接続する、トランザクションの定義
引数：config(DB名などの接続に関する設定)
戻り値：connection(接続インスタンス)
*/
function create_connection(config) {
    const connection = new Connection(config);
    const p = new Promise(function(resolve, reject) {
        connection.on("connect", (err) => {
            if (err) {
                reject(err);
            } else {
                beginTransactionAsync = util
                    .promisify(connection.beginTransaction)
                    .bind(connection);
                commitTransactionAsync = util
                    .promisify(connection.commitTransaction)
                    .bind(connection);
                rollbackTransactionAsync = util
                    .promisify(connection.rollbackTransaction)
                    .bind(connection);
                resolve(connection);
            }
        });
        connection.connect();
    });
    return p;
}

/*
関数概要：
    ・SQLを送信しDBから取得したデータを配列に格納する
    ・エラー発生時/0レコード処理の場合はエラーを返す
引数：connection(接続インスタンス)、sql(SQL文の文字列)
戻り値：rows(DBから取得したデータの配列)
*/
function execute(connection, sql) {
    const p = new Promise(function(resolve, reject) {
        const request = new Request(sql, (err, rowCount, columns) => {
            console.log("rowCount:" + rowCount);
            if (err) {
                reject(err);
                return;
            }
            if (rowCount == 0) {
                resolve(0);
            } else {
                let rows = [];
                columns.forEach((column) => {
                    let row = {};
                    column.forEach((field) => {
                        row[field.metadata.colName] = field.value;
                    });
                    rows.push(row);
                });
                resolve(rows);
            }
        });
        connection.execSql(request);
    });
    return p;
}

/*
関数概要：DBへの接続、SQLの発行、データの取得を行う
引数：sql(SQL文の文字列)
戻り値：rows(DBから取得したデータ)
*/
exports.test = async function(sql) {
    // DB接続に関する設定
    const config = {
        authentication: {
            options: {
                userName: "******",
                password: "******",
            },
            type: "default",
        },
        server: "localhost",
        options: {
            instanceName: "SQLEXPRESS",
            database: "******",
            encrypt: false,
            rowCollectionOnRequestCompletion: true,
        },
    };

    // DBに接続 > SQL送信 > データ取得 > DBから切断 > 取得したデータを戻す
    let connection;
    let rows;
    try {
        connection = await create_connection(config);
        await beginTransactionAsync();
        console.log("beginTransaction() done");
        rows = await execute(connection, sql);
        await commitTransactionAsync();
        console.log("commitTransaction() done");
    } catch (err) {
        await rollbackTransactionAsync();
        console.log("transaction rollback error: ", err);
    }
    connection.close();
    console.log("close() done!");
    return rows;
};