const admin = require("firebase-admin");
const fs = require("fs");
const csv = require("csv-parser");

// Inisialisasi Firebase Admin SDK dengan file kunci layanan akun kamu
const serviceAccount = require("PATH TO YOUR SERVICE ACCOUNT");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function parseTimestamp(dateString) {
    // Mengambil tanggal dan waktu dari format CSV
    const [date, time] = dateString.split(" ");
    const year = new Date().getFullYear(); // Mengambil tahun saat ini
    const [month, day] = date.split("-");
    const [hour, minute] = time.split(":");

    return new Date(year, month - 1, day, hour, minute);
}

function processCsvData() {
    const results = [];  // Pastikan 'results' didefinisikan di sini

    fs.createReadStream("./data.csv")
        .pipe(csv({
            mapHeaders: ({ header }) => header.trim() // Hapus spasi ekstra dari header
        }))
        .on("data", (data) => {
            console.log(data);
            // Periksa apakah kolom "Start Time / End Time" ada dan tidak null
            if (data["Start Time / End Time"]) {
                // Parsing Start Time / End Time
                let startEndTime = data["Start Time / End Time"].split(" to ");
                let startTimeString = startEndTime[0].trim();
                let endTimeString = startEndTime[1]?.trim();

                let startTime = parseTimestamp(startTimeString);
                let endTime = endTimeString ? parseTimestamp(endTimeString) : null;

                // Menyiapkan objek yang akan disimpan ke Firestore
                const docData = {
                    CHK: data.CHK || "",
                    Direction: data.Direction || "",
                    Duration: data.Duration || "",
                    EndTime: endTime ? admin.firestore.Timestamp.fromDate(endTime) : null,
                    ID: data.ID || "",
                    No: data["No."] || "",
                    Resource: data.Resource || "",
                    Severity: data.Severity || "",
                    StartTime: admin.firestore.Timestamp.fromDate(startTime),
                    Status: data.Status || "",
                    Type: data.Type || "",
                    VictimIp: data["Victim IP"] || "",
                };

                results.push(docData);
            } else {
                console.error("Data 'Start Time / End Time' tidak ditemukan atau null:", data);
            }
        })
        .on("end", async () => {
            // Upload data ke Firestore
            for (let doc of results) {
                await db.collection("DDosAttackIndonesia").add(doc);
            }
            console.log("Data CSV berhasil diunggah ke Firestore!");
        });
}

processCsvData();
