import { AiUiContext } from "@/services/aiService";

export function contextFromPath(pathname: string, search = ""): AiUiContext {
  const match = pathname.match(/^\/(customers|products|sales|suppliers|purchases)\/([0-9a-f-]{36})/i);
  const singular: Record<string, AiUiContext["entity"]> = {
    customers: "customer",
    products: "product",
    sales: "sale",
    suppliers: "supplier",
    purchases: "purchase",
  };
  const filters = Object.fromEntries(new URLSearchParams(search).entries());
  return {
    route: pathname,
    ...(match ? { entity: singular[match[1].toLowerCase()], entityId: match[2] } : {}),
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
  };
}
