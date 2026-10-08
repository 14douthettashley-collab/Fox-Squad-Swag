function getCart() {
    return JSON.parse(localStorage.getItem("foxSquadCart")) || [];
}

function saveCart(cart) {
    localStorage.setItem("foxSquadCart", JSON.stringify(cart));
}

function addToCart(item) {
    const cart = getCart();

    cart.push({
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity || 1,
        sizeGroup: item.sizeGroup || "",
        size: item.size || "",
        callsign: item.callsign || "",
        lastName: item.lastName || "",
        playerNumber: item.playerNumber || "",
        customText: item.customText || "",
        selections: item.selections || {}
    });

    saveCart(cart);

    showCartCheckmark();
    showToast("Item added to cart");
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById("cartCount");

    if (cartCount) {
        cartCount.textContent = count === 0 ? "" : "(" + count + ")";
    }
}

function showCartCheckmark() {
    const cartCount = document.getElementById("cartCount");

    if (!cartCount) return;

    cartCount.textContent = "✅";

    setTimeout(() => {
        updateCartCount();
    }, 1000);
}

function showToast(message) {
    let toast = document.getElementById("toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = "show";

    setTimeout(() => {
        toast.className = "";
    }, 1600);
}

const PRODUCT_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBI4Te1WGcp3yxE5ouCJ-BrGTUKbqpj_QqP3x6hn6t7_FsFPkKNkTQJVZOPb7PGgdeDa8a9fVKg88J/pub?gid=0&single=true&output=csv";
const NO_IMAGE = "Images/Grayscale fox no-image placeholder.png";

function parseCSV(text) {
    const table = [];
    let row = [], cell = "", quoted = false;
    text = text.replace(/^\uFEFF/, "");
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
            else quoted = !quoted;
        } else if (c === ',' && !quoted) { row.push(cell); cell = ""; }
        else if ((c === '\n' || c === '\r') && !quoted) {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(cell); table.push(row); row = []; cell = "";
        } else cell += c;
    }
    if (quoted) throw new Error("Unclosed CSV quotation");
    if (cell || row.length) { row.push(cell); table.push(row); }
    const headers = (table.shift() || []).map(h => h.trim());
    return table.filter(r => r.some(v => v.trim())).map(r =>
        Object.fromEntries(headers.map((h, i) => [h, (r[i] || "").trim()])));
}

async function loadProducts() {
    const sheetBase = PRODUCT_SHEET_URL.split("?")[0];

    async function publishedTab(gid) {
        const response = await fetch(sheetBase + "?gid=" + gid + "&single=true&output=csv", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load published spreadsheet tab");
        return parseCSV(await response.text());
    }

    const [productResponse, imageRows] = await Promise.all([
        fetch(PRODUCT_SHEET_URL, { cache: "no-store" }),
        publishedTab("1245001669")
    ]);

    if (!productResponse.ok) throw new Error("Could not load the published catalog");

    const rows = parseCSV(await productResponse.text());
    if (rows.length && !("Product Name" in rows[0]) && !("Items" in rows[0]))
        throw new Error("The published sheet needs a Product Name or Items column");
    if (imageRows.length && !("Cover Images" in imageRows[0]))
        throw new Error("The published Images sheet needs a Cover Images column");

    let existing = [];
    try {
        const old = await fetch("products.json");
        if (old.ok) existing = await old.json();
    } catch (error) { console.warn("Existing size options unavailable", error); }

    const imagesByProduct = new Map(
        imageRows
            .filter(r => r.Product)
            .map(r => [r.Product, r])
    );

    const seen = new Set();
    return rows.map(r => {
        const name = r["Product Name"] || r.Items || "";
        const base = existing.find(p => p.name === name) || {};
        const status = (r.Status || "").toLowerCase();
        const active = status ? status !== "discontinued" : /^(true|yes|1)$/i.test(r.Active || "");
        const rawPrice = r["New Price"] || r.Price || "";
        const price = rawPrice === "" ? null : Number(rawPrice.replace(/[$,]/g, ""));
        const imageRow = imagesByProduct.get(name);
        const photos = imageRow
            ? Object.keys(imageRow)
                .filter(key => /^Image \d+$/i.test(key) && imageRow[key])
                .map(key => ({ image: imageRow[key] }))
            : [];

        return { ...base, name, active, status,
            price: Number.isFinite(price) ? price : null,
            pricePending: status === "price pending" || price === null || !Number.isFinite(price),
            new: /^(true|yes|1)$/i.test(r.New || ""),
            featured: /^(true|yes|1)$/i.test(r.Featured || ""),
            categories: (r.Categories || "").split(/[|,]/).map(c => c.trim()).filter(Boolean),
            coverImage: imageRow?.["Cover Images"] || "",
            photos,
            description: r.Description || "",
            features: (r.Features || "").split("|").map(feature => feature.trim()).filter(Boolean),
            url: r.URL || r["Supplier URL"] || "",
            includedItems: (r["Included Items"] || "").split("|").filter(Boolean),
            packSummary: r["Pack Summary"] || ""
        };
    }).filter(p => {
        if (!p.name || !p.active || seen.has(p.name)) return false;
        seen.add(p.name); return true;
    });
}

const SHEET_BASE = PRODUCT_SHEET_URL.split("?")[0];

async function loadImageRows() {
    const response = await fetch(SHEET_BASE + "?gid=1245001669&single=true&output=csv", { cache: "no-store" });
    if (!response.ok) throw new Error("Images tab unavailable");
    const rows = parseCSV(await response.text());
    if (rows.length && !("Cover Images" in rows[0])) throw new Error("Image columns not recognized");
    return rows;
}

function applyImagesToProduct(product, imageRows) {
    const normalize = value => String(value || "").trim().toLowerCase();
    const imageRow = imageRows.find(r => normalize(r.Product) === normalize(product.name));
    product.coverImage = imageRow?.["Cover Images"] || "";
    product.photos = imageRow
        ? Object.keys(imageRow)
            .filter(key => /^Image \d+$/i.test(key) && imageRow[key])
            .map(key => ({ image: imageRow[key] }))
        : [];
    return product;
}
async function loadProductTabs(product) {
    async function tab(gid) {
        const response = await fetch(SHEET_BASE + "?gid=" + gid + "&single=true&output=csv", {cache:"no-store"});
        if (!response.ok) throw new Error("Product tabs unavailable");
        return parseCSV(await response.text());
    }
    const [photos, options] = await Promise.all([loadImageRows(), tab("1263900876")]);
    if (options.length && !("Field Label" in options[0])) throw new Error("Options columns not recognized");

    applyImagesToProduct(product, photos);

    const optionRows = options.filter(r => r.Item === product.name && r["Field Label"]);
    product.orderFields = optionRows.map((r,i) => {
        const type = (r["Field Type"] || "").trim().toLowerCase();
        const previousRow = optionRows[i - 1];
        const explicitParent = (r["Depends On"] || "").trim();
        return {
            id: "field-" + i,
            label: r["Field Label"],
            type,
            choices: type === "dependent dropdown" ? [] : (r.Choices || "").split(/[|,]/).map(x=>x.trim()).filter(Boolean),
            choiceMap: type === "dependent dropdown"
                ? Object.fromEntries((r.Choices || "").split(/;|\n/).map(group => {
                    const split = group.indexOf("=");
                    if (split < 0) return [group.trim(), []];
                    return [group.slice(0, split).trim(), group.slice(split + 1).split(",").map(x=>x.trim()).filter(Boolean)];
                }).filter(([key]) => key))
                : {},
            dependsOn: explicitParent || (previousRow?.["Field Label"] || "").trim(),
            required: /^(yes|true|1)$/i.test(r.Required || "")
        };
    });
    return product;
}

function productImage(product) {
    if (!product.coverImage) return NO_IMAGE;
    return /^https?:\/\//i.test(product.coverImage) ? product.coverImage : "Images/" + product.coverImage;
}
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function makeProductId(name) {
    return String(name || "")
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function openMenu(){
    document.getElementById("sideMenu").style.width = "280px";
}

function closeMenu(){
    document.getElementById("sideMenu").style.width = "0";
}

function scrollSlider(id, amount){
    document.getElementById(id).scrollLeft += amount;
}

function toggleCatalog() {
    const dropdown = document.getElementById("catalogDropdown");

    if (dropdown.style.display === "none" || dropdown.style.display === "") {
        dropdown.style.display = "block";
    } else {
        dropdown.style.display = "none";
    }
}

document.addEventListener("DOMContentLoaded", updateCartCount);
