interface DesignObject {
  id: string;
  title: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
}

interface Canvas {
  id: string;
  title: string;
  objects: DesignObject[];
  camera: {
    x: number;
    y: number;
    zoom: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Meta {
  lastOpenedCanvasId: string | null;
}

export type { Canvas, DesignObject, Meta };
