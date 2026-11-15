import {
  AmbulanceIcon,
  Building03Icon,
  DropletIcon,
  FireIcon,
  FootballPitchIcon,
  Home01Icon,
  Tree01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { ShelterType, SosType } from "@/lib/types";

export const SOS_ICON: Record<SosType, IconSvgElement> = {
  fire: FireIcon,
  collapse: Building03Icon,
  flood: DropletIcon,
  medical: AmbulanceIcon,
};
export const SOS_SWATCH: Record<SosType, string> = {
  fire: "bg-orange-500",
  collapse: "bg-purple-500",
  flood: "bg-sky-500",
  medical: "bg-pink-500",
};
export const SHELTER_ICON: Record<ShelterType, IconSvgElement> = {
  shelter: Home01Icon,
  park: Tree01Icon,
  stadium: FootballPitchIcon,
};
