const fs = require('fs');

const file = 'frontend/src/pages/Settings.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// the lines we want to remove are 22 to 26 (0-indexed: 22 to 26 inclusive)
// Let's find the exact indices
let startIndex = lines.findIndex(line => line.includes("'Bee Thresholds': ['bee_temp_max','bee_humidity_min','bee_weight_drop_alert'],"));

if (startIndex !== -1) {
    // It's 5 lines
    lines.splice(startIndex, 5);
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log("Fixed syntax error");
} else {
    console.log("Could not find the lines to remove.");
}
