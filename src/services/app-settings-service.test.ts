import { describe, expect, it } from "vitest";
import { describeProjectLocation } from "./app-settings-service";

describe("describeProjectLocation", () => {
  it("names the folder the project sits in, not the project itself", () => {
    expect(describeProjectLocation("C:\\Users\\shiro\\Documents\\Anamnesis\\Valeraverse")).toBe("…\\Documents\\Anamnesis");
  });

  it("tells apart two projects that share a name", () => {
    const a = describeProjectLocation("C:\\Users\\shiro\\Documents\\Anamnesis\\testval2\\Valeraverse");
    const b = describeProjectLocation("C:\\Users\\shiro\\Documents\\Anamnesis\\TESTval\\Valeraverse");
    expect(a).not.toBe(b);
    expect(a).toBe("…\\Anamnesis\\testval2");
    expect(b).toBe("…\\Anamnesis\\TESTval");
  });

  it("drops the leading ellipsis when nothing was trimmed", () => {
    expect(describeProjectLocation("D:\\Worlds\\Valeraverse")).toBe("D:\\Worlds");
  });

  it("keeps posix paths in posix separators", () => {
    expect(describeProjectLocation("/home/shiro/Documents/Anamnesis/Valeraverse")).toBe("…/Documents/Anamnesis");
  });

  it("falls back to the whole path when there is no parent to name", () => {
    expect(describeProjectLocation("Valeraverse")).toBe("Valeraverse");
  });
});
