import JSZip from "jszip";
import Client from "../models/clientModel.js";
import Invoice from "../models/invoiceModel.js";
import Service from "../models/serviceModel.js";
import Config from "../models/configModel.js";
import * as archiverModule from "archiver";

const createArchiver =
  typeof archiverModule.default === "function"
    ? archiverModule.default
    : typeof archiverModule === "function"
      ? archiverModule
      : (format, opts) => new archiverModule.ZipArchive(opts);

// Helper to format metadata JSON
const createMetadata = (backupType, totalRecords) => ({
  systemName: "BillFlow Client Management Software",
  backupType: backupType,
  generatedAt: new Date().toISOString(),
  timestamp: Date.now(),
  recordCounts: totalRecords,
});

// Helper functions for importing collections cleanly
const processClientsImport = async (items = []) => {
  let count = 0;
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const filter = item._id ? { _id: item._id } : { clientName: item.clientName, companyName: item.companyName };
    const docData = { ...item };
    delete docData.__v;
    await Client.findOneAndUpdate(filter, docData, { upsert: true, new: true });
    count += 1;
  }
  return count;
};

const processInvoicesImport = async (items = []) => {
  let count = 0;
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const docData = { ...item };
    delete docData.__v;
    if (docData.client && typeof docData.client === "object" && docData.client._id) {
      docData.client = docData.client._id;
    }
    const filter = item._id ? { _id: item._id } : { invoiceNumber: item.invoiceNumber };
    await Invoice.findOneAndUpdate(filter, docData, { upsert: true, new: true });
    count += 1;
  }
  return count;
};

const processServicesImport = async (items = []) => {
  let count = 0;
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const docData = { ...item };
    delete docData.__v;
    const filter = item._id ? { _id: item._id } : { sacCode: item.sacCode, name: item.name };
    await Service.findOneAndUpdate(filter, docData, { upsert: true, new: true });
    count += 1;
  }
  return count;
};

const processConfigImport = async (configData) => {
  if (!configData || typeof configData !== "object") return false;
  const docData = { ...configData };
  delete docData.__v;
  delete docData._id;
  let existing = await Config.findOne();
  if (existing) {
    Object.assign(existing, docData);
    await existing.save();
  } else {
    await Config.create(docData);
  }
  return true;
};

// GET /api/backup/export?type=full|clients|invoices|services|config
export const exportBackup = async (req, res) => {
  try {
    const backupType = (req.query.type || "full").toLowerCase();

    const archive = createArchiver("zip", { zlib: { level: 9 } });
    const buffers = [];

    archive.on("data", (data) => buffers.push(data));
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Backup archiving error", error: err.message });
      }
    });

    archive.on("end", () => {
      const zipBuffer = Buffer.concat(buffers);
      const filename = `Backup_${backupType}_${new Date().toISOString().slice(0, 10)}.zip`;
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      res.send(zipBuffer);
    });

    if (backupType === "clients") {
      const clients = await Client.find().lean();
      const metadata = createMetadata("clients", { clientsCount: clients.length });

      archive.append(JSON.stringify(clients, null, 2), { name: "clients.json" });
      archive.append(JSON.stringify(metadata, null, 2), { name: "backup_metadata.json" });
    } else if (backupType === "invoices") {
      const invoices = await Invoice.find().populate("client").lean();
      const metadata = createMetadata("invoices", { invoicesCount: invoices.length });

      archive.append(JSON.stringify(invoices, null, 2), { name: "invoices.json" });
      archive.append(JSON.stringify(metadata, null, 2), { name: "backup_metadata.json" });
    } else if (backupType === "services") {
      const services = await Service.find().lean();
      const metadata = createMetadata("services", { servicesCount: services.length });

      archive.append(JSON.stringify(services, null, 2), { name: "services.json" });
      archive.append(JSON.stringify(metadata, null, 2), { name: "backup_metadata.json" });
    } else if (backupType === "config") {
      const config = await Config.findOne().lean();
      const metadata = createMetadata("config", { configFound: !!config });

      archive.append(JSON.stringify(config || {}, null, 2), { name: "config.json" });
      archive.append(JSON.stringify(metadata, null, 2), { name: "backup_metadata.json" });
    } else {
      // Full Backup (clients, invoices, services, config)
      const [clients, invoices, services, config] = await Promise.all([
        Client.find().lean(),
        Invoice.find().populate("client").lean(),
        Service.find().lean(),
        Config.findOne().lean(),
      ]);

      const metadata = createMetadata("full", {
        clientsCount: clients.length,
        invoicesCount: invoices.length,
        servicesCount: services.length,
        configFound: !!config,
      });

      archive.append(JSON.stringify(clients, null, 2), { name: "clients.json" });
      archive.append(JSON.stringify(invoices, null, 2), { name: "invoices.json" });
      archive.append(JSON.stringify(services, null, 2), { name: "services.json" });
      archive.append(JSON.stringify(config || {}, null, 2), { name: "config.json" });
      archive.append(JSON.stringify(metadata, null, 2), { name: "backup_metadata.json" });
    }

    await archive.finalize();
  } catch (error) {
    console.error("Backup export error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to generate backup archive.", error: error.message });
    }
  }
};

// POST /api/backup/import - Upload JSON file or ZIP backup file to restore database
export const importBackup = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No backup file uploaded." });
    }

    const filename = (req.file.originalname || "").toLowerCase();
    const results = {
      clientsRestored: 0,
      invoicesRestored: 0,
      servicesRestored: 0,
      configRestored: false,
    };

    if (filename.endsWith(".json")) {
      const jsonText = req.file.buffer.toString("utf-8");
      const data = JSON.parse(jsonText);

      if (Array.isArray(data)) {
        if (data.length > 0) {
          const sample = data[0];
          if (sample.invoiceNumber || sample.items) {
            results.invoicesRestored = await processInvoicesImport(data);
          } else if (sample.clientName || sample.companyName) {
            results.clientsRestored = await processClientsImport(data);
          } else if (sample.sacCode || sample.gstRate) {
            results.servicesRestored = await processServicesImport(data);
          }
        }
      } else if (typeof data === "object" && data !== null) {
        if (data.clients && Array.isArray(data.clients)) {
          results.clientsRestored = await processClientsImport(data.clients);
        }
        if (data.invoices && Array.isArray(data.invoices)) {
          results.invoicesRestored = await processInvoicesImport(data.invoices);
        }
        if (data.services && Array.isArray(data.services)) {
          results.servicesRestored = await processServicesImport(data.services);
        }
        if (data.config && typeof data.config === "object") {
          results.configRestored = await processConfigImport(data.config);
        } else if (data.companyName || data.companyGst) {
          results.configRestored = await processConfigImport(data);
        }
      }
    } else if (filename.endsWith(".zip")) {
      const zip = await JSZip.loadAsync(req.file.buffer);

      if (zip.file("clients.json")) {
        const text = await zip.file("clients.json").async("text");
        results.clientsRestored = await processClientsImport(JSON.parse(text));
      }
      if (zip.file("invoices.json")) {
        const text = await zip.file("invoices.json").async("text");
        results.invoicesRestored = await processInvoicesImport(JSON.parse(text));
      }
      if (zip.file("services.json")) {
        const text = await zip.file("services.json").async("text");
        results.servicesRestored = await processServicesImport(JSON.parse(text));
      }
      if (zip.file("config.json")) {
        const text = await zip.file("config.json").async("text");
        results.configRestored = await processConfigImport(JSON.parse(text));
      }
    } else {
      return res.status(400).json({ message: "Unsupported file format. Please upload a .json or .zip backup file." });
    }

    const totalRecords =
      results.clientsRestored +
      results.invoicesRestored +
      results.servicesRestored +
      (results.configRestored ? 1 : 0);

    if (totalRecords === 0) {
      return res.status(400).json({ message: "No valid dataset records found in the uploaded backup file." });
    }

    res.json({
      success: true,
      message: `Data restore complete! Restored ${totalRecords} record(s).`,
      details: results,
    });
  } catch (error) {
    console.error("Data restore error:", error);
    res.status(500).json({ message: "Error restoring backup data.", error: error.message });
  }
};
