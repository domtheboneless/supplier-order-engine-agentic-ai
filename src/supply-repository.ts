import type { Supply } from "./domain.js";
import { seedSupplies } from "./supply-seed-data.js";

function cloneSupply(supply: Supply): Supply {
  return {
    ...supply,
  };
}

export interface SupplyRepository {
  list(): Supply[];
  findById(supplyId: string): Supply | undefined;
  create(supply: Supply): Supply;
  update(supply: Supply): Supply;
  delete(supplyId: string): boolean;
}

export class InMemorySupplyRepository implements SupplyRepository {
  private readonly supplies: Supply[];

  constructor(supplies: Supply[]) {
    this.supplies = supplies.map(cloneSupply);
  }

  list() {
    return this.supplies.map(cloneSupply);
  }

  findById(supplyId: string) {
    const supply = this.supplies.find((entry) => entry.id === supplyId);

    if (!supply) {
      return undefined;
    }

    return cloneSupply(supply);
  }

  create(supply: Supply) {
    this.supplies.push(cloneSupply(supply));
    return cloneSupply(supply);
  }

  update(supply: Supply) {
    const index = this.supplies.findIndex((entry) => entry.id === supply.id);

    if (index === -1) {
      return cloneSupply(supply);
    }

    this.supplies[index] = cloneSupply(supply);
    return cloneSupply(supply);
  }

  delete(supplyId: string) {
    const index = this.supplies.findIndex((entry) => entry.id === supplyId);

    if (index === -1) {
      return false;
    }

    this.supplies.splice(index, 1);
    return true;
  }
}

export function createSupplyRepository() {
  return new InMemorySupplyRepository(seedSupplies);
}
