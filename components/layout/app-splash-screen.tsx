import { AppLoader } from "@/components/shared/app-loader";

export function AppSplashScreen({ message }: { message?: string } = {}) {
  return <AppLoader fullScreen size="lg" message={message} />;
}

