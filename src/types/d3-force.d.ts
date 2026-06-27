declare module "d3-force" {
  export interface SimulationNodeDatum {
    index?: number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
  }

  export interface SimulationLinkDatum<NodeDatum = SimulationNodeDatum> {
    source: NodeDatum | string | number;
    target: NodeDatum | string | number;
    index?: number;
  }

  export interface ForceManyBody<NodeDatum = SimulationNodeDatum> {
    strength(strength: number): ForceManyBody<NodeDatum>;
  }

  export interface ForceLink<NodeDatum = SimulationNodeDatum, LinkDatum = SimulationLinkDatum<NodeDatum>> {
    id(id: (d: any) => string): ForceLink<NodeDatum, LinkDatum>;
    distance(distance: number): ForceLink<NodeDatum, LinkDatum>;
    strength(strength: number): ForceLink<NodeDatum, LinkDatum>;
  }

  export interface ForceX<NodeDatum = SimulationNodeDatum> {
    strength(strength: number): ForceX<NodeDatum>;
  }

  export interface ForceY<NodeDatum = SimulationNodeDatum> {
    strength(strength: number): ForceY<NodeDatum>;
  }

  export interface ForceCollide<NodeDatum = SimulationNodeDatum> {
    radius(radius: (d: any) => number): ForceCollide<NodeDatum>;
  }

  export interface Simulation<NodeDatum = SimulationNodeDatum, LinkDatum = SimulationLinkDatum<NodeDatum>> {
    nodes(): NodeDatum[];
    stop(): void;
    on(event: string, fn: () => void): Simulation<NodeDatum, LinkDatum>;
    force(name: string, force: any): Simulation<NodeDatum, LinkDatum>;
    alphaDecay(decay?: number): Simulation<NodeDatum, LinkDatum>;
  }

  export function forceSimulation<NodeDatum = SimulationNodeDatum>(nodes?: NodeDatum[]): Simulation<NodeDatum>;
  export function forceManyBody<NodeDatum = SimulationNodeDatum>(): ForceManyBody<NodeDatum>;
  export function forceLink<NodeDatum = SimulationNodeDatum, LinkDatum = SimulationLinkDatum<NodeDatum>>(links?: LinkDatum[]): ForceLink<NodeDatum, LinkDatum>;
  export function forceX<NodeDatum = SimulationNodeDatum>(x?: number): ForceX<NodeDatum>;
  export function forceY<NodeDatum = SimulationNodeDatum>(y?: number): ForceY<NodeDatum>;
  export function forceCollide<NodeDatum = SimulationNodeDatum>(): ForceCollide<NodeDatum>;
}
