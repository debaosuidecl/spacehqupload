const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

/**
 * Extract ZIP file using multiple methods
 */
class ZipExtractor {
  constructor(options = {}) {
    this.options = {
      preserveStructure: true,
      overwrite: true,
      createDestDir: true,
      cleanupAfterExtract: false,
      maxFileSize: 100 * 1024 * 1024, // 100MB default
      ...options,
    };
  }

  /**
   * Main extraction function - auto-selects best method
   */
  async extract(zipPath, destDir, method = "auto") {
    // Validate inputs
    if (!fs.existsSync(zipPath)) {
      throw new Error(`ZIP file not found: ${zipPath}`);
    }

    // Check file size
    const stats = fs.statSync(zipPath);
    if (stats.size > this.options.maxFileSize) {
      throw new Error(
        `ZIP file exceeds maximum size of ${this.options.maxFileSize} bytes`,
      );
    }

    // Create destination directory
    if (this.options.createDestDir && !fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Select extraction method
    let result;
    switch (method) {
      case "system":
        result = await this.extractWithSystem(zipPath, destDir);
        break;
      case "admzip":
        result = await this.extractWithAdmZip(zipPath, destDir);
        break;
      case "auto":
      default:
        // Try system unzip first, fallback to adm-zip
        try {
          result = await this.extractWithSystem(zipPath, destDir);
        } catch (error) {
          console.log("System unzip failed, using adm-zip:", error.message);
          result = await this.extractWithAdmZip(zipPath, destDir);
        }
        break;
    }

    // Cleanup if requested
    if (this.options.cleanupAfterExtract) {
      this.cleanupZip(zipPath);
    }

    return result;
  }

  /**
   * Extract using system unzip command (fastest for large files)
   */
  async extractWithSystem(zipPath, destDir) {
    try {
      const startTime = Date.now();

      // Build command
      const overwriteFlag = this.options.overwrite ? "-o" : "-n";
      const preserveFlag = this.options.preserveStructure ? "" : "-j";
      const command = `unzip ${overwriteFlag} ${preserveFlag} "${zipPath}" -d "${destDir}"`;

      const { stdout, stderr } = await execPromise(command);

      if (
        stderr &&
        !stderr.includes("warning") &&
        !stderr.includes("caution")
      ) {
        throw new Error(stderr);
      }

      // Get extracted files info
      const files = this.getExtractedFiles(destDir);

      return {
        success: true,
        method: "system",
        files: files,
        fileCount: files.length,
        totalSize: this.calculateTotalSize(files),
        extractedTo: destDir,
        duration: Date.now() - startTime,
        output: stdout,
        warnings: stderr || null,
      };
    } catch (error) {
      throw new Error(`System extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract using AdmZip library (pure JavaScript, no dependencies)
   */
  async extractWithAdmZip(zipPath, destDir) {
    try {
      const startTime = Date.now();

      const zip = new AdmZip(zipPath);

      // Get entries before extraction
      const entries = zip.getEntries();

      // Extract all entries
      if (this.options.preserveStructure) {
        zip.extractAllTo(destDir, this.options.overwrite);
      } else {
        // Extract all files to root (no structure)
        zip.extractAllTo(destDir, this.options.overwrite);

        // Flatten: Move all files to root and remove subdirectories
        this.flattenDirectory(destDir);
      }

      // Get extracted files info
      const files = this.getExtractedFiles(destDir);

      return {
        success: true,
        method: "admzip",
        files: files,
        fileCount: files.length,
        totalSize: this.calculateTotalSize(files),
        extractedTo: destDir,
        duration: Date.now() - startTime,
        totalEntries: entries.length,
      };
    } catch (error) {
      throw new Error(`AdmZip extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract specific files from ZIP
   */
  async extractSpecific(zipPath, destDir, filePatterns = []) {
    try {
      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();

      let matchedEntries = [];

      if (filePatterns.length === 0) {
        matchedEntries = entries;
      } else {
        matchedEntries = entries.filter((entry) => {
          return filePatterns.some(
            (pattern) =>
              entry.entryName.includes(pattern) ||
              entry.entryName.match(new RegExp(pattern)),
          );
        });
      }

      if (matchedEntries.length === 0) {
        throw new Error("No files matched the specified patterns");
      }

      // Extract matched entries
      const extractedFiles = [];
      for (const entry of matchedEntries) {
        if (!entry.isDirectory) {
          const entryPath = path.join(destDir, entry.entryName);
          const entryDir = path.dirname(entryPath);

          if (!fs.existsSync(entryDir)) {
            fs.mkdirSync(entryDir, { recursive: true });
          }

          const content = zip.readFile(entry);
          fs.writeFileSync(entryPath, content);
          extractedFiles.push({
            name: entry.entryName,
            path: entryPath,
            size: entry.header.size,
          });
        }
      }

      return {
        success: true,
        method: "specific",
        files: extractedFiles,
        fileCount: extractedFiles.length,
        extractedTo: destDir,
        matchedPatterns: filePatterns,
      };
    } catch (error) {
      throw new Error(`Specific extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract only specific file types
   */
  async extractByType(zipPath, destDir, extensions = []) {
    const patterns = extensions.map((ext) => `${ext}$`);
    return this.extractSpecific(zipPath, destDir, patterns);
  }

  /**
   * Flatten directory structure
   */
  flattenDirectory(dir) {
    const walk = (currentDir) => {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          walk(fullPath);
          try {
            fs.rmdirSync(fullPath);
          } catch (e) {
            // Directory not empty, skip
          }
        } else {
          const newPath = path.join(dir, item);
          if (fs.existsSync(newPath)) {
            const ext = path.extname(item);
            const name = path.basename(item, ext);
            const newName = `${name}_${Date.now()}${ext}`;
            const finalPath = path.join(dir, newName);
            fs.renameSync(fullPath, finalPath);
          } else {
            fs.renameSync(fullPath, newPath);
          }
        }
      }
    };

    walk(dir);
  }

  /**
   * Get list of extracted files with metadata
   */
  getExtractedFiles(directory) {
    const files = [];

    const walk = (dir, basePath = "") => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.join(basePath, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          walk(fullPath, relativePath);
        } else {
          files.push({
            name: item,
            path: fullPath,
            relativePath: relativePath,
            size: stats.size,
            extension: path.extname(item),
            modified: stats.mtime,
            created: stats.birthtime,
          });
        }
      }
    };

    walk(directory);
    return files;
  }

  /**
   * Calculate total size of files
   */
  calculateTotalSize(files) {
    return files.reduce((total, file) => total + file.size, 0);
  }

  /**
   * Clean up ZIP file after extraction
   */
  cleanupZip(zipPath) {
    try {
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
        return { success: true };
      }
      return { success: false, message: "File not found" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get ZIP file information without extracting
   */
  getZipInfo(zipPath) {
    try {
      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();

      const info = {
        filename: path.basename(zipPath),
        totalEntries: entries.length,
        directories: 0,
        files: 0,
        totalSize: 0,
        fileTypes: {},
        entries: [],
      };

      for (const entry of entries) {
        if (entry.isDirectory) {
          info.directories++;
        } else {
          info.files++;
          info.totalSize += entry.header.size;

          const ext = path.extname(entry.entryName) || "no-extension";
          info.fileTypes[ext] = (info.fileTypes[ext] || 0) + 1;
        }

        info.entries.push({
          name: entry.entryName,
          size: entry.header.size,
          isDirectory: entry.isDirectory,
          compressedSize: entry.header.compressedSize,
        });
      }

      return info;
    } catch (error) {
      throw new Error(`Failed to read ZIP info: ${error.message}`);
    }
  }

  /**
   * Validate ZIP file
   */
  validateZip(zipPath) {
    try {
      if (!fs.existsSync(zipPath)) {
        return { valid: false, error: "File not found" };
      }

      const stats = fs.statSync(zipPath);
      if (stats.size === 0) {
        return { valid: false, error: "Empty file" };
      }

      if (stats.size > this.options.maxFileSize) {
        return {
          valid: false,
          error: `File exceeds maximum size of ${this.options.maxFileSize} bytes`,
        };
      }

      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();

      if (entries.length === 0) {
        return { valid: false, error: "No entries in ZIP file" };
      }

      return { valid: true, entries: entries.length };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

// Create singleton instance
const extractor = new ZipExtractor();

// Export functions using CommonJS
module.exports = {
  /**
   * Extract ZIP file
   */
  extractZip: async (zipPath, destDir, options = {}) => {
    const instance = new ZipExtractor(options);
    return instance.extract(zipPath, destDir, options.method || "auto");
  },

  /**
   * Extract ZIP using system unzip
   */
  extractWithSystem: async (zipPath, destDir, options = {}) => {
    const instance = new ZipExtractor(options);
    return instance.extractWithSystem(zipPath, destDir);
  },

  /**
   * Extract ZIP using AdmZip
   */
  extractWithAdmZip: async (zipPath, destDir, options = {}) => {
    const instance = new ZipExtractor(options);
    return instance.extractWithAdmZip(zipPath, destDir);
  },

  /**
   * Extract specific files
   */
  extractSpecificFiles: async (zipPath, destDir, patterns, options = {}) => {
    const instance = new ZipExtractor(options);
    return instance.extractSpecific(zipPath, destDir, patterns);
  },

  /**
   * Extract by file type
   */
  extractByType: async (zipPath, destDir, extensions, options = {}) => {
    const instance = new ZipExtractor(options);
    return instance.extractByType(zipPath, destDir, extensions);
  },

  /**
   * Get ZIP info
   */
  getZipInfo: (zipPath) => {
    return extractor.getZipInfo(zipPath);
  },

  /**
   * Validate ZIP
   */
  validateZip: (zipPath) => {
    return extractor.validateZip(zipPath);
  },

  /**
   * Get extracted files
   */
  getExtractedFiles: (directory) => {
    return extractor.getExtractedFiles(directory);
  },

  ZipExtractor,
};
