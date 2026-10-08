import CafeApp from "@/components/app/cafe-app";
import { AppProvider } from "@/components/app/app-provider";

export default function Home() {
  return (
    <AppProvider>
      <CafeApp />
    </AppProvider>
  );
}
