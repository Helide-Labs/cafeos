import PrototypeApp from "@/components/prototype/prototype-app";
import { PrototypeProvider } from "@/components/prototype/prototype-provider";

export default function Home() {
  return (
    <PrototypeProvider>
      <PrototypeApp />
    </PrototypeProvider>
  );
}
