const fs = require('fs');
const mysql = require('mysql');
const express = require('express');
const WebSocket = require('ws');
require('dotenv').config();


const app = express();
const port = 3000;

// Setup MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL');
});

// Baca file JSON
function parseLogString(logString) {
    // Cari bagian setelah ":" pertama, di mana key-value pair dimulai
    let keyValuePairs = logString.split(": ").slice(1).join(": ").split("; ");

    let jsonObject = {};

    keyValuePairs.forEach(pair => {
        // Abaikan jika kosong
        if (pair.trim() === "") return;

        // Pecah key dan value berdasarkan ":"
        let [key, value] = pair.split(": ");

        if (value) {
            // Bersihkan value dari karakter yang tidak perlu (seperti extra spaces)
            value = value.trim();

            // Masukkan ke dalam objek JSON
            jsonObject[key.trim()] = value;
        }
    });

    return jsonObject;
}

function saveToDatabase(data) {
    const sql = `
      INSERT INTO anomaly_logs 
      (anomaly_id, creation_time, update_time, type, sub_type, scope, severity, status, direction, resource, 
      resource_id, importance, triggered_value, threshold, unit, anomaly_host_ip, sip1, sip2, sip3, sport1, sport2, 
      protocol, url_to_link, remarks, attack_direction, sport3)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Format tanggal untuk MySQL
    const creationTime = data["Creation Time"] ? new Date(data["Creation Time"]) : null;
    const updateTime = data["Update Time"] ? new Date(data["Update Time"]) : null;

    // Log data yang akan dimasukkan
    console.log('Data to be inserted:', [
        data["Anomaly ID"] || null,
        creationTime,
        updateTime,
        data["Type"] || null,
        data["Sub-type"] || null,
        data["Scope"] || null,
        data["Severity"] || null,
        data["Status"] || null,
        data["Direction"] || null,
        data["Resource"] || null,
        data["Resource ID"] || null,
        data["Importance"] || null,
        data["Triggered Value"] || null,
        data["Threshold"] || null,
        data["Unit"] || null,
        data["Anomaly Host IP"] || null,
        data["SIP1"] || null,
        data["SIP2"] || null,
        data["SIP3"] || null,
        data["SPort1"] || null,
        data["SPort2"] || null,
        data["Protocol"] || null,
        data["URL to Link the Report"] || null,
        data["Remarks"] || null,
        data["Attack Direction"] || null,
        data["Sport3"] || null  // Field baru ditambahkan di sini
    ]);

    connection.query(sql, [
        data["Anomaly ID"] || null,
        creationTime,
        updateTime,
        data["Type"] || null,
        data["Sub-type"] || null,
        data["Scope"] || null,
        data["Severity"] || null,
        data["Status"] || null,
        data["Direction"] || null,
        data["Resource"] || null,
        data["Resource ID"] || null,
        data["Importance"] || null,
        data["Triggered Value"] || null,
        data["Threshold"] || null,
        data["Unit"] || null,
        data["Anomaly Host IP"] || null,
        data["SIP1"] || null,
        data["SIP2"] || null,
        data["SIP3"] || null,
        data["SPort1"] || null,
        data["SPort2"] || null,
        data["Protocol"] || null,
        data["URL to Link the Report"] || null,
        data["Remarks"] || null,
        data["Attack Direction"] || null,
        data["Sport3"] || null  // Field baru ditambahkan di sini
    ], (err, results) => {
        if (err) {
            console.error('Error inserting data:', err);
        } else {
            console.log('Data inserted successfully, ID:', results.insertId);
        }
    });
}






function parseMessage(message_line) {
    const jsonData = parseLogString(message_line);
    // saveToDatabase(jsonData);
    return jsonData;
}


let message = fs.readFileSync("./bin/geni_log_1.json", "utf-8");
let message2 = fs.readFileSync("./bin/geni_log_2.json", "utf-8");

let json_1 = fs.readFileSync("./bin/json_1.json", "utf-8");
let json_2 = fs.readFileSync("./bin/json_2.json", "utf-8");
let json_3 = fs.readFileSync("./bin/json_3.json", "utf-8");
let json_4 = fs.readFileSync("./bin/json_4.json", "utf-8");
let sebelum_json_1 = fs.readFileSync("./bin/sebelum_json_1.json", "utf-8");
let sebelum_json_3 = fs.readFileSync("./bin/sebelum_json_3.json", "utf-8");


let messages = [message, message2, json_1, json_2, json_3, json_4, sebelum_json_1, sebelum_json_3]
console.log();


// function readJsonFile() {
//     return JSON.parse(fs.readFileSync('data.json', 'utf8'));
// }

// // Simpan data ke database sebagai log
// function logDataToDatabase(data) {
//     data.forEach(item => {
//         const key = item.key; 
//         const value = JSON.stringify(item.value);

//         connection.query('INSERT INTO data (key_name, value) VALUES (?, ?)', [key, value], (err, result) => {
//             if (err) throw err;
//             console.log('Data logged', result.insertId);
//         });
//     });
// }

// Setup WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('Client connected');

    // Kirim data ke frontend
    // setTimeout(() => {
    //     let rnd = Math.floor(Math.random() * Math.floor(1));
    //     const jsonStringMessage = JSON.parse(messages[1]).fields["event.original"][0]
    //     let info = JSON.stringify(parseMessage(jsonStringMessage));
    //     ws.send(info)
    // }, 10000);

    // setTimeout(() => {
    //     let rnd = Math.floor(Math.random() * Math.floor(1));
    //     const jsonStringMessage = JSON.parse(messages[0]).fields["event.original"][0]
    //     let info = JSON.stringify(parseMessage(jsonStringMessage));
    //     ws.send(info)
    // }, 310000)



    // !todo SKEMA A
    // sebelum json 3 - sebelum json 1 - json 1 - json 2 - json 3 - message 2 - json 4 - message
    setTimeout(() => {
        let rnd = Math.floor(Math.random() * Math.floor(1));
        const jsonStringMessage = JSON.parse(messages[7]).fields["event.original"][0]
        let info = JSON.stringify(parseMessage(jsonStringMessage));
        ws.send(info)
        console.log({ sebelum_json_3: JSON.parse(info) });
    }, 1000)
    setTimeout(() => {
        let rnd = Math.floor(Math.random() * Math.floor(1));
        const jsonStringMessage = JSON.parse(messages[6]).fields["event.original"][0]
        let info = JSON.stringify(parseMessage(jsonStringMessage));
        ws.send(info)
        console.log({ sebelum_json_1: JSON.parse(info) });
    }, 21000)
    setTimeout(() => {
        let rnd = Math.floor(Math.random() * Math.floor(1));
        const jsonStringMessage = JSON.parse(messages[2]).fields["event.original"][0]
        let info = JSON.stringify(parseMessage(jsonStringMessage));
        ws.send(info)
        console.log({ json_1: JSON.parse(info) });
    }, 41000)
    setTimeout(() => {
        let rnd = Math.floor(Math.random() * Math.floor(1));
        const jsonStringMessage = JSON.parse(messages[3]).fields["event.original"][0]
        let info = JSON.stringify(parseMessage(jsonStringMessage));
        ws.send(info)
        console.log({ json_2: JSON.parse(info) });
    }, 61000)
    setTimeout(() => {
        let rnd = Math.floor(Math.random() * Math.floor(1));
        const jsonStringMessage = JSON.parse(messages[4]).fields["event.original"][0]
        let info = JSON.stringify(parseMessage(jsonStringMessage));
        ws.send(info)
        console.log({ json_3: JSON.parse(info) });
    }, 81000)
    setTimeout(() => {
        let rnd = Math.floor(Math.random() * Math.floor(1));
        const jsonStringMessage = JSON.parse(messages[1]).fields["event.original"][0]
        let info = JSON.stringify(parseMessage(jsonStringMessage));
        ws.send(info)
        console.log({ message2: JSON.parse(info) });
    }, 101000)
    setTimeout(() => {
        let rnd = Math.floor(Math.random() * Math.floor(1));
        const jsonStringMessage = JSON.parse(messages[5]).fields["event.original"][0]
        let info = JSON.stringify(parseMessage(jsonStringMessage));
        ws.send(info)
        console.log({ json4: JSON.parse(info) });
    }, 121000)
    setTimeout(() => {
        let rnd = Math.floor(Math.random() * Math.floor(1));
        const jsonStringMessage = JSON.parse(messages[0]).fields["event.original"][0]
        let info = JSON.stringify(parseMessage(jsonStringMessage));
        ws.send(info)
        console.log({ message: JSON.parse(info) });
    }, 141000)

    // ! skema b

    // setTimeout(() => {
    //     let rnd = Math.floor(Math.random() * Math.floor(1));
    //     const jsonStringMessage = JSON.parse(messages[7]).fields["event.original"][0]
    //     let info = JSON.stringify(parseMessage(jsonStringMessage));
    //     ws.send(info)
    //     console.log({ message1: JSON.parse(info) });
    // }, 1000)
    // setTimeout(() => {
    //     let rnd = Math.floor(Math.random() * Math.floor(1));
    //     const jsonStringMessage = JSON.parse(messages[4]).fields["event.original"][0]
    //     let info = JSON.stringify(parseMessage(jsonStringMessage));
    //     ws.send(info)
    //     console.log({ json_3: JSON.parse(info) });
    // }, 11000)





    console.log()

    // Simpan data ke database sebagai log
    // logDataToDatabase(data);

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Mulai server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
