"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  Loader2,
  Home,
  Info,
  Palmtree,
  BookOpen,
  ScrollText,
  Mail,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { HomeSliderManager } from "@/components/admin/home-slider-manager";
import { PageImageManager } from "@/components/admin/page-image-manager";
import type { PageImages, SliderImage, SingleImage } from "@/lib/validations/page-images";

interface PageImagesResponse {
  data: PageImages;
  defaults: PageImages;
}

const pageConfig = [
  {
    key: "home" as const,
    name: "Home Page",
    description: "Hero slider images (1-10 slides)",
    icon: Home,
    type: "slider" as const,
  },
  {
    key: "about" as const,
    name: "About Page",
    description: "Header banner image",
    icon: Info,
    type: "single" as const,
  },
  {
    key: "retreats" as const,
    name: "Retreats Page",
    description: "Header banner image",
    icon: Palmtree,
    type: "single" as const,
  },
  {
    key: "blog" as const,
    name: "Blog Page",
    description: "Header banner image",
    icon: BookOpen,
    type: "single" as const,
  },
  {
    key: "policies" as const,
    name: "Policies Page",
    description: "Header banner image",
    icon: ScrollText,
    type: "single" as const,
  },
  {
    key: "contact" as const,
    name: "Contact Section",
    description: "Header banner image",
    icon: Mail,
    type: "single" as const,
  },
];

export default function AdminPagesPage() {
  const [pageImages, setPageImages] = useState<PageImages | null>(null);
  const [defaultImages, setDefaultImages] = useState<PageImages | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [openItems, setOpenItems] = useState<string[]>(["home"]);

  const fetchPageImages = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/page-images");
      const result: PageImagesResponse = await response.json();

      if (!response.ok) {
        throw new Error("Failed to fetch page images");
      }

      setPageImages(result.data);
      setDefaultImages(result.defaults);
    } catch (error) {
      console.error("Fetch page images error:", error);
      toast.error("Failed to load page images");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPageImages();
  }, [fetchPageImages]);

  const handleSaveAll = async () => {
    if (!pageImages) return;

    try {
      setIsSaving(true);

      // Save each page separately
      for (const page of pageConfig) {
        const images = page.type === "slider"
          ? { slider: pageImages.home.slider }
          : { header: pageImages[page.key as keyof Omit<PageImages, "home">].header };

        const response = await fetch("/api/admin/page-images", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageKey: page.key, images }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || `Failed to save ${page.name}`);
        }
      }

      setHasChanges(false);
      toast.success("All page images saved successfully");
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePage = async (pageKey: string) => {
    if (!pageImages) return;

    try {
      setIsSaving(true);

      const page = pageConfig.find(p => p.key === pageKey);
      if (!page) return;

      const images = page.type === "slider"
        ? { slider: pageImages.home.slider }
        : { header: pageImages[pageKey as keyof Omit<PageImages, "home">].header };

      const response = await fetch("/api/admin/page-images", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey, images }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `Failed to save ${page.name}`);
      }

      toast.success(`${page.name} images saved`);
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSliderUpdate = (slider: SliderImage[]) => {
    if (!pageImages) return;
    setPageImages({ ...pageImages, home: { slider } });
    setHasChanges(true);
  };

  const handlePageImageUpdate = (
    pageKey: "about" | "retreats" | "blog" | "policies" | "contact",
    image: SingleImage | null
  ) => {
    if (!pageImages || !defaultImages) return;

    const newImages = {
      ...pageImages,
      [pageKey]: {
        header: image || defaultImages[pageKey].header,
      },
    };
    setPageImages(newImages);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pageImages || !defaultImages) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load page images. Please refresh the page.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pages</h1>
          <p className="text-muted-foreground">
            Manage header images for all site pages
          </p>
        </div>
        <Button onClick={handleSaveAll} disabled={isSaving || !hasChanges}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save All Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Header Images</CardTitle>
          </div>
          <CardDescription>
            Configure header/banner images for each page. Changes are applied after saving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion
            type="multiple"
            value={openItems}
            onValueChange={setOpenItems}
            className="space-y-4"
          >
            {pageConfig.map((page) => {
              const Icon = page.icon;

              return (
                <AccordionItem
                  key={page.key}
                  value={page.key}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div className="text-left">
                        <div className="font-medium">{page.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {page.description}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-6">
                    {page.type === "slider" ? (
                      <HomeSliderManager
                        images={pageImages.home.slider}
                        defaultImages={defaultImages.home.slider}
                        onUpdate={handleSliderUpdate}
                        minImages={1}
                        maxImages={10}
                      />
                    ) : (
                      <PageImageManager
                        pageKey={page.key}
                        pageName={page.name}
                        currentImage={pageImages[page.key as keyof Omit<PageImages, "home">].header}
                        defaultImage={defaultImages[page.key as keyof Omit<PageImages, "home">].header!}
                        onUpdate={(image) =>
                          handlePageImageUpdate(
                            page.key as "about" | "retreats" | "blog" | "policies" | "contact",
                            image
                          )
                        }
                      />
                    )}
                    <div className="flex justify-end mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSavePage(page.key)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save {page.name}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
