import type { CityOption, GenerationOption, MakeOption, ModelOption, RegionOption } from "@/features/catalog/queries";
import type { ListingValues, StepKey } from "../editor";

export type EditorImage = { id: string; url: string; thumbUrl: string; width: number; height: number };

export type EditorCategory = { id: string; slug: string; name: string; attributeSet: string; vehicleType: string | null };

export type EditorProps = {
  listing: { id: string; status: string; number: number; draftStep: number; publicPath: string; rejectionReason: string | null };
  category: EditorCategory;
  categories: EditorCategory[];
  initialValues: ListingValues;
  images: EditorImage[];
  makes: MakeOption[];
  models: ModelOption[];
  generations: GenerationOption[];
  regions: RegionOption[];
  cities: CityOption[];
  initialStep: StepKey;
  maxImages: number;
  isDealerListing: boolean;
};

export type Issues = Record<string, string>;
