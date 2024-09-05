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

function parseMessage(message_line) {
    // definisi gambaran hasil akhir parsing 
    // (variabel berikut digunakan untuk gambaran data apa saja yang diperlukan)
    let parsed_message_line = {
        from: {
            src: '0.0.0.0',
            lng: '0.0',
            lat: '0.0',
            sourceGeoCountryCode: "",
            sourceGeoLocationInfo: ""
        },
        to: {
            dst: '0.0.0.0',
            lng: '0.0',
            lat: '0.0',
            destinationGeoCountryCode: "",
            destinationGeoLocationInfo: "",
            dvchost: '',
            cs5: ''
        },
        action: {
            act: '',
            deviceSeverity: '',
            severity: '',
        },
    }

    // selanjutnya dilengkapi dengan proses sanitasi message_line
    // - menghilangkan <14> %{host} LOGSTASH[-]: 
    let newMessageLine = message_line.replace("<14> %{host} LOGSTASH[-]: ", "");
    // - konversi sisa string menjadi JSON
    let newMessageLineJSON = JSON.parse(newMessageLine);
    // ...

    // dari message_line yang sudah di sanitasi, lanjut ke proses assignment kedalam parsed_message_line
    // contoh : parsed_message_line.from.lng = cleanedMessageLine.slng;
    // ...
    parsed_message_line.from.src = newMessageLineJSON.src;
    parsed_message_line.from.lng = newMessageLineJSON.dlong;
    parsed_message_line.from.lat = newMessageLineJSON.dlat;
    parsed_message_line.from.sourceGeoCountryCode = newMessageLineJSON.sourceGeoCountryCode;
    parsed_message_line.from.sourceGeoLocationInfo = newMessageLineJSON.sourceGeoLocationInfo;
    parsed_message_line.to.dst = newMessageLineJSON.dst;
    parsed_message_line.to.lng = newMessageLineJSON.slong;
    parsed_message_line.to.lat = newMessageLineJSON.slat;
    parsed_message_line.to.destinationGeoCountryCode = newMessageLineJSON.destinationGeoCountryCode;
    parsed_message_line.to.destinationGeoLocationInfo = newMessageLineJSON.destinationGeoLocationInfo;
    parsed_message_line.to.dvchost = newMessageLineJSON.dvchost;
    parsed_message_line.to.cs5 = newMessageLineJSON.cs5;
    parsed_message_line.action.act = newMessageLineJSON.act;
    parsed_message_line.action.deviceSeverity = newMessageLineJSON.deviceSeverity;
    parsed_message_line.action.severity = newMessageLineJSON.severity;

    console.log(newMessageLineJSON);

    // data di dalam parsed_message_line dapat disimpan didalam database dengan memanggil function nya
    // ...
    const query = `INSERT INTO logs (src, slong, slat, sourceGeoCountryCode, sourceGeoLocationInfo, dst, dlong, dlat, destinationGeoCountryCode, destinationGeoLocationInfo, dvchost, cs5, act, deviceSeverity, severity) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    connection.query(query, [
        parsed_message_line.from.src,
        parsed_message_line.from.lng,
        parsed_message_line.from.lat,
        parsed_message_line.from.sourceGeoCountryCode,
        parsed_message_line.from.sourceGeoLocationInfo,
        parsed_message_line.to.dst,
        parsed_message_line.to.lng,
        parsed_message_line.to.lat,
        parsed_message_line.to.destinationGeoCountryCode,
        parsed_message_line.to.destinationGeoLocationInfo,
        parsed_message_line.to.dvchost,
        parsed_message_line.to.cs5,
        parsed_message_line.action.act,
        parsed_message_line.action.deviceSeverity,
        parsed_message_line.action.severity
    ], (err, result) => {
        if (err) throw err;
        console.log('Data inserted to MySQL:', result.insertId);
    });

    // function ini mengembalikan data parsed_message_line
    // yang dimana dapat digunakan di function yang akan foward data ini ke FE melalui websocket
    return parsed_message_line;
}


let message = eval(fs.readFileSync("./bin/sys.log", "utf-8"));


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

    // const data = readJsonFile();

    // Kirim data ke frontend
    setInterval(() => {
        let rnd = Math.floor(Math.random() * Math.floor(5));
        let info = JSON.stringify(parseMessage(message[rnd].message));
        ws.send(info)
        console.log()
    }, 2000);

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
