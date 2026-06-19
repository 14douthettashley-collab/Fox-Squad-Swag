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
        price: item.price,
        quantity: item.quantity || 1
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

document.addEventListener("DOMContentLoaded", updateCartCount);
