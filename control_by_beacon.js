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

            // Extrahiert die Bezeichnung der Mac-Adresse aus dem Array
            macLabel = targetMacAddresses[macAddress] || "Unbekannt";
            
            // Schaltet den Switch ein
            Shelly.call("Switch.set", {'id': 0, 'on': true});
			
			// Setzt die Anwesenheitsvariable auf Wahr
			Anwesend = true;
			console.log(Anwesend);

            // Setzt den Zeitstempel der letzten Erkennung
            lastDetectionTimestamp = Date.now();
            
            console.log(topic, id, macLabel, distance);
            console.log("Switch geschaltet");
            
            // Veröffentlicht die Beacon-Informationen über MQTT mit der Bezeichnung der Mac-Adresse
            if (MQTT.publish(topic, '{ "id": "' + id + '", "Bezeichnung":"' + macLabel + '", "distance":' + distance + ', "Anwesend":' + Anwesend + ' }')) {
                console.log('veröffentlicht');
            }

            // Überprüft die Anwesenheitsvariable und startet den Timer nur, wenn Anwesend ist
            if (Anwesend) {
                // Startet den Timer für die Überprüfung
                Timer.set(10000, true, checkAndTurnOffSwitch); // Startet die Überprüfung alle 10 Sekunden
            }
        }
    }
});

// Überprüft, ob der Switch ausgeschaltet werden soll
function checkAndTurnOffSwitch() {
    // Überprüft, ob Anwesend gleich true ist
    if (Anwesend) {
        const currentTime = Date.now();
        const timeDifference = (currentTime - lastDetectionTimestamp) / 1000; // Zeitdifferenz in Sekunden
        
        if (timeDifference >= 60) {
            // Schaltet den Switch aus, wenn mehr als 60 Sekunden keine Erkennung erfolgt ist
            Shelly.call("Switch.set", {'id': 0, 'on': false});
            Anwesend = false; // Aktualisiert die globale Variable
            console.log("Switch ausgeschaltet nach 60 Sekunden Inaktivität");
            
            // Veröffentlicht eine MQTT-Nachricht, wenn der Switch ausgeschaltet wurde, im gleichen Format wie beim Einschalten
            let room = "Büro";
            let topic = "espresense/rooms/" + room;
            if (MQTT.publish(topic, '{ "id": "' + id + '", "Bezeichnung":"' + macLabel + '", "distance": "N/A", "Anwesend":' + Anwesend + ' }')) {
                console.log('Switch ausgeschaltet veröffentlicht');
            }
        }
    }
}

// Startet den Bluetooth-Scanner
BLE.Scanner.Start({
    duration_ms: -1,
    active: false,
    interval_ms: 320,
    window_ms: 30,
});

console.log('Skript gestartet');

// Überprüft die MQTT-Verbindung
if (MQTT.isConnected()) {
    console.log('MQTT ist verbunden');
}
