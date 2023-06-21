import { suite } from "uvu";
import * as a from "uvu/assert";
import { TableListCache } from "../../../src/util/cache.util.js";

const test = suite("UNIT: table-list cache util test");

test("new value always first", () => {
  const cache = new TableListCache<number>(3);
  cache.push("2", 2);
  cache.push("3", 3);
  cache.push("4", 4);
  a.is(cache["firstElementId"], "4", "incorrect first element id");
  a.is(cache["lastElementId"], "2", "incorrect last element id ");
  cache.push("1", 1);
  a.is(cache["firstElementId"], "1", "incorrect first element id");
  a.is(cache["lastElementId"], "3", "incorrect last element id");
  cache.push("4", 3);
  a.is(cache["firstElementId"], "4", "incorrect first element id");
  a.is(cache["lastElementId"], "3", "incorrect last element id");
});

test("delete last on push when cache size max", () => {
  const cache = new TableListCache<number>(3);
  cache.push("1", 1);
  cache.push("2", 2);
  cache.push("3", 3);
  a.is(cache["lastElementId"], "1", "last element id not matched");
  a.is(cache["size"], 3, "cache size not matched");
  cache.push("4", 4);
  a.is(cache["size"], 3, "cache size not matched");
  a.is(cache["lastElementId"], "2", "last element id not matched");
  cache.push("2", 2);
  a.is(cache["size"], 3, "cache size not matched");
  a.is(cache["table"]["4"]!.next, "2", "next id not matched");
  a.is(cache["table"]["4"]!.prev, "3", "prev id not matched");
});

test("should delete elements", () => {
  const cache = new TableListCache<number>(5);
  cache.push("1", 1);
  cache.push("2", 2);
  cache.push("3", 3);
  cache.push("4", 4);
  cache.push("5", 5);
  // delete first element
  cache.delete("5");
  a.is(cache["firstElementId"], "4", "first element id not matched");
  // delete last element
  cache.delete("1");
  a.is(cache["lastElementId"], "2", "last element id not matched");
  // delete middle element
  cache.delete("3");
  a.not.ok(cache.find("3"));
  a.is(cache["firstElementId"], "4", "first element id not matched");
  a.is(cache["lastElementId"], "2", "last element id not matched");
  a.is(cache["table"]["2"]!.next, "4", "next element not matched");
  a.is(cache["table"]["4"]!.prev, "2", "prev element not matched");
  // delete element which not present
  cache.delete("7");
  // delete all elements
  cache.delete("4");
  a.is(cache["size"], 1, "cache size not matched");
  cache.delete("2");
  a.is(cache["size"], 0, "cache size not matched");
  // delete from empty cache
  cache.delete("2");
  a.is(cache["size"], 0, "cache size not matched");
});

test("correct work after clear", () => {
  const cache = new TableListCache<number>(3);
  cache.push("1", 1);
  cache.push("2", 2);
  cache.push("3", 3);
  a.is(cache["size"], 3, "cache size not matched");
  a.is(cache["firstElementId"], "3", "first element id not matched");
  a.is(cache["lastElementId"], "1", "last element id not matched");
  cache.clear();
  a.is(cache["size"], 0, "cache size not matched");
  a.is(cache["firstElementId"], null, "cache first element not null");
  a.is(cache["lastElementId"], null, "cache last element not null");
  cache.push("1", 1);
  cache.push("2", 2);
  cache.push("3", 3);
  a.is(cache["size"], 3, "cache size not matched");
  a.is(cache["firstElementId"], "3", "first element id not matched");
  a.is(cache["lastElementId"], "1", "last element id not matched");
});

test.run();
