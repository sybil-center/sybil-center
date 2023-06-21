type Element<TValue = any> = {
  value: TValue;
  next: string | null;
  prev: string | null;
}

type Table<TValue = any> = { [key: string]: Element<TValue> | undefined }

export class TableListCache<TValue = any> {

  constructor(
    cacheSize: number,
    private table: Table = {},
    private firstElementId: string | null = null,
    private lastElementId: string | null = null,
    private size = 0,
    private maxSize = cacheSize
  ) {
    if (cacheSize === 0) throw Error("Cache size can't be zero - 0");
  }

  push(id: string, value: TValue): TValue {
    const found = this.#findElement(id);
    if (found) this.#deleteElement(id);
    if (this.size === this.maxSize && !found) {
      this.#deleteElement(this.lastElementId!);
    }
    this.#pushElement(id, value);
    return value;
  }

  #pushElement(id: string, value: TValue) {
    if (this.size === 0) {
      this.table[id] = {
        value: value,
        next: null,
        prev: null
      };
      this.firstElementId = id;
      this.lastElementId = id;
      this.size++;

    } else {
      this.table[id] = {
        value: value,
        next: null,
        prev: this.firstElementId
      };
      this.table[this.firstElementId!]!.next = id;
      this.firstElementId = id;
      this.size++;
    }
  }

  delete(id: string) {
    this.#deleteElement(id);
  }

  #deleteElement(deletedId: string) {
    const deletedElement = this.#findElement(deletedId);
    if (!deletedElement) return;
    if (!deletedElement.next && !deletedElement.prev) {
      this.firstElementId = null;
      this.lastElementId = null;
    } else if (!deletedElement.next) {
      const newFirstId = deletedElement.prev;
      this.firstElementId = newFirstId;
      if (newFirstId) this.#findElement(newFirstId)!.next = null;
    } else if (!deletedElement.prev) {
      const newLastId = deletedElement.next;
      this.lastElementId = newLastId;
      if (newLastId) this.#findElement(newLastId)!.prev = null;
    } else {
      const nextElement = this.#findElement(deletedElement.next)!;
      const prevElement = this.#findElement(deletedElement.prev)!;
      nextElement.prev = deletedElement.prev;
      prevElement.next = deletedElement.next;
    }
    this.table[deletedId] = undefined;
    this.size--;
  }

  find(id: string): TValue | undefined {
    return this.#findElement(id)?.value;
  }

  #findElement(id: string): Element<TValue> | undefined {
    return this.table[id];
  }

  clear() {
    this.table = {};
    this.firstElementId = null;
    this.lastElementId = null;
    this.size = 0;
  }
}
