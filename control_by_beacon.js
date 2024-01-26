// Schaltet den Switch nur ein, wenn ein Bluetooth-Beacon erkannt wird

const targetMacAddresses = {
    "aa:bb:cc:dd:ee:ff": "Device1",
    //   "aa:bb:cc:dd:ee:ff": "Living_Room_Device" // ggf. weitere MAC-Adressen in diesem Format hinzufügen
};

let lastDetectionTimestamp = 0;
let macLabel = ""; // Variable für die Mac-Bezeichnung
let id = ""; // Variable für die Beacon-ID

let Anwesend = false;

console.log(Anwesend);

let timerId = null; // Variable zur Speicherung der Timer-ID

BLE.Scanner.Subscribe(function (ev, res) {
    if (ev === BLE.Scanner.SCAN_RESULT) {
        let room = "Büro";
        let maxDistance = 3;
        let minRSSI = (maxDistance * -15) - 40;
        let topic = "espresense/rooms/" + room;

        let macAddress = res.addr;
        if (macAddress in targetMacAddresses) {
            id = macAddress.split(":").join("");
            let distance = (res.rssi + 40) / -15;
            distance = distance < 0.1 ? 0.1 : distance;

            macLabel = targetMacAddresses[macAddress] || "Unbekannt";
            
            console.log(Anwesend);

            if (!Anwesend) {
                Shelly.call("Switch.set", {'id': 0, 'on': true});
                Anwesend = true;
                console.log("Switch eingeschaltet");

                // Startet den Timer nur, wenn er nicht bereits läuft
                if (!timerId) {
                    timerId = Timer.set(10000, true, checkAndTurnOffSwitch);
                }
            }

            lastDetectionTimestamp = Date.now();
            console.log(topic, id, macLabel, distance);

            if (MQTT.publish(topic, '{ "id": "' + id + '", "Bezeichnung":"' + macLabel + '", "distance":' + distance + ', "Anwesend":' + Anwesend + ' }')) {
                console.log('veröffentlicht');
            }
        }
    }
});

function checkAndTurnOffSwitch() {
    if (Anwesend) {
        const currentTime = Date.now();
        const timeDifference = (currentTime - lastDetectionTimestamp) / 1000;

        if (timeDifference >= 120) {
            Shelly.call("Switch.set", {'id': 0, 'on': false});
            Anwesend = false;
            console.log("Switch ausgeschaltet nach 120 Sekunden Inaktivität");

            let room = "Büro";
            let topic = "espresense/rooms/" + room;
            if (MQTT.publish(topic, '{ "id": "' + id + '", "Bezeichnung":"' + macLabel + '", "distance": "N/A", "Anwesend":' + Anwesend + ' }')) {
                console.log('Switch ausgeschaltet veröffentlicht');
            }

            // Stopp den Timer und setzt die Timer-ID zurück
            Timer.clear(timerId);
            timerId = null;
        }
    }
}

BLE.Scanner.Start({
    duration_ms: -1,
    active: false,
    interval_ms: 320,
    window_ms: 30,
});

console.log('Skript gestartet');

if (MQTT.isConnected()) {
    console.log('MQTT ist verbunden');
}
