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

function parseCSV(text) {
    const rows = text.trim().split("\n");
    const headers = rows[0].split(",").map(h => h.trim());

    return rows.slice(1).map(row => {
        const values = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];

        let obj = {};

        headers.forEach((header, index) => {
            let value = values[index] || "";
            value = value.replace(/^"|"$/g, "").trim();
            obj[header] = value;
        });

        return obj;
    });
}

async function loadProducts() {
    const response = await fetch("products.json");
    const products = await response.json();

    return products.filter(product => product.active === true);
}

function makeProductId(name) {
    return name
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

document.addEventListener("DOMContentLoaded", updateCartCount);
