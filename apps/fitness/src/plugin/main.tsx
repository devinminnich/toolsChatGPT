import { createRoot } from "react-dom/client";
import { App } from "../App";
import { createFitnessPlugin } from "./bridge";
import "../styles.css";

// OAuth credentials stay in the host. This UI only calls tools through the bridge.
const plugin = createFitnessPlugin();
createRoot(document.getElementById("root")!).render(<App plugin={plugin} />);
