import { describe, expect, it } from "vitest";
import { getGreeting, HELLO_MESSAGE } from "@/lib/__tests__/fixtures/hello";

describe("smoke test", () => {
  it("executa vitest e resolve o alias @/", () => {
    expect(HELLO_MESSAGE).toBe("StokFácil");
    expect(getGreeting("Carol")).toBe("Olá, Carol!");
  });
});
