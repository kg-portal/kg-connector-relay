const express = require("express");

const app = express();
app.use(express.json({ limit: "20mb" }));

const PORT = process.env.PORT || 10000;
const ACTION_TOKEN = process.env.ACTION_TOKEN || "kg-test-123456789";
const RELAY_TOKEN = process.env.RELAY_TOKEN || "kg-relay-secret-123456789";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://kg-connector-relay.onrender.com";

let target = process.env.INITIAL_TARGET || "";

function getBearer(req) {
  return (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
}

function requireRelay(req, res, next) {
  if (getBearer(req) !== RELAY_TOKEN) {
    return res.status(401).json({ ok: false, error: "relay unauthorized" });
  }
  next();
}

function requireAction(req, res, next) {
  if (getBearer(req) !== ACTION_TOKEN) {
    return res.status(401).json({ ok: false, error: "action unauthorized" });
  }
  next();
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "KG Connector Relay",
    target_set: Boolean(target),
    target
  });
});

app.post("/update-target", requireRelay, (req, res) => {
  const nextTarget = String(req.body.target || "").trim().replace(/\/+$/, "");

  if (!/^https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com$/.test(nextTarget)) {
    return res.status(400).json({
      ok: false,
      error: "invalid target",
      target: nextTarget
    });
  }

  target = nextTarget;
  res.json({ ok: true, target });
});

app.get("/relay-status", requireAction, (req, res) => {
  res.json({
    ok: true,
    name: "KG Connector Relay",
    target_set: Boolean(target),
    target
  });
});

async function forwardToTarget(req, res) {
  if (!target) {
    return res.status(503).json({ ok: false, error: "target not set" });
  }

  const url = target + req.originalUrl;

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        "content-type": "application/json",
        "authorization": req.headers.authorization || ""
      },
      body: (req.method === "GET" || req.method === "HEAD") ? undefined : JSON.stringify(req.body || {})
    });

    const text = await response.text();
    res.status(response.status);
    res.set("content-type", response.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: "forward failed",
      detail: err.message,
      target
    });
  }
}

const OPENAPI_YAML = [
"openapi: 3.1.0",
"info:",
"  title: KG Connector Relay",
"  version: 1.0.2",
"servers:",
`  - url: ${PUBLIC_BASE_URL}`,
"components:",
"  securitySchemes:",
"    bearerAuth:",
"      type: http",
"      scheme: bearer",
"  schemas:",
"    GenericObject:",
"      type: object",
"      properties:",
"        ok: { type: boolean }",
"        error: { type: string }",
"        message: { type: string }",
"        name: { type: string }",
"        version: { type: string }",
"        url: { type: string }",
"        title: { type: string }",
"        text: { type: string }",
"        products_count: { type: integer }",
"        total_products: { type: integer }",
"        csv_file: { type: string }",
"        workspace_dir: { type: string }",
"        pc_time: { type: string }",
"        public_base_url: { type: string }",
"        target: { type: string }",
"        target_set: { type: boolean }",
"        tokensLeft: { type: integer }",
"        refillIn: { type: integer }",
"        asin_count: { type: integer }",
"        asinList:",
"          type: array",
"          items: { type: string }",
"        products:",
"          type: array",
"          items:",
"            type: object",
"            properties:",
"              asin: { type: string }",
"              title: { type: string }",
"              brand: { type: string }",
"              size: { type: string }",
"              price: { type: string }",
"              stock: { type: string }",
"              link: { type: string }",
"              source_url: { type: string }",
"        sample:",
"          type: array",
"          items:",
"            type: object",
"            properties:",
"              title: { type: string }",
"              brand: { type: string }",
"              size: { type: string }",
"              price: { type: string }",
"        pages:",
"          type: array",
"          items:",
"            type: object",
"            properties:",
"              page: { type: integer }",
"              url: { type: string }",
"              products_count: { type: integer }",
"        items:",
"          type: array",
"          items:",
"            type: object",
"            properties:",
"              name: { type: string }",
"              type: { type: string }",
"    EmptyRequest:",
"      type: object",
"      properties:",
"        dummy: { type: string }",
"    UrlRequest:",
"      type: object",
"      required: [url]",
"      properties:",
"        url: { type: string }",
"    ClickRequest:",
"      type: object",
"      required: [text]",
"      properties:",
"        text: { type: string }",
"    ScrapePagesRequest:",
"      type: object",
"      required: [start_url]",
"      properties:",
"        start_url: { type: string }",
"        max_pages: { type: integer }",
"        next_text: { type: string }",
"    KeepaProductRequest:",
"      type: object",
"      properties:",
"        domain: { type: string }",
"        asin: { type: string }",
"        code: { type: string }",
"        ean: { type: string }",
"        upc: { type: string }",
"        stats: { type: integer }",
"        offers: { type: integer }",
"        history: { type: integer }",
"        rating: { type: integer }",
"        buybox: { type: integer }",
"        include_raw: { type: boolean }",
"    KeepaSearchRequest:",
"      type: object",
"      required: [selection]",
"      properties:",
"        domain: { type: string }",
"        selection:",
"          type: object",
"          additionalProperties: true",
"        page: { type: integer }",
"        perPage: { type: integer }",
"        include_raw: { type: boolean }",
"    FileCreateRequest:",
"      type: object",
"      required: [relative_path]",
"      properties:",
"        relative_path: { type: string }",
"        content: { type: string }",
"    FileReadRequest:",
"      type: object",
"      required: [relative_path]",
"      properties:",
"        relative_path: { type: string }",
"    FileListRequest:",
"      type: object",
"      properties:",
"        relative_path: { type: string }",
"security:",
"  - bearerAuth: []",
"paths:",
"  /relay-status:",
"    get:",
"      operationId: relay_status",
"      summary: Relay status",
"      responses:",
"        '200':",
"          description: OK",
"          content:",
"            application/json:",
"              schema: { $ref: '#/components/schemas/GenericObject' }",
"  /status:",
"    get:",
"      operationId: status",
"      summary: Connector status",
"      responses:",
"        '200':",
"          description: OK",
"          content:",
"            application/json:",
"              schema: { $ref: '#/components/schemas/GenericObject' }",
"  /keepa_product:",
"    post:",
"      operationId: keepa_product",
"      summary: Get Amazon product data from Keepa by ASIN or EAN/UPC code",
"      requestBody:",
"        required: true",
"        content:",
"          application/json:",
"            schema: { $ref: '#/components/schemas/KeepaProductRequest' }",
"      responses:",
"        '200':",
"          description: OK",
"          content:",
"            application/json:",
"              schema: { $ref: '#/components/schemas/GenericObject' }",
"  /keepa_search:",
"    post:",
"      operationId: keepa_search",
"      summary: Search Amazon products with Keepa Product Finder selection",
"      requestBody:",
"        required: true",
"        content:",
"          application/json:",
"            schema: { $ref: '#/components/schemas/KeepaSearchRequest' }",
"      responses:",
"        '200':",
"          description: OK",
"          content:",
"            application/json:",
"              schema: { $ref: '#/components/schemas/GenericObject' }",
"  /spapi_catalog_search:",
"    post:",
"      operationId: spapi_catalog_search",
"      summary: Search Amazon catalog items with SP-API by keywords",
"      requestBody:",
"        required: true",
"        content:",
"          application/json:",
"            schema:",
"              type: object",
"              required: [keywords]",
"              properties:",
"                keywords: { type: string }",
"                marketplaceIds: { type: string }",
"                includedData: { type: string }",
"                include_raw: { type: boolean }",
"      responses:",
"        '200':",
"          description: OK",
"          content:",
"            application/json:",
"              schema: { $ref: '#/components/schemas/GenericObject' }",
"  /spapi_item_offers:",
"    post:",
"      operationId: spapi_item_offers",
"      summary: Get SP-API item offers, Buy Box, lowest price and seller count by ASIN",
"      requestBody:",
"        required: true",
"        content:",
"          application/json:",
"            schema:",
"              type: object",
"              required: [asin]",
"              properties:",
"                asin: { type: string }",
"                marketplaceId: { type: string }",
"                marketplaceIds: { type: string }",
"                itemCondition: { type: string }",
"                customerType: { type: string }",
"                include_raw: { type: boolean }",
"      responses:",
"        '200':",
"          description: OK",
"          content:",
"            application/json:",
"              schema: { $ref: '#/components/schemas/GenericObject' }",
  
"  /browser_open:",
"    post:",
"      operationId: browser_open",
"      summary: Open URL",
"      requestBody:",
"        required: true",
"        content:",
"          application/json:",
"            schema: { $ref: '#/components/schemas/UrlRequest' }",
"      responses:",
"        '200':",
"          description: OK",
"          content:",
"            application/json:",
"              schema: { $ref: '#/components/schemas/GenericObject' }",
"  /browser_click_text:",
"    post:",
"      operationId: browser_click_text",
"      summary: Click text",
"      requestBody:",
"        required: true",
"        content:",
"          application/json:",
"            schema: { $ref: '#/components/schemas/ClickRequest' }",
"      responses:",
"        '200':",
"          description: OK",
"          content:",
"            application/json:",
"              schema: { $ref: '#/components/schemas/GenericObject' }",
"  /browser_get_text:",
"    post:",
"      operationId: browser_get_text",
"      summary: Get visible text",
"      requestBody:",
"        required: false",
"        content:",
"          application/json:",
"            schema: { $ref: '#/components/schemas/EmptyRequest' }",
"      responses:",
"        '200':",
"          description: OK",
"          content:",
"            application/json:",
"              schema: { $ref: '#/components/schemas/GenericObject' }",
"  /browser_extract_products:",
"    post:",
"      operationId: browser_extract_products",
"      summary: Extract products",
"      requestBody:",
"        required: false",
"        content:",
"          application/json:",
"            schema: { $ref: '#/components/schemas/EmptyRequest' }",
"      responses:",
"        '200':",
"          description: OK",
"          content:",
"            application/json:",
"              schema: { $ref: '#/components/schemas/GenericObject' }",
"  /browser_scrape_pages:",
"    post:",
"      operationId: browser_scrape_pages",
"      summary: Scrape pages",
"      requestBody:",
"        required: true",
"        content:",
"          application/json:",
"            schema: { $ref: '#/components/schemas/ScrapePagesRequest' }",
"      responses:",
"        '200':",
"          description: OK",
"          content:",
"            application/json:",
"              schema: { $ref: '#/components/schemas/GenericObject' }",
"  /file_create:",
"    post:",
"      operationId: file_create",
"      summary: Create file",
"      requestBody:",
"        required: true",
"        content:",
"          application/json:",
"            schema: { $ref: '#/components/schemas/FileCreateRequest' }",
"      responses:",
"        '200':",
"          description: OK",
"          content:",
"            application/json:",
"              schema: { $ref: '#/components/schemas/GenericObject' }",
"  /file_read:",
"    post:",
"      operationId: file_read",
"      summary: Read file",
"      requestBody:",
"        required: true",
"        content:",
"          application/json:",
"            schema: { $ref: '#/components/schemas/FileReadRequest' }",
"      responses:",
"        '200':",
"          description: OK",
"          content:",
"            application/json:",
"              schema: { $ref: '#/components/schemas/GenericObject' }",
"  /file_list:",
"    post:",
"      operationId: file_list",
"      summary: List files",
"      requestBody:",
"        required: false",
"        content:",
"          application/json:",
"            schema: { $ref: '#/components/schemas/FileListRequest' }",
"      responses:",
"        '200':",
"          description: OK",
"          content:",
"            application/json:",
"              schema: { $ref: '#/components/schemas/GenericObject' }"
].join("\n");

app.get("/openapi.yaml", (req, res) => {
  res.type("text/yaml").send(OPENAPI_YAML);
});

app.all("/status", requireAction, forwardToTarget);
app.all("/keepa_product", requireAction, forwardToTarget);
app.all("/keepa_search", requireAction, forwardToTarget);
app.all("/spapi_catalog_search", requireAction, forwardToTarget);
app.all("/spapi_item_offers", requireAction, forwardToTarget);
app.all("/browser_open", requireAction, forwardToTarget);
app.all("/browser_type_text", requireAction, forwardToTarget);
app.all("/browser_press_enter", requireAction, forwardToTarget);
app.all("/browser_click_text", requireAction, forwardToTarget);
app.all("/browser_get_text", requireAction, forwardToTarget);
app.all("/browser_extract_products", requireAction, forwardToTarget);
app.all("/browser_scrape_pages", requireAction, forwardToTarget);
app.all("/file_create", requireAction, forwardToTarget);
app.all("/file_read", requireAction, forwardToTarget);
app.all("/file_list", requireAction, forwardToTarget);
app.all("/db_recent", requireAction, forwardToTarget);
app.all("/wholesale_recent", requireAction, forwardToTarget);
app.all("/bulk_profit_check", requireAction, forwardToTarget);

app.listen(PORT, () => {
  console.log("KG Connector Relay running on " + PORT);
});
