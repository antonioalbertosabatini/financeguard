/**
 * L'app desktop usa solo l'export statico Next.js (`out/`) + il wrapper Electron.
 * Le production dependencies (Next, Capacitor, …) servono al build web, non a runtime.
 */
exports.default = async () => false;
