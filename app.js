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
    updateCartCount();

    alert(item.name + " added to cart!");
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById("cartCount");

    if (cartCount) {
        cartCount.textContent = count;
    }
}

document.addEventListener("DOMContentLoaded", updateCartCount);
