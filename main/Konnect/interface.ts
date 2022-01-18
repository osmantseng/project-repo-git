export interface ICollection<T> {
  readonly keys: string[];
  get(name: string): T | undefined;
  add(name: string, item: T): void;
  remove(name: string): void;
}
