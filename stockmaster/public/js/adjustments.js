const API_URL_A = "http://localhost:3000/api";
const token_A = localStorage.getItem("token");

if (!token_A) window.location.href = "/login.html";

const fetchHeaders_A = {
  Authorization: `Bearer ${token_A}`,
  "Content-Type": "application/json",
};

document.getElementById("logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

let adjustments = [];
let warehouses_A = [];
let products_A = [];

async function loadData_A() {
  try {
    const [whResponse, prodResponse] = await Promise.all([
      fetch(`${API_URL_A}/warehouses`, { headers: fetchHeaders_A }),
      fetch(`${API_URL_A}/products`, { headers: fetchHeaders_A }),
    ]);

    warehouses_A = await whResponse.json();
    products_A = await prodResponse.json();

    const warehouseSelect = document.getElementById("adjustmentWarehouse");
    const productSelect = document.getElementById("adjustmentProduct");
    const filterWarehouseSelect = document.getElementById("filterWarehouse");

    warehouseSelect.innerHTML =
      '<option value="">Select warehouse</option>' +
      warehouses_A
        .map((w) => `<option value="${w._id}">${w.name}</option>`)
        .join("");

    productSelect.innerHTML =
      '<option value="">Select product</option>' +
      products_A
        .map((p) => `<option value="${p._id}">${p.name} (${p.sku})</option>`)
        .join("");

    filterWarehouseSelect.innerHTML =
      '<option value="">All Warehouses</option>' +
      warehouses_A
        .map((w) => `<option value="${w._id}">${w.name}</option>`)
        .join("");
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

async function loadAdjustments(warehouse = "") {
  try {
    let url = `${API_URL_A}/adjustments?`;
    if (warehouse) url += `warehouse=${warehouse}`;

    const response = await fetch(url, { headers: fetchHeaders_A });
    adjustments = await response.json();
    renderAdjustments();
  } catch (error) {
    console.error("Error loading adjustments:", error);
  }
}

function renderAdjustments() {
  const tbody = document.getElementById("adjustmentsTable");

  if (adjustments.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="text-center">No adjustments found</td></tr>';
    return;
  }

  tbody.innerHTML = adjustments
    .map(
      (adj) => `
        <tr>
            <td>${adj.adjustmentNumber}</td>
            <td>${adj.product?.name || "N/A"}</td>
            <td>${adj.warehouse?.name || "N/A"}</td>
            <td>${adj.recordedQuantity}</td>
            <td>${adj.countedQuantity}</td>
            <td style="color: ${adj.difference >= 0 ? "green" : "red"}">
                ${adj.difference >= 0 ? "+" : ""}${adj.difference}
            </td>
            <td>${adj.reason}</td>
            <td>${new Date(adj.createdAt).toLocaleDateString()}</td>
        </tr>
    `
    )
    .join("");
}

document.getElementById("addAdjustmentBtn").addEventListener("click", () => {
  document.getElementById("modalTitle").textContent = "New Adjustment";
  document.getElementById("adjustmentForm").reset();
  document.getElementById("adjustmentModal").classList.add("active");
});

document
  .getElementById("adjustmentForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const adjustmentData = {
      warehouse: document.getElementById("adjustmentWarehouse").value,
      product: document.getElementById("adjustmentProduct").value,
      countedQuantity: parseInt(
        document.getElementById("adjustmentQuantity").value
      ),
      reason: document.getElementById("adjustmentReason").value,
      notes: document.getElementById("adjustmentNotes").value,
    };

    try {
      const response = await fetch(`${API_URL_A}/adjustments`, {
        method: "POST",
        headers: fetchHeaders_A,
        body: JSON.stringify(adjustmentData),
      });

      if (response.ok) {
        alert("Adjustment created successfully");
        closeModal();
        loadAdjustments();
      } else {
        const data = await response.json();
        alert(data.message);
      }
    } catch (error) {
      alert("Error creating adjustment");
    }
  });

function closeModal() {
  document.getElementById("adjustmentModal").classList.remove("active");
}

document.getElementById("filterWarehouse").addEventListener("change", (e) => {
  loadAdjustments(e.target.value);
});

loadData_A();
loadAdjustments();
