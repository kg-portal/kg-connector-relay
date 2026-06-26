const express = require("express");
const app = express();
app.use(express.json({limit:"20mb"}));

const PORT = process.env.PORT || 10000;
const ACTION_TOKEN = process.env.ACTION_TOKEN || "kg-test-123456789";
const RELAY_TOKEN = process.env.RELAY_TOKEN || "kg-relay-secret-123456789";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://kg-connector-relay.onrender.com";
let target = process.env.INITIAL_TARGET || "";

function bearer(req){ return (req.headers.authorization || "").replace(/^Bearer\s+/i,"").trim(); }
function relayAuth(req,res,next){ if(bearer(req)!==RELAY_TOKEN) return res.status(401).json({ok:false,error:"relay unauthorized"}); next(); }
function actionAuth(req,res,next){ if(bearer(req)!==ACTION_TOKEN) return res.status(401).json({ok:false,error:"action unauthorized"}); next(); }

app.get("/", (req,res)=>res.json({ok:true,name:"KG Connector Relay",target_set:!!target,target}));
app.post("/update-target", relayAuth, (req,res)=>{
  const t = String(req.body.target || "").trim().replace(/\/+$/,"");
  if(!/^https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com$/.test(t)) return res.status(400).json({ok:false,error:"invalid target",target:t});
  target = t;
  res.json({ok:true,target});
});
app.get("/relay-status", actionAuth, (req,res)=>res.json({ok:true,name:"KG Connector Relay",target_set:!!target,target}));

async function forward(req,res){
  if(!target) return res.status(503).json({ok:false,error:"target not set"});
  try{
    const r = await fetch(target + req.originalUrl, {
      method: req.method,
      headers: {"content-type":"application/json","authorization":req.headers.authorization || ""},
      body: (req.method==="GET"||req.method==="HEAD") ? undefined : JSON.stringify(req.body || {})
    });
    const txt = await r.text();
    res.status(r.status).set("content-type", r.headers.get("content-type") || "application/json").send(txt);
  }catch(e){
    res.status(502).json({ok:false,error:"forward failed",detail:e.message,target});
  }
}

app.get("/openapi.yaml", (req,res)=>res.type("text/yaml").send(`openapi: 3.1.0
info:
  title: KG Connector Relay
  version: 1.0.0
servers:
  - url: ${PUBLIC_BASE_URL}
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
  schemas:
    GenericObject:
      type: object
      properties:
        ok: { type: boolean }
        error: { type: string }
        message: { type: string }
        name: { type: string }
        version: { type: string }
        url: { type: string }
        title: { type: string }
        text: { type: string }
        products_count: { type: integer }
        total_products: { type: integer }
        csv_file: { type: string }
        workspace_dir: { type: string }
        pc_time: { type: string }
        public_base_url: { type: string }
        target: { type: string }
        target_set: { type: boolean }
        products:
          type: array
          items:
            type: object
            properties:
              title: { type: string }
              brand: { type: string }
              size: { type: string }
              price: { type: string }
              stock: { type: string }
              link: { type: string }
              source_url: { type: string }
        sample:
          type: array
          items:
            type: object
            properties:
              title: { type: string }
              brand: { type: string }
              size: { type: string }
              price: { type: string }
        pages:
          type: array
          items:
            type: object
            properties:
              page: { type: integer }
              url: { type: string }
              products_count: { type: integer }
        items:
          type: array
          items:
            type: object
            properties:
              name: { type: string }
              type: { type: string }
    EmptyRequest:
      type: object
      properties:
        dummy: { type: string }
    UrlRequest:
      type: object
      required: [url]
      properties:
        url: { type: string }
    ClickRequest:
      type: object
      required: [text]
      properties:
        text: { type: string }
    ScrapePagesRequest:
      type: object
      required: [start_url]
      properties:
        start_url: { type: string }
        max_pages: { type: integer }
        next_text: { type: string }
    FileCreateRequest:
      type: object
      required: [relative_path]
      properties:
        relative_path: { type: string }
        content: { type: string }
    FileReadRequest:
      type: object
      required: [relative_path]
      properties:
        relative_path: { type: string }
    FileListRequest:
      type: object
      properties:
        relative_path: { type: string }
security:
  - bearerAuth: []
paths:
  /relay-status:
    get:
      operationId: relay_status
      summary: Relay status
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/GenericObject" }
  /status:
    get:
      operationId: status
      summary: Connector status
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/GenericObject" }
  /browser_open:
    post:
      operationId: browser_open
      summary: Open URL
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/UrlRequest" }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/GenericObject" }
  /browser_click_text:
    post:
      operationId: browser_click_text
      summary: Click text
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/ClickRequest" }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/GenericObject" }
  /browser_get_text:
    post:
      operationId: browser_get_text
      summary: Get visible text
      requestBody:
        required: false
        content:
          application/json:
            schema: { $ref: "#/components/schemas/EmptyRequest" }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/GenericObject" }
  /browser_extract_products:
    post:
      operationId: browser_extract_products
      summary: Extract products
      requestBody:
        required: false
        content:
          application/json:
            schema: { $ref: "#/components/schemas/EmptyRequest" }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/GenericObject" }
  /browser_scrape_pages:
    post:
      operationId: browser_scrape_pages
      summary: Scrape pages
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/ScrapePagesRequest" }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/GenericObject" }
  /file_create:
    post:
      operationId: file_create
      summary: Create file
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/FileCreateRequest" }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/GenericObject" }
  /file_read:
    post:
      operationId: file_read
      summary: Read file
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/FileReadRequest" }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/GenericObject" }
  /file_list:
    post:
      operationId: file_list
      summary: List files
      requestBody:
        required: false
        content:
          application/json:
            schema: { $ref: "#/components/schemas/FileListRequest" }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/GenericObject" }
`);
});

app.use((req,res,next)=> {
  if(req.path==="/" || req.path==="/openapi.yaml" || req.path==="/update-target" || req.path==="/relay-status") return next();
  actionAuth(req,res,next);
});
app.all(["/status","/browser_open","/browser_click_text","/browser_get_text","/browser_extract_products","/browser_scrape_pages","/file_create","/file_read","/file_list"], forward);

app.listen(PORT, ()=>console.log("KG Connector Relay running on " + PORT));
