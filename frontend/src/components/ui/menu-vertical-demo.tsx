import React from "react";
import { MenuVertical } from "./menu-vertical";

export const MenuVerticalBasic = () => {
  return (
    <MenuVertical
      menuItems={[
        {
          label: "Home",
          href: "#",
        },
        {
          label: "Pricing",
          href: "#",
        },
        {
          label: "Docs",
          href: "#",
        },
        {
          label: "About Us",
          href: "#",
        },
        {
          label: "Contact",
          href: "#",
        },
      ]}
    />
  );
};

export default MenuVerticalBasic;
