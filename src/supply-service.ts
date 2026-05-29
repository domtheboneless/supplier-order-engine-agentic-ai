import type {
  CreateSupplyInput,
  ListSuppliesInput,
  Supply,
  UpdateSupplyInput,
} from "./domain.js";
import { SupplyNotFoundError } from "./errors.js";
import type { SupplyRepository } from "./supply-repository.js";

const DEFAULT_CURRENCY = "EUR";
const DEFAULT_STATUS = "AVAILABLE";

function compareValues(left: number | string, right: number | string, order: "asc" | "desc") {
  const factor = order === "asc" ? 1 : -1;

  if (left < right) {
    return -1 * factor;
  }

  if (left > right) {
    return 1 * factor;
  }

  return 0;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function mapSummary(supply: Supply) {
  return {
    id: supply.id,
    name: supply.name,
    category: supply.category,
    status: supply.status,
    createdAt: supply.createdAt,
    updatedAt: supply.updatedAt,
    supplier: {
      id: supply.supplierId,
      name: supply.supplierName,
    },
    stock: {
      quantityAvailable: supply.quantityAvailable,
    },
    pricing: {
      unitPrice: supply.unitPrice,
      currency: supply.currency,
    },
  };
}

function mapDetail(supply: Supply) {
  return {
    ...mapSummary(supply),
  };
}

function getNextSupplyId(existingSupplies: Supply[]) {
  const currentMax = existingSupplies.reduce((max, supply) => {
    const match = /^SPL-(\d+)$/.exec(supply.id);

    if (!match) {
      return max;
    }

    return Math.max(max, Number(match[1]));
  }, 1000);

  return `SPL-${currentMax + 1}`;
}

export class SupplyService {
  constructor(private readonly repository: SupplyRepository) {}

  listSupplies(input: ListSuppliesInput) {
    const filtered = this.repository
      .list()
      .filter((supply) => !input.status || supply.status === input.status)
      .filter((supply) => !input.supplierId || supply.supplierId === input.supplierId)
      .filter(
        (supply) =>
          !input.category || supply.category.toLowerCase() === input.category.toLowerCase(),
      )
      .sort((left, right) => {
        if (input.sortBy === "quantityAvailable") {
          return compareValues(left.quantityAvailable, right.quantityAvailable, input.sortOrder);
        }

        if (input.sortBy === "name") {
          return compareValues(left.name, right.name, input.sortOrder);
        }

        return compareValues(left.updatedAt, right.updatedAt, input.sortOrder);
      });

    const totalItems = filtered.length;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / input.pageSize);
    const startIndex = (input.page - 1) * input.pageSize;
    const endIndex = startIndex + input.pageSize;

    return {
      data: filtered.slice(startIndex, endIndex).map(mapSummary),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        totalItems,
        totalPages,
      },
      filters: {
        status: input.status ?? null,
        supplierId: input.supplierId ?? null,
        category: input.category ?? null,
      },
      sort: {
        by: input.sortBy,
        order: input.sortOrder,
      },
    };
  }

  getSupplyById(supplyId: string) {
    const supply = this.repository.findById(supplyId);

    if (!supply) {
      throw new SupplyNotFoundError(supplyId);
    }

    return {
      data: mapDetail(supply),
    };
  }

  createSupply(input: CreateSupplyInput) {
    const now = new Date().toISOString();
    const existingSupplies = this.repository.list();

    const supply: Supply = {
      id: getNextSupplyId(existingSupplies),
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      name: input.name,
      category: input.category,
      status: input.status ?? DEFAULT_STATUS,
      quantityAvailable: input.quantityAvailable,
      unitPrice: roundMoney(input.unitPrice),
      currency: input.currency ?? DEFAULT_CURRENCY,
      createdAt: now,
      updatedAt: now,
    };

    return {
      data: mapDetail(this.repository.create(supply)),
    };
  }

  updateSupply(supplyId: string, input: UpdateSupplyInput) {
    const existingSupply = this.repository.findById(supplyId);

    if (!existingSupply) {
      throw new SupplyNotFoundError(supplyId);
    }

    const updatedSupply: Supply = {
      ...existingSupply,
      supplierId: input.supplierId ?? existingSupply.supplierId,
      supplierName: input.supplierName ?? existingSupply.supplierName,
      name: input.name ?? existingSupply.name,
      category: input.category ?? existingSupply.category,
      quantityAvailable: input.quantityAvailable ?? existingSupply.quantityAvailable,
      unitPrice:
        input.unitPrice === undefined ? existingSupply.unitPrice : roundMoney(input.unitPrice),
      currency: input.currency ?? existingSupply.currency,
      status: input.status ?? existingSupply.status,
      updatedAt: new Date().toISOString(),
    };

    return {
      data: mapDetail(this.repository.update(updatedSupply)),
    };
  }

  deleteSupply(supplyId: string) {
    if (!this.repository.delete(supplyId)) {
      throw new SupplyNotFoundError(supplyId);
    }

    return {
      data: {
        id: supplyId,
        deleted: true,
      },
    };
  }
}
