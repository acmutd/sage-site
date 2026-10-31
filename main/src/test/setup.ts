import "@testing-library/jest-dom";
import { Window } from "happy-dom";

const storageWindow = new Window({ url: "http://localhost:3000" });
Object.defineProperty(globalThis, "localStorage", { value: storageWindow.localStorage, configurable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: storageWindow.sessionStorage, configurable: true });