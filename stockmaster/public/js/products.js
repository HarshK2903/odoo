const API_URL = "http://localhost:3000/api";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/login.html";
}

const fetchHeaders = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

// Logout
document.getElementById("logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login.html";
});

let products = [];
let warehouses = [];

// Load Warehouses
async function loadWarehouses() {
  try {
    const response = await fetch(`${API_URL}/warehouses`, {
      headers: fetchHeaders,
    });
    warehouses = await response.json();

    // Populate warehouse select
    const warehouseSelect = document.getElementById("productWarehouse");
    const filterWarehouseSelect = document.getElementById("filterWarehouse");

    warehouseSelect.innerHTML =
      '<option value="">Select warehouse</option>' +
      warehouses
        .map((w) => `<option value="${w._id}">${w.name}</option>`)
        .join("");

    filterWarehouseSelect.innerHTML =
      '<option value="">All Warehouses</option>' +
      warehouses
        .map((w) => `<option value="${w._id}">${w.name}</option>`)
        .join("");
  } catch (error) {
    console.error("Error loading warehouses:", error);
  }
}

// Load Products
async function loadProducts(search = "", category = "", warehouse = "") {
  try {
    let url = `${API_URL}/products?`;
    if (search) url += `search=${search}&`;
    if (category) url += `category=${category}&`;
    if (warehouse) url += `warehouse=${warehouse}&`;

    const response = await fetch(url, { headers: fetchHeaders });
    products = await response.json();

    renderProducts();
    loadCategories();
  } catch (error) {
    console.error("Error loading products:", error);
    document.getElementById("productsTable").innerHTML =
      '<tr><td colspan="7" class="text-center">Error loading products</td></tr>';
  }
}

// Render Products Table
function renderProducts() {
  const tbody = document.getElementById("productsTable");

  if (products.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">No products found</td></tr>';
    return;
  }

  tbody.innerHTML = products
    .map((product) => {
      const isLowStock = product.totalStock <= product.minStock;
      const isOutOfStock = product.totalStock === 0;

      let statusBadge = "";
      if (isOutOfStock) {
        statusBadge =
          '<span class="status-badge status-canceled">Out of Stock</span>';
      } else if (isLowStock) {
        statusBadge =
          '<span class="status-badge status-waiting">Low Stock</span>';
      } else {
        statusBadge = '<span class="status-badge status-done">In Stock</span>';
      }

      return `
            <tr>
                <td>${product.sku}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.totalStock} ${product.unitOfMeasure}</td>
                <td>${product.minStock}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editProduct('${product._id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product._id}')">Delete</button>
                </td>
            </tr>
        `;
    })
    .join("");
}

// Load Categories
async function loadCategories() {
  try {
    const response = await fetch(`${API_URL}/products/meta/categories`, {
      headers: fetchHeaders,
    });
    const categories = await response.json();

    const categorySelect = document.getElementById("filterCategory");
    categorySelect.innerHTML =
      '<option value="">All Categories</option>' +
      categories.map((c) => `<option value="${c}">${c}</option>`).join("");
  } catch (error) {
    console.error("Error loading categories:", error);
  }
}

// Add Product
document.getElementById("addProductBtn").addEventListener("click", () => {
  document.getElementById("modalTitle").textContent = "Add Product";
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("productModal").classList.add("active");
});

// Edit Product
async function editProduct(id) {
  try {
    const response = await fetch(`${API_URL}/products/${id}`, {
      headers: fetchHeaders,
    });
    const product = await response.json();

    document.getElementById("modalTitle").textContent = "Edit Product";
    document.getElementById("productId").value = product._id;
    document.getElementById("productName").value = product.name;
    document.getElementById("productSku").value = product.sku;
    document.getElementById("productCategory").value = product.category;
    document.getElementById("productUnit").value = product.unitOfMeasure;
    document.getElementById("productMinStock").value = product.minStock;
    document.getElementById("productInitialStock").value = 0;

    document.getElementById("productModal").classList.add("active");
  } catch (error) {
    alert("Error loading product");
  }
}

// Delete Product
async function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  try {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: "DELETE",
      headers: fetchHeaders,
    });

    if (response.ok) {
      alert("Product deleted successfully");
      loadProducts();
    } else {
      const data = await response.json();
      alert(data.message);
    }
  } catch (error) {
    alert("Error deleting product");
  }
}

// Save Product
document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("productId").value;
  const productData = {
    name: document.getElementById("productName").value,
    sku: document.getElementById("productSku").value,
    category: document.getElementById("productCategory").value,
    unitOfMeasure: document.getElementById("productUnit").value,
    minStock: parseInt(document.getElementById("productMinStock").value),
    initialStock: parseInt(
      document.getElementById("productInitialStock").value
    ),
    warehouse: document.getElementById("productWarehouse").value,
  };

  try {
    const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;
    const method = id ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: JSON.stringify(productData),
    });

    if (response.ok) {
      alert(
        id ? "Product updated successfully" : "Product created successfully"
      );
      closeModal();
      loadProducts();
    } else {
      const data = await response.json();
      alert(data.message);
    }
  } catch (error) {
    alert("Error saving product");
  }
});

// Close Modal
function closeModal() {
  document.getElementById("productModal").classList.remove("active");
}

// Filters
document.getElementById("searchProducts").addEventListener("input", (e) => {
  const search = e.target.value;
  const category = document.getElementById("filterCategory").value;
  const warehouse = document.getElementById("filterWarehouse").value;
  loadProducts(search, category, warehouse);
});

document.getElementById("filterCategory").addEventListener("change", (e) => {
  const search = document.getElementById("searchProducts").value;
  const category = e.target.value;
  const warehouse = document.getElementById("filterWarehouse").value;
  loadProducts(search, category, warehouse);
});

document.getElementById("filterWarehouse").addEventListener("change", (e) => {
  const search = document.getElementById("searchProducts").value;
  const category = document.getElementById("filterCategory").value;
  const warehouse = e.target.value;
  loadProducts(search, category, warehouse);
});

// Show Low Stock
document.getElementById("showLowStock").addEventListener("click", async () => {
  try {
    const response = await fetch(`${API_URL}/products/alerts/low-stock`, {
      headers: fetchHeaders,
    });
    products = await response.json();
    renderProducts();
  } catch (error) {
    alert("Error loading low stock products");
  }
});

// Initialize
loadWarehouses();
loadProducts();
