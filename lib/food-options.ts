/** Labels match the trained classifier (Food-101 subset). */

export const FOOD_SCAN_GROUPS: { title: string; items: string[] }[] = [
  {
    title: "Sandwiches & handhelds",
    items: ["hamburger", "hot_dog", "tacos"],
  },
  {
    title: "Pizza, pasta & noodles",
    items: ["pizza", "lasagna", "pad_thai", "ramen"],
  },
  {
    title: "Rice & sushi",
    items: ["fried_rice", "sushi"],
  },
  {
    title: "Plates & protein",
    items: [
      "steak",
      "grilled_salmon",
      "chicken_wings",
      "fried_calamari",
      "omelette",
    ],
  },
  {
    title: "Sides & snacks",
    items: ["french_fries", "nachos", "donuts", "macarons"],
  },
  {
    title: "Breakfast & desserts",
    items: [
      "pancakes",
      "waffles",
      "apple_pie",
      "chocolate_cake",
      "cheesecake",
      "ice_cream",
    ],
  },
  {
    title: "Salad",
    items: ["caesar_salad"],
  },
];

export function formatFoodLabel(slug: string): string {
  return slug
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
