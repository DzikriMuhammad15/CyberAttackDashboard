import {
    select,
    json,
    geoPath,
    geoNaturalEarth1,
    zoom,
    easeCubicInOut,
} from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson@3/+esm";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import {
    getFirestore,
    collection,
    onSnapshot,
    Timestamp,
    doc,
    updateDoc,
    getDocs,
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import dayjs from "https://cdn.jsdelivr.net/npm/dayjs@1.10.4/+esm";
import utc from "https://cdn.jsdelivr.net/npm/dayjs@1.10.4/plugin/utc/+esm";
import anime from "https://cdn.jsdelivr.net/npm/animejs@3.2.1/+esm";

dayjs.extend(utc);

const ws = new WebSocket("ws:/localhost:8080");
const ipInfoToken = "3949280a8aa576";

let onGoingYellowAttack = [];
let onGoingRedAttack = [];


function sameArray(arr1, arr2) {
    // Check if lengths are the same
    if (arr1.length !== arr2.length) {
        return false;
    }

    // Sort both arrays and compare them
    let sortedArr1 = arr1.slice().sort();
    let sortedArr2 = arr2.slice().sort();

    // Compare element by element
    for (let i = 0; i < sortedArr1.length; i++) {
        if (sortedArr1[i] !== sortedArr2[i]) {
            return false;
        }
    }

    return true;
}

function formatIpAddresses(victimIp, sourceIp) {
    // Replace all "." in victimIp with "-"
    let formattedVictimIp = victimIp.replace(/\./g, "-");

    // Replace all "." in each IP in the sourceIp array and join them
    let formattedSourceIp = sourceIp
        .map((ip) => ip.replace(/\./g, "-"))
        .join("-");

    // Concatenate victimIp with sourceIp
    return formattedVictimIp + "-" + formattedSourceIp;
}

// Fungsi untuk mengonversi Timestamp ke Date
function timestampToDate(timestamp) {
    return timestamp.toDate();
}

function removeAttackById(attackId) {
    // Menghapus marker berdasarkan attackId
    d3.selectAll(`.marker-${attackId}`).interrupt().remove(); // Menghentikan animasi transisi
    // Menghapus animasi pulse berdasarkan attackId
    d3.selectAll(`.pulse-${attackId}`).interrupt().remove();
    // Menghapus animasi garis berdasarkan attackId
    d3.selectAll(`.line-${attackId}`).interrupt().remove();
}

function isAttackOnGoing(newAttack) {
    return (
        onGoingYellowAttack.some(
            (attack) =>
                attack["Anomaly ID"] === newAttack["Anomaly ID"]
        ) ||
        onGoingRedAttack.some(
            (attack) =>
                attack["Anomaly ID"] === newAttack["Anomaly ID"]
        )
    );
}

function renderMarkerByStatus(el) {
    const sourceIP = el.sourceIp;
    const destinationIP = el.VictimIp;
    const attackId = el["Anomaly ID"];
    let startPulseAnimation, marker;

    const getGeoLocation = (ip) =>
        fetch(`https://ipinfo.io/${ip}/geo?token=${ipInfoToken}`).then(
            (response) => response.json()
        );

    const getArrayGeolocation = (ips) => {
        const promises = ips.map((ip) =>
            fetch(`https://ipinfo.io/${ip}/geo?token=${ipInfoToken}`).then(
                (response) => response.json()
            )
        );
        return Promise.all(promises);
    };

    // Hapus semua elemen dengan attackId ini sebelum melanjutkan
    removeAttackById(attackId);  // Memastikan elemen sebelumnya terhapus

    // Tunggu hingga data geolokasi diambil
    Promise.all([
        getArrayGeolocation(sourceIP),
        getGeoLocation(destinationIP),
    ]).then((locations) => {
        const [sourceData, destinationData] = locations;

        let sourceCoords = [];
        sourceData.forEach((el) => {
            let [sourceLat, sourceLon] = el.loc.split(",");
            let sourceCoord = projection([sourceLon, sourceLat]);
            sourceCoords.push(sourceCoord);
        });

        const [destLat, destLon] = destinationData.loc.split(",");
        const destCoords = projection([destLon, destLat]);

        // Pastikan tidak ada elemen dengan attackId ini sebelum membuat elemen baru
        removeAttackById(attackId);

        g.append("circle")
            .attr("cx", destCoords[0])
            .attr("cy", destCoords[1])
            .attr("r", 5)
            .attr("class", `marker marker-${attackId}`) // Menambahkan kelas khusus dengan ID
            .append("title")
            .text(`${destinationData.city}, ${destinationData.country}`);

        function createPulse(className) {
            const pulse = g
                .append("circle")
                .attr("class", `${className} pulse-${attackId}`) // Menambahkan kelas khusus dengan ID
                .attr("cx", destCoords[0])
                .attr("cy", destCoords[1])
                .attr("r", 5)
                .attr("opacity", 0.7);

            let radiusEnd = className === "pulseRed" ? 25 : 15;

            pulse
                .transition()
                .duration(1500)
                .ease(d3.easeCubicInOut)
                .attr("r", radiusEnd)
                .attr("opacity", 0)
                .on("end", () => {
                    pulse.remove();
                    if (isAttackOnGoing(el) && marker && !marker.empty()) {
                        createPulse(className);
                    }
                });
        }

        let idx = 0;

        function drawLine(className) {
            const lineGenerator = d3
                .line()
                .x((d) => d[0])
                .y((d) => d[1])
                .curve(d3.curveBasis);

            const points = [
                [sourceCoords[idx][0], sourceCoords[idx][1]],
                [
                    (sourceCoords[idx][0] + destCoords[0]) / 2,
                    sourceCoords[idx][1] - 100,
                ],
                [destCoords[0], destCoords[1]],
            ];

            const path = g
                .append("path")
                .attr("d", lineGenerator(points))
                .attr("class", `${className} line-${attackId}`); // Menambahkan kelas khusus dengan ID

            const totalLength = path.node().getTotalLength();

            path
                .attr("stroke-dasharray", totalLength + " " + totalLength)
                .attr("stroke-dashoffset", totalLength)
                .transition()
                .duration(2000)
                .ease(d3.easeCubicInOut)
                .attr("stroke-dashoffset", 0)
                .remove()
                .on("end", () => {
                    if (isAttackOnGoing(el) && marker && !marker.empty()) {
                        idx++;
                        if (idx >= sourceCoords.length) {
                            idx = 0;
                        }
                        drawLine(className);
                    }
                });
        }

        function createMarker(className) {
            marker = g
                .append("circle")
                .attr("class", `${className} marker-${attackId}`) // Menambahkan kelas khusus dengan ID
                .attr("cx", destCoords[0])
                .attr("cy", destCoords[1])
                .attr("r", 5)
                .on("mouseover", (event) => showTooltip(event, el))
                .on("mouseout", hideTooltip);

            startPulseAnimation = true;
            createPulse(className === "markerRed" ? "pulseRed" : "pulseYellow");
            drawLine(className === "markerRed" ? "lineRed" : "lineYellow");
        }

        // Cek status serangan
        if (el.Status === "Ongoing") {
            // Cek severity untuk memutuskan class
            createMarker(
                el.Severity.includes("Red") ? "markerRed" : "markerYellow"
            );
        }
    });
}


function animateCountUpdate(element, newValue) {
    const currentValue = parseInt(element.innerText);

    // Buat container untuk animasi
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.display = "inline-block";
    container.style.height = element.offsetHeight + "px"; // Tetapkan tinggi container agar tetap konsisten

    // Elemen nilai lama
    const oldValueElement = document.createElement("div");
    oldValueElement.innerText = currentValue;
    oldValueElement.style.position = "absolute";
    oldValueElement.style.top = "0";
    oldValueElement.style.left = "0";
    oldValueElement.style.fontSize = "24px";
    oldValueElement.style.fontWeight = "bold";
    container.appendChild(oldValueElement);

    // Elemen nilai baru
    const newValueElement = document.createElement("div");
    newValueElement.innerText = newValue;
    newValueElement.style.position = "absolute";
    newValueElement.style.top = "0";
    newValueElement.style.left = "0";
    newValueElement.style.fontSize = "24px";
    newValueElement.style.fontWeight = "bold";
    newValueElement.style.opacity = "0";
    container.appendChild(newValueElement);

    // Ganti elemen asli dengan container yang di-animasi
    element.innerHTML = "";
    element.appendChild(container);

    anime({
        targets: oldValueElement,
        translateY: -50,
        duration: 500,
        easing: "easeInOutQuad",
        complete: () => {
            oldValueElement.remove();
        },
    });

    anime({
        targets: newValueElement,
        opacity: [0, 1],
        translateY: [50, 0],
        duration: 500,
        easing: "easeInOutQuad",
        complete: () => {
            // Setelah animasi selesai, reset posisi elemen agar sesuai
            newValueElement.style.position = "static";
            container.style.height = "auto"; // Hapus tinggi tetap dari container setelah animasi
        },
    });
}
let countOnGoing = [];
// Fungsi untuk menghitung dan memperbarui jumlah Ongoing Attack
function updateOngoingAttackCount(data) {
    // cek apakah serangan sudah ada di dalam countOnGoing (berdasarkan sourceIp dan destinationIp)
    const anomalyId = data["Anomaly ID"];
    const include = countOnGoing.some(
        (item) =>
            item["Anomaly ID"] == anomalyId
    );
    if (data.Status === "Ongoing" && !include) {
        // Perbarui nilai pada elemen <h3>
        countOnGoing.push(data);
        animateCountUpdate(
            document.getElementById("ongoing-attack-count"),
            onGoingRedAttack.length + onGoingYellowAttack.length
        );
    } else {
        if (data.Status !== "Ongoing" && include) {
            // Perbarui nilai pada elemen <h3>
            countOnGoing = countOnGoing.filter(
                (item) =>
                    item["Anomaly ID"] != data["Anomaly ID"]
            );
            animateCountUpdate(
                document.getElementById("ongoing-attack-count"),
                onGoingRedAttack.length + onGoingYellowAttack.length
            );
        }
    }
}

let countRedSeverity = [];
function updateRedSeverityOngoingAttackCount(data) {
    // cek apakah serangan sudah ada di dalam countOnGoing (berdasarkan sourceIp dan destinationIp)
    const anomalyId = data["Anomaly ID"];
    const include = countRedSeverity.some(
        (item) =>
            item["Anomaly ID"] == anomalyId
    );
    if (data.Severity !== "Red" && include) {
        // Perbarui nilai pada elemen <h3>
        countRedSeverity = countRedSeverity.filter(
            (item) =>
                item["Anomaly ID"] != data["Anomaly ID"]
        );
        animateCountUpdate(
            document.getElementById("ongoing-attack-count-red"),
            onGoingRedAttack.length
        );
    } else {
        if (data.Status === "Ongoing" && !include) {
            // Perbarui nilai pada elemen <h3>
            countRedSeverity.push(data);
            animateCountUpdate(
                document.getElementById("ongoing-attack-count-red"),
                onGoingRedAttack.length
            );
        } else {
            if (data.Status !== "Ongoing" && include) {
                // Perbarui nilai pada elemen <h3>
                countRedSeverity = countRedSeverity.filter(
                    (item) =>
                        item["Anomaly ID"] != data["Anomaly ID"]
                );
                animateCountUpdate(
                    document.getElementById("ongoing-attack-count-red"),
                    onGoingRedAttack.length
                );
            }
        }
    }
}
let countYellowSeverity = [];
function updateYellowSeverityOngoingAttackCount(data) {
    // cek apakah serangan sudah ada di dalam countOnGoing (berdasarkan sourceIp dan destinationIp)
    const anomalyId = data["Anomaly ID"];
    const include = countYellowSeverity.some(
        (item) =>
            item["Anomaly ID"] == anomalyId
    );
    if (data.Severity !== "Yellow" && include) {
        // Perbarui nilai pada elemen <h3>
        countYellowSeverity = countYellowSeverity.filter(
            (item) =>
                item["Anomaly ID"] != data["Anomaly ID"]
        );
        animateCountUpdate(
            document.getElementById("ongoing-attack-count-yellow"),
            onGoingYellowAttack.length
        );
    } else {
        if (data.Status === "Ongoing" && !include) {
            // Perbarui nilai pada elemen <h3>
            countYellowSeverity.push(data);
            animateCountUpdate(
                document.getElementById("ongoing-attack-count-yellow"),
                onGoingYellowAttack.length
            );
        } else {
            if (data.Status !== "Ongoing" && include) {
                // Perbarui nilai pada elemen <h3>
                countYellowSeverity = countYellowSeverity.filter(
                    (item) =>
                        item["Anomaly ID"] != data["Anomaly ID"]
                );
                animateCountUpdate(
                    document.getElementById("ongoing-attack-count-yellow"),
                    onGoingYellowAttack.length
                );
            }
        }
    }
}

function convertToStringTime(minutes) {
    const hours = Math.floor(minutes / 60); // Hitung jam
    const remainingMinutes = minutes % 60; // Hitung sisa menit setelah konversi ke jam

    // Buat string format "X jam Y menit"
    let result = "";
    if (hours > 0) {
        result += `${hours} jam `;
    }
    if (remainingMinutes > 0) {
        result += `${remainingMinutes} menit`;
    }

    // Jika waktu 0 menit, tampilkan "0 menit"
    if (result === "") {
        result = "0 menit";
    }

    return result.trim(); // Hapus spasi di awal/akhir string jika ada
}

function convertAverageBandwidth(bandwidth) {
    let returnVal;
    if (bandwidth / 1000000000 > 1) {
        returnVal = (bandwidth / 1000000000).toString() + " Gbps";
    } else if (bandwidth / 1000000 > 1) {
        returnVal = (bandwidth / 1000000).toString() + " Mbps";
    } else if (bandwidth / 1000 > 1) {
        returnVal = (bandwidth / 1000).toString() + " Kbps";
    } else {
        returnVal = bandwidth.toString() + " bps";
    }
    return returnVal;
}

function updateTodoList(topAttack) {
    const idsInTopAttack = new Set(
        topAttack.map((attack) => `${attack["Anomaly ID"]}`)
    );
    const existingItems = Array.from(todoList.children);
    const itemMap = new Map();

    // Buat peta ID ke elemen list
    existingItems.forEach((item) => {
        const id = item.dataset.id;
        if (id) {
            itemMap.set(id, item);
        }
    });
    // Tambahkan atau perbarui item dalam daftar
    topAttack.forEach((record) => {
        let listItem = itemMap.get(`${record["Anomaly ID"]}`);
        if (!listItem) {
            listItem = document.createElement("li");
            listItem.dataset.id = `${record["Anomaly ID"]}`; // Set ID di data attribute
            listItem.addEventListener("click", () => showModal(record));
        }

        // Set class dan innerHTML sesuai dengan severity
        if (record.Severity.includes("Yellow")) {
            listItem.className = "completed";
        } else if (record.Severity.includes("Red")) {
            listItem.className = "not-completed";
        }

        listItem.innerHTML = `<p><b>${record.VictimIp
            }</b> (${convertToStringTime(
                record.Duration
            )})</p><i class="bx bx-dots-vertical-rounded"></i>`;

        if (!listItem.parentNode) {
            todoList.appendChild(listItem);
        }

        // Update itemMap
        itemMap.set(`${record["Anomaly ID"]}`, listItem);
    });

    // Hapus item yang tidak lagi ada di topAttack
    existingItems.forEach((item) => {
        const id = item.dataset.id;
        if (!idsInTopAttack.has(id)) {
            todoList.removeChild(item);
            itemMap.delete(id);
        }
    });

    // Urutkan item dalam daftar sesuai dengan topAttack
    Array.from(todoList.children)
        .sort((a, b) => {
            const idA = a.dataset.id;
            const idB = b.dataset.id;
            console.log({ idA, idB });
            const attackA = topAttack.find(
                (attack) => attack["Anomaly ID"] == idA
            );
            const attackB = topAttack.find(
                (attack) => attack["Anomaly ID"] == idB
            );

            return attackB.Duration - attackA.Duration;
        })
        .forEach((item) => {
            todoList.appendChild(item); // Menempatkan item di urutan yang benar
        });
}

function updateOnGoingTodoList(topAttack) {
    const idsInTopAttack = new Set(
        topAttack.map((attack) => `${attack["Anomaly ID"]}`)
    );
    const existingItems = Array.from(onGoingTodoList.children);
    const itemMapOnGoing = new Map();

    // Buat peta ID ke elemen list
    existingItems.forEach((item) => {
        const id = item.dataset.id;
        if (id) {
            itemMapOnGoing.set(id, item);
        }
    });
    // Tambahkan atau perbarui item dalam daftar
    topAttack.forEach((record) => {
        let listItem = itemMapOnGoing.get(`${record["Anomaly ID"]}`);
        if (!listItem) {
            listItem = document.createElement("li");
            listItem.dataset.id = `${record["Anomaly ID"]}`; // Set ID di data attribute
            listItem.addEventListener("click", () => showModal(record));
        }

        // Set class dan innerHTML sesuai dengan severity
        if (record.Severity.includes("Yellow")) {
            listItem.className = "completed";
        } else if (record.Severity.includes("Red")) {
            listItem.className = "not-completed";
        }

        listItem.innerHTML = `<p><b>${record.VictimIp
            }</b> (${convertToStringTime(
                record.Duration
            )})</p><i class="bx bx-dots-vertical-rounded"></i>`;

        if (!listItem.parentNode) {
            onGoingTodoList.appendChild(listItem);
        }

        // Update itemMapOnGoing
        itemMapOnGoing.set(`${record["Anomaly ID"]}`, listItem);
    });

    // Hapus item yang tidak lagi ada di topAttack
    existingItems.forEach((item) => {
        const id = item.dataset.id;
        if (!idsInTopAttack.has(id)) {
            onGoingTodoList.removeChild(item);
            itemMapOnGoing.delete(id);
        }
    });

    // Urutkan item dalam daftar sesuai dengan topAttack
    Array.from(onGoingTodoList.children)
        .sort((a, b) => {
            const idA = a.dataset.id;
            const idB = b.dataset.id;
            const attackA = topAttack.find(
                (attack) => attack["Anomaly ID"] == idA
            );
            const attackB = topAttack.find(
                (attack) => attack["Anomaly ID"] == idB
            );

            return attackB.Duration - attackA.Duration;
        })
        .forEach((item) => {
            onGoingTodoList.appendChild(item);
        });
}

const todoList = document.querySelector(".todo-list");
const onGoingTodoList = document.querySelector(".ongoing-todo-list");
const itemMap = new Map(); // Map untuk menyimpan referensi item berdasarkan ID
const itemMapOnGoing = new Map();

function showModal(record) {
    // Set each field manually
    document.getElementById("modal-id").textContent = record["Anomaly ID"];
    document.getElementById("modal-creationtime").textContent =
        record["Creation Time"];
    document.getElementById("modal-updatetime").textContent =
        record["Update Time"];
    document.getElementById("modal-type").textContent = record["Type"];
    document.getElementById("modal-subtype").textContent =
        record["Sub-type"];
    document.getElementById("modal-scope").textContent = record["Scope"];
    document.getElementById("modal-severity").textContent =
        record["Severity"];
    document.getElementById("modal-status").textContent = record["Status"];
    document.getElementById("modal-direction").textContent =
        record["Direction"];
    document.getElementById("modal-resource").textContent =
        record["Resource"];
    document.getElementById("modal-resourceid").textContent =
        record["Resource ID"];
    document.getElementById("modal-importance").textContent =
        record["Importance"];
    document.getElementById("modal-triggeredvalue").textContent =
        record["Triggered Value"];
    document.getElementById("modal-threshold").textContent =
        record["Threshold"];
    document.getElementById("modal-unit").textContent = record["Unit"];
    document.getElementById("modal-anomalyip").textContent =
        record["Anomaly Host IP"];
    document.getElementById("modal-sip1").textContent = record["SIP1"];
    document.getElementById("modal-sip2").textContent = record["SIP2"];
    document.getElementById("modal-sip3").textContent = record["SIP3"];
    document.getElementById("modal-sport1").textContent = record["SPort1"];
    document.getElementById("modal-sport2").textContent = record["SPort2"];
    document.getElementById("modal-protocol").textContent =
        record["Protocol"];
    document.getElementById("modal-remarks").textContent =
        record["Remarks"];
    document.getElementById("modal-attackdirection").textContent =
        record["Attack Direction"];

    // Handle array for sourceIp
    let sourceIpList = "";
    for (let i = 0; i < record.sourceIp.length; i++) {
        sourceIpList += `<li>${record.sourceIp[i]}</li>`;
    }
    document.getElementById("modal-sourceip").innerHTML = sourceIpList;

    // Handle StartTime which is a Date object
    document.getElementById("modal-starttime").textContent =
        record.StartTime.toLocaleString();

    // Show the modal
    new bootstrap.Modal(document.getElementById("recordModal")).show();
}

function formatData(data) {
    let avgBandwidth = data.Severity.split(" / ")[1];
    let avgBandwidthArr = avgBandwidth.split(" ");
    let avgBandwidthKiri = avgBandwidthArr[0];
    let avgBandwidthKanan = avgBandwidthArr[1];
    let pengali = 1;
    if (avgBandwidthKiri.includes("bps")) {
        avgBandwidthKiri = avgBandwidthKiri.replace("bps", "");
        if (avgBandwidthKiri.includes("G")) {
            pengali = 1000000000;
            avgBandwidthKiri = avgBandwidthKiri.replace("G", "");
            avgBandwidthKiri = parseFloat(avgBandwidthKiri);
        } else if (avgBandwidthKiri.includes("M")) {
            pengali = 1000000;
            avgBandwidthKiri = avgBandwidthKiri.replace("M", "");
            avgBandwidthKiri = parseFloat(avgBandwidthKiri);
        } else if (avgBandwidthKiri.includes("K")) {
            pengali = 1000;
            avgBandwidthKiri = avgBandwidthKiri.replace("K", "");
            avgBandwidthKiri = parseFloat(avgBandwidthKiri);
        } else {
            avgBandwidthKiri = parseFloat(avgBandwidthKiri);
        }
        return { ...data, AverageBandwidth: avgBandwidthKiri * pengali };
    } else {
        avgBandwidthKanan = avgBandwidthKanan.replace("bps", "");
        avgBandwidthKanan = avgBandwidthKanan.replace("(", "");
        avgBandwidthKanan = avgBandwidthKanan.replace(")", "");

        if (avgBandwidthKanan.includes("G")) {
            pengali = 1000000000;
            avgBandwidthKanan = avgBandwidthKanan.replace("G", "");
            avgBandwidthKanan = parseFloat(avgBandwidthKanan);
        } else if (avgBandwidthKanan.includes("M")) {
            pengali = 1000000;
            avgBandwidthKanan = avgBandwidthKanan.replace("M", "");
            avgBandwidthKanan = parseFloat(avgBandwidthKanan);
        } else if (avgBandwidthKanan.includes("K")) {
            pengali = 1000;
            avgBandwidthKanan = avgBandwidthKanan.replace("K", "");
            avgBandwidthKanan = parseFloat(avgBandwidthKanan);
        } else {
            avgBandwidthKanan = parseFloat(avgBandwidthKanan);
        }
        return { ...data, AverageBandwidth: avgBandwidthKanan * pengali };
    }
}

function updateTopAttack(topAttack, newAttack) {
    // Ambil currentTime dalam Waktu Indonesia Barat (WIB)
    const currentTimeWIB = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
    );
    const currentDay = currentTimeWIB.getDate();
    const currentMonth = currentTimeWIB.getMonth();
    const currentYear = currentTimeWIB.getFullYear();

    // Cek apakah newAttack sudah ada di dalam topAttack berdasarkan id
    const attackExists = topAttack.some(
        (attack) =>
            attack["Anomaly ID"] === newAttack["Anomaly ID"]
    );

    // Cek apakah StartTime berada pada bulan yang sama dengan currentTime (WIB)
    const startTime = new Date(newAttack.StartTime);
    const isSameMonth =
        startTime.getMonth() === currentMonth &&
        startTime.getFullYear() === currentYear;

    // Jika object tidak ada dalam topAttack
    if (!attackExists) {
        if (isSameMonth) {
            // Masukkan object ke dalam array pada posisi yang sesuai
            let inserted = false;
            for (let i = 0; i < topAttack.length; i++) {
                if (newAttack.Duration > topAttack[i].Duration) {
                    topAttack.splice(i, 0, newAttack);
                    inserted = true;
                    break;
                }
            }

            // Jika tidak ada object yang lebih besar, push ke akhir array
            if (!inserted) {
                topAttack.push(newAttack);
            }

            // Batasi topAttack menjadi hanya 10 object terbesar
            if (topAttack.length > 10) {
                topAttack.pop();
            }
        }
    } else {
        // jika attack sudah ada di dalam topAttack
        if (!isSameMonth) {
            return topAttack.filter(
                (el) =>
                    el["Anomaly ID"] !== newAttack["Anomaly ID"]
            );
        } else {
            topAttack = topAttack.filter((el) => {
                return (
                    el["Anomaly ID"] !== newAttack["Anomaly ID"]
                );
            });
            topAttack = updateTopAttack(topAttack, newAttack);
            return topAttack;
        }
    }
    // filter dulu top attack sebelum return
    topAttack = topAttack.filter((item) => {
        const startTime1 = new Date(item.StartTime);
        return (
            startTime1.getMonth() === currentMonth &&
            startTime1.getFullYear() === currentYear
        );
    });
    return topAttack;
}
function updateTopOngoingAttack(topAttack, newAttack) {
    // Ambil currentTime dalam Waktu Indonesia Barat (WIB)
    const currentTimeWIB = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
    );
    const currentDay = currentTimeWIB.getDate();
    const currentMonth = currentTimeWIB.getMonth();
    const currentYear = currentTimeWIB.getFullYear();

    // Cek apakah newAttack sudah ada di dalam topAttack berdasarkan id
    const attackExists = topAttack.some(
        (attack) =>
            attack["Anomaly ID"] === newAttack["Anomaly ID"]
    );

    // Jika object tidak ada dalam topAttack
    if (!attackExists) {
        const startTime = new Date(newAttack.StartTime);

        if (isAttackOnGoing(newAttack)) {
            // Masukkan object ke dalam array pada posisi yang sesuai
            let inserted = false;
            for (let i = 0; i < topAttack.length; i++) {
                if (newAttack.Duration > topAttack[i].Duration) {
                    topAttack.splice(i, 0, newAttack);
                    inserted = true;
                    break;
                }
            }

            // Jika tidak ada object yang lebih besar, push ke akhir array
            if (!inserted) {
                topAttack.push(newAttack);
            }

            // Batasi topAttack menjadi hanya 10 object terbesar
            if (topAttack.length > 10) {
                topAttack.pop();
            }
        }
    } else {
        if (!isAttackOnGoing(newAttack)) {
            // sudah tidak on going, sehingga haru sapus dari topOngoingAttack
            return topAttack.filter(
                (el) =>
                    el["Anomaly ID"] !== newAttack["Anomaly ID"]
            );
        } else {
            // jika attack sudah ada di dalam topAttack dan masih ongoing
            topAttack = topAttack.filter((el) => {
                return (
                    el["Anomaly ID"] !== newAttack["Anomaly ID"]
                );
            });
            topAttack = updateTopOngoingAttack(topAttack, newAttack);
            return topAttack;
        }
    }
    // filter dulu top attack sebelum return
    topAttack = topAttack.filter((item) => {
        const startTime1 = new Date(item.StartTime);
        return item.Status === "Ongoing";
    });
    return topAttack;
}

let topAttack = [];
let topOngoingAttack = [];

function includeInArray(data, array) {
    const anomalyId = data["Anomaly ID"];
    return array.some(
        (item) =>
            item["Anomaly ID"] == anomalyId
    );
}

function getAttackIdCreation(data, array) {
    if (includeInArray) {
        array.forEach((el) => {
            if (
                el["Anomaly Host IP"] == data["Anomaly Host IP"] &&
                sameArray(el.sourceIp, data.sourceIp)
            ) {
                return el.attackIdCreation;
            }
        });
    } else {
        console.log("seharusnya gamasuk sini");
    }
}

function parseAveragebandwidth(data) {
    const trigeredValue = data["Trigered Value"];
    const unit = data.unit;
}

function transformData(data) {
    // ubah Update Time menjadi startTime dan ubah tipedatanya menjadi time
    const StartTime = new Date(data["Creation Time"]);
    // ubah Anomaly Host IP menjadi VictimIp
    const VictimIp = data["Anomaly Host IP"];
    // buat array sourceIp dari SIP1, SIP2, SIP3
    let sourceIp = [];
    if (data.SIP1) {
        sourceIp.push(data.SIP1);
    }
    if (data.SIP2) {
        sourceIp.push(data.SIP2);
    }
    if (data.SIP3) {
        sourceIp.push(data.SIP3);
    }

    // parse Duration
    const currentTimeWIB = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
    );
    const Duration = Math.floor((currentTimeWIB - StartTime) / 60000);

    // attackIdCreation
    const attackIdCreation = formatIpAddresses(VictimIp, sourceIp);

    return {
        StartTime,
        VictimIp,
        sourceIp,
        Duration,
        attackIdCreation,
        ...data,
    };
}

function changeState(newAttackData) {
    if (
        newAttackData.Status === "Ongoing" &&
        !(
            includeInArray(newAttackData, onGoingRedAttack) ||
            includeInArray(newAttackData, onGoingYellowAttack)
        )
    ) {
        // cek apakah red severity atau yellow severity
        if (newAttackData.Severity === "Yellow") {
            onGoingYellowAttack.push(newAttackData);
            renderMarkerByStatus(newAttackData);
            updateOngoingAttackCount(newAttackData);
            updateYellowSeverityOngoingAttackCount(newAttackData);
            topAttack = updateTopAttack(topAttack, newAttackData);
            updateTodoList(topAttack);
            topOngoingAttack = updateTopOngoingAttack(
                topOngoingAttack,
                newAttackData
            );
            updateOnGoingTodoList(topOngoingAttack);
        } else {
            console.log("sekarang udah jadi red");
            onGoingRedAttack.push(newAttackData);
            renderMarkerByStatus(newAttackData);
            updateOngoingAttackCount(newAttackData);
            updateRedSeverityOngoingAttackCount(newAttackData);
            topAttack = updateTopAttack(topAttack, newAttackData);
            updateTodoList(topAttack);
            topOngoingAttack = updateTopOngoingAttack(
                topOngoingAttack,
                newAttackData
            );
            console.log(topAttack);
            updateOnGoingTodoList(topOngoingAttack);
        }
    } else if (
        newAttackData.Status === "Recover" &&
        (includeInArray(newAttackData, onGoingRedAttack) ||
            includeInArray(newAttackData, onGoingYellowAttack))
    ) {
        removeAttackById(newAttackData["Anomaly ID"]);
        if (newAttackData.Severity === "Yellow") {
            let updatedIdCreationData = { ...newAttackData };
            updatedIdCreationData.attackIdCreation = getAttackIdCreation(
                newAttackData,
                onGoingYellowAttack
            );
            onGoingYellowAttack = onGoingYellowAttack.filter(
                (el) =>
                    el["Anomaly ID"] !==
                    updatedIdCreationData["Anomaly ID"]
            );
            updateOngoingAttackCount(updatedIdCreationData);
            updateYellowSeverityOngoingAttackCount(updatedIdCreationData);
            topAttack = updateTopAttack(topAttack, updatedIdCreationData);
            updateTodoList(topAttack);
            topOngoingAttack = updateTopOngoingAttack(
                topOngoingAttack,
                updatedIdCreationData
            );
            updateOnGoingTodoList(topOngoingAttack);
        } else {
            // red severity
            let updatedIdCreationData = { ...newAttackData };
            updatedIdCreationData.attackIdCreation = getAttackIdCreation(
                newAttackData,
                onGoingRedAttack
            );
            onGoingRedAttack = onGoingRedAttack.filter(
                (el) =>
                    el["Anomaly ID"] !==
                    updatedIdCreationData["Anomaly ID"]
            );
            updateOngoingAttackCount(updatedIdCreationData);
            updateRedSeverityOngoingAttackCount(updatedIdCreationData);
            topAttack = updateTopAttack(topAttack, updatedIdCreationData);
            updateTodoList(topAttack);
            topOngoingAttack = updateTopOngoingAttack(
                topOngoingAttack,
                updatedIdCreationData
            );
            updateOnGoingTodoList(topOngoingAttack);
        }
    } else if (
        newAttackData.Status === "Ongoing" &&
        (includeInArray(newAttackData, onGoingRedAttack) ||
            includeInArray(newAttackData, onGoingYellowAttack))
    ) {
        const severity = newAttackData.Severity;
        if (
            severity === "Red" &&
            includeInArray(newAttackData, onGoingYellowAttack)
        ) {
            // peningkatan severity
            let updatedIdCreationData = { ...newAttackData };
            updatedIdCreationData.attackIdCreation = getAttackIdCreation(
                newAttackData,
                onGoingYellowAttack
            );
            onGoingYellowAttack = onGoingYellowAttack.filter(
                (el) =>
                    el["Anomaly ID"] !==
                    updatedIdCreationData["Anomaly ID"]
            );
            updateYellowSeverityOngoingAttackCount(updatedIdCreationData);
            console.log(updatedIdCreationData["Anomaly ID"]);
            removeAttackById(updatedIdCreationData["Anomaly ID"]);
            topAttack = updateTopAttack(topAttack, updatedIdCreationData);
            updateTodoList(topAttack);
            topOngoingAttack = updateTopOngoingAttack(
                topOngoingAttack,
                updatedIdCreationData
            );
            updateOnGoingTodoList(topOngoingAttack);
            changeState(updatedIdCreationData);
        } else if (
            severity === "Yellow" &&
            includeInArray(newAttackData, onGoingRedAttack)
        ) {
            // penurunan severity
            let updatedIdCreationData = { ...newAttackData };
            updatedIdCreationData.attackIdCreation = getAttackIdCreation(
                newAttackData,
                onGoingRedAttack
            );
            onGoingRedAttack = onGoingRedAttack.filter(
                (el) =>
                    el["Anomaly ID"] !==
                    updatedIdCreationData["Anomaly ID"]
            );
            updateRedSeverityOngoingAttackCount(updatedIdCreationData);
            removeAttackById(updatedIdCreationData["Anomaly ID"]);
            topAttack = updateTopAttack(topAttack, updatedIdCreationData);
            updateTodoList(topAttack);
            topOngoingAttack = updateTopOngoingAttack(
                topOngoingAttack,
                updatedIdCreationData
            );
            updateOnGoingTodoList(topOngoingAttack);
            changeState(updatedIdCreationData);
        }
    }
    console.log({ onGoingRedAttack, onGoingYellowAttack, topAttack, topOngoingAttack });
}

// Fungsi untuk memulai listener untuk perubahan data secara real-time
function listenToDDoSAttacks() {
    ws.onmessage = (event) => {
        const newAttackData = transformData(JSON.parse(event.data));
        console.log(newAttackData);
        changeState(newAttackData);
    };
}

function setNewDuration(data) {
    let returnVal = data;
    const currentTimeWIB = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
    );
    const Duration = Math.floor((currentTimeWIB - data.StartTime) / 60000);
    returnVal.Duration = Duration;
    return returnVal;
}

// Panggil fungsi untuk memulai listener
listenToDDoSAttacks();

// set interval 1 menit untuk memperbarui duration yang ada di current attack
setInterval(() => {
    // lakukan for loop untuk setiap ongoing attack (red dan yellow)
    for (let i = 0; i < onGoingRedAttack.length; i++) {
        // untuk setiap itemnya, update duration, perbarui topAttack, dan perbarui todo list
        onGoingRedAttack[i] = setNewDuration(onGoingRedAttack[i]);
        topAttack = updateTopAttack(topAttack, onGoingRedAttack[i]);
        updateTodoList(topAttack);
        topOngoingAttack = updateTopOngoingAttack(
            topOngoingAttack,
            onGoingRedAttack[i]
        );
        updateOnGoingTodoList(topOngoingAttack);
    }
    for (let j = 0; j < onGoingYellowAttack.length; j++) {
        // untuk setiap itemnya, update duration, perbarui topAttack, dan perbarui todo list
        onGoingYellowAttack[j] = setNewDuration(onGoingYellowAttack[j]);
        topAttack = updateTopAttack(topAttack, onGoingYellowAttack[j]);
        updateTodoList(topAttack);
        topOngoingAttack = updateTopOngoingAttack(
            topOngoingAttack,
            onGoingYellowAttack[j]
        );
        updateOnGoingTodoList(topOngoingAttack);
    }
}, 5000);

// updateOngoingAttackCount();
// updateRedSeverityOngoingAttackCount();
// updateYellowSeverityOngoingAttackCount();

// TOOLTIP
// Dapatkan referensi ke tooltip
const tooltip = select("#tooltip");

// Fungsi untuk menampilkan tooltip
function showTooltip(event, data) {
    tooltip
        .style("left", `${event.pageX + 10}px`) // Posisi tooltip sedikit offset dari kursor
        .style("top", `${event.pageY + 10}px`)
        .style("display", "block")
        .style("background-color", "#060714") // Background berwarna #060714
        .style("color", "white") // Teks berwarna putih
        .html(`
    <strong>Resource:</strong> ${data.Resource}<br>
    <strong>Anomaly Host IP:</strong> ${data["Anomaly Host IP"]}<br>
  `);
}

// Fungsi untuk menyembunyikan tooltip
function hideTooltip() {
    tooltip.style("display", "none");
}

// Kode untuk memuat peta dan melakukan setup D3.js
const svg = select("svg");

const width = parseFloat(svg.style("width"));
const height = parseFloat(svg.style("height"));

const projection = geoNaturalEarth1()
    .scale(250)
    .translate([width / 2, height / 2]);

const pathGenerator = geoPath().projection(projection);

const g = svg.append("g"); // Grup yang akan digunakan untuk zoom dan panning

// Tambahkan sphere ke dalam grup `g`
g.append("path")
    .attr("d", pathGenerator({ type: "Sphere" }))
    .attr("fill", "black");

svg.call(
    zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        })
);

json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
    .then((data) => {
        const countries = topojson.feature(data, data.objects.countries);

        g.selectAll("path")
            .data(countries.features)
            .enter()
            .append("path")
            .attr("class", "land")
            .attr("d", pathGenerator)
            .append("title")
            .text((d) => d.properties.name || "Unknown");
    })
    .catch((error) => console.error("Error fetching map data:", error));

// Kode untuk menu dan resize event
const allSideMenu = document.querySelectorAll(
    "#sidebar .side-menu.top li a"
);

allSideMenu.forEach((item) => {
    const li = item.parentElement;

    item.addEventListener("click", function () {
        allSideMenu.forEach((i) => {
            i.parentElement.classList.remove("active");
        });
        li.classList.add("active");
    });
});

window.addEventListener("resize", function () {
    if (this.innerWidth > 576) {
        searchButtonIcon.classList.replace("bx-x", "bx-search");
        searchForm.classList.remove("show");
    }
});