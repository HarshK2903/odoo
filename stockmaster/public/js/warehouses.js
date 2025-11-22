const API_URL_W = "http://localhost:3000/api";
const token_W = localStorage.getItem("token");

if (!token_W) window.location.href = "/login.html";

const fetchHeaders_W = {
  Authorization: `Bearer ${token_W}`,
  "Content-Type": "application/json",
};

document.getElementById("logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

let warehouses = [];

async function loadWarehouses() {
  try {
    const response = await fetch(`${API_URL_W}/warehouses`, {
      headers: fetchHeaders_W,
    });
    warehouses = await response.json();
    renderWarehouses();
  } catch (error) {
    console.error("Error loading warehouses:", error);
  }
}

function renderWarehouses() {
  const tbody = document.getElementById("warehousesTable");

  if (warehouses.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">No warehouses found</td></tr>';
    return;
  }

  tbody.innerHTML = warehouses
    .map(
      (wh) => `
        <tr>
            <td>${wh.code}</td>
            <td>${wh.name}</td>
            <td>${wh.type}</td>
            <td>${wh.location || "-"}</td>
            <td><span class="status-badge ${
              wh.active ? "status-done" : "status-canceled"
            }">
                ${wh.active ? "Active" : "Inactive"}
            </span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editWarehouse('${
                  wh._id
                }')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteWarehouse('${
                  wh._id
                }')">Delete</button>
            </td>
        </tr>
    `
    )
    .join("");
}

document.getElementById("addWarehouseBtn").addEventListener("click", () => {
  document.getElementById("modalTitle").textContent = "Add Warehouse";
  document.getElementById("warehouseForm").reset();
  document.getElementById("warehouseId").value = "";
  document.getElementById("warehouseModal").classList.add("active");
});

async function editWarehouse(id) {
  try {
    const warehouse = warehouses.find((w) => w._id === id);

    document.getElementById("modalTitle").textContent = "Edit Warehouse";
    document.getElementById("warehouseId").value = warehouse._id;
    document.getElementById("warehouseName").value = warehouse.name;
    document.getElementById("warehouseCode").value = warehouse.code;
    document.getElementById("warehouseType").value = warehouse.type;
    document.getElementById("warehouseLocation").value =
      warehouse.location || "";

    document.getElementById("warehouseModal").classList.add("active");
  } catch (error) {
    alert("Error loading warehouse");
  }
}

async function deleteWarehouse(id) {
  if (!confirm("Are you sure you want to delete this warehouse?")) return;

  try {
    const response = await fetch(`${API_URL_W}/warehouses/${id}`, {
      method: "DELETE",
      headers: fetchHeaders_W,
    });

    if (response.ok) {
      alert("Warehouse deleted successfully");
      loadWarehouses();
    } else {
      const data = await response.json();
      alert(data.message);
    }
  } catch (error) {
    alert("Error deleting warehouse");
  }
}

document
  .getElementById("warehouseForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("warehouseId").value;
    const warehouseData = {
      name: document.getElementById("warehouseName").value,
      code: document.getElementById("warehouseCode").value,
      type: document.getElementById("warehouseType").value,
      location: document.getElementById("warehouseLocation").value,
    };

    try {
      const url = id
        ? `${API_URL_W}/warehouses/${id}`
        : `${API_URL_W}/warehouses`;
      const method = id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: fetchHeaders_W,
        body: JSON.stringify(warehouseData),
      });

      if (response.ok) {
        alert(
          id
            ? "Warehouse updated successfully"
            : "Warehouse created successfully"
        );
        closeModal();
        loadWarehouses();
      } else {
        const data = await response.json();
        alert(data.message);
      }
    } catch (error) {
      alert("Error saving warehouse");
    }
  });

function closeModal() {
  document.getElementById("warehouseModal").classList.remove("active");
}

loadWarehouses();
