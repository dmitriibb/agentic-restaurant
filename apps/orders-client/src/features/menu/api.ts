import { serviceBaseUrls } from "../../shared/api/config";

export type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
};

export async function fetchMenu(token: string): Promise<MenuItem[]> {
  const response = await fetch(`${serviceBaseUrls.menuService}/api/v1/menu-items`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Could not load menu.");
  }

  const body = (await response.json()) as { items: MenuItem[] };
  return body.items ?? [];
}
