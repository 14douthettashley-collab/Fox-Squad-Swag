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
        customText: item.customText || ""
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
const NO_IMAGE = "images/Grayscale fox no-image placeholder.png";

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
    const response = await fetch(PRODUCT_SHEET_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load the published catalog");
    const rows = parseCSV(await response.text());
    if (rows.length && !("Product Name" in rows[0]) && !("Items" in rows[0]))
        throw new Error("The published sheet needs a Product Name or Items column");
    let existing = [];
    try {
        const old = await fetch("products.json");
        if (old.ok) existing = await old.json();
    } catch (error) { console.warn("Existing size options unavailable", error); }
    const seen = new Set();
    return rows.map(r => {
        const name = r["Product Name"] || r.Items || "";
        const base = existing.find(p => p.name === name) || {};
        const status = (r.Status || "").toLowerCase();
        const active = status ? status !== "discontinued" : /^(true|yes|1)$/i.test(r.Active || "");
        const rawPrice = r["New Price"] || r.Price || "";
        const price = rawPrice === "" ? null : Number(rawPrice.replace(/[$,]/g, ""));
        return { ...base, name, active, status,
            price: Number.isFinite(price) ? price : null,
            pricePending: status === "price pending" || price === null || !Number.isFinite(price),
            new: /^(true|yes|1)$/i.test(r.New || ""),
            featured: /^(true|yes|1)$/i.test(r.Featured || ""),
            categories: (r.Categories || "").split(/[|,]/).map(c => c.trim()).filter(Boolean),
            coverImage: r["Cover Image"] || r["Main Photo URL"] || "",
            description: r.Description || "", url: r.URL || r["Supplier URL"] || "",
            includedItems: (r["Included Items"] || "").split("|").filter(Boolean),
            packSummary: r["Pack Summary"] || ""
        };
    }).filter(p => {
        if (!p.name || !p.active || seen.has(p.name)) return false;
        seen.add(p.name); return true;
    });
}

function productImage(product) {
    if (!product.coverImage) return NO_IMAGE;
    return /^https?:\/\//i.test(product.coverImage) ? product.coverImage : "images/" + product.coverImage;
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
