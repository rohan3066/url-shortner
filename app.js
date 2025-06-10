import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import path from "path";
import crypto from "crypto";
import { json } from "stream/consumers";

const DATA_FILE = path.join("data", "data.json");

const loadLinks = async () => {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(DATA_FILE, JSON.stringify({}));
      return {};
    }
    throw error;
  }
};

const saveLinks = async (links) => {
  await writeFile(DATA_FILE, JSON.stringify(links));
};

const server = createServer(async (req, res) => {
  console.log(req.url);

  if (req.method === "GET") {
    if (req.url === "/") {
      try {
        const data = await readFile(path.join("public", "index.html"));
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
      } catch (error) {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("404 Page Not Found");
      }
    } else if (req.url === "/style.css") {
      try {
        const data = await readFile(path.join("public", "style.css"));
        res.writeHead(200, { "Content-Type": "text/css" });
        res.end(data);
      } catch (error) {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("404 Page Not Found");
      }
    } else if (req.url === "/links") {
      const links = await loadLinks();
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(links));
    } else {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("404 Page Not Found");
    }
  }

  if (req.method === "POST" && req.url === "/shorten") {
    const links = await loadLinks();
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", async () => {
      console.log(data);
      const { url, shortcode } = JSON.parse(data);

      if (!url) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("URL is required");
      }

      const finalShortCode = shortcode || crypto.randomBytes(4).toString("hex");
      if (links[finalShortCode]) {
        res.writeHead(400, { "content-type": "text/plain" });
        return res.end("Short code already used choose another");
      }

      links[finalShortCode] = url;
      await saveLinks(links);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, shortcode: finalShortCode }));
    });
  }

  if (req.method === "DELETE" && req.url.startsWith("/delete/")) {
    const shortcode = req.url.split("/").pop();
    const links = await loadLinks();

    if (!links[shortcode]) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Shortcode not found");
    }

    delete links[shortcode];
    await saveLinks(links);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
  }
});

server.listen(4040 || 3000, () => {
  console.log("server is running at 4040");
});
