const os = require("os");

exports.getSystemInfo = (req, res) => {
    const interfaces = os.networkInterfaces();
    let localIp = "localhost";

    // Find the best non-internal IPv4 address
    const candidates = [];
    for (const name of Object.keys(interfaces)) {
        // Skip common virtual interfaces
        const lowerName = name.toLowerCase();
        if (
            lowerName.includes("virtualbox") ||
            lowerName.includes("vmware") ||
            lowerName.includes("vethernet") ||
            lowerName.includes("wsl")
        ) {
            continue;
        }

        for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
                candidates.push(iface.address);
            }
        }
    }

    // Prioritize 192.168.x.x or 10.x.x.x (typical local networks)
    const priorityIp = candidates.find(
        (ip) => ip.startsWith("192.168.1.") || ip.startsWith("192.168.0.") || ip.startsWith("10.")
    );

    localIp = priorityIp || candidates[0] || "localhost";

    res.status(200).json({
        status: "success",
        data: {
            localIp,
            platform: os.platform(),
            uptime: os.uptime(),
        },
    });
};
